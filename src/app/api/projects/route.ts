import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError, setProjectHashtags } from '@/lib/api-helpers';
import { projectDTO, projectInclude } from '@/lib/serialize';
import { isGroupKey, isPriority, isProjectStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CreateProjectBody {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  goal?: string;
  status?: string;
  priority?: string;
  startDate?: string | null;
  endDate?: string | null;
  groupKey?: string;
  ownerId?: string | null;
  creatorId?: string | null;
  hashtags?: string[];
}

export async function POST(req: Request) {
  try {
    const b = await readBody<CreateProjectBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const name = String(b.name ?? '').trim();
    if (!name) return badRequest('Dự án cần có tên');

    const project = await prisma.project.create({
      data: {
        name,
        description: b.description ?? '',
        icon: b.icon || 'folder',
        color: b.color || '#2563EB',
        goal: b.goal ?? '',
        status: isProjectStatus(b.status) ? b.status : 'IN_PROGRESS',
        priority: isPriority(b.priority) ? b.priority : 'MEDIUM',
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        groupKey: isGroupKey(b.groupKey) ? b.groupKey : 'work',
        ownerId: b.ownerId || null,
        creatorId: b.creatorId || null,
      },
    });

    if (b.hashtags?.length) await setProjectHashtags(project.id, b.hashtags);

    const full = await prisma.project.findUnique({
      where: { id: project.id },
      include: projectInclude,
    });
    return json({ project: projectDTO(full!) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
