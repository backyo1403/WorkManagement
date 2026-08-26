'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/primitives';
import { Markdown } from './Markdown';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';
import { locale } from '@/lib/domain';
import type { NoteDTO } from '@/lib/types';

interface Version {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

/** Groups versions under "Hôm nay" / "Hôm qua" / a date, newest first. */
function dayLabel(iso: string, lang: 'vi' | 'en'): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString(locale(lang), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function VersionHistoryModal({ note, onClose }: { note: NoteDTO; onClose: () => void }) {
  const { restoreNoteVersion } = useData();
  const { lang, t } = usePrefs();
  const toast = useToast();

  const [versions, setVersions] = useState<Version[] | null>(null);
  const [selected, setSelected] = useState<Version | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/notes/${note.id}/versions`, { cache: 'no-store' });
        const body = (await res.json()) as { versions: Version[] };
        setVersions(body.versions ?? []);
      } catch {
        setVersions([]);
      }
    })();
  }, [note.id]);

  const restore = async (v: Version) => {
    if (!confirm('Khôi phục phiên bản này? Nội dung hiện tại sẽ được lưu lại thành một phiên bản mới.')) {
      return;
    }
    if (await restoreNoteVersion(note.id, v.id)) {
      toast('Đã khôi phục phiên bản');
      onClose();
    }
  };

  // Current text first, then history newest-first.
  const groups: Array<[string, Version[]]> = [];
  (versions ?? []).forEach((v) => {
    const label = dayLabel(v.createdAt, lang);
    const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(v);
    else groups.push([label, [v]]);
  });

  return (
    <Modal icon="clock" title={t('Lịch sử phiên bản')} wide onClose={onClose}>
      <div className="version-layout">
        <div className="version-list">
          <button
            type="button"
            className={`version-row${selected === null ? ' active' : ''}`}
            onClick={() => setSelected(null)}
          >
            <span className="version-time">{t('Hiện tại')}</span>
            <span className="version-title">{note.title || t('Chưa đặt tên')}</span>
          </button>

          {versions === null && <div className="picker-empty">{t('Đang tải…')}</div>}
          {versions?.length === 0 && (
            <div className="picker-empty">{t('Chưa có phiên bản nào được lưu')}</div>
          )}

          {groups.map(([label, items]) => (
            <div key={label}>
              <div className="version-day">{t(label)}</div>
              {items.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`version-row${selected?.id === v.id ? ' active' : ''}`}
                  onClick={() => setSelected(v)}
                >
                  <span className="version-time">
                    {new Date(v.createdAt).toLocaleTimeString(locale(lang), {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="version-title">{v.title || t('Chưa đặt tên')}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="version-preview">
          <Markdown source={selected ? selected.content : note.content} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t('Đóng')}
        </button>
        {selected && (
          <button type="button" className="btn btn-primary" onClick={() => void restore(selected)}>
            <Icon name="refresh" size={15} /> {t('Khôi phục phiên bản')}
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
        Giữ tối đa 20 phiên bản gần nhất cho mỗi ghi chú; ảnh chụp mới chỉ được tạo khi lần sửa
        cách lần trước ít nhất 5 phút, để autosave không làm ngập lịch sử.
      </div>
    </Modal>
  );
}
