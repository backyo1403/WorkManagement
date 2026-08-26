/**
 * Prisma rows → the DTO shapes in types.ts.
 *
 * Two jobs: turn `Date` objects into ISO strings so they survive JSON, and
 * flatten the join tables (executors, hashtags) into plain arrays the UI can
 * use directly.
 */

import type {
  ActivityDTO,
  CommentDTO,
  DashWidgetLayout,
  GroupKey,
  Lang,
  NoteAttachmentDTO,
  NoteDTO,
  NotebookDTO,
  PersonDTO,
  Priority,
  ProjectDTO,
  ProjectStatus,
  Role,
  SettingsDTO,
  SubtaskDTO,
  TaskDTO,
  TaskStatus,
  Theme,
  TimeLogDTO,
  WorkflowDTO,
} from './types';

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

// ─────────────────────────── people & workflows ───────────────────────────

export function personDTO(p: {
  id: string; name: string; username: string; email: string | null; phone: string | null;
  role: string; avatarUrl: string | null; groupKey: string;
  telegramChatId: string | null; zaloUserId: string | null;
}): PersonDTO {
  return {
    id: p.id,
    name: p.name,
    username: p.username,
    email: p.email,
    phone: p.phone,
    role: p.role as Role,
    avatarUrl: p.avatarUrl,
    groupKey: p.groupKey as GroupKey,
    telegramChatId: p.telegramChatId,
    zaloUserId: p.zaloUserId,
  };
}

export function workflowDTO(w: {
  id: string; name: string; icon: string; color: string; isDefault: boolean;
}): WorkflowDTO {
  return { id: w.id, name: w.name, icon: w.icon, color: w.color, isDefault: w.isDefault };
}

// ─────────────────────────── projects ───────────────────────────

type ProjectRow = {
  id: string; name: string; description: string; icon: string; color: string; goal: string;
  status: string; priority: string; startDate: Date | null; endDate: Date | null; pinned: boolean;
  groupKey: string; ownerId: string | null; creatorId: string | null;
  hashtags?: Array<{ hashtag: { name: string } }>;
  files?: Array<{ id: string; name: string; url: string | null }>;
};

export function projectDTO(p: ProjectRow): ProjectDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    color: p.color,
    goal: p.goal,
    status: p.status as ProjectStatus,
    priority: p.priority as Priority,
    startDate: iso(p.startDate),
    endDate: iso(p.endDate),
    pinned: p.pinned,
    groupKey: p.groupKey as GroupKey,
    ownerId: p.ownerId,
    creatorId: p.creatorId,
    hashtags: (p.hashtags ?? []).map((h) => h.hashtag.name),
    files: (p.files ?? []).map((f) => ({ id: f.id, name: f.name, url: f.url })),
  };
}

/** Everything a project query needs to produce a complete ProjectDTO. */
export const projectInclude = {
  hashtags: { include: { hashtag: true } },
  files: true,
} as const;

// ─────────────────────────── tasks ───────────────────────────

type TaskRow = {
  id: string; title: string; description: string; priority: string; status: string;
  deadline: Date | null; start: Date | null; estimateHours: number; actualHours: number;
  completion: number; pinned: boolean; archived: boolean; groupKey: string;
  projectId: string | null; workflowId: string | null; assigneeId: string | null;
  creatorId: string | null; createdAt: Date; updatedAt: Date; completedAt: Date | null;
  executors?: Array<{ personId: string }>;
  hashtags?: Array<{ hashtag: { name: string } }>;
  subtasks?: Array<{
    id: string; text: string; done: boolean; order: number;
    deadline: Date | null; start: Date | null; estimateHours: number;
  }>;
  comments?: Array<{ id: string; text: string; createdAt: Date; authorId: string | null }>;
  activity?: Array<{ id: string; text: string; createdAt: Date }>;
  timeLogs?: Array<{ id: string; start: Date; end: Date; minutes: number; source: string }>;
};

export function subtaskDTO(s: NonNullable<TaskRow['subtasks']>[number]): SubtaskDTO {
  return {
    id: s.id,
    text: s.text,
    done: s.done,
    order: s.order,
    deadline: iso(s.deadline),
    start: iso(s.start),
    estimateHours: s.estimateHours,
  };
}

export function taskDTO(t: TaskRow): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority as Priority,
    status: t.status as TaskStatus,
    deadline: iso(t.deadline),
    start: iso(t.start),
    estimateHours: t.estimateHours,
    actualHours: t.actualHours,
    completion: t.completion,
    pinned: t.pinned,
    archived: t.archived,
    groupKey: t.groupKey as GroupKey,
    projectId: t.projectId,
    workflowId: t.workflowId,
    assigneeId: t.assigneeId,
    creatorId: t.creatorId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    completedAt: iso(t.completedAt),
    executorIds: (t.executors ?? []).map((e) => e.personId),
    hashtags: (t.hashtags ?? []).map((h) => h.hashtag.name),
    subtasks: (t.subtasks ?? []).map(subtaskDTO),
    comments: (t.comments ?? []).map(
      (c): CommentDTO => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        authorId: c.authorId,
      }),
    ),
    activity: (t.activity ?? []).map(
      (a): ActivityDTO => ({ id: a.id, text: a.text, createdAt: a.createdAt.toISOString() }),
    ),
    timeLogs: (t.timeLogs ?? []).map(
      (l): TimeLogDTO => ({
        id: l.id,
        start: l.start.toISOString(),
        end: l.end.toISOString(),
        minutes: l.minutes,
        source: l.source,
      }),
    ),
  };
}

