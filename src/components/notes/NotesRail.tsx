'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NotebookModal } from './NotebookModal';
import { liveNotes } from '@/lib/notes';
import type { NoteView } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';

const VIEWS: Array<{ view: NoteView; icon: string; label: string }> = [
  { view: 'all', icon: 'edit', label: 'Tất cả ghi chú' },
  { view: 'recent', icon: 'clock', label: 'Gần đây' },
  { view: 'favorites', icon: 'star', label: 'Yêu thích' },
  { view: 'templates', icon: 'board', label: 'Mẫu' },
  { view: 'archive', icon: 'archive', label: 'Lưu trữ' },
  { view: 'trash', icon: 'trash', label: 'Thùng rác' },
];

/**
 * The notes module's own left rail.
 *
 * The app sidebar carries a single "Ghi chú" entry rather than six: the sidebar
 * already holds eleven items and doubles as the mobile bottom bar, where six
 * more would be unusable. The full view list lives here, next to the content
 * it filters.
 */
export function NotesRail({
  view,
  arg,
  onSelect,
}: {
  view: NoteView;
  arg?: string;
  onSelect: (view: NoteView, arg?: string) => void;
}) {
  const { notes, notebooks } = useData();
  const { group, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();
  const [managing, setManaging] = useState(false);

  const counts = useMemo(() => {
    const scoped = notes.filter((n) => !group || n.groupKey === group);
    const live = liveNotes(scoped, '');
    return {
      all: live.length,
      recent: Math.min(live.length, 20),
      favorites: live.filter((n) => n.favorite).length,
      templates: 0,
      archive: scoped.filter((n) => n.archived && !n.deletedAt).length,
      trash: scoped.filter((n) => n.deletedAt).length,
      byNotebook: (id: string) => live.filter((n) => n.notebookId === id).length,
    };
  }, [notes, group]);

  return (
    <aside className="notes-rail">
      <div className="notes-rail-group">
        {VIEWS.map((v) => (
          <button
            key={v.view}
            type="button"
            className={`notes-rail-item${view === v.view ? ' active' : ''}`}
            onClick={() => onSelect(v.view)}
          >
            <Icon name={v.icon} size={15} />
            <span>{t(v.label)}</span>
            {v.view !== 'templates' && counts[v.view as 'all'] > 0 && (
              <em>{counts[v.view as 'all']}</em>
            )}
          </button>
        ))}
      </div>

      <div className="notes-rail-label">
        {t('Sổ tay')}
        <button type="button" title={t('Thêm sổ tay')} onClick={() => setManaging(true)}>
          <Icon name="plus" size={13} />
        </button>
      </div>

      <div className="notes-rail-group">
        {notebooks.length === 0 && (
          <div className="notes-rail-hint">{t('Chưa có sổ tay nào')}</div>
        )}
        {notebooks.map((nb) => {
          const sealed = nb.locked && !isUnlocked(nb.id);
          return (
            <button
              key={nb.id}
              type="button"
              className={`notes-rail-item${view === 'notebook' && arg === nb.id ? ' active' : ''}`}
              onClick={() => onSelect('notebook', nb.id)}
            >
              <Icon name={sealed ? 'lock' : nb.icon} size={15} style={{ color: nb.color }} />
              <span>{nb.name}</span>
              {!sealed && counts.byNotebook(nb.id) > 0 && <em>{counts.byNotebook(nb.id)}</em>}
            </button>
          );
        })}
      </div>

      {managing && <NotebookModal notebook={null} onClose={() => setManaging(false)} />}
    </aside>
  );
}
