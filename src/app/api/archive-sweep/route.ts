import { prisma } from '@/lib/prisma';
import { json, logActivity, serverError } from '@/lib/api-helpers';
import { taskDTO, taskInclude } from '@/lib/serialize';
import { eventRange } from '@/lib/domain';

export const dynamic = 'force-dynamic';

/**
 * Housekeeping run once per session, on load.
 *
 * Two sweeps, both of which only ever move a task to a state the user would
 * have moved it to themselves:
 *
 *  1. Events whose day has gone by are closed. An event is a status, not a job
 *     you tick off — a meeting that happened is finished by the clock, and
 *     nobody comes back afterwards to mark it so. Left alone they pile up as
 *     open work. The day rolling over is the trigger, not the end time, so an
 *     event that finished at ten this morning is still today's event until
 *     tomorrow. Undated events are left alone: there is no day to have passed.
 *
 *  2. Tasks finished longer ago than `autoArchiveDays` are archived. Archiving
 *     hides a task from the views but never deletes it — it can be restored
 *     from Settings — which is why this can run without asking first.
 *     `autoArchiveDays = 0` disables that sweep, but not the event one.
 */
export async function POST() {
  try {
    const touched: string[] = [];

    // ── 1. close events whose day has passed ──
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openEvents = await prisma.task.findMany({
      where: { archived: false, status: 'EVENT' },
      select: { id: true, start: true, deadline: true, estimateHours: true },
    });

    const lapsed = openEvents.filter((e) => {
      const range = eventRange({
        start: e.start?.toISOString() ?? null,
        deadline: e.deadline?.toISOString() ?? null,
        estimateHours: e.estimateHours,
      });
      const end = range?.end ?? e.deadline ?? null;
      return !!end && end < today;
    });

    for (const e of lapsed) {
      // Goes through the same columns a person clicking "Hoàn thành" would
      // write, so completion and completedAt stay consistent.
      await prisma.task.update({
        where: { id: e.id },
        data: { status: 'DONE', completion: 100, completedAt: new Date() },
      });
      await logActivity(e.id, 'Sự kiện đã qua — tự động hoàn thành');
      touched.push(e.id);
    }

    // ── 2. archive long-finished tasks ──
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const days = settings?.autoArchiveDays ?? 0;
    let archived = 0;

    if (days) {
      const cutoff = new Date(Date.now() - days * 86400000);
      const stale = await prisma.task.findMany({
        where: { archived: false, status: 'DONE', completedAt: { lt: cutoff } },
        select: { id: true },
      });
      if (stale.length) {
        const ids = stale.map((t) => t.id);
        await prisma.task.updateMany({ where: { id: { in: ids } }, data: { archived: true } });
        archived = ids.length;
        touched.push(...ids);
      }
    }

    if (!touched.length) return json({ archived: 0, eventsClosed: 0, tasks: [] });

    const tasks = await prisma.task.findMany({
      where: { id: { in: touched } },
      include: taskInclude,
    });
    return json({ archived, eventsClosed: lapsed.length, tasks: tasks.map(taskDTO) });
  } catch (e) {
    return serverError(e);
  }
}
