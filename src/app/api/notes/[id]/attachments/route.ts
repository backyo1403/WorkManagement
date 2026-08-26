import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError } from '@/lib/api-helpers';
import { noteDTO, noteInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * Attachment size ceiling.
 *
 * There is no object store in this local-first setup, so the bytes are inlined
 * into the row as a data URI — the same trade-off already made for avatars.
 * That works and genuinely persists, but it does not scale: a real deployment
 * should put the bytes in S3/R2 and keep only the key here. The cap keeps the
 * SQLite file from being used as a filesystem in the meantime.
 */
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{
      name?: string;
      mimeType?: string;
      size?: number;
      dataUrl?: string;
    }>(req);

    const name = String(b?.name ?? '').trim();
    if (!name) return badRequest('Thiếu tên tệp');

    const note = await prisma.note.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!note) return notFound('Không tìm thấy ghi chú');

    const size = Number(b?.size ?? 0);
    if (size > MAX_BYTES) {
      return badRequest('Tệp vượt quá 2MB — bản chạy cục bộ chưa có kho lưu trữ tệp riêng');
    }

    await prisma.noteAttachment.create({
      data: {
        noteId: params.id,
        name,
        mimeType: b?.mimeType ?? '',
        size,
        dataUrl: b?.dataUrl ?? null,
      },
    });

    const full = await prisma.note.findUnique({ where: { id: params.id }, include: noteInclude });
    return json({ note: noteDTO(full!) }, 201);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const attachmentId = new URL(req.url).searchParams.get('attachmentId');
    if (!attachmentId) return badRequest('Thiếu tệp cần xoá');

    await prisma.noteAttachment.deleteMany({ where: { id: attachmentId, noteId: params.id } });

    const full = await prisma.note.findUnique({ where: { id: params.id }, include: noteInclude });
    if (!full) return notFound('Không tìm thấy ghi chú');
    return json({ note: noteDTO(full) });
  } catch (e) {
    return serverError(e);
  }
}
