'use client';

import { useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { DuePill, clock, projectColor } from './parts';
import { dayPart, daysUntil, eventCoversDay, isEvent, isOverdue, isSameDay } from '@/lib/domain';
import { timetableEntries } from '@/lib/timetable';
import type { TaskDTO } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * Tổng quan — four counters, today's timed items, and what is about to slip.
 *
 * "Sự kiện" takes the slot the desktop dashboard gives to logged hours: on a
 * phone what you want off the lock screen is what is happening today, and
 * events are exactly that.
 *
 * Events stay out of the other three counters and out of "Cần chú ý". They are
 * dated, not due — nothing about a meeting is late — so counting them as work
 * about to slip would only make the numbers lie.
 */
export function MobileDashboard({
  onOpenTask,
  onGoTimetable,
}: {
  onOpenTask: (id: string) => void;
  onGoTimetable: () => void;
}) {
  const { tasks, projects } = useData();
  const { group, t } = usePrefs();
  const { user } = useAuth();

  const scoped = useMemo(
    () => tasks.filter((x) => !x.archived && (!group || x.groupKey === group)),
    [tasks, group],
  );

  const stats = useMemo(() => {
    const open = scoped.filter((x) => x.status !== 'DONE' && !isEvent(x));
    const dueToday = open.filter((x) => isSameDay(x.deadline));
    const overdue = open.filter(isOverdue);
    const doing = scoped.filter((x) => x.status === 'IN_PROGRESS');
    const doingProjects = new Set(doing.map((x) => x.projectId).filter(Boolean)).size;
    const doneRecently = scoped.filter(
      (x) => x.status === 'DONE' && x.completedAt && daysUntil(x.completedAt) >= -7,
    );

    const today = timetableEntries(scoped)
      .filter((e) => isSameDay(e.start))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

    // Events happening today — one that runs across several days counts on
    // every one of them, which is what `eventCoversDay` is for.
    const now = new Date();
    const events = scoped
      .filter((x) => isEvent(x) && eventCoversDay(x, now))
      .sort((a, b) => +new Date(a.start ?? 0) - +new Date(b.start ?? 0));
    const nextEvent = events[0] ?? null;

    return {
      today,
      cards: [
        // Whole phrases go through t(), never words glued together: the
        // dictionary keys on the sentence, and English does not reassemble in
        // the same order anyway.
        {
          label: 'Đến hạn hôm nay',
          value: dueToday.length,
          sub: t(`${overdue.length} quá hạn`),
          color: 'var(--danger)',
        },
        {
          label: 'Đang làm',
          value: doing.length,
          sub: t(`trên ${doingProjects} dự án`),
          color: 'var(--warning)',
        },
        {
          label: 'Hoàn thành',
          value: doneRecently.length,
          sub: t('trong 7 ngày'),
          color: 'var(--success)',
        },
        {
          label: 'Sự kiện',
          value: events.length,
          sub:
            nextEvent && nextEvent.start
              ? `${nextEvent.title} ${clock(nextEvent.start)}`
              : t('Không có sự kiện hôm nay'),
          color: 'var(--purple)',
        },
      ],
    };
  }, [scoped, t]);

  // Overdue, or due inside the next two days — the window worth a nudge.
  const attention = useMemo(
    () =>
      scoped
        .filter(
          (x) =>
            x.status !== 'DONE' &&
            !isEvent(x) &&
            !!x.deadline &&
            (isOverdue(x) || daysUntil(x.deadline!) <= 2),
        )
        .sort((a, b) => +new Date(a.deadline!) - +new Date(b.deadline!)),
    [scoped],
  );

  const projectName = (task: { projectId: string | null }) =>
    projects.find((p) => p.id === task.projectId)?.name ?? t('Không thuộc dự án');
  const projectOf = (id: string | null) => projects.find((p) => p.id === id) ?? null;

  const openCount = scoped.filter((x) => x.status !== 'DONE').length;
  const doneCount = scoped.filter((x) => x.status === 'DONE').length;

  return (
    <div className="m-page m-dash m-pad">
      <div className="m-col" style={{ gap: 3 }}>
        <div className="m-hello">
          {t(`Chào buổi ${dayPart()}, ${user?.name ?? 'bạn'}`)}
        </div>
        <div className="m-hello-sub">
          {t(`${openCount} đang thực hiện · ${doneCount} đã hoàn thành`)}
        </div>
      </div>

      <div className="m-stats">
        {stats.cards.map((c) => (
          <div key={c.label} className="m-stat">
            <div className="m-stat-label">{t(c.label)}</div>
            <div className="m-stat-value m-num" style={{ color: c.color }}>
              {c.value}
            </div>
            <div className="m-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="m-col" style={{ gap: 10 }}>
        <div className="m-sec-head">
          <div className="m-sec-title">{t('Hôm nay')}</div>
          <button type="button" className="m-link" onClick={onGoTimetable}>
            {t('Thời gian biểu')}
          </button>
        </div>
        {stats.today.length === 0 ? (
          <div className="m-list-card">
            <div className="m-empty" style={{ padding: '26px 20px' }}>
              {t('Chưa có mục nào đặt giờ cho hôm nay')}
            </div>
          </div>
        ) : (
          <div className="m-list-card">
            {stats.today.map((e) => (
              <button
                key={e.key}
                type="button"
                className="m-agenda-row"
                onClick={() => onOpenTask(e.openId)}
              >
                <span className="m-agenda-time m-num">{clock(e.start)}</span>
                <span
                  className="m-agenda-vein"
                  style={{ background: projectColor(projectOf(e.projectId)) }}
                />
                <span className="m-agenda-body">
                  <span className="m-agenda-title">
                    {e.isSubtask ? '↳ ' : ''}
                    {e.title}
                  </span>
                  <span className="m-agenda-meta">{projectName(e)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="m-col" style={{ gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="alert" size={16} style={{ color: 'var(--danger)' }} />
          <div className="m-sec-title">{t('Cần chú ý')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {t(`${attention.length} nhiệm vụ`)}
          </div>
        </div>
        {attention.length === 0 ? (
          <div className="m-empty" style={{ padding: '20px 0' }}>
            {t('Không có nhiệm vụ nào sắp trễ hạn')}
          </div>
        ) : (
          <div className="m-col" style={{ gap: 8 }}>
            {attention.map((task: TaskDTO) => (
              <button
                key={task.id}
                type="button"
                className="m-attention-row"
                onClick={() => onOpenTask(task.id)}
              >
                <span className="m-attention-body">
                  <span className="m-attention-title">{task.title}</span>
                  <span className="m-attention-sub">{projectName(task)}</span>
                </span>
                <DuePill task={task} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
