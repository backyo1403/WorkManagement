'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, Modal, PageHeader } from '@/components/ui/primitives';
import { AUTO_LOCK_OPTIONS, WORK_GROUPS, type GroupKey } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

type Tab = 'language' | 'security' | 'profile' | 'company' | 'archive' | 'reminder' | 'notify' | 'sync';

const NAV: Array<[Tab, string, string]> = [
  ['language', 'globe', 'Ngôn ngữ'],
  ['security', 'lock', 'Bảo mật & Khoá màn hình'],
  ['profile', 'user', 'Hồ sơ cá nhân'],
  ['company', 'briefcase', 'Thông tin công ty'],
  ['archive', 'archive', 'Tự động lưu trữ'],
  ['reminder', 'bell', 'Nhắc hẹn Deadline'],
  ['notify', 'link', 'Kết nối thông báo'],
  ['sync', 'cloud', 'Đồng bộ dữ liệu'],
];

export default function SettingsPage() {
  const { t } = usePrefs();
  const [tab, setTab] = useState<Tab>('language');

  return (
    <div className="view-enter">
      <PageHeader title="Cài đặt" icon="settings" />

      <div className="settings-layout">
        <div className="settings-nav">
          {NAV.map(([k, ico, label]) => (
            <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              <Icon name={ico} size={13} /> {t(label)}
            </button>
          ))}
        </div>

        <div className="settings-panel">
          {tab === 'language' && <LanguagePanel />}
          {tab === 'security' && <SecurityPanel />}
          {tab === 'profile' && <ProfilePanel />}
          {tab === 'company' && <CompanyPanel />}
          {tab === 'archive' && <ArchivePanel />}
          {tab === 'reminder' && <ReminderPanel />}
          {tab === 'notify' && <NotifyPanel />}
          {tab === 'sync' && <SyncPanel />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── language & theme ───────────────────────────

function LanguagePanel() {
  const { group, setGroup, clearGroup, lang, setLang, t } = usePrefs();
  const { saveSettings } = useData();
  const toast = useToast();

  const pickLang = (l: 'vi' | 'en') => {
    setLang(l);
    void saveSettings({ language: l });
    toast(l === 'en' ? 'Language switched to English' : 'Đã chuyển sang tiếng Việt');
  };

  return (
    <>
      <div className="card" style={{ maxWidth: 460, marginBottom: 16 }}>
        <h3>
          <span>
            <Icon name="target" size={15} /> {t('Nhóm công việc & giao diện')}
          </span>
        </h3>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
          Chọn nhóm để lọc dữ liệu và đổi bảng màu toàn app. Cũng có thể chọn nhanh bằng nút <b>⋯</b> ở góc
          dưới bên phải.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className={`pill-toggle${!group ? ' active' : ''}`} onClick={clearGroup}>
            🌐 {t('Tất cả')}
          </button>
          {WORK_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`pill-toggle${group === g.key ? ' active' : ''}`}
              onClick={() => setGroup(g.key as GroupKey)}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 460 }}>
        <h3>
          <span>
            <Icon name="globe" size={15} /> {t('Ngôn ngữ')}
          </span>
        </h3>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
          Ngôn ngữ hiển thị của toàn bộ giao diện. Dữ liệu bạn nhập (tên nhiệm vụ, dự án…) giữ nguyên như khi
          tạo.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`pill-toggle${lang === 'vi' ? ' active' : ''}`}
            style={{ padding: '10px 18px', fontSize: 13 }}
            onClick={() => pickLang('vi')}
          >
            🇻🇳 Tiếng Việt
          </button>
          <button
            type="button"
            className={`pill-toggle${lang === 'en' ? ' active' : ''}`}
            style={{ padding: '10px 18px', fontSize: 13 }}
            onClick={() => pickLang('en')}
          >
            🇬🇧 English
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── security ───────────────────────────

function SecurityPanel() {
  const { settings, saveSettings, updatePerson } = useData();
  const { user } = useAuth();
  const { t } = usePrefs();
  const toast = useToast();
  const [pw, setPw] = useState('');

  const current = settings.autoLockMinutes;

  return (
    <>
      <div className="card" style={{ maxWidth: 480, marginBottom: 16 }}>
        <h3>
          <span>
            <Icon name="lock" size={15} /> {t('Tự động khoá màn hình')}
          </span>
        </h3>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 12 }}>
          Sau khoảng thời gian không thao tác, ứng dụng sẽ tự đăng xuất về màn hình đăng nhập.
        </div>
        <div className="pill-toggle-row">
          {AUTO_LOCK_OPTIONS.map(([m, label]) => (
            <button
              key={m}
              type="button"
              className={`pill-toggle${current === m ? ' active' : ''}`}
              onClick={async () => {
                if (await saveSettings({ autoLockMinutes: m })) toast('Đã lưu cấu hình khoá màn hình');
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
          Hiện tại:{' '}
          <b style={{ color: 'var(--text)' }}>
            {t(AUTO_LOCK_OPTIONS.find((o) => o[0] === current)?.[1] ?? '15 phút')}
          </b>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3>
          <span>🔑 {t('Đổi mật khẩu của bạn')}</span>
        </h3>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 10 }}>
          Đang đăng nhập: <b style={{ color: 'var(--text)' }}>{user?.username}</b>
        </div>
        <div className="field">
          <label>{t('Mật khẩu mới')}</label>
          <input
            type="password"
            value={pw}
            placeholder="Nhập mật khẩu mới"
            onChange={(e) => setPw(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (!user) return;
            if (pw.length < 4) {
              toast('Mật khẩu cần ít nhất 4 ký tự');
              return;
            }
            if (await updatePerson(user.id, { password: pw })) {
              setPw('');
              toast('Đã đổi mật khẩu');
            }
          }}
        >
          <Icon name="check" size={14} /> {t('Đổi mật khẩu')}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────── profile ───────────────────────────

function ProfilePanel() {
  const { updatePerson } = useData();
  const { user } = useAuth();
  const { t } = usePrefs();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_500_000) {
      toast('Ảnh cần dưới 1.5MB');
      return;
    }
    const r = new FileReader();
    r.onload = () => setAvatarUrl(r.result as string);
    r.readAsDataURL(f);
  };

  if (!user) return null;

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h3>
        <span>
          <Icon name="user" size={15} /> {t('Hồ sơ cá nhân')}
        </span>
      </h3>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <label className="avatar-upload-label">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="avatar" style={{ width: 64, height: 64 }} />
          ) : (
            <Avatar person={user} size={64} />
          )}
          <input type="file" accept="image/*" onChange={onAvatar} />
        </label>
      </div>

      <div className="field">
        <label>{t('Họ tên')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>{t('Email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('Điện thoại')}</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={async () => {
          if (await updatePerson(user.id, { name, email, phone, avatarUrl })) toast('Đã lưu hồ sơ');
        }}
      >
        <Icon name="check" size={14} /> {t('Lưu hồ sơ')}
      </button>
    </div>
  );
}

// ─────────────────────────── company ───────────────────────────

function CompanyPanel() {
  const { settings, saveSettings } = useData();
  const { t } = usePrefs();
  const toast = useToast();
  const [name, setName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.companyTagline);

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h3>
        <span>
          <Icon name="briefcase" size={15} /> {t('Thông tin công ty')}
        </span>
      </h3>
      <div className="field">
        <label>{t('Tên công ty / ứng dụng')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('Khẩu hiệu')}</label>
        <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={async () => {
          if (await saveSettings({ companyName: name, companyTagline: tagline })) toast('Đã lưu');
        }}
      >
        <Icon name="check" size={14} /> {t('Lưu')}
      </button>
    </div>
  );
}

