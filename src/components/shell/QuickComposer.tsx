'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/primitives';
import { combineDateTime, ymdLocal } from '@/lib/domain';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PROJECT_ICONS,
  WORKFLOW_COLORS,
  WORK_GROUPS,
  type GroupKey,
  type Priority,
} from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

interface Draft {
  title: string;
  startDate: string;
  startTime: string;
  due: string;
  dueTime: string;
  assigneeId: string;
  priority: Priority;
  projectId: string;
  workflowId: string;
  groupKey: string;
}

const EMPTY: Draft = {
  title: '', startDate: '', startTime: '', due: '', dueTime: '',
  assigneeId: '', priority: 'MEDIUM', projectId: '', workflowId: '', groupKey: '',
};

/**
 * "What needs doing today?" — one line to capture a task, with chips for the
 * details. A start *time* is what puts the task on the timetable; a deadline
 * can be a bare date. A new project can be created inline without leaving.
 */
export function QuickComposer({ onCreated }: { onCreated?: () => void }) {
  const { people, projects, workflows, createTask, createProject, createNote } = useData();
  const { group, t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [d, setD] = useState<Draft>(EMPTY);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  const addProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      toast('Nhập tên dự án');
      return;
    }
    const p = await createProject({
      name,
      groupKey: group || 'work',
      icon: PROJECT_ICONS[projects.length % PROJECT_ICONS.length],
      color: WORKFLOW_COLORS[projects.length % WORKFLOW_COLORS.length],
      startDate: new Date().toISOString(),
      ownerId: user?.id ?? null,
      creatorId: user?.id ?? null,
    });
    if (p) {
      set('projectId', p.id);
      setAddingProject(false);
      setNewProjectName('');
      toast(`Đã tạo dự án "${name}"`);
    }
  };

  const submit = async () => {
    const title = d.title.trim();
    if (!title) {
      toast('Nhập nội dung công việc trước');
      return;
    }
    setBusy(true);

    // A deadline may be date-only; `start` is set only when a clock time exists.
    const deadline = d.due ? combineDateTime(d.due, d.dueTime || '18:00') : null;
    let start: string | null = null;
    if (d.startDate) start = combineDateTime(d.startDate, d.startTime || '09:00');
    else if (d.startTime) start = combineDateTime(ymdLocal(new Date()), d.startTime);

    const created = await createTask({
      title,
      deadline,
      start,
      priority: d.priority,
      status: 'TODO',
      assigneeId: d.assigneeId || null,
      projectId: d.projectId || null,
      workflowId: d.workflowId || null,
      groupKey: d.groupKey || group || 'work',
      creatorId: user?.id ?? null,
      executorIds: d.assigneeId ? [d.assigneeId] : [],
    });
    setBusy(false);

    if (created) {
      setD(EMPTY);
      toast(start ? 'Đã tạo nhiệm vụ và xếp vào thời gian biểu' : 'Đã tạo nhiệm vụ mới');
      onCreated?.();
    }
  };

  const newNote = async () => {
    const note = await createNote({
      title: d.title.trim(),
      groupKey: group || 'work',
      authorId: user?.id ?? null,
    });
    if (note) {
      setD(EMPTY);
      toast('Đã tạo ghi chú mới');
      // Navigate before closing: `onCreated` unmounts this component, and a
      // push issued from an unmounted component is dropped by the router.
      router.push(`/notes/${note.id}`);
      onCreated?.();
    }
  };

  return (
    <div className="card">
      {/* Two distinct outcomes, so they get two distinct buttons rather than a
          mode switch that could be missed. */}
      <div className="composer-kinds">
        <span className="composer-kind active">
          <Icon name="check" size={13} /> {t('Nhiệm vụ')}
        </span>
        <button type="button" className="composer-kind" onClick={() => void newNote()}>
          <Icon name="edit" size={13} /> {t('Ghi chú mới')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar person={user} size={38} />
        <input
          type="text"
          value={d.title}
          placeholder={t(`${user?.name ?? 'Bạn'} ơi, hôm nay cần làm gì?`)}
          onChange={(e) => set('title', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          style={{
            flex: 1, border: '1px solid var(--border)', background: 'var(--surface-2)',
            borderRadius: 22, padding: '11px 18px', outline: 'none', fontSize: 13.5,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12,
          borderTop: '1px solid var(--border)', alignItems: 'center',
        }}
      >
        <label className="composer-chip" title={t('Ngày bắt đầu')}>
          <Icon name="play" size={13} />
          <input type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </label>
        <label className="composer-chip" title={t('Giờ bắt đầu')}>
          <Icon name="clock" size={13} />
          <input
            type="time"
            value={d.startTime}
            onChange={(e) => set('startTime', e.target.value)}
            style={{ maxWidth: 84 }}
          />
        </label>
        <label className="composer-chip" title={t('Hạn chót')}>
          <Icon name="flag" size={13} />
          <input type="date" value={d.due} onChange={(e) => set('due', e.target.value)} />
        </label>
        <label className="composer-chip" title={t('Giờ hạn chót')}>
          <Icon name="alert" size={13} />
          <input
            type="time"
            value={d.dueTime}
            onChange={(e) => set('dueTime', e.target.value)}
            style={{ maxWidth: 84 }}
          />
        </label>

        <label className="composer-chip" title={t('Người thực hiện')}>
          <Icon name="user" size={13} />
          <select value={d.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
            <option value="">{t('Chưa giao')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="composer-chip" title={t('Độ ưu tiên')}>
          <Icon name="flag" size={13} />
          <select value={d.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(PRIORITY_LABEL[p])}
              </option>
            ))}
          </select>
        </label>

        {addingProject ? (
          <span className="composer-chip" style={{ borderColor: 'var(--brand)' }}>
            <Icon name="folder" size={13} />
            <input
              type="text"
              value={newProjectName}
              placeholder={t('Tên dự án mới…')}
              autoFocus
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addProject();
                }
              }}
              style={{ maxWidth: 150, cursor: 'text' }}
            />
            <button type="button" className="btn btn-primary btn-sm" style={{ padding: '2px 9px' }} onClick={() => void addProject()}>
              {t('Tạo')}
            </button>
            <button
              type="button"
              className="btn-icon"
              style={{ width: 22, height: 22 }}
              onClick={() => {
                setAddingProject(false);
                setNewProjectName('');
              }}
            >
              <Icon name="close" size={10} />
            </button>
          </span>
        ) : (
          <label className="composer-chip" title={t('Dự án')}>
            <Icon name="folder" size={13} />
            <select
              value={d.projectId}
              onChange={(e) => {
                if (e.target.value === '__new__') setAddingProject(true);
                else set('projectId', e.target.value);
              }}
            >
              <option value="">{t('Không thuộc dự án')}</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="__new__">{t('Thêm dự án mới…')}</option>
            </select>
          </label>
        )}

        <label className="composer-chip" title="Workflow">
          <Icon name="workflow" size={13} />
          <select value={d.workflowId} onChange={(e) => set('workflowId', e.target.value)}>
            <option value="">{t('Workflow…')}</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <label className="composer-chip" title={t('Nhóm công việc')}>
          <Icon name="briefcase" size={13} />
          <select value={d.groupKey} onChange={(e) => set('groupKey', e.target.value as GroupKey | '')}>
            <option value="">{t('Nhóm công việc…')}</option>
            {WORK_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          disabled={busy}
          onClick={() => void submit()}
        >
          <Icon name="send" size={15} /> {t('Tạo nhiệm vụ')}
        </button>
      </div>
    </div>
  );
}
