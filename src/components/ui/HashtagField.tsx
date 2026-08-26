'use client';

import { useMemo, useState } from 'react';
import { normalizeTag } from '@/lib/domain';
import { useData } from '@/state/DataProvider';

/**
 * Hashtag editor: chips plus an input that autosuggests from every tag ever
 * used. Enter or comma commits, Backspace on an empty input removes the last
 * chip. Tags are normalised (lowercase, dashes, no leading #) so `#Chạy Bộ` and
 * `chay-bo` never become two different tags.
 */
export function HashtagField({
  tags,
  onChange,
  label = '# Hashtag',
  hint = 'gõ để tìm nhanh trong ô tìm kiếm',
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const { hashtags } = useData();
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const p = normalizeTag(draft);
    return hashtags.filter((h) => !tags.includes(h) && (!p || h.startsWith(p))).slice(0, 8);
  }, [hashtags, tags, draft]);

  const add = (raw: string) => {
    const n = normalizeTag(raw);
    if (n && !tags.includes(n)) onChange([...tags, n]);
    setDraft('');
  };

  return (
    <div className="field">
      <label>
        {label}{' '}
        <span style={{ fontWeight: 500, color: 'var(--text-3)' }}>{hint}</span>
      </label>
      <div className="hashtag-box">
        {tags.map((tag) => (
          <span className="hashtag-chip" key={tag}>
            #{tag}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== tag))}>
              ✕
            </button>
          </span>
        ))}
        <div className="hashtag-input-wrap">
          <input
            type="text"
            value={draft}
            placeholder="# thêm hashtag…"
            autoComplete="off"
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            // Delay so a click on a suggestion registers before the list closes.
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(draft);
              } else if (e.key === 'Backspace' && !draft && tags.length) {
                onChange(tags.slice(0, -1));
              }
            }}
          />
          <div className={`hashtag-suggest${open && draft.trim() && suggestions.length ? ' open' : ''}`}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                }}
              >
                #{s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HashtagChips({ tags, max }: { tags: string[]; max?: number }) {
  if (!tags.length) return null;
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <>
      {shown.map((t) => (
        <span className="hashtag-mini" key={t}>
          #{t}
        </span>
      ))}
      {max && tags.length > max && <span className="hashtag-mini">+{tags.length - max}</span>}
    </>
  );
}