// ─────────────────────────── archive ───────────────────────────

function ArchivePanel() {
  const { settings, saveSettings, reload } = useData();
  const { t } = usePrefs();
  const toast = useToast();
  const [days, setDays] = useState(settings.autoArchiveDays);

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h3>
        <span>
          <Icon name="archive" size={15} /> {t('Tự động lưu trữ')}
        </span>
      </h3>
      <div className="badge warning" style={{ display: 'block', padding: '10px 12px', marginBottom: 14 }}>
        ⚠️ Cấu hình hiện tại: Tự động lưu trữ sau <b>{settings.autoArchiveDays} ngày</b> kể từ khi hoàn thành
        {settings.autoArchiveDays === 0 && ' (đang tắt)'}.
      </div>
      <div className="field">
        <label>Tự động lưu trữ sau (ngày hoàn thành) — 0 để tắt</label>
        <input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginBottom: 12 }}>
        Nhiệm vụ được lưu trữ sẽ ẩn khỏi các danh sách nhưng không bị xoá.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (await saveSettings({ autoArchiveDays: days })) toast('Đã lưu cấu hình');
          }}
        >
          <Icon name="check" size={14} /> {t('Lưu cấu hình')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            const res = await fetch('/api/archive-sweep', { method: 'POST' });
            const body = (await res.json()) as { archived: number };
            await reload();
            toast(body.archived ? `Đã lưu trữ ${body.archived} nhiệm vụ` : 'Không có nhiệm vụ nào cần lưu trữ');
          }}
        >
          <Icon name="play" size={14} /> {t('Chạy ngay')}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── reminders ───────────────────────────

