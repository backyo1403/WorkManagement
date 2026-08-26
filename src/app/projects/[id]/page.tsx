'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { HashtagChips } from '@/components/ui/HashtagField';
import { EmptyState, PriorityPill } from '@/components/ui/primitives';
import { InlineTaskRow } from '@/components/task/InlineTaskRow';
import { TaskModal } from '@/components/task/TaskModal';
import { ProjectModal } from '@/components/project/ProjectModal';
import { RelatedNotes } from '@/components/notes/RelatedNotes';
import { fmtDDMMM } from '@/lib/domain';
import {
  PROJECT_STATUS_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  groupColor,
  groupName,
  projectStatusBadgeClass,
  type TaskStatus,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, tasks, people, updateProject, updateTask, updateSubtask } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [tab, setTab] = useState<TaskStatus | ''>('');
  const [openTasks, setOpenTasks] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [taskModal, setTaskModal] = useState<{ id: string | null } | null>(null);

  const project = projects.find((p) => p.id === params.id) ?? null;

  const projectTasks = useMemo(
    () => tasks.filter((x) => x.projectId === params.id && !x.archived),
    [tasks, params.id],
  );

  if (!project) {
    return (
      <EmptyState icon="folder">
        <div style={{ marginTop: 8 }}>Không tìm thấy dự án này.</div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => router.push('/projects')}>
          ← {t('Danh sách dự án')}
        </button>
      </EmptyState>
    );
  }

  const owner = people.find((p) => p.id === project.ownerId) ?? null;
  const counts = {
    TODO: projectTasks.filter((x) => x.status === 'TODO').length,
    IN_PROGRESS: projectTasks.filter((x) => x.status === 'IN_PROGRESS').length,
    DONE: projectTasks.filter((x) => x.status === 'DONE').length,
  };
  const pct = projectTasks.length ? Math.round((counts.DONE / projectTasks.length) * 100) : 0;
  const filtered = tab ? projectTasks.filter((x) => x.status === tab) : projectTasks;

  return (
    <div className="view-enter">
      <div className="page-header">
        <div className="page-header-main">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 8 }}
            onClick={() => router.push('/projects')}
          >
            ← {t('Danh sách dự án')}
          </button>
          <div className="page-title">
            <span className="page-title-icon" style={{ color: project.color }}>
              <Icon name={project.icon} size={20} />
            </span>
            {project.name}
          </div>
        </div>
        <div className="page-actions">
          {project.status !== 'COMPLETED' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!confirm(`Đánh dấu dự án "${project.name}" là hoàn tất?`)) return;
                if (await updateProject(project.id, { status: 'COMPLETED' })) toast('Đã hoàn tất dự án');
              }}
            >
              <Icon name="check" size={14} /> {t('Hoàn tất Dự án')}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={14} /> {t('Sửa')}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <Icon name={project.icon} size={20} style={{ color: project.color }} />
              <b style={{ fontSize: 15 }}>{project.name}</b>
              <span className={projectStatusBadgeClass(project.status)}>
                {t(PROJECT_STATUS_LABEL[project.status])}
              </span>
              <PriorityPill priority={project.priority} />
              <span
                className="badge"
                style={{
                  background: `color-mix(in srgb, ${groupColor(project.groupKey)} 14%, transparent)`,
                  color: groupColor(project.groupKey),
                }}
              >
                {groupName(project.groupKey)}
              </span>
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 10 }}>{project.description}</div>
            {project.goal && (
              <div style={{ fontSize: 12.5, marginBottom: 6 }}>
                🎯 {t('Mục tiêu')}: <b>{project.goal}</b>
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              <Icon name="user" size={12} /> {t('Người phụ trách')}:{' '}
              <b style={{ color: 'var(--text)' }}>{owner?.name ?? t('Chưa xác định')}</b>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>
              {t('Bắt đầu')}: {fmtDDMMM(project.startDate)} · {t('Kết thúc')}: {fmtDDMMM(project.endDate)}
            </div>
            <div style={{ marginTop: 8 }}>
              <HashtagChips tags={project.hashtags} />
            </div>
          </div>

          <div style={{ minWidth: 190 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>{t('Tiến độ')}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: project.color }}>{pct}%</div>
            <div className="progress-bar" style={{ marginBottom: 10 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: project.color }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge" style={{ flex: 1, textAlign: 'center', display: 'block' }}>
                {counts.TODO}
                <br />
                <span style={{ fontWeight: 500 }}>{t('Cần làm')}</span>
              </span>
              <span className="badge today" style={{ flex: 1, textAlign: 'center', display: 'block' }}>
                {counts.IN_PROGRESS}
                <br />
                <span style={{ fontWeight: 500 }}>{t('Đang làm')}</span>
              </span>
              <span className="badge success" style={{ flex: 1, textAlign: 'center', display: 'block' }}>
                {counts.DONE}
                <br />
                <span style={{ fontWeight: 500 }}>{t('Xong')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>
          <span>
            <Icon name="check" size={15} /> {t('Nhiệm vụ')}{' '}
            <span style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--text-3)' }}>
              {t(`${projectTasks.length} nhiệm vụ`)}
            </span>
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setTaskModal({ id: null })}
          >
            <Icon name="plus" size={14} /> {t('Thêm')}
          </button>
        </h3>

        <div className="pill-toggle-row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`pill-toggle${tab === '' ? ' active' : ''}`}
            onClick={() => setTab('')}
          >
            {t('Tất cả')}
          </button>
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`pill-toggle${tab === s ? ' active' : ''}`}
              onClick={() => setTab(s)}
            >
              {t(TASK_STATUS_LABEL[s])}
            </button>
          ))}
        </div>

        <div className="task-list">
          {filtered.length ? (
            filtered.map((x) => (
              <InlineTaskRow
                key={x.id}
                task={x}
                expanded={openTasks.has(x.id)}
                onExpand={() =>
                  setOpenTasks((cur) => {
                    const next = new Set(cur);
                    if (next.has(x.id)) next.delete(x.id);
                    else next.add(x.id);
                    return next;
                  })
                }
                onOpen={() => setTaskModal({ id: x.id })}
                onToggleDone={() => void updateTask(x.id, { status: x.status === 'DONE' ? 'TODO' : 'DONE' })}
                onToggleSub={(subId, done) => void updateSubtask(subId, { done })}
              />
            ))
          ) : (
            <EmptyState icon="check">{t('Không có nhiệm vụ')}</EmptyState>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <RelatedNotes mode="project" id={project.id} />
      </div>

      {editing && <ProjectModal project={project} onClose={() => setEditing(false)} />}
      {taskModal && (
        <TaskModal
          taskId={taskModal.id}
          prefill={{ projectId: project.id, groupKey: project.groupKey }}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}
