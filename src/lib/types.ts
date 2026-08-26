/**
 * Shared vocabulary for Bach Office.
 *
 * Prisma's SQLite connector has no enums, so the enum-like columns in
 * schema.prisma are plain strings. These unions are the single source of truth
 * for their allowed values, and the `is*` guards below are what every API route
 * validates writes against — a bad value never reaches the database.
 *
 * Stored values are stable ASCII codes (TODO, HIGH, work). Vietnamese is the
 * source language of the UI, so each code has a label map; English comes from
 * the i18n dictionary keyed on those Vietnamese labels.
 */

// ─────────────────────────── work groups ───────────────────────────

export type GroupKey = 'work' | 'sport' | 'life';

export interface WorkGroupDef {
  key: GroupKey;
  name: string;
  icon: string;
  /** Icon name from ICON_PATHS used in the radial group picker. */
  glyph: string;
  color: string;
}

export const WORK_GROUPS: WorkGroupDef[] = [
  { key: 'work', name: 'Work', icon: '💼', glyph: 'briefcase', color: '#006454' },
  { key: 'sport', name: 'Sport', icon: '🏃', glyph: 'activity', color: '#F4622E' },
  { key: 'life', name: 'Life', icon: '🌿', glyph: 'leaf', color: '#118C8C' },
];

export const GROUP_KEYS = WORK_GROUPS.map((g) => g.key);

export function isGroupKey(v: unknown): v is GroupKey {
  return typeof v === 'string' && (GROUP_KEYS as string[]).includes(v);
}

export function groupDef(key: string | null | undefined): WorkGroupDef | null {
  return WORK_GROUPS.find((g) => g.key === key) ?? null;
}

export function groupName(key: string | null | undefined): string {
  return groupDef(key)?.name ?? '';
}

export function groupColor(key: string | null | undefined): string {
  return groupDef(key)?.color ?? 'var(--text-3)';
}

// ─────────────────────────── task status ───────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn thành',
};

/** Class suffixes match the `.status-*` rules already in globals.css. */
export const TASK_STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: 'status-Can-lam',
  IN_PROGRESS: 'status-Dang-lam',
  DONE: 'status-Hoan-thanh',
};

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (TASK_STATUSES as string[]).includes(v);
}

// ─────────────────────────── priority ───────────────────────────

export type Priority = 'ASAP' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITIES: Priority[] = ['ASAP', 'HIGH', 'MEDIUM', 'LOW'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  ASAP: 'ASAP',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

/** Short form used on the coloured pills, where space is tight. */
export const PRIORITY_PILL: Record<Priority, { short: string; cls: string }> = {
  ASAP: { short: 'ASAP', cls: 'pill-ASAP' },
  HIGH: { short: 'CAO', cls: 'pill-CAO' },
  MEDIUM: { short: 'TB', cls: 'pill-TB' },
  LOW: { short: 'THẤP', cls: 'pill-THAP' },
};

/** Bar/pill colour on the calendar, Gantt and timetable. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  ASAP: '#9E1B1B',
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#64748B',
};

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITIES as string[]).includes(v);
}

/** Sort weight — ASAP outranks everything. */
export function priorityRank(p: Priority): number {
  return PRIORITIES.indexOf(p);
}

// ─────────────────────────── project status ───────────────────────────

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export const PROJECT_STATUSES: ProjectStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
};

export function isProjectStatus(v: unknown): v is ProjectStatus {
  return typeof v === 'string' && (PROJECT_STATUSES as string[]).includes(v);
}

export function projectStatusBadgeClass(s: ProjectStatus): string {
  return s === 'COMPLETED' ? 'badge success' : s === 'IN_PROGRESS' ? 'badge purple' : 'badge';
}

// ─────────────────────────── people ───────────────────────────

export type Role = 'OWNER' | 'LEAD' | 'MEMBER';

export const ROLES: Role[] = ['OWNER', 'LEAD', 'MEMBER'];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Chủ sở hữu',
  LEAD: 'Trưởng nhóm',
  MEMBER: 'Người thực hiện',
};

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v);
}

// ─────────────────────────── palettes ───────────────────────────

export const AVATAR_PALETTE = [
  '#2563EB', '#7C3AED', '#EC4899', '#F59E0B',
  '#16A34A', '#0EA5E9', '#EF4444', '#0891B2',
];

export const WORKFLOW_COLORS = [
  '#2563EB', '#7C3AED', '#EC4899', '#F59E0B',
  '#16A34A', '#0EA5E9', '#EF4444', '#64748B',
];

export const WORKFLOW_ICONS = ['folder', 'play', 'star', 'settings', 'target', 'activity', 'chart', 'tag'];
export const PROJECT_ICONS = ['folder', 'briefcase', 'chart', 'globe', 'target', 'star', 'activity', 'leaf', 'archive', 'board'];

/**
 * Seven-step red scale: the nearer the deadline, the deeper the red.
 * Shared by the task list, project rows and subtask chips.
 */
