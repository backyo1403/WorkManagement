'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { colorFor, fmtDDMMM, initials, progressGradientColor, dueBadgeStyle } from '@/lib/domain';
import {
  PRIORITY_PILL,
  TASK_STATUSES,
  TASK_STATUS_CLASS,
  TASK_STATUS_LABEL,
  type PersonDTO,
  type Priority,
  type TaskStatus,
} from '@/lib/types';
import { usePrefs } from '@/state/PrefsProvider';

// ─────────────────────────── avatar ───────────────────────────

export function Avatar({ person, size = 26 }: { person: PersonDTO | null | undefined; size?: number }) {
  if (!person) {
    return (
      <span
        className="avatar"
        style={{
          width: size, height: size,
          background: 'var(--surface-2)', color: 'var(--text-3)',
          fontSize: size * 0.5,
        }}
      >
        ?
      </span>
    );
  }
  if (person.avatarUrl) {
    // Data-URI uploads; next/image would need a loader for no benefit here.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        className="avatar"
        src={person.avatarUrl}
        alt={person.name}
        title={person.name}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar"
      title={person.name}
      style={{
        width: size, height: size,
        fontSize: Math.max(9, size * 0.4),
        background: colorFor(person.name),
      }}
    >
      {initials(person.name)}
    </span>
  );
}

// ─────────────────────────── pills & badges ───────────────────────────

export function PriorityPill({ priority }: { priority: Priority }) {
  const { t } = usePrefs();
  const p = PRIORITY_PILL[priority];
  return <span className={`pill ${p.cls}`}>{t(p.short)}</span>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { t } = usePrefs();
  const cls = status === 'DONE' ? 'badge success' : status === 'IN_PROGRESS' ? 'badge today' : 'badge';
  return <span className={cls}>{t(TASK_STATUS_LABEL[status])}</span>;
}

/**
 * The status dropdown. Options carry an explicit `value` so the stored code is
 * never derived from the (translated) label.
 */
export function StatusSelect({
  status,
  onChange,
  onClick,
}: {
  status: TaskStatus;
  onChange: (s: TaskStatus) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { t } = usePrefs();
  return (
    <select
      className={`status-select ${TASK_STATUS_CLASS[status]}`}
      value={status}
      onClick={onClick}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(TASK_STATUS_LABEL[s])}
        </option>
      ))}
    </select>
  );
}

/** "Còn N ngày" / "Quá hạn N ngày", coloured on the seven-step red scale. */
export function DuePill({ deadline, status }: { deadline: string; status: TaskStatus }) {
  const { t } = usePrefs();
  const { days, overdue, bg, fg } = dueBadgeStyle(deadline, status);
  const label = overdue
    ? days === 0
      ? 'Quá hạn'
      : `Quá hạn ${Math.abs(days)} ngày`
    : days === 0
      ? 'Đến hạn hôm nay'
      : `Còn ${days} ngày`;

  if (status === 'DONE') {
    return <span className="due-pill" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{t('Hoàn thành')}</span>;
  }
  return (
    <span className="due-pill" style={{ background: bg, color: fg }}>
      {t(label)}
    </span>
  );
}

/** Deadline in its own cell, as DD-MMM. */
export function DueDate({ deadline, status }: { deadline: string | null; status: TaskStatus }) {
  if (!deadline) return <span className="due-date muted">—</span>;
  const overdue = new Date(deadline) < new Date() && status !== 'DONE';
  return (
    <span className={`due-date${overdue ? ' overdue' : ''}`}>
      <Icon name="calendar" size={12} />
      {fmtDDMMM(deadline)}
    </span>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: progressGradientColor(pct) }}
      />
    </div>
  );
}

export function PinButton({
  pinned,
  onToggle,
}: {
  pinned: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const { t } = usePrefs();
  return (
    <button
      type="button"
      className={`btn-icon pin-btn${pinned ? ' pinned' : ''}`}
      title={t(pinned ? 'Bỏ ghim' : 'Ghim lên đầu')}
      onClick={onToggle}
    >
      <Icon name="pin" size={14} />
    </button>
  );
}

// ─────────────────────────── completion checkbox ───────────────────────────

/**
 * Round checkbox with the tick drawn in on completion, plus a light particle
 * burst. Both are skipped when the user prefers reduced motion.
 */
export function TaskCheck({
  done,
  size = 20,
  onToggle,
}: {
  done: boolean;
  size?: number;
  onToggle?: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [justDone, setJustDone] = useState(false);
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      setJustDone(true);
      sparkBurst(ref.current);
      const id = setTimeout(() => setJustDone(false), 340);
      return () => clearTimeout(id);
    }
    prevDone.current = done;
  }, [done]);

  return (
    <span
      ref={ref}
      className={`task-check${done ? ' done' : ''}${justDone ? ' just-done' : ''}`}
      style={{ width: size, height: size }}
      onClick={onToggle}
      role={onToggle ? 'button' : undefined}
      aria-pressed={onToggle ? done : undefined}
    >
      {done && (
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
          <path className="tick" d="M4 12.5 9.5 18 20 6.5" />
        </svg>
      )}
    </span>
  );
}

/** Eight short-lived dots flung out from the element's centre. */
export function sparkBurst(el: HTMLElement | null) {
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ['#16A34A', '#22C55E', '#4ADE80', '#F59E0B'];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const dist = 18 + Math.random() * 14;
    const dot = document.createElement('span');
    dot.className = 'spark';
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    dot.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 500);
  }
}

// ─────────────────────────── hover cards ───────────────────────────

/**
 * Hover cards open downward by default; near the bottom or right edge that
 * would clip them, so measure once on mount and flip.
 */
export function useHoverCardFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [cls, setCls] = useState('');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anchor = el.parentElement?.getBoundingClientRect();
    if (!anchor) return;
    const r = el.getBoundingClientRect();
    let next = '';
    if (anchor.bottom + r.height + 12 > window.innerHeight && anchor.top - r.height - 12 > 0) {
      next += ' flip-up';
    }
    if (anchor.left + r.width + 12 > window.innerWidth) next += ' flip-left';
    setCls(next);
  }, []);

  return { ref, cls };
}

// ─────────────────────────── modal ───────────────────────────

export function Modal({
  title,
  icon,
  wide,
  onClose,
  children,
}: {
  title: React.ReactNode;
  icon?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {icon && <Icon name={icon} size={18} />}
            {title}
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'folder', children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="glyph">
        <Icon name={icon} size={30} />
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────── page header ───────────────────────────

export function PageHeader({
  title,
  icon,
  sub,
  actions,
}: {
  title: string;
  icon?: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { t } = usePrefs();
  return (
    <div className="page-header">
      <div className="page-header-main">
        <div className="page-title">
          {icon && (
            <span className="page-title-icon">
              <Icon name={icon} size={20} />
            </span>
          )}
          {t(title)}
        </div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
