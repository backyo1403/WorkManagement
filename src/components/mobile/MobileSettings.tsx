'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Initials } from './parts';
import { AUTO_LOCK_OPTIONS } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** One inset list with its uppercase caption. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="m-set-group">
      <div className="m-set-label">{label}</div>
      <div className="m-inset">{children}</div>
    </div>
  );
}

function Row({
  title,
  sub,
  danger,
  children,
  onClick,
}: {
  title: string;
  sub?: string;
  danger?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="m-row-body">
        <span className={`m-row-title${danger ? ' danger' : ''}`}>{title}</span>
        {sub && <span className="m-row-sub">{sub}</span>}
      </span>
      {children}
    </>
  );
  return onClick ? (
    <button type="button" className="m-row" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="m-row">{body}</div>
  );
}

/** Right-hand value plus the disclosure chevron, for rows that cycle on tap. */
function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="m-row-value">
      <span>{children}</span>
      <Icon name="chevron" size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
    </span>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`m-switch${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
    >
      <i />
    </button>
  );
}

/** Right-aligned inline field: type, then blur to write. */
function Field({
  value,
  onCommit,
  placeholder,
  type = 'text',
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Adopt the stored value when it changes underneath us (another row's save
  // reloads settings, a restore replaces everything) without fighting typing:
  // while the field is focused `value` does not move.
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className="m-row-input"
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/**
 * Cài đặt — the desktop's seven tabs flattened into one scrolling page.
 *
 * Every row writes through the same `saveSettings` / `updatePerson` / `resetAll`
 * calls the desktop panels use, so the invariants that matter (the literal word
 * RESET, the restore refusing a file with no users) stay on the server where
 * they already are.
 */
export function MobileSettings() {
  const { settings, saveSettings, updatePerson, resetAll, reload, ...data } = useData();
  const { lang, setLang, t } = usePrefs();
  const { user, logout } = useAuth();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');

  const lockLabel =
    AUTO_LOCK_OPTIONS.find(([m]) => m === settings.autoLockMinutes)?.[1] ?? '15 phút';

  const cycleLock = () => {
    const i = AUTO_LOCK_OPTIONS.findIndex(([m]) => m === settings.autoLockMinutes);
    const next = AUTO_LOCK_OPTIONS[(i + 1) % AUTO_LOCK_OPTIONS.length];
    void saveSettings({ autoLockMinutes: next[0] });
  };

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (file.size > 1_500_000) {
      toast('Ảnh cần dưới 1.5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (await updatePerson(user.id, { avatarUrl: reader.result as string })) {
        toast('Đã cập nhật ảnh đại diện');
      }
    };
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const payload = {
      people: data.people,
      workflows: data.workflows,
      projects: data.projects,
      tasks: data.tasks,
      hashtags: data.hashtags,
      settings,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `bach-office-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Đã xuất dữ liệu');
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Nhập dữ liệu sẽ THAY THẾ toàn bộ workspace hiện tại. Tiếp tục?')) return;
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await file.text(),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        toast(body.error ?? 'Không nhập được dữ liệu');
        return;
      }
      await reload();
      logout('Đã nhập dữ liệu — mật khẩu tạm thời là 123456');
      toast('Đã nhập dữ liệu, hãy đăng nhập lại');
    } catch {
      toast('File không đọc được — cần đúng file .json đã xuất');
    }
  };

  return (
    <div className="m-page m-settings">
      <Group label={t('Ngôn ngữ & giao diện')}>
        <Row
          title={t('Ngôn ngữ')}
          onClick={() => {
            const next = lang === 'vi' ? 'en' : 'vi';
            setLang(next);
            void saveSettings({ language: next });
          }}
        >
          <Value>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</Value>
        </Row>
        <Row title={t('Giao diện')} sub={t('Bản điện thoại chỉ dùng giao diện tối')}>
          <span className="m-row-value">
            <span>{t('Tối')}</span>
          </span>
        </Row>
      </Group>

      <Group label={t('Bảo mật')}>
        <Row
          title={t('Khoá sổ tay tự động')}
          sub={t('1 · 5 · 15 · 30 · 60 phút · Không bao giờ')}
          onClick={cycleLock}
        >
          <Value>{t(lockLabel)}</Value>
        </Row>
        <Row title={t('Đổi mật khẩu')} onClick={() => setPwOpen((v) => !v)}>
          <Value>{user?.username ?? ''}</Value>
        </Row>
        {pwOpen && (
          <Row title={t('Mật khẩu mới')}>
            <Field
              type="password"
              value={password}
              placeholder="••••"
              onCommit={async (next) => {
                if (!user) return;
                if (next.length < 4) {
                  toast('Mật khẩu cần ít nhất 4 ký tự');
                  return;
                }
                if (await updatePerson(user.id, { password: next })) {
                  setPassword('');
                  setPwOpen(false);
                  toast('Đã đổi mật khẩu');
                }
              }}
            />
          </Row>
        )}
      </Group>

      <Group label={t('Cá nhân')}>
        <div className="m-row">
          <span className="m-row-body">
            <span className="m-row-title">{t('Ảnh đại diện')}</span>
          </span>
          <label style={{ flexShrink: 0, cursor: 'pointer' }}>
            <Initials person={user} className="m-avatar-btn" />
            <input type="file" accept="image/*" hidden onChange={pickAvatar} />
          </label>
        </div>
        <Row title={t('Họ tên')}>
          <Field
            value={user?.name ?? ''}
            onCommit={(v) => user && void updatePerson(user.id, { name: v })}
          />
        </Row>
        <Row title={t('Email')}>
          <Field
            type="email"
            value={user?.email ?? ''}
            placeholder="—"
            onCommit={(v) => user && void updatePerson(user.id, { email: v })}
          />
        </Row>
        <Row title={t('Điện thoại')}>
          <Field
            value={user?.phone ?? ''}
            placeholder="—"
            onCommit={(v) => user && void updatePerson(user.id, { phone: v })}
          />
        </Row>
      </Group>

      <Group label={t('Công ty')}>
        <Row title={t('Tên công ty / ứng dụng')}>
          <Field
            value={settings.companyName}
            onCommit={(v) => void saveSettings({ companyName: v })}
          />
        </Row>
        <Row title={t('Khẩu hiệu')}>
          <Field
            value={settings.companyTagline}
            onCommit={(v) => void saveSettings({ companyTagline: v })}
          />
        </Row>
      </Group>

      <Group label={t('Lưu trữ & nhắc hẹn')}>
        <Row
          title={t('Tự động lưu trữ sau')}
          sub={t('chỉ ẩn nhiệm vụ đã xong, không xoá · 0 để tắt')}
        >
          <Field
            type="number"
            value={String(settings.autoArchiveDays)}
            onCommit={(v) => void saveSettings({ autoArchiveDays: Number(v) || 0 })}
          />
        </Row>
        <Row title={t('Cảnh báo Deadline trước')} sub={t('số ngày')}>
          <Field
            type="number"
            value={String(settings.reminderDaysBefore)}
            onCommit={(v) => void saveSettings({ reminderDaysBefore: Number(v) || 0 })}
          />
        </Row>
        <Row title={t('Giờ gửi nhắc')}>
          <Field
            type="time"
            value={settings.reminderTime}
            onCommit={(v) => void saveSettings({ reminderTime: v })}
          />
        </Row>
        <Row
          title={t('Tần suất trong ngày')}
          onClick={() =>
            void saveSettings({ reminderPerDay: (settings.reminderPerDay % 3) + 1 })
          }
        >
          <Value>
            {t(`${settings.reminderPerDay} lần`)}
          </Value>
        </Row>
      </Group>

      <Group label={t('Thông báo')}>
        <Row
          title="Telegram Bot Token"
          sub={t('gửi theo lịch cần tiến trình cron chạy nền')}
        >
          <Switch
            label="Telegram Bot Token"
            on={!!settings.telegramBotToken}
            onToggle={() => {
              if (settings.telegramBotToken) {
                if (!confirm('Xoá Bot Token đã lưu?')) return;
                void saveSettings({ telegramBotToken: '' });
                setTokenOpen(false);
              } else {
                setTokenOpen(true);
              }
            }}
          />
        </Row>
        {(tokenOpen || !!settings.telegramBotToken) && (
          <Row title={t('Bot Token')}>
            <Field
              type="password"
              value={settings.telegramBotToken}
              placeholder={t('Token từ @BotFather')}
              onCommit={(v) => void saveSettings({ telegramBotToken: v })}
            />
          </Row>
        )}
        <Row title={t('Chat ID kiểm tra')}>
          <Field
            value={settings.telegramTestChatId}
            placeholder="—"
            onCommit={(v) => void saveSettings({ telegramTestChatId: v })}
          />
        </Row>
        <Row title="Zalo Bot Token" sub={settings.zaloBotToken ? undefined : t('Chưa nối')}>
          <Field
            type="password"
            value={settings.zaloBotToken}
            placeholder="—"
            onCommit={(v) => void saveSettings({ zaloBotToken: v })}
          />
        </Row>
        <Row title={t('Zalo User ID test')}>
          <Field
            value={settings.zaloTestUserId}
            placeholder="—"
            onCommit={(v) => void saveSettings({ zaloTestUserId: v })}
          />
        </Row>
      </Group>

      <Group label={t('Sao lưu & đồng bộ')}>
        <Row title={t('Xuất bản sao (JSON)')} onClick={exportData}>
          <Icon name="download" size={16} style={{ color: 'var(--text-3)' }} />
        </Row>
        <div className="m-row">
          <span className="m-row-body">
            <span className="m-row-title">{t('Nhập dữ liệu')}</span>
            <span className="m-row-sub">
              {t('Thay toàn bộ · từ chối file không có người dùng nào')}
            </span>
          </span>
          <label style={{ flexShrink: 0, cursor: 'pointer', color: 'var(--text-3)' }}>
            <Icon name="upload" size={16} />
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => void importData(e)}
            />
          </label>
        </div>
        <Row
          title={t('Xoá hết dữ liệu (RESET)')}
          sub={t('phải gõ đúng chữ RESET để xác nhận')}
          danger
          onClick={() => setResetOpen((v) => !v)}
        >
          <Icon name="trash" size={16} style={{ color: 'var(--danger)' }} />
        </Row>
        {resetOpen && (
          <div className="m-row" style={{ gap: 8 }}>
            <input
              className="m-row-input"
              style={{ flex: 1, width: 'auto', textAlign: 'left' }}
              value={resetText}
              placeholder="RESET"
              onChange={(e) => setResetText(e.target.value)}
            />
            <button
              type="button"
              className="m-done-btn"
              style={{ background: 'var(--danger)', height: 38, opacity: resetText.trim() === 'RESET' ? 1 : 0.45 }}
              disabled={resetText.trim() !== 'RESET'}
              onClick={async () => {
                if (await resetAll(resetText.trim())) {
                  setResetOpen(false);
                  setResetText('');
                  logout('Dữ liệu đã được xoá — đăng nhập lại bằng admin / admin123');
                  toast('Đã xoá toàn bộ dữ liệu');
                }
              }}
            >
              {t('Xoá')}
            </button>
          </div>
        )}
      </Group>
    </div>
  );
}
