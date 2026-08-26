/**
 * A small Markdown parser for note bodies.
 *
 * It produces a block tree, which the renderer turns into React elements —
 * never an HTML string. That means note content can never inject markup, so
 * there is no sanitiser to get wrong, and it keeps the dependency count at zero
 * for the handful of constructs the editor toolbar can actually produce.
 *
 * Supported: h1–h3, bold, italic, strikethrough, inline code, links, bullet and
 * numbered lists, task lists, blockquote, fenced code, horizontal rule.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Inline[] }
  | { kind: 'italic'; children: Inline[] }
  | { kind: 'underline'; children: Inline[] }
  | { kind: 'strike'; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'color'; color: string; children: Inline[] }
  | { kind: 'highlight'; color: string; children: Inline[] };

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; children: Inline[] }
  | { kind: 'paragraph'; children: Inline[] }
  | { kind: 'quote'; children: Inline[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'hr' }
  | { kind: 'list'; ordered: boolean; items: ListItem[] };

export interface ListItem {
  children: Inline[];
  /** null when the item is not a checklist entry. */
  checked: boolean | null;
  /** Line index in the source, so a rendered checkbox can edit that line. */
  line: number;
}

// ─────────────────────────── inline ───────────────────────────

/**
 * Every pattern is anchored at the cursor and tried in priority order, so the
 * two-character markers are always considered before the one-character ones.
 * That is what makes nesting work: in `**++*x*++**` the outer `**` is taken
 * first instead of a stray `*` matching across it.
 *
 * `++text++` is a local extension for underline, which Markdown has no syntax
 * for — the editor's underline button needs somewhere to round-trip to.
 */
