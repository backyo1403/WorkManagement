/**
 * i18n — Vietnamese is the source language.
 *
 * `t()` looks a Vietnamese phrase up in the dictionary and returns the English
 * equivalent when the language is `en`. Anything missing falls through to the
 * Vietnamese original, so an untranslated phrase reads correctly rather than
 * showing a broken key. Counts and other patterned strings go through the regex
 * table below.
 */

import type { Lang } from './types';

export const DICT_EN: Record<string, string> = {
  // nav + groups
  'Tổng quan': 'Overview', 'Quản lý': 'Manage', 'Công việc': 'Work', 'Hệ thống': 'System',
  Dashboard: 'Dashboard', 'Nhóm công việc': 'Work Groups', 'Người thực hiện': 'People',
  Workflow: 'Workflow', 'Dự án': 'Projects', 'Sơ đồ Gantt': 'Gantt Chart',
  'Nhiệm vụ': 'Tasks', 'Tiến độ': 'Progress', 'Thời gian biểu': 'Timetable', 'Lịch': 'Calendar',
  'Thông báo': 'Notifications', 'Cài đặt': 'Settings',
  'Làm việc thông minh hơn': 'Work smarter',

  // statuses / priorities
  'Cần làm': 'To do', 'Đang làm': 'In progress', 'Hoàn thành': 'Done', 'Quá hạn': 'Overdue',
  Cao: 'High', 'Trung bình': 'Medium', 'Thấp': 'Low', CAO: 'HIGH', TB: 'MED', 'THẤP': 'LOW',
  'Chưa bắt đầu': 'Not started', 'Đang thực hiện': 'In progress', 'Hoàn tất': 'Completed',
  'Chủ sở hữu': 'Owner', 'Trưởng nhóm': 'Team lead',
  'Tất cả': 'All', 'Tất cả trạng thái': 'All statuses',

  // dashboard
  'Tổng công việc': 'Total tasks', 'Cần xử lý ngay →': 'Needs attention →',
  'Xem bảng tiến độ →': 'View progress board →', 'Đã hoàn thành →': 'Completed →',
  'Nhiệm vụ 7 ngày qua': 'Tasks over last 7 days', 'Phân bổ trạng thái': 'Status breakdown',
  'Xu hướng 30 ngày': '30-day trend', 'Theo nhóm công việc': 'By work group',
  'Lịch tháng': 'Month calendar', 'Thời gian biểu hôm nay': "Today's timetable",
  'Nhiệm vụ cần chú ý': 'Tasks needing attention', 'Hôm nay cần làm gì?': 'What needs doing today?',
  'Tổng quan nhanh': 'Quick overview', 'Sắp xếp ô': 'Arrange widgets', Xong: 'Done',
  'Bố cục mặc định': 'Default layout', 'Ô đã ẩn': 'Hidden widgets',
  'Bảo mật & Khoá màn hình': 'Security & auto-lock',
  'Tự động khoá màn hình': 'Auto screen lock', 'Đổi mật khẩu của bạn': 'Change your password',
  'Mật khẩu mới': 'New password', 'Đổi mật khẩu': 'Change password',
  '1 phút': '1 minute', '5 phút': '5 minutes', '15 phút': '15 minutes', '30 phút': '30 minutes',
  '1 tiếng': '1 hour', 'Không bao giờ': 'Never',
  'Nhóm công việc & giao diện': 'Work group & theme',
  'Tạo nhiệm vụ': 'Create task', 'Xuất CSV': 'Export CSV', 'Xoá lọc': 'Clear filters',
  'Thêm dự án': 'Add project', 'Thêm mục': 'Add item', 'Ghim lên đầu': 'Pin to top', 'Bỏ ghim': 'Unpin',
  'Công việc con': 'Subtasks', '— đặt giờ để lên thời gian biểu': '— set a time to show on the timetable',
  'Ngày bắt đầu': 'Start date', 'Giờ bắt đầu': 'Start time', 'Giờ hạn chót': 'Due time',
  'Tạo mới': 'Created', 'bấm để hiện lại': 'click to restore',
  'Hôm nay': 'Today', 'Chưa có dữ liệu': 'No data yet',
  'Không có việc nào cần chú ý ngay bây giờ': 'Nothing needs your attention right now',

  // composer
  'Chưa giao': 'Unassigned', 'Không thuộc dự án': 'No project',
  'Thêm dự án mới…': 'Add new project…', 'Tên dự án mới…': 'New project name…', 'Tạo': 'Create',
  'Workflow…': 'Workflow…', 'Nhóm công việc…': 'Work group…',

  // tasks
  'BỘ LỌC': 'FILTERS', 'Tất cả dự án': 'All projects', '— Không thuộc dự án —': '— No project —',
  'Tìm kiếm nhiệm vụ…': 'Search tasks…', 'Không có nhiệm vụ nào khớp bộ lọc': 'No tasks match the filters',
  'Hạn chót gần nhất': 'Nearest deadline', 'Độ ưu tiên': 'Priority', 'Mới tạo trước': 'Newest first',
  'Tên (A-Z)': 'Name (A-Z)', 'Tiến độ cao nhất': 'Highest progress', 'Sắp xếp theo': 'Sort by',
  'Tạo bởi': 'Created by', 'Chưa đặt tên': 'Untitled', '(chưa đặt tên)': '(untitled)',

  // projects
  'Tên dự án…': 'Project name…', 'Thời gian': 'Timeline',
  'Phụ trách & Người tạo': 'Owner & creator', 'Mục tiêu / Trạng thái': 'Goal / Status',
  'Tiến độ công việc': 'Task progress', 'Hành động': 'Actions', 'Chưa có dự án nào': 'No projects yet',
  'Chưa xác định': 'Unassigned', 'Dự án này chưa có nhiệm vụ nào': 'This project has no tasks yet',
  'Xem nhiệm vụ': 'View tasks', 'Thu gọn': 'Collapse', 'Xem công việc con': 'View subtasks',
  'Danh sách dự án': 'Back to projects', 'Hoàn tất Dự án': 'Complete project', 'Sửa': 'Edit',
  'Mục tiêu': 'Goal', 'Người phụ trách': 'Owner', 'Bắt đầu': 'Start', 'Kết thúc': 'End',
  'Tải lên tài liệu': 'Upload document', 'Thêm': 'Add', 'Không có nhiệm vụ': 'No tasks',

  // groups / people / workflow
  'Thêm người thực hiện': 'Add person', 'Tên người thực hiện…': 'Person name…',
  'Vai trò': 'Role', 'Liên hệ': 'Contact', 'Tài khoản (Tên / Mật khẩu)': 'Account (user / password)',
  'Thêm Workflow': 'Add Workflow', 'Tìm Workflow…': 'Search workflow…', 'Màu sắc': 'Color',
  'Xem việc': 'View tasks', 'MẶC ĐỊNH': 'DEFAULT',
  'Họ tên': 'Full name', 'Tên đăng nhập': 'Username', 'Mật khẩu': 'Password', Email: 'Email',
  'Điện thoại': 'Phone', 'Huỷ': 'Cancel', 'Lưu': 'Save',

  // gantt
  'Đặt lại bộ lọc': 'Reset filters', 'Tất cả Dự án': 'All projects',
  'Tất cả Nhóm công việc': 'All work groups',
  'Tất cả Người thực hiện phụ trách': 'All assignees', 'Tất cả Trạng thái': 'All statuses',
  'Nhiệm vụ / Người thực hiện': 'Task / Assignee',
  'Không có nhiệm vụ trong bộ lọc hiện tại': 'No tasks match the current filters',
  'Thu nhỏ (xem xa hơn)': 'Zoom out', 'Phóng to (xem chi tiết)': 'Zoom in',

  // kanban
  'THỜI GIAN': 'TIME PERIOD', 'Tuần này': 'This week', 'Tuần trước': 'Last week',
  'Tháng này': 'This month', 'Tháng trước': 'Last month', 'Quý này': 'This quarter',
  'Tất cả người thực hiện': 'All assignees', 'Trống': 'Empty',

  // timetable / calendar
  'Ngày': 'Day', 'Tuần': 'Week', 'công việc': 'tasks',
  'Không có nhiệm vụ nào đến hạn trong ngày này': 'No tasks due on this day',
  'Hôm nay chưa có việc nào đặt giờ': 'Nothing scheduled by time today',
  'Không có công việc con': 'No subtasks', 'Không có thông báo mới': 'No new notifications',

  // settings
  'Hồ sơ cá nhân': 'My profile', 'Thông tin công ty': 'Company info',
  'Tự động lưu trữ': 'Auto-archive', 'Nhắc hẹn Deadline': 'Deadline reminders',
  'Kết nối thông báo': 'Notification channels', 'Đồng bộ dữ liệu': 'Data sync',
  'Ngôn ngữ': 'Language', 'Ngôn ngữ hiển thị': 'Display language',
  'Lưu hồ sơ': 'Save profile', 'Tên công ty / ứng dụng': 'Company / app name', 'Khẩu hiệu': 'Tagline',
  'Lưu cấu hình': 'Save settings', 'Chạy ngay': 'Run now',
  'Xuất dữ liệu (.json)': 'Export data (.json)', 'Nhập dữ liệu': 'Import data',
  'Xoá hết dữ liệu (RESET)': 'Erase all data (RESET)', 'Xoá hết dữ liệu': 'Erase all data',
  'Nhập': 'Type', 'để xác nhận': 'to confirm',
  'Gửi tin nhắn test': 'Send test message',
  'Lưu Bot Token': 'Save bot token', 'Kiểm tra kết nối': 'Test connection',

  // modal / task editor
  'Mô tả nhiệm vụ': 'Task description', 'MÔ TẢ NHIỆM VỤ': 'DESCRIPTION',
  'NGƯỜI PHỤ TRÁCH': 'ASSIGNED TO', 'NGƯỜI THỰC HIỆN': 'DOERS', 'HÀNH ĐỘNG': 'ACTIONS',
  'Đánh dấu hoàn thành': 'Mark as done', 'Mở lại nhiệm vụ': 'Reopen task', 'Nhân bản': 'Duplicate',
  'Bắt đầu tính giờ': 'Start timer', 'Dừng tính giờ': 'Stop timer', 'Xoá nhiệm vụ': 'Delete task',
  'Mô tả chi tiết…': 'Detailed description…',
  'Hạn chót': 'Deadline', 'Ước tính (giờ)': 'Estimate (hours)',
  'Bình luận': 'Comments', 'Lịch sử hoạt động': 'Activity log',
  'Chưa có bình luận nào': 'No comments yet', 'Viết bình luận…': 'Write a comment…', 'Gửi': 'Send',
  'Xoá': 'Delete',
  'Tên nhiệm vụ': 'Task title', '— Chọn Workflow —': '— Select workflow —',
  '— Chọn nhóm công việc —': '— Select work group —',
  'Công việc con…': 'Subtask…',

  // notes
  'Ghi chú': 'Notes', 'Ghi chú mới': 'New note', 'Tất cả ghi chú': 'All notes',
  'Gần đây': 'Recent', 'Mẫu': 'Templates', 'Mẫu ghi chú': 'Note templates',
  'Lưu trữ': 'Archive', 'Thùng rác': 'Trash', 'Sổ tay': 'Notebooks',
  'Thêm sổ tay': 'Add notebook', 'Sửa sổ tay': 'Edit notebook',
  'Chưa có sổ tay nào': 'No notebooks yet', 'Không thuộc sổ tay': 'No notebook',
  'Tìm ghi chú…': 'Search notes…', 'Tiêu đề ghi chú': 'Note title',
  'Chưa có ghi chú nào': 'No notes yet', 'Ghi chú chưa đặt tên': 'Untitled note',
  'Tạo ghi chú đầu tiên': 'Create your first note',
  'Ghi lại ý tưởng, biên bản họp và những thông tin quan trọng.':
    'Capture ideas, meeting notes and important information.',
  'Không tìm thấy ghi chú nào': 'No notes found',
  'Thử từ khoá khác, hoặc gõ #thẻ để lọc theo hashtag.':
    'Try another keyword, or type #tag to filter by hashtag.',
  'Thùng rác trống': 'Trash is empty',
  'Ghi chú đã xoá sẽ nằm ở đây trước khi bị xoá vĩnh viễn.':
    'Deleted notes rest here before being erased for good.',
  'Chưa lưu trữ ghi chú nào': 'Nothing archived yet',
  'Chưa có ghi chú yêu thích': 'No favourite notes yet',
  'Chọn một mẫu để tạo ghi chú mới — nội dung vẫn sửa được sau khi tạo.':
    'Pick a template to start a note — you can still edit everything afterwards.',
  'Trang trắng để tự do viết': 'A blank page to write freely',

  // note editor
  'Soạn': 'Edit', 'Xem trước': 'Preview',
  'Bắt đầu viết… hỗ trợ Markdown': 'Start writing… Markdown supported',
  'Đậm (Ctrl+B)': 'Bold (Ctrl+B)', 'Nghiêng (Ctrl+I)': 'Italic (Ctrl+I)',
  'Gạch chân (Ctrl+U)': 'Underline (Ctrl+U)',
  'Màu chữ': 'Text colour', 'Màu nền chữ': 'Highlight',
  'Bôi đen đoạn chữ muốn đổi màu': 'Select the text you want to colour',
  'Mặc định': 'Default', 'Không': 'None', 'Đỏ': 'Red', 'Cam': 'Orange',
  'Vàng': 'Yellow', 'Lá': 'Green', 'Ngọc': 'Teal', 'Xanh': 'Blue',
  'Tím': 'Purple', 'Hồng': 'Pink', 'Xám': 'Grey',
  'Gạch ngang': 'Strikethrough', 'Tiêu đề 1': 'Heading 1', 'Tiêu đề 2': 'Heading 2',
  // "Danh sách" on its own is the plain word, used by the phone's
  // Danh sách | Tiến độ segmented control. The editor's bullet-list tooltip
  // spells itself out so the two no longer share a key.
  'Tiêu đề 3': 'Heading 3', 'Danh sách': 'List',
  'Danh sách gạch đầu dòng': 'Bullet list', 'Danh sách đánh số': 'Numbered list',
  Checklist: 'Checklist', 'Trích dẫn': 'Quote', 'Khối mã': 'Code block',
  'Liên kết (Ctrl+K)': 'Link (Ctrl+K)', 'Đường kẻ ngang': 'Divider',
  'Đã lưu': 'Saved', 'Đang lưu…': 'Saving…', 'Chưa lưu…': 'Unsaved…',
  'Ghi chú này chưa có nội dung.': 'This note is empty.',
  'Không tìm thấy ghi chú này.': 'That note could not be found.',
  'Danh sách ghi chú': 'Back to notes',
  'Ghi chú này đang ở thùng rác.': 'This note is in the trash.',

  // linked tasks
  'Nhiệm vụ liên kết': 'Linked tasks', 'Liên kết nhiệm vụ': 'Link task',
  'Gỡ liên kết': 'Remove link', 'Chưa liên kết nhiệm vụ nào': 'No linked tasks',
  'Gắn ghi chú này với nhiệm vụ để mọi thứ nằm cùng một chỗ.':
    'Connect this note to tasks so everything stays together.',
  'Nhiệm vụ không còn tồn tại': 'Task no longer available',
  'Ghi chú liên quan': 'Related notes', 'GHI CHÚ LIÊN QUAN': 'RELATED NOTES',
  'Liên kết ghi chú': 'Link note',
  'Liên kết ghi chú với nhiệm vụ': 'Link notes to this task',
  'Gắn ghi chú vào dự án': 'Add notes to this project',
  'Chưa có ghi chú nào nhắc tới nhiệm vụ này.': 'No notes reference this task yet.',
  'Chưa có ghi chú nào thuộc dự án này.': 'No notes belong to this project yet.',
  'Tìm nhiệm vụ…': 'Search tasks…', 'Mọi độ ưu tiên': 'Any priority',
  'Mọi hạn chót': 'Any due date', 'Trong 7 ngày': 'Next 7 days', 'Không có hạn': 'No deadline',
  'Tạo nhiệm vụ từ đoạn đã chọn': 'Create task from selection',
  'Chuyển checklist thành nhiệm vụ': 'Convert checklist to tasks',
  'Checklist đã chuyển hết': 'Checklist already converted',
  'Mọi mục checklist đã được tạo thành nhiệm vụ': 'Every checklist item is already a task',

  // note details / actions
  'Thông tin': 'Details', 'Tệp đính kèm': 'Attachments',
  'Chưa có tệp nào. Tối đa 2MB mỗi tệp.': 'No files yet. 2MB per file.',
  'Đang tải lên…': 'Uploading…', 'Không rõ định dạng': 'Unknown type',
  'Cập nhật': 'Updated', 'Phiên bản': 'Versions',
  'Lịch sử phiên bản': 'Version history', 'Khôi phục phiên bản': 'Restore version',
  'Chưa có phiên bản nào được lưu': 'No versions saved yet', 'Hiện tại': 'Current',
  'Đang tải…': 'Loading…', 'Đóng': 'Close', 'Hôm qua': 'Yesterday',
  'Đổi tên': 'Rename', 'Copy link': 'Copy link', 'Xuất Markdown': 'Export Markdown',
  'In / Lưu PDF': 'Print / Save PDF', 'Bỏ lưu trữ': 'Unarchive',
  'Chuyển vào thùng rác': 'Move to trash', 'Xoá vĩnh viễn': 'Delete permanently',
  'Khôi phục': 'Restore', 'Bỏ yêu thích': 'Remove from favourites',
  'Xem tất cả': 'View all', 'Ghi chú gần đây': 'Recent notes',
  'bấm thẻ ở danh sách để lọc': 'click a tag in the list to filter',

  // notebook lock
  'Sổ tay đang khoá': 'Notebook locked', 'Mở khoá': 'Unlock',
  'KHOÁ BẰNG PIN': 'PIN LOCK', 'PIN hiện tại': 'Current PIN',
  'Đổi hoặc gỡ PIN': 'Change or remove PIN', 'Đặt PIN': 'Set a PIN',
  'PIN không đúng': 'Wrong PIN',
  'Sổ tay đang khoá — mở khoá để xem nội dung': 'Locked notebook — unlock to read',

  // ── phone shell ──
  // Wording the mobile screens use that the desktop never needed. Same rule as
  // everywhere else: the Vietnamese is the key, so an entry missing here shows
  // Vietnamese in English rather than a broken label.
  'Sự kiện': 'Event', 'Bắt đầu sự kiện': 'Event starts', 'Kết thúc sự kiện': 'Event ends',
  'Quay lại': 'Back', 'Menu tài khoản': 'Account menu', 'Tất cả nhóm': 'All groups',
  'Theo giờ': 'By hour', 'Nhóm': 'Group', 'Ước lượng': 'Estimate', 'Ngày mai': 'Tomorrow',
  'Chào buổi sáng': 'Good morning', 'Chào buổi chiều': 'Good afternoon',
  'Chào buổi tối': 'Good evening', 'bạn': 'you',

  // dashboard cards
  'trong 7 ngày': 'in the last 7 days', 'Cần chú ý': 'Needs attention',
  'Không có sự kiện hôm nay': 'No events today',
  'Chưa có mục nào đặt giờ cho hôm nay': 'Nothing scheduled for today',
  'Không có nhiệm vụ nào sắp trễ hạn': 'Nothing is about to slip',

  // task list
  'Tìm nhiệm vụ, dự án, #tag': 'Search tasks, projects, #tag',
  'Chưa xong': 'Open', 'Ưu tiên cao': 'High priority',
  'Ưu tiên': 'Priority', 'Mới tạo': 'Newest', 'Tên': 'Name',
  'Vuốt ngang để đổi cột · mở thẻ để chuyển trạng thái':
    'Swipe sideways to change column · open a card to change its status',

  // task sheet
  'Tiến độ suy ra từ công việc con': 'Progress follows the subtasks',
  'Chưa có công việc con': 'No subtasks yet', 'Nội dung công việc con': 'Subtask text',
  'Sửa công việc con': 'Edit subtask', 'Tiêu đề không được để trống': 'A title is required',

  // calendar ('Tháng trước' already lives in the kanban block above)
  'Tháng sau': 'Next month',
  'Không có hạn chót nào trong ngày này': 'Nothing due on this day',

  // notes
  'Chưa có ghi chú nào ở đây': 'No notes here yet', 'Ghi chú trống': 'Empty note',
  'Chưa xếp sổ': 'No notebook', 'Không tìm thấy ghi chú': 'Note not found',
  'Mã nguồn Markdown': 'Markdown source', 'Viết ghi chú…': 'Write a note…',
  'Thêm mục checklist': 'Add checklist item', 'Tự lưu sau 500ms': 'Autosaves after 500ms',
  'Vừa xong': 'Just now',

  // notifications
  'Không có thông báo nào': 'No notifications', 'Đã quá hạn': 'Overdue',

  // compose sheet
  'Việc cần làm…': 'What needs doing…', 'Tạo ghi chú': 'Create note',
  'Tạo sự kiện': 'Create event', '— Chưa xếp sổ —': '— No notebook —',
  'NGÀY': 'DAY', 'THÁNG': 'MONTH', 'NĂM': 'YEAR', 'GIỜ': 'HOUR', 'PHÚT': 'MIN',

  // settings, one scrolling page
  'Ngôn ngữ & giao diện': 'Language & appearance', 'Giao diện': 'Appearance', 'Tối': 'Dark',
  'Bản điện thoại chỉ dùng giao diện tối': 'The phone build is dark only',
  'Bảo mật': 'Security', 'Khoá sổ tay tự động': 'Notebook auto-lock',
  '1 · 5 · 15 · 30 · 60 phút · Không bao giờ': '1 · 5 · 15 · 30 · 60 min · Never',
  'Cá nhân': 'Personal', 'Ảnh đại diện': 'Avatar', 'Công ty': 'Company',
  'Lưu trữ & nhắc hẹn': 'Archive & reminders', 'Tự động lưu trữ sau': 'Auto-archive after',
  'chỉ ẩn nhiệm vụ đã xong, không xoá · 0 để tắt':
    'hides finished tasks, never deletes them · 0 turns it off',
  'Cảnh báo Deadline trước': 'Warn before deadline', 'số ngày': 'days',
  'Giờ gửi nhắc': 'Reminder time', 'Tần suất trong ngày': 'Times per day',
  'gửi theo lịch cần tiến trình cron chạy nền':
    'scheduled sending needs a background cron process',
  'Bot Token': 'Bot token', 'Token từ @BotFather': 'Token from @BotFather',
  'Chat ID kiểm tra': 'Test chat ID', 'Chưa nối': 'Not connected',
  'Zalo User ID test': 'Zalo test user ID',
  'Sao lưu & đồng bộ': 'Backup & sync', 'Xuất bản sao (JSON)': 'Export backup (JSON)',
  'Thay toàn bộ · từ chối file không có người dùng nào':
    'Replaces everything · refuses a file with no users',
  'phải gõ đúng chữ RESET để xác nhận': 'you must type RESET exactly to confirm',

  // login
  'Đăng nhập': 'Sign in', 'Đăng xuất': 'Sign out', 'Hiện mật khẩu': 'Show password',
  'Sai tên đăng nhập hoặc mật khẩu': 'Wrong username or password',
  'Phiên đã tự khoá do không hoạt động': 'Session locked after inactivity',
  'Tài khoản demo': 'Demo account',
  'Đổi giao diện sáng/tối': 'Toggle light/dark theme',
};

