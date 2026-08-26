import { prisma } from '@/lib/prisma';
import { badRequest, json, notFound, readBody, serverError } from '@/lib/api-helpers';
import { workflowDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await readBody<{ name?: string; icon?: string; color?: string; isDefault?: boolean }>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const existing = await prisma.workflow.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy workflow');

    const data: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return badRequest('Workflow cần có tên');
      data.name = name;
    }
    if (b.icon !== undefined) data.icon = b.icon;
    if (b.color !== undefined) data.color = b.color;
    if (b.isDefault !== undefined) {
      if (b.isDefault) await prisma.workflow.updateMany({ data: { isDefault: false } });
      data.isDefault = b.isDefault;
    }

    const wf = await prisma.workflow.update({ where: { id: params.id }, data });
    return json({ workflow: workflowDTO(wf) });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.workflow.findUnique({ where: { id: params.id } });
    if (!existing) return notFound('Không tìm thấy workflow');

    // Tasks keep existing — their workflowId is nulled by the relation.
    await prisma.workflow.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
