'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DuePill, Initials, PriorityPill, projectColor, tint } from './parts';
import { computeCompletion, isSameDay, sortTasks, type TaskSort } from '@/lib/domain';
import type { TaskDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

type Filter = 'all' | 'today' | 'open' | 'pri' | 'done';

const FILTERS: Array<[Filter, string]> = [
  ['all', 'Tất cả'],
  ['today', 'Hôm nay'],
  ['open', 'Chưa xong'],
  ['pri', 'Ưu tiên cao'],
  ['done', 'Hoàn thành'],
];

/** The desktop sort menu, shortened to one tappable label. */
const SORT_CYCLE: Array<[TaskSort, string]> = [
  ['deadline', 'Hạn chót'],
  ['priority', 'Ưu tiên'],
  ['created', 'Mới tạo'],
  ['title', 'Tên'],
  ['progress', 'Tiến độ'],
];

function matches(task: TaskDTO, needle: string, projectName: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  if (q.startsWith('#')) return task.hashtags.some((h) => h.includes(q.slice(1)));
  return (
    task.title.toLowerCase().includes(q) ||
    projectName.toLowerCase().includes(q) ||
    task.hashtags.some((h) => h.includes(q))
  );
}

/** Nhiệm vụ — search, filter chips, and one card per task. */
export function MobileTasks({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { tasks, projects, people } = useData();
  const { group, t } = usePrefs();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sortAt, setSortAt] = useState(0);

  const sort = SORT_CYCLE[sortAt];

  const list = useMemo(() => {
    const scoped = tasks.filter(
      (x) => !x.archived && (!group || x.groupKey === group),
    );
    const byFilter = scoped.filter((x) => {
      switch (filter) {
        case 'today':
          return isSameDay(x.deadline);
        case 'open':
          return x.status !== 'DONE';
        case 'pri':
          return x.priority === 'ASAP' || x.priority === 'HIGH';
        case 'done':
          return x.status === 'DONE';
        default:
          return true;
      }
    });
    const searched = byFilter.filter((x) =>
      matches(x, query, projects.find((p) => p.id === x.projectId)?.name ?? ''),
    );
    return sortTasks(searched, sort[0]);
  }, [tasks, projects, group, filter, query, sort]);

  return (
    <div className="m-page" style={{ gap: 12, paddingTop: 12 }}>
      <div className="m-pad">
        <div className="m-search">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query}
            placeholder={t('Tìm nhiệm vụ, dự án, #tag')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="m-chips m-scroller">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`m-chip${filter === key ? ' on' : ''}`}
            onClick={() => setFilter(key)}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="m-meta-row m-pad">
        <div className="m-meta-left">{t(`${list.length} nhiệm vụ`)}</div>
        <button
          type="button"
          className="m-meta-right"
          onClick={() => setSortAt((i) => (i + 1) % SORT_CYCLE.length)}
        >
          <Icon name="sort" size={14} />
          <span>{t(sort[1])}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="m-empty">{t('Không có nhiệm vụ nào khớp bộ lọc')}</div>
      ) : (
        <div className="m-col m-pad" style={{ gap: 9 }}>
          {list.map((task) => {
            const project = projects.find((p) => p.id === task.projectId) ?? null;
            const color = projectColor(project);
            const pct = computeCompletion(task);
            const assignee = people.find((p) => p.id === task.assigneeId) ?? null;
            return (
              <button
                key={task.id}
                type="button"
                className="m-task-card"
                onClick={() => onOpenTask(task.id)}
              >
                <span className="m-task-top">
                  <PriorityPill priority={task.priority} />
                  <span
                    className="m-proj-badge"
                    style={{ background: tint(color, '22', 13), color }}
                  >
                    {project?.name ?? t('Không thuộc dự án')}
                  </span>
                  <DuePill task={task} className="push" />
                </span>

                <span className="m-task-title">{task.title}</span>

                <span className="m-task-foot">
                  <span className="m-bar">
                    <i
                      style={{
                        width: `${pct}%`,
                        background: pct >= 100 ? 'var(--success)' : 'var(--brand)',
                      }}
                    />
                  </span>
                  <span className="m-task-pct m-num">{pct}%</span>
                  <Initials person={assignee} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
