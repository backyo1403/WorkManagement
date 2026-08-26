# Bach Office

Một hệ điều hành công việc cá nhân: dự án, nhiệm vụ, công việc con, ghi chú,
thời gian biểu theo giờ, lịch tháng, sơ đồ Gantt, bảng tiến độ Kanban — tất cả
được lọc theo ba **nhóm công việc** cố định là **WORK / SPORT / LIFE**, mỗi nhóm
có bảng màu riêng.

Đây là bản port sang Next.js của bản xem trước một file
[`bach-office.html`](bach-office.html). Bản HTML vẫn được giữ lại làm đối chiếu
thiết kế — toàn bộ CSS trong `src/app/globals.css` được lấy nguyên từ nó, nên
mã màu và bố cục giống hệt. Khác biệt là dữ liệu giờ nằm trong cơ sở dữ liệu
thật thay vì `localStorage`, và các quy tắc nghiệp vụ được kiểm tra ở phía máy
chủ.

## Công nghệ & lựa chọn thiết kế

- **Next.js 14 (App Router) + TypeScript** — server và client trong một bản
  triển khai duy nhất.
- **SQLite qua Prisma** — local-first, không cần cài máy chủ cơ sở dữ liệu; cả
  ứng dụng là một thư mục cộng một file `prisma/dev.db`. Chuyển sang Postgres
  sau này chỉ cần đổi `provider` và `DATABASE_URL`.
- **Không dùng Tailwind hay thư viện biểu đồ.** Giao diện là CSS thuần với biến
  màu (custom properties); biểu đồ tròn/cột/đường được vẽ bằng SVG trực tiếp.
  Bốn con số không đáng để kéo theo một thư viện.
- **Prisma SQLite không có `enum`**, nên các cột kiểu enum là `String`. Tập giá
  trị hợp lệ nằm ở [`src/lib/types.ts`](src/lib/types.ts) và **mọi route API đều
  kiểm tra trước khi ghi** — giá trị sai không bao giờ vào được cơ sở dữ liệu.

### Bất biến được đảm bảo ở phía máy chủ

Các quy tắc này nằm trong [`src/lib/api-helpers.ts`](src/lib/api-helpers.ts) chứ
không nằm ở giao diện, nên mọi đường ghi đều tuân theo:

| Quy tắc | Ý nghĩa |
|---|---|
| Nhiệm vụ luôn thuộc nhóm của dự án | Đổi nhóm của dự án sẽ kéo theo toàn bộ nhiệm vụ của nó |
| `completion` là giá trị suy ra | Có công việc con → % công việc con đã xong; không có → 0% khi chưa xong, 100% khi Hoàn thành |
| `completedAt` bám theo trạng thái | Đánh dấu xong thì đóng dấu thời gian, mở lại thì xoá |
| Hashtag được đăng ký toàn cục | Tag vừa gõ xuất hiện ngay trong gợi ý lần sau |
| Ghi chú theo nhóm của dự án | Gắn ghi chú vào dự án thì nhóm đi theo dự án |
| Ghi chú ↔ nhiệm vụ chỉ có một bảng nối | Hai chiều đọc cùng dữ liệu, không thể lệch |
| Chuyển checklist không tạo trùng | Mục trùng tiêu đề nhiệm vụ đã liên kết thì bỏ qua |
| RESET cần đúng chữ `RESET` | Được kiểm tra lại ở máy chủ, không tin giao diện |

### Ghi chú (Notes)

Ghi chú là Markdown, gắn được với **nhiệm vụ**, **dự án**, **sổ tay** và
**hashtag**.

**Quan hệ Ghi chú ↔ Nhiệm vụ** dùng đúng một bảng nối `NoteTaskLink`. Cả hai
phía — panel "Nhiệm vụ liên kết" trong ghi chú và mục "Ghi chú liên quan" trong
cửa sổ nhiệm vụ — đọc và ghi cùng những dòng đó, nên **không có bản sao nào để
lệch nhau**. Gỡ liên kết chỉ xoá dòng nối; nhiệm vụ và ghi chú đều còn nguyên.
Quan hệ Ghi chú → Dự án chỉ là `note.projectId`, và trang dự án lọc ngược lại.

Hai đường tạo nhiệm vụ từ ghi chú:

