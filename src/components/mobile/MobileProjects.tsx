'use client';

import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PriorityPill, ddmm, groupAccent, tint } from './parts';
import { pinnedFirst } from '@/lib/domain';
import {
  PROJECT_STATUS_LABEL,
  groupName,
  type ProjectDTO,
  type ProjectStatus,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

const STATUS_TONE: Record<ProjectStatus, { bg: string; fg: string }> = {
  NOT_STARTED: { bg: 'var(--surface-3)', fg: 'var(--text-2)' },
  IN_PROGRESS: { bg: 'var(--purple-soft)', fg: 'var(--purple)' },
  COMPLETED: { bg: 'var(--success-soft)', fg: 'var(--success)' },
};

/**
 * Dự án — one card per project.
 *
 * Progress is the share of the project's tasks that are done, the same rule the
 * desktop table uses, so the two never disagree about a number.
 */
export function MobileProjects() {
  const { projects, tasks, people } = useData();
  const { group, t } = usePrefs();

  const list = useMemo(
    () => pinnedFirst(projects.filter((p) => !group || p.groupKey === group)),
    [projects, group],
  );

  const tasksOf = (id: string) => tasks.filter((x) => !x.archived && x.projectId === id);

  if (list.length === 0) {
    return <div className="m-page m-empty">{t('Chưa có dự án nào')}</div>;
  }

  return (
    <div className="m-page m-pad" style={{ gap: 10, paddingTop: 12 }}>
      {list.map((p: ProjectDTO) => {
        const owned = tasksOf(p.id);
        const pct = owned.length
          ? Math.round((owned.filter((x) => x.status === 'DONE').length / owned.length) * 100)
          : 0;
        const owner = people.find((x) => x.id === p.ownerId) ?? null;
        const accent = groupAccent(p.groupKey);

        return (
          <div key={p.id} className="m-proj-card">
            <div className="m-proj-head">
              <div className="m-proj-icon" style={{ background: tint(p.color, '26', 15) }}>
                <Icon name={p.icon || 'folder'} size={19} style={{ color: p.color }} />
              </div>
              <div className="m-col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <div className="m-proj-name">{p.name}</div>
                {p.description && <div className="m-proj-desc">{p.description}</div>}
              </div>
              <span
                className="m-proj-group"
                style={{ background: tint(accent, '26', 15), color: accent }}
              >
                {groupName(p.groupKey).toUpperCase()}
              </span>
            </div>

            <div className="m-proj-facts">
              <span
                className="m-status-pill"
                style={{
                  background: STATUS_TONE[p.status].bg,
                  color: STATUS_TONE[p.status].fg,
                }}
              >
                {t(PROJECT_STATUS_LABEL[p.status])}
              </span>
              <PriorityPill priority={p.priority} />
              {(p.startDate || p.endDate) && (
                <span className="m-num">
                  {ddmm(p.startDate)} → {ddmm(p.endDate)}
                </span>
              )}
              <span className="m-proj-owner">
                {t(`${owned.length} việc`)}
                {owner ? ` · ${owner.name}` : ''}
              </span>
            </div>

            {p.goal && <div className="m-proj-goal">🎯 {p.goal}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="m-bar" style={{ height: 6, borderRadius: 3 }}>
                <i style={{ width: `${pct}%`, background: p.color }} />
              </span>
              <span className="m-proj-pct m-num">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
