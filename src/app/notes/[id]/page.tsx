'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/primitives';
import { TaskModal } from '@/components/task/TaskModal';
import { LinkedTasks } from '@/components/notes/LinkedTasks';
import { MarkdownEditor, type EditorHandle } from '@/components/notes/MarkdownEditor';
import { NoteActionsMenu } from '@/components/notes/NoteActionsMenu';
import { NoteDetails } from '@/components/notes/NoteDetails';
import { NotebookUnlock } from '@/components/notes/NotebookUnlock';
import { VersionHistoryModal } from '@/components/notes/VersionHistoryModal';
import { parseChecklist } from '@/lib/markdown';
import { noteTitle, relativeTime } from '@/lib/notes';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** Autosave delay. Long enough not to write on every keystroke. */
const AUTOSAVE_MS = 500;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { notes, notebooks, tasks, updateNote, convertChecklist, createTask, setNoteTaskLink } =
    useData();
  const { t } = usePrefs();
  const { user } = useAuth();
  const { isUnlocked } = useNotebookLocks();
  const toast = useToast();

  const note = notes.find((n) => n.id === params.id) ?? null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showVersions, setShowVersions] = useState(false);
  const [taskModal, setTaskModal] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'tasks' | 'details'>('none');

  const editorRef = useRef<EditorHandle>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guards against the note prop overwriting text the user is still typing. */
  const loadedIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  // Load the note into local state once per note, not on every store update —
  // otherwise each autosave response would rewind the caret.
  useEffect(() => {
    if (!note || loadedIdRef.current === note.id) return;
    loadedIdRef.current = note.id;
    setTitle(note.title);
    setContent(note.content);
    dirtyRef.current = false;
    setSaveState('idle');
  }, [note]);

  const flush = useCallback(
    async (nextTitle: string, nextContent: string) => {
      if (!note) return;
      setSaveState('saving');
      const ok = await updateNote(note.id, { title: nextTitle, content: nextContent });
      dirtyRef.current = false;
      setSaveState(ok ? 'saved' : 'dirty');
      if (ok) setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1600);
    },
    [note, updateNote],
  );

  const queueSave = useCallback(
    (nextTitle: string, nextContent: string) => {
      dirtyRef.current = true;
      setSaveState('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(nextTitle, nextContent), AUTOSAVE_MS);
    },
    [flush],
  );

  // Never lose text on navigation: flush whatever is pending on unmount, and
  // warn if the tab is closing mid-save.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current && loadedIdRef.current) {
        // Fire-and-forget: the component is going away but the write still lands.
        void fetch(`/api/notes/${loadedIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleRef.current, content: contentRef.current }),
          keepalive: true,
        });
      }
    };
  }, []);

  // Mirrors for the unmount flush above, which cannot read React state.
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  titleRef.current = title;
  contentRef.current = content;

  const checklist = useMemo(() => parseChecklist(content), [content]);
  const linkedTitles = useMemo(
    () =>
      new Set(
        tasks
          .filter((x) => note?.linkedTaskIds.includes(x.id))
          .map((x) => x.title.trim().toLowerCase()),
      ),
    [tasks, note],
  );
  const unconverted = checklist.filter((c) => !linkedTitles.has(c.text.toLowerCase()));

  if (!note) {
    return (
      <EmptyState icon="edit">
        <div style={{ marginTop: 8 }}>{t('Không tìm thấy ghi chú này.')}</div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => router.push('/notes')}
        >
          ← {t('Danh sách ghi chú')}
        </button>
      </EmptyState>
    );
  }

  const notebook = notebooks.find((n) => n.id === note.notebookId) ?? null;
  if (notebook?.locked && !isUnlocked(notebook.id)) {
    return <NotebookUnlock notebook={notebook} />;
  }

  const convert = async () => {
    if (!unconverted.length) {
      toast('Mọi mục checklist đã được tạo thành nhiệm vụ');
      return;
    }
    const result = await convertChecklist(note.id, checklist.map((c) => c.text), {
      creatorId: user?.id ?? null,
    });
    if (!result) return;
    toast(
      result.skipped
        ? `Đã tạo ${result.created} nhiệm vụ · bỏ qua ${result.skipped} mục đã có`
        : `Đã tạo ${result.created} nhiệm vụ từ checklist`,
    );
  };

  const createFromSelection = async () => {
    const selected = editorRef.current?.getSelection() ?? '';
    if (!selected) {
      toast('Bôi đen đoạn văn bản muốn biến thành nhiệm vụ');
      return;
    }
    // Keep titles short: one line, trimmed of list markers.
    const taskTitle = selected.split('\n')[0].replace(/^\s*[-*+]\s*(\[[ xX]\])?\s*/, '').slice(0, 120);
    const task = await createTask({
      title: taskTitle,
      status: 'TODO',
      groupKey: note.groupKey,
      projectId: note.projectId,
      creatorId: user?.id ?? null,
      activity: `Tạo từ ghi chú "${noteTitle(note)}"`,
    });
    if (task) {
      await setNoteTaskLink(note.id, task.id, true);
      toast(`Đã tạo nhiệm vụ "${taskTitle}"`);
    }
  };

  const saveLabel: Record<SaveState, string> = {
    idle: `Sửa ${relativeTime(note.updatedAt)}`,
    dirty: 'Chưa lưu…',
    saving: 'Đang lưu…',
    saved: 'Đã lưu',
  };

  return (
    <div className="view-enter note-editor-layout">
      <div className="note-editor-main">
        <div className="note-editor-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push('/notes')}>
            ← {t('Ghi chú')}
          </button>

          <div className="note-editor-actions">
            <span className={`note-save-state ${saveState}`}>
              {saveState === 'saved' && <Icon name="check" size={12} />}
              {t(saveLabel[saveState])}
            </span>
            <button
              type="button"
              className={`btn-icon${note.favorite ? ' pinned' : ''}`}
              title={t(note.favorite ? 'Bỏ yêu thích' : 'Yêu thích')}
              onClick={() => void updateNote(note.id, { favorite: !note.favorite })}
            >
              <Icon name={note.favorite ? 'star-filled' : 'star'} size={15} />
            </button>
            <NoteActionsMenu
              note={note}
              onRename={() => document.getElementById('note-title-input')?.focus()}
              onVersions={() => setShowVersions(true)}
            />
          </div>
        </div>

        {note.deletedAt && (
          <div className="badge overdue" style={{ display: 'block', padding: '9px 12px', marginBottom: 12 }}>
            🗑️ {t('Ghi chú này đang ở thùng rác.')}{' '}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 8 }}
              onClick={async () => {
                await updateNote(note.id, { trashed: false });
                toast('Đã khôi phục ghi chú');
              }}
            >
              {t('Khôi phục')}
            </button>
          </div>
        )}

        <input
          id="note-title-input"
          className="note-title-input"
          value={title}
          placeholder={t('Tiêu đề ghi chú')}
          onChange={(e) => {
            setTitle(e.target.value);
            queueSave(e.target.value, content);
          }}
        />

        <MarkdownEditor
          ref={editorRef}
          value={content}
          onChange={(next) => {
            setContent(next);
            queueSave(title, next);
          }}
          onSave={() => void flush(title, content)}
          onNeedSelection={() => toast('Bôi đen đoạn chữ muốn đổi màu')}
        />

        <div className="note-quick-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void createFromSelection()}>
            <Icon name="plus" size={13} /> {t('Tạo nhiệm vụ từ đoạn đã chọn')}
          </button>
          {checklist.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={unconverted.length === 0}
              title={
                unconverted.length === 0
                  ? t('Mọi mục checklist đã được tạo thành nhiệm vụ')
                  : undefined
              }
              onClick={() => void convert()}
            >
              <Icon name="check" size={13} />{' '}
              {unconverted.length === 0
                ? t('Checklist đã chuyển hết')
                : `${t('Chuyển checklist thành nhiệm vụ')} (${unconverted.length})`}
            </button>
          )}
        </div>

        {/* On narrow screens the side panels collapse into these sections. */}
        <div className="note-mobile-panels">
          <button
            type="button"
            className="note-panel-toggle"
            onClick={() => setMobilePanel((p) => (p === 'tasks' ? 'none' : 'tasks'))}
          >
            <Icon name="link" size={14} /> {t('Nhiệm vụ liên kết')}
            <em>{note.linkedTaskIds.length}</em>
            <Icon name="chevron" size={13} className={mobilePanel === 'tasks' ? 'open' : ''} />
          </button>
          {mobilePanel === 'tasks' && <LinkedTasks note={note} onOpenTask={setTaskModal} />}

          <button
            type="button"
            className="note-panel-toggle"
            onClick={() => setMobilePanel((p) => (p === 'details' ? 'none' : 'details'))}
          >
            <Icon name="settings" size={14} /> {t('Thông tin')}
            <Icon name="chevron" size={13} className={mobilePanel === 'details' ? 'open' : ''} />
          </button>
          {mobilePanel === 'details' && <NoteDetails note={note} />}
        </div>
      </div>

      <aside className="note-side">
        <LinkedTasks note={note} onOpenTask={setTaskModal} />
        <NoteDetails note={note} />
      </aside>

      {showVersions && <VersionHistoryModal note={note} onClose={() => setShowVersions(false)} />}
      {taskModal && <TaskModal taskId={taskModal} onClose={() => setTaskModal(null)} />}
    </div>
  );
}
