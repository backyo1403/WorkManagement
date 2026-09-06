'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ComposeSheet } from '@/components/mobile/ComposeSheet';
import { MobileCalendar } from '@/components/mobile/MobileCalendar';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import { MobileKanban } from '@/components/mobile/MobileKanban';
import { MobileNoteEditor } from '@/components/mobile/MobileNoteEditor';
import { MobileNotes } from '@/components/mobile/MobileNotes';
import { MobileNotifications } from '@/components/mobile/MobileNotifications';
import { MobileProjects } from '@/components/mobile/MobileProjects';
import { MobileSettings } from '@/components/mobile/MobileSettings';
import { MobileTasks } from '@/components/mobile/MobileTasks';
import { MobileTimetable } from '@/components/mobile/MobileTimetable';
import { TaskSheet } from '@/components/mobile/TaskSheet';
import { TobbyOrb } from '@/components/mobile/TobbyOrb';
import { groupAccent } from '@/components/mobile/parts';
import { initials } from '@/lib/domain';
import { WORK_GROUPS, type GroupKey } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

export type MobileScreen =
  | 'dashboard'
  | 'tasks'
  | 'kanban'
  | 'calendar'
  | 'timetable'
  | 'notes'
  | 'note'
  | 'projects'
  | 'settings'
  | 'notifications';

/**
 * Vietnamese is the source language everywhere, titles included — a hard-coded
 * "Dashboard" here is what put an English word in the Vietnamese UI.
 */
const TITLES: Record<MobileScreen, string> = {
  dashboard: 'Tổng quan',
  tasks: 'Nhiệm vụ',
  kanban: 'Tiến độ',
  calendar: 'Lịch',
  timetable: 'Thời gian biểu',
  notes: 'Ghi chú',
  note: 'Ghi chú',
  projects: 'Dự án',
  settings: 'Cài đặt',
  notifications: 'Thông báo',
};

/** The four tab destinations. Tobby sits in the middle cell, unlabelled. */
const TABS: Array<{ key: MobileScreen; label: string; icon: string }> = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { key: 'tasks', label: 'Công việc', icon: 'check' },
  { key: 'calendar', label: 'Lịch', icon: 'calendar' },
  { key: 'notes', label: 'Ghi chú', icon: 'edit' },
];

/** Which tab lights up for a screen that is not itself a tab. */
const TAB_OF: Partial<Record<MobileScreen, MobileScreen>> = {
  kanban: 'tasks',
  timetable: 'calendar',
  note: 'notes',
};

/** Screens reached by drilling in, which therefore need a way back. */
const BACK_TO: Partial<Record<MobileScreen, MobileScreen>> = {
  note: 'notes',
  projects: 'dashboard',
  settings: 'dashboard',
  notifications: 'dashboard',
};

const SEGMENTS: Partial<Record<MobileScreen, Array<[MobileScreen, string]>>> = {
  tasks: [
    ['tasks', 'Danh sách'],
    ['kanban', 'Tiến độ'],
  ],
  kanban: [
    ['tasks', 'Danh sách'],
    ['kanban', 'Tiến độ'],
  ],
  calendar: [
    ['calendar', 'Lịch tháng'],
    ['timetable', 'Theo giờ'],
  ],
  timetable: [
    ['calendar', 'Lịch tháng'],
    ['timetable', 'Theo giờ'],
  ],
};

/**
 * The phone layout: header, one screen, and a five-cell tab bar with Tobby in
 * the middle. Mounted by `AppShell` under 700px in place of the sidebar.
 *
 * The eleven sidebar entries do not fit a thumb, so they are cut to four tabs
 * plus an avatar menu, and the screen lives in this component's state rather
 * than the URL: tab switching is meant to be instant and to keep each screen's
 * own filters, which a route change would discard. The screens themselves read
 * the same `useData()` / `usePrefs()` stores and write through the same API
 * routes as their desktop counterparts — this is a different arrangement of the
 * app, not a second copy of it.
 */
