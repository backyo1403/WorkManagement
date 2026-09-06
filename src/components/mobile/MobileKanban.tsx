'use client';

import { useMemo, useRef, useState } from 'react';
import { DuePill, Initials, PriorityPill, projectColor } from './parts';
import { sortTasks } from '@/lib/domain';
import {
  TASK_STATUSES,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * Tiến độ — one column per screen, swiped horizontally.
 *
 * Four columns, not three: `Sự kiện` is a status like the others, so it gets a
 * column like the others rather than being hidden from the board.
 *
 * No drag-and-drop: dragging a card between columns needs a second dimension
 * the phone does not have, so status changes happen in the task sheet instead.
 */
export function MobileKanban({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { tasks, projects, people } = useData();
  const { group, t } = usePrefs();
  const railRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const columns = useMemo(() => {
    const scoped = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));
    return TASK_STATUSES.map((status) => ({
      status,
      cards: sortTasks(
        scoped.filter((x) => x.status === status),
        'deadline',
      ),
    }));
  }, [tasks, group]);

  /** The dots follow the rail rather than a tap, so a half-swipe still reads right. */
  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const step = el.scrollWidth / columns.length;
    setPage(Math.max(0, Math.min(columns.length - 1, Math.round(el.scrollLeft / step))));
  };

  return (
    <div className="m-page" style={{ gap: 12, paddingTop: 8 }}>
      <div ref={railRef} className="m-kb-scroll m-scroller" onScroll={onScroll}>
        {columns.map((col) => (
          <div key={col.status} className="m-kb-col">
            <div className="m-kb-head">
              <span
                className="m-dot"
                style={{ width: 9, height: 9, borderRadius: 5, background: TASK_STATUS_COLOR[col.status] }}
              />
              <span className="m-kb-name">{t(TASK_STATUS_LABEL[col.status])}</span>
              <span className="m-kb-count m-num">{col.cards.length}</span>
            </div>

            <div className="m-col" style={{ gap: 9 }}>
              {col.cards.length === 0 && (
                <div className="m-empty" style={{ padding: '24px 0' }}>
                  {t('Trống')}
                </div>
              )}
              {col.cards.map((task) => {
                const project = projects.find((p) => p.id === task.projectId) ?? null;
                const color = projectColor(project);
                return (
                  <button
                    key={task.id}
                    type="button"
                    className="m-kb-card"
                    style={{ borderLeft: `3px solid ${color}` }}
                    onClick={() => onOpenTask(task.id)}
                  >
                    <span className="m-task-top">
                      <PriorityPill priority={task.priority} />
                      <span className="m-kb-proj" style={{ color }}>
                        {project?.name ?? t('Không thuộc dự án')}
                      </span>
                    </span>
                    <span className="m-kb-title">{task.title}</span>
                    <span className="m-task-top">
                      <Initials person={people.find((p) => p.id === task.assigneeId) ?? null} />
                      <DuePill task={task} className="push" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="m-dots">
        {columns.map((col, i) => (
          <i key={col.status} className={i === page ? 'on' : ''} />
        ))}
      </div>
      <div className="m-hint">{t('Vuốt ngang để đổi cột · mở thẻ để chuyển trạng thái')}</div>
    </div>
  );
}
