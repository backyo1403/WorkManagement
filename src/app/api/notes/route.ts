import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError, setNoteHashtags } from '@/lib/api-helpers';
import { noteDTO, noteInclude } from '@/lib/serialize';
import { isGroupKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CreateNoteBody {
  title?: string;
  content?: string;
  notebookId?: string | null;
  projectId?: string | null;
  groupKey?: string;
  authorId?: string | null;
  templateKey?: string | null;
  hashtags?: string[];
  /** Task ids to link on creation — used by "create note from a task". */
  linkedTaskIds?: string[];
}

export async function POST(req: Request) {
  try {
    const b = await readBody<CreateNoteBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    // A note attached to a project always sits in that project's group, the
    // same rule tasks follow.
    let groupKey = isGroupKey(b.groupKey) ? b.groupKey : 'work';
    if (b.projectId) {
      const p = await prisma.project.findUnique({
        where: { id: b.projectId },
        select: { groupKey: true },
      });
      if (p && isGroupKey(p.groupKey)) groupKey = p.groupKey;
    }

    const note = await prisma.note.create({
      data: {
        title: (b.title ?? '').trim(),
        content: b.content ?? '',
        notebookId: b.notebookId || null,
        projectId: b.projectId || null,
        groupKey,
        authorId: b.authorId || null,
        templateKey: b.templateKey || null,
      },
    });

    if (b.hashtags?.length) await setNoteHashtags(note.id, b.hashtags);
    for (const taskId of b.linkedTaskIds ?? []) {
      const exists = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
      if (exists) await prisma.noteTaskLink.create({ data: { noteId: note.id, taskId } });
    }

    const full = await prisma.note.findUnique({ where: { id: note.id }, include: noteInclude });
    return json({ note: noteDTO(full!) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