- **Chuyển checklist thành nhiệm vụ** — mọi dòng `- [ ]` thành Task thật rồi tự
  liên kết lại. Chạy lại không tạo trùng: mục nào đã trùng tiêu đề với một
  nhiệm vụ đang liên kết thì bỏ qua, và luật này được kiểm ở **máy chủ** chứ
  không chỉ ở nút bấm.
- **Tạo nhiệm vụ từ đoạn đã chọn** — bôi đen một câu, tạo Task và liên kết.

Trình soạn thảo tự lưu sau 500ms; nội dung dở dang còn được ghi nốt khi rời
trang. **Lịch sử phiên bản** giữ tối đa 20 bản mỗi ghi chú, và chỉ chụp bản mới
khi lần sửa cách lần trước ít nhất 5 phút — nếu không, autosave sẽ làm ngập
lịch sử bằng những bản gần như giống hệt nhau.

Trình soạn thảo là **WYSIWYG**: chữ đậm hiện đậm, gạch chân hiện gạch chân —
không phải `**như thế này**`. Nhưng **Markdown vẫn là định dạng lưu trữ**, vì
templates, bộ đọc checklist và "chuyển thành nhiệm vụ" đều đọc nó; DOM được
serialize ngược lại mỗi lần lưu. Nút **Markdown** mở phần mã nguồn thô.

Markdown chuẩn không có cú pháp cho gạch chân và màu, nên có ba phần mở rộng
cục bộ để các nút đó round-trip được thay vì bị mất khi lưu:

| Cú pháp | Ý nghĩa |
|---|---|
| `++text++` | Gạch chân |
| `{c:#dc2626\|text}` | Màu chữ |
| `{h:#fef08a\|text}` | Màu nền chữ |

Vùng bôi nền luôn ép chữ về mực đậm: các sắc nền đều nhạt, nếu để chữ kế thừa
màu sáng của dark mode thì sẽ không đọc được trên chính nền của nó.

Markdown được **dựng thành phần tử React**, không đi qua `dangerouslySetInnerHTML`.
Nội dung ghi chú vì thế không thể chèn thẻ hay script, và không có bộ lọc nào để
lỡ tay làm sai.

> **Sổ tay khoá bằng PIN là kiểm soát truy cập, không phải mã hoá.** PIN được
> băm SHA-256 kèm salt và đối chiếu ở máy chủ, nên không thể qua mặt bằng cách
> sửa state phía trình duyệt — nhưng nội dung ghi chú vẫn nằm dạng văn bản
> thường trong `prisma/dev.db`, ai đọc được file là đọc được. Muốn bảo mật thật
> thì phải mã hoá nội dung bằng khoá dẫn xuất từ PIN và không lưu khoá đó ở đâu
> cả. Sổ tay tự khoá lại sau 2 giờ và khi đóng tab.

### Thao tác phá huỷ dữ liệu

Ba thao tác có thể mất dữ liệu, cả ba đều phải xác nhận:

- **Xoá nhiệm vụ / dự án / người thực hiện** — hỏi trước, và nêu rõ hệ quả
  (xoá dự án *giữ lại* nhiệm vụ, chỉ gỡ liên kết).
- **Nhập dữ liệu** (`/api/restore`) — thay thế toàn bộ workspace; từ chối file
  không có người dùng nào vì sau đó sẽ không đăng nhập lại được.
- **RESET** (`/api/reset`) — phải gõ đúng chữ `RESET`.

Tự động lưu trữ (auto-archive) chỉ *ẩn* nhiệm vụ đã hoàn thành quá cũ, không xoá,
nên nó chạy được mà không cần hỏi.

## Bắt đầu

Cần **Node.js 18.18+**.

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Mở http://localhost:3000 — trang sẽ chuyển sang `/dashboard`.

Tài khoản demo: **admin / admin123** (và `tuan`, `huong`, `lan`, `anh`, `mai`
với mật khẩu `123456`).

> Màn hình đăng nhập là **khoá workspace, không phải hàng rào bảo mật**: mật khẩu
> lưu dạng chữ thường trong cơ sở dữ liệu và phiên làm việc nằm ở
> `sessionStorage`. Hãy băm mật khẩu và dùng cookie phiên có chữ ký trước khi
> chạy ở bất cứ đâu ngoài máy cá nhân.

