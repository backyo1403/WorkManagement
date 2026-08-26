'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { DuePill, EmptyState } from '@/components/ui/primitives';
import { TaskHoverCard } from '@/components/task/TaskHoverCard';
import { QuickComposer } from '@/components/shell/QuickComposer';
import { timetableEntries } from '@/lib/timetable';
import { addDays, deadlineRisk, isOverdue, locale, startOfDay, ymdLocal } from '@/lib/domain';
import { liveNotes, noteTitle, relativeTime } from '@/lib/notes';
import { WORK_GROUPS, type TaskDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';

/** Tasks in scope for every dashboard widget: live, and in the active group. */
export function useScopedTasks(): TaskDTO[] {
  const { tasks } = useData();
  const { group } = usePrefs();
  return useMemo(
    () => tasks.filter((x) => !x.archived && (!group || x.groupKey === group)),
    [tasks, group],
  );
}

export function statusCounts(ts: TaskDTO[]) {
  return {
    todo: ts.filter((x) => x.status === 'TODO' && !isOverdue(x)).length,
    doing: ts.filter((x) => x.status === 'IN_PROGRESS' && !isOverdue(x)).length,
    done: ts.filter((x) => x.status === 'DONE').length,
    overdue: ts.filter(isOverdue).length,
  };
}

// ─────────────────────────── charts ───────────────────────────

/** Donut built from raw SVG arcs — no chart library for four numbers. */
function Donut({ segments, size = 128 }: { segments: Array<{ value: number; color: string }>; size?: number }) {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let cum = 0;

  const paths = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total;
      const a0 = cum * 2 * Math.PI;
      cum += frac;
      const a1 = cum * 2 * Math.PI;
      const x1 = cx + r * Math.sin(a0);
      const y1 = cy - r * Math.cos(a0);
      const x2 = cx + r * Math.sin(a1);
      const y2 = cy - r * Math.cos(a1);
      const large = frac > 0.5 ? 1 : 0;
      // A single full segment cannot be drawn as an arc — close the circle instead.
      const d =
        frac >= 0.999
          ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r} Z`
          : `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
      return <path key={i} d={d} fill={s.color} />;
    });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.58} fill="var(--surface)" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill="var(--text)">
        {total}
      </text>
    </svg>
  );
}

function LineChart({
  a,
  b,
  colorA,
  colorB,
}: {
  a: number[];
  b: number[];
  colorA: string;
  colorB: string;
}) {
  const w = 520;
  const h = 140;
  const pad = 8;
  const max = Math.max(1, ...a, ...b);
  const stepX = (w - pad * 2) / (a.length - 1 || 1);
  const pt = (arr: number[], i: number) =>
    `${(pad + i * stepX).toFixed(1)},${(h - pad - (arr[i] / max) * (h - pad * 2)).toFixed(1)}`;
  const lineA = a.map((_, i) => pt(a, i)).join(' ');
  const lineB = b.map((_, i) => pt(b, i)).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polygon points={`${pad},${h - pad} ${lineA} ${w - pad},${h - pad}`} fill={colorA} opacity={0.12} />
      <polyline points={lineA} fill="none" stroke={colorA} strokeWidth={2.5} />
      <polyline points={lineB} fill="none" stroke={colorB} strokeWidth={2.5} />
    </svg>
  );
}

// ─────────────────────────── widgets ───────────────────────────

export function WgComposer() {
  return <QuickComposer />;
}

