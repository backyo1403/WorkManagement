'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HashtagChips } from '@/components/ui/HashtagField';
import {
  Avatar,
  DuePill,
  PinButton,
  PriorityPill,
  StatusSelect,
  TaskCheck,
} from '@/components/ui/primitives';
import { SubDeadline, TaskHoverCard } from './TaskHoverCard';
import { fmtDDMMM, fmtDateTimeFull, fmtHM, isOverdue, progressGradientColor } from '@/lib/domain';
import type { TaskDTO, TaskStatus } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * One row in the task list.
 *
 * Clicking the row expands its subtasks (the caret is only a hint — the whole
 * row is the toggle); the pencil opens the editor, so expanding and editing
 * never fight over the same click. Deletion collapses the row before it goes,
 * rather than making it vanish mid-list.
 */
export function TaskRow({ task, onOpen }: { task: TaskDTO; onOpen: (id: string) => void }) {
  const { people, projects, workflows, updateTask, updateSubtask, deleteTask } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const proj = projects.find((p) => p.id === task.projectId) ?? null;
  const wf = workflows.find((w) => w.id === task.workflowId) ?? null;
  const assignee = people.find((p) => p.id === task.assigneeId) ?? null;
  const hasSubtasks = task.subtasks.length > 0;
  const done = task.status === 'DONE';
  const pct = done ? 100 : task.completion;
  const overdue = isOverdue(task);

  const toggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    void updateTask(task.id, { status: done ? 'TODO' : 'DONE' });
  };

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xoá nhiệm vụ "${task.title}"?`)) return;
    setRemoving(true);
    // Let the collapse animation finish before the row leaves the list.
    setTimeout(async () => {
      const ok = await deleteTask(task.id);
      if (ok) toast('Đã xoá nhiệm vụ');
      else setRemoving(false);
    }, 230);
  };

  return (
    <div className={`task-row-wrap${removing ? ' row-removing' : ''}`}>
      <div
        className={[
          'task-row',
          expanded ? 'expanded' : '',
          hasSubtasks ? 'has-children' : '',
          task.pinned ? 'pinned-row' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => hasSubtasks && setExpanded((v) => !v)}
      >
        <span className={`row-caret${hasSubtasks ? '' : ' invisible'}`}>
          <Icon name="chevron" size={13} />
        </span>

        <TaskCheck done={done} onToggle={toggleDone} />

        <PinButton
          pinned={task.pinned}
          onToggle={(e) => {
            e.stopPropagation();
            void updateTask(task.id, { pinned: !task.pinned });
          }}
        />

        <PriorityPill priority={task.priority} />

        <span className="task-main">
          <div className={`task-title${done ? ' done' : ''}`}>{task.title}</div>
          <div
            style={{
              fontSize: 11.5, color: 'var(--text-2)', marginTop: 2,
              display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
            }}
          >
            {assignee && <Avatar person={assignee} size={16} />}
            {assignee ? assignee.name : t('Chưa giao')}
            <HashtagChips tags={task.hashtags} max={3} />
          </div>

          {hasSubtasks && (
            <div className="task-progress">
              <div className="progress-bar" style={{ flex: 1 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: progressGradientColor(pct) }}
                />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: progressGradientColor(pct) }}>
                {task.subtasks.filter((c) => c.done).length}/{task.subtasks.length} · {pct}%
              </span>
            </div>
          )}
        </span>

        <span className="col-project">
          {proj ? (
            <span
              className="badge"
              title={proj.name}
              style={{
                background: `color-mix(in srgb, ${proj.color} 14%, transparent)`,
                color: proj.color,
                maxWidth: '100%', overflow: 'hidden',
                textOverflow: 'ellipsis', display: 'inline-block',
              }}
            >
              {proj.name}
            </span>
          ) : wf ? (
            <span
              className="badge"
              title="Workflow"
              style={{
                background: `color-mix(in srgb, ${wf.color} 14%, transparent)`,
                color: wf.color,
              }}
            >
              {wf.name}
            </span>
          ) : null}
        </span>

        <span className="col-deadline">
          {task.deadline ? (
            <span
              className={`due-date${overdue ? ' overdue' : ''}`}
              title={fmtDateTimeFull(task.deadline, 'vi')}
            >
              <Icon name="calendar" size={12} />
              {fmtDDMMM(task.deadline)}
              {task.start && <b className="due-time">{fmtHM(task.deadline)}</b>}
            </span>
          ) : (
            <span className="due-date muted">—</span>
          )}
        </span>

        <span className="col-due">
          {task.deadline && !done && <DuePill deadline={task.deadline} status={task.status} />}
        </span>

        <span className="col-status" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            status={task.status}
            onChange={(s: TaskStatus) => void updateTask(task.id, { status: s })}
          />
        </span>

        <button
          type="button"
          className="btn-icon"
          title={t('Sửa')}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(task.id);
          }}
        >
          <Icon name="edit" size={14} />
        </button>
        <button type="button" className="btn-icon danger" title={t('Xoá')} onClick={remove}>
          <Icon name="trash" size={14} />
        </button>
      </div>

      {overdue && (
        <div
          style={{
            position: 'absolute', left: -3, top: 8, bottom: 8,
            width: 3, background: 'var(--danger)', borderRadius: 2,
          }}
        />
      )}

      {expanded && hasSubtasks && (
        <div style={{ padding: '6px 14px 10px 60px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {task.subtasks.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
                color: c.done ? 'var(--text-3)' : 'var(--text-2)',
                textDecoration: c.done ? 'line-through' : undefined,
              }}
            >
              <button
                type="button"
                className={`hover-sub-check${c.done ? ' done' : ''}`}
                onClick={() => void updateSubtask(c.id, { done: !c.done })}
              >
                {c.done ? '✓' : ''}
              </button>
              <span style={{ flex: 1, minWidth: 0 }}>{c.text || t('(chưa đặt tên)')}</span>
              <SubDeadline sub={c} />
            </div>
          ))}
        </div>
      )}

      <TaskHoverCard task={task} />
    </div>
  );
}
