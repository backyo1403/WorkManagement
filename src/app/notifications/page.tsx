'use client';

import { useMemo, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/ui/primitives';
import { computeNotifications } from '@/components/shell/AppShell';
import { TaskModal } from '@/components/task/TaskModal';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

export default function NotificationsPage() {
  const { tasks } = useData();
  const { group, t } = usePrefs();
  const [modalId, setModalId] = useState<string | null>(null);

  const list = useMemo(() => computeNotifications(tasks, group), [tasks, group]);

  return (
    <div className="view-enter">
      <PageHeader title="Thông báo" icon="bell" />

      <div className="card">
        {list.length ? (
          list.map((n) => (
            <div
              className="task-row"
              key={n.id}
              style={{
                marginBottom: 8,
                borderLeft: `3px solid ${n.type === 'overdue' ? 'var(--danger)' : 'var(--warning)'}`,
              }}
              onClick={() => setModalId(n.task.id)}
            >
              <span style={{ fontSize: 18 }}>{n.type === 'overdue' ? '🚨' : '⏰'}</span>
              <span style={{ flex: 1 }}>
                {t('Nhiệm vụ')} &ldquo;{n.task.title}&rdquo;{' '}
                {n.type === 'overdue' ? t('đã quá hạn') : t('đến hạn hôm nay')}
              </span>
              <span className={`badge ${n.type === 'overdue' ? 'overdue' : 'warning'}`}>
                {t(n.type === 'overdue' ? 'Quá hạn' : 'Hôm nay')}
              </span>
            </div>
          ))
        ) : (
          <EmptyState icon="bell">{t('Không có thông báo mới')}</EmptyState>
        )}
      </div>

      {modalId && <TaskModal taskId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