export function WgStats() {
  const ts = useScopedTasks();
  const { t } = usePrefs();
  const router = useRouter();
  const c = statusCounts(ts);
  const totalPct = ts.length ? Math.round((c.done / ts.length) * 100) : 0;

  const cards = [
    { cls: 'stat-blue', ico: 'check', num: ts.length, label: 'Tổng công việc', link: `${totalPct}% hoàn thành · Xem →`, to: '/tasks', bar: totalPct },
    { cls: 'stat-amber', ico: 'clock', num: c.doing, label: 'Đang thực hiện', link: 'Xem bảng tiến độ →', to: '/kanban' },
    { cls: 'stat-green', ico: 'target', num: c.done, label: 'Hoàn thành', link: 'Đã hoàn thành →', to: '/tasks' },
    { cls: 'stat-red', ico: 'alert', num: c.overdue, label: 'Quá hạn', link: 'Cần xử lý ngay →', to: '/tasks' },
  ];

  return (
    <div className="stat-row">
      {cards.map((card) => (
        <div className={`stat-card ${card.cls}`} key={card.label}>
          <div className="stat-icon">
            <Icon name={card.ico} size={17} />
          </div>
          <div className="stat-num">{card.num}</div>
          <div className="stat-label">{t(card.label)}</div>
          {card.bar !== undefined ? (
            <div className="mini-progress">
              <div className="mini-progress-fill" style={{ width: `${card.bar}%`, background: 'var(--brand)' }} />
            </div>
          ) : (
            <div style={{ height: 5 }} />
          )}
          <a className="stat-link" style={{ cursor: 'pointer' }} onClick={() => router.push(card.to)}>
            {t(card.link)}
          </a>
        </div>
      ))}
    </div>
  );
}

