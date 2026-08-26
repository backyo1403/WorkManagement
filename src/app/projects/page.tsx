'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { HashtagChips } from '@/components/ui/HashtagField';
import {
  DuePill,
  EmptyState,
  PageHeader,
  PinButton,
  PriorityPill,
  TaskCheck,
} from '@/components/ui/primitives';
import { InlineTaskRow } from '@/components/task/InlineTaskRow';
import { TaskModal } from '@/components/task/TaskModal';
import { ProjectModal } from '@/components/project/ProjectModal';
import { fmtDDMMM, fmtHM, isOverdue, pinnedFirst } from '@/lib/domain';
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
  groupColor,
  groupName,
  projectStatusBadgeClass,
  type ProjectDTO,
  type ProjectStatus,
  type TaskDTO,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function ProjectsPage() {
  const { projects, tasks, people, updateProject, deleteProject, updateTask, updateSubtask } = useData();
  const { group, t } = usePrefs();
  const toast = useToast();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const [openTasks, setOpenTasks] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ project: ProjectDTO | null } | null>(null);
  const [taskModal, setTaskModal] = useState<string | null>(null);

  const list = useMemo(() => {
    let out = projects.filter((p) => !group || p.groupKey === group);
    if (statusFilter) out = out.filter((p) => p.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(q));
    }
    return pinnedFirst(out);
  }, [projects, group, statusFilter, query]);

  const tasksOf = (projectId: string) => tasks.filter((x) => x.projectId === projectId && !x.archived);

  const progressOf = (projectId: string) => {
    const ts = tasksOf(projectId);
    if (!ts.length) return 0;
    return Math.round((ts.filter((x) => x.status === 'DONE').length / ts.length) * 100);
  };

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  const remove = async (p: ProjectDTO) => {
    const count = tasksOf(p.id).length;
    const warn = count
      ? `Xoá dự án "${p.name}"? ${count} nhiệm vụ sẽ được giữ lại nhưng không còn thuộc dự án nào.`
      : `Xoá dự án "${p.name}"?`;
    if (!confirm(warn)) return;
    if (await deleteProject(p.id)) toast('Đã xoá dự án');
  };

  return (
    <div className="view-enter">
      <PageHeader
        title="Dự án"
        icon="folder"
        actions={
          <>
            <div className="search-box">
              <div className="search-input-wrap">
                <span className="srch-ico">
                  <Icon name="search" size={15} />
                </span>
                <input
                  type="text"
                  value={query}
                  placeholder={t('Tên dự án…')}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
            >
              <option value="">{t('Tất cả trạng thái')}</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(PROJECT_STATUS_LABEL[s])}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-add"
              title={t('Thêm dự án')}
              onClick={() => setEditing({ project: null })}
            >
              <Icon name="plus" size={18} />
            </button>
          </>
        }
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 34 }} />
              <th>{t('Dự án')}</th>
              <th>{t('Thời gian')}</th>
              <th>{t('Phụ trách & Người tạo')}</th>
              <th>{t('Mục tiêu / Trạng thái')}</th>
              <th>{t('Tiến độ công việc')}</th>
              <th>{t('Hành động')}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState>{t('Chưa có dự án nào')}</EmptyState>
                </td>
              </tr>
            )}

            {list.map((p) => {
              const owner = people.find((x) => x.id === p.ownerId) ?? null;
              const creator = people.find((x) => x.id === p.creatorId) ?? null;
              const pct = progressOf(p.id);
              const pTasks = tasksOf(p.id);
              const open = openProjects.has(p.id);

              return [
                <tr
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggle(openProjects, p.id, setOpenProjects)}
                >
                  <td style={{ textAlign: 'center', paddingRight: 0 }}>
                    <span className={`row-caret${open ? ' open' : ''}`}>
                      <Icon name="chevron" size={13} />
                    </span>
                  </td>
                  <td style={{ maxWidth: 250 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 34, height: 34, borderRadius: 9,
                          background: `color-mix(in srgb, ${p.color} 15%, transparent)`,
                          color: p.color, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Icon name={p.icon} size={16} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {p.name}
                          <span style={{ fontWeight: 500, color: 'var(--text-3)', fontSize: 11.5 }}>
                            ({pTasks.length})
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: `color-mix(in srgb, ${groupColor(p.groupKey)} 14%, transparent)`,
                              color: groupColor(p.groupKey),
                            }}
                          >
                            {groupName(p.groupKey)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11.5, color: 'var(--text-2)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                          }}
                        >
                          {p.description}
                        </div>
                        <HashtagChips tags={p.hashtags} max={3} />
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {fmtDDMMM(p.startDate)} → {fmtDDMMM(p.endDate)}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {owner ? (
                      <>
                        <Icon name="user" size={12} /> {owner.name}
                      </>
                    ) : (
                      t('Chưa xác định')
                    )}
                    <br />
                    <span style={{ color: 'var(--text-3)' }}>
                      {t('Tạo bởi')}: {creator?.name ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={projectStatusBadgeClass(p.status)}>
                      {t(PROJECT_STATUS_LABEL[p.status])}
                    </span>{' '}
                    <PriorityPill priority={p.priority} />
                    {p.goal && (
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, maxWidth: 200 }}>
                        🎯 {p.goal}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 11.5, marginBottom: 3 }}>{pct}%</div>
                    <div className="progress-bar" style={{ width: 110 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <PinButton
                        pinned={p.pinned}
                        onToggle={() => void updateProject(p.id, { pinned: !p.pinned })}
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        title="Xem chi tiết"
                        onClick={() => router.push(`/projects/${p.id}`)}
                      >
                        <Icon name="eye" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title={t('Sửa')}
                        onClick={() => setEditing({ project: p })}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title={t('Xoá')}
                        onClick={() => void remove(p)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>,

                open && (
                  <tr key={`${p.id}-tasks`}>
                    <td colSpan={7} style={{ background: 'var(--surface-2)', padding: '10px 14px 12px 48px' }}>
                      {pTasks.length ? (
                        pTasks.map((x) => (
                          <InlineTaskRow
                            key={x.id}
                            task={x}
                            expanded={openTasks.has(x.id)}
                            onExpand={() => toggle(openTasks, x.id, setOpenTasks)}
                            onOpen={() => setTaskModal(x.id)}
                            onToggleDone={() => void updateTask(x.id, { status: x.status === 'DONE' ? 'TODO' : 'DONE' })}
                            onToggleSub={(subId, done) => void updateSubtask(subId, { done })}
                          />
                        ))
                      ) : (
                        <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '4px 0' }}>
                          {t('Dự án này chưa có nhiệm vụ nào')}
                        </div>
                      )}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {editing && <ProjectModal project={editing.project} onClose={() => setEditing(null)} />}
      {taskModal && <TaskModal taskId={taskModal} onClose={() => setTaskModal(null)} />}
    </div>
  );
}

