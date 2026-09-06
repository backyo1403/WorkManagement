'use client';

import { useMemo, useState } from 'react';
import { NotebookUnlock } from '@/components/notes/NotebookUnlock';
import { tint } from './parts';
import { locale } from '@/lib/domain';
import { markdownToPlain } from '@/lib/markdown';
import { liveNotes } from '@/lib/notes';
import type { Lang, NoteDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';

/**
 * "2 giờ trước", "Hôm qua", "3 ngày trước" — the age wording on note cards.
 *
 * Returns Vietnamese for `t()` to translate, so every branch here has to match
 * a dictionary key or one of the `N phút/giờ/ngày trước` patterns. The absolute
 * fallback formats in the reader's own locale instead.
 */
function ago(iso: string, lang: Lang): string {
  const mins = Math.round((Date.now() - +new Date(iso)) / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString(locale(lang));
}

/**
 * Ghi chú — the notebook chips and one card per note.
 *
 * A locked notebook keeps its lock here: its notes stay out of "Tất cả", and
 * picking its chip shows the same PIN gate the desktop uses rather than a
 * phone-only bypass.
 */
export function MobileNotes({ onOpenNote }: { onOpenNote: (id: string) => void }) {
  const { notes, notebooks, tasks } = useData();
  const { group, lang, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();

  // 'all' · a notebook id · 'templates'
  const [pick, setPick] = useState<string>('all');

  const sealed = (id: string | null) => {
    const book = notebooks.find((n) => n.id === id);
    return !!book?.locked && !isUnlocked(book.id);
  };

  const activeNotebook = notebooks.find((n) => n.id === pick) ?? null;
  const gated = !!activeNotebook && sealed(activeNotebook.id);

  const list = useMemo(() => {
    const live = liveNotes(notes, group).sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
    if (pick === 'templates') return live.filter((n) => n.templateKey && n.templateKey !== 'blank');
    if (pick === 'all') return live.filter((n) => !sealed(n.notebookId));
    return live.filter((n) => n.notebookId === pick);
    // `sealed` reads notebooks + the unlock map, both in the dep list already.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, notebooks, group, pick, isUnlocked]);

  const chips: Array<{ key: string; label: string; dot: string }> = [
    { key: 'all', label: t('Tất cả'), dot: 'var(--brand)' },
    ...notebooks
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n) => ({
        key: n.id,
        label: n.locked ? `${n.name} 🔒` : n.name,
        dot: n.color,
      })),
    { key: 'templates', label: t('Mẫu'), dot: 'var(--text-3)' },
  ];

  return (
    <div className="m-page" style={{ gap: 14, paddingTop: 12 }}>
      <div className="m-chips m-scroller">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`m-chip${pick === c.key ? ' on' : ''}`}
            onClick={() => setPick(c.key)}
          >
            <span className="m-dot" style={{ background: c.dot }} />
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {gated ? (
        <div className="m-pad">
          <NotebookUnlock notebook={activeNotebook!} />
        </div>
      ) : list.length === 0 ? (
        <div className="m-empty">{t('Chưa có ghi chú nào ở đây')}</div>
      ) : (
        <div className="m-col m-pad" style={{ gap: 9 }}>
          {list.map((note: NoteDTO) => {
            const book = notebooks.find((n) => n.id === note.notebookId) ?? null;
            const bookColor = book?.color ?? 'var(--text-2)';
            const linked = note.linkedTaskIds.filter((id) => tasks.some((x) => x.id === id)).length;
            return (
              <button
                key={note.id}
                type="button"
                className="m-note-card"
                onClick={() => onOpenNote(note.id)}
              >
                <span className="m-note-head">
                  <span className="m-note-title">{note.title || t('(chưa đặt tên)')}</span>
                  <span className="m-note-when">{t(ago(note.updatedAt, lang))}</span>
                </span>

                <span className="m-note-snip">
                  {markdownToPlain(note.content).slice(0, 160) || t('Ghi chú trống')}
                </span>

                <span className="m-note-foot">
                  <span
                    className="m-smallpill"
                    style={
                      book
                        ? { background: tint(bookColor, '29', 16), color: bookColor }
                        : undefined
                    }
                  >
                    {book?.name ?? t('Chưa xếp sổ')}
                  </span>
                  {note.hashtags.slice(0, 2).map((h) => (
                    <span key={h} className="m-smallpill">
                      #{h}
                    </span>
                  ))}
                  {linked > 0 && (
                    <span className="m-note-link">{t(`${linked} nhiệm vụ`)}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