function ReminderPanel() {
  const { settings, saveSettings } = useData();
  const { t } = usePrefs();
  const toast = useToast();
  const [days, setDays] = useState(settings.reminderDaysBefore);
  const [time, setTime] = useState(settings.reminderTime);
  const [perDay, setPerDay] = useState(settings.reminderPerDay);

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h3>
        <span>
          <Icon name="bell" size={15} /> {t('Nhắc hẹn Deadline')}
        </span>
      </h3>
      <div className="badge today" style={{ display: 'block', padding: '10px 12px', marginBottom: 14 }}>
        🔔 Nhắc trước <b>{settings.reminderDaysBefore} ngày</b> lúc <b>{settings.reminderTime}</b>, tần suất{' '}
        <b>{settings.reminderPerDay} lần/ngày</b>
      </div>
      <div className="field">
        <label>1. Cảnh báo Deadline trước (số ngày)</label>
        <input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>2. Giờ gửi thông báo nhắc</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label>3. Tần suất nhắc trong ngày</label>
          <select value={perDay} onChange={(e) => setPerDay(Number(e.target.value))}>
            <option value={1}>1 lần/ngày</option>
            <option value={2}>2 lần/ngày</option>
            <option value={3}>3 lần/ngày</option>
          </select>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12 }}>
        Cấu hình này được lưu và dùng bởi kênh Telegram/Zalo bên dưới. Việc gửi theo lịch cần một tiến trình
        chạy nền (cron) — chưa bật trong bản chạy cục bộ này.
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={async () => {
          if (
            await saveSettings({
              reminderDaysBefore: days,
              reminderTime: time,
              reminderPerDay: perDay,
            })
          ) {
            toast('Đã lưu cấu hình nhắc hẹn');
          }
        }}
      >
        <Icon name="check" size={14} /> {t('Lưu cấu hình')}
      </button>
    </div>
  );
}

// ─────────────────────────── integrations ───────────────────────────

