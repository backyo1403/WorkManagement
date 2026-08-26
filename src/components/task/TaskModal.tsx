'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HashtagField } from '@/components/ui/HashtagField';
import { Avatar, Modal, TaskCheck } from '@/components/ui/primitives';
import { RelatedNotes } from '@/components/notes/RelatedNotes';
import {
  combineDateTime,
  fmtDDMMM,
  fmtDate,
  fmtHM,
  isOverdue,
  toLocalDateInput,
  toLocalInput,
  fromLocalInput,
} from '@/lib/domain';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  WORK_GROUPS,
  type GroupKey,
  type Priority,
  type SubtaskDTO,
  type TaskDTO,
  type TaskStatus,
} from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** Local shape while editing — subtasks may not have an id yet. */
type DraftSub = Omit<SubtaskDTO, 'id' | 'order'> & { id?: string; key: string };

interface Draft {
  title: string;
  description: string;
  projectId: string;
  workflowId: string;
  groupKey: string;
  assigneeId: string;
  priority: Priority;
  status: TaskStatus;
  deadline: string;
  start: string;
  estimateHours: number;
  pinned: boolean;
}

function draftFrom(task: TaskDTO | null, prefill?: Partial<Draft>): Draft {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    projectId: task?.projectId ?? prefill?.projectId ?? '',
    workflowId: task?.workflowId ?? prefill?.workflowId ?? '',
    groupKey: task?.groupKey ?? prefill?.groupKey ?? '',
    assigneeId: task?.assigneeId ?? prefill?.assigneeId ?? '',
    priority: task?.priority ?? prefill?.priority ?? 'MEDIUM',
    status: task?.status ?? 'TODO',
    deadline: toLocalInput(task?.deadline ?? prefill?.deadline ?? null),
    start: toLocalInput(task?.start ?? prefill?.start ?? null),
    estimateHours: task?.estimateHours ?? 1,
    pinned: task?.pinned ?? false,
  };
}

let subKey = 0;

/**
 * The task editor.
 *
 * Everything is held in local draft state and written once on Save, so
 * switching a status pill or adding a subtask never loses what has been typed
 * above — and closing without saving leaves the stored task untouched.
 */
