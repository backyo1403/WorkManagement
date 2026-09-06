'use client';

/**
 * Small pieces every phone screen repeats: the priority pill, the deadline
 * chip, the 26px avatar and the handful of derivations the cards need.
 *
 * They are separate from `ui/primitives.tsx` because the phone build has its
 * own geometry (10.5px pills, 26px avatars, `border-left` project veins) and
 * its own dark-only palette. The *values* behind them are shared — priority
 * codes, `DUE_SCALE`, `colorFor`/`initials` — so a change to the vocabulary
 * still reaches both builds.
 */

import { colorFor, daysUntil, eventCoversDay, initials } from '@/lib/domain';
import {
  PRIORITY_PILL,
  dueScaleFor,
  type GroupKey,
  type Lang,
  type PersonDTO,
  type Priority,
  type ProjectDTO,
  type TaskDTO,
} from '@/lib/types';
import { usePrefs } from '@/state/PrefsProvider';

/** Group accent on the phone: the `--brand` of each dark group palette. */
export const GROUP_ACCENT: Record<GroupKey, string> = {
  work: 'var(--g-work)',
  sport: 'var(--g-sport)',
  life: 'var(--g-life)',
};

export function groupAccent(key: string | null | undefined): string {
  return GROUP_ACCENT[key as GroupKey] ?? 'var(--brand)';
}

/** A project's colour, or the brand blue for tasks that belong to none. */
export function projectColor(p: ProjectDTO | null | undefined): string {
  return p?.color ?? 'var(--brand)';
}

/**
 * `#RRGGBB` at ~13% alpha, for the tinted card and block backgrounds.
 * Falls back to `color-mix` when the colour is a CSS variable rather than hex.
 */
export function tint(color: string, hexAlpha: string, pct: number): string {
  return color.startsWith('#')
    ? color + hexAlpha
    : `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const { t } = usePrefs();
  return <span className={`m-pri m-pri-${priority}`}>{t(PRIORITY_PILL[priority].short)}</span>;
}

/** The fields a deadline chip needs to read a task. */
type DueLike = Pick<TaskDTO, 'deadline' | 'status' | 'start' | 'estimateHours'>;

/** Short deadline wording used on every card: Xong · Quá hạn · Hôm nay · N ngày. */
export function dueLabel(task: DueLike): string {
  if (task.status === 'DONE') return 'Xong';
  // An event is dated, not due: it says when it happens. A bare `DD/MM` needs
  // no translating, which is why this one can come back unkeyed.
  if (task.status === 'EVENT') {
    if (eventCoversDay(task, new Date())) return 'Hôm nay';
    return task.start ? ddmm(task.start) : '—';
  }
  if (!task.deadline) return '—';
  const d = daysUntil(task.deadline);
  if (d < 0) return 'Quá hạn';
  if (d === 0) return 'Hôm nay';
  if (d === 1) return 'Ngày mai';
  return `${d} ngày`;
}

/**
 * Deadline chip.
 *
 * `DUE_SCALE` measures urgency, so three kinds of task step off it: finished
 * ones and undated ones have no urgency left, and an event is never late — it
 * simply has a date — which is why it takes the status purple instead of a
 * shade of red.
 */
export function DuePill({ task, className = '' }: { task: DueLike; className?: string }) {
  const { t } = usePrefs();
  const cls = `m-due ${className}`.trim();
  const label = t(dueLabel(task));

  if (task.status === 'EVENT') {
    return (
      <span className={cls} style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}>
        {label}
      </span>
    );
  }
  if (task.status === 'DONE' || !task.deadline) {
    return (
      <span className={cls} style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
        {label}
      </span>
    );
  }

  const scale = dueScaleFor(Math.max(0, daysUntil(task.deadline)));
  return (
    <span className={cls} style={{ background: scale.bg, color: scale.fg }}>
      {label}
    </span>
  );
}

/** 26px round avatar — the uploaded image when there is one, initials otherwise. */
export function Initials({
  person,
  className = 'm-initials',
}: {
  person: PersonDTO | null | undefined;
  className?: string;
}) {
  if (!person) return <span className={className}>?</span>;
  if (person.avatarUrl) {
    // Data-URI uploads; next/image would need a loader for no benefit here.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <span className={className}>
        <img src={person.avatarUrl} alt={person.name} />
      </span>
    );
  }
  return (
    <span className={className} style={{ color: colorFor(person.name) }} title={person.name}>
      {initials(person.name)}
    </span>
  );
}

/** `HH:MM` from an ISO instant, for the agenda and timetable columns. */
export function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `DD/MM` — the compact date used on subtask rows and project ranges. */
export function ddmm(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Weekday names, Sunday-indexed to match `Date.getDay()`.
 *
 * Spelled out rather than taken from `toLocaleDateString`: Vietnamese short
 * names come back as "Th 2" there, and the phone grid is built around the
 * two-character `T2…CN` the design calls for.
 */
const DOW_SHORT: Record<Lang, string[]> = {
  vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const DOW_LONG: Record<Lang, string[]> = {
  vi: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export function dowShort(lang: Lang): string[] {
  return DOW_SHORT[lang];
}

/** Monday-first column heads for the month grid. */
export function dowHeads(lang: Lang): string[] {
  const names = DOW_SHORT[lang];
  return [...names.slice(1), names[0]];
}

/** `Thứ Bảy, 05/09/2026` — or `Saturday, 05/09/2026` in English. */
export function longDate(d: Date, lang: Lang): string {
  return `${DOW_LONG[lang][d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
}
