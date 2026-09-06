'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/**
 * Đăng nhập — the phone gate.
 *
 * Deliberately barer than the desktop card: no tagline and no demo-account
 * hint. Both were cut in the handoff, and a lock screen that advertises a
 * working username and password is not a lock screen.
 */
export function MobileLogin() {
  const { login, error } = useAuth();
  const { settings } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await login(username, password);
    setBusy(false);
    if (ok) toast(t(`Xin chào, ${username}`));
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  return (
    <div className="m-root">
      <div className="m-login">
        <div className="m-login-brand">
          <div className="m-login-mark">📘</div>
          <div className="m-login-name">{settings.companyName}</div>
        </div>

        <div className="m-login-fields">
          <div className="m-field">
            <label htmlFor="m-username">{t('Tên đăng nhập')}</label>
            <div className="m-input">
              <input
                id="m-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={onEnter}
              />
            </div>
          </div>

          <div className="m-field">
            <label htmlFor="m-password">{t('Mật khẩu')}</label>
            <div className="m-input">
              <input
                id="m-password"
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onEnter}
              />
              <button
                type="button"
                aria-label={t('Hiện mật khẩu')}
                onClick={() => setReveal((v) => !v)}
              >
                <Icon name="eye" size={19} style={{ color: reveal ? 'var(--brand)' : undefined }} />
              </button>
            </div>
          </div>

          {error && <div className="m-login-error">⚠️ {t(error)}</div>}
        </div>

        <button type="button" className="m-cta" disabled={busy} onClick={() => void submit()}>
          {t('Đăng nhập')}
        </button>
      </div>
    </div>
  );
}
