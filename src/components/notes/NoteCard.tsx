'use client';

import { Icon } from '@/components/ui/Icon';
import { HashtagChips } from '@/components/ui/HashtagField';
import { notePreview, noteTitle, relativeTime } from '@/lib/notes';
import type { NoteDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * One note in the list. A note in a locked notebook shows its shell — title
 * bar, notebook, timestamps — but never its body or tags.
 */
export function NoteCard({ note, onOpen }: { note: NoteDTO; onOpen: () => void }) {
  const { notebooks, projects } = useData();
  const { t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();

  const notebook = notebooks.find((n) => n.id === note.notebookId) ?? null;
  const project = projects.find((p) => p.id === note.projectId) ?? null;
  const sealed = !!notebook?.locked && !isUnlocked(notebook.id);

  return (
    <button type="button" className="note-card" onClick={onOpen}>
      <div className="note-card-head">
        <Icon name={sealed ? 'lock' : 'edit'} size={15} />
        <span className="note-card-title">{sealed ? notebook!.name : noteTitle(note)}</span>
        {note.favorite && <Icon name="star-filled" size={13} className="note-fav" />}
      </div>

      <div className="note-card-preview">
        {sealed ? t('Sổ tay đang khoá — mở khoá để xem nội dung') : notePreview(note)}
      </div>

      {!sealed && note.hashtags.length > 0 && (
        <div className="note-card-tags">
          <HashtagChips tags={note.hashtags} max={3} />
        </div>
      )}

      <div className="note-card-meta">
        {notebook && (
          <span className="note-meta-chip" style={{ color: notebook.color }}>
            <Icon name={notebook.icon} size={12} />
            {notebook.name}
          </span>
        )}
        {project && !sealed && (
          <span className="note-meta-chip" style={{ color: project.color }}>
            <Icon name="folder" size={12} />
            {project.name}
          </span>
        )}
        {!sealed && note.linkedTaskIds.length > 0 && (
          <span className="note-meta-chip">
            <Icon name="link" size={12} />
            {t(`${note.linkedTaskIds.length} nhiệm vụ`)}
          </span>
        )}
        {!sealed && note.attachments.length > 0 && (
          <span className="note-meta-chip">
            <Icon name="upload" size={12} />
            {note.attachments.length}
          </span>
        )}
        <span className="note-meta-time">{relativeTime(note.updatedAt)}</span>
      </div>
    </button>
  );
}
