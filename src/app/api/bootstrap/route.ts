import { prisma } from '@/lib/prisma';
import { json, serverError } from '@/lib/api-helpers';
import {
  noteDTO,
  noteInclude,
  notebookDTO,
  personDTO,
  projectDTO,
  projectInclude,
  settingsDTO,
  taskDTO,
  taskInclude,
  workflowDTO,
} from '@/lib/serialize';
import type { BootstrapDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * One round trip that loads the whole workspace. The dataset is single-user and
 * small (hundreds of rows), so shipping it up front is far cheaper than the
 * dozen requests the views would otherwise make — and every view then filters
 * the same in-memory copy, which is what keeps group switching instant.
 */
export async function GET() {
  try {
    const [people, workflows, projects, tasks, hashtags, settingsRow, notes, notebooks] =
      await Promise.all([
        prisma.person.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.workflow.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.project.findMany({ include: projectInclude, orderBy: { createdAt: 'asc' } }),
        prisma.task.findMany({ include: taskInclude, orderBy: { createdAt: 'asc' } }),
        prisma.hashtag.findMany({ orderBy: { name: 'asc' } }),
        prisma.settings.findUnique({ where: { id: 1 } }),
        prisma.note.findMany({ include: noteInclude, orderBy: { updatedAt: 'desc' } }),
        prisma.notebook.findMany({ orderBy: { sortOrder: 'asc' } }),
      ]);

    // The single settings row is created on first boot rather than by a migration.
    const settings = settingsRow ?? (await prisma.settings.create({ data: { id: 1 } }));

    const payload: BootstrapDTO = {
      people: people.map(personDTO),
      workflows: workflows.map(workflowDTO),
      projects: projects.map(projectDTO),
      tasks: tasks.map(taskDTO),
      hashtags: hashtags.map((h) => h.name),
      settings: settingsDTO(settings),
      notes: notes.map(noteDTO),
      notebooks: notebooks.map(notebookDTO),
    };
    return json(payload);
  } catch (e) {
    return serverError(e);
  }
}
