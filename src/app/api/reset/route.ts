import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { WORK_GROUPS } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Erases every project, task and person and rebuilds an empty workspace.
 *
 * This is irreversible, so the caller must type the literal word RESET and send
 * it here — the confirmation is re-checked server-side rather than trusted from
 * the UI, since anything that can reach this route can destroy the database.
 * One owner account is recreated afterwards, otherwise nobody could log back in.
 */
export async function POST(req: Request) {
  try {
    const b = await readBody<{ confirm?: string }>(req);
    if (String(b?.confirm ?? '').trim() !== 'RESET') {
      return badRequest('Nhập RESET để xác nhận');
    }

    await prisma.noteTaskLink.deleteMany();
    await prisma.noteHashtag.deleteMany();
    await prisma.noteAttachment.deleteMany();
    await prisma.noteVersion.deleteMany();
    await prisma.note.deleteMany();
    await prisma.notebook.deleteMany();
    await prisma.taskExecutor.deleteMany();
    await prisma.taskHashtag.deleteMany();
    await prisma.projectHashtag.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.timeLog.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectFile.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.person.deleteMany();
    await prisma.hashtag.deleteMany();
    await prisma.workGroup.deleteMany();

    for (const [i, g] of WORK_GROUPS.entries()) {
      await prisma.workGroup.create({
        data: { key: g.key, name: g.name, icon: g.icon, color: g.color, sortOrder: i },
      });
    }

    const owner = await prisma.person.create({
      data: {
        name: 'Bach Office',
        username: 'admin',
        password: 'admin123',
        role: 'OWNER',
        groupKey: 'work',
      },
    });

    await prisma.settings.upsert({
      where: { id: 1 },
      update: { dashboardLayout: '[]', dashboardHidden: '[]' },
      create: { id: 1 },
    });

    return json({ ok: true, owner: { username: owner.username } });
  } catch (e) {
    return serverError(e);
  }
}
