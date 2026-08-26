'use client';

import { Icon } from '@/components/ui/Icon';
import { DuePill, PriorityPill, TaskCheck } from '@/components/ui/primitives';
import { SubDeadline } from './TaskHoverCard';
import { fmtDDMMM, fmtHM, isOverdue } from '@/lib/domain';
import { TASK_STATUS_LABEL, type TaskDTO } from '@/lib/types';
import { usePrefs } from '@/state/PrefsProvider';

/** Compact task line shown when a project row is expanded. */
export function InlineTaskRow({
  task,
  expanded,
  onExpand,
  onOpen,
  onToggleDone,
  onToggleSub,
}: {
  task: TaskDTO;
  expanded: boolean;
  onExpand: () => void;
  onOpen: () => void;
  onToggleDone: () => void;
  onToggleSub: (subId: string, done: boolean) => void;
}) {
  const { t } = usePrefs();
  const hasSubs = task.subtasks.length > 0;
  const done = task.status === 'DONE';

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '8px 11px',
        }}
      >
        <TaskCheck done={done} size={19} onToggle={onToggleDone} />
        {hasSubs ? (
          <button
            type="button"
            className="btn-icon"
            style={{ width: 22, height: 22 }}
            title={t('Xem công việc con')}
            onClick={onExpand}
          >
            <Icon name="chevron" size={11} style={expanded ? { transform: 'rotate(90deg)' } : undefined} />
          </button>
        ) : (
          <span style={{ width: 22, flexShrink: 0 }} />
        )}
        <PriorityPill priority={task.priority} />
        <span
          style={{
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', fontSize: 12.8, fontWeight: 600, cursor: 'pointer',
            textDecoration: done ? 'line-through' : undefined,
            color: done ? 'var(--text-3)' : undefined,
          }}
          onClick={onOpen}
        >
          {task.title}
          {hasSubs && (
            <span style={{ fontWeight: 500, color: 'var(--text-3)' }}>
              {' '}
              ({task.subtasks.filter((c) => c.done).length}/{task.subtasks.length})
            </span>
          )}
        </span>
        <span className={`due-date${isOverdue(task) ? ' overdue' : ''}`}>
          {task.deadline ? (
            <>
              <Icon name="calendar" size={11} />
              {fmtDDMMM(task.deadline)}
              {task.start && <b className="due-time">{fmtHM(task.start)}</b>}
            </>
          ) : (
            '—'
          )}
        </span>
        {task.deadline && !done && <DuePill deadline={task.deadline} status={task.status} />}
        <span className={`badge${done ? ' success' : task.status === 'IN_PROGRESS' ? ' today' : ''}`}>
          {t(TASK_STATUS_LABEL[task.status])}
        </span>
      </div>

      {expanded && hasSubs && (
        <div style={{ padding: '6px 0 2px 74px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {task.subtasks.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.3,
                color: c.done ? 'var(--text-3)' : 'var(--text-2)',
                textDecoration: c.done ? 'line-through' : undefined,
              }}
            >
              <button
                type="button"
                className={`hover-sub-check${c.done ? ' done' : ''}`}
                title={t('Đánh dấu hoàn thành')}
                onClick={() => onToggleSub(c.id, !c.done)}
              >
                {c.done ? '✓' : ''}
              </button>
              <span style={{ flex: 1, minWidth: 0 }}>{c.text || t('(chưa đặt tên)')}</span>
              <SubDeadline sub={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
