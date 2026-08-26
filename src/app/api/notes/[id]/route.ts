import { prisma } from '@/lib/prisma';
import {
  badRequest,
  json,
  notFound,
  readBody,
  serverError,
  setNoteHashtags,
  snapshotNote,
} from '@/lib/api-helpers';
import { noteDTO, noteInclude } from '@/lib/serialize';
import { isGroupKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PatchNoteBody {
  title?: string;
  content?: string;
  notebookId?: string | null;
  projectId?: string | null;
  groupKey?: string;
  favorite?: boolean;
  archived?: boolean;
  /** true → move to Trash, false → restore from Trash. */
  trashed?: boolean;
  hashtags?: string[];
  /** Set false by autosave so typing does not fill the history with noise. */
  snapshot?: boolean;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<PatchNoteBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.note.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy ghi chú');

    // Snapshot the previous text before overwriting it. `snapshotNote` decides
    // whether this edit is far enough from the last one to be worth keeping.
    if (b.title !== undefined || b.content !== undefined) {
      if (b.snapshot !== false) await snapshotNote(params.id);
    }

    const data: Record<string, unknown> = {};
    if (b.title !== undefined) data.title = b.title;
    if (b.content !== undefined) data.content = b.content;
    if (b.notebookId !== undefined) data.notebookId = b.notebookId || null;
    if (b.favorite !== undefined) data.favorite = b.favorite;
    if (b.archived !== undefined) data.archived = b.archived;
    if (b.trashed !== undefined) data.deletedAt = b.trashed ? new Date() : null;

    if (b.projectId !== undefined) {
      data.projectId = b.projectId || null;
      // Follow the project's group, as tasks do.
      if (b.projectId) {
        const p = await prisma.project.findUnique({
          where: { id: b.projectId },
          select: { groupKey: true },
        });
        if (p && isGroupKey(p.groupKey)) data.groupKey = p.groupKey;
      }
    }
    if (b.groupKey !== undefined && data.groupKey === undefined) {
      if (!isGroupKey(b.groupKey)) return badRequest('Nhóm công việc không hợp lệ');
      data.groupKey = b.groupKey;
    }

    await prisma.note.update({ where: { id: params.id }, data });
    if (b.hashtags) await setNoteHashtags(params.id, b.hashtags);

    const full = await prisma.note.findUnique({ where: { id: params.id }, include: noteInclude });
    return json({ note: noteDTO(full!) });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * Permanent delete. The UI routes the normal "delete" action through
 * `PATCH { trashed: true }` first, so reaching here means the user emptied the
 * trash or deleted from it deliberately.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.note.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy ghi chú');
    // Links, hashtags, attachments and versions all cascade; the linked Tasks
    // themselves are untouched.
    await prisma.note.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
