import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError } from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{ text?: string; authorId?: string | null }>(req);
    const text = String(b?.text ?? '').trim();
    if (!text) return badRequest('Bình luận trống');

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return notFound('Không tìm thấy nhiệm vụ');

    await prisma.comment.create({
      data: { taskId: params.id, text, authorId: b?.authorId || null },
    });

    const full = await prisma.task.findUnique({ where: { id: params.id }, include: taskInclude });
    return json({ task: taskDTO(full!) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
