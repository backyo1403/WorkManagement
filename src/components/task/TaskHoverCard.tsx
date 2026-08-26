'use client';

import { Icon } from '@/components/ui/Icon';
import { PriorityPill, ProgressBar, useHoverCardFlip } from '@/components/ui/primitives';
import { fmtDDMMM, isOverdue, progressGradientColor } from '@/lib/domain';
import { TASK_STATUS_LABEL, type SubtaskDTO, type TaskDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

/** Small deadline chip shown on a subtask row. */
export function SubDeadline({ sub }: { sub: SubtaskDTO }) {
  if (!sub.deadline) return null;
  const over = new Date(sub.deadline) < new Date() && !sub.done;
  return (
    <span className={`sub-due${over ? ' over' : ''}`}>
      <Icon name="calendar" size={10} />
      {fmtDDMMM(sub.deadline)}
      {sub.start && <b>{new Date(sub.start).toTimeString().slice(0, 5)}</b>}
    </span>
  );
}

function SubtaskLines({
  task,
  onToggleSub,
}: {
  task: TaskDTO;
  onToggleSub: (subId: string, done: boolean) => void;
}) {
  const { t } = usePrefs();
  if (!task.subtasks.length) {
    return (
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
        {t('Không có công việc con')}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      {task.subtasks.map((c) => (
        <div className={`hover-sub${c.done ? ' done' : ''}`} key={c.id}>
          <span
            className={`hover-sub-check${c.done ? ' done' : ''}`}
            title={t('Đánh dấu hoàn thành')}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSub(c.id, !c.done);
            }}
          >
            {c.done ? '✓' : ''}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>{c.text || t('(chưa đặt tên)')}</span>
          <SubDeadline sub={c} />
        </div>
      ))}
    </div>
  );
}

/**
 * Hover preview of a task: progress, and its subtasks with live checkboxes so a
 * subtask can be ticked off without opening the editor.
 */
export function TaskHoverCard({ task, full = false }: { task: TaskDTO; full?: boolean }) {
  const { updateSubtask, people, projects, workflows } = useData();
  const { t } = usePrefs();
  const { ref, cls } = useHoverCardFlip<HTMLDivElement>();

  const pct = task.status === 'DONE' ? 100 : task.completion;
  const color = progressGradientColor(pct);
  const toggleSub = (subId: string, done: boolean) => void updateSubtask(subId, { done });

  const assignee = people.find((p) => p.id === task.assigneeId) ?? null;
  const proj = projects.find((p) => p.id === task.projectId) ?? null;
  const wf = workflows.find((w) => w.id === task.workflowId) ?? null;
  const overdue = isOverdue(task);

  return (
    <div className={`hover-card${cls}`} ref={ref} style={full ? { width: 260 } : undefined}>
      <div className="hover-card-title">
        <span>{task.title}</span>
        <span style={{ color }}>{pct}%</span>
      </div>

      {full && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            <PriorityPill priority={task.priority} />
            <span
              className={
                task.status === 'DONE' ? 'badge success' : task.status === 'IN_PROGRESS' ? 'badge today' : 'badge'
              }
            >
              {t(TASK_STATUS_LABEL[task.status])}
            </span>
            {wf && (
              <span className="badge" style={{ background: `${wf.color}1A`, color: wf.color }}>
                {wf.name}
              </span>
            )}
            {proj && (
              <span className="badge" style={{ background: `${proj.color}1A`, color: proj.color }}>
                {proj.name}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
            <Icon name="user" size={12} /> {assignee ? assignee.name : t('Chưa giao')}
          </div>
          {task.deadline && (
            <div
              style={{
                fontSize: 12,
                color: overdue ? 'var(--danger)' : 'var(--text-2)',
                marginBottom: 8,
              }}
            >
              <Icon name="calendar" size={12} /> {fmtDDMMM(task.deadline)}
              {overdue ? ` · ${t('Quá hạn')}` : ''}
            </div>
          )}
        </>
      )}

      <ProgressBar pct={pct} />
      <SubtaskLines task={task} onToggleSub={toggleSub} />
    </div>
  );
}
