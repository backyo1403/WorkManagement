import { prisma } from '@/lib/prisma';
import { json, serverError } from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * Archives tasks finished longer ago than `autoArchiveDays`.
 *
 * Archiving hides a task from the views but never deletes it — it can be
 * restored from Settings → Auto-archive, which is why this can run without
 * asking the user first. `autoArchiveDays = 0` disables the sweep entirely.
 */
export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const days = settings?.autoArchiveDays ?? 0;
    if (!days) return json({ archived: 0, tasks: [] });

    const cutoff = new Date(Date.now() - days * 86400000);
    const stale = await prisma.task.findMany({
      where: { archived: false, status: 'DONE', completedAt: { lt: cutoff } },
      select: { id: true },
    });
    if (!stale.length) return json({ archived: 0, tasks: [] });

    const ids = stale.map((t) => t.id);
    await prisma.task.updateMany({ where: { id: { in: ids } }, data: { archived: true } });

    const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, include: taskInclude });
    return json({ archived: ids.length, tasks: tasks.map(taskDTO) });
  } catch (e) {
    return serverError(e);
  }
}
