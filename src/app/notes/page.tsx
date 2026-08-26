'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/primitives';
import { NoteCard } from '@/components/notes/NoteCard';
import { NotebookUnlock } from '@/components/notes/NotebookUnlock';
import { NotesRail } from '@/components/notes/NotesRail';
import { NOTE_TEMPLATES } from '@/lib/note-templates';
import { noteMatches, notesForView } from '@/lib/notes';
import type { NoteView } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

const VIEW_TITLES: Record<NoteView, string> = {
  all: 'Tất cả ghi chú',
  recent: 'Gần đây',
  favorites: 'Yêu thích',
  templates: 'Mẫu ghi chú',
  archive: 'Lưu trữ',
  trash: 'Thùng rác',
  notebook: 'Sổ tay',
  tag: 'Thẻ',
};

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="empty-state">Đang tải…</div>}>
      <NotesHome />
    </Suspense>
  );
}

function NotesHome() {
  const { notes, notebooks, projects, tasks, createNote } = useData();
  const { group, t } = usePrefs();
  const { user } = useAuth();
  const { isUnlocked } = useNotebookLocks();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();

  const view = (params.get('view') as NoteView) || 'all';
  const arg = params.get('id') ?? params.get('tag') ?? undefined;
  const [query, setQuery] = useState('');

  const activeNotebook = view === 'notebook' ? notebooks.find((n) => n.id === arg) ?? null : null;
  const notebookSealed = !!activeNotebook?.locked && !isUnlocked(activeNotebook.id);

  const list = useMemo(() => {
    const base = notesForView(notes, group, view, arg);
    const needle = query.trim();
    if (!needle) return base;
    return base.filter((n) =>
      noteMatches(n, needle, {
        notebooks,
        projectName: projects.find((p) => p.id === n.projectId)?.name,
        tasks,
      }),
    );
  }, [notes, group, view, arg, query, notebooks, projects, tasks]);

  const go = (nextView: NoteView, nextArg?: string) => {
    const qs = new URLSearchParams();
    if (nextView !== 'all') qs.set('view', nextView);
    if (nextArg) qs.set(nextView === 'tag' ? 'tag' : 'id', nextArg);
    router.push(qs.toString() ? `/notes?${qs}` : '/notes');
  };

  const newNote = async (templateKey = 'blank') => {
    const template = NOTE_TEMPLATES.find((x) => x.key === templateKey);
    const note = await createNote({
      title: template?.title ?? '',
      content: template?.content ?? '',
      // A note created inside a notebook stays there; templates start loose.
      notebookId: view === 'notebook' ? arg ?? null : null,
      groupKey: group || 'work',
      authorId: user?.id ?? null,
      templateKey: templateKey === 'blank' ? null : templateKey,
      hashtags: view === 'tag' && arg ? [arg] : [],
    });
    if (note) {
      toast('Đã tạo ghi chú mới');
      router.push(`/notes/${note.id}`);
    }
  };

  const heading = activeNotebook ? activeNotebook.name : view === 'tag' ? `#${arg}` : VIEW_TITLES[view];

  return (
    <div className="view-enter notes-layout">
      <NotesRail view={view} arg={arg} onSelect={go} />

      <div className="notes-main">
        <PageHeader
          title={heading}
          icon={activeNotebook ? activeNotebook.icon : 'edit'}
          actions={
            <>
              <div className="search-box">
                <div className="search-input-wrap">
                  <span className="srch-ico">
                    <Icon name="search" size={15} />
                  </span>
                  <input
                    type="text"
                    value={query}
                    placeholder={t('Tìm ghi chú…')}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => void newNote()}>
                <Icon name="plus" size={15} /> {t('Ghi chú mới')}
              </button>
            </>
          }
        />

        {view === 'templates' ? (
          <TemplateGrid onPick={(key) => void newNote(key)} />
        ) : notebookSealed && activeNotebook ? (
          <NotebookUnlock notebook={activeNotebook} />
        ) : list.length === 0 ? (
          <EmptyNotes view={view} query={query} onCreate={() => void newNote()} />
        ) : (
          <>
            <div className="list-meta">{t(`${list.length} ghi chú`)}</div>
            <div className="note-grid">
              {list.map((note) => (
                <NoteCard key={note.id} note={note} onOpen={() => router.push(`/notes/${note.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TemplateGrid({ onPick }: { onPick: (key: string) => void }) {
  const { t } = usePrefs();
  return (
    <>
      <div className="list-meta">
        {t('Chọn một mẫu để tạo ghi chú mới — nội dung vẫn sửa được sau khi tạo.')}
      </div>
      <div className="template-grid">
        {NOTE_TEMPLATES.map((tpl) => (
          <button key={tpl.key} type="button" className="template-card" onClick={() => onPick(tpl.key)}>
            <span className="template-icon">
              <Icon name={tpl.icon} size={17} />
            </span>
            <span className="template-name">{tpl.name}</span>
            {tpl.outline.length > 0 ? (
              <ul className="template-outline">
                {tpl.outline.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            ) : (
              <span className="template-outline empty">{t('Trang trắng để tự do viết')}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function EmptyNotes({
  view,
  query,
  onCreate,
}: {
  view: NoteView;
  query: string;
  onCreate: () => void;
}) {
  const { t } = usePrefs();

  if (query.trim()) {
    return (
      <div className="note-empty">
        <Icon name="search" size={28} />
        <div className="note-empty-title">{t('Không tìm thấy ghi chú nào')}</div>
        <p>{t('Thử từ khoá khác, hoặc gõ #thẻ để lọc theo hashtag.')}</p>
      </div>
    );
  }

  const copy: Partial<Record<NoteView, { title: string; body: string }>> = {
    trash: { title: 'Thùng rác trống', body: 'Ghi chú đã xoá sẽ nằm ở đây trước khi bị xoá vĩnh viễn.' },
    archive: { title: 'Chưa lưu trữ ghi chú nào', body: 'Ghi chú đã xong việc có thể được lưu trữ để danh sách gọn hơn.' },
    favorites: { title: 'Chưa có ghi chú yêu thích', body: 'Đánh dấu sao những ghi chú bạn hay mở để tìm lại nhanh.' },
  };
  const c = copy[view];

  return (
    <div className="note-empty">
      <Icon name="edit" size={28} />
      <div className="note-empty-title">{t(c?.title ?? 'Chưa có ghi chú nào')}</div>
      <p>{t(c?.body ?? 'Ghi lại ý tưởng, biên bản họp và những thông tin quan trọng.')}</p>
      {!c && (
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <Icon name="plus" size={15} /> {t('Tạo ghi chú đầu tiên')}
        </button>
      )}
    </div>
  );
}