## Lệnh

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy máy chủ phát triển |
| `npm run build` / `npm start` | Build và chạy bản production |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run db:push` | Đồng bộ `prisma/schema.prisma` vào SQLite |
| `npm run db:seed` | Nạp dữ liệu demo (xoá sạch rồi nạp lại) |
| `npm run db:reset` | Tạo lại cơ sở dữ liệu từ đầu rồi nạp demo |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa dữ liệu trực tiếp |

## Cấu trúc

```
prisma/schema.prisma   Mô hình dữ liệu (WorkGroup, Person, Project, Task, Subtask,
                       Notebook, Note, NoteTaskLink, NoteVersion, Hashtag, Settings…)
prisma/seed.ts         Demo: 3 nhóm, 6 người, 4 workflow, 7 dự án, 24 nhiệm vụ,
                       2 sổ tay, 3 ghi chú đã liên kết sẵn với nhiệm vụ
src/app/globals.css    Toàn bộ giao diện — hệ theme hai trục (sáng/tối × work/sport/life)
src/app/               Các trang: dashboard, projects[/id], tasks, kanban, timetable,
                       calendar, gantt, notes[/id], people, workflows, notifications, settings
src/app/api/           bootstrap, auth, tasks, subtasks, projects, people, workflows,
                       notes, note-links, notebooks, settings, archive-sweep,
                       reset, restore, integrations/{telegram,zalo}
src/components/        ui/ (Icon, primitives, SearchBox, HashtagField),
                       task/, project/, notes/, dashboard/, shell/
src/state/             Provider phía client: Prefs (theme/nhóm/ngôn ngữ), Data, Auth,
                       Toast, NotebookLock (mở khoá sổ tay, tự hết hạn sau 2 giờ)
src/lib/               types, domain (ngày tháng, tiến độ, rủi ro hạn chót), timetable,
                       markdown, notes, note-templates, i18n, serialize, api-helpers, prisma
```

### Hệ theme

Hai trục kết hợp với nhau qua thuộc tính trên `<html>`:

- `data-theme` = `light` | `dark` → nền, chữ, đổ bóng
- `data-group` = `""` | `work` | `sport` | `life` → bảng màu nhấn

Nhóm **WORK** còn đổi luôn bố cục vỏ ngoài: hai panel bo tròn nổi trên nền
gradient. Một script nội tuyến trong `layout.tsx` gán các thuộc tính này **trước
lần vẽ đầu tiên**, nên không bị nháy sai theme khi tải trang.

### Ngôn ngữ

Tiếng Việt là ngôn ngữ gốc. `t()` tra cụm tiếng Việt trong từ điển ở
[`src/lib/i18n.ts`](src/lib/i18n.ts); cụm nào chưa có thì hiển thị nguyên tiếng
Việt thay vì hiện ra một khoá hỏng. Số đếm và các chuỗi có mẫu đi qua bảng regex.

## Phần đã làm thật và phần là nền để mở rộng

Mọi thứ trong danh sách tính năng đều nối với cơ sở dữ liệu thật — không có nút
bấm không làm gì.

Vẫn còn vài chỗ là nền móng chứ chưa trọn vẹn, và giao diện nói rõ điều đó:

- **Nhắc hẹn deadline** — cấu hình được lưu và dùng cho Telegram/Zalo, nhưng việc
  *gửi theo lịch* cần một tiến trình chạy nền (cron); bản chạy cục bộ chưa bật.
- **Zalo OA** — mới có kiểm tra token qua máy chủ. Webhook nhận tin nhắn cần một
  địa chỉ công khai.
- **Tệp đính kèm ghi chú** — lưu thật và tồn tại qua reload, nhưng byte được nhúng
  thẳng vào cơ sở dữ liệu dạng data URI (giới hạn 2MB/tệp), giống cách ảnh đại
  diện đang làm. Cách này chạy được nhưng không mở rộng nổi: bản triển khai thật
  nên đẩy byte lên S3/R2 và chỉ giữ lại khoá.
- **Xuất PDF** dùng hộp thoại in của trình duyệt — nên chuyển sang chế độ
  *Xem trước* trước khi in để lấy bản đã định dạng.

Cả hai lệnh gọi Telegram và Zalo đều chạy **ở phía máy chủ**, nên token không lộ
ra trình duyệt và không còn bị CORS chặn như bản HTML xem trước.
