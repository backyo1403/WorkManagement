'use client';

import { Fragment } from 'react';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown';

/**
 * Renders parsed markdown as React elements.
 *
 * Nothing here goes through `dangerouslySetInnerHTML`, so note content cannot
 * introduce markup or scripts no matter what the user types or pastes.
 */

function renderInline(nodes: Inline[], keyPrefix = ''): React.ReactNode {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}${i}`;
    switch (n.kind) {
      case 'text':
        return <Fragment key={key}>{n.text}</Fragment>;
      case 'bold':
        return <strong key={key}>{renderInline(n.children, `${key}-`)}</strong>;
      case 'italic':
        return <em key={key}>{renderInline(n.children, `${key}-`)}</em>;
      case 'underline':
        return <u key={key}>{renderInline(n.children, `${key}-`)}</u>;
      case 'strike':
        return <s key={key}>{renderInline(n.children, `${key}-`)}</s>;
      case 'code':
        return (
          <code key={key} className="md-code">
            {n.text}
          </code>
        );
      case 'color':
        return (
          <span key={key} className="md-fg" style={{ color: n.color }}>
            {renderInline(n.children, `${key}-`)}
          </span>
        );
      case 'highlight':
        return (
          <span key={key} className="md-bg" style={{ background: n.color }}>
            {renderInline(n.children, `${key}-`)}
          </span>
        );
      case 'link': {
        // Only http(s) and mailto survive; anything else (javascript:, data:)
        // renders as plain text rather than a clickable trap.
        const safe = /^(https?:|mailto:)/i.test(n.href);
        if (!safe) return <Fragment key={key}>{renderInline(n.children, `${key}-`)}</Fragment>;
        return (
          <a key={key} href={n.href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.children, `${key}-`)}
          </a>
        );
      }
    }
  });
}

function renderBlock(
  b: Block,
  i: number,
  onToggleLine?: (line: number) => void,
  editable?: boolean,
): React.ReactNode {
  switch (b.kind) {
    case 'heading': {
      const Tag = (['h1', 'h2', 'h3'] as const)[b.level - 1];
      return <Tag key={i}>{renderInline(b.children, `${i}-`)}</Tag>;
    }
    case 'paragraph':
      return <p key={i}>{renderInline(b.children, `${i}-`)}</p>;
    case 'quote':
      return <blockquote key={i}>{renderInline(b.children, `${i}-`)}</blockquote>;
    case 'code':
      return (
        <pre key={i} className="md-pre">
          <code>{b.text}</code>
        </pre>
      );
    case 'hr':
      return <hr key={i} />;
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag key={i} className={b.items.some((it) => it.checked !== null) ? 'md-tasklist' : undefined}>
          {b.items.map((item, j) => (
            <li key={j} className={item.checked === null ? undefined : 'md-task'}>
              {item.checked !== null && (
                <button
                  type="button"
                  className={`md-checkbox${item.checked ? ' done' : ''}`}
                  aria-pressed={item.checked}
                  // Read-only unless something can act on the click — that is
                  // what version history and search results want. Inside the
                  // WYSIWYG surface the editor handles it, and the button opts
                  // out of editing so the caret cannot land in it.
                  disabled={!onToggleLine && !editable}
                  contentEditable={editable ? false : undefined}
                  suppressContentEditableWarning={editable}
                  onClick={() => onToggleLine?.(item.line)}
                >
                  {item.checked ? '✓' : ''}
                </button>
              )}
              <span className={item.checked ? 'md-task-done' : undefined}>
                {renderInline(item.children, `${i}-${j}-`)}
              </span>
            </li>
          ))}
        </Tag>
      );
    }
  }
}

export function Markdown({
  source,
  onToggleLine,
  editable,
}: {
  source: string;
  /** Supplied by read-only views that still want live checkboxes. */
  onToggleLine?: (line: number) => void;
  /**
   * This markup is being seeded into the WYSIWYG surface. It drops the
   * `.md-body` wrapper — the contenteditable's own children must be the blocks,
   * since that is what the HTML→Markdown serialiser walks — and leaves the
   * checkboxes live for the editor to handle.
   */
  editable?: boolean;
}) {
  const blocks = parseMarkdown(source);
  if (!blocks.length) {
    return editable ? null : <div className="md-body md-empty">Ghi chú này chưa có nội dung.</div>;
  }
  const rendered = blocks.map((b, i) => renderBlock(b, i, onToggleLine, editable));
  return editable ? <>{rendered}</> : <div className="md-body">{rendered}</div>;
}
