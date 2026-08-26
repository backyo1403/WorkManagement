import { prisma } from '@/lib/prisma';
import {
  badRequest,
  json,
  logActivity,
  readBody,
  resolveTaskGroup,
  serverError,
  setTaskHashtags,
  syncTaskCompletion,
} from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';
import { isPriority, isTaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CreateTaskBody {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  deadline?: string | null;
  start?: string | null;
  estimateHours?: number;
  projectId?: string | null;
  workflowId?: string | null;
  assigneeId?: string | null;
  creatorId?: string | null;
  groupKey?: string;
  executorIds?: string[];
  hashtags?: string[];
  subtasks?: Array<{ text: string; done?: boolean; deadline?: string | null; start?: string | null }>;
}

export async function POST(req: Request) {
  try {
    const b = await readBody<CreateTaskBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const title = String(b.title ?? '').trim();
    if (!title) return badRequest('Nhiệm vụ cần có tên');

    const priority = isPriority(b.priority) ? b.priority : 'MEDIUM';
    const status = isTaskStatus(b.status) ? b.status : 'TODO';
    const groupKey = await resolveTaskGroup(b.projectId, b.groupKey);

    const task = await prisma.task.create({
      data: {
        title,
        description: b.description ?? '',
        priority,
        status,
        deadline: b.deadline ? new Date(b.deadline) : null,
        start: b.start ? new Date(b.start) : null,
        estimateHours: typeof b.estimateHours === 'number' ? b.estimateHours : 1,
        groupKey,
        projectId: b.projectId || null,
        workflowId: b.workflowId || null,
        assigneeId: b.assigneeId || null,
        creatorId: b.creatorId || null,
        subtasks: {
          create: (b.subtasks ?? [])
            .filter((s) => String(s.text ?? '').trim())
            .map((s, i) => ({
              text: s.text.trim(),
              done: !!s.done,
              order: i,
              deadline: s.deadline ? new Date(s.deadline) : null,
              start: s.start ? new Date(s.start) : null,
            })),
        },
      },
    });

    for (const personId of b.executorIds ?? []) {
      await prisma.taskExecutor.create({ data: { taskId: task.id, personId } });
    }
    if (b.hashtags?.length) await setTaskHashtags(task.id, b.hashtags);

    await logActivity(task.id, 'Nhiệm vụ được tạo');
    await syncTaskCompletion(task.id);

    const full = await prisma.task.findUnique({ where: { id: task.id }, include: taskInclude });
    return json({ task: taskDTO(full!) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
