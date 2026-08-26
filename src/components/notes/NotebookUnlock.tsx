'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { NotebookDTO } from '@/lib/types';
import { useNotebookLocks } from '@/state/NotebookLockProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * The gate shown in place of a locked notebook's contents.
 *
 * The PIN is checked by the server; nothing here can be bypassed by editing
 * client state, though the note rows themselves remain readable to anyone with
 * the database file — this is access control, not encryption.
 */
export function NotebookUnlock({
  notebook,
  onUnlocked,
}: {
  notebook: NotebookDTO;
  onUnlocked?: () => void;
}) {
  const { markUnlocked } = useNotebookLocks();
  const { t } = usePrefs();
  const toast = useToast();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pin.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? 'PIN không đúng');
        setPin('');
        return;
      }
      markUnlocked(notebook.id);
      toast(`Đã mở khoá "${notebook.name}"`);
      onUnlocked?.();
    } catch {
      setError('Mất kết nối tới máy chủ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notebook-lock">
      <div className="notebook-lock-icon">
        <Icon name="lock" size={26} />
      </div>
      <div className="notebook-lock-title">{t('Sổ tay đang khoá')}</div>
      <div className="notebook-lock-name" style={{ color: notebook.color }}>
        {notebook.name}
      </div>

      <input
        type="password"
        inputMode="numeric"
        className="notebook-pin"
        value={pin}
        autoFocus
        placeholder="••••"
        maxLength={8}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />

      {error && <div className="login-error" style={{ marginTop: 10 }}>⚠️ {t(error)}</div>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 12 }}
        disabled={busy || !pin}
        onClick={() => void submit()}
      >
        <Icon name="lock" size={15} /> {t('Mở khoá')}
      </button>

      <p className="notebook-lock-note">
        Tự động khoá lại sau 2 giờ không thao tác, và khi đóng tab.
      </p>
    </div>
  );
}
