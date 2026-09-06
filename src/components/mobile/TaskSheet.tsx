'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PriorityPill, ddmm, tint } from './parts';
import { eventRange, fmtDate, fmtDateTimeFull, isEvent, toLocalDateInput } from '@/lib/domain';
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  groupName,
  type TaskStatus,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * Chi tiết nhiệm vụ — the bottom sheet a task card opens.
 *
 * The status segments and the subtask checkboxes write straight through; the
 * server recomputes `completion` and `completedAt` from the subtasks and hands
 * the whole task back, which is why the progress bar here is read-only. "Lưu"
 * covers the one field that is not immediate: the title.
 */
export function TaskSheet({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, projects, people, updateTask, updateSubtask, deleteTask } = useData();
  const { lang, t } = usePrefs();
  const toast = useToast();

  const task = tasks.find((x) => x.id === taskId) ?? null;

  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ text: string; deadline: string }>({
    text: '',
    deadline: '',
  });

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const color = project?.color ?? 'var(--brand)';
  const assignee = people.find((p) => p.id === task.assigneeId) ?? null;
  const done = task.subtasks.filter((s) => s.done).length;

  /**
   * An event's two dates are its own ends, so it shows both and neither is red:
   * nothing about a meeting is a deadline someone can miss. An event with no
   * start has no span to show, so it keeps the single date row — still not red.
   */
  const event = isEvent(task);
  const range = event ? eventRange(task) : null;

  const dateRows: Array<[string, string, string?]> = range
    ? [
        ['Bắt đầu sự kiện', fmtDateTimeFull(range.start.toISOString(), lang)],
        ['Kết thúc sự kiện', fmtDateTimeFull(range.end.toISOString(), lang)],
      ]
    : [
        [
          event ? 'Kết thúc sự kiện' : 'Hạn chót',
          fmtDate(task.deadline, lang),
          event ? undefined : 'var(--danger)',
        ],
      ];

  const meta: Array<[string, string, string?]> = [
    ['Dự án', project?.name ?? t('Không thuộc dự án')],
    ['Người phụ trách', assignee?.name ?? t('Chưa giao')],
    ...dateRows,
    ['Ước lượng', task.estimateHours ? `${task.estimateHours}h` : '—'],
    ['Nhóm', groupName(task.groupKey) || '—'],
  ];

  return (
    <div className="m-overlay">
      <button type="button" className="m-dismiss" aria-label={t('Đóng')} onClick={onClose} />

      <div className="m-sheet">
        <div className="m-grip">
          <i />
        </div>

        <div className="m-sheet-body m-scroller">
          <div className="m-sheet-head">
            <div className="m-sheet-heading">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PriorityPill priority={task.priority} />
                <span
                  className="m-proj-badge"
                  style={{ background: tint(color, '22', 13), color }}
                >
                  {project?.name ?? t('Không thuộc dự án')}
                </span>
              </div>
              <input
                className="m-sheet-title"
                style={{ width: '100%' }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <button type="button" className="m-close" aria-label={t('Đóng')} onClick={onClose}>
              <Icon name="close" size={15} />
            </button>
          </div>

          <div className="m-seg tall sunken">
            {TASK_STATUSES.map((s: TaskStatus) => (
              <button
                key={s}
                type="button"
                className={task.status === s ? 'on' : ''}
                onClick={() => void updateTask(task.id, { status: s })}
              >
                {t(TASK_STATUS_LABEL[s])}
              </button>
            ))}
          </div>

          <div className="m-col" style={{ gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="m-progress8">
                <i style={{ width: `${task.completion}%` }} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }} className="m-num">
                {task.completion}%
              </span>
            </div>
            <div className="m-foot-note">{t('Tiến độ suy ra từ công việc con')}</div>
          </div>

          <div className="m-meta-table">
            {meta.map(([key, value, tone]) => (
              <div key={key} className="m-meta-line">
                <span className="m-meta-key">{t(key)}</span>
                <span className="m-meta-val" style={tone ? { color: tone } : undefined}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="m-col" style={{ gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 650 }}>{t('Công việc con')}</div>
              <div className="m-foot-note">
                {done}/{task.subtasks.length}
              </div>
            </div>

            {task.subtasks.length === 0 ? (
              <div className="m-meta-table">
                <div className="m-empty" style={{ padding: '22px 16px' }}>
                  {t('Chưa có công việc con')}
                </div>
              </div>
            ) : (
              <div className="m-meta-table">
                {task.subtasks.map((sub) => {
                  const open = editing === sub.id;
                  return (
                    <div key={sub.id} className={`m-sub-row${open ? ' editing' : ''}`}>
                      <div className="m-sub-line">
                        <button
                          type="button"
                          className={`m-box${sub.done ? ' on' : ''}`}
                          aria-label={t('Đánh dấu hoàn thành')}
                          onClick={() => void updateSubtask(sub.id, { done: !sub.done })}
                        >
                          {sub.done && <Icon name="tick" size={13} />}
                        </button>
                        <span className={`m-sub-text${sub.done ? ' done' : ''}`}>{sub.text}</span>
                        <span className="m-sub-due m-num">{ddmm(sub.deadline)}</span>
                        <button
                          type="button"
                          className={`m-mini-btn${open ? ' on' : ''}`}
                          aria-label={t('Sửa công việc con')}
                          onClick={() => {
                            if (open) {
                              setEditing(null);
                              return;
                            }
                            setEditing(sub.id);
                            setDraft({
                              text: sub.text,
                              deadline: toLocalDateInput(sub.deadline),
                            });
                          }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                      </div>

                      {open && (
                        <div className="m-sub-edit">
                          <div className="m-edit-box">
                            <input
                              type="text"
                              value={draft.text}
                              placeholder={t('Nội dung công việc con')}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, text: e.target.value }))
                              }
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="m-edit-box" style={{ flex: 1 }}>
                              <Icon name="calendar" size={15} />
                              <input
                                type="date"
                                value={draft.deadline}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, deadline: e.target.value }))
                                }
                              />
                            </div>
                            <button
                              type="button"
                              className="m-done-btn"
                              onClick={async () => {
                                await updateSubtask(sub.id, {
                                  text: draft.text,
                                  // A bare date means end of that day, matching
                                  // how the desktop treats date-only deadlines.
                                  deadline: draft.deadline
                                    ? new Date(`${draft.deadline}T18:00`).toISOString()
                                    : null,
                                });
                                setEditing(null);
                              }}
                            >
                              {t('Xong')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {task.hashtags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {task.hashtags.map((h, i) => (
                <span key={h} className={`m-tagpill${i === 0 ? ' on' : ''}`}>
                  #{h}
                </span>
              ))}
            </div>
          )}

          <div className="m-sheet-actions">
            <button
              type="button"
              className="m-save-btn"
              onClick={async () => {
                const next = title.trim();
                if (!next) {
                  toast('Tiêu đề không được để trống');
                  return;
                }
                if (next !== task.title && !(await updateTask(task.id, { title: next }))) return;
                onClose();
              }}
            >
              {t('Lưu')}
            </button>
            <button
              type="button"
              className="m-del-btn"
              aria-label={t('Xoá nhiệm vụ')}
              onClick={async () => {
                if (!confirm(`Xoá nhiệm vụ "${task.title}"?`)) return;
                if (await deleteTask(task.id)) {
                  toast('Đã xoá nhiệm vụ');
                  onClose();
                }
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
