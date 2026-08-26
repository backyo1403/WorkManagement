import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { WORK_GROUPS, type BootstrapDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Replaces the whole workspace with a previously exported file.
 *
 * Destructive, so it validates the payload shape first and refuses anything
 * that would leave the workspace unusable (no people means nobody could log in
 * again). Ids from the export are preserved so the relations survive intact.
 */
export async function POST(req: Request) {
  try {
    const b = await readBody<BootstrapDTO>(req);
    if (!b || !Array.isArray(b.people) || !Array.isArray(b.tasks) || !Array.isArray(b.projects)) {
      return badRequest('File không đúng định dạng dữ liệu Bach Office');
    }
    if (!b.people.length) {
      return badRequest('File không có người dùng nào — sẽ không đăng nhập lại được');
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

    // Exports omit passwords, so restored accounts get a known temporary one.
    for (const p of b.people) {
      await prisma.person.create({
        data: {
          id: p.id,
          name: p.name,
          username: p.username,
          password: '123456',
          email: p.email,
          phone: p.phone,
          role: p.role,
          avatarUrl: p.avatarUrl,
          groupKey: p.groupKey,
          telegramChatId: p.telegramChatId,
          zaloUserId: p.zaloUserId,
        },
      });
    }

    for (const w of b.workflows ?? []) {
      await prisma.workflow.create({
        data: { id: w.id, name: w.name, icon: w.icon, color: w.color, isDefault: w.isDefault },
      });
    }

    const tagId = new Map<string, string>();
    const ensureTag = async (name: string) => {
      if (!tagId.has(name)) {
        const row = await prisma.hashtag.upsert({ where: { name }, update: {}, create: { name } });
        tagId.set(name, row.id);
      }
      return tagId.get(name)!;
    };

    for (const p of b.projects) {
      await prisma.project.create({
        data: {
          id: p.id,
          name: p.name,
          description: p.description,
          icon: p.icon,
          color: p.color,
          goal: p.goal,
          status: p.status,
          priority: p.priority,
          startDate: p.startDate ? new Date(p.startDate) : null,
          endDate: p.endDate ? new Date(p.endDate) : null,
          pinned: p.pinned,
          groupKey: p.groupKey,
          ownerId: p.ownerId,
          creatorId: p.creatorId,
        },
      });
      for (const tag of p.hashtags ?? []) {
        await prisma.projectHashtag.create({ data: { projectId: p.id, hashtagId: await ensureTag(tag) } });
      }
    }

    for (const x of b.tasks) {
      await prisma.task.create({
        data: {
          id: x.id,
          title: x.title,
          description: x.description,
          priority: x.priority,
          status: x.status,
          deadline: x.deadline ? new Date(x.deadline) : null,
          start: x.start ? new Date(x.start) : null,
          estimateHours: x.estimateHours,
          actualHours: x.actualHours,
          completion: x.completion,
          pinned: x.pinned,
          archived: x.archived,
          groupKey: x.groupKey,
          projectId: x.projectId,
          workflowId: x.workflowId,
          assigneeId: x.assigneeId,
          creatorId: x.creatorId,
          createdAt: new Date(x.createdAt),
          completedAt: x.completedAt ? new Date(x.completedAt) : null,
          subtasks: {
            create: (x.subtasks ?? []).map((s, i) => ({
              text: s.text,
              done: s.done,
              order: i,
              deadline: s.deadline ? new Date(s.deadline) : null,
              start: s.start ? new Date(s.start) : null,
              estimateHours: s.estimateHours,
            })),
          },
          activity: {
            create: (x.activity ?? []).map((a) => ({ text: a.text, createdAt: new Date(a.createdAt) })),
          },
        },
      });
      for (const personId of x.executorIds ?? []) {
        await prisma.taskExecutor.create({ data: { taskId: x.id, personId } });
      }
      for (const tag of x.hashtags ?? []) {
        await prisma.taskHashtag.create({ data: { taskId: x.id, hashtagId: await ensureTag(tag) } });
      }
    }

    // Notebooks and notes are optional so files exported before the Notes
    // module existed still restore cleanly.
    for (const nb of b.notebooks ?? []) {
      await prisma.notebook.create({
        data: {
          id: nb.id,
          name: nb.name,
          icon: nb.icon,
          color: nb.color,
          sortOrder: nb.sortOrder,
          // Exports never carry the PIN hash, so a locked notebook comes back
          // unlocked rather than permanently inaccessible.
        },
      });
    }

    for (const n of b.notes ?? []) {
      await prisma.note.create({
        data: {
          id: n.id,
          title: n.title,
          content: n.content,
          notebookId: n.notebookId,
          projectId: n.projectId,
          groupKey: n.groupKey,
          authorId: n.authorId,
          favorite: n.favorite,
          archived: n.archived,
          deletedAt: n.deletedAt ? new Date(n.deletedAt) : null,
          templateKey: n.templateKey,
          createdAt: new Date(n.createdAt),
        },
      });
      for (const tag of n.hashtags ?? []) {
        await prisma.noteHashtag.create({ data: { noteId: n.id, hashtagId: await ensureTag(tag) } });
      }
      for (const taskId of n.linkedTaskIds ?? []) {
        // Skip links whose task did not come along in the export.
        const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
        if (task) await prisma.noteTaskLink.create({ data: { noteId: n.id, taskId } });
      }
    }

    await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

    return json({
      ok: true,
      counts: {
        people: b.people.length,
        projects: b.projects.length,
        tasks: b.tasks.length,
        notes: (b.notes ?? []).length,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
