'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HashtagField } from '@/components/ui/HashtagField';
import { formatBytes, relativeTime } from '@/lib/notes';
import { fmtDateTimeFull } from '@/lib/domain';
import { WORK_GROUPS, type GroupKey, type NoteDTO } from '@/lib/types';
import { useData } from '@/state/DataProvider';
import { usePrefs } from '@/state/PrefsProvider';
import { useToast } from '@/state/ToastProvider';

/** Attachments are inlined as data URIs, so keep them small. */
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/**
 * The right-hand panel: where the note sits (notebook, project, group), how it
 * is tagged, what is attached, and when it changed. On narrow screens the page
 * renders this inside a collapsible section instead of a column.
 */
export function NoteDetails({ note }: { note: NoteDTO }) {
  const { notebooks, projects, updateNote, addAttachment, removeAttachment } = useData();
  const { group, lang, t } = usePrefs();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const visibleProjects = projects.filter((p) => !group || p.groupKey === group);
  const project = projects.find((p) => p.id === note.projectId) ?? null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toast('Tệp vượt quá 2MB — bản chạy cục bộ chưa có kho lưu trữ tệp riêng');
      return;
    }
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });
    const ok = await addAttachment(note.id, {
      name: f.name,
      mimeType: f.type,
      size: f.size,
      dataUrl,
    });
    setUploading(false);
    if (ok) toast('Đã đính kèm tệp');
  };

  return (
    <div className="note-details">
      <section className="note-panel">
        <h4 className="note-panel-head">
          <span>
            <Icon name="settings" size={14} /> {t('Thông tin')}
          </span>
        </h4>

        <div className="field">
          <label>{t('Sổ tay')}</label>
          <select
            value={note.notebookId ?? ''}
            onChange={async (e) => {
              if (await updateNote(note.id, { notebookId: e.target.value || null })) {
                toast('Đã chuyển sổ tay');
              }
            }}
          >
            <option value="">{t('Không thuộc sổ tay')}</option>
            {notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>
                {nb.name}
                {nb.locked ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t('Dự án')}</label>
          <select
            value={note.projectId ?? ''}
            onChange={async (e) => {
              if (await updateNote(note.id, { projectId: e.target.value || null })) {
                toast(e.target.value ? 'Đã gắn vào dự án' : 'Đã bỏ khỏi dự án');
              }
            }}
          >
            <option value="">{t('Không thuộc dự án')}</option>
            {visibleProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {project && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
              Ghi chú theo nhóm công việc của dự án ({WORK_GROUPS.find((g) => g.key === project.groupKey)?.name}).
            </div>
          )}
        </div>

        <div className="field">
          <label>{t('Nhóm công việc')}</label>
          <select
            value={note.groupKey}
            disabled={!!project}
            title={project ? 'Ghi chú luôn theo nhóm của dự án' : undefined}
            onChange={(e) => void updateNote(note.id, { groupKey: e.target.value as GroupKey })}
          >
            {WORK_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <HashtagField
          tags={note.hashtags}
          onChange={(tags) => void updateNote(note.id, { hashtags: tags })}
          hint="bấm thẻ ở danh sách để lọc"
        />
      </section>

      <section className="note-panel">
        <h4 className="note-panel-head">
          <span>
            <Icon name="upload" size={14} /> {t('Tệp đính kèm')}
            {note.attachments.length > 0 && (
              <em className="note-panel-count">{note.attachments.length}</em>
            )}
          </span>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="plus" size={13} /> {t('Thêm')}
            <input type="file" style={{ display: 'none' }} onChange={(e) => void onFile(e)} />
          </label>
        </h4>

        {uploading && <div className="picker-empty">{t('Đang tải lên…')}</div>}

        {note.attachments.length === 0 && !uploading ? (
          <div className="note-empty small">
            <p>{t('Chưa có tệp nào. Tối đa 2MB mỗi tệp.')}</p>
          </div>
        ) : (
          <div className="attach-list">
            {note.attachments.map((a) => (
              <div className="attach-row" key={a.id}>
                <Icon name="folder" size={14} />
                <span className="attach-main">
                  {a.dataUrl ? (
                    <a href={a.dataUrl} download={a.name}>
                      {a.name}
                    </a>
                  ) : (
                    a.name
                  )}
                  <em>
                    {a.mimeType || t('Không rõ định dạng')} · {formatBytes(a.size)} ·{' '}
                    {relativeTime(a.createdAt)}
                  </em>
                </span>
                <button
                  type="button"
                  className="btn-icon danger"
                  title={t('Xoá')}
                  onClick={async () => {
                    if (!confirm(`Xoá tệp "${a.name}"?`)) return;
                    if (await removeAttachment(note.id, a.id)) toast('Đã xoá tệp đính kèm');
                  }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="note-panel">
        <h4 className="note-panel-head">
          <span>
            <Icon name="clock" size={14} /> {t('Thời gian')}
          </span>
        </h4>
        <div className="note-times">
          <div>
            <em>{t('Tạo mới')}</em>
            {fmtDateTimeFull(note.createdAt, lang)}
          </div>
          <div>
            <em>{t('Cập nhật')}</em>
            {fmtDateTimeFull(note.updatedAt, lang)}
          </div>
          <div>
            <em>{t('Phiên bản')}</em>
            {note.versionCount}
          </div>
        </div>
      </section>
    </div>
  );
}
