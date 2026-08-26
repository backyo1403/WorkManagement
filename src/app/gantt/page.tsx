'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, PageHeader } from '@/components/ui/primitives';
import { TaskModal } from '@/components/task/TaskModal';
import { startOfDay } from '@/lib/domain';
import {
  PRIORITY_COLOR,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  WORK_GROUPS,
  type TaskDTO,
  type TaskStatus,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * Seven discrete zoom levels rather than a continuous scale: each one picks a
 * column width and a default window, so the chart stays readable instead of
 * degrading into unlabelled slivers.
 */
const GANTT_ZOOMS = [
  { w: 12, before: 14, after: 104 },
  { w: 18, before: 10, after: 70 },
  { w: 26, before: 7, after: 45 },
  { w: 42, before: 4, after: 24 },
  { w: 64, before: 3, after: 15 },
  { w: 92, before: 2, after: 10 },
  { w: 130, before: 1, after: 6 },
];

const daysBetween = (a: Date, b: Date) =>
  (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000;

interface Span {
  task: TaskDTO;
  s: Date;
  e: Date;
}

export default function GanttPage() {
  const { tasks, projects, people, updateTask } = useData();
  const { group, lang, t } = usePrefs();
  const toast = useToast();

  const [zoomIdx, setZoomIdx] = useState(3);
  const [sideWidth, setSideWidth] = useState(220);
  const [filters, setFilters] = useState({ projectId: '', groupKey: '', personId: '', status: '' });
  const [modalId, setModalId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const Z = GANTT_ZOOMS[zoomIdx];
  const DAY_W = Z.w;

  /** Tasks that pass the filters, with a start/end resolved for every bar. */
  const spans = useMemo<Span[]>(() => {
    let list = tasks.filter(
      (x) => !x.archived && (!group || x.groupKey === group) && (x.start || x.deadline),
    );
    if (filters.projectId) list = list.filter((x) => x.projectId === filters.projectId);
    if (filters.groupKey) list = list.filter((x) => x.groupKey === filters.groupKey);
    if (filters.personId) {
      list = list.filter(
        (x) => x.assigneeId === filters.personId || x.executorIds.includes(filters.personId),
      );
    }
    if (filters.status) list = list.filter((x) => x.status === filters.status);

    return list
      .map((task): Span | null => {
        let s = task.start ? new Date(task.start) : null;
        let e = task.deadline ? new Date(task.deadline) : null;
        // A task with only one endpoint still deserves a visible bar.
        if (!s && e) {
          s = new Date(e);
          s.setDate(s.getDate() - 1);
        }
        if (!e && s) {
          e = new Date(s);
          e.setHours(e.getHours() + Math.max(2, task.estimateHours || 1));
        }
        if (!s || !e) return null;
        if (e < s) e = new Date(s.getTime() + 3600000);
        return { task, s, e };
      })
      .filter((x): x is Span => x !== null);
  }, [tasks, group, filters]);

  /**
   * The window always covers every bar plus a day of padding, so scrolling
   * reaches them all instead of stopping at a fixed window around today.
   */
  const range = useMemo(() => {
    const today = startOfDay(new Date());
    let start = new Date(today);
    start.setDate(start.getDate() - Z.before);
    let end = new Date(today);
    end.setDate(end.getDate() + Z.after);

    spans.forEach(({ s, e }) => {
      const s0 = startOfDay(s);
      const e0 = startOfDay(e);
      if (s0 < start) start = s0;
      if (e0 > end) end = e0;
    });
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);
    return { start, dayCount: Math.max(1, Math.round(daysBetween(start, end)) + 1) };
  }, [spans, Z]);

  const rows = useMemo(
    () =>
      spans
        .map(({ task, s, e }) => ({
          task,
          offset: daysBetween(range.start, s),
          width: Math.max(0.35, daysBetween(s, e) || 0.35),
        }))
        .sort((a, b) => a.offset - b.offset),
    [spans, range.start],
  );

  const days = useMemo(
    () =>
      Array.from({ length: range.dayCount }, (_, i) => {
        const d = new Date(range.start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [range],
  );

  const today = startOfDay(new Date());
  const todayOffset = daysBetween(range.start, today);
  const compact = DAY_W < 30;
  const showMonthBand = DAY_W < 46;

  const applyZoom = (delta: number) =>
    setZoomIdx((i) => Math.max(0, Math.min(GANTT_ZOOMS.length - 1, i + delta)));

  // Wheel over the chart zooms the date scale; shift+wheel scrolls normally.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lock = false;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) return;
      e.preventDefault();
      if (lock) return;
      lock = true;
      setTimeout(() => {
        lock = false;
      }, 90);
      applyZoom(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const startSideResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sideWidth;
    const onMove = (ev: MouseEvent) =>
      setSideWidth(Math.max(140, Math.min(460, startWidth + (ev.clientX - startX))));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  /** Drag a bar sideways to shift both its start and deadline by whole days. */
  const startBarDrag = (e: React.MouseEvent, task: TaskDTO) => {
    e.preventDefault();
    const bar = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startLeft = parseFloat(bar.style.left);
    let dragged = false;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      bar.style.left = `${startLeft + dx}px`;
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // A click that never moved is a request to open the task, not reschedule.
      if (!dragged) {
        setModalId(task.id);
        return;
      }
      const deltaDays = Math.round((ev.clientX - startX) / DAY_W);
      bar.style.left = `${startLeft}px`;
      if (deltaDays === 0) return;

      const patch: Record<string, unknown> = {
        activity: `Dời lịch ${deltaDays > 0 ? '+' : ''}${deltaDays} ngày (kéo thả Gantt)`,
      };
      if (task.start) {
        const s = new Date(task.start);
        s.setDate(s.getDate() + deltaDays);
        patch.start = s.toISOString();
      }
      if (task.deadline) {
        const dl = new Date(task.deadline);
        dl.setDate(dl.getDate() + deltaDays);
        patch.deadline = dl.toISOString();
      }
      void updateTask(task.id, patch);
      toast(`Đã dời "${task.title}" ${deltaDays > 0 ? '+' : ''}${deltaDays} ngày`);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Month band groups consecutive days that share a month.
  const monthGroups = useMemo(() => {
    const out: Array<{ key: string; n: number; label: string }> = [];
    days.forEach((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.n++;
      else out.push({ key, n: 1, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` });
    });
    return out;
  }, [days]);

  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  return (
    <div className="view-enter">
      <PageHeader
        title="Sơ đồ Gantt"
        icon="gantt"
        sub="Kéo thanh để đổi lịch · cuộn chuột trên bảng để zoom ngày · kéo vạch dọc để mở rộng cột tên"
        actions={
          <>
            <button
              type="button"
              className="btn-icon"
              title={t('Thu nhỏ (xem xa hơn)')}
              onClick={() => applyZoom(-1)}
            >
              <Icon name="minus" size={15} />
            </button>
            <span className="badge" title="Mức thu phóng">
              {t(`${range.dayCount} ngày`)}
            </span>
            <button
              type="button"
              className="btn-icon"
              title={t('Phóng to (xem chi tiết)')}
              onClick={() => applyZoom(1)}
            >
              <Icon name="plus" size={15} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFilters({ projectId: '', groupKey: '', personId: '', status: '' })}
            >
              <Icon name="refresh" size={15} /> {t('Đặt lại bộ lọc')}
            </button>
          </>
        }
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="filter-select"
            value={filters.projectId}
            onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
          >
            <option value="">{t('Tất cả Dự án')}</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filters.groupKey}
            onChange={(e) => setFilters((f) => ({ ...f, groupKey: e.target.value }))}
          >
            <option value="">{t('Tất cả Nhóm công việc')}</option>
            {WORK_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filters.personId}
            onChange={(e) => setFilters((f) => ({ ...f, personId: e.target.value }))}
          >
            <option value="">{t('Tất cả Người thực hiện phụ trách')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TaskStatus | '' }))}
          >
            <option value="">{t('Tất cả Trạng thái')}</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(TASK_STATUS_LABEL[s])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="gantt-wrap">
        <div className="gantt-side" style={{ width: sideWidth }}>
          <div className="gantt-side-head">{t('Nhiệm vụ / Người thực hiện')}</div>
          {rows.length ? (
            rows.map((r) => {
              const a = people.find((p) => p.id === r.task.assigneeId) ?? null;
              return (
                <div
                  className="gantt-side-row"
                  key={r.task.id}
                  title={r.task.title}
                  onClick={() => setModalId(r.task.id)}
                >
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: PRIORITY_COLOR[r.task.priority],
                    }}
                  />
                  <span
                    style={{
                      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 600,
                    }}
                  >
                    {r.task.title}
                  </span>
                  {a && <Avatar person={a} size={18} />}
                </div>
              );
            })
          ) : (
            <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-3)' }}>
              {t('Không có nhiệm vụ trong bộ lọc hiện tại')}
            </div>
          )}
        </div>

        <div
          style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)' }}
          onMouseDown={startSideResize}
        />

        <div className="gantt-scroll" ref={scrollRef}>
          <div style={{ width: range.dayCount * DAY_W, position: 'relative' }}>
            {showMonthBand && (
              <div style={{ display: 'flex', height: 20, borderBottom: '1px solid var(--border)' }}>
                {monthGroups.map((g) => (
                  <div
                    key={g.key}
                    style={{
                      width: g.n * DAY_W, flexShrink: 0,
                      borderRight: '1px solid var(--border)', fontSize: 10, fontWeight: 700,
                      color: 'var(--text-2)', textAlign: 'center',
                      overflow: 'hidden', whiteSpace: 'nowrap',
                    }}
                  >
                    {g.n * DAY_W > 60 ? t(g.label) : ''}
                  </div>
                ))}
              </div>
            )}

            <div className="gantt-day-head">
              {days.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`gantt-day${isToday ? ' today' : ''}`}
                    style={{
                      width: DAY_W,
                      background: weekend && !isToday ? 'var(--surface-2)' : undefined,
                    }}
                    title={d.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN')}
                  >
                    {compact ? (isToday ? '▾' : d.getDate() === 1 ? d.getDate() : '') : d.getDate()}
                    {!compact && !showMonthBand && <div className="sub">Th{d.getMonth() + 1}</div>}
                  </div>
                );
              })}
            </div>

            <div className="gantt-rows">
              {rows.map((r) => {
                const pct = r.task.status === 'DONE' ? 100 : r.task.completion;
                return (
                  <div className="gantt-row" key={r.task.id}>
                    <div
                      className="gantt-bar"
                      style={{
                        left: r.offset * DAY_W + 3,
                        width: Math.max(14, r.width * DAY_W - 6),
                        background: PRIORITY_COLOR[r.task.priority],
                      }}
                      title={`${r.task.title} · ${pct}%`}
                      onMouseDown={(e) => startBarDrag(e, r.task)}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.task.title}</span>
                      <span style={{ opacity: 0.85, flexShrink: 0 }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="gantt-today-line" style={{ left: todayOffset * DAY_W }} />
            </div>
          </div>
        </div>
      </div>

      {modalId && <TaskModal taskId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
