import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { personDTO } from '@/lib/serialize';

/**
 * Username/password check against the Person table.
 *
 * Deliberately minimal: this is a local-first single-workspace app, the gate
 * exists so the screen can lock and work can be attributed — it is not a
 * security boundary. Passwords are stored in plain text (see the note in
 * schema.prisma); hash them and issue a signed session cookie before this ever
 * runs anywhere but localhost.
 */
export async function POST(req: Request) {
  try {
    const body = await readBody<{ username?: string; password?: string }>(req);
    if (!body) return badRequest('Dữ liệu không hợp lệ');

    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!username || !password) return badRequest('Nhập tên đăng nhập và mật khẩu');

    // SQLite has no case-insensitive filter, so compare in JS on the small set.
    const people = await prisma.person.findMany();
    const user = people.find(
      (p) => p.username.trim().toLowerCase() === username && p.password === password,
    );

    if (!user) {
      return json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }
    return json({ user: personDTO(user) });
  } catch (e) {
    return serverError(e);
  }
}
