/**
 * Built-in note templates.
 *
 * These live in code rather than the database: they are fixed content, the same
 * for every workspace, so storing them as rows would only add a migration to
 * keep in step with the app. Picking one creates an ordinary Note whose
 * `templateKey` records where it came from.
 */

export interface NoteTemplate {
  key: string;
  name: string;
  icon: string;
  /** Section names shown on the template card, before it is opened. */
  outline: string[];
  title: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    key: 'blank',
    name: 'Ghi chú trống',
    icon: 'edit',
    outline: [],
    title: '',
    content: '',
  },
  {
    key: 'meeting',
    name: 'Biên bản họp',
    icon: 'people',
    outline: ['Thành phần', 'Chương trình', 'Thảo luận', 'Quyết định', 'Việc cần làm', 'Theo dõi'],
    title: 'Biên bản họp',
    content: `# Biên bản họp

**Thời gian:**
**Địa điểm:**

## Thành phần
-

## Chương trình
1.

## Thảo luận

## Quyết định
-

## Việc cần làm
- [ ]
- [ ]

## Theo dõi
`,
  },
  {
    key: 'project-brief',
    name: 'Đề cương dự án',
    icon: 'folder',
    outline: ['Bối cảnh', 'Mục tiêu', 'Phạm vi', 'Mốc thời gian', 'Rủi ro'],
    title: 'Đề cương dự án',
    content: `# Đề cương dự án

## Bối cảnh

## Mục tiêu
-

## Phạm vi
**Trong phạm vi**
-

**Ngoài phạm vi**
-

## Mốc thời gian
| Mốc | Ngày |
| --- | --- |
|  |  |

## Rủi ro
-
`,
  },
  {
    key: 'daily',
    name: 'Nhật ký ngày',
    icon: 'calendar',
    outline: ['Ưu tiên hôm nay', 'Đã làm', 'Ghi chú', 'Ngày mai'],
    title: 'Nhật ký ngày',
    content: `# Nhật ký ngày

## Ưu tiên hôm nay
- [ ]
- [ ]
- [ ]

## Đã làm

## Ghi chú

## Ngày mai
- [ ]
`,
  },
  {
    key: 'weekly',
    name: 'Tổng kết tuần',
    icon: 'chart',
    outline: ['Việc đã xong', 'Chưa xong', 'Bài học', 'Kế hoạch tuần tới'],
    title: 'Tổng kết tuần',
    content: `# Tổng kết tuần

## Việc đã xong
-

## Chưa xong
-

## Bài học

## Kế hoạch tuần tới
- [ ]
- [ ]
`,
  },
  {
    key: 'research',
    name: 'Nghiên cứu',
    icon: 'search',
    outline: ['Câu hỏi', 'Nguồn', 'Phát hiện', 'Kết luận'],
    title: 'Ghi chú nghiên cứu',
    content: `# Ghi chú nghiên cứu

## Câu hỏi

## Nguồn
- [Tiêu đề](https://)

## Phát hiện

## Kết luận
`,
  },
  {
    key: 'decision',
    name: 'Nhật ký quyết định',
    icon: 'flag',
    outline: ['Bối cảnh', 'Phương án', 'Quyết định', 'Hệ quả'],
    title: 'Quyết định:',
    content: `# Quyết định:

**Ngày:**
**Người quyết định:**

## Bối cảnh

## Phương án đã cân nhắc
1.
2.

## Quyết định

## Hệ quả
**Tích cực**
-

**Đánh đổi**
-
`,
  },
  {
    key: 'client',
    name: 'Gặp khách hàng',
    icon: 'briefcase',
    outline: ['Khách hàng', 'Nhu cầu', 'Đã trao đổi', 'Bước tiếp theo'],
    title: 'Gặp khách hàng',
    content: `# Gặp khách hàng

**Khách hàng:**
**Người liên hệ:**
**Ngày:**

## Nhu cầu
-

## Đã trao đổi

## Báo giá / Điều kiện

## Bước tiếp theo
- [ ]
`,
  },
  {
    key: 'checklist',
    name: 'Danh sách kiểm',
    icon: 'check',
    outline: ['Danh mục'],
    title: 'Danh sách kiểm',
    content: `# Danh sách kiểm

- [ ]
- [ ]
- [ ]
`,
  },
  {
    key: 'braindump',
    name: 'Ghi nhanh ý tưởng',
    icon: 'activity',
    outline: ['Ý tưởng', 'Cần đào sâu'],
    title: 'Ghi nhanh ý tưởng',
    content: `# Ghi nhanh ý tưởng

## Ý tưởng
-

## Cần đào sâu
- [ ]
`,
  },
];

export function templateByKey(key: string | null | undefined): NoteTemplate | null {
  return NOTE_TEMPLATES.find((t) => t.key === key) ?? null;
}
