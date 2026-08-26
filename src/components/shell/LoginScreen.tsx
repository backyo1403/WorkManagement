'use client';

import { useState } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export function LoginScreen() {
  const { login, error } = useAuth();
  const { settings, people } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const demo = people[0];

  const submit = async () => {
    setBusy(true);
    const ok = await login(username, password);
    setBusy(false);
    if (ok) toast(t('Xin chào, ') + username);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 46, height: 46, borderRadius: 14, fontSize: 23 }}>
            📘
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
              {settings.companyName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t(settings.companyTagline)}</div>
          </div>
        </div>

        <div className="field">
          <label>{t('Tên đăng nhập')}</label>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            placeholder={`VD: ${demo?.username ?? 'admin'}`}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </div>
        <div className="field">
          <label>{t('Mật khẩu')}</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            placeholder="••••••"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
        </div>

        {error && <div className="login-error">⚠️ {t(error)}</div>}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          disabled={busy}
          onClick={() => void submit()}
        >
          🔓 {t('Đăng nhập')}
        </button>

        {demo && (
          <div className="login-hint">
            {t('Tài khoản demo')}: <b>{demo.username}</b> / <b>admin123</b>
          </div>
        )}
      </div>
    </div>
  );
}
