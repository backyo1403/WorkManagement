'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useToast } from './ToastProvider';
import type {
  BootstrapDTO,
  NoteDTO,
  NotebookDTO,
  PersonDTO,
  ProjectDTO,
  SettingsDTO,
  TaskDTO,
  WorkflowDTO,
} from '@/lib/types';

/**
 * The workspace, loaded once and kept in memory.
 *
 * Every mutation goes to the API and merges the row the server returns back into
 * this store, so the server stays the single source of truth for derived fields
 * (completion, completedAt, the task→project group cascade) while the UI still
 * updates without a full refetch.
 */

interface DataValue extends BootstrapDTO {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;

  // task writes
  createTask: (body: Record<string, unknown>) => Promise<TaskDTO | null>;
  updateTask: (id: string, body: Record<string, unknown>) => Promise<TaskDTO | null>;
  deleteTask: (id: string) => Promise<boolean>;
  updateSubtask: (id: string, body: Record<string, unknown>) => Promise<TaskDTO | null>;
  addComment: (taskId: string, text: string, authorId: string | null) => Promise<TaskDTO | null>;

  // project writes
  createProject: (body: Record<string, unknown>) => Promise<ProjectDTO | null>;
  updateProject: (id: string, body: Record<string, unknown>) => Promise<ProjectDTO | null>;
  deleteProject: (id: string) => Promise<boolean>;

  // people & workflows
  createPerson: (body: Record<string, unknown>) => Promise<PersonDTO | null>;
  updatePerson: (id: string, body: Record<string, unknown>) => Promise<PersonDTO | null>;
  deletePerson: (id: string) => Promise<boolean>;
  createWorkflow: (body: Record<string, unknown>) => Promise<WorkflowDTO | null>;
  updateWorkflow: (id: string, body: Record<string, unknown>) => Promise<WorkflowDTO | null>;
  deleteWorkflow: (id: string) => Promise<boolean>;

  saveSettings: (body: Record<string, unknown>) => Promise<SettingsDTO | null>;
  resetAll: (confirm: string) => Promise<boolean>;

  // notes
  createNote: (body: Record<string, unknown>) => Promise<NoteDTO | null>;
  updateNote: (id: string, body: Record<string, unknown>) => Promise<NoteDTO | null>;
  deleteNoteForever: (id: string) => Promise<boolean>;
  /** Link or unlink one note↔task pair. The join row is the only state. */
  setNoteTaskLink: (noteId: string, taskId: string, linked: boolean) => Promise<NoteDTO | null>;
  convertChecklist: (
    noteId: string,
    items: string[],
    extra?: Record<string, unknown>,
  ) => Promise<{ created: number; skipped: number } | null>;
  restoreNoteVersion: (noteId: string, versionId: string) => Promise<NoteDTO | null>;
  addAttachment: (noteId: string, body: Record<string, unknown>) => Promise<NoteDTO | null>;
  removeAttachment: (noteId: string, attachmentId: string) => Promise<NoteDTO | null>;
  createNotebook: (body: Record<string, unknown>) => Promise<NotebookDTO | null>;
  updateNotebook: (id: string, body: Record<string, unknown>) => Promise<NotebookDTO | null>;
  deleteNotebook: (id: string) => Promise<boolean>;
}

const EMPTY_SETTINGS: SettingsDTO = {
  companyName: 'Bach Office',
  companyTagline: 'Làm việc thông minh hơn',
  workStartHour: 9,
  workEndHour: 18,
  autoLockMinutes: 15,
  autoArchiveDays: 30,
  reminderDaysBefore: 2,
  reminderTime: '08:00',
  reminderPerDay: 1,
  telegramBotToken: '',
  telegramTestChatId: '',
  zaloBotToken: '',
  zaloTestUserId: '',
  language: 'vi',
  theme: 'light',
  dashboardLayout: [],
  dashboardHidden: [],
};

const DataCtx = createContext<DataValue | null>(null);

export function useData() {
  const v = useContext(DataCtx);
  if (!v) throw new Error('useData must be used inside <DataProvider>');
  return v;
}