const INLINE_PATTERNS: Array<{ re: RegExp; build: (m: RegExpExecArray) => Inline }> = [
  { re: /^`([^`]+)`/, build: (m) => ({ kind: 'code', text: m[1] }) },
  // Markdown has no colour syntax either. `{c:#hex|text}` and `{h:#hex|text}`
  // are the local extensions the colour and highlight pickers round-trip through.
  {
    re: /^\{c:(#[0-9a-fA-F]{3,8})\|([\s\S]+?)\}/,
    build: (m) => ({ kind: 'color', color: m[1], children: parseInline(m[2]) }),
  },
  {
    re: /^\{h:(#[0-9a-fA-F]{3,8})\|([\s\S]+?)\}/,
    build: (m) => ({ kind: 'highlight', color: m[1], children: parseInline(m[2]) }),
  },
  {
    re: /^\[([^\]]*)\]\(([^)\s]+)\)/,
    build: (m) => ({ kind: 'link', href: m[2], children: parseInline(m[1]) }),
  },
  { re: /^\*\*([\s\S]+?)\*\*/, build: (m) => ({ kind: 'bold', children: parseInline(m[1]) }) },
  { re: /^__([\s\S]+?)__/, build: (m) => ({ kind: 'bold', children: parseInline(m[1]) }) },
  { re: /^\+\+([\s\S]+?)\+\+/, build: (m) => ({ kind: 'underline', children: parseInline(m[1]) }) },
  { re: /^~~([\s\S]+?)~~/, build: (m) => ({ kind: 'strike', children: parseInline(m[1]) }) },
  { re: /^\*([\s\S]+?)\*/, build: (m) => ({ kind: 'italic', children: parseInline(m[1]) }) },
  { re: /^_([\s\S]+?)_/, build: (m) => ({ kind: 'italic', children: parseInline(m[1]) }) },
];

export function parseInline(src: string): Inline[] {
  if (!src) return [];

  const out: Inline[] = [];
  let plain = '';
  let i = 0;

  while (i < src.length) {
    const rest = src.slice(i);
    let hit: { match: RegExpExecArray; build: (m: RegExpExecArray) => Inline } | null = null;
    for (const { re, build } of INLINE_PATTERNS) {
      const m = re.exec(rest);
      if (m) {
        hit = { match: m, build };
        break;
      }
    }
    if (hit) {
      if (plain) {
        out.push({ kind: 'text', text: plain });
        plain = '';
      }
      out.push(hit.build(hit.match));
      i += hit.match[0].length;
    } else {
      plain += src[i];
      i++;
    }
  }
  if (plain) out.push({ kind: 'text', text: plain });
  return out;
}

// ─────────────────────────── blocks ───────────────────────────

const RE_HEADING = /^(#{1,3})\s+(.*)$/;
const RE_BULLET = /^\s*[-*+]\s+(.*)$/;
const RE_ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const RE_TASK = /^\s*[-*+]\s+\[([ xX])\]\s*(.*)$/;
const RE_QUOTE = /^>\s?(.*)$/;
const RE_HR = /^\s*([-*_])\1{2,}\s*$/;
const RE_FENCE = /^```(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const lines = (src ?? '').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = RE_FENCE.exec(line);
    if (fence) {
      const lang = fence[1].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence (or end of input)
      blocks.push({ kind: 'code', lang, text: body.join('\n') });
      continue;
    }

    if (RE_HR.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        children: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        body.push(RE_QUOTE.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ kind: 'quote', children: parseInline(body.join(' ')) });
      continue;
    }

    const isBullet = RE_BULLET.test(line);
    const isOrdered = RE_ORDERED.test(line);
    if (isBullet || isOrdered) {
      const ordered = isOrdered && !isBullet;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const task = RE_TASK.exec(l);
        if (task) {
          items.push({
            children: parseInline(task[2]),
            checked: task[1].toLowerCase() === 'x',
            line: i,
          });
        } else if (!ordered && RE_BULLET.test(l)) {
          items.push({ children: parseInline(RE_BULLET.exec(l)![1]), checked: null, line: i });
        } else if (ordered && RE_ORDERED.test(l)) {
          items.push({ children: parseInline(RE_ORDERED.exec(l)![1]), checked: null, line: i });
        } else {
          break;
        }
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) para.push(lines[i++]);
    if (para.length) blocks.push({ kind: 'paragraph', children: parseInline(para.join(' ')) });
    else i++; // defensive: never spin on a line we failed to classify
  }

  return blocks;
}

function startsBlock(line: string): boolean {
  return (
    RE_HEADING.test(line) ||
    RE_BULLET.test(line) ||
    RE_ORDERED.test(line) ||
    RE_QUOTE.test(line) ||
    RE_HR.test(line) ||
    RE_FENCE.test(line)
  );
}

// ─────────────────────────── checklist helpers ───────────────────────────

export interface ChecklistItem {
  text: string;
  checked: boolean;
  line: number;
}

/** Every `- [ ]` / `- [x]` line in the source, with its line number. */
export function parseChecklist(src: string): ChecklistItem[] {
  return (src ?? '')
    .split('\n')
    .map((line, i) => {
      const m = RE_TASK.exec(line);
      return m ? { text: m[2].trim(), checked: m[1].toLowerCase() === 'x', line: i } : null;
    })
    .filter((x): x is ChecklistItem => x !== null && x.text.length > 0);
}

/** Flips the checkbox on one source line, leaving the rest of the text alone. */
export function toggleChecklistLine(src: string, line: number): string {
  const lines = (src ?? '').split('\n');
  const target = lines[line];
  if (target === undefined) return src;
  const m = RE_TASK.exec(target);
  if (!m) return src;
  lines[line] = m[1].toLowerCase() === 'x'
    ? target.replace(/\[[xX]\]/, '[ ]')
    : target.replace(/\[ \]/, '[x]');
  return lines.join('\n');
}

// ─────────────────────────── plain text ───────────────────────────

/** Strips markers for previews and search — never rendered as markup. */
export function markdownToPlain(src: string): string {
  return (src ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    // Colour markers keep their text, drop their wrapper.
    .replace(/\{[ch]:#[0-9a-fA-F]{3,8}\|([\s\S]*?)\}/g, '$1')
    .replace(/\+\+/g, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────── HTML → Markdown ───────────────────────────

const INLINE_WRAP: Record<string, string> = {
  STRONG: '**', B: '**', EM: '*', I: '*', U: '++', S: '~~', STRIKE: '~~', DEL: '~~',
};

/** `rgb(a)` from a computed style back to the `#rrggbb` the markers store. */
export function toHex(color: string): string {
  if (!color) return '';
  if (color[0] === '#') return color.toLowerCase();
  const m = color.match(/\d+/g);
  if (!m || m.length < 3) return '';
  return '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Serialises the WYSIWYG editor's DOM back to Markdown.
 *
 * Markdown stays the stored format — templates, the checklist parser and
 * "convert to tasks" all read it — so the editor renders it to HTML for editing
 * and this turns it back on every save, rather than switching the data model.
 */
export function markdownFromHtml(root: HTMLElement): string {
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? '').replace(/ /g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;

    if (el.nodeName === 'BR') return '\n';

    let inner: string;
    if (el.nodeName === 'CODE') {
      inner = '`' + el.textContent + '`';
    } else if (el.nodeName === 'A') {
      const href = el.getAttribute('href') ?? '';
      inner = href ? `[${children(el)}](${href})` : children(el);
    } else {
      inner = children(el);
      const wrap = INLINE_WRAP[el.nodeName];
      // Never emit `****` for an empty span — it renders as literal stars.
      if (wrap && inner.trim()) inner = wrap + inner + wrap;
    }

    // Colour is read from *any* element, not just SPAN: execCommand styles
    // whichever tag already wraps the selection, so a coloured bold run comes
    // back as `<strong style="color:…">` rather than a span of its own.
    const fg = toHex(el.style?.color || (el.nodeName === 'FONT' ? el.getAttribute('color') ?? '' : ''));
    const bg = toHex(el.style?.backgroundColor ?? '');
    if (bg) inner = `{h:${bg}|${inner}}`;
    if (fg) inner = `{c:${fg}|${inner}}`;
    return inner;
  };
  const children = (node: Node): string => Array.from(node.childNodes).map(inline).join('');

  const listItems = (list: HTMLElement, ordered: boolean, out: string[]) => {
    Array.from(list.children).forEach((li, i) => {
      if (li.nodeName !== 'LI') return;
      const box = li.querySelector('.md-checkbox');
      // Serialise the checkbox from its own state, then skip it as content.
      const text = Array.from(li.childNodes)
        .filter((c) => !(c.nodeType === Node.ELEMENT_NODE && (c as HTMLElement).classList?.contains('md-checkbox')))
        .map(inline)
        .join('')
        .trim();
      if (box) out.push(`- [${box.classList.contains('done') ? 'x' : ' '}] ${text}`);
      else out.push(ordered ? `${i + 1}. ${text}` : `- ${text}`);
    });
  };

  const out: string[] = [];
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.nodeValue ?? '').trim();
      if (t) {
        out.push(t);
        out.push('');
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    switch (el.nodeName) {
      case 'H1': out.push('# ' + children(el)); out.push(''); break;
      case 'H2': out.push('## ' + children(el)); out.push(''); break;
      case 'H3': case 'H4': case 'H5': case 'H6':
        out.push('### ' + children(el)); out.push(''); break;
      case 'UL': listItems(el, false, out); out.push(''); break;
      case 'OL': listItems(el, true, out); out.push(''); break;
      case 'BLOCKQUOTE':
        children(el).split('\n').forEach((l) => out.push('> ' + l));
        out.push(''); break;
      case 'PRE':
        out.push('```');
        out.push((el.textContent ?? '').replace(/\n$/, ''));
        out.push('```');
        out.push(''); break;
      case 'HR': out.push('---'); out.push(''); break;
      case 'BR': out.push(''); break;
      default:
        // P, DIV and whatever else the browser produced for a line.
        inline(el).split('\n').forEach((l) => out.push(l));
        out.push('');
    }
  });

  // Collapse the runs of blank lines the per-block padding leaves behind.
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
}
