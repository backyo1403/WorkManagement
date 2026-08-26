import { prisma } from '@/lib/prisma';
import {
  badRequest,
  cascadeProjectGroup,
  json,
  notFound,
  readBody,
  serverError,
  setProjectHashtags,
} from '@/lib/api-helpers';
import { projectDTO, projectInclude, taskDTO, taskInclude } from '@/lib/serialize';
import { isGroupKey, isPriority, isProjectStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PatchProjectBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  goal?: string;
  status?: string;
  priority?: string;
  startDate?: string | null;
  endDate?: string | null;
  pinned?: boolean;
  groupKey?: string;
  ownerId?: string | null;
  hashtags?: string[];
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<PatchProjectBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy dự án');

    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return badRequest('Dự án cần có tên');
      data.name = name;
    }
    if (b.description !== undefined) data.description = b.description;
    if (b.icon !== undefined) data.icon = b.icon;
    if (b.color !== undefined) data.color = b.color;
    if (b.goal !== undefined) data.goal = b.goal;
    if (b.status !== undefined) {
      if (!isProjectStatus(b.status)) return badRequest('Trạng thái dự án không hợp lệ');
      data.status = b.status;
    }
    if (b.priority !== undefined) {
      if (!isPriority(b.priority)) return badRequest('Độ ưu tiên không hợp lệ');
      data.priority = b.priority;
    }
    if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate) : null;
    if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
    if (b.pinned !== undefined) data.pinned = b.pinned;
    if (b.ownerId !== undefined) data.ownerId = b.ownerId || null;
    if (b.groupKey !== undefined) {
      if (!isGroupKey(b.groupKey)) return badRequest('Nhóm công việc không hợp lệ');
      data.groupKey = b.groupKey;
    }

    await prisma.project.update({ where: { id: params.id }, data });
    if (b.hashtags) await setProjectHashtags(params.id, b.hashtags);

    // Moving a project between groups drags its tasks along, so the group filter
    // never shows a task detached from its project.
    let movedTasks: string[] = [];
    if (b.groupKey !== undefined && b.groupKey !== existing.groupKey && isGroupKey(b.groupKey)) {
      await cascadeProjectGroup(params.id, b.groupKey);
      movedTasks = (
        await prisma.task.findMany({ where: { projectId: params.id }, select: { id: true } })
      ).map((t) => t.id);
    }

    const full = await prisma.project.findUnique({
      where: { id: params.id },
      include: projectInclude,
    });
    const tasks = movedTasks.length
      ? (await prisma.task.findMany({ where: { id: { in: movedTasks } }, include: taskInclude })).map(taskDTO)
      : [];

    return json({ project: projectDTO(full!), tasks });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy dự án');

    // Tasks survive their project (projectId is set to null by the relation),
    // so deleting a project never silently destroys work.
    await prisma.project.delete({ where: { id: params.id } });

    const orphaned = await prisma.task.findMany({
      where: { projectId: null, groupKey: existing.groupKey },
      include: taskInclude,
    });
    return json({ ok: true, tasks: orphaned.map(taskDTO) });
  } catch (e) {
    return serverError(e);
  }
}
