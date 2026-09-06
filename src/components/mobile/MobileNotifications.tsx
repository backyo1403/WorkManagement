'use client';

import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DuePill } from './parts';
import { computeNotifications } from '@/lib/domain';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * Thông báo — what the AD menu's badge is counting.
 *
 * The handoff parks the full notification centre for a later round, so this is
 * only the list `computeNotifications` already produces for the sidebar badge:
 * overdue and due-today tasks, soonest first. No new rules, no new state.
 */
export function MobileNotifications({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { tasks, projects } = useData();
  const { group, t } = usePrefs();

  const rows = useMemo(() => computeNotifications(tasks, group), [tasks, group]);

  if (rows.length === 0) {
    return <div className="m-page m-empty">{t('Không có thông báo nào')}</div>;
  }

  return (
    <div className="m-page m-pad" style={{ gap: 9, paddingTop: 12 }}>
      {rows.map((row) => {
        const project = projects.find((p) => p.id === row.task.projectId) ?? null;
        const overdue = row.type === 'overdue';
        return (
          <button
            key={row.id}
            type="button"
            className="m-attention-row"
            onClick={() => onOpenTask(row.task.id)}
          >
            <Icon
              name={overdue ? 'alert' : 'clock'}
              size={17}
              style={{ color: overdue ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }}
            />
            <span className="m-attention-body">
              <span className="m-attention-title">{row.task.title}</span>
              <span className="m-attention-sub">
                {overdue ? t('Đã quá hạn') : t('Đến hạn hôm nay')}
                {project ? ` · ${project.name}` : ''}
              </span>
            </span>
            <DuePill task={row.task} />
          </button>
        );
      })}
    </div>
  );
}
