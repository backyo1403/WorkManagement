import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError, syncTaskCompletion } from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * Single-subtask edit — the path used by the inline checkbox on hover cards and
 * task rows, where re-sending the whole task would be wasteful. Returns the
 * parent task so the caller can refresh its derived progress in one step.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{
      text?: string;
      done?: boolean;
      deadline?: string | null;
      start?: string | null;
      estimateHours?: number;
    }>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const sub = await prisma.subtask.findUnique({ where: { id: params.id } });
    if (!sub) return notFound('Không tìm thấy công việc con');

    const data: Record<string, unknown> = {};
    if (b.text !== undefined) data.text = b.text;
    if (b.done !== undefined) data.done = b.done;
    if (b.deadline !== undefined) data.deadline = b.deadline ? new Date(b.deadline) : null;
    if (b.start !== undefined) data.start = b.start ? new Date(b.start) : null;
    if (b.estimateHours !== undefined) data.estimateHours = b.estimateHours;

    await prisma.subtask.update({ where: { id: params.id }, data });
    await syncTaskCompletion(sub.taskId);

    const task = await prisma.task.findUnique({ where: { id: sub.taskId }, include: taskInclude });
    return json({ task: taskDTO(task!) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const sub = await prisma.subtask.findUnique({ where: { id: params.id } });
    if (!sub) return notFound('Không tìm thấy công việc con');
    await prisma.subtask.delete({ where: { id: params.id } });
    await syncTaskCompletion(sub.taskId);

    const task = await prisma.task.findUnique({ where: { id: sub.taskId }, include: taskInclude });
    return json({ task: taskDTO(task!) });
  } catch (e) {
    return serverError(e);
  }
}
