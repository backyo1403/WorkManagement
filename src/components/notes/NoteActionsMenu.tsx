'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { noteTitle } from '@/lib/notes';
import type { NoteDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

interface Action {
  key: string;
  icon: string;
  label: string;
  danger?: boolean;
  run: () => void | Promise<void>;
}

/**
 * The ••• menu. Destructive entries are separated and "Xoá" moves the note to
 * the trash rather than erasing it — permanent deletion only happens from the
 * trash view, where the consequence is unambiguous.
 */
export function NoteActionsMenu({
  note,
  onRename,
  onVersions,
}: {
  note: NoteDTO;
  onRename: () => void;
  onVersions: () => void;
}) {
  const { updateNote, createNote, deleteNoteForever, setNoteTaskLink } = useData();
  const { t } = usePrefs();
  const toast = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  const duplicate = async () => {
    const copy = await createNote({
      title: `${noteTitle(note)} (bản sao)`,
      content: note.content,
      notebookId: note.notebookId,
      projectId: note.projectId,
      groupKey: note.groupKey,
      authorId: note.authorId,
      templateKey: note.templateKey,
      hashtags: note.hashtags,
    });
    if (!copy) return;
    // Carry the task links across too — the copy is about the same work.
    for (const taskId of note.linkedTaskIds) await setNoteTaskLink(copy.id, taskId, true);
    toast('Đã nhân bản ghi chú');
    router.push(`/notes/${copy.id}`);
  };

  const exportMarkdown = () => {
    const front = [
      `# ${noteTitle(note)}`,
      note.hashtags.length ? note.hashtags.map((h) => `#${h}`).join(' ') : '',
      '',
    ]
      .filter((l) => l !== '')
      .join('\n');
    const blob = new Blob([`${front}\n${note.content}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${noteTitle(note).replace(/[\\/:*?"<>|]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Đã xuất Markdown');
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/notes/${note.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Đã copy link ghi chú');
    } catch {
      // Clipboard access can be denied; show the link so it can be copied by hand.
      window.prompt('Copy link ghi chú:', url);
    }
  };

  const actions: Action[] = [
    { key: 'rename', icon: 'edit', label: 'Đổi tên', run: onRename },
    { key: 'duplicate', icon: 'archive', label: 'Nhân bản', run: duplicate },
    {
      key: 'favorite',
      icon: note.favorite ? 'star-filled' : 'star',
      label: note.favorite ? 'Bỏ yêu thích' : 'Yêu thích',
      run: async () => {
        await updateNote(note.id, { favorite: !note.favorite });
        toast(note.favorite ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích');
      },
    },
    { key: 'versions', icon: 'clock', label: 'Lịch sử phiên bản', run: onVersions },
    { key: 'link', icon: 'link', label: 'Copy link', run: copyLink },
    { key: 'export', icon: 'download', label: 'Xuất Markdown', run: exportMarkdown },
    {
      key: 'print',
      icon: 'upload',
      label: 'In / Lưu PDF',
      // The browser's print dialog is the PDF export — no extra dependency,
      // and it renders the same styles the preview uses.
      run: () => window.print(),
    },
    {
      key: 'archive',
      icon: 'archive',
      label: note.archived ? 'Bỏ lưu trữ' : 'Lưu trữ',
      run: async () => {
        await updateNote(note.id, { archived: !note.archived });
        toast(note.archived ? 'Đã bỏ lưu trữ' : 'Đã lưu trữ ghi chú');
      },
    },
  ];

  if (note.deletedAt) {
    actions.push({
      key: 'restore',
      icon: 'refresh',
      label: 'Khôi phục',
      run: async () => {
        await updateNote(note.id, { trashed: false });
        toast('Đã khôi phục ghi chú');
      },
    });
    actions.push({
      key: 'purge',
      icon: 'trash',
      label: 'Xoá vĩnh viễn',
      danger: true,
      run: async () => {
        if (!confirm(`Xoá vĩnh viễn "${noteTitle(note)}"? Không thể hoàn tác.`)) return;
        if (await deleteNoteForever(note.id)) {
          toast('Đã xoá ghi chú');
          router.push('/notes?view=trash');
        }
      },
    });
  } else {
    actions.push({
      key: 'trash',
      icon: 'trash',
      label: 'Chuyển vào thùng rác',
      danger: true,
      run: async () => {
        await updateNote(note.id, { trashed: true });
        toast('Đã chuyển vào thùng rác');
      },
    });
  }

  return (
    <div className="note-menu-wrap" ref={boxRef}>
      <button
        type="button"
        className="btn-icon"
        title={t('Hành động')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="dots" size={15} />
      </button>

      {open && (
        <div className="note-menu">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`note-menu-item${a.danger ? ' danger' : ''}`}
              onClick={() => {
                setOpen(false);
                void a.run();
              }}
            >
              <Icon name={a.icon} size={14} /> {t(a.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