export function WgBar7() {
  const ts = useScopedTasks();
  const { lang, t } = usePrefs();

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const series = days.map((d) => {
    const created = ts.filter((x) => new Date(x.createdAt).toDateString() === d.toDateString());
    return {
      todo: created.filter((x) => x.status === 'TODO').length,
      doing: created.filter((x) => x.status === 'IN_PROGRESS').length,
      done: created.filter((x) => x.status === 'DONE').length,
      overdue: created.filter(isOverdue).length,
    };
  });
  const max = Math.max(1, ...series.map((s) => s.todo + s.doing + s.done + s.overdue));
  const segs: Array<[keyof (typeof series)[number], string, string]> = [
    ['todo', 'var(--text-3)', 'Cần làm'],
    ['doing', 'var(--brand)', 'Đang làm'],
    ['done', 'var(--success)', 'Hoàn thành'],
    ['overdue', 'var(--danger)', 'Quá hạn'],
  ];

  return (
    <>
      <div className="bar-chart">
        {series.map((s, i) => {
          const total = s.todo + s.doing + s.done + s.overdue;
          const h = Math.max(2, (total / max) * 118);
          return (
            <div className="bar-col" key={i}>
              <div
                style={{
                  display: 'flex', flexDirection: 'column-reverse', width: 26,
                  height: h, borderRadius: '6px 6px 3px 3px', overflow: 'hidden',
                }}
              >
                {segs.map(([k, color]) =>
                  s[k] ? (
                    <div key={k} style={{ width: '100%', height: total ? (s[k] / total) * h : 0, background: color }} />
                  ) : null,
                )}
              </div>
              <div className="bar-label">
                {days[i].toLocaleDateString(locale(lang), { weekday: 'short' })}
                <br />
                {days[i].getDate()}/{days[i].getMonth() + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        {segs.map(([k, color, label]) => (
          <div className="legend-item" key={k}>
            <span className="legend-dot" style={{ background: color }} />
            {t(label)}
          </div>
        ))}
      </div>
    </>
  );
}

export function WgDonut() {
  const ts = useScopedTasks();
  const { t } = usePrefs();
  const c = statusCounts(ts);
  const rows: Array<[string, string, number]> = [
    ['#94A3B8', 'Cần làm', c.todo],
    ['var(--brand)', 'Đang làm', c.doing],
    ['var(--success)', 'Hoàn thành', c.done],
    ['var(--danger)', 'Quá hạn', c.overdue],
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <Donut segments={rows.map(([color, , value]) => ({ color, value }))} />
      <div style={{ flex: 1, minWidth: 130 }}>
        {rows.map(([color, label, value]) => (
          <div className="legend-item" key={label} style={{ marginBottom: 8 }}>
            <span className="legend-dot" style={{ background: color }} />
            {t(label)} <b style={{ marginLeft: 'auto' }}>{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WgTrend30() {
  const ts = useScopedTasks();
  const { t } = usePrefs();
  const days = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i - 29));
  const created = days.map(
    (d) => ts.filter((x) => new Date(x.createdAt).toDateString() === d.toDateString()).length,
  );
  const completed = days.map(
    (d) => ts.filter((x) => x.completedAt && new Date(x.completedAt).toDateString() === d.toDateString()).length,
  );

  return (
    <>
      <LineChart a={created} b={completed} colorA="var(--purple)" colorB="var(--success)" />
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--purple)' }} />
          {t('Tạo mới')}
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--success)' }} />
          {t('Hoàn thành')}
        </div>
      </div>
    </>
  );
}

export function WgByGroup() {
  const ts = useScopedTasks();
  const { t } = usePrefs();
  const stats = WORK_GROUPS.map((g) => {
    const mine = ts.filter((x) => x.groupKey === g.key);
    return { g, total: mine.length, done: mine.filter((x) => x.status === 'DONE').length };
  }).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...stats.map((s) => s.total));

  if (!stats.some((s) => s.total)) {
    return (
      <div className="empty-state" style={{ padding: 20 }}>
        {t('Chưa có dữ liệu')}
      </div>
    );
  }

  return (
    <>
      {stats.map((s) => (
        <div className="hbar-row" key={s.g.key}>
          <div className="hbar-label">{s.g.name}</div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(s.total / max) * 100}%`, background: s.g.color }} />
          </div>
          <div className="hbar-value">
            {s.done}/{s.total}
          </div>
        </div>
      ))}
    </>
  );
}

export function WgAttention({ onOpen }: { onOpen: (id: string) => void }) {
  const ts = useScopedTasks();
  const { projects, settings } = useData();
  const { t } = usePrefs();

  const list = ts
    .filter((x) => x.status !== 'DONE')
    .map((x) => ({ x, risk: deadlineRisk(x, settings.workStartHour, settings.workEndHour) }))
    .filter((r) => r.risk.level === 'high' || r.risk.level === 'medium' || isOverdue(r.x))
    .sort(
      (a, b) =>
        Number(isOverdue(b.x)) - Number(isOverdue(a.x)) ||
        +new Date(a.x.deadline ?? '2999') - +new Date(b.x.deadline ?? '2999'),
    )
    .slice(0, 6);

  if (!list.length) {
    return (
      <EmptyState icon="target">
        <div style={{ height: 8 }} />
        {t('Không có việc nào cần chú ý ngay bây giờ')}
      </EmptyState>
    );
  }

  return (
    <>
      {list.map(({ x }) => {
        const proj = projects.find((p) => p.id === x.projectId) ?? null;
        const overdue = isOverdue(x);
        return (
          <div
            className="task-row"
            key={x.id}
            style={{ marginBottom: 8, borderLeft: `3px solid ${overdue ? 'var(--danger)' : 'var(--warning)'}` }}
            onClick={() => onOpen(x.id)}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 650, fontSize: 13.5, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {x.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{proj?.name ?? ''}</div>
            </span>
            {x.deadline && <DuePill deadline={x.deadline} status={x.status} />}
          </div>
        );
      })}
    </>
  );
}

export function WgMonthCal({ onOpenDay }: { onOpenDay: (ymd: string) => void }) {
  const ts = useScopedTasks();
  const { t } = usePrefs();
  const [offset, setOffset] = useState(0);

  const base = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);

  const cells = useMemo(() => {
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [base]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    ts.forEach((x) => {
      if (!x.deadline) return;
      const k = new Date(x.deadline).toDateString();
      const arr = map.get(k);
      if (arr) arr.push(x);
      else map.set(k, [x]);
    });
    return map;
  }, [ts]);

  const today = new Date();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className="btn-icon"
          style={{ width: 26, height: 26 }}
          onClick={() => setOffset((o) => o - 1)}
        >
          <Icon name="chevron-left" size={12} />
        </button>
        <b style={{ fontSize: 13 }}>{t(`Tháng ${base.getMonth() + 1}/${base.getFullYear()}`)}</b>
        <button
          type="button"
          className="btn-icon"
          style={{ width: 26, height: 26 }}
          onClick={() => setOffset((o) => o + 1)}
        >
          <Icon name="chevron" size={12} />
        </button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setOffset(0)}>
          {t('Hôm nay')}
        </button>
      </div>

      <div className="dash-cal">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
          <div className="dash-cal-head" key={d}>
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const inMonth = d.getMonth() === base.getMonth();
          const isToday = d.toDateString() === today.toDateString();
          const list = byDay.get(d.toDateString()) ?? [];
          return (
            <div
              key={ymdLocal(d)}
              className={`dash-cal-cell${inMonth ? '' : ' dim'}${isToday ? ' today' : ''}`}
              title={`${list.length} nhiệm vụ`}
              onClick={() => onOpenDay(ymdLocal(d))}
            >
              <span>{d.getDate()}</span>
              {list.length > 0 && (
                <i
                  className="dash-cal-dot"
                  style={{ background: list.some(isOverdue) ? 'var(--danger)' : 'var(--brand)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function WgTimetableToday({ onOpen }: { onOpen: (id: string) => void }) {
  const ts = useScopedTasks();
  const { tasks, projects } = useData();
  const { lang, t } = usePrefs();

  const today = startOfDay(new Date());
  const list = timetableEntries(ts)
    .filter((e) => new Date(e.start).toDateString() === today.toDateString())
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  if (!list.length) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="glyph">🌤️</div>
        {t('Hôm nay chưa có việc nào đặt giờ')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: '100%', overflowY: 'auto' }}>
      {list.map((e) => {
        const proj = projects.find((p) => p.id === e.projectId) ?? null;
        const color = proj?.color ?? 'var(--brand)';
        const task = tasks.find((x) => x.id === e.openId) ?? null;
        return (
          <div className="task-row-wrap" key={e.key}>
            <div
              className="task-row"
              style={{ borderLeft: `3px solid ${color}`, opacity: e.done ? 0.6 : 1 }}
              onClick={() => onOpen(e.openId)}
            >
              <span style={{ fontWeight: 800, fontSize: 12.5, color, width: 46, flexShrink: 0 }}>
                {new Date(e.start).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`task-title${e.done ? ' done' : ''}`}>
                {e.isSubtask ? '↳ ' : ''}
                {e.title}
              </span>
              {task?.deadline && task.status !== 'DONE' && (
                <DuePill deadline={task.deadline} status={task.status} />
              )}
            </div>
            {task && <TaskHoverCard task={task} full />}
          </div>
        );
      })}
    </div>
  );
}

export function WgRecentNotes() {
  const { notes, notebooks } = useData();
  const { group, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();
  const router = useRouter();

  const list = useMemo(
    () =>
      liveNotes(notes, group)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
        .slice(0, 6),
    [notes, group],
  );

  if (!list.length) {
    return (
      <EmptyState icon="edit">
        <div style={{ marginTop: 8 }}>{t('Chưa có ghi chú nào')}</div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => router.push('/notes')}
        >
          <Icon name="plus" size={13} /> {t('Tạo ghi chú đầu tiên')}
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="dash-notes">
      {list.map((n) => {
        const nb = notebooks.find((x) => x.id === n.notebookId);
        const sealed = !!nb?.locked && !isUnlocked(nb.id);
        return (
          <button
            key={n.id}
            type="button"
            className="dash-note-row"
            onClick={() => router.push(`/notes/${n.id}`)}
          >
            <Icon name={sealed ? 'lock' : 'edit'} size={14} />
            <span className="dash-note-main">
              <span className="dash-note-title">{sealed ? nb!.name : noteTitle(n)}</span>
              <em>
                {relativeTime(n.updatedAt)}
                {!sealed && n.linkedTaskIds.length > 0
                  ? ` · ${t(`${n.linkedTaskIds.length} nhiệm vụ`)}`
                  : ''}
              </em>
            </span>
            {n.favorite && <Icon name="star-filled" size={12} className="note-fav" />}
          </button>
        );
      })}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push('/notes')}>
        {t('Xem tất cả')} →
      </button>
    </div>
  );
}

/** Ticking clock in the dashboard top bar. */
export function DashClock() {
  const { lang } = usePrefs();
  const [now, setNow] = useState<Date | null>(null);

  // Starts as null so the server and first client render agree; the clock
  // appears on the first tick rather than causing a hydration mismatch.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dash-clock" title="Đồng hồ">
      <span className="dash-clock-time">
        {now ? now.toLocaleTimeString(locale(lang), { hour12: false }) : '--:--:--'}
      </span>
      <span className="dash-clock-date">
        {now ? now.toLocaleDateString(locale(lang), { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''}
      </span>
    </div>
  );
}
