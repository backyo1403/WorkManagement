'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Modal, PageHeader, PriorityPill } from '@/components/ui/primitives';
import { TaskHoverCard } from '@/components/task/TaskHoverCard';
import { TaskModal } from '@/components/task/TaskModal';
import { addDays, locale, ymdLocal } from '@/lib/domain';
import {
  PRIORITY_COLOR,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type TaskDTO,
  type TaskStatus,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function CalendarPage() {
  const { tasks, projects, people } = useData();
  const { group, lang, t } = usePrefs();

  const [monthOffset, setMonthOffset] = useState(0);
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatus>>(new Set(TASK_STATUSES));
  const [modalId, setModalId] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<string | null>(null);

  const base = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const cells = useMemo(() => {
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [base]);

  const visible = useMemo(() => {
    let out = tasks.filter(
      (x) => !x.archived && x.deadline && (!group || x.groupKey === group),
    );
    if (projectFilter) out = out.filter((x) => x.projectId === projectFilter);
    return out.filter((x) => statusFilters.has(x.status));
  }, [tasks, group, projectFilter, statusFilters]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    visible.forEach((x) => {
      const k = new Date(x.deadline!).toDateString();
      const arr = map.get(k);
      if (arr) arr.push(x);
      else map.set(k, [x]);
    });
    return map;
  }, [visible]);

  const today = new Date();
  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  const toggleStatus = (s: TaskStatus) =>
    setStatusFilters((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const dayTasks = dayModal
    ? visible
        .filter((x) => new Date(x.deadline!).toDateString() === new Date(`${dayModal}T00:00:00`).toDateString())
        .sort((a, b) => +new Date(a.deadline!) - +new Date(b.deadline!))
    : [];

  return (
    <div className="view-enter">
      <PageHeader
        title="Lịch"
        icon="calendar"
        actions={
          <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t(`${visible.length} nhiệm vụ`)}</div>
        }
      />

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setSlideDir('prev');
              setMonthOffset((m) => m - 1);
            }}
          >
            <Icon name="chevron-left" size={15} />
          </button>
          <b style={{ fontSize: 15 }}>{t(`Tháng ${base.getMonth() + 1}, ${base.getFullYear()}`)}</b>
          <button
            type="button"
            className="btn-icon"
            onClick={() => {
              setSlideDir('next');
              setMonthOffset((m) => m + 1);
            }}
          >
            <Icon name="chevron" size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSlideDir(monthOffset > 0 ? 'prev' : monthOffset < 0 ? 'next' : null);
              setMonthOffset(0);
            }}
          >
            📍 {t('Hôm nay')}
          </button>
          <select
            className="filter-select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">{t('Tất cả Dự án')}</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pill-toggle-row">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`pill-toggle${statusFilters.has(s) ? ' active' : ''}`}
              onClick={() => toggleStatus(s)}
            >
              {t(TASK_STATUS_LABEL[s])}
            </button>
          ))}
          <button
            type="button"
            className={`pill-toggle${statusFilters.size === TASK_STATUSES.length ? ' active' : ''}`}
            onClick={() => setStatusFilters(new Set(TASK_STATUSES))}
          >
            {t('Tất cả')}
          </button>
        </div>
      </div>

      <div
        // The key restarts the slide animation whenever the month changes.
        key={monthOffset}
        className={`cal-month-grid${slideDir === 'next' ? ' month-next' : slideDir === 'prev' ? ' month-prev' : ''}`}
      >
        {WEEKDAYS.map((d) => (
          <div className="cal-month-head" key={d}>
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
              className={`cal-month-cell${inMonth ? '' : ' other-month'}${isToday ? ' today' : ''}`}
            >
              <span
                className="cal-day-num"
                style={{ cursor: 'pointer' }}
                title={`Xem thời khoá biểu ngày ${d.getDate()}/${d.getMonth() + 1}`}
                onClick={() => setDayModal(ymdLocal(d))}
              >
                {d.getDate()}
              </span>
              <div className="cal-pill-stack">
                {list.map((x) => (
                  <div className="task-row-wrap" key={x.id}>
                    <div
                      className="cal-pill"
                      style={{ background: PRIORITY_COLOR[x.priority] }}
                      onClick={() => setModalId(x.id)}
                    >
                      {x.title}
                    </div>
                    <TaskHoverCard task={x} full />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {dayModal && (
        <Modal
          icon="calendar"
          title={`Thời khoá biểu ${new Date(`${dayModal}T00:00:00`).toLocaleDateString(locale(lang), {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
          })}`}
          onClose={() => setDayModal(null)}
        >
          {dayTasks.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayTasks.map((x) => {
                const assignee = people.find((p) => p.id === x.assigneeId) ?? null;
                const proj = projects.find((p) => p.id === x.projectId) ?? null;
                const time = new Date(x.deadline!).toLocaleTimeString(locale(lang), {
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div
                    className="task-row"
                    key={x.id}
                    onClick={() => {
                      setDayModal(null);
                      setModalId(x.id);
                    }}
                  >
                    <span style={{ fontWeight: 750, fontSize: 12.5, color: 'var(--brand)', width: 50, flexShrink: 0 }}>
                      {time}
                    </span>
                    <PriorityPill priority={x.priority} />
                    <span className={`task-title${x.status === 'DONE' ? ' done' : ''}`}>{x.title}</span>
                    <span className="task-meta">
                      {proj && (
                        <span className="badge" style={{ background: `${proj.color}1A`, color: proj.color }}>
                          {proj.name}
                        </span>
                      )}
                      {assignee && <Avatar person={assignee} size={24} />}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="calendar">
              {t('Không có nhiệm vụ nào đến hạn trong ngày này')}
            </EmptyState>
          )}
        </Modal>
      )}

      {modalId && <TaskModal taskId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
