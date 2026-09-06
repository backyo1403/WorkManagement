'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { groupAccent } from './parts';
import { NOTE_TEMPLATES } from '@/lib/note-templates';
import {
  PRIORITIES,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  WORK_GROUPS,
  type GroupKey,
  type Priority,
  type TaskStatus,
} from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** The clock granularity the wheel offers. Anything finer is fiddly on glass. */
const MINUTE_STEP = 15;

interface Parts {
  d: number;
  m: number;
  y: number;
  h: number;
  mi: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (m: number, y: number) => new Date(y, m, 0).getDate();

function partsOf(date: Date): Parts {
  return {
    d: date.getDate(),
    m: date.getMonth() + 1,
    y: date.getFullYear(),
    h: date.getHours(),
    mi: Math.floor(date.getMinutes() / MINUTE_STEP) * MINUTE_STEP,
  };
}

function toISO(p: Parts): string {
  // Built in local time on purpose: the wheel shows the user's clock, and
  // `new Date(y, m-1, …)` is the only constructor that respects it.
  return new Date(p.y, p.m - 1, Math.min(p.d, daysIn(p.m, p.y)), p.h, p.mi).toISOString();
}

function label(p: Parts): string {
  return `${pad(p.d)}/${pad(p.m)}/${p.y} · ${pad(p.h)}:${pad(p.mi)}`;
}

/** One column of the picker. Opening it scrolls the current value into view. */
function Wheel({
  items,
  value,
  render,
  onPick,
  wide,
}: {
  items: number[];
  value: number;
  render: (n: number) => string;
  onPick: (n: number) => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>('button.on');
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + 22;
    // Only on mount: re-running on every pick would fight the user's scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className={`m-wheel m-scroller${wide ? ' year' : ''}`}>
      {items.map((n) => (
        <button
          key={n}
          type="button"
          className={n === value ? 'on' : ''}
          onClick={() => onPick(n)}
        >
          {render(n)}
        </button>
      ))}
    </div>
  );
}

function DateWheels({ value, onChange }: { value: Parts; onChange: (next: Parts) => void }) {
  const { t } = usePrefs();
  const thisYear = new Date().getFullYear();
  const set = (patch: Partial<Parts>) => onChange({ ...value, ...patch });
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return (
    <div className="m-wheels-wrap">
      <div className="m-wheel-heads">
        <span>{t('NGÀY')}</span>
        <span>{t('THÁNG')}</span>
        <span className="year">{t('NĂM')}</span>
        <span>{t('GIỜ')}</span>
        <span>{t('PHÚT')}</span>
      </div>
      <div className="m-wheels">
        <Wheel
          items={range(1, daysIn(value.m, value.y))}
          value={value.d}
          render={pad}
          onPick={(d) => set({ d })}
        />
        <Wheel
          items={range(1, 12)}
          value={value.m}
          render={pad}
          // Changing month can strand day 31 — clamp it the way a calendar does.
          onPick={(m) => set({ m, d: Math.min(value.d, daysIn(m, value.y)) })}
        />
        <Wheel
          items={range(thisYear - 1, thisYear + 5)}
          value={value.y}
          render={String}
          wide
          onPick={(y) => set({ y, d: Math.min(value.d, daysIn(value.m, y)) })}
        />
        <Wheel items={range(0, 23)} value={value.h} render={pad} onPick={(h) => set({ h })} />
        <Wheel
          items={range(0, 60 / MINUTE_STEP - 1).map((i) => i * MINUTE_STEP)}
          value={value.mi}
          render={pad}
          onPick={(mi) => set({ mi })}
        />
      </div>
    </div>
  );
}

interface Option {
  key: string;
  label: string;
  dot: string;
}

const nameOf = (options: Option[], key: string) =>
  options.find((o) => o.key === key)?.label ?? options[0]?.label ?? '';

/** The chevron the accordion rows share; CSS flips it when the row is open. */
function Caret() {
  return (
    <span className="m-acc-caret">
      <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
    </span>
  );
}

/**
 * One accordion row: closed it shows the value, open it shows the picker.
 *
 * Declared at module scope, not inside the sheet — a component defined during
 * render gets a fresh identity every keystroke, and React would remount the
 * open wheel (losing its scroll position) each time the title changed.
 */
function ListRow({
  label: rowLabel,
  options,
  value,
  open,
  onToggle,
  onPick,
}: {
  label: string;
  options: Option[];
  value: string;
  open: boolean;
  onToggle: () => void;
  onPick: (key: string) => void;
}) {
  const { t } = usePrefs();
  return (
    <div className={`m-acc${open ? ' open' : ''}`}>
      <button type="button" className="m-acc-head" onClick={onToggle}>
        <span className="m-acc-label">{t(rowLabel)}</span>
        <span className="m-acc-value">{t(nameOf(options, value))}</span>
        <Caret />
      </button>
      {open && (
        <div className="m-acc-list">
          {options.map((o) => (
            <button
              key={o.key || '_none'}
              type="button"
              className={`m-opt${o.key === value ? ' on' : ''}`}
              onClick={() => onPick(o.key)}
            >
              <span className="m-dot" style={{ width: 8, height: 8, background: o.dot }} />
              <span className="m-opt-label">{t(o.label)}</span>
              {o.key === value && (
                <Icon name="tick" size={15} style={{ color: 'var(--brand)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRow({
  label: rowLabel,
  value,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  value: Parts;
  open: boolean;
  onToggle: () => void;
  onChange: (next: Parts) => void;
}) {
  const { t } = usePrefs();
  return (
    <div className={`m-acc${open ? ' open' : ''}`}>
      <button type="button" className="m-acc-head" onClick={onToggle}>
        <span className="m-acc-label">{t(rowLabel)}</span>
        <span className="m-acc-value m-num">{label(value)}</span>
        <Caret />
      </button>
      {open && <DateWheels value={value} onChange={onChange} />}
    </div>
  );
}

/**
 * Bảng tạo — the sheet Tobby opens.
 *
 * Every chooser is an accordion and only one is open at a time: on a 402pt
 * screen a stack of expanded lists would bury the create button. On the notes
 * tab the same sheet creates a note and hands over to the editor.
 */
export function ComposeSheet({
  mode,
  onClose,
  onNoteCreated,
}: {
  mode: 'task' | 'note';
  onClose: () => void;
  onNoteCreated: (id: string) => void;
}) {
  const { projects, notebooks, createTask, createNote } = useData();
  const { group, t } = usePrefs();
  const { user } = useAuth();
  const toast = useToast();

  const now = new Date();
  const [title, setTitle] = useState('');
  const [field, setField] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(() => ({
    groupKey: (group || 'work') as GroupKey,
    projectId: '',
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as Priority,
    notebookId: '',
    templateKey: 'blank',
    start: partsOf(now),
    due: partsOf(new Date(now.getTime() + 86400000)),
  }));

  // An event's two dates are its own ends, not "when I plan to begin" and
  // "when it is due", so the rows say so the moment the status is picked.
  const asEvent = draft.status === 'EVENT';

  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const groupOptions: Option[] = WORK_GROUPS.map((g) => ({
    key: g.key,
    label: g.name,
    dot: groupAccent(g.key),
  }));

  const projectOptions: Option[] = useMemo(
    () => [
      { key: '', label: '— Không thuộc dự án —', dot: 'var(--text-3)' },
      ...projects
        .filter((p) => p.groupKey === draft.groupKey)
        .map((p) => ({ key: p.id, label: p.name, dot: p.color })),
    ],
    [projects, draft.groupKey],
  );

  /**
   * "Tiến độ" is the task's status — the same four the kanban columns and the
   * detail sheet use, `Sự kiện` included. It is not the workflow list: a
   * workflow is which pipeline the work belongs to, which is a desktop concern
   * and not what this row has ever meant.
   */
  const statusOptions: Option[] = TASK_STATUSES.map((s) => ({
    key: s,
    label: TASK_STATUS_LABEL[s],
    dot: TASK_STATUS_COLOR[s],
  }));

  const priorityOptions: Option[] = PRIORITIES.map((p) => ({
    key: p,
    label: PRIORITY_LABEL[p],
    dot: PRIORITY_COLOR[p],
  }));

  const notebookOptions: Option[] = useMemo(
    () => [
      { key: '', label: '— Chưa xếp sổ —', dot: 'var(--text-3)' },
      ...notebooks.map((n) => ({ key: n.id, label: n.name, dot: n.color })),
    ],
    [notebooks],
  );

  const templateOptions: Option[] = NOTE_TEMPLATES.map((tpl) => ({
    key: tpl.key,
    label: tpl.name,
    dot: 'var(--brand)',
  }));

  /** Accordion discipline: opening one row closes whichever was open. */
  const toggle = (id: string) => () => setField((cur) => (cur === id ? null : id));

  const submit = async () => {
    const text = title.trim();
    if (!text) {
      toast(mode === 'note' ? 'Nhập tiêu đề ghi chú' : 'Nhập nội dung công việc trước');
      return;
    }
    setBusy(true);

    if (mode === 'note') {
      const template = NOTE_TEMPLATES.find((x) => x.key === draft.templateKey) ?? null;
      const note = await createNote({
        title: text,
        content: template?.content ?? '',
        templateKey: template && template.key !== 'blank' ? template.key : null,
        notebookId: draft.notebookId || null,
        groupKey: draft.groupKey,
        authorId: user?.id ?? null,
      });
      setBusy(false);
      if (note) {
        toast('Đã tạo ghi chú mới');
        onNoteCreated(note.id);
      }
      return;
    }

    const created = await createTask({
      title: text,
      start: toISO(draft.start),
      deadline: toISO(draft.due),
      priority: draft.priority,
      status: draft.status,
      projectId: draft.projectId || null,
      groupKey: draft.groupKey,
      creatorId: user?.id ?? null,
      assigneeId: user?.id ?? null,
      executorIds: user ? [user.id] : [],
    });
    setBusy(false);
    if (created) {
      toast(asEvent ? 'Đã thêm sự kiện vào lịch' : 'Đã tạo nhiệm vụ và xếp vào thời gian biểu');
      onClose();
    }
  };

  return (
    <div className="m-overlay" style={{ zIndex: 25 }}>
      <button type="button" className="m-dismiss" aria-label={t('Đóng')} onClick={onClose} />

      <div className="m-sheet tall">
        <div className="m-grip">
          <i />
        </div>

        <div className="m-sheet-body compose m-scroller">
          <div className="m-compose-title">
            {mode === 'note' ? t('Ghi chú mới') : t('Hôm nay cần làm gì?')}
          </div>

          <div className="m-compose-input">
            <input
              type="text"
              value={title}
              autoFocus
              placeholder={mode === 'note' ? t('Tiêu đề ghi chú') : t('Việc cần làm…')}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {mode === 'note' ? (
            <>
              <ListRow
                label="Sổ tay"
                options={notebookOptions}
                value={draft.notebookId}
                open={field === 'notebook'}
                onToggle={toggle('notebook')}
                onPick={(v) => {
                  set('notebookId', v);
                  setField(null);
                }}
              />
              <ListRow
                label="Nhóm"
                options={groupOptions}
                value={draft.groupKey}
                open={field === 'group'}
                onToggle={toggle('group')}
                onPick={(v) => {
                  set('groupKey', v as GroupKey);
                  setField(null);
                }}
              />
              <ListRow
                label="Mẫu"
                options={templateOptions}
                value={draft.templateKey}
                open={field === 'template'}
                onToggle={toggle('template')}
                onPick={(v) => {
                  set('templateKey', v);
                  setField(null);
                }}
              />
            </>
          ) : (
            <>
              <ListRow
                label="Nhóm công việc"
                options={groupOptions}
                value={draft.groupKey}
                open={field === 'group'}
                onToggle={toggle('group')}
                onPick={(v) => {
                  // A project belongs to one group, so switching group drops a
                  // pick that would no longer be valid.
                  setDraft((d) => ({ ...d, groupKey: v as GroupKey, projectId: '' }));
                  setField(null);
                }}
              />
              <ListRow
                label="Dự án"
                options={projectOptions}
                value={draft.projectId}
                open={field === 'project'}
                onToggle={toggle('project')}
                onPick={(v) => {
                  set('projectId', v);
                  setField(null);
                }}
              />
              <ListRow
                label="Tiến độ"
                options={statusOptions}
                value={draft.status}
                open={field === 'status'}
                onToggle={toggle('status')}
                onPick={(v) => {
                  set('status', v as TaskStatus);
                  setField(null);
                }}
              />
              <ListRow
                label="Độ ưu tiên"
                options={priorityOptions}
                value={draft.priority}
                open={field === 'priority'}
                onToggle={toggle('priority')}
                onPick={(v) => {
                  set('priority', v as Priority);
                  setField(null);
                }}
              />
              <DateRow
                label={asEvent ? 'Bắt đầu sự kiện' : 'Ngày bắt đầu'}
                value={draft.start}
                open={field === 'start'}
                onToggle={toggle('start')}
                onChange={(v) => set('start', v)}
              />
              <DateRow
                // "Hạn chót", not the loanword "Deadline": the dictionary turns
                // it into "Deadline" for English readers, and leaving the
                // English word in place made the Vietnamese UI read as mixed.
                label={asEvent ? 'Kết thúc sự kiện' : 'Hạn chót'}
                value={draft.due}
                open={field === 'due'}
                onToggle={toggle('due')}
                onChange={(v) => set('due', v)}
              />
            </>
          )}

          <button
            type="button"
            className="m-cta"
            style={{ marginTop: 2 }}
            disabled={busy}
            onClick={() => void submit()}
          >
            {mode === 'note'
              ? t('Tạo ghi chú')
              : asEvent
                ? t('Tạo sự kiện')
                : t('Tạo nhiệm vụ')}
          </button>
        </div>
      </div>
    </div>
  );
}
