import { prisma } from '@/lib/prisma';
import {
  badRequest,
  json,
  logActivity,
  notFound,
  readBody,
  serverError,
} from '@/lib/api-helpers';
import { noteDTO, noteInclude, taskDTO, taskInclude } from '@/lib/serialize';
import { isPriority, type Priority } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Turns the note's markdown checklist into real Tasks and links them back.
 *
 * Re-running is safe: an item whose text already matches a task linked to this
 * note is skipped, so the second run creates nothing. Matching is on the
 * trimmed, case-folded title — the same rule the UI uses to show which items
 * are already converted, so the two never disagree.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{
      items?: string[];
      priority?: string;
      assigneeId?: string | null;
      creatorId?: string | null;
    }>(req);

    const note = await prisma.note.findUnique({
      where: { id: params.id },
      include: { links: { select: { taskId: true } } },
    });
    if (!note) return notFound('Không tìm thấy ghi chú');

    const items = (b?.items ?? []).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return badRequest('Ghi chú không có mục checklist nào');

    const linkedTasks = await prisma.task.findMany({
      where: { id: { in: note.links.map((l) => l.taskId) } },
      select: { title: true },
    });
    const already = new Set(linkedTasks.map((t) => t.title.trim().toLowerCase()));

    const priority: Priority = isPriority(b?.priority) ? b.priority : 'MEDIUM';
    const createdIds: string[] = [];
    let skipped = 0;

    for (const title of items) {
      if (already.has(title.toLowerCase())) {
        skipped++;
        continue;
      }
      const task = await prisma.task.create({
        data: {
          title,
          priority,
          status: 'TODO',
          groupKey: note.groupKey,
          projectId: note.projectId,
          assigneeId: b?.assigneeId || null,
          creatorId: b?.creatorId || null,
        },
      });
      await logActivity(task.id, `Tạo từ checklist của ghi chú "${note.title || 'Chưa đặt tên'}"`);
      await prisma.noteTaskLink.create({ data: { noteId: note.id, taskId: task.id } });
      createdIds.push(task.id);
      already.add(title.toLowerCase());
    }

    const [fullNote, tasks] = await Promise.all([
      prisma.note.findUnique({ where: { id: params.id }, include: noteInclude }),
      prisma.task.findMany({ where: { id: { in: createdIds } }, include: taskInclude }),
    ]);

    return json({
      note: noteDTO(fullNote!),
      tasks: tasks.map(taskDTO),
      created: createdIds.length,
      skipped,
    });
  } catch (e) {
    return serverError(e);
  }
}
