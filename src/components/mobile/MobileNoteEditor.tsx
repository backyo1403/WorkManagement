'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/notes/Markdown';
import { markdownFromHtml, parseChecklist, toggleChecklistLine } from '@/lib/markdown';
import { MAX_NOTE_VERSIONS_LABEL } from './constants';
import { TASK_STATUS_COLOR, TASK_STATUS_LABEL } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** Same debounce as the desktop editor, so both write at the same cadence. */
const AUTOSAVE_MS = 500;

type Tool =
  | { key: string; label: string; cmd: string }
  | { key: string; label: string; block: string }
  | { key: string; label: string; task: true }
  | { key: string; label: string; insert: string };

/** The seven the phone has room for, drawn from the desktop editor's set. */
const TOOLS: Tool[] = [
  { key: 'bold', label: 'B', cmd: 'bold' },
  { key: 'italic', label: 'I', cmd: 'italic' },
  { key: 'under', label: 'U', cmd: 'underline' },
  { key: 'h2', label: 'H2', block: 'H2' },
  { key: 'task', label: '☑', task: true },
  { key: 'tag', label: '#', insert: '#' },
];

/**
 * Soạn ghi chú — the phone note editor.
 *
 * The body is the same WYSIWYG surface the desktop uses (`Markdown editable`
 * in, `markdownFromHtml` out), with the toolbar cut to the seven buttons that
 * fit; **MD** swaps it for the raw Markdown behind it.
 *
 * The checklist below is not a second store: `- [ ]` lines live in the note
 * body, so the rows here read through `parseChecklist` and write through
 * `toggleChecklistLine`. There is one piece of text, edited two ways.
 */