/** Upserts `row` into `list`, keeping the original position when it exists. */
function upsert<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const out = [...list];
  out[i] = row;
  return out;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [data, setData] = useState<BootstrapDTO>({
    people: [],
    workflows: [],
    projects: [],
    tasks: [],
    hashtags: [],
    settings: EMPTY_SETTINGS,
    notes: [],
    notebooks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sweptRef = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' });
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      setData((await res.json()) as BootstrapDTO);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Run the auto-archive sweep once per session, after the data is in.
  useEffect(() => {
    if (loading || sweptRef.current || !data.tasks.length) return;
    sweptRef.current = true;
    void (async () => {
      try {
        const res = await fetch('/api/archive-sweep', { method: 'POST' });
        const body = (await res.json()) as { archived: number; tasks: TaskDTO[] };
        if (body.archived > 0) {
          setData((d) => ({
            ...d,
            tasks: body.tasks.reduce((acc, t) => upsert(acc, t), d.tasks),
          }));
          toast(`Đã lưu trữ ${body.archived} nhiệm vụ hoàn thành cũ`);
        }
      } catch {
        // A failed sweep is harmless — nothing is hidden, so stay quiet.
      }
    })();
  }, [loading, data.tasks.length, toast]);

  /**
   * Single place where API errors surface. Returns null on failure so callers
   * can bail out without each of them re-implementing error handling.
   */
  const send = useCallback(
    async <T,>(url: string, init: RequestInit): Promise<T | null> => {
      try {
        const res = await fetch(url, {
          ...init,
          headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast((body as { error?: string }).error ?? 'Thao tác không thành công');
          return null;
        }
        return body as T;
      } catch {
        toast('Mất kết nối tới máy chủ');
        return null;
      }
    },
    [toast],
  );

  /** Newly-typed hashtags need to appear in the autosuggest immediately. */
  const mergeTags = useCallback((tags: string[]) => {
    setData((d) => {
      const missing = tags.filter((t) => !d.hashtags.includes(t));
      return missing.length ? { ...d, hashtags: [...d.hashtags, ...missing].sort() } : d;
    });
  }, []);

  const applyTask = useCallback(
    (task: TaskDTO) => {
      setData((d) => ({ ...d, tasks: upsert(d.tasks, task) }));
      mergeTags(task.hashtags);
    },
    [mergeTags],
  );

  // ─────────────────────────── tasks ───────────────────────────

  const createTask = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ task: TaskDTO }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) applyTask(r.task);
      return r?.task ?? null;
    },
    [send, applyTask],
  );

  const updateTask = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ task: TaskDTO }>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) applyTask(r.task);
      return r?.task ?? null;
    },
    [send, applyTask],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });
      if (r) setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
      return !!r;
    },
    [send],
  );

  const updateSubtask = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ task: TaskDTO }>(`/api/subtasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) applyTask(r.task);
      return r?.task ?? null;
    },
    [send, applyTask],
  );

  const addComment = useCallback(
    async (taskId: string, text: string, authorId: string | null) => {
      const r = await send<{ task: TaskDTO }>(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, authorId }),
      });
      if (r) applyTask(r.task);
      return r?.task ?? null;
    },
    [send, applyTask],
  );

  // ─────────────────────────── projects ───────────────────────────

  const createProject = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ project: ProjectDTO }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) {
        setData((d) => ({ ...d, projects: upsert(d.projects, r.project) }));
        mergeTags(r.project.hashtags);
      }
      return r?.project ?? null;
    },
    [send, mergeTags],
  );

  const updateProject = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ project: ProjectDTO; tasks: TaskDTO[] }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) {
        setData((d) => ({
          ...d,
          projects: upsert(d.projects, r.project),
          // Non-empty only when the project changed group and dragged its tasks.
          tasks: r.tasks.reduce((acc, t) => upsert(acc, t), d.tasks),
        }));
        mergeTags(r.project.hashtags);
      }
      return r?.project ?? null;
    },
    [send, mergeTags],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean; tasks: TaskDTO[] }>(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (r) {
        setData((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          tasks: r.tasks.reduce((acc, t) => upsert(acc, t), d.tasks),
        }));
      }
      return !!r;
    },
    [send],
  );

  // ─────────────────────────── people & workflows ───────────────────────────

  const createPerson = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ person: PersonDTO }>('/api/people', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, people: upsert(d.people, r.person) }));
      return r?.person ?? null;
    },
    [send],
  );

  const updatePerson = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ person: PersonDTO }>(`/api/people/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, people: upsert(d.people, r.person) }));
      return r?.person ?? null;
    },
    [send],
  );

  const deletePerson = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean }>(`/api/people/${id}`, { method: 'DELETE' });
      if (r) setData((d) => ({ ...d, people: d.people.filter((p) => p.id !== id) }));
      return !!r;
    },
    [send],
  );

  const createWorkflow = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ workflow: WorkflowDTO }>('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, workflows: upsert(d.workflows, r.workflow) }));
      return r?.workflow ?? null;
    },
    [send],
  );

  const updateWorkflow = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ workflow: WorkflowDTO }>(`/api/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      // Setting a new default clears the old one server-side, so refetch the list.
      if (r) {
        setData((d) => ({
          ...d,
          workflows: d.workflows.map((w) =>
            w.id === r.workflow.id ? r.workflow : r.workflow.isDefault ? { ...w, isDefault: false } : w,
          ),
        }));
      }
      return r?.workflow ?? null;
    },
    [send],
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean }>(`/api/workflows/${id}`, { method: 'DELETE' });
      if (r) {
        setData((d) => ({
          ...d,
          workflows: d.workflows.filter((w) => w.id !== id),
          tasks: d.tasks.map((t) => (t.workflowId === id ? { ...t, workflowId: null } : t)),
        }));
      }
      return !!r;
    },
    [send],
  );

  const saveSettings = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ settings: SettingsDTO }>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, settings: r.settings }));
      return r?.settings ?? null;
    },
    [send],
  );

  // ─────────────────────────── notes ───────────────────────────

  const applyNote = useCallback(
    (note: NoteDTO) => {
      setData((d) => ({ ...d, notes: upsert(d.notes, note) }));
      mergeTags(note.hashtags);
    },
    [mergeTags],
  );

  const createNote = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ note: NoteDTO }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const updateNote = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ note: NoteDTO }>(`/api/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const deleteNoteForever = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean }>(`/api/notes/${id}`, { method: 'DELETE' });
      if (r) setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
      return !!r;
    },
    [send],
  );

  const setNoteTaskLink = useCallback(
    async (noteId: string, taskId: string, linked: boolean) => {
      const r = await send<{ note: NoteDTO }>('/api/note-links', {
        method: 'POST',
        body: JSON.stringify({ noteId, taskId, linked }),
      });
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const convertChecklist = useCallback(
    async (noteId: string, items: string[], extra: Record<string, unknown> = {}) => {
      const r = await send<{
        note: NoteDTO;
        tasks: TaskDTO[];
        created: number;
        skipped: number;
      }>(`/api/notes/${noteId}/convert-checklist`, {
        method: 'POST',
        body: JSON.stringify({ items, ...extra }),
      });
      if (!r) return null;
      applyNote(r.note);
      setData((d) => ({ ...d, tasks: r.tasks.reduce((acc, t) => upsert(acc, t), d.tasks) }));
      return { created: r.created, skipped: r.skipped };
    },
    [send, applyNote],
  );

  const restoreNoteVersion = useCallback(
    async (noteId: string, versionId: string) => {
      const r = await send<{ note: NoteDTO }>(`/api/notes/${noteId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ versionId }),
      });
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const addAttachment = useCallback(
    async (noteId: string, body: Record<string, unknown>) => {
      const r = await send<{ note: NoteDTO }>(`/api/notes/${noteId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const removeAttachment = useCallback(
    async (noteId: string, attachmentId: string) => {
      const r = await send<{ note: NoteDTO }>(
        `/api/notes/${noteId}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`,
        { method: 'DELETE' },
      );
      if (r) applyNote(r.note);
      return r?.note ?? null;
    },
    [send, applyNote],
  );

  const createNotebook = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await send<{ notebook: NotebookDTO }>('/api/notebooks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, notebooks: upsert(d.notebooks, r.notebook) }));
      return r?.notebook ?? null;
    },
    [send],
  );

  const updateNotebook = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      const r = await send<{ notebook: NotebookDTO }>(`/api/notebooks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (r) setData((d) => ({ ...d, notebooks: upsert(d.notebooks, r.notebook) }));
      return r?.notebook ?? null;
    },
    [send],
  );

  const deleteNotebook = useCallback(
    async (id: string) => {
      const r = await send<{ ok: boolean }>(`/api/notebooks/${id}`, { method: 'DELETE' });
      if (r) {
        setData((d) => ({
          ...d,
          notebooks: d.notebooks.filter((n) => n.id !== id),
          notes: d.notes.map((n) => (n.notebookId === id ? { ...n, notebookId: null } : n)),
        }));
      }
      return !!r;
    },
    [send],
  );

  const resetAll = useCallback(
    async (confirm: string) => {
      const r = await send<{ ok: boolean }>('/api/reset', {
        method: 'POST',
        body: JSON.stringify({ confirm }),
      });
      if (r) await reload();
      return !!r;
    },
    [send, reload],
  );

  const value = useMemo<DataValue>(
    () => ({
      ...data,
      loading,
      error,
      reload,
      createTask,
      updateTask,
      deleteTask,
      updateSubtask,
      addComment,
      createProject,
      updateProject,
      deleteProject,
      createPerson,
      updatePerson,
      deletePerson,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
      saveSettings,
      resetAll,
      createNote,
      updateNote,
      deleteNoteForever,
      setNoteTaskLink,
      convertChecklist,
      restoreNoteVersion,
      addAttachment,
      removeAttachment,
      createNotebook,
      updateNotebook,
      deleteNotebook,
    }),
    [
      data, loading, error, reload,
      createTask, updateTask, deleteTask, updateSubtask, addComment,
      createProject, updateProject, deleteProject,
      createPerson, updatePerson, deletePerson,
      createWorkflow, updateWorkflow, deleteWorkflow,
      saveSettings, resetAll,
      createNote, updateNote, deleteNoteForever, setNoteTaskLink, convertChecklist,
      restoreNoteVersion, addAttachment, removeAttachment,
      createNotebook, updateNotebook, deleteNotebook,
    ],
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