/** Everything a task query needs to produce a complete TaskDTO. */
export const taskInclude = {
  executors: true,
  hashtags: { include: { hashtag: true } },
  subtasks: { orderBy: { order: 'asc' } },
  comments: { orderBy: { createdAt: 'asc' } },
  activity: { orderBy: { createdAt: 'desc' } },
  timeLogs: { orderBy: { start: 'desc' } },
} as const;

// ─────────────────────────── notes ───────────────────────────

export function notebookDTO(n: {
  id: string; name: string; icon: string; color: string;
  sortOrder: number; pinHash: string | null;
}): NotebookDTO {
  return {
    id: n.id,
    name: n.name,
    icon: n.icon,
    color: n.color,
    sortOrder: n.sortOrder,
    // Only whether a PIN exists — never the hash or salt.
    locked: !!n.pinHash,
  };
}

type NoteRow = {
  id: string; title: string; content: string;
  notebookId: string | null; projectId: string | null; groupKey: string;
  authorId: string | null; favorite: boolean; archived: boolean;
  deletedAt: Date | null; templateKey: string | null;
  createdAt: Date; updatedAt: Date;
  hashtags?: Array<{ hashtag: { name: string } }>;
  links?: Array<{ taskId: string }>;
  attachments?: Array<{
    id: string; name: string; mimeType: string; size: number;
    dataUrl: string | null; createdAt: Date;
  }>;
  _count?: { versions: number };
};

export function noteDTO(n: NoteRow): NoteDTO {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    notebookId: n.notebookId,
    projectId: n.projectId,
    groupKey: n.groupKey as GroupKey,
    authorId: n.authorId,
    favorite: n.favorite,
    archived: n.archived,
    deletedAt: iso(n.deletedAt),
    templateKey: n.templateKey,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    hashtags: (n.hashtags ?? []).map((h) => h.hashtag.name),
    linkedTaskIds: (n.links ?? []).map((l) => l.taskId),
    attachments: (n.attachments ?? []).map(
      (a): NoteAttachmentDTO => ({
        id: a.id,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        dataUrl: a.dataUrl,
        createdAt: a.createdAt.toISOString(),
      }),
    ),
    versionCount: n._count?.versions ?? 0,
  };
}

/** Everything a note query needs to produce a complete NoteDTO. */
export const noteInclude = {
  hashtags: { include: { hashtag: true } },
  links: { select: { taskId: true } },
  attachments: { orderBy: { createdAt: 'desc' } },
  _count: { select: { versions: true } },
} as const;

// ─────────────────────────── settings ───────────────────────────

type SettingsRow = {
  companyName: string; companyTagline: string; workStartHour: number; workEndHour: number;
  autoLockMinutes: number; autoArchiveDays: number; reminderDaysBefore: number;
  reminderTime: string; reminderPerDay: number;
  telegramBotToken: string | null; telegramTestChatId: string | null;
  zaloBotToken: string | null; zaloTestUserId: string | null;
  language: string; theme: string; dashboardLayout: string; dashboardHidden: string;
};

/** Hand-written JSON in the DB should never crash a page — fall back instead. */
function parseJson<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : (v as T);
  } catch {
    return fallback;
  }
}

export function settingsDTO(s: SettingsRow): SettingsDTO {
  return {
    companyName: s.companyName,
    companyTagline: s.companyTagline,
    workStartHour: s.workStartHour,
    workEndHour: s.workEndHour,
    autoLockMinutes: s.autoLockMinutes,
    autoArchiveDays: s.autoArchiveDays,
    reminderDaysBefore: s.reminderDaysBefore,
    reminderTime: s.reminderTime,
    reminderPerDay: s.reminderPerDay,
    telegramBotToken: s.telegramBotToken ?? '',
    telegramTestChatId: s.telegramTestChatId ?? '',
    zaloBotToken: s.zaloBotToken ?? '',
    zaloTestUserId: s.zaloTestUserId ?? '',
    language: (s.language === 'en' ? 'en' : 'vi') as Lang,
    theme: (s.theme === 'dark' ? 'dark' : 'light') as Theme,
    dashboardLayout: parseJson<DashWidgetLayout[]>(s.dashboardLayout, []),
    dashboardHidden: parseJson<string[]>(s.dashboardHidden, []),
  };
}
