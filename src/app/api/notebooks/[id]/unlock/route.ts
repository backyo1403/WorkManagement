import { prisma } from '@/lib/prisma';
import { badRequest, hashPin, json, notFound, readBody, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Verifies a notebook PIN.
 *
 * The comparison happens here, not in the browser, so the hash and salt never
 * reach the client and a wrong PIN cannot be brute-forced against a value
 * sitting in memory. What this buys is access control in the UI — it is not
 * encryption; see the note on the Notebook model in schema.prisma.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{ pin?: string }>(req);
    const pin = String(b?.pin ?? '');
    if (!pin) return badRequest('Nhập PIN');

    const notebook = await prisma.notebook.findUnique({ where: { id: params.id } });
    if (!notebook) return notFound('Không tìm thấy sổ tay');
    if (!notebook.pinHash || !notebook.pinSalt) return json({ ok: true });

    if (hashPin(pin, notebook.pinSalt) !== notebook.pinHash) {
      return json({ ok: false, error: 'PIN không đúng' }, 403);
    }
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
