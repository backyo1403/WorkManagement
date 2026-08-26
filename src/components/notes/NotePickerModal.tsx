'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/primitives';
import { liveNotes, notePreview, noteTitle, relativeTime } from '@/lib/notes';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * Picks notes from the other side of the relationship — used by the task modal
 * ("Related notes") and the project page. Writes the same NoteTaskLink rows the
 * note editor writes, so the two views can never disagree.
 */
export function NotePickerModal({
  linkedIds,
  onToggle,
  onClose,
  title = 'Liên kết ghi chú',
}: {
  linkedIds: string[];
  onToggle: (noteId: string, linked: boolean) => void;
  onClose: () => void;
  title?: string;
}) {
  const { notes, notebooks } = useData();
  const { group, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return liveNotes(notes, group)
      .filter((n) => {
        const nb = notebooks.find((x) => x.id === n.notebookId);
        // A locked notebook's notes stay out of the picker entirely.
        if (nb?.locked && !isUnlocked(nb.id)) return false;
        return !needle || noteTitle(n).toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle);
      })
      .sort((a, b) => Number(linkedIds.includes(b.id)) - Number(linkedIds.includes(a.id)))
      .slice(0, 60);
  }, [notes, notebooks, group, query, linkedIds, isUnlocked]);

  return (
    <Modal icon="edit" title={t(title)} wide onClose={onClose}>
      <div className="search-input-wrap" style={{ marginBottom: 12 }}>
        <span className="srch-ico">
          <Icon name="search" size={15} />
        </span>
        <input
          type="text"
          value={query}
          autoFocus
          placeholder={t('Tìm ghi chú…')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="picker-list">
        {results.length === 0 && <div className="picker-empty">{t('Chưa có ghi chú nào')}</div>}
        {results.map((note) => {
          const linked = linkedIds.includes(note.id);
          return (
            <button
              key={note.id}
              type="button"
              className={`picker-row${linked ? ' linked' : ''}`}
              onClick={() => onToggle(note.id, !linked)}
            >
              <span className={`picker-check${linked ? ' on' : ''}`}>{linked ? '✓' : ''}</span>
              <Icon name="edit" size={14} />
              <span className="picker-title">
                {noteTitle(note)}
                <em className="picker-sub">{notePreview(note, 60)}</em>
              </span>
              <span className="note-meta-time">{relativeTime(note.updatedAt)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('Xong')}
        </button>
      </div>
    </Modal>
  );
}
