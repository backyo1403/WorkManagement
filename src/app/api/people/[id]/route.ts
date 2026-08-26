import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError } from '@/lib/api-helpers';
import { personDTO } from '@/lib/serialize';
import { isGroupKey, isRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{
      name?: string; username?: string; password?: string;
      email?: string; phone?: string; role?: string; groupKey?: string;
      avatarUrl?: string | null; telegramChatId?: string; zaloUserId?: string;
    }>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.person.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy người thực hiện');

    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return badRequest('Cần nhập họ tên');
      data.name = name;
    }
    if (b.username !== undefined) {
      const username = String(b.username).trim();
      if (!username) return badRequest('Cần nhập tên đăng nhập');
      const taken = await prisma.person.findUnique({ where: { username } });
      if (taken && taken.id !== params.id) return badRequest('Tên đăng nhập đã tồn tại');
      data.username = username;
    }
    // An empty password field means "leave it alone", not "clear it".
    if (b.password) data.password = b.password;
    if (b.email !== undefined) data.email = b.email || null;
    if (b.phone !== undefined) data.phone = b.phone || null;
    if (b.avatarUrl !== undefined) data.avatarUrl = b.avatarUrl || null;
    if (b.telegramChatId !== undefined) data.telegramChatId = b.telegramChatId || null;
    if (b.zaloUserId !== undefined) data.zaloUserId = b.zaloUserId || null;
    if (b.role !== undefined) {
      if (!isRole(b.role)) return badRequest('Vai trò không hợp lệ');
      data.role = b.role;
    }
    if (b.groupKey !== undefined) {
      if (!isGroupKey(b.groupKey)) return badRequest('Nhóm công việc không hợp lệ');
      data.groupKey = b.groupKey;
    }

    const person = await prisma.person.update({ where: { id: params.id }, data });
    return json({ person: personDTO(person) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.person.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy người thực hiện');

    const remaining = await prisma.person.count();
    if (remaining <= 1) return badRequest('Không thể xoá người cuối cùng — sẽ không đăng nhập được');

    // Their tasks and projects stay; the relations null out rather than cascade.
    await prisma.person.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
