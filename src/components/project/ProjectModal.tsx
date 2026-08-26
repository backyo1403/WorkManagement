'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HashtagField } from '@/components/ui/HashtagField';
import { Modal } from '@/components/ui/primitives';
import { toLocalDateInput } from '@/lib/domain';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PROJECT_ICONS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  WORKFLOW_COLORS,
  WORK_GROUPS,
  type GroupKey,
  type Priority,
  type ProjectDTO,
  type ProjectStatus,
} from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * Project editor. Like the task editor, everything is draft state until Save —
 * picking an icon or a colour must never wipe the name typed above it.
 *
 * Changing the work group is consequential: the server re-homes every task in
 * the project, so the field warns when the project already has tasks.
 */
export function ProjectModal({
  project,
  onClose,
}: {
  project: ProjectDTO | null;
  onClose: () => void;
}) {
  const { projects, tasks, people, createProject, updateProject } = useData();
  const { group, t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [goal, setGoal] = useState(project?.goal ?? '');
  const [icon, setIcon] = useState(project?.icon ?? PROJECT_ICONS[projects.length % PROJECT_ICONS.length]);
  const [color, setColor] = useState(project?.color ?? WORKFLOW_COLORS[projects.length % WORKFLOW_COLORS.length]);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'IN_PROGRESS');
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'MEDIUM');
  const [groupKey, setGroupKey] = useState<GroupKey>(project?.groupKey ?? (group || 'work'));
  const [ownerId, setOwnerId] = useState(project?.ownerId ?? '');
  const [startDate, setStartDate] = useState(toLocalDateInput(project?.startDate ?? null));
  const [endDate, setEndDate] = useState(toLocalDateInput(project?.endDate ?? null));
  const [tags, setTags] = useState<string[]>(project?.hashtags ?? []);
  const [busy, setBusy] = useState(false);

  const taskCount = project ? tasks.filter((x) => x.projectId === project.id && !x.archived).length : 0;
  const groupChanged = !!project && groupKey !== project.groupKey;

  const save = async () => {
    if (!name.trim()) {
      toast('Dự án cần có tên');
      return;
    }
    setBusy(true);
    const body = {
      name: name.trim(),
      description,
      goal,
      icon,
      color,
      status,
      priority,
      groupKey,
      ownerId: ownerId || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      hashtags: tags,
    };
    const result = project
      ? await updateProject(project.id, body)
      : await createProject({ ...body, creatorId: user?.id ?? null });
    setBusy(false);

    if (result) {
      toast(project ? 'Đã lưu dự án' : 'Đã tạo dự án mới');
      onClose();
    }
  };

  return (
    <Modal title={project ? t('Sửa') + ' — ' + project.name : t('Thêm dự án')} icon="folder" onClose={onClose}>
      <div className="field">
        <label>{t('Tên dự án…')}</label>
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>{t('Mô tả nhiệm vụ')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="field">
        <label>{t('Mục tiêu')}</label>
        <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>

      <div className="field">
        <label>{t('Nhóm công việc')}</label>
        <div className="group-picker">
          {WORK_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`group-opt${groupKey === g.key ? ' active' : ''}`}
              style={{ ['--gc' as string]: g.color }}
              onClick={() => setGroupKey(g.key)}
            >
              <Icon name={g.glyph} size={14} /> {g.name}
            </button>
          ))}
        </div>
        {groupChanged && taskCount > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--warning)', marginTop: 6 }}>
            ⚠️ {taskCount} nhiệm vụ của dự án sẽ chuyển sang nhóm {WORK_GROUPS.find((g) => g.key === groupKey)?.name}.
          </div>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Trạng thái')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(PROJECT_STATUS_LABEL[s])}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('Độ ưu tiên')}</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
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
          <label>{t('Bắt đầu')}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('Kết thúc')}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>{t('Người phụ trách')}</label>
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">{t('Chưa xác định')}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Icon</label>
        <div className="icon-picker">
          {PROJECT_ICONS.map((ic) => (
            <span
              key={ic}
              className={icon === ic ? 'selected' : ''}
              onClick={() => setIcon(ic)}
              role="button"
            >
              <Icon name={ic} size={16} />
            </span>
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('Màu sắc')}</label>
        <div className="color-swatch-row">
          {WORKFLOW_COLORS.map((c) => (
            <span
              key={c}
              className={`color-swatch${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              role="button"
            />
          ))}
        </div>
      </div>

      <HashtagField tags={tags} onChange={setTags} />

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