type Replacer = string | ((...args: string[]) => string);

const DICT_EN_RE: Array<[RegExp, Replacer]> = [
  [/^(\d+) nhiệm vụ$/, '$1 tasks'],
  [/^(\d+) công việc$/, '$1 tasks'],
  [/^(\d+) việc$/, '$1 tasks'],
  [/^Còn (\d+) ngày$/, (_m, n) => (n === '1' ? '1 day left' : n + ' days left')],
  [/^Quá hạn (\d+) ngày$/, (_m, n) => (n === '1' ? '1 day overdue' : n + ' days overdue')],
  [/^Quá hạn$/, 'Overdue'],
  [/^Đến hạn hôm nay$/, 'Due today'],
  [/^(\d+) người thực hiện · (\d+) nhiệm vụ$/, '$1 people · $2 tasks'],
  [/^(\d+)\/(\d+) nhiệm vụ hoàn thành \((\d+)%\)$/, '$1/$2 tasks done ($3%)'],
  [
    /^Chào buổi (sáng|chiều|tối), (.+) 👋$/,
    (_m, p, n) =>
      `Good ${p === 'sáng' ? 'morning' : p === 'chiều' ? 'afternoon' : 'evening'}, ${n} 👋`,
  ],
  [/^(\d+) đang thực hiện · (\d+) đã hoàn thành$/, '$1 in progress · $2 completed'],
  [/^(\d+) ngày$/, '$1 days'],
  [/^\((\d+) việc\)$/, '($1 tasks)'],
  [/^Tháng (\d+), (\d+)$/, 'Month $1, $2'],
  [/^Tháng (\d+)\/(\d+)$/, '$1/$2'],
  [/^Khung giờ (.+)$/, 'Hours $1'],
  [/^(.+) ơi, hôm nay cần làm gì\?$/, '$1, what needs doing today?'],
  [/^Công việc con \((\d+)\/(\d+)\)$/, 'Subtasks ($1/$2)'],
  [/^Đang xem nhóm (.+)$/, 'Viewing group $1'],
  [/^(\d+) dự án$/, '$1 projects'],
  [/^(\d+) ghi chú$/, '$1 notes'],
  [/^Sửa (.+)$/, 'Edited $1'],
  [/^(\d+) phút trước$/, '$1 min ago'],
  [/^(\d+) giờ trước$/, '$1 h ago'],
  [/^(\d+) ngày trước$/, '$1 d ago'],
  [/^vừa xong$/, 'just now'],
  [/^hôm qua$/, 'yesterday'],
  [/^(\d+)% hoàn thành · Xem →$/, '$1% complete · View →'],
  [/^Công việc con \((\d+)\/(\d+)\)$/, 'Subtasks ($1/$2)'],
  [/^Khung giờ (\d+):00 – (\d+):00$/, 'Hours $1:00 – $2:00'],
  [/^Tháng (\d+), (\d+)$/, '$1/$2'],
  [/^Xin chào, (.+)$/, 'Welcome, $1'],

  // ── phone shell ──
  // These only fire when the whole phrase reaches t(); building a sentence out
  // of separately-translated words is what left the phone half in each language.
  [/^(\d+) quá hạn$/, '$1 overdue'],
  [/^trên (\d+) dự án$/, (_m, n) => (n === '1' ? 'across 1 project' : `across ${n} projects`)],
  [/^(\d+) lần$/, (_m, n) => (n === '1' ? 'once a day' : `${n}× a day`)],
  [/^phiên bản (\d+)\/(\d+)$/, 'version $1/$2'],
  [/^Chào buổi (sáng|chiều|tối), (.+)$/, (_m, p, n) =>
    `Good ${p === 'sáng' ? 'morning' : p === 'chiều' ? 'afternoon' : 'evening'}, ${n}`],
];

/** Look one phrase up. Returns null when nothing in the dictionary matches. */
function lookup(phrase: string): string | null {
  const key = phrase.trim();
  if (!key) return null;
  if (DICT_EN[key] !== undefined) return DICT_EN[key];
  for (const [re, rep] of DICT_EN_RE) {
    if (re.test(key)) {
      return typeof rep === 'function'
        ? key.replace(re, (...args) => rep(...(args as string[])))
        : key.replace(re, rep);
    }
  }
  return null;
}

/**
 * Translate `s` when `lang` is English, otherwise return it unchanged.
 * Leading emoji/punctuation is preserved so "📘 Dự án" still translates.
 */
export function translate(s: string, lang: Lang): string {
  if (lang !== 'en' || !s) return s;
  const direct = lookup(s);
  if (direct !== null) return direct;
  const m = s.trim().match(/^([^\p{L}\p{N}]+)(.+)$/u);
  if (m) {
    const inner = lookup(m[2]);
    if (inner !== null) return m[1] + inner;
  }
  return s;
}

export type TranslateFn = (s: string) => string;

export function makeT(lang: Lang): TranslateFn {
  return (s: string) => translate(s, lang);
}
