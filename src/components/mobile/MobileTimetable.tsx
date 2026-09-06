'use client';

import { useMemo, useState } from 'react';
import { clock, dowShort, longDate, projectColor, tint } from './parts';
import { addDays, isSameDay, startOfWeek } from '@/lib/domain';
import { TT_END_HOUR, TT_START_HOUR, timetableEntries } from '@/lib/timetable';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Theo giờ — the timetable, one day at a time.
 *
 * The desktop view lays seven days side by side and needs the lane-packing in
 * `layoutLanes`. A phone shows a single day, so blocks simply stack inside the
 * hour they start in and the window stays `TT_START_HOUR`–`TT_END_HOUR`.
 */
export function MobileTimetable({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { tasks, projects, people } = useData();
  const { group, lang, t } = usePrefs();
  const [day, setDay] = useState<Date>(() => new Date());

  const week = useMemo(() => {
    const start = startOfWeek(day);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [day]);

  const entries = useMemo(() => {
    const scoped = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));
    return timetableEntries(scoped)
      .filter((e) => isSameDay(e.start, day))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [tasks, group, day]);

  const hours = useMemo(() => {
    const rows: Array<{ hour: number; blocks: typeof entries }> = [];
    for (let h = TT_START_HOUR; h < TT_END_HOUR; h++) {
      rows.push({ hour: h, blocks: entries.filter((e) => new Date(e.start).getHours() === h) });
    }
    return rows;
  }, [entries]);

  const endLabel = (start: string, estimateHours: number) => {
    const end = new Date(new Date(start).getTime() + Math.max(0.5, estimateHours || 1) * 3600000);
    return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  return (
    <div className="m-page" style={{ gap: 12, paddingTop: 8 }}>
      <div className="m-week m-pad">
        {week.map((d) => {
          const on = isSameDay(d, day);
          return (
            <button
              key={d.toDateString()}
              type="button"
              className={`m-day${on ? ' on' : ''}`}
              onClick={() => setDay(d)}
            >
              <span className="m-day-dow">{dowShort(lang)[d.getDay()]}</span>
              <span className="m-day-num m-num">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="m-meta-row" style={{ padding: '0 18px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {t(`${entries.length} công việc`)} · {longDate(day, lang)}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
          {t(`Khung giờ ${pad(TT_START_HOUR)}:00 – ${pad(TT_END_HOUR)}:00`)}
        </div>
      </div>

      <div className="m-col m-pad">
        {hours.map((row) => (
          <div key={row.hour} className="m-hour">
            <div className="m-hour-label m-num">{pad(row.hour)}:00</div>
            <div className="m-hour-body">
              {row.blocks.map((e) => {
                const project = projects.find((p) => p.id === e.projectId) ?? null;
                const color = projectColor(project);
                const owner = people.find((p) => p.id === e.peopleIds[0]) ?? null;
                return (
                  <button
                    key={e.key}
                    type="button"
                    className="m-block"
                    style={{
                      background: tint(color, '22', 13),
                      borderLeftColor: color,
                    }}
                    onClick={() => onOpenTask(e.openId)}
                  >
                    <span className="m-block-title">
                      {e.isSubtask ? '↳ ' : ''}
                      {e.title}
                    </span>
                    <span className="m-block-meta m-num">
                      {clock(e.start)} › {endLabel(e.start, e.estimateHours)} ·{' '}
                      {project?.name ?? owner?.name ?? t('Không thuộc dự án')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
