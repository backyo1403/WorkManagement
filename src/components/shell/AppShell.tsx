'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/primitives';
import { LoginScreen } from './LoginScreen';
import { QuickComposer } from './QuickComposer';
import { isOverdue, isSameDay } from '@/lib/domain';
import { WORK_GROUPS, type TaskDTO } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';

const NAV_GROUPS = [
  { label: 'Tổng quan', items: [{ href: '/dashboard', ico: 'dashboard', label: 'Dashboard' }] },
  {
    label: 'Quản lý',
    items: [
      { href: '/people', ico: 'people', label: 'Người thực hiện' },
      { href: '/workflows', ico: 'workflow', label: 'Workflow' },
    ],
  },
  {
    label: 'Công việc',
    items: [
      { href: '/projects', ico: 'folder', label: 'Dự án' },
      { href: '/tasks', ico: 'check', label: 'Nhiệm vụ' },
      { href: '/kanban', ico: 'board', label: 'Tiến độ' },
      { href: '/timetable', ico: 'clock', label: 'Thời gian biểu' },
      { href: '/calendar', ico: 'calendar', label: 'Lịch' },
      { href: '/gantt', ico: 'gantt', label: 'Sơ đồ Gantt' },
    ],
  },
  {
    // One entry, not the full six-view list: the sidebar already carries
    // eleven items and doubles as the mobile bottom bar. The views live in the
    // notes module's own rail instead.
    label: 'Ghi chú',
    items: [{ href: '/notes', ico: 'edit', label: 'Ghi chú' }],
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/notifications', ico: 'bell', label: 'Thông báo' },
      { href: '/settings', ico: 'settings', label: 'Cài đặt' },
    ],
  },
];

/** Overdue or due-today tasks in the active group, soonest first. */
export function computeNotifications(tasks: TaskDTO[], group: string) {
  return tasks
    .filter((t) => !t.archived && t.status !== 'DONE' && (!group || t.groupKey === group))
    .filter((t) => isOverdue(t) || isSameDay(t.deadline))
    .map((t) => ({
      id: t.id,
      type: isOverdue(t) ? ('overdue' as const) : ('today' as const),
      task: t,
      at: t.deadline!,
    }))
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const { tasks, settings, loading } = useData();
  const { theme, toggleTheme, group, groupInfo, setGroup, clearGroup, t } = usePrefs();
  const pathname = usePathname();

  const [arcOpen, setArcOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const notifCount = useMemo(() => computeNotifications(tasks, group).length, [tasks, group]);

  const closeAll = () => {
    setArcOpen(false);
    setComposerOpen(false);
  };

  /**
   * Click anywhere outside, or Esc, dismisses the radial menu and composer.
   *
   * The check is by containment rather than by stopping propagation inside the
   * panels: React attaches its listeners to the same root node this one is on,
   * so `stopPropagation` in a React handler would not stop this listener from
   * firing — and every click inside the composer would close it, including the
   * one on "Create task".
   */
  useEffect(() => {
    if (!arcOpen && !composerOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dockRef.current?.contains(target) || popRef.current?.contains(target)) return;
      closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [arcOpen, composerOpen]);

  if (!ready || loading) {
    return (
      <div id="app">
        <div className="main">
          <div className="view">
            <div className="empty-state">Đang tải…</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <>
      <div id="app">
        <div className="sidebar">
          <div className="brand">
            <div className="brand-mark">📘</div>
            <div>
              <div className="brand-name">{settings.companyName}</div>
              <div className="brand-sub">{t(settings.companyTagline)}</div>
            </div>
            <button
              type="button"
              className="theme-toggle"
              title={t('Đổi giao diện sáng/tối')}
              onClick={toggleTheme}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
            </button>
          </div>

          {groupInfo && (
            <div className="group-chip" title="Đang lọc theo nhóm">
              <span>{groupInfo.icon}</span>
              <span>{groupInfo.name.toUpperCase()}</span>
              <button type="button" onClick={clearGroup} title="Xem tất cả nhóm">
                ✕
              </button>
            </div>
          )}

          {/* Fragments, not wrapper elements: on mobile the sidebar becomes a
              single flex row and every nav item must be a direct child of it. */}
          {NAV_GROUPS.map((g) => (
            <Fragment key={g.label}>
              <div className="nav-group-label">{t(g.label)}</div>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`nav-item${pathname.startsWith(it.href) ? ' active' : ''}`}
                >
                  <span className="dot">
                    <Icon name={it.ico} size={17} />
                  </span>
                  <span>{t(it.label)}</span>
                  {it.href === '/notifications' && notifCount > 0 && (
                    <span className="nav-badge">{notifCount}</span>
                  )}
                </Link>
              ))}
            </Fragment>
          ))}

          <div className="sidebar-user">
            <Avatar person={user} size={32} />
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{t(user.role === 'OWNER' ? 'Chủ sở hữu' : user.role === 'LEAD' ? 'Trưởng nhóm' : 'Người thực hiện')}</div>
            </div>
            <button
              type="button"
              className="sidebar-logout"
              title={t('Đăng xuất')}
              onClick={() => {
                if (confirm('Đăng xuất khỏi Bach Office?')) logout();
              }}
            >
              <Icon name="power" size={14} />
            </button>
          </div>
        </div>

        <div className="main">
          <div className="view">{children}</div>
        </div>

        {/* Floating ⋯ dock: quick capture plus the radial work-group picker. */}
        <div ref={dockRef} className={`fab-dock${arcOpen ? ' open' : ''}`}>
          <div className="fab-arc" aria-hidden={!arcOpen}>
            <button
              type="button"
              className="fab-orb orb-today"
              data-orb="today"
              style={{ ['--i' as string]: 0 }}
              title="Hôm nay làm gì"
              onClick={() => {
                setArcOpen(false);
                setComposerOpen(true);
              }}
            >
              <span className="orb-icon">
                <Icon name="plus" size={19} />
              </span>
              <span className="orb-label">{t('Hôm nay')}</span>
            </button>

            {WORK_GROUPS.map((g, i) => (
              <button
                key={g.key}
                type="button"
                className={`fab-orb orb-${g.key}${group === g.key ? ' active' : ''}`}
                data-orb={g.key}
                style={{ ['--i' as string]: i + 1 }}
                title={g.name}
                onClick={() => {
                  closeAll();
                  setGroup(g.key);
                }}
              >
                <span className="orb-icon">
                  <Icon name={g.glyph} size={19} />
                </span>
                <span className="orb-label">{g.name}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="fab-composer"
            title="Mở bảng chọn"
            aria-label="Mở bảng chọn nhóm"
            onClick={() => {
              if (arcOpen || composerOpen) closeAll();
              else setArcOpen(true);
            }}
          >
            ⋯
          </button>
        </div>
      </div>

      {composerOpen && (
        <div ref={popRef} className="composer-pop">
          <div className="composer-pop-head">
            ✏️ {t('Hôm nay cần làm gì?')}
            <button type="button" className="close-x" onClick={() => setComposerOpen(false)}>
              ✕
            </button>
          </div>
          <QuickComposer onCreated={() => setComposerOpen(false)} />
        </div>
      )}
    </>
  );
}
