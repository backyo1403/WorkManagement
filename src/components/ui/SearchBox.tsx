'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { HashtagChips } from './HashtagField';
import { PriorityPill } from './primitives';
import { fmtDDMMM } from '@/lib/domain';
import { liveNotes, noteMatches, noteTitle } from '@/lib/notes';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';
import type { ProjectDTO, TaskDTO } from '@/lib/types';

/**
 * Matches title / description / project name AND hashtags.
 * A leading `#` restricts the match to hashtags only.
 */
export function taskMatches(t: TaskDTO, q: string, project: ProjectDTO | null): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const tags = t.hashtags.map((x) => x.toLowerCase());

  if (needle.startsWith('#')) {
    const tag = needle.slice(1).replace(/\s+/g, '-');
    return tag ? tags.some((x) => x.includes(tag)) : tags.length > 0;
  }

  const projTags = (project?.hashtags ?? []).map((x) => x.toLowerCase());
  return (
    [t.title, t.description, project?.name ?? ''].some((v) => v.toLowerCase().includes(needle)) ||
    tags.some((x) => x.includes(needle)) ||
    projTags.some((x) => x.includes(needle))
  );
}

export function projectMatches(p: ProjectDTO, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const tags = p.hashtags.map((x) => x.toLowerCase());

  if (needle.startsWith('#')) {
    const tag = needle.slice(1).replace(/\s+/g, '-');
    return tag ? tags.some((x) => x.includes(tag)) : tags.length > 0;
  }
  return (
    [p.name, p.description, p.goal].some((v) => v.toLowerCase().includes(needle)) ||
    tags.some((x) => x.includes(needle))
  );
}

/**
 * Global search across projects and tasks in the active group. Typing `#`
 * surfaces matching hashtags first so one can be picked to filter by.
 */
export function SearchBox({
  placeholder = 'Tìm kiếm nhiệm vụ…',
  onOpenTask,
}: {
  placeholder?: string;
  onOpenTask?: (id: string) => void;
}) {
  const { tasks, projects, hashtags, notes, notebooks } = useData();
  const { group, t } = usePrefs();
  const { isUnlocked } = useNotebookLocks();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim();
    if (!needle) return null;

    const byId = new Map(projects.map((p) => [p.id, p]));
    const liveTasks = tasks.filter((x) => !x.archived && (!group || x.groupKey === group));

    const tagHits = needle.startsWith('#')
      ? hashtags
          .filter((h) => h.startsWith(needle.slice(1).replace(/\s+/g, '-').toLowerCase()))
          .slice(0, 6)
      : [];

    // Notes in a locked notebook are excluded entirely — matching on their
    // content would leak it through the result list.
    const noteHits = liveNotes(notes, group)
      .filter((n) => {
        const nb = notebooks.find((x) => x.id === n.notebookId);
        return !(nb?.locked && !isUnlocked(nb.id));
      })
      .filter((n) =>
        noteMatches(n, needle, {
          notebooks,
          projectName: byId.get(n.projectId ?? '')?.name,
          tasks,
        }),
      )
      .slice(0, 6);

    return {
      tags: tagHits,
      projects: projects.filter((p) => projectMatches(p, needle)).slice(0, 4),
      tasks: liveTasks.filter((x) => taskMatches(x, needle, byId.get(x.projectId ?? '') ?? null)).slice(0, 8),
      notes: noteHits,
    };
  }, [q, tasks, projects, hashtags, group, notes, notebooks, isUnlocked]);

  const empty =
    results &&
    !results.tags.length &&
    !results.projects.length &&
    !results.tasks.length &&
    !results.notes.length;

  return (
    <div className={`search-box${open && results ? ' open' : ''}`} ref={boxRef}>
      <div className="search-input-wrap">
        <span className="srch-ico">
          <Icon name="search" size={15} />
        </span>
        <input
          type="text"
          value={q}
          placeholder={t(placeholder)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      <div className="search-results">
        {results?.tags.length ? (
          <>
            <div className="search-group">HASHTAG</div>
            {results.tags.map((tag) => (
              <div className="search-result-row" key={tag} onClick={() => setQ('#' + tag)}>
                <span className="hashtag-mini">#{tag}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-3)' }}>
                  {t(`${tasks.filter((x) => x.hashtags.includes(tag)).length} nhiệm vụ`)} ·{' '}
                  {t(`${projects.filter((p) => p.hashtags.includes(tag)).length} dự án`)}
                </span>
              </div>
            ))}
          </>
        ) : null}

        {results?.projects.length ? (
          <>
            <div className="search-group">{t('Dự án').toUpperCase()}</div>
            {results.projects.map((p) => (
              <div
                className="search-result-row"
                key={p.id}
                onClick={() => {
                  setQ('');
                  setOpen(false);
                  router.push(`/projects/${p.id}`);
                }}
              >
                <Icon name={p.icon} size={15} />
                <span
                  style={{
                    flex: 1, minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {p.name}
                </span>
                <HashtagChips tags={p.hashtags} max={2} />
              </div>
            ))}
          </>
        ) : null}

        {results?.tasks.length ? (
          <>
            <div className="search-group">{t('Nhiệm vụ').toUpperCase()}</div>
            {results.tasks.map((x) => (
              <div
                className="search-result-row"
                key={x.id}
                onClick={() => {
                  setQ('');
                  setOpen(false);
                  if (onOpenTask) onOpenTask(x.id);
                  else router.push(`/tasks?open=${x.id}`);
                }}
              >
                <PriorityPill priority={x.priority} />
                <span
                  style={{
                    flex: 1, minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {x.title}
                </span>
                <HashtagChips tags={x.hashtags} max={2} />
                {x.deadline && <span className="badge">{fmtDDMMM(x.deadline)}</span>}
              </div>
            ))}
          </>
        ) : null}

        {results?.notes.length ? (
          <>
            <div className="search-group">{t('Ghi chú').toUpperCase()}</div>
            {results.notes.map((n) => (
              <div
                className="search-result-row"
                key={n.id}
                onClick={() => {
                  setQ('');
                  setOpen(false);
                  router.push(`/notes/${n.id}`);
                }}
              >
                <Icon name="edit" size={14} />
                <span
                  style={{
                    flex: 1, minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {noteTitle(n)}
                </span>
                <HashtagChips tags={n.hashtags} max={2} />
                {n.linkedTaskIds.length > 0 && (
                  <span className="badge">
                    <Icon name="link" size={11} /> {n.linkedTaskIds.length}
                  </span>
                )}
              </div>
            ))}
          </>
        ) : null}

        {empty && (
          <div style={{ padding: 12, fontSize: 12.5, color: 'var(--text-3)' }}>
            Không tìm thấy kết quả phù hợp
          </div>
        )}
      </div>
    </div>
  );
}
