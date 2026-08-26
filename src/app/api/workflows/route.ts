import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { workflowDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const b = await readBody<{ name?: string; icon?: string; color?: string; isDefault?: boolean }>(req);
    const name = String(b?.name ?? '').trim();
    if (!name) return badRequest('Workflow cần có tên');

    // Only one workflow can be the default.
    if (b?.isDefault) await prisma.workflow.updateMany({ data: { isDefault: false } });

    const wf = await prisma.workflow.create({
      data: {
        name,
        icon: b?.icon || 'folder',
        color: b?.color || '#2563EB',
        isDefault: !!b?.isDefault,
      },
    });
    return json({ workflow: workflowDTO(wf) }, 201);
  } catch (e) {
    return serverError(e);
  }
}