function NotifyPanel() {
  const { settings, saveSettings } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [tgToken, setTgToken] = useState(settings.telegramBotToken);
  const [tgChat, setTgChat] = useState(settings.telegramTestChatId);
  const [tgResult, setTgResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [zaloToken, setZaloToken] = useState(settings.zaloBotToken);
  const [zaloUser, setZaloUser] = useState(settings.zaloTestUserId);
  const [zaloResult, setZaloResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [busy, setBusy] = useState(false);

  const testTelegram = async () => {
    setBusy(true);
    setTgResult(null);
    const res = await fetch('/api/integrations/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tgToken, chatId: tgChat }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    setTgResult(
      body.ok
        ? { ok: true, msg: '✅ Đã gửi thành công!' }
        : { ok: false, msg: `❌ ${body.error ?? 'Không gửi được'}` },
    );
  };

  const testZalo = async () => {
    setBusy(true);
    setZaloResult(null);
    const res = await fetch('/api/integrations/zalo/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: zaloToken }),
    });
    const body = (await res.json()) as { ok?: boolean; name?: string; error?: string };
    setBusy(false);
    setZaloResult(
      body.ok
        ? { ok: true, msg: `✅ Kết nối thành công: ${body.name ?? ''}` }
        : { ok: false, msg: `❌ ${body.error ?? 'Không kết nối được'}` },
    );
  };

  return (
    <>
      <div className="card" style={{ maxWidth: 520, marginBottom: 16 }}>
        <h3>
          <span>✈️ Telegram Bot</span>
          <span className="badge success">Gọi API thật</span>
        </h3>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
          Gửi thông báo công việc qua Telegram. Tạo bot qua @BotFather để lấy Token. Yêu cầu được gửi từ máy
          chủ nên token không rời khỏi ứng dụng.
        </div>
        <div className="field-row">
          <div className="field">
            <label>Bot Token</label>
            <input
              type="password"
              value={tgToken}
              placeholder="Nhập Bot Token từ @BotFather"
              onChange={(e) => setTgToken(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Chat ID kiểm tra</label>
            <input
              type="text"
              value={tgChat}
              placeholder="Chat ID của bạn để test"
              onChange={(e) => setTgChat(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              if (await saveSettings({ telegramBotToken: tgToken, telegramTestChatId: tgChat })) {
                toast('Đã lưu cấu hình Telegram');
              }
            }}
          >
            <Icon name="check" size={14} /> {t('Lưu Bot Token')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void testTelegram()}>
            <Icon name="send" size={14} /> {t('Gửi tin nhắn test')}
          </button>
        </div>
        {tgResult && (
          <div style={{ fontSize: 12, marginTop: 8, color: tgResult.ok ? 'var(--success)' : 'var(--danger)' }}>
            {tgResult.msg}
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        <h3>
          <span>💬 Zalo OA</span>
        </h3>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
          Kiểm tra token Zalo OA. Yêu cầu đi qua máy chủ nên không còn bị CORS chặn như bản HTML xem trước.
        </div>
        <div className="field-row">
          <div className="field">
            <label>Zalo Bot Token</label>
            <input
              type="password"
              value={zaloToken}
              placeholder="Nhập Zalo Bot Token"
              onChange={(e) => setZaloToken(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Zalo User ID test</label>
            <input
              type="text"
              value={zaloUser}
              placeholder="VD: 1234567890123456"
              onChange={(e) => setZaloUser(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              if (await saveSettings({ zaloBotToken: zaloToken, zaloTestUserId: zaloUser })) {
                toast('Đã lưu cấu hình Zalo');
              }
            }}
          >
            <Icon name="check" size={14} /> {t('Lưu cấu hình')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void testZalo()}>
            <Icon name="search" size={14} /> {t('Kiểm tra kết nối')}
          </button>
        </div>
        {zaloResult && (
          <div style={{ fontSize: 12, marginTop: 8, color: zaloResult.ok ? 'var(--success)' : 'var(--danger)' }}>
            {zaloResult.msg}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────── sync / reset ───────────────────────────

function SyncPanel() {
  const { reload, resetAll, ...data } = useData();
  const { t } = usePrefs();
  const { logout } = useAuth();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const exportData = () => {
    const payload = {
      people: data.people,
      workflows: data.workflows,
      projects: data.projects,
      tasks: data.tasks,
      hashtags: data.hashtags,
      settings: data.settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
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
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    if (!confirm('Nhập dữ liệu sẽ THAY THẾ toàn bộ workspace hiện tại. Tiếp tục?')) return;

    try {
      const payload = JSON.parse(await f.text()) as unknown;
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        toast(body.error ?? 'Không nhập được dữ liệu');
        return;
      }
      await reload();
      // Restored accounts get a temporary password, so the session is no longer valid.
      logout('Đã nhập dữ liệu — mật khẩu tạm thời là 123456');
      toast('Đã nhập dữ liệu, hãy đăng nhập lại');
    } catch {
      toast('File không đọc được — cần đúng file .json đã xuất');
    }
  };

  return (
    <>
      <div className="card" style={{ maxWidth: 460 }}>
        <h3>
          <span>
            <Icon name="cloud" size={15} /> {t('Đồng bộ dữ liệu')}
          </span>
        </h3>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 14 }}>
          Dữ liệu nằm trong cơ sở dữ liệu SQLite của ứng dụng (<code>prisma/dev.db</code>). Xuất ra file để
          sao lưu hoặc chuyển sang máy khác.
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportData}>
            <Icon name="download" size={14} /> {t('Xuất dữ liệu (.json)')}
          </button>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="upload" size={14} /> {t('Nhập dữ liệu')}
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => void importData(e)} />
          </label>
        </div>
        <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setConfirmOpen(true)}>
          <Icon name="trash" size={14} /> {t('Xoá hết dữ liệu (RESET)')}
        </button>
      </div>

      {confirmOpen && (
        <Modal
          icon="alert"
          title={t('Xoá hết dữ liệu')}
          onClose={() => {
            setConfirmOpen(false);
            setConfirmText('');
          }}
        >
          <div className="badge overdue" style={{ display: 'block', padding: '10px 12px', marginBottom: 14 }}>
            ⚠️ Toàn bộ dự án, nhiệm vụ và người thực hiện sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
          </div>
          <div className="field">
            <label>
              {t('Nhập')} <b>RESET</b> {t('để xác nhận')}
            </label>
            <input
              type="text"
              value={confirmText}
              autoFocus
              placeholder="RESET"
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmText('');
              }}
            >
              {t('Huỷ')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'var(--danger)' }}
              disabled={confirmText.trim() !== 'RESET'}
              onClick={async () => {
                if (await resetAll(confirmText.trim())) {
                  setConfirmOpen(false);
                  setConfirmText('');
                  logout('Dữ liệu đã được xoá — đăng nhập lại bằng admin / admin123');
                  toast('Đã xoá toàn bộ dữ liệu');
                }
              }}
            >
              <Icon name="trash" size={15} /> {t('Xoá hết dữ liệu')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