export function TaskModal({
  taskId,
  prefill,
  onClose,
}: {
  taskId: string | null;
  prefill?: Partial<Draft>;
  onClose: () => void;
}) {
  const {
    tasks, people, projects, workflows,
    createTask, updateTask, deleteTask, addComment,
  } = useData();
  const { group, lang, t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();

  const existing = useMemo(() => tasks.find((x) => x.id === taskId) ?? null, [tasks, taskId]);

  const [d, setD] = useState<Draft>(() => draftFrom(existing, prefill));
  const [subs, setSubs] = useState<DraftSub[]>(() =>
    (existing?.subtasks ?? []).map((s) => ({ ...s, key: `s${subKey++}` })),
  );
  const [tags, setTags] = useState<string[]>(existing?.hashtags ?? []);
  const [executorIds, setExecutorIds] = useState<string[]>(existing?.executorIds ?? []);
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));

  const proj = projects.find((p) => p.id === d.projectId) ?? null;
  const wf = workflows.find((w) => w.id === d.workflowId) ?? null;
  const groupInfo = WORK_GROUPS.find((g) => g.key === (proj?.groupKey ?? d.groupKey)) ?? null;
  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  // Progress is derived from subtasks whenever there are any.
  const autoPct = subs.length
    ? Math.round((subs.filter((s) => s.done).length / subs.length) * 100)
    : null;

  const save = async () => {
    const title = d.title.trim();
    if (!title) {
      toast('Nhiệm vụ cần có tên');
      return;
    }
    setBusy(true);
    const body = {
      title,
      description: d.description,
      priority: d.priority,
      status: d.status,
      deadline: fromLocalInput(d.deadline),
      start: fromLocalInput(d.start),
      estimateHours: Number(d.estimateHours) || 1,
      pinned: d.pinned,
      projectId: d.projectId || null,
      workflowId: d.workflowId || null,
      assigneeId: d.assigneeId || null,
      groupKey: d.groupKey || group || 'work',
      executorIds,
      hashtags: tags,
      subtasks: subs.map((s) => ({
        text: s.text,
        done: s.done,
        deadline: s.deadline,
        start: s.start,
        estimateHours: s.estimateHours,
      })),
    };

    const result = existing
      ? await updateTask(existing.id, body)
      : await createTask({ ...body, creatorId: user?.id ?? null });
    setBusy(false);

    if (result) {
      toast(existing ? 'Đã lưu nhiệm vụ' : 'Đã tạo nhiệm vụ mới');
      onClose();
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm(`Xoá nhiệm vụ "${existing.title}"? Thao tác này không thể hoàn tác.`)) return;
    const ok = await deleteTask(existing.id);
    if (ok) {
      toast('Đã xoá nhiệm vụ');
      onClose();
    }
  };

  const duplicate = async () => {
    if (!existing) return;
    const copy = await createTask({
      title: `${existing.title} (bản sao)`,
      description: existing.description,
      priority: existing.priority,
      status: 'TODO',
      deadline: existing.deadline,
      start: existing.start,
      estimateHours: existing.estimateHours,
      projectId: existing.projectId,
      workflowId: existing.workflowId,
      assigneeId: existing.assigneeId,
      groupKey: existing.groupKey,
      executorIds: existing.executorIds,
      hashtags: existing.hashtags,
      subtasks: existing.subtasks.map((s) => ({ text: s.text, done: false })),
      creatorId: user?.id ?? null,
    });
    if (copy) {
      toast('Đã nhân bản nhiệm vụ');
      onClose();
    }
  };

  const sendComment = async () => {
    if (!existing || !comment.trim()) return;
    await addComment(existing.id, comment.trim(), user?.id ?? null);
    setComment('');
  };

  const title = (
    <input
      type="text"
      value={d.title}
      placeholder={t('Tên nhiệm vụ')}
      onChange={(e) => set('title', e.target.value)}
      style={{
        border: 'none', background: 'transparent', fontSize: 18,
        fontWeight: 750, padding: 2, width: 360, maxWidth: '100%',
      }}
    />
  );

  return (
    <Modal title={title} wide onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {groupInfo && (
          <span className="badge">
            {groupInfo.icon} {groupInfo.name}
          </span>
        )}
        {wf && (
          <span className="badge" style={{ background: `${wf.color}1A`, color: wf.color }}>
            {wf.name}
          </span>
        )}
        {existing?.deadline && (
          <span className={`badge${isOverdue(existing) ? ' overdue' : ''}`}>
            ⏰ {fmtDDMMM(existing.deadline)}
          </span>
        )}
      </div>

      <div className="pill-toggle-row" style={{ marginBottom: 14 }}>
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`pill-toggle${d.status === s ? ' active' : ''}`}
            onClick={() => set('status', s)}
          >
            {t(TASK_STATUS_LABEL[s])}
          </button>
        ))}
      </div>

      <div className="field">
        <label>
          <Icon name="edit" size={12} /> {t('MÔ TẢ NHIỆM VỤ')}
        </label>
        <textarea
          value={d.description}
          placeholder={t('Mô tả chi tiết…')}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Dự án')}</label>
          <select value={d.projectId} onChange={(e) => set('projectId', e.target.value)}>
            <option value="">{t('— Không thuộc dự án —')}</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Workflow</label>
          <select value={d.workflowId} onChange={(e) => set('workflowId', e.target.value)}>
            <option value="">{t('— Chọn Workflow —')}</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Nhóm công việc')}</label>
          <select
            value={proj ? proj.groupKey : d.groupKey}
            disabled={!!proj}
            title={proj ? 'Nhiệm vụ luôn theo nhóm của dự án' : undefined}
            onChange={(e) => set('groupKey', e.target.value as GroupKey)}
          >
            <option value="">{t('— Chọn nhóm công việc —')}</option>
            {WORK_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('Độ ưu tiên')}</label>
          <select value={d.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(PRIORITY_LABEL[p])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Hạn chót')}</label>
          <input
            type="datetime-local"
            value={d.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('Bắt đầu')}</label>
          <input type="datetime-local" value={d.start} onChange={(e) => set('start', e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Ước tính (giờ)')}</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={d.estimateHours}
            onChange={(e) => set('estimateHours', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>
            {t('Tiến độ')} {autoPct !== null ? '(tự động theo công việc con)' : '(%)'}
          </label>
          <input
            type="number"
            readOnly
            value={autoPct !== null ? autoPct : d.status === 'DONE' ? 100 : 0}
            style={{ opacity: 0.7 }}
          />
        </div>
      </div>

      <div className="field">
        <label>
          {t(`Công việc con (${subs.filter((s) => s.done).length}/${subs.length})`)}{' '}
          <span style={{ fontWeight: 500, color: 'var(--text-3)' }}>
            {t('— đặt giờ để lên thời gian biểu')}
          </span>
        </label>
        {subs.map((s, i) => (
          <div className="sub-edit-row" key={s.key}>
            <TaskCheck
              done={s.done}
              size={18}
              onToggle={() =>
                setSubs((cur) => cur.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
              }
            />
            <input
              type="text"
              className="sub-edit-title"
              value={s.text}
              placeholder={t('Công việc con…')}
              onChange={(e) =>
                setSubs((cur) => cur.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
              }
            />
            <label className="sub-edit-when" title="Hạn công việc con">
              <Icon name="flag" size={11} />
              <input
                type="date"
                value={toLocalDateInput(s.deadline)}
                onChange={(e) =>
                  setSubs((cur) =>
                    cur.map((x, j) =>
                      j === i
                        ? { ...x, deadline: e.target.value ? combineDateTime(e.target.value, '18:00') : null }
                        : x,
                    ),
                  )
                }
              />
            </label>
            <label className="sub-edit-when" title="Giờ bắt đầu — có giờ mới lên thời gian biểu">
              <Icon name="clock" size={11} />
              <input
                type="time"
                value={s.start ? fmtHM(s.start) : ''}
                onChange={(e) =>
                  setSubs((cur) =>
                    cur.map((x, j) => {
                      if (j !== i) return x;
                      if (!e.target.value) return { ...x, start: null };
                      const day = toLocalDateInput(x.deadline) || toLocalDateInput(new Date().toISOString());
                      return { ...x, start: combineDateTime(day, e.target.value) };
                    }),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="btn-icon danger"
              style={{ width: 26, height: 26 }}
              onClick={() => setSubs((cur) => cur.filter((_, j) => j !== i))}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6 }}
          onClick={() =>
            setSubs((cur) => [
              ...cur,
              { key: `s${subKey++}`, text: '', done: false, deadline: null, start: null, estimateHours: 0.5 },
            ])
          }
        >
          <Icon name="plus" size={14} /> {t('Thêm mục')}
        </button>
      </div>

      <HashtagField tags={tags} onChange={setTags} />

      <div className="field">
        <label>
          <Icon name="user" size={12} /> {t('NGƯỜI PHỤ TRÁCH')}
        </label>
        <select value={d.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
          <option value="">{t('Chưa giao')}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>
          <Icon name="people" size={12} /> {t('NGƯỜI THỰC HIỆN')}
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pill-toggle${executorIds.includes(p.id) ? ' active' : ''}`}
              onClick={() =>
                setExecutorIds((cur) =>
                  cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id],
                )
              }
            >
              <Avatar person={p} size={16} /> {p.name}
            </button>
          ))}
        </div>
      </div>

      {existing && (
        <>
          {/* Reads the same NoteTaskLink rows the note editor writes, so a link
              made from either side shows up on both immediately. */}
          <div className="modal-section-label">
            <Icon name="edit" size={12} /> {t('GHI CHÚ LIÊN QUAN')}
          </div>
          <RelatedNotes mode="task" id={existing.id} onNavigate={onClose} />

          <div className="pill-toggle-row" style={{ marginTop: 16, marginBottom: 10 }}>
            <button
              type="button"
              className={`pill-toggle${tab === 'comments' ? ' active' : ''}`}
              onClick={() => setTab('comments')}
            >
              💬 {t('Bình luận')} ({existing.comments.length})
            </button>
            <button
              type="button"
              className={`pill-toggle${tab === 'activity' ? ' active' : ''}`}
              onClick={() => setTab('activity')}
            >
              📜 {t('Lịch sử hoạt động')} ({existing.activity.length})
            </button>
          </div>

          {tab === 'comments' ? (
            <>
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
                {existing.comments.length ? (
                  existing.comments.map((c) => {
                    const author = people.find((p) => p.id === c.authorId) ?? null;
                    return (
                      <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <Avatar person={author} size={26} />
                        <div>
                          <b style={{ fontSize: 12.5 }}>{author?.name ?? '—'}</b>
                          <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{c.text}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                            {fmtDate(c.createdAt, lang)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{t('Chưa có bình luận nào')}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={comment}
                  placeholder={t('Viết bình luận…')}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void sendComment();
                  }}
                  style={{
                    flex: 1, border: '1px solid var(--border)', borderRadius: 9,
                    padding: '8px 11px', background: 'var(--surface-2)', outline: 'none',
                  }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void sendComment()}>
                  {t('Gửi')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {existing.activity.map((a) => (
                <div
                  key={a.id}
                  style={{
                    fontSize: 12, color: 'var(--text-2)', padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {a.text} <span style={{ color: 'var(--text-3)' }}>· {fmtDate(a.createdAt, lang)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="modal-section-label">
            <Icon name="settings" size={12} /> {t('HÀNH ĐỘNG')}
          </div>
          <div className="action-grid">
            <button
              type="button"
              className="action-item"
              onClick={() => set('status', d.status === 'DONE' ? 'TODO' : 'DONE')}
            >
              <Icon name="check" size={15} />
              {t(d.status === 'DONE' ? 'Mở lại nhiệm vụ' : 'Đánh dấu hoàn thành')}
            </button>
            <button type="button" className="action-item" onClick={() => void duplicate()}>
              <Icon name="archive" size={15} /> {t('Nhân bản')}
            </button>
            <button type="button" className="action-item" onClick={() => set('pinned', !d.pinned)}>
              <Icon name={d.pinned ? 'star-filled' : 'star'} size={15} />
              {t(d.pinned ? 'Bỏ ghim' : 'Ghim lên đầu')}
            </button>
            <button type="button" className="action-item danger" onClick={() => void remove()}>
              <Icon name="trash" size={15} /> {t('Xoá nhiệm vụ')}
            </button>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('Huỷ')}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          <Icon name="check" size={15} /> {t('Lưu')}
        </button>
      </div>
    </Modal>
  );
}
