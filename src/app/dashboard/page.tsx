'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Modal, PageHeader, PriorityPill } from '@/components/ui/primitives';
import { SearchBox } from '@/components/ui/SearchBox';
import { computeNotifications } from '@/components/shell/AppShell';
import { TaskModal } from '@/components/task/TaskModal';
import {
  DashClock,
  WgAttention,
  WgBar7,
  WgByGroup,
  WgDonut,
  WgMonthCal,
  WgRecentNotes,
  WgStats,
  WgTimetableToday,
  WgTrend30,
  statusCounts,
  useScopedTasks,
} from '@/components/dashboard/widgets';
import { dayPart, locale } from '@/lib/domain';
import type { DashWidgetLayout } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

interface WidgetDef {
  title: string;
  icon: string;
  /** Bare widgets render their own container instead of a titled card. */
  bare?: boolean;
  render: (ctx: { openTask: (id: string) => void; openDay: (ymd: string) => void }) => React.ReactNode;
}

const WIDGETS: Record<string, WidgetDef> = {
  stats: { title: 'Tổng quan nhanh', icon: 'chart', bare: true, render: () => <WgStats /> },
  bar7: { title: 'Nhiệm vụ 7 ngày qua', icon: 'chart', render: () => <WgBar7 /> },
  donut: { title: 'Phân bổ trạng thái', icon: 'pie', render: () => <WgDonut /> },
  trend30: { title: 'Xu hướng 30 ngày', icon: 'activity', render: () => <WgTrend30 /> },
  bygroup: { title: 'Theo nhóm công việc', icon: 'briefcase', render: () => <WgByGroup /> },
  monthcal: {
    title: 'Lịch tháng',
    icon: 'calendar',
    render: ({ openDay }) => <WgMonthCal onOpenDay={openDay} />,
  },
  timetable: {
    title: 'Thời gian biểu hôm nay',
    icon: 'clock',
    render: ({ openTask }) => <WgTimetableToday onOpen={openTask} />,
  },
  attention: {
    title: 'Nhiệm vụ cần chú ý',
    icon: 'alert',
    render: ({ openTask }) => <WgAttention onOpen={openTask} />,
  },
  notes: { title: 'Ghi chú gần đây', icon: 'edit', render: () => <WgRecentNotes /> },
};

const DEFAULT_LAYOUT: DashWidgetLayout[] = [
  { id: 'stats', w: 12, h: 0 },
  { id: 'bar7', w: 6, h: 300 },
  { id: 'donut', w: 6, h: 300 },
  { id: 'monthcal', w: 6, h: 340 },
  { id: 'timetable', w: 6, h: 340 },
  { id: 'notes', w: 6, h: 300 },
  { id: 'trend30', w: 6, h: 300 },
  { id: 'bygroup', w: 6, h: 290 },
  { id: 'attention', w: 6, h: 290 },
];

