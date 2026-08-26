/**
 * Shared note selectors: which notes belong in a view, and how one is searched.
 *
 * Kept out of the components so the notes page, the global search box and the
 * dashboard widget all agree on what "recent" or "visible" means.
 */

import { markdownToPlain } from './markdown';
import type { NoteDTO, NotebookDTO, NoteView, TaskDTO } from './types';

/** Notes that are neither archived nor in the trash. */
export function liveNotes(notes: NoteDTO[], group: string): NoteDTO[] {
  return notes.filter((n) => !n.archived && !n.deletedAt && (!group || n.groupKey === group));
}

export function notesForView(
  notes: NoteDTO[],
  group: string,
  view: NoteView,
  arg?: string,
): NoteDTO[] {
  const scoped = notes.filter((n) => !group || n.groupKey === group);
  const byUpdated = (a: NoteDTO, b: NoteDTO) => +new Date(b.updatedAt) - +new Date(a.updatedAt);

  switch (view) {
    case 'trash':
      return scoped.filter((n) => n.deletedAt).sort(byUpdated);
    case 'archive':
      return scoped.filter((n) => n.archived && !n.deletedAt).sort(byUpdated);
    case 'favorites':
      return liveNotes(scoped, '').filter((n) => n.favorite).sort(byUpdated);
    case 'recent':
      return liveNotes(scoped, '').sort(byUpdated).slice(0, 20);
    case 'notebook':
      return liveNotes(scoped, '').filter((n) => n.notebookId === arg).sort(byUpdated);
    case 'tag':
      return liveNotes(scoped, '').filter((n) => n.hashtags.includes(arg ?? '')).sort(byUpdated);
    case 'templates':
      return [];
    default:
      return liveNotes(scoped, '').sort(byUpdated);
  }
}

/**
 * Matches title, body, tags, notebook name, project name and the titles of any
 * linked tasks — so searching for a task name surfaces the notes about it.
 * A leading `#` narrows the match to tags.
 */
export function noteMatches(
  note: NoteDTO,
  query: string,
  ctx: {
    notebooks: NotebookDTO[];
    projectName?: string | null;
    tasks: TaskDTO[];
  },
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  const tags = note.hashtags.map((h) => h.toLowerCase());
  if (needle.startsWith('#')) {
    const tag = needle.slice(1).replace(/\s+/g, '-');
    return tag ? tags.some((x) => x.includes(tag)) : tags.length > 0;
  }

  const notebook = ctx.notebooks.find((n) => n.id === note.notebookId)?.name ?? '';
  const linkedTitles = ctx.tasks
    .filter((t) => note.linkedTaskIds.includes(t.id))
    .map((t) => t.title);

  return (
    [note.title, markdownToPlain(note.content), notebook, ctx.projectName ?? '', ...linkedTitles].some(
      (v) => v.toLowerCase().includes(needle),
    ) || tags.some((x) => x.includes(needle))
  );
}

/** First ~140 characters of the body with markdown stripped, for cards. */
export function notePreview(note: NoteDTO, max = 140): string {
  const plain = markdownToPlain(note.content);
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

export function noteTitle(note: NoteDTO): string {
  return note.title.trim() || 'Ghi chú chưa đặt tên';
}

/** "2 phút trước" / "Hôm qua" / "12-Aug" — relative where it reads better. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

/** Bytes → a short human string for attachment rows. */
export function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
