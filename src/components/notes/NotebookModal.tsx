'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/primitives';
import { WORKFLOW_COLORS, type NotebookDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

const NOTEBOOK_ICONS = ['book', 'folder', 'briefcase', 'star', 'leaf', 'activity', 'target', 'lock'];

export function NotebookModal({
  notebook,
  onClose,
}: {
  notebook: NotebookDTO | null;
  onClose: () => void;
}) {
  const { createNotebook, updateNotebook, deleteNotebook, notes } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [name, setName] = useState(notebook?.name ?? '');
  const [icon, setIcon] = useState(notebook?.icon ?? 'book');
  const [color, setColor] = useState(notebook?.color ?? WORKFLOW_COLORS[0]);
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [changePin, setChangePin] = useState(!notebook);
  const [busy, setBusy] = useState(false);

  const noteCount = notebook ? notes.filter((n) => n.notebookId === notebook.id).length : 0;

  const save = async () => {
    if (!name.trim()) {
      toast('Sổ tay cần có tên');
      return;
    }
    setBusy(true);
    const body: Record<string, unknown> = { name: name.trim(), icon, color };
    if (changePin) {
      body.pin = pin.trim();
      if (notebook?.locked) body.currentPin = currentPin.trim();
    }
    const ok = notebook ? await updateNotebook(notebook.id, body) : await createNotebook(body);
    setBusy(false);
    if (ok) {
      toast(notebook ? 'Đã cập nhật sổ tay' : 'Đã tạo sổ tay');
      onClose();
    }
  };

  const remove = async () => {
    if (!notebook) return;
    const warn = noteCount
      ? `Xoá sổ tay "${notebook.name}"? ${noteCount} ghi chú sẽ được giữ lại nhưng không còn thuộc sổ tay nào.`
      : `Xoá sổ tay "${notebook.name}"?`;
    if (!confirm(warn)) return;
    if (await deleteNotebook(notebook.id)) {
      toast('Đã xoá sổ tay');
      onClose();
    }
  };

  return (
    <Modal
      icon="book"
      title={notebook ? t('Sửa sổ tay') : t('Thêm sổ tay')}
      onClose={onClose}
    >
      <div className="field">
        <label>{t('Tên')} *</label>
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field">
        <label>Icon</label>
        <div className="icon-picker">
          {NOTEBOOK_ICONS.map((ic) => (
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

      <div className="modal-section-label">
        <Icon name="lock" size={12} /> {t('KHOÁ BẰNG PIN')}
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 }}>
        PIN che nội dung sổ tay khỏi giao diện và kết quả tìm kiếm. Đây <b>không phải mã hoá</b> —
        nội dung vẫn nằm dạng văn bản trong cơ sở dữ liệu.
      </div>

      {notebook && !changePin ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChangePin(true)}>
          <Icon name="lock" size={13} /> {notebook.locked ? t('Đổi hoặc gỡ PIN') : t('Đặt PIN')}
        </button>
      ) : (
        <>
          {notebook?.locked && (
            <div className="field">
              <label>{t('PIN hiện tại')}</label>
              <input
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
              />
            </div>
          )}
          <div className="field">
            <label>{t('PIN mới')} — 4–8 chữ số, để trống để gỡ khoá</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              placeholder="••••"
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
        {notebook ? (
          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => void remove()}>
            <Icon name="trash" size={14} /> {t('Xoá')}
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('Huỷ')}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            <Icon name="check" size={15} /> {t('Lưu')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
