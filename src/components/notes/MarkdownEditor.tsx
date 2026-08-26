'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '@/components/ui/Icon';
import { Markdown } from './Markdown';
import { markdownFromHtml } from '@/lib/markdown';
import { usePrefs } from '@/state/PrefsProvider';

export interface EditorHandle {
  /** Text the user has highlighted, for "create task from selection". */
  getSelection: () => string;
  focus: () => void;
}

/**
 * Palette for the colour and highlight pickers. Mid-tone hues that stay legible
 * on both the light and dark surfaces; highlights are pale, and `.md-bg` pins
 * the text on them to a dark ink so a yellow highlight never ends up
 * white-on-yellow when the dark theme is on.
 */
const TEXT_COLORS: Array<{ name: string; value: string }> = [
  { name: 'Mặc định', value: '' },
  { name: 'Đỏ', value: '#DC2626' },
  { name: 'Cam', value: '#EA580C' },
  { name: 'Vàng', value: '#CA8A04' },
  { name: 'Lá', value: '#16A34A' },
  { name: 'Ngọc', value: '#0D9488' },
  { name: 'Xanh', value: '#2563EB' },
  { name: 'Tím', value: '#7C3AED' },
  { name: 'Hồng', value: '#DB2777' },
  { name: 'Xám', value: '#64748B' },
];
const HIGHLIGHTS: Array<{ name: string; value: string }> = [
  { name: 'Không', value: '' },
  { name: 'Vàng', value: '#FEF08A' },
  { name: 'Lá', value: '#BBF7D0' },
  { name: 'Xanh', value: '#BFDBFE' },
  { name: 'Hồng', value: '#FBCFE8' },
  { name: 'Tím', value: '#DDD6FE' },
  { name: 'Cam', value: '#FED7AA' },
  { name: 'Xám', value: '#E2E8F0' },
];

interface Tool {
  key: string;
  icon?: string;
  label?: string;
  title: string;
  /** execCommand name, used by the rich editor. */
  cmd?: string;
  /** formatBlock target, used by the rich editor. */
  block?: string;
  task?: boolean;
  link?: boolean;
  /** Opens a swatch popover instead of applying immediately. */
  palette?: 'fg' | 'bg';
  /** Raw-Markdown equivalents, used by the source view. */
  wrap?: [string, string];
  prefix?: string;
  insert?: string;
  /** Ctrl/Cmd shortcut letter. */
  shortcut?: string;
}

const TOOLS: Tool[] = [
  { key: 'bold', label: 'B', title: 'Đậm (Ctrl+B)', cmd: 'bold', wrap: ['**', '**'], shortcut: 'b' },
  { key: 'italic', label: 'I', title: 'Nghiêng (Ctrl+I)', cmd: 'italic', wrap: ['*', '*'], shortcut: 'i' },
  { key: 'under', label: 'U', title: 'Gạch chân (Ctrl+U)', cmd: 'underline', wrap: ['++', '++'], shortcut: 'u' },
  { key: 'strike', label: 'S', title: 'Gạch ngang', cmd: 'strikeThrough', wrap: ['~~', '~~'] },
  { key: 'h1', label: 'H1', title: 'Tiêu đề 1', block: 'H1', prefix: '# ' },
  { key: 'h2', label: 'H2', title: 'Tiêu đề 2', block: 'H2', prefix: '## ' },
  { key: 'h3', label: 'H3', title: 'Tiêu đề 3', block: 'H3', prefix: '### ' },
  { key: 'ul', label: '•', title: 'Danh sách', cmd: 'insertUnorderedList', prefix: '- ' },
  { key: 'ol', label: '1.', title: 'Danh sách đánh số', cmd: 'insertOrderedList', prefix: '1. ' },
  { key: 'task', icon: 'check', title: 'Checklist', task: true, prefix: '- [ ] ' },
  { key: 'quote', label: '❝', title: 'Trích dẫn', block: 'BLOCKQUOTE', prefix: '> ' },
  { key: 'code', icon: 'board', title: 'Khối mã', block: 'PRE', wrap: ['\n```\n', '\n```\n'] },
  { key: 'fg', label: 'A', title: 'Màu chữ', palette: 'fg' },
  { key: 'bg', icon: 'tag', title: 'Màu nền chữ', palette: 'bg' },
  { key: 'link', icon: 'link', title: 'Liên kết (Ctrl+K)', link: true, wrap: ['[', '](https://)'], shortcut: 'k' },
  { key: 'hr', icon: 'minus', title: 'Đường kẻ ngang', cmd: 'insertHorizontalRule', insert: '\n\n---\n\n' },
];

/**
 * Note editor with two views over the same Markdown.
 *
 * "Soạn" is a contenteditable surface showing real formatting — bold looks
 * bold rather than reading `**bold**`. Markdown stays the stored format, so the
 * DOM is serialised back on every change; "Markdown" exposes that raw text for
 * anyone who wants it.
 */
