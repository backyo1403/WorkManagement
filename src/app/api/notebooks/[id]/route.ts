import { prisma } from '@/lib/prisma';
import {
  badRequest,
  hashPin,
  json,
  newSalt,
  notFound,
  readBody,
  serverError,
} from '@/lib/api-helpers';
import { notebookDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

interface PatchNotebookBody {
  name?: string;
  icon?: string;
  color?: string;
  /** New PIN to set. Empty string removes the lock. */
  pin?: string;
  /** Required when the notebook already has a PIN and `pin` is being changed. */
  currentPin?: string;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<PatchNotebookBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.notebook.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy sổ tay');

    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = b.name.trim();
      if (!name) return badRequest('Sổ tay cần có tên');
      data.name = name;
    }
    if (b.icon !== undefined) data.icon = b.icon;
    if (b.color !== undefined) data.color = b.color;

    if (b.pin !== undefined) {
      // Changing or clearing an existing PIN requires proving you know it.
      if (existing.pinHash) {
        const current = String(b.currentPin ?? '');
        if (!existing.pinSalt || hashPin(current, existing.pinSalt) !== existing.pinHash) {
          return json({ error: 'PIN hiện tại không đúng' }, 403);
        }
      }
      const next = b.pin.trim();
      if (!next) {
        data.pinHash = null;
        data.pinSalt = null;
      } else {
        if (!/^\d{4,8}$/.test(next)) return badRequest('PIN phải gồm 4–8 chữ số');
        const salt = newSalt();
        data.pinSalt = salt;
        data.pinHash = hashPin(next, salt);
      }
    }

    const notebook = await prisma.notebook.update({ where: { id: params.id }, data });
    return json({ notebook: notebookDTO(notebook) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.notebook.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy sổ tay');

    // Notes survive — the relation nulls their notebookId rather than cascading.
    await prisma.notebook.delete({ where: { id: params.id } });

    const orphaned = await prisma.note.count({ where: { notebookId: null } });
    return json({ ok: true, notesWithoutNotebook: orphaned });
  } catch (e) {
    return serverError(e);
  }
}