export function MobileNoteEditor({ noteId }: { noteId: string }) {
  const { notes, notebooks, tasks, updateNote, convertChecklist } = useData();
  const { t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();

  const note = notes.find((n) => n.id === noteId) ?? null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'rich' | 'source'>('rich');

  const richRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const loadedIdRef = useRef<string | null>(null);
  /** The Markdown this editor last emitted, so its own output never re-seeds it. */
  const emittedRef = useRef('');
  const draftRef = useRef({ title: '', content: '' });
  draftRef.current = { title, content };

  // Load once per note. Re-seeding on every store update would rewind the caret
  // each time an autosave came back.
  useEffect(() => {
    if (!note || loadedIdRef.current === note.id) return;
    loadedIdRef.current = note.id;
    setTitle(note.title);
    setContent(note.content);
    emittedRef.current = '';
    dirtyRef.current = false;
  }, [note]);

  useEffect(() => {
    if (mode !== 'rich') return;
    const el = richRef.current;
    if (!el) return;
    if (content === emittedRef.current && el.innerHTML.trim()) return;
    el.innerHTML = renderToStaticMarkup(<Markdown source={content} editable />) || '<p><br /></p>';
    emittedRef.current = content;
  }, [content, mode]);

  const queueSave = useCallback(
    (nextTitle: string, nextContent: string) => {
      if (!note) return;
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        dirtyRef.current = false;
        void updateNote(note.id, { title: nextTitle, content: nextContent });
      }, AUTOSAVE_MS);
    },
    [note, updateNote],
  );

  // Leaving the editor must not drop the last few hundred milliseconds of text.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!dirtyRef.current || !loadedIdRef.current) return;
      void fetch(`/api/notes/${loadedIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftRef.current),
        keepalive: true,
      });
    },
    [],
  );

  const setBoth = (nextTitle: string, nextContent: string) => {
    setTitle(nextTitle);
    setContent(nextContent);
    queueSave(nextTitle, nextContent);
  };

  /** Read the contenteditable back out as Markdown. */
  const emit = useCallback(() => {
    const el = richRef.current;
    if (!el) return;
    const md = markdownFromHtml(el);
    emittedRef.current = md;
    setContent(md);
    queueSave(draftRef.current.title, md);
  }, [queueSave]);

  const apply = (tool: Tool) => {
    if (tool.key === 'md') return;
    const el = richRef.current;
    if (mode === 'source' || !el) return;
    el.focus();
    if ('task' in tool) {
      // execCommand has no checklist; build the item and let the serialiser
      // turn it back into `- [ ]`.
      const text = window.getSelection()?.toString() ?? '';
      document.execCommand(
        'insertHTML',
        false,
        `<ul class="md-tasklist"><li class="md-task"><button type="button" class="md-checkbox" contenteditable="false"></button><span>${
          text || '&nbsp;'
        }</span></li></ul>`,
      );
    } else if ('insert' in tool) {
      document.execCommand('insertText', false, tool.insert);
    } else if ('block' in tool) {
      document.execCommand('formatBlock', false, tool.block);
    } else {
      document.execCommand(tool.cmd, false);
    }
    emit();
  };

  /**
   * Tick a checkbox drawn inside the WYSIWYG body.
   *
   * The rendered HTML carries no React handlers — it is static markup seeded
   * into a contenteditable — so the click is caught here and matched back to a
   * source line by position: the boxes in the DOM and the `- [ ]` lines in the
   * text are both in document order, so the nth box is the nth item.
   */
  const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = (e.target as HTMLElement).closest?.('.md-checkbox');
    const root = richRef.current;
    if (!box || !root) return;
    e.preventDefault();
    const index = [...root.querySelectorAll('.md-checkbox')].indexOf(box);
    const item = parseChecklist(content)[index];
    if (!item) return;
    const next = toggleChecklistLine(content, item.line);
    // Force the re-seed: the new text did not come out of this editor.
    emittedRef.current = '';
    setBoth(title, next);
  };

  if (!note) return <div className="m-empty">{t('Không tìm thấy ghi chú')}</div>;

  const items = parseChecklist(content);
  const linked = note.linkedTaskIds
    .map((id) => tasks.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x);
  const book = notebooks.find((n) => n.id === note.notebookId) ?? null;

  const addItem = () => {
    const next = `${content.replace(/\s*$/, '')}\n- [ ] `.replace(/^\n/, '');
    setBoth(title, next);
    // The body re-seeds from the new source, so drop the emitted guard.
    emittedRef.current = '';
  };

  return (
    <div className="m-page" style={{ gap: 12, paddingTop: 4 }}>
      <div className="m-tools m-scroller">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            className="m-tool"
            disabled={mode === 'source'}
            style={{
              fontWeight: tool.key === 'bold' ? 800 : 600,
              fontStyle: tool.key === 'italic' ? 'italic' : 'normal',
              textDecoration: tool.key === 'under' ? 'underline' : 'none',
              opacity: mode === 'source' ? 0.4 : 1,
            }}
            onClick={() => apply(tool)}
          >
            {tool.label}
          </button>
        ))}
        <button
          type="button"
          className={`m-tool${mode === 'source' ? ' on' : ''}`}
          style={{ fontWeight: 700 }}
          title={t('Mã nguồn Markdown')}
          onClick={() => setMode((m) => (m === 'rich' ? 'source' : 'rich'))}
        >
          MD
        </button>
      </div>

      <div className="m-col m-pad" style={{ gap: 14 }}>
        <input
          type="text"
          className="m-note-input"
          value={title}
          placeholder={t('Tiêu đề ghi chú')}
          onChange={(e) => setBoth(e.target.value, content)}
        />

        {mode === 'rich' ? (
          <div
            ref={richRef}
            className="md-rich m-note-body"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={t('Viết ghi chú…')}
            onInput={emit}
            onBlur={emit}
            onClick={onBodyClick}
          />
        ) : (
          <textarea
            className="m-note-body raw"
            value={content}
            placeholder={t('Viết ghi chú…')}
            onChange={(e) => setBoth(title, e.target.value)}
          />
        )}

        {/* The checklist is the one drawn inside the body above — `- [ ]` lines
            live in the note text, so a second list here would be the same items
            twice. This row only appends to it. */}
        <button type="button" className="m-add-check" onClick={addItem}>
          <span className="m-box add">+</span>
          <span>{t('Thêm mục checklist')}</span>
        </button>

        {(note.hashtags.length > 0 || book) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {book && (
              <span className="m-tagpill" style={{ color: book.color }}>
                {book.name}
              </span>
            )}
            {note.hashtags.map((h) => (
              <span key={h} className="m-tagpill on">
                #{h}
              </span>
            ))}
          </div>
        )}

        <div className="m-panel">
          <div className="m-panel-label">{t('Nhiệm vụ liên kết')}</div>
          {linked.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
              {t('Chưa liên kết nhiệm vụ nào')}
            </div>
          ) : (
            linked.map((task) => (
              <div key={task.id} className="m-panel-row">
                <span
                  className="m-dot"
                  style={{ width: 8, height: 8, background: TASK_STATUS_COLOR[task.status] }}
                />
                <span className="m-panel-name">{task.title}</span>
                <span className="m-panel-state" style={{ color: TASK_STATUS_COLOR[task.status] }}>
                  {t(TASK_STATUS_LABEL[task.status])}
                </span>
              </div>
            ))
          )}
          <button
            type="button"
            className="m-soft-btn"
            disabled={items.length === 0}
            style={{ opacity: items.length === 0 ? 0.5 : 1 }}
            onClick={async () => {
              // The route reads the note's own group and project, so the only
              // extra worth sending is who pressed the button.
              const res = await convertChecklist(
                note.id,
                items.map((i) => i.text),
                { creatorId: user?.id ?? null },
              );
              if (res) {
                toast(
                  res.created
                    ? `Đã tạo ${res.created} nhiệm vụ${res.skipped ? `, bỏ qua ${res.skipped}` : ''}`
                    : 'Các mục checklist đã có nhiệm vụ tương ứng',
                );
              }
            }}
          >
            {t('Chuyển checklist thành nhiệm vụ')}
          </button>
        </div>

        <div className="m-foot-note">
          {t('Tự lưu sau 500ms')} ·{' '}
          {t(`phiên bản ${note.versionCount}/${MAX_NOTE_VERSIONS_LABEL}`)}
        </div>
      </div>
    </div>
  );
}
