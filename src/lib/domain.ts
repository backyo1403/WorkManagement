/**
 * Pure helpers shared by the server and the client: dates, formatting, and the
 * derived numbers (completion, progress, workload, deadline risk) that several
 * views all need to agree on.
 *
 * Nothing here touches the DOM or Prisma, so both sides can import it freely.
 */

import {
  AVATAR_PALETTE,
  Lang,
  Priority,
  TaskStatus,
  TaskDTO,
  SubtaskDTO,
  dueScaleFor,
} from './types';

// ─────────────────────────── dates ───────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function locale(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'vi-VN';
}

/**
 * YYYY-MM-DD in LOCAL time. `toISOString()` would shift the date by a day for
 * anyone east of UTC, which silently mis-targets day clicks on the calendar.
 */
export function ymdLocal(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** DD-MMM, e.g. `12-Aug`. */
export function fmtDDMMM(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '-' + MONTHS_SHORT[d.getMonth()];
}

export function fmtHM(iso: string): string {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function fmtDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const n = new Date();
  if (d.toDateString() === n.toDateString()) {
    return 'Hôm nay ' + d.toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(locale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTimeFull(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(locale(lang), {
    weekday: 'short', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** ISO → value for `<input type="datetime-local">`, in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** ISO → value for `<input type="date">`, in local time. */
export function toLocalDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** ISO → value for `<input type="time">`. */
export function toLocalTimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return fmtHM(iso);
}

export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

/** Combine a `date` input and an optional `time` input into an ISO instant. */
export function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday-first start of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;
  return addDays(x, -dow);
}

export function isSameDay(a: string | Date | null | undefined, b?: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  const n = b ? new Date(b) : new Date();
  return d.toDateString() === n.toDateString();
}

/** Whole days from today until `iso` — negative once it is in the past. */
export function daysUntil(iso: string): number {
  const d = startOfDay(new Date(iso)).getTime();
  const n = startOfDay(new Date()).getTime();
  return Math.round((d - n) / 86400000);
}

export function dayPart(): 'sáng' | 'chiều' | 'tối' {
  const h = new Date().getHours();
  return h < 12 ? 'sáng' : h < 18 ? 'chiều' : 'tối';
}

// ─────────────────────────── task derivations ───────────────────────────

export function isOverdue(t: Pick<TaskDTO, 'deadline' | 'status' | 'archived'>): boolean {
  return !!t.deadline && new Date(t.deadline) < new Date() && t.status !== 'DONE' && !t.archived;
}

/**
 * Single source of truth for progress:
 *   · with subtasks    → % of subtasks done
 *   · without subtasks → 0% while To do / In progress, 100% once Done
 */
export function computeCompletion(t: { status: TaskStatus; subtasks?: SubtaskDTO[] }): number {
  if (t.status === 'DONE') return 100;
  const list = t.subtasks;
  if (!list || !list.length) return 0;
  return Math.round((list.filter((c) => c.done).length / list.length) * 100);
}

/** Red → amber → green ramp used everywhere completion is shown. */
export function progressGradientColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  const RED = [239, 68, 68];
  const AMBER = [245, 158, 11];
  const GREEN = [22, 163, 74];
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mix =
    p <= 50
      ? [0, 1, 2].map((i) => lerp(RED[i], AMBER[i], p / 50))
      : [0, 1, 2].map((i) => lerp(AMBER[i], GREEN[i], (p - 50) / 50));
  return '#' + mix.map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Background/foreground for the "N days left" badge. */
export function dueBadgeStyle(deadline: string, status: TaskStatus) {
  const days = daysUntil(deadline);
  const overdue = days < 0 && status !== 'DONE';
  const scale = dueScaleFor(overdue ? 0 : days);
  return { days, overdue, bg: scale.bg, fg: scale.fg };
}

// ─────────────────────────── people ───────────────────────────

export function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  const p = (name || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

// ─────────────────────────── hashtags ───────────────────────────

export function normalizeTag(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 32);
}

// ─────────────────────────── scheduling / risk ───────────────────────────

/**
 * Working hours available between `from` and `until`, honouring the configured
 * work day and skipping weekends. Feeds the deadline-risk estimate.
 */
export function availableWorkingHours(
  until: string | Date,
  from: Date,
  workStart: number,
  workEnd: number,
): number {
  let hours = 0;
  const cur = new Date(from);
  const end = new Date(until);
  if (end <= cur) return 0;
  while (cur < end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      const dayStart = new Date(cur);
      dayStart.setHours(workStart, 0, 0, 0);
      const dayEnd = new Date(cur);
      dayEnd.setHours(workEnd, 0, 0, 0);
      const winStart = cur > dayStart ? cur : dayStart;
      const winEnd = end < dayEnd ? end : dayEnd;
      if (winEnd > winStart) hours += (winEnd.getTime() - winStart.getTime()) / 3600000;
    }
    cur.setDate(cur.getDate() + 1);
    cur.setHours(0, 0, 0, 0);
  }
  return hours;
}

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export interface Risk {
  level: RiskLevel;
  remainingEffort?: number;
  avail?: number;
  reason?: string;
}

/**
 * Compares the effort still outstanding against the working hours left before
 * the deadline. Deterministic — no AI involved, so it is instant and offline.
 */
export function deadlineRisk(t: TaskDTO, workStart: number, workEnd: number): Risk {
  if (!t.deadline || t.status === 'DONE' || t.archived) return { level: 'none' };
  const remainingEffort = Math.max(0, (t.estimateHours || 1) * (1 - (t.completion || 0) / 100));
  const avail = availableWorkingHours(t.deadline, new Date(), workStart, workEnd);
  if (isOverdue(t)) return { level: 'high', remainingEffort, avail, reason: 'Đã quá hạn' };
  if (avail <= 0) {
    return { level: 'high', remainingEffort, avail, reason: 'Không còn thời gian làm việc trước hạn' };
  }
  const ratio = remainingEffort / avail;
  if (ratio >= 0.8) {
    return { level: 'high', remainingEffort, avail, reason: 'Khối lượng còn lại vượt thời gian có sẵn' };
  }
  if (ratio >= 0.45) return { level: 'medium', remainingEffort, avail, reason: 'Gấp nhưng vẫn khả thi' };
  return { level: 'low', remainingEffort, avail, reason: 'Đúng tiến độ' };
}

// ─────────────────────────── sorting ───────────────────────────

export type TaskSort = 'deadline' | 'priority' | 'created' | 'title' | 'progress';

export const TASK_SORTS: Array<[TaskSort, string]> = [
  ['deadline', 'Hạn chót gần nhất'],
  ['priority', 'Độ ưu tiên'],
  ['created', 'Mới tạo trước'],
  ['title', 'Tên (A-Z)'],
  ['progress', 'Tiến độ cao nhất'],
];

const PRIORITY_ORDER: Priority[] = ['ASAP', 'HIGH', 'MEDIUM', 'LOW'];

export function sortTasks(list: TaskDTO[], sortBy: TaskSort): TaskDTO[] {
  const out = [...list];
  switch (sortBy) {
    case 'priority':
      out.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
      break;
    case 'created':
      out.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      break;
    case 'title':
      out.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
      break;
    case 'progress':
      out.sort((a, b) => b.completion - a.completion);
      break;
    default:
      // Undated tasks sink below dated ones rather than sorting as epoch 0.
      out.sort((a, b) => {
        const av = a.deadline ? +new Date(a.deadline) : Infinity;
        const bv = b.deadline ? +new Date(b.deadline) : Infinity;
        return av - bv;
      });
  }
  return out;
}

/** Pinned rows float to the top of whatever order the list is already in. */
export function pinnedFirst<T extends { pinned: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}
