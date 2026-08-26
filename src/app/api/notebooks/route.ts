import { prisma } from '@/lib/prisma';
import { badRequest, hashPin, json, newSalt, readBody, serverError } from '@/lib/api-helpers';
import { notebookDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await readBody<{ name?: string; icon?: string; color?: string; pin?: string }>(req);
    const name = String(b?.name ?? '').trim();
    if (!name) return badRequest('Sổ tay cần có tên');

    const count = await prisma.notebook.count();
    const pin = String(b?.pin ?? '').trim();
    if (pin && !/^\d{4,8}$/.test(pin)) return badRequest('PIN phải gồm 4–8 chữ số');

    const salt = pin ? newSalt() : null;
    const notebook = await prisma.notebook.create({
      data: {
        name,
        icon: b?.icon || 'book',
        color: b?.color || '#2563EB',
        sortOrder: count,
        pinSalt: salt,
        pinHash: pin && salt ? hashPin(pin, salt) : null,
      },
    });
    return json({ notebook: notebookDTO(notebook) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
