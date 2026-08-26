'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { taskMatches } from '@/components/ui/SearchBox';
import { TaskModal } from '@/components/task/TaskModal';
import { TaskRow } from '@/components/task/TaskRow';
import { fmtDDMMM, pinnedFirst, sortTasks, TASK_SORTS, type TaskSort } from '@/lib/domain';
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function TasksPage() {
  const { tasks, projects, workflows, people } = useData();
  const { group, t } = usePrefs();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [sortBy, setSortBy] = useState<TaskSort>('deadline');
  const [modal, setModal] = useState<{ id: string | null } | null>(
    // Search results and notifications deep-link straight into a task.
    () => (searchParams.get('open') ? { id: searchParams.get('open') } : null),
  );

  const list = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    let out = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));

    if (projectId) {
      out = projectId === '__none__' ? out.filter((x) => !x.projectId) : out.filter((x) => x.projectId === projectId);
    }
    if (status) out = out.filter((x) => x.status === status);
    if (query.trim()) out = out.filter((x) => taskMatches(x, query, byId.get(x.projectId ?? '') ?? null));

    return pinnedFirst(sortTasks(out, sortBy));
  }, [tasks, projects, group, projectId, status, query, sortBy]);

  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['Tiêu đề', 'Dự án', 'Workflow', 'Người phụ trách', 'Ưu tiên', 'Trạng thái', 'Hạn chót', 'Tiến độ %'],
    ];
    list.forEach((x) => {
      rows.push([
        x.title,
        projects.find((p) => p.id === x.projectId)?.name ?? '',
        workflows.find((w) => w.id === x.workflowId)?.name ?? '',
        people.find((p) => p.id === x.assigneeId)?.name ?? '',
        x.priority,
        x.status,
        x.deadline ? fmtDDMMM(x.deadline) : '',
        x.status === 'DONE' ? 100 : x.completion,
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    // The BOM makes Excel read the file as UTF-8 rather than mangling accents.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhiem-vu-bach-office.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`Đã xuất ${list.length} nhiệm vụ ra CSV`);
  };

  return (
    <div className="view-enter">
      <PageHeader
        title="Nhiệm vụ"
        icon="check"
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
                  placeholder={t('Tìm kiếm nhiệm vụ…')}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <select
              className="filter-select"
              title="Lọc theo dự án"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t('Tất cả dự án')}</option>
              <option value="__none__">{t('— Không thuộc dự án —')}</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              title="Lọc theo trạng thái"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
            >
              <option value="">{t('Tất cả trạng thái')}</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(TASK_STATUS_LABEL[s])}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              title={t('Sắp xếp theo')}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
            >
              {TASK_SORTS.map(([k, label]) => (
                <option key={k} value={k}>
                  {t(label)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-icon"
              title={t('Xoá lọc')}
              onClick={() => {
                setQuery('');
                setProjectId('');
                setStatus('');
                setSortBy('deadline');
              }}
            >
              <Icon name="refresh" size={15} />
            </button>
            <button type="button" className="btn-icon" title={t('Xuất CSV')} onClick={exportCsv}>
              <Icon name="download" size={15} />
            </button>
            <button
              type="button"
              className="btn-add"
              title={t('Tạo nhiệm vụ')}
              onClick={() => setModal({ id: null })}
            >
              <Icon name="plus" size={18} />
            </button>
          </>
        }
      />

      <div className="list-meta">{t(`${list.length} nhiệm vụ`)}</div>

      <div className="task-list">
        {list.length ? (
          list.map((x) => <TaskRow key={x.id} task={x} onOpen={(id) => setModal({ id })} />)
        ) : (
          <EmptyState icon="check">
            <div style={{ marginTop: 8 }}>{t('Không có nhiệm vụ nào khớp bộ lọc')}</div>
          </EmptyState>
        )}
      </div>

      {modal && <TaskModal taskId={modal.id} onClose={() => setModal(null)} />}
    </div>
  );
}
