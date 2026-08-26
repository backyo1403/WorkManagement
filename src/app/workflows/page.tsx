'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Modal, PageHeader } from '@/components/ui/primitives';
import { WORKFLOW_COLORS, WORKFLOW_ICONS, type WorkflowDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function WorkflowsPage() {
  const { workflows, tasks, deleteWorkflow } = useData();
  const { group, t } = usePrefs();
  const toast = useToast();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ workflow: WorkflowDTO | null } | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workflows.filter((w) => !q || w.name.toLowerCase().includes(q));
  }, [workflows, query]);

  const countFor = (id: string) =>
    tasks.filter((x) => x.workflowId === id && !x.archived && (!group || x.groupKey === group)).length;

  const remove = async (w: WorkflowDTO) => {
    const n = tasks.filter((x) => x.workflowId === w.id).length;
    const warn = n
      ? `Xoá workflow "${w.name}"? ${n} nhiệm vụ sẽ được giữ lại nhưng không còn workflow.`
      : `Xoá workflow "${w.name}"?`;
    if (!confirm(warn)) return;
    if (await deleteWorkflow(w.id)) toast('Đã xoá workflow');
  };

  return (
    <div className="view-enter">
      <PageHeader
        title="Workflow"
        icon="workflow"
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
                  placeholder={t('Tìm Workflow…')}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setEditing({ workflow: null })}>
              <Icon name="plus" size={15} /> {t('Thêm Workflow')}
            </button>
          </>
        }
      />

      {list.length ? (
        <div className="grid grid-3">
          {list.map((w) => (
            <div className="card" key={w.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: `color-mix(in srgb, ${w.color} 15%, transparent)`,
                    color: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={w.icon} size={18} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    {t(`${countFor(w.id)} nhiệm vụ`)}
                  </div>
                </div>
                {w.isDefault && <span className="badge purple">{t('MẶC ĐỊNH')}</span>}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => router.push('/tasks')}
                >
                  <Icon name="eye" size={13} /> {t('Xem việc')}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ marginLeft: 'auto' }}
                  title={t('Sửa')}
                  onClick={() => setEditing({ workflow: w })}
                >
                  <Icon name="edit" size={14} />
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  title={t('Xoá')}
                  onClick={() => void remove(w)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="workflow">Chưa có workflow nào</EmptyState>
      )}

      {editing && <WorkflowModal workflow={editing.workflow} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WorkflowModal({ workflow, onClose }: { workflow: WorkflowDTO | null; onClose: () => void }) {
  const { createWorkflow, updateWorkflow } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [name, setName] = useState(workflow?.name ?? '');
  const [icon, setIcon] = useState(workflow?.icon ?? WORKFLOW_ICONS[0]);
  const [color, setColor] = useState(workflow?.color ?? WORKFLOW_COLORS[0]);
  const [isDefault, setIsDefault] = useState(workflow?.isDefault ?? false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast('Workflow cần có tên');
      return;
    }
    setBusy(true);
    const body = { name: name.trim(), icon, color, isDefault };
    const ok = workflow ? await updateWorkflow(workflow.id, body) : await createWorkflow(body);
    setBusy(false);
    if (ok) {
      toast(workflow ? 'Đã cập nhật workflow' : 'Đã thêm workflow');
      onClose();
    }
  };

  return (
    <Modal
      icon="workflow"
      title={workflow ? 'Cập nhật Workflow' : t('Thêm Workflow')}
      onClose={onClose}
    >
      <div className="field">
        <label>{t('Tên')} *</label>
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>Icon</label>
        <div className="icon-picker">
          {WORKFLOW_ICONS.map((ic) => (
            <span key={ic} className={icon === ic ? 'selected' : ''} role="button" onClick={() => setIcon(ic)}>
              <Icon name={ic} size={16} />
            </span>
          ))}
        </div>
      </div>

      <div className="field">
        <label>{t('Màu sắc')}</label>
        <div className="color-swatch-row">
          {WORKFLOW_COLORS.map((c) => (
            <span
              key={c}
              className={`color-swatch${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              role="button"
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isDefault}
            style={{ width: 'auto' }}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Đặt làm workflow mặc định
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('Huỷ')}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          <Icon name="check" size={15} /> {t('Lưu')}
        </button>
      </div>
    </Modal>
  );
}