export function MobileShell() {
  const { user, logout } = useAuth();
  const { notes } = useData();
  const { group, groupInfo, setGroup, clearGroup, t } = usePrefs();

  const [screen, setScreen] = useState<MobileScreen>('dashboard');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [groupMenu, setGroupMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // A new screen starts at the top; keeping the old offset lands the reader
  // halfway down a list they have not seen.
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [screen, noteId]);

  const go = (next: MobileScreen) => {
    setScreen(next);
    setGroupMenu(false);
    setMoreMenu(false);
    setComposeOpen(false);
  };

  const openNote = (id: string) => {
    setNoteId(id);
    go('note');
  };

  const activeTab = TAB_OF[screen] ?? screen;
  const segments = SEGMENTS[screen];
  const back = BACK_TO[screen];
  const accent = group ? groupAccent(group) : 'var(--brand)';
  // On the notes tab the same button captures a note instead of a task.
  const composeMode = activeTab === 'notes' ? 'note' : 'task';

  const screenBody = () => {
    switch (screen) {
      case 'tasks':
        return <MobileTasks onOpenTask={setTaskId} />;
      case 'kanban':
        return <MobileKanban onOpenTask={setTaskId} />;
      case 'calendar':
        return <MobileCalendar onOpenTask={setTaskId} />;
      case 'timetable':
        return <MobileTimetable onOpenTask={setTaskId} />;
      case 'notes':
        return <MobileNotes onOpenNote={openNote} />;
      case 'note':
        return noteId && notes.some((n) => n.id === noteId) ? (
          <MobileNoteEditor noteId={noteId} />
        ) : (
          <MobileNotes onOpenNote={openNote} />
        );
      case 'projects':
        return <MobileProjects />;
      case 'settings':
        return <MobileSettings />;
      case 'notifications':
        return <MobileNotifications onOpenTask={setTaskId} />;
      default:
        return (
          <MobileDashboard onOpenTask={setTaskId} onGoTimetable={() => go('timetable')} />
        );
    }
  };

  return (
    <div className="m-root">
      <div className="m-header">
        <div className="m-header-row">
          {back && (
            <button
              type="button"
              className="m-back-btn"
              aria-label={t('Quay lại')}
              onClick={() => go(back)}
            >
              <Icon name="chevron-left" size={16} />
            </button>
          )}

          <div className="m-title">{t(TITLES[screen])}</div>

          <button
            type="button"
            className="m-group-chip"
            style={{ color: accent }}
            onClick={() => {
              setGroupMenu((v) => !v);
              setMoreMenu(false);
            }}
          >
            <span className="m-dot" style={{ background: accent }} />
            <span>{(groupInfo?.name ?? t('Tất cả')).toUpperCase()}</span>
            <Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }} />
          </button>

          <button
            type="button"
            className="m-avatar-btn"
            aria-label={t('Menu tài khoản')}
            onClick={() => {
              setMoreMenu((v) => !v);
              setGroupMenu(false);
            }}
          >
            {user?.avatarUrl ? (
              // Data-URI upload; next/image would need a loader for no benefit.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} />
            ) : (
              initials(user?.name ?? '?')
            )}
          </button>
        </div>

        {segments && (
          <div className="m-seg">
            {segments.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={screen === key ? 'on' : ''}
                onClick={() => go(key)}
              >
                {t(label)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={contentRef} className="m-content m-scroller">
        {screenBody()}
      </div>

      <div className="m-tabbar">
        {TABS.slice(0, 2).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`m-tab${activeTab === tab.key ? ' on' : ''}`}
            onClick={() => go(tab.key)}
          >
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.label)}</span>
          </button>
        ))}

        <button
          type="button"
          className="m-tab-tobby"
          aria-label={composeMode === 'note' ? t('Ghi chú mới') : t('Hôm nay cần làm gì?')}
          onClick={() => setComposeOpen(true)}
        >
          <TobbyOrb />
        </button>

        {TABS.slice(2).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`m-tab${activeTab === tab.key ? ' on' : ''}`}
            onClick={() => go(tab.key)}
          >
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.label)}</span>
          </button>
        ))}
      </div>

      {taskId && <TaskSheet taskId={taskId} onClose={() => setTaskId(null)} />}

      {composeOpen && (
        <ComposeSheet
          mode={composeMode}
          onClose={() => setComposeOpen(false)}
          onNoteCreated={(id) => {
            setComposeOpen(false);
            openNote(id);
          }}
        />
      )}

      {groupMenu && (
        <div className="m-pop-layer">
          <button
            type="button"
            className="m-pop-scrim"
            aria-label={t('Đóng')}
            onClick={() => setGroupMenu(false)}
          />
          <div className="m-pop groups">
            <button
              type="button"
              className={group ? '' : 'on'}
              onClick={() => {
                clearGroup();
                setGroupMenu(false);
              }}
            >
              <span className="m-dot" style={{ width: 9, height: 9, background: 'var(--brand)' }} />
              <span className="m-pop-label">{t('Tất cả nhóm')}</span>
              {!group && <Icon name="tick" size={15} style={{ color: 'var(--brand)' }} />}
            </button>
            {WORK_GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                className={group === g.key ? 'on' : ''}
                onClick={() => {
                  // `setGroup` clears the filter when the active group is
                  // re-picked; the menu should not close on a no-op re-select.
                  setGroup(g.key as GroupKey);
                  setGroupMenu(false);
                }}
              >
                <span
                  className="m-dot"
                  style={{ width: 9, height: 9, background: groupAccent(g.key) }}
                />
                <span className="m-pop-label">{g.name}</span>
                {group === g.key && (
                  <Icon name="tick" size={15} style={{ color: 'var(--brand)' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {moreMenu && (
        <div className="m-pop-layer">
          <button
            type="button"
            className="m-pop-scrim"
            aria-label={t('Đóng')}
            onClick={() => setMoreMenu(false)}
          />
          <div className="m-pop more">
            {(
              [
                ['projects', 'Dự án', 'folder'],
                ['settings', 'Cài đặt', 'settings'],
                ['notifications', 'Thông báo', 'bell'],
              ] as Array<[MobileScreen, string, string]>
            ).map(([key, label, icon]) => (
              <button key={key} type="button" onClick={() => go(key)}>
                <Icon name={icon} size={17} style={{ color: 'var(--text-2)' }} />
                <span className="m-pop-label">{t(label)}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMoreMenu(false);
                if (confirm('Đăng xuất khỏi Bach Office?')) logout();
              }}
            >
              <Icon name="power" size={17} style={{ color: 'var(--danger)' }} />
              <span className="m-pop-label" style={{ color: 'var(--danger)' }}>
                {t('Đăng xuất')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
