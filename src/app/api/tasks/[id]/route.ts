import { prisma } from '@/lib/prisma';
import {
  badRequest,
  json,
  logActivity,
  notFound,
  readBody,
  resolveTaskGroup,
  serverError,
  setTaskHashtags,
  syncTaskCompletion,
} from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';
import { isPriority, isTaskStatus, TASK_STATUS_LABEL, type TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PatchTaskBody {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  deadline?: string | null;
  start?: string | null;
  estimateHours?: number;
  actualHours?: number;
  pinned?: boolean;
  archived?: boolean;
  projectId?: string | null;
  workflowId?: string | null;
  assigneeId?: string | null;
  groupKey?: string;
  executorIds?: string[];
  hashtags?: string[];
  /** When present, replaces the whole subtask list (order = array order). */
  subtasks?: Array<{
    id?: string;
    text: string;
    done?: boolean;
    deadline?: string | null;
    start?: string | null;
    estimateHours?: number;
  }>;
  /** Free-text note appended to the activity log alongside this change. */
  activity?: string;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<PatchTaskBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy nhiệm vụ');

    const data: Record<string, unknown> = {};
    if (b.title !== undefined) {
      const title = String(b.title).trim();
      if (!title) return badRequest('Nhiệm vụ cần có tên');
      data.title = title;
    }
    if (b.description !== undefined) data.description = b.description;
    if (b.priority !== undefined) {
      if (!isPriority(b.priority)) return badRequest('Độ ưu tiên không hợp lệ');
      data.priority = b.priority;
    }
    if (b.status !== undefined) {
      if (!isTaskStatus(b.status)) return badRequest('Trạng thái không hợp lệ');
      data.status = b.status;
    }
    if (b.deadline !== undefined) data.deadline = b.deadline ? new Date(b.deadline) : null;
    if (b.start !== undefined) data.start = b.start ? new Date(b.start) : null;
    if (b.estimateHours !== undefined) data.estimateHours = b.estimateHours;
    if (b.actualHours !== undefined) data.actualHours = b.actualHours;
    if (b.pinned !== undefined) data.pinned = b.pinned;
    if (b.archived !== undefined) data.archived = b.archived;
    if (b.workflowId !== undefined) data.workflowId = b.workflowId || null;
    if (b.assigneeId !== undefined) data.assigneeId = b.assigneeId || null;

    // Reassigning the project also re-homes the task into that project's group.
    if (b.projectId !== undefined || b.groupKey !== undefined) {
      const projectId = b.projectId !== undefined ? b.projectId || null : existing.projectId;
      data.projectId = projectId;
      data.groupKey = await resolveTaskGroup(projectId, b.groupKey ?? existing.groupKey);
    }

    await prisma.task.update({ where: { id: params.id }, data });

    if (b.executorIds) {
      await prisma.taskExecutor.deleteMany({ where: { taskId: params.id } });
      for (const personId of b.executorIds) {
        await prisma.taskExecutor.create({ data: { taskId: params.id, personId } });
      }
    }
    if (b.hashtags) await setTaskHashtags(params.id, b.hashtags);

    if (b.subtasks) {
      // Replace wholesale: the editor always sends the full list, and rebuilding
      // is simpler (and safer) than diffing partial edits.
      await prisma.subtask.deleteMany({ where: { taskId: params.id } });
      const rows = b.subtasks.filter((s) => String(s.text ?? '').trim());
      for (const [i, s] of rows.entries()) {
        await prisma.subtask.create({
          data: {
            taskId: params.id,
            text: s.text.trim(),
            done: !!s.done,
            order: i,
            deadline: s.deadline ? new Date(s.deadline) : null,
            start: s.start ? new Date(s.start) : null,
            estimateHours: s.estimateHours ?? 0.5,
          },
        });
      }
    }

    if (b.status !== undefined && b.status !== existing.status) {
      await logActivity(
        params.id,
        `Trạng thái: ${TASK_STATUS_LABEL[existing.status as TaskStatus]} → ${TASK_STATUS_LABEL[b.status as TaskStatus]}`,
      );
    }
    if (b.activity) await logActivity(params.id, b.activity);

    await syncTaskCompletion(params.id);

    const full = await prisma.task.findUnique({ where: { id: params.id }, include: taskInclude });
    return json({ task: taskDTO(full!) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy nhiệm vụ');
    // Subtasks, comments, activity, time logs and join rows all cascade.
    await prisma.task.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
