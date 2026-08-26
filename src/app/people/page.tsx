'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Modal, PageHeader } from '@/components/ui/primitives';
import { progressGradientColor } from '@/lib/domain';
import {
  ROLES,
  ROLE_LABEL,
  WORK_GROUPS,
  groupName,
  type GroupKey,
  type PersonDTO,
  type Role,
} from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

export default function PeoplePage() {
  const { people, tasks, deletePerson } = useData();
  const { group, t } = usePrefs();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ person: PersonDTO | null } | null>(null);
  const [shownPasswords, setShownPasswords] = useState<Set<string>>(new Set());

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [people, query]);

  /** Share of a person's tasks that are done, in the active group. */
  const workload = (personId: string) => {
    const mine = tasks.filter(
      (x) =>
        !x.archived &&
        (!group || x.groupKey === group) &&
        (x.assigneeId === personId || x.executorIds.includes(personId)),
    );
    const done = mine.filter((x) => x.status === 'DONE').length;
    return { total: mine.length, done, pct: mine.length ? Math.round((done / mine.length) * 100) : 0 };
  };

  const remove = async (p: PersonDTO) => {
    if (!confirm(`Xoá "${p.name}"? Nhiệm vụ và dự án của họ được giữ lại nhưng sẽ không còn người phụ trách.`)) return;
    if (await deletePerson(p.id)) toast('Đã xoá người thực hiện');
  };

  return (
    <div className="view-enter">
      <PageHeader
        title="Người thực hiện"
        icon="people"
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
                  placeholder={t('Tên người thực hiện…')}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setEditing({ person: null })}>
              <Icon name="plus" size={15} /> {t('Thêm người thực hiện')}
            </button>
          </>
        }
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('Người thực hiện')}</th>
              <th>{t('Nhóm công việc')}</th>
              <th>{t('Vai trò')}</th>
              <th>{t('Liên hệ')}</th>
              <th>{t('Tài khoản (Tên / Mật khẩu)')}</th>
              <th>{t('Tiến độ công việc')}</th>
              <th>{t('Hành động')}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon="people">Không tìm thấy người thực hiện nào</EmptyState>
                </td>
              </tr>
            )}
            {list.map((p) => {
              const wl = workload(p.id);
              const roleBadge =
                p.role === 'OWNER' ? 'badge purple' : p.role === 'LEAD' ? 'badge success' : 'badge';
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Avatar person={p} size={30} />
                      <b>{p.name}</b>
                    </div>
                  </td>
                  <td>{groupName(p.groupKey)}</td>
                  <td>
                    <span className={roleBadge}>
                      {p.role === 'LEAD' ? '👑 ' : ''}
                      {t(ROLE_LABEL[p.role])}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>✉️ {p.email || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>📞 {p.phone || '—'}</div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.username}</span> /{' '}
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {shownPasswords.has(p.id) ? '(sửa để đổi)' : '••••••'}
                    </span>{' '}
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: 22, height: 22 }}
                      title="Mật khẩu chỉ đổi được trong cửa sổ chỉnh sửa"
                      onClick={() =>
                        setShownPasswords((cur) => {
                          const next = new Set(cur);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                    >
                      <Icon name="eye" size={11} />
                    </button>
                  </td>
                  <td>
                    <div style={{ fontSize: 11.5, marginBottom: 3 }}>
                      {wl.done}/{wl.total} ({wl.pct}%)
                    </div>
                    <div className="progress-bar" style={{ width: 90 }}>
                      <div
                        className="progress-fill"
                        style={{ width: `${wl.pct}%`, background: progressGradientColor(wl.pct) }}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title={t('Sửa')}
                        onClick={() => setEditing({ person: p })}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        title={t('Xoá')}
                        onClick={() => void remove(p)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <PersonModal person={editing.person} onClose={() => setEditing(null)} />}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function PersonModal({ person, onClose }: { person: PersonDTO | null; onClose: () => void }) {
  const { createPerson, updatePerson } = useData();
  const { t } = usePrefs();
  const toast = useToast();

  const [name, setName] = useState(person?.name ?? '');
  const [username, setUsername] = useState(person?.username ?? '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(person?.email ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [role, setRole] = useState<Role>(person?.role ?? 'MEMBER');
  const [groupKey, setGroupKey] = useState<GroupKey>(person?.groupKey ?? 'work');
  const [telegramChatId, setTelegram] = useState(person?.telegramChatId ?? '');
  const [zaloUserId, setZalo] = useState(person?.zaloUserId ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(person?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Avatars are stored inline as data URIs, so keep them small.
    if (f.size > 1_500_000) {
      toast('Ảnh cần dưới 1.5MB');
      return;
    }
    setAvatarUrl(await readFileAsDataUrl(f));
  };

  const save = async () => {
    if (!name.trim() || !username.trim()) {
      toast('Vui lòng nhập đủ Họ tên và Tên đăng nhập');
      return;
    }
    setBusy(true);
    const body = {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      groupKey,
      telegramChatId: telegramChatId.trim(),
      zaloUserId: zaloUserId.trim(),
      avatarUrl,
      // Blank means "leave the password alone" when editing.
      ...(password ? { password } : person ? {} : { password: Math.random().toString(36).slice(2, 8) }),
    };
    const ok = person ? await updatePerson(person.id, body) : await createPerson(body);
    setBusy(false);
    if (ok) {
      toast(person ? 'Đã cập nhật người thực hiện' : 'Đã thêm người thực hiện');
      onClose();
    }
  };

  return (
    <Modal
      icon="user"
      title={person ? 'Cập nhật người thực hiện' : t('Thêm người thực hiện')}
      onClose={onClose}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <label className="avatar-upload-label">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="avatar" style={{ width: 64, height: 64 }} />
          ) : (
            <span
              className="avatar"
              style={{
                width: 64, height: 64, background: 'var(--surface-2)',
                border: '1px dashed var(--border)', color: 'var(--text-3)', fontSize: 22,
              }}
            >
              <Icon name="user" size={24} />
            </span>
          )}
          <input type="file" accept="image/*" onChange={(e) => void onAvatar(e)} />
        </label>
      </div>

      <div className="field">
        <label>{t('Họ tên')} *</label>
        <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>{t('Tên đăng nhập')} *</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>
            {t('Mật khẩu')} {person ? '(để trống nếu không đổi)' : ''}
          </label>
          <input
            type="text"
            value={password}
            placeholder={person ? 'Để trống nếu không đổi' : ''}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
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

      <div className="field-row">
        <div className="field">
          <label>{t('Vai trò')}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE_LABEL[r])}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('Nhóm công việc')} *</label>
          <select value={groupKey} onChange={(e) => setGroupKey(e.target.value as GroupKey)}>
            {WORK_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Telegram Chat ID</label>
          <input
            type="text"
            value={telegramChatId}
            placeholder="Nhập Chat ID từ Telegram"
            onChange={(e) => setTelegram(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Zalo User ID</label>
          <input
            type="text"
            value={zaloUserId}
            placeholder="Nhập User ID từ Zalo"
            onChange={(e) => setZalo(e.target.value)}
          />
        </div>
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
