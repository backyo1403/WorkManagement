import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError } from '@/lib/api-helpers';
import { noteDTO, noteInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * The one endpoint for the Note ↔ Task relationship, used by both sides.
 *
 * Because the relationship is a single row in `NoteTaskLink`, linking from a
 * note and linking from a task are literally the same write — there is no
 * second copy that could drift out of step. Unlinking removes only that row;
 * the Task and the Note both survive.
 */
export async function POST(req: Request) {
  try {
    const b = await readBody<{ noteId?: string; taskId?: string; linked?: boolean }>(req);
    const noteId = String(b?.noteId ?? '');
    const taskId = String(b?.taskId ?? '');
    if (!noteId || !taskId) return badRequest('Thiếu ghi chú hoặc nhiệm vụ');

    const [note, task] = await Promise.all([
      prisma.note.findUnique({ where: { id: noteId }, select: { id: true } }),
      prisma.task.findUnique({ where: { id: taskId }, select: { id: true } }),
    ]);
    if (!note) return notFound('Không tìm thấy ghi chú');
    if (!task) return notFound('Không tìm thấy nhiệm vụ');

    if (b?.linked === false) {
      await prisma.noteTaskLink.deleteMany({ where: { noteId, taskId } });
    } else {
      // Idempotent: linking something already linked is not an error.
      await prisma.noteTaskLink.upsert({
        where: { noteId_taskId: { noteId, taskId } },
        update: {},
        create: { noteId, taskId },
      });
    }

    const full = await prisma.note.findUnique({ where: { id: noteId }, include: noteInclude });
    return json({ note: noteDTO(full!) });
  } catch (e) {
    return serverError(e);
  }
}