/** Clearing a colour: drop the property wherever it sits, then unwrap any span
 *  left with nothing to say. */
function stripInlineStyle(root: HTMLElement, prop: 'color' | 'backgroundColor') {
  root.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    el.style[prop] = '';
    if (!el.getAttribute('style')) {
      el.removeAttribute('style');
      if (el.nodeName === 'SPAN') {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }
  });
  root.normalize();
}

export const MarkdownEditor = forwardRef<EditorHandle, {
  value: string;
  onChange: (next: string) => void;
  onSave?: () => void;
  placeholder?: string;
  /** Called when a colour is picked with nothing selected. */
  onNeedSelection?: () => void;
}>(function MarkdownEditor({ value, onChange, onSave, placeholder, onNeedSelection }, ref) {
  const { t } = usePrefs();
  const [mode, setMode] = useState<'rich' | 'source'>('rich');
  const [palette, setPalette] = useState<'fg' | 'bg' | null>(null);
  const [lastColor, setLastColor] = useState<{ fg: string; bg: string }>({ fg: '', bg: '' });
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  /** The Markdown this editor last emitted, so incoming props can be ignored. */
  const emittedRef = useRef(value);

  useImperativeHandle(ref, () => ({
    getSelection: () => (window.getSelection()?.toString() ?? '').trim(),
    focus: () => (mode === 'rich' ? richRef.current : areaRef.current)?.focus(),
  }));

  /**
   * Seed the contenteditable from Markdown — but only when the text came from
   * somewhere other than this editor (opening a note, restoring a version).
   * Re-seeding on our own output would reset the caret on every keystroke.
   */
  useEffect(() => {
    if (mode !== 'rich') return;
    const el = richRef.current;
    if (!el) return;
    if (value === emittedRef.current && el.innerHTML.trim()) return;
    el.innerHTML = renderToStaticMarkup(<Markdown source={value} editable />) || '<p><br /></p>';
    emittedRef.current = value;
  }, [value, mode]);

  const emit = useCallback(() => {
    const el = richRef.current;
    if (!el) return;
    const md = markdownFromHtml(el);
    emittedRef.current = md;
    onChange(md);
  }, [onChange]);

  /** Toolbar action in the WYSIWYG surface. */
  const applyRich = useCallback(
    (tool: Tool) => {
      const el = richRef.current;
      if (!el) return;
      el.focus();

      if (tool.link) {
        const text = window.getSelection()?.toString() ?? '';
        const url = window.prompt('Địa chỉ liên kết:', 'https://');
        if (!url) return;
        if (text) document.execCommand('createLink', false, url);
        else document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`);
      } else if (tool.task) {
        // execCommand has no checklist; build the item and let the serialiser
        // turn it back into `- [ ]`.
        const text = window.getSelection()?.toString() ?? '';
        document.execCommand(
          'insertHTML',
          false,
          `<ul class="md-tasklist"><li class="md-task"><button type="button" class="md-checkbox" contenteditable="false"></button><span>${text || '&nbsp;'}</span></li></ul>`,
        );
      } else if (tool.block) {
        document.execCommand('formatBlock', false, tool.block);
      } else if (tool.cmd) {
        document.execCommand(tool.cmd, false);
      }
      emit();
    },
    [emit],
  );

  /**
   * Text colour / highlight in the WYSIWYG editor.
   *
   * These are the only commands run with `styleWithCSS` on, so they produce
   * styling the serialiser can map to `{c:…}` / `{h:…}`; bold and the rest stay
   * tag-based. An empty value strips the colour instead of painting one.
   */
  const applyRichColor = useCallback(
    (kind: 'fg' | 'bg', value: string) => {
      const el = richRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        onNeedSelection?.();
        return;
      }

      document.execCommand('styleWithCSS', false, 'true');
      if (kind === 'fg') {
        document.execCommand('foreColor', false, value || 'inherit');
        if (!value) stripInlineStyle(el, 'color');
      } else {
        // Firefox only honours hiliteColor; Safari only backColor.
        if (!document.execCommand('hiliteColor', false, value || 'transparent')) {
          document.execCommand('backColor', false, value || 'transparent');
        }
        if (!value) stripInlineStyle(el, 'backgroundColor');
      }
      document.execCommand('styleWithCSS', false, 'false');
      emit();
    },
    [emit, onNeedSelection],
  );

  /** The same colour action, written straight into the raw Markdown. */
  const applySourceColor = useCallback(
    (kind: 'fg' | 'bg', value: string) => {
      const el = areaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) {
        onNeedSelection?.();
        return;
      }
      const text = el.value;
      const marker = kind === 'fg' ? 'c' : 'h';
      // Clearing means unwrapping whatever marker already surrounds the text.
      const stripped = text
        .slice(start, end)
        .replace(new RegExp(`\\{${marker}:#[0-9a-fA-F]{3,8}\\|([\\s\\S]*?)\\}`, 'g'), '$1');
      const next = value ? `{${marker}:${value}|${stripped}}` : stripped;
      const full = text.slice(0, start) + next + text.slice(end);

      emittedRef.current = full;
      onChange(full);
      el.value = full;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start + next.length);
      });
    },
    [onChange, onNeedSelection],
  );

  /** Toolbar action in the raw-Markdown textarea. */
  const applySource = useCallback(
    (tool: Tool) => {
      const el = areaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;

      let next: string;
      let caret: [number, number];

      if (tool.insert) {
        next = text.slice(0, start) + tool.insert + text.slice(end);
        const pos = start + tool.insert.length;
        caret = [pos, pos];
      } else if (tool.prefix) {
        // Line prefixes toggle on every line the selection touches.
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const nl = text.indexOf('\n', end);
        const lineEnd = nl === -1 ? text.length : nl;
        const block = text
          .slice(lineStart, lineEnd)
          .split('\n')
          .map((l) => (l.startsWith(tool.prefix!) ? l.slice(tool.prefix!.length) : tool.prefix! + l))
          .join('\n');
        next = text.slice(0, lineStart) + block + text.slice(lineEnd);
        caret = [lineStart, lineStart + block.length];
      } else if (tool.wrap) {
        const [before, after] = tool.wrap;
        const selected = text.slice(start, end);
        next = text.slice(0, start) + before + selected + after + text.slice(end);
        caret = [start + before.length, start + before.length + selected.length];
      } else {
        return;
      }

      emittedRef.current = next;
      onChange(next);
      el.value = next;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret[0], caret[1]);
      });
    },
    [onChange],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }
    const tool = TOOLS.find((x) => x.shortcut === key);
    if (tool) {
      e.preventDefault();
      if (mode === 'rich') applyRich(tool);
      else applySource(tool);
    }
  };

  // Checkboxes live inside the contenteditable; delegate their clicks here so
  // they keep working after the browser rewrites the DOM around them.
  const onRichClick = (e: React.MouseEvent) => {
    const box = (e.target as HTMLElement).closest('.md-checkbox');
    if (!box) return;
    e.preventDefault();
    const done = box.classList.toggle('done');
    box.textContent = done ? '✓' : '';
    const span = box.closest('li')?.querySelector('span');
    if (span) span.className = done ? 'md-task-done' : '';
    emit();
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        {TOOLS.map((tool) =>
          tool.palette ? (
            <span className="md-swatch-wrap" key={tool.key}>
              <button
                type="button"
                className="md-tool md-tool-color"
                title={t(tool.title)}
                // Every interaction here uses mousedown+preventDefault so the
                // editor's selection survives long enough to be coloured.
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPalette((p) => (p === tool.palette ? null : tool.palette!));
                }}
              >
                {tool.icon ? <Icon name={tool.icon} size={14} /> : tool.label}
                <i
                  className="md-swatch-bar"
                  style={{ background: lastColor[tool.palette] || 'var(--text-3)' }}
                />
              </button>

              {palette === tool.palette && (
                <div className="md-palette">
                  {(tool.palette === 'fg' ? TEXT_COLORS : HIGHLIGHTS).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={`md-swatch${c.value ? '' : ' none'}`}
                      title={t(c.name)}
                      style={c.value ? { background: c.value } : undefined}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setPalette(null);
                        setLastColor((s) => ({ ...s, [tool.palette!]: c.value }));
                        if (mode === 'rich') applyRichColor(tool.palette!, c.value);
                        else applySourceColor(tool.palette!, c.value);
                      }}
                    />
                  ))}
                </div>
              )}
            </span>
          ) : (
            <button
              key={tool.key}
              type="button"
              className="md-tool"
              title={t(tool.title)}
              // Keep the editor's selection alive through the click.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (mode === 'rich' ? applyRich(tool) : applySource(tool))}
            >
              {tool.icon ? <Icon name={tool.icon} size={14} /> : tool.label}
            </button>
          ),
        )}

        <div className="md-mode">
          <button type="button" className={mode === 'rich' ? 'active' : ''} onClick={() => setMode('rich')}>
            {t('Soạn')}
          </button>
          <button type="button" className={mode === 'source' ? 'active' : ''} onClick={() => setMode('source')}>
            Markdown
          </button>
        </div>
      </div>

      {mode === 'rich' ? (
        <div
          ref={richRef}
          className="md-rich"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder={placeholder ?? t('Bắt đầu viết…')}
          onInput={emit}
          onKeyDown={onKeyDown}
          onClick={onRichClick}
          onPaste={(e) => {
            // Pasted HTML would carry styles and tags the serialiser has no
            // meaning for; take the plain text instead.
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
        />
      ) : (
        <textarea
          ref={areaRef}
          className="md-input"
          value={value}
          placeholder={t('Bắt đầu viết… hỗ trợ Markdown')}
          spellCheck={false}
          onChange={(e) => {
            emittedRef.current = e.target.value;
            onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
      )}
    </div>
  );
});