export const DUE_SCALE = [
  { maxDays: 1, bg: '#9E1B1B', fg: '#FFFFFF' },        // overdue / today / tomorrow
  { maxDays: 3, bg: '#C42B26', fg: '#FFFFFF' },        // 2–3 days
  { maxDays: 7, bg: '#E03A3A', fg: '#FFFFFF' },        // 4–7 days
  { maxDays: 14, bg: '#F26161', fg: '#FFFFFF' },       // 8–14 days
  { maxDays: 30, bg: '#F9A3A3', fg: '#5A1010' },       // 15 days – 1 month
  { maxDays: 60, bg: '#FAC4C4', fg: '#5A1010' },       // 1–2 months
  { maxDays: Infinity, bg: '#FCE0E0', fg: '#5A1010' }, // further out
];

export function dueScaleFor(days: number) {
  return DUE_SCALE.find((s) => days <= s.maxDays) ?? DUE_SCALE[DUE_SCALE.length - 1];
}

// ─────────────────────────── settings ───────────────────────────

export const AUTO_LOCK_OPTIONS: Array<[number, string]> = [
  [1, '1 phút'], [5, '5 phút'], [15, '15 phút'],
  [30, '30 phút'], [60, '1 tiếng'], [0, 'Không bao giờ'],
];

export type Lang = 'vi' | 'en';
export type Theme = 'light' | 'dark';

// ─────────────────────────── DTOs ───────────────────────────
// Shapes the API returns. Dates are ISO strings so they survive JSON.

export interface PersonDTO {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  groupKey: GroupKey;
  telegramChatId: string | null;
  zaloUserId: string | null;
}

export interface WorkflowDTO {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export interface SubtaskDTO {
  id: string;
  text: string;
  done: boolean;
  order: number;
  deadline: string | null;
  start: string | null;
  estimateHours: number;
}

export interface CommentDTO {
  id: string;
  text: string;
  createdAt: string;
  authorId: string | null;
}

export interface ActivityDTO {
  id: string;
  text: string;
  createdAt: string;
}

export interface TimeLogDTO {
  id: string;
  start: string;
  end: string;
  minutes: number;
  source: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;
  start: string | null;
  estimateHours: number;
  actualHours: number;
  completion: number;
  pinned: boolean;
  archived: boolean;
  groupKey: GroupKey;
  projectId: string | null;
  workflowId: string | null;
  assigneeId: string | null;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  executorIds: string[];
  hashtags: string[];
  subtasks: SubtaskDTO[];
  comments: CommentDTO[];
  activity: ActivityDTO[];
  timeLogs: TimeLogDTO[];
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  goal: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  endDate: string | null;
  pinned: boolean;
  groupKey: GroupKey;
  ownerId: string | null;
  creatorId: string | null;
  hashtags: string[];
  files: Array<{ id: string; name: string; url: string | null }>;
}

export interface SettingsDTO {
  companyName: string;
  companyTagline: string;
  workStartHour: number;
  workEndHour: number;
  autoLockMinutes: number;
  autoArchiveDays: number;
  reminderDaysBefore: number;
  reminderTime: string;
  reminderPerDay: number;
  telegramBotToken: string;
  telegramTestChatId: string;
  zaloBotToken: string;
  zaloTestUserId: string;
  language: Lang;
  theme: Theme;
  /** Widget id, column span out of 12, and pixel height (0 = auto). */
  dashboardLayout: DashWidgetLayout[];
  dashboardHidden: string[];
}

export interface DashWidgetLayout {
  id: string;
  w: number;
  h: number;
}

// ─────────────────────────── notes ───────────────────────────

export interface NotebookDTO {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  /** True when a PIN is set. The hash itself never leaves the server. */
  locked: boolean;
}

export interface NoteAttachmentDTO {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Present only when the bytes were small enough to inline — see the cap. */
  dataUrl: string | null;
  createdAt: string;
}

export interface NoteVersionDTO {
  id: string;
  title: string;
  createdAt: string;
}

export interface NoteDTO {
  id: string;
  title: string;
  content: string;
  notebookId: string | null;
  projectId: string | null;
  groupKey: GroupKey;
  authorId: string | null;
  favorite: boolean;
  archived: boolean;
  deletedAt: string | null;
  templateKey: string | null;
  createdAt: string;
  updatedAt: string;
  hashtags: string[];
  /** Task ids, from the NoteTaskLink join table. */
  linkedTaskIds: string[];
  attachments: NoteAttachmentDTO[];
  versionCount: number;
}

/** The views in the notes rail. `notebook` and `tag` carry an argument. */
export type NoteView =
  | 'all'
  | 'recent'
  | 'favorites'
  | 'templates'
  | 'archive'
  | 'trash'
  | 'notebook'
  | 'tag';

export interface BootstrapDTO {
  people: PersonDTO[];
  workflows: WorkflowDTO[];
  projects: ProjectDTO[];
  tasks: TaskDTO[];
  hashtags: string[];
  settings: SettingsDTO;
  notes: NoteDTO[];
  notebooks: NotebookDTO[];
}
