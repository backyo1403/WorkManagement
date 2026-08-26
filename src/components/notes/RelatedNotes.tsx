'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { NotePickerModal } from './NotePickerModal';
import { notePreview, noteTitle, relativeTime } from '@/lib/notes';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * "Related notes" — the other end of the Note↔Task relationship, and the
 * Note→Project one.
 *
 * Both modes read from the same records the notes module writes: task mode
 * filters on the NoteTaskLink rows, project mode on `note.projectId`. There is
 * no second copy of the relationship to keep in step.
 */
export function RelatedNotes({
  mode,
  id,
  onNavigate,
}: {
  mode: 'task' | 'project';
  id: string;
  /** Lets a host modal close itself before the route changes. */
  onNavigate?: () => void;
}) {
  const { notes, notebooks, setNoteTaskLink, updateNote } = useData();
  const { group, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();
  const toast = useToast();
  const router = useRouter();

  const [picking, setPicking] = useState(false);

  const related = useMemo(
    () =>
      notes
        .filter((n) => !n.deletedAt)
        .filter((n) =>
          mode === 'task' ? n.linkedTaskIds.includes(id) : n.projectId === id,
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [notes, mode, id],
  );

  const linkedIds = related.map((n) => n.id);

  const toggle = async (noteId: string, linked: boolean) => {
    const ok =
      mode === 'task'
        ? await setNoteTaskLink(noteId, id, linked)
        : await updateNote(noteId, { projectId: linked ? id : null });
    if (ok) toast(linked ? 'Đã liên kết ghi chú' : 'Đã gỡ liên kết ghi chú');
  };

  const open = (noteId: string) => {
    onNavigate?.();
    router.push(`/notes/${noteId}`);
  };

  return (
    <section className="note-panel">
      <h4 className="note-panel-head">
        <span>
          <Icon name="edit" size={14} /> {t('Ghi chú liên quan')}
          {related.length > 0 && <em className="note-panel-count">{related.length}</em>}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>
          <Icon name="plus" size={13} /> {t('Liên kết ghi chú')}
        </button>
      </h4>

      {related.length === 0 ? (
        <div className="note-empty small">
          <p>
            {t(
              mode === 'task'
                ? 'Chưa có ghi chú nào nhắc tới nhiệm vụ này.'
                : 'Chưa có ghi chú nào thuộc dự án này.',
            )}
          </p>
        </div>
      ) : (
        <div className="linked-list">
          {related.map((note) => {
            const nb = notebooks.find((x) => x.id === note.notebookId);
            const sealed = !!nb?.locked && !isUnlocked(nb.id);
            return (
              <div className="linked-row" key={note.id}>
                <Icon name={sealed ? 'lock' : 'edit'} size={15} />
                <button type="button" className="linked-main" onClick={() => open(note.id)}>
                  <span className="linked-title">{sealed ? nb!.name : noteTitle(note)}</span>
                  <span className="linked-sub">
                    {sealed ? t('Sổ tay đang khoá') : notePreview(note, 60)} ·{' '}
                    {relativeTime(note.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  title={t('Gỡ liên kết')}
                  onClick={async () => {
                    if (!confirm(`Gỡ "${noteTitle(note)}" khỏi mục này?\n\nGhi chú vẫn được giữ nguyên.`)) {
                      return;
                    }
                    await toggle(note.id, false);
                  }}
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {picking && (
        <NotePickerModal
          linkedIds={linkedIds}
          onToggle={toggle}
          onClose={() => setPicking(false)}
          title={mode === 'task' ? 'Liên kết ghi chú với nhiệm vụ' : 'Gắn ghi chú vào dự án'}
        />
      )}
    </section>
  );
}
