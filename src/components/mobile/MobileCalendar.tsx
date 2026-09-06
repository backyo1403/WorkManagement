'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { clock, dowHeads, groupAccent, longDate, projectColor } from './parts';
import { addDays, eventRange, isEvent, isSameDay, startOfDay, startOfWeek } from '@/lib/domain';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

/** How far a single event may be spread across the grid. Two months is plenty. */
const SPAN_LIMIT_DAYS = 62;

/**
 * Lịch tháng — a month of dates, then the agenda for the day tapped.
 *
 * Tasks are placed by deadline, like the desktop calendar, so both views answer
 * the same question about the same date. Events are placed by the span they
 * occupy instead, since that is the whole difference between the two.
 */
export function MobileCalendar({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { tasks, projects } = useData();
  const { group, lang, t } = usePrefs();

  const [month, setMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));

  const dated = useMemo(
    () =>
      tasks.filter(
        (x) => !x.archived && (x.deadline || isEvent(x)) && (!group || x.groupKey === group),
      ),
    [tasks, group],
  );

  /**
   * Tasks keyed by the local day they belong to.
   *
   * A task sits on the day it is due. An event sits on every day it spans — a
   * two-day site visit is on the calendar twice, because that is what someone
   * looking at either day needs to see.
   */
  const byDay = useMemo(() => {
    const map = new Map<string, typeof dated>();
    const add = (day: Date, task: (typeof dated)[number]) => {
      const k = day.toDateString();
      map.set(k, [...(map.get(k) ?? []), task]);
    };

    dated.forEach((x) => {
      if (isEvent(x)) {
        const range = eventRange(x);
        if (!range) return;
        // Walk the span day by day, capped so a mistyped year cannot spin here.
        let cursor = startOfDay(range.start);
        for (let i = 0; i < SPAN_LIMIT_DAYS && cursor < range.end; i++) {
          add(cursor, x);
          cursor = addDays(cursor, 1);
        }
        return;
      }
      add(new Date(x.deadline!), x);
    });
    return map;
  }, [dated]);

  // Six full weeks from the Monday on or before the 1st — a fixed grid never
  // reflows the agenda below it when the month changes.
  const cells = useMemo(() => {
    const first = startOfWeek(month);
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  /** The o'clock a row is filed under: an event's start, a task's deadline. */
  const timeOf = (x: (typeof dated)[number]) =>
    isEvent(x) ? x.start ?? x.deadline : x.deadline;

  const agenda = useMemo(
    () =>
      (byDay.get(day.toDateString()) ?? [])
        .slice()
        .sort((a, b) => +new Date(timeOf(a) ?? 0) - +new Date(timeOf(b) ?? 0)),
    [byDay, day],
  );

  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const projectOf = (id: string | null) => projects.find((p) => p.id === id) ?? null;

  return (
    <div className="m-page" style={{ gap: 16, paddingTop: 8 }}>
      <div className="m-col m-pad" style={{ gap: 10 }}>
        <div className="m-cal-head">
          <div className="m-cal-month">
            {t(`Tháng ${month.getMonth() + 1}, ${month.getFullYear()}`)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="m-icon-btn"
              aria-label={t('Tháng trước')}
              onClick={() => shift(-1)}
            >
              <Icon name="chevron-left" size={15} />
            </button>
            <button
              type="button"
              className="m-icon-btn"
              aria-label={t('Tháng sau')}
              onClick={() => shift(1)}
            >
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </div>

        <div className="m-cal-grid">
          {dowHeads(lang).map((d) => (
            <div key={d} className="m-cal-dow">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const outside = d.getMonth() !== month.getMonth();
            const selected = isSameDay(d, day);
            const rows = byDay.get(d.toDateString()) ?? [];
            return (
              <button
                key={d.toISOString()}
                type="button"
                className={`m-cal-cell${outside ? ' out' : ''}${selected ? ' on' : ''}`}
                onClick={() => {
                  setDay(startOfDay(d));
                  if (outside) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                <span className="m-cal-day">{d.getDate()}</span>
                <span className="m-cal-dots">
                  {rows.slice(0, 3).map((x) => (
                    <i
                      key={x.id}
                      style={{
                        background: selected
                          ? 'var(--on-brand)'
                          : projectOf(x.projectId)?.color ?? groupAccent(x.groupKey),
                      }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="m-col" style={{ gap: 10 }}>
        <div className="m-pad m-sec-title">{longDate(day, lang)}</div>
        {agenda.length === 0 ? (
          <div className="m-empty">{t('Không có hạn chót nào trong ngày này')}</div>
        ) : (
          <div className="m-col m-pad" style={{ gap: 9 }}>
            {agenda.map((task) => {
              const project = projectOf(task.projectId);
              const at = timeOf(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  className="m-attention-row"
                  style={{ gap: 12 }}
                  onClick={() => onOpenTask(task.id)}
                >
                  <span
                    className="m-agenda-time m-num"
                    style={{
                      width: 44,
                      alignSelf: 'center',
                      color: isEvent(task) ? 'var(--purple)' : undefined,
                    }}
                  >
                    {at ? clock(at) : '—'}
                  </span>
                  <span className="m-agenda-body">
                    <span className="m-kb-title">{task.title}</span>
                    <span className="m-agenda-meta">
                      {isEvent(task) ? `${t('Sự kiện')} · ` : ''}
                      {project?.name ?? t('Không thuộc dự án')}
                    </span>
                  </span>
                  <span
                    className="m-agenda-vein"
                    style={{ height: 34, background: projectColor(project) }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
