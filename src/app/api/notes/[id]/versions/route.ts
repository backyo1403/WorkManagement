import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError, snapshotNote } from '@/lib/api-helpers';
import { noteDTO, noteInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/** Full history for one note, newest first, including each version's content. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const versions = await prisma.noteVersion.findMany({
      where: { noteId: params.id },
      orderBy: { createdAt: 'desc' },
    });
    return json({
      versions: versions.map((v) => ({
        id: v.id,
        title: v.title,
        content: v.content,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * Restores a version. The current text is snapshotted first, so restoring is
 * itself undoable rather than a one-way door.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{ versionId?: string }>(req);
    if (!b?.versionId) return badRequest('Thiếu phiên bản cần khôi phục');

    const version = await prisma.noteVersion.findUnique({ where: { id: b.versionId } });
    if (!version || version.noteId !== params.id) return notFound('Không tìm thấy phiên bản');

    await snapshotNote(params.id);
    await prisma.note.update({
      where: { id: params.id },
      data: { title: version.title, content: version.content },
    });

    const full = await prisma.note.findUnique({ where: { id: params.id }, include: noteInclude });
    return json({ note: noteDTO(full!) });
  } catch (e) {
    return serverError(e);
  }
}
