import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { personDTO } from '@/lib/serialize';
import { isGroupKey, isRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await readBody<{
      name?: string; username?: string; password?: string;
      email?: string; phone?: string; role?: string; groupKey?: string;
      avatarUrl?: string | null; telegramChatId?: string; zaloUserId?: string;
    }>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const name = String(b.name ?? '').trim();
    const username = String(b.username ?? '').trim();
    if (!name) return badRequest('Cần nhập họ tên');
    if (!username) return badRequest('Cần nhập tên đăng nhập');

    const taken = await prisma.person.findUnique({ where: { username } });
    if (taken) return badRequest('Tên đăng nhập đã tồn tại');

    const person = await prisma.person.create({
      data: {
        name,
        username,
        password: b.password || '123456',
        email: b.email || null,
        phone: b.phone || null,
        role: isRole(b.role) ? b.role : 'MEMBER',
        groupKey: isGroupKey(b.groupKey) ? b.groupKey : 'work',
        avatarUrl: b.avatarUrl || null,
        telegramChatId: b.telegramChatId || null,
        zaloUserId: b.zaloUserId || null,
      },
    });
    return json({ person: personDTO(person) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
