'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, PageHeader } from '@/components/ui/primitives';
import { TaskHoverCard } from '@/components/task/TaskHoverCard';
import { TaskModal } from '@/components/task/TaskModal';
import { addDays, fmtHM, locale, startOfDay, ymdLocal } from '@/lib/domain';
import { PRIORITY_COLOR, type PersonDTO } from '@/lib/types';
import {
  TT_END_HOUR,
  TT_HOUR_H,
  TT_START_HOUR,
  layoutLanes,
  timetableEntries,
  type Placed,
} from '@/lib/timetable';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function TimetablePage() {
  const { tasks, projects, people } = useData();
  const { group, lang, t } = usePrefs();
  const toast = useToast();

  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState<{ id: string | null; start?: string } | null>(null);

  const hours = Array.from({ length: TT_END_HOUR - TT_START_HOUR + 1 }, (_, i) => TT_START_HOUR + i);
  const now = new Date();

  const days = useMemo(() => {
    if (mode === 'day') return [addDays(startOfDay(now), offset)];
    const base = addDays(startOfDay(now), offset * 7 - now.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
    // `now` is stable enough within a render; offset/mode drive the recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, offset]);

  const entries = useMemo(
    () => timetableEntries(tasks.filter((x) => !x.archived && (!group || x.groupKey === group))),
    [tasks, group],
  );

  const entriesFor = (d: Date) =>
    entries.filter((e) => new Date(e.start).toDateString() === d.toDateString());

  const label =
    mode === 'day'
      ? days[0].toLocaleDateString(locale(lang), {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : `${days[0].toLocaleDateString(locale(lang), { day: '2-digit', month: '2-digit' })} – ${days[6].toLocaleDateString(locale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  const total = days.reduce((n, d) => n + entriesFor(d).length, 0);
  const nowTop = (now.getHours() + now.getMinutes() / 60 - TT_START_HOUR) * TT_HOUR_H;
  const showNowLine =
    days.some((d) => d.toDateString() === now.toDateString()) &&
    now.getHours() >= TT_START_HOUR &&
    now.getHours() <= TT_END_HOUR;

  /** Clicking a day header in week view drills into that single day. */
  const jumpToDay = (d: Date) => {
    setMode('day');
    setOffset(Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000));
    toast(d.toLocaleDateString(locale(lang), { weekday: 'long', day: '2-digit', month: '2-digit' }));
  };

  return (
    <div className="view-enter">
      <PageHeader
        title="Thời gian biểu"
        icon="clock"
        sub='Công việc xếp theo giờ — đặt "Bắt đầu" để việc hiện ở đây'
        actions={
          <>
            <div className="pill-toggle-row">
              <button
                type="button"
                className={`pill-toggle${mode === 'day' ? ' active' : ''}`}
                onClick={() => {
                  setMode('day');
                  setOffset(0);
                }}
              >
                {t('Ngày')}
              </button>
              <button
                type="button"
                className={`pill-toggle${mode === 'week' ? ' active' : ''}`}
                onClick={() => {
                  setMode('week');
                  setOffset(0);
                }}
              >
                {t('Tuần')}
              </button>
            </div>
            <button type="button" className="btn-icon" onClick={() => setOffset((o) => o - 1)}>
              <Icon name="chevron-left" size={15} />
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>
              📍 {t('Hôm nay')}
            </button>
            <button type="button" className="btn-icon" onClick={() => setOffset((o) => o + 1)}>
              <Icon name="chevron" size={15} />
            </button>
          </>
        }
      />

      <div
        className="card"
        style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
      >
        <b style={{ fontSize: 15, textTransform: 'capitalize' }}>{label}</b>
        <span className="badge">{t(`${total} công việc`)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>
          {t(`Khung giờ ${TT_START_HOUR}:00 – ${TT_END_HOUR}:00`)}
        </span>
      </div>

      <div className="tt-wrap">
        <div className="tt-headrow">
          <div className="tt-corner" />
          {days.map((d) => {
            const isToday = d.toDateString() === now.toDateString();
            const n = entriesFor(d).length;
            return (
              <div
                key={ymdLocal(d)}
                className={`tt-dayhead${isToday ? ' today' : ''}`}
                onClick={() => jumpToDay(d)}
              >
                <div className="tt-dayname">{d.toLocaleDateString(locale(lang), { weekday: 'long' })}</div>
                <div className="tt-daydate">
                  {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.
                  {d.getFullYear()}
                </div>
                {n > 0 && <span className="tt-day-badge">{n}</span>}
              </div>
            );
          })}
        </div>

        <div className="tt-body" style={{ height: hours.length * TT_HOUR_H }}>
          <div className="tt-hours">
            {hours.map((h) => (
              <div className="tt-hourlabel" key={h} style={{ height: TT_HOUR_H }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((d) => {
            const isToday = d.toDateString() === now.toDateString();
            return (
              <div className={`tt-daycol${isToday ? ' is-today' : ''}`} key={ymdLocal(d)}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="tt-hourcell"
                    style={{ height: TT_HOUR_H }}
                    title={`Bấm để thêm việc lúc ${String(h).padStart(2, '0')}:00`}
                    onClick={() => {
                      const when = new Date(`${ymdLocal(d)}T${String(h).padStart(2, '0')}:00:00`);
                      setModal({ id: null, start: when.toISOString() });
                    }}
                  />
                ))}

                {layoutLanes(entriesFor(d)).map((item) => (
                  <TimetableBlock
                    key={item.key}
                    item={item}
                    people={people}
                    projectColor={projects.find((p) => p.id === item.projectId)?.color ?? null}
                    onOpen={() => setModal({ id: item.openId })}
                  />
                ))}
              </div>
            );
          })}

          {showNowLine && (
            <div className="tt-nowline" style={{ top: nowTop }}>
              <span className="tt-now-dot" />
              <span className="tt-now-time">{fmtHM(now.toISOString())}</span>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <TaskModal
          taskId={modal.id}
          prefill={modal.start ? { start: modal.start, deadline: modal.start } : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/**
 * One card on the grid: solid fill tinted by project (priority as a fallback),
 * an overlapping avatar stack with a count, and a progress bar pinned flush to
 * the bottom edge. A card that is happening right now shows the time left and
 * fills its bar with elapsed time instead of completion.
 */
function TimetableBlock({
  item,
  people,
  projectColor,
  onOpen,
}: {
  item: Placed;
  people: PersonDTO[];
  projectColor: string | null;
  onOpen: () => void;
}) {
  const s = new Date(item.start);
  const top = (item.startH - TT_START_HOUR) * TT_HOUR_H;
  const height = Math.max(24, (item.endH - item.startH) * TT_HOUR_H - 4);
  const widthPct = 100 / item.lanes;
  const leftPct = item.lane * widthPct;
  const tint = projectColor ?? PRIORITY_COLOR[item.priority];

  const end = new Date(s.getTime() + (item.endH - item.startH) * 3600000);
  const now = new Date();
  const running = now >= s && now <= end && !item.done;
  const leftMin = running ? Math.max(1, Math.round((+end - +now) / 60000)) : 0;
  const elapsedPct = running ? Math.min(100, Math.max(0, ((+now - +s) / (+end - +s)) * 100)) : 0;

  const compact = height < 52 || item.lanes >= 3;
  const stack = item.peopleIds.map((id) => people.find((p) => p.id === id)).filter(Boolean).slice(0, 3);
  const chipIcon = item.isSubtask ? 'check' : projectColor ? 'folder' : 'clock';

  return (
    <div
      className={[
        'task-row-wrap tt-block',
        item.isSubtask ? 'is-sub' : '',
        running ? 'running' : '',
        item.done ? 'is-done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        ['--tint' as string]: tint,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <div className="tt-head">
        <span className="tt-head-ico">
          <Icon name={chipIcon} size={13} />
        </span>
        {stack.length > 0 && (
          <span className="tt-avatars">
            {stack.map((p) => (
              <Avatar key={p!.id} person={p!} size={17} />
            ))}
          </span>
        )}
        {item.peopleIds.length > 0 && <span className="tt-count">{item.peopleIds.length}</span>}
      </div>

      {/* `tt-card-body`, not `tt-body` — the latter is the scrolling day grid. */}
      <div className="tt-card-body">
        <span className={`tt-block-title${item.done ? ' done' : ''}`}>
          {item.isSubtask ? '↳ ' : ''}
          {item.title}
        </span>
        {!compact && (
          <span className="tt-time">
            {fmtHM(s.toISOString())} <i>›</i> {fmtHM(end.toISOString())}
          </span>
        )}
      </div>

      {running && <span className="tt-left-label">Còn {leftMin}m</span>}
      <div className="tt-progress">
        <i style={{ width: `${running ? elapsedPct : item.completion}%` }} />
      </div>

      {item.task && <TaskHoverCard task={item.task} full />}
    </div>
  );
}
