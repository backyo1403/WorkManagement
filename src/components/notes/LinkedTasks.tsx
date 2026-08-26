'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DuePill, TaskCheck } from '@/components/ui/primitives';
import { TaskPickerModal } from './TaskPickerModal';
import { PRIORITY_LABEL, TASK_STATUS_LABEL, type NoteDTO } from '@/lib/types';
import { fmtDDMMM } from '@/lib/domain';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * The Linked Tasks panel.
 *
 * Rows read through to the live Task records, so a task's status or deadline
 * shown here is always the real one. Removing a row deletes the link only —
 * the task itself is untouched, which is why the confirmation says so
 * explicitly.
 */
export function LinkedTasks({
  note,
  onOpenTask,
}: {
  note: NoteDTO;
  onOpenTask: (taskId: string) => void;
}) {
  const { tasks, setNoteTaskLink, updateTask } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  /**
   * Linked ids are kept even when the task is gone, so a deleted task surfaces
   * as a warning row the user can clear rather than silently vanishing.
   */
  const rows = useMemo(
    () =>
      note.linkedTaskIds.map((id) => ({
        id,
        task: tasks.find((x) => x.id === id) ?? null,
      })),
    [note.linkedTaskIds, tasks],
  );

  const unlink = async (taskId: string, title: string) => {
    if (!confirm(`Gỡ "${title}" khỏi ghi chú này?\n\nNhiệm vụ vẫn được giữ nguyên.`)) return;
    setRemoving(taskId);
    // Let the collapse animation play before the row leaves the list.
    setTimeout(async () => {
      const ok = await setNoteTaskLink(note.id, taskId, false);
      setRemoving(null);
      if (ok) toast('Đã gỡ liên kết nhiệm vụ');
    }, 200);
  };

  return (
    <section className="note-panel">
      <h4 className="note-panel-head">
        <span>
          <Icon name="link" size={14} /> {t('Nhiệm vụ liên kết')}
          {rows.length > 0 && <em className="note-panel-count">{rows.length}</em>}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>
          <Icon name="plus" size={13} /> {t('Liên kết nhiệm vụ')}
        </button>
      </h4>

      {rows.length === 0 ? (
        <div className="note-empty">
          <Icon name="link" size={26} />
          <div className="note-empty-title">{t('Chưa liên kết nhiệm vụ nào')}</div>
          <p>{t('Gắn ghi chú này với nhiệm vụ để mọi thứ nằm cùng một chỗ.')}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
            <Icon name="plus" size={13} /> {t('Liên kết nhiệm vụ')}
          </button>
        </div>
      ) : (
        <div className="linked-list">
          {rows.map(({ id, task }) => {
            if (!task) {
              return (
                <div className="linked-row missing" key={id}>
                  <Icon name="alert" size={15} />
                  <span className="linked-title">{t('Nhiệm vụ không còn tồn tại')}</span>
                  <button
                    type="button"
                    className="btn-icon danger"
                    title={t('Gỡ liên kết')}
                    onClick={() => void setNoteTaskLink(note.id, id, false)}
                  >
                    <Icon name="close" size={13} />
                  </button>
                </div>
              );
            }

            const done = task.status === 'DONE';
            return (
              <div
                className={`linked-row${removing === id ? ' removing' : ''}`}
                key={id}
              >
                <TaskCheck
                  done={done}
                  size={18}
                  onToggle={(e) => {
                    e.stopPropagation();
                    void updateTask(task.id, { status: done ? 'TODO' : 'DONE' });
                  }}
                />
                <button
                  type="button"
                  className="linked-main"
                  onClick={() => onOpenTask(task.id)}
                >
                  <span className={`linked-title${done ? ' done' : ''}`}>{task.title}</span>
                  <span className="linked-sub">
                    {t(PRIORITY_LABEL[task.priority])}
                    {task.deadline ? ` · ${fmtDDMMM(task.deadline)}` : ''}
                    {done ? ` · ${t(TASK_STATUS_LABEL.DONE)}` : ''}
                  </span>
                </button>
                {task.deadline && !done && <DuePill deadline={task.deadline} status={task.status} />}
                <button
                  type="button"
                  className="btn-icon danger"
                  title={t('Gỡ liên kết')}
                  onClick={() => void unlink(task.id, task.title)}
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {picking && (
        <TaskPickerModal
          linkedIds={note.linkedTaskIds}
          onToggle={async (taskId, linked) => {
            const ok = await setNoteTaskLink(note.id, taskId, linked);
            if (ok) toast(linked ? 'Đã liên kết nhiệm vụ' : 'Đã gỡ liên kết nhiệm vụ');
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  );
}