export default function DashboardPage() {
  const { settings, saveSettings, projects, people, tasks } = useData();
  const { group, lang, t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const scoped = useScopedTasks();
  const counts = statusCounts(scoped);

  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<string | null>(null);

  /**
   * The stored layout is the source of truth, but it is repaired on read:
   * unknown ids are dropped and any widget that is neither placed nor hidden is
   * appended, so a new widget shows up without a migration.
   */
  const layout = useMemo<DashWidgetLayout[]>(() => {
    const hidden = settings.dashboardHidden;
    const stored = settings.dashboardLayout.length ? settings.dashboardLayout : DEFAULT_LAYOUT;
    const out = stored.filter((w) => WIDGETS[w.id] && !hidden.includes(w.id));
    Object.keys(WIDGETS).forEach((id) => {
      if (hidden.includes(id) || out.some((w) => w.id === id)) return;
      out.push(DEFAULT_LAYOUT.find((d) => d.id === id) ?? { id, w: 6, h: 280 });
    });
    return out;
  }, [settings.dashboardLayout, settings.dashboardHidden]);

  const persistLayout = (next: DashWidgetLayout[], hidden = settings.dashboardHidden) =>
    void saveSettings({ dashboardLayout: next, dashboardHidden: hidden });

  const hideWidget = (id: string) =>
    persistLayout(layout.filter((w) => w.id !== id), [...settings.dashboardHidden, id]);

  const showWidget = (id: string) =>
    persistLayout(layout, settings.dashboardHidden.filter((x) => x !== id));

  const reorder = (from: string, to: string) => {
    if (from === to) return;
    const next = [...layout];
    const fromIdx = next.findIndex((w) => w.id === from);
    const toIdx = next.findIndex((w) => w.id === to);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistLayout(next);
  };

  /** Drag the corner grip: snap the widget's span to whole grid columns. */
  const startResize = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = (e.currentTarget as HTMLElement).closest('.dash-grid') as HTMLElement | null;
    if (!grid) return;
    const colWidth = grid.clientWidth / 12;
    const startX = e.clientX;
    const startW = layout.find((w) => w.id === id)?.w ?? 6;
    let finalW = startW;

    const onMove = (ev: MouseEvent) => {
      const cols = Math.round((ev.clientX - startX) / colWidth);
      finalW = Math.max(3, Math.min(12, startW + cols));
      const el = grid.querySelector<HTMLElement>(`[data-widget="${id}"]`);
      if (el) el.style.gridColumn = `span ${finalW}`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (finalW !== startW) {
        persistLayout(layout.map((w) => (w.id === id ? { ...w, w: finalW } : w)));
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const notifCount = computeNotifications(tasks, group).length;

  const dayTasks = dayModal
    ? scoped
        .filter(
          (x) =>
            x.deadline &&
            new Date(x.deadline).toDateString() === new Date(`${dayModal}T00:00:00`).toDateString(),
        )
        .sort((a, b) => +new Date(a.deadline!) - +new Date(b.deadline!))
    : [];

  const ctx = { openTask: setTaskModal, openDay: setDayModal };

  return (
    <div className="view-enter">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <SearchBox onOpenTask={setTaskModal} />
            <div className="topbar-icons">
              <DashClock />
              <button
                type="button"
                className="icon-circle-btn"
                title={t('Thông báo')}
                onClick={() => router.push('/notifications')}
              >
                <Icon name="bell" size={15} />
                {notifCount > 0 && <span className="dot-badge" />}
              </button>
              <Avatar person={user} size={34} />
            </div>
          </>
        }
      />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800 }}>
            {t(`Chào buổi ${dayPart()}, ${user?.name ?? settings.companyName} 👋`)}
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 12.5, marginTop: 3 }}>
            {t(`${scoped.length} đang thực hiện · ${counts.done} đã hoàn thành`)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn ${editMode ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setEditMode((v) => !v)}
          >
            <Icon name={editMode ? 'check' : 'dashboard'} size={14} />
            {t(editMode ? 'Xong' : 'Sắp xếp ô')}
          </button>
          {editMode && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                persistLayout(DEFAULT_LAYOUT, []);
                toast('Đã khôi phục bố cục mặc định');
              }}
            >
              <Icon name="refresh" size={14} /> {t('Bố cục mặc định')}
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="badge today" style={{ display: 'block', padding: '9px 12px', marginBottom: 12 }}>
          🎛️ Chế độ sắp xếp: kéo tiêu đề ô để đổi vị trí · kéo góc dưới-phải để đổi kích thước · bấm ✕ để ẩn ô
        </div>
      )}

      <div className={`dash-grid${editMode ? ' editing' : ''}`}>
        {layout.map((w) => {
          const def = WIDGETS[w.id];
          if (!def) return null;
          const body = def.render(ctx);

          return (
            <div
              key={w.id}
              className={[
                'dash-widget',
                dragId === w.id ? 'dragging' : '',
                dropId === w.id ? 'drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-widget={w.id}
              draggable={editMode}
              style={{
                gridColumn: `span ${w.w}`,
                height: def.bare && w.h ? w.h : undefined,
              }}
              onDragStart={() => setDragId(w.id)}
              onDragEnd={() => {
                setDragId(null);
                setDropId(null);
              }}
              onDragOver={(e) => {
                if (!editMode || !dragId) return;
                e.preventDefault();
                setDropId(w.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) reorder(dragId, w.id);
                setDragId(null);
                setDropId(null);
              }}
            >
              {editMode && (
                <div className="dash-handle">
                  <span>
                    ⠿ <Icon name={def.icon} size={13} /> {t(def.title)}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10.5 }}>{w.w}/12</span>
                  <button type="button" className="dash-hide" title="Ẩn ô" onClick={() => hideWidget(w.id)}>
                    ✕
                  </button>
                </div>
              )}

              {def.bare ? (
                body
              ) : (
                <div className="card dash-card" style={w.h ? { height: w.h } : undefined}>
                  <h3>
                    <span>
                      <Icon name={def.icon} size={15} /> {t(def.title)}
                    </span>
                  </h3>
                  <div className="dash-card-body">{body}</div>
                </div>
              )}

              {editMode && (
                <div
                  className="dash-resize"
                  title="Kéo để đổi kích thước"
                  onMouseDown={(e) => startResize(e, w.id)}
                />
              )}
            </div>
          );
        })}
      </div>

      {editMode && settings.dashboardHidden.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3>
            <span>
              <Icon name="plus" size={15} /> {t('Ô đã ẩn')}{' '}
              <span style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('bấm để hiện lại')}
              </span>
            </span>
          </h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {settings.dashboardHidden
              .filter((id) => WIDGETS[id])
              .map((id) => (
                <button key={id} type="button" className="pill-toggle" onClick={() => showWidget(id)}>
                  <Icon name={WIDGETS[id].icon} size={13} /> {t(WIDGETS[id].title)}
                </button>
              ))}
          </div>
        </div>
      )}

      {dayModal && (
        <Modal
          icon="calendar"
          title={`Thời khoá biểu ${new Date(`${dayModal}T00:00:00`).toLocaleDateString(locale(lang), {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
          })}`}
          onClose={() => setDayModal(null)}
        >
          {dayTasks.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayTasks.map((x) => {
                const assignee = people.find((p) => p.id === x.assigneeId) ?? null;
                const proj = projects.find((p) => p.id === x.projectId) ?? null;
                return (
                  <div
                    className="task-row"
                    key={x.id}
                    onClick={() => {
                      setDayModal(null);
                      setTaskModal(x.id);
                    }}
                  >
                    <span style={{ fontWeight: 750, fontSize: 12.5, color: 'var(--brand)', width: 50, flexShrink: 0 }}>
                      {new Date(x.deadline!).toLocaleTimeString(locale(lang), {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <PriorityPill priority={x.priority} />
                    <span className={`task-title${x.status === 'DONE' ? ' done' : ''}`}>{x.title}</span>
                    <span className="task-meta">
                      {proj && (
                        <span className="badge" style={{ background: `${proj.color}1A`, color: proj.color }}>
                          {proj.name}
                        </span>
                      )}
                      {assignee && <Avatar person={assignee} size={24} />}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="calendar">{t('Không có nhiệm vụ nào đến hạn trong ngày này')}</EmptyState>
          )}
        </Modal>
      )}

      {taskModal && <TaskModal taskId={taskModal} onClose={() => setTaskModal(null)} />}
    </div>
  );
}
