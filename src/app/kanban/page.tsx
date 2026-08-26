'use client';

import { useMemo, useState } from 'react';
import { Avatar, DuePill, PageHeader, PriorityPill } from '@/components/ui/primitives';
import { TaskHoverCard } from '@/components/task/TaskHoverCard';
import { TaskModal } from '@/components/task/TaskModal';
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskDTO, type TaskStatus } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

type Period = 'all' | 'today' | 'week' | 'lastweek' | 'month' | 'lastmonth' | 'quarter';

const PERIODS: Array<[Period, string]> = [
  ['all', 'Tất cả'],
  ['today', 'Hôm nay'],
  ['week', 'Tuần này'],
  ['lastweek', 'Tuần trước'],
  ['month', 'Tháng này'],
  ['lastmonth', 'Tháng trước'],
  ['quarter', 'Quý này'],
];

const COLUMN_ICON: Record<TaskStatus, string> = {
  TODO: '⬜',
  IN_PROGRESS: '🟧',
  DONE: '✅',
};

/** Buckets a task by deadline, falling back to its creation date. */
function inPeriod(t: TaskDTO, period: Period): boolean {
  if (period === 'all') return true;
  const d = new Date(t.deadline ?? t.createdAt);
  const now = new Date();

  switch (period) {
    case 'today':
      return d.toDateString() === now.toDateString();
    case 'week':
    case 'lastweek': {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay() - (period === 'lastweek' ? 7 : 0));
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      return d >= s && d < e;
    }
    case 'month':
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'lastmonth': {
      const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
    }
    default:
      return true;
  }
}

export default function KanbanPage() {
  const { tasks, projects, people, updateTask } = useData();
  const { group, t } = usePrefs();
  const toast = useToast();

  const [period, setPeriod] = useState<Period>('all');
  const [personId, setPersonId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [modalId, setModalId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const filtered = useMemo(() => {
    let out = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));
    out = out.filter((x) => inPeriod(x, period));
    if (personId) out = out.filter((x) => x.assigneeId === personId);
    if (projectId) out = out.filter((x) => x.projectId === projectId);
    return out;
  }, [tasks, group, period, personId, projectId]);

  const drop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((x) => x.id === taskId);
    if (!task || task.status === status) return;
    void updateTask(taskId, {
      status,
      activity: `Chuyển trạng thái sang "${TASK_STATUS_LABEL[status]}"`,
    });
    toast('Đã cập nhật trạng thái');
  };

  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  return (
    <div className="view-enter">
      <PageHeader title="Tiến độ" icon="board" />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <b style={{ fontSize: 12, color: 'var(--text-2)' }}>⏱ {t('THỜI GIAN')}</b>
        </div>
        <div className="pill-toggle-row" style={{ marginBottom: 14 }}>
          {PERIODS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`pill-toggle${period === k ? ' active' : ''}`}
              onClick={() => setPeriod(k)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="filter-select" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">{t('Tất cả người thực hiện')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select className="filter-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{t('Tất cả dự án')}</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="kanban-wrap">
        {TASK_STATUSES.map((status) => {
          const colTasks = filtered.filter((x) => x.status === status);
          return (
            <div
              key={status}
              className="kanban-col"
              style={dragOver === status ? { borderColor: 'var(--brand)' } : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === status ? null : cur))}
              onDrop={(e) => drop(e, status)}
            >
              <div className="kanban-col-head">
                {COLUMN_ICON[status]} {t(TASK_STATUS_LABEL[status])}
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>

              {colTasks.length ? (
                colTasks.map((x) => {
                  const a = people.find((p) => p.id === x.assigneeId) ?? null;
                  const proj = projects.find((p) => p.id === x.projectId) ?? null;
                  return (
                    <div className="task-row-wrap" key={x.id} style={{ marginBottom: 9 }}>
                      <div
                        className="kanban-card"
                        draggable
                        style={{ marginBottom: 0 }}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', x.id)}
                        onClick={() => setModalId(x.id)}
                      >
                        <PriorityPill priority={x.priority} />
                        <div className="kanban-card-title">{x.title}</div>
                        {proj && (
                          <span className="badge" style={{ background: `${proj.color}1A`, color: proj.color }}>
                            {proj.name}
                          </span>
                        )}
                        <div className="kanban-card-foot">
                          {a ? <Avatar person={a} size={24} /> : <span />}
                          {x.deadline && x.status !== 'DONE' && (
                            <DuePill deadline={x.deadline} status={x.status} />
                          )}
                        </div>
                      </div>
                      <TaskHoverCard task={x} />
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                  {t('Trống')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalId && <TaskModal taskId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
