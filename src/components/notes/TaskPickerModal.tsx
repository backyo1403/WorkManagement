'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DueDate, Modal, PriorityPill } from '@/components/ui/primitives';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Priority,
  type TaskStatus,
} from '@/lib/types';
import { daysUntil } from '@/lib/domain';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

type DueFilter = '' | 'overdue' | 'today' | 'week' | 'none';

/**
 * Picks existing tasks to attach to a note.
 *
 * It only ever returns ids — no task is created or copied here, so linking can
 * never fork a second version of a task.
 */
export function TaskPickerModal({
  linkedIds,
  onToggle,
  onClose,
}: {
  linkedIds: string[];
  onToggle: (taskId: string, linked: boolean) => void;
  onClose: () => void;
}) {
  const { tasks, projects } = useData();
  const { group, t } = usePrefs();

  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [due, setDue] = useState<DueFilter>('');

  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  const results = useMemo(() => {
    let out = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));

    if (projectId) out = out.filter((x) => x.projectId === projectId);
    if (status) out = out.filter((x) => x.status === status);
    if (priority) out = out.filter((x) => x.priority === priority);

    if (due) {
      out = out.filter((x) => {
        if (due === 'none') return !x.deadline;
        if (!x.deadline) return false;
        const d = daysUntil(x.deadline);
        if (due === 'overdue') return d < 0 && x.status !== 'DONE';
        if (due === 'today') return d === 0;
        return d >= 0 && d <= 7;
      });
    }

    const needle = query.trim().toLowerCase();
    if (needle) out = out.filter((x) => x.title.toLowerCase().includes(needle));

    // Already-linked tasks float to the top so the current set is obvious.
    return out
      .sort((a, b) => Number(linkedIds.includes(b.id)) - Number(linkedIds.includes(a.id)))
      .slice(0, 60);
  }, [tasks, group, projectId, status, priority, due, query, linkedIds]);

  return (
    <Modal icon="link" title={t('Liên kết nhiệm vụ')} wide onClose={onClose}>
      <div className="search-input-wrap" style={{ marginBottom: 12 }}>
        <span className="srch-ico">
          <Icon name="search" size={15} />
        </span>
        <input
          type="text"
          value={query}
          autoFocus
          placeholder={t('Tìm nhiệm vụ…')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <select className="filter-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">{t('Tất cả dự án')}</option>
          {visibleProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
        >
          <option value="">{t('Tất cả trạng thái')}</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(TASK_STATUS_LABEL[s])}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | '')}
        >
          <option value="">{t('Mọi độ ưu tiên')}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(PRIORITY_LABEL[p])}
            </option>
          ))}
        </select>
        <select className="filter-select" value={due} onChange={(e) => setDue(e.target.value as DueFilter)}>
          <option value="">{t('Mọi hạn chót')}</option>
          <option value="overdue">{t('Quá hạn')}</option>
          <option value="today">{t('Đến hạn hôm nay')}</option>
          <option value="week">{t('Trong 7 ngày')}</option>
          <option value="none">{t('Không có hạn')}</option>
        </select>
      </div>

      <div className="picker-list">
        {results.length === 0 && (
          <div className="picker-empty">{t('Không có nhiệm vụ nào khớp bộ lọc')}</div>
        )}
        {results.map((task) => {
          const linked = linkedIds.includes(task.id);
          const project = projects.find((p) => p.id === task.projectId) ?? null;
          return (
            <button
              key={task.id}
              type="button"
              className={`picker-row${linked ? ' linked' : ''}`}
              onClick={() => onToggle(task.id, !linked)}
            >
              <span className={`picker-check${linked ? ' on' : ''}`}>{linked ? '✓' : ''}</span>
              <PriorityPill priority={task.priority} />
              <span className="picker-title">{task.title}</span>
              {project && (
                <span className="badge" style={{ background: `${project.color}1A`, color: project.color }}>
                  {project.name}
                </span>
              )}
              <DueDate deadline={task.deadline} status={task.status} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('Xong')}
        </button>
      </div>
    </Modal>
  );
}
