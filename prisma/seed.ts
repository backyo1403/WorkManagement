/**
 * Demo data, ported from bach-office.html so the Next.js app opens on the same
 * workspace the HTML preview showed: three work groups, six people, four
 * workflows, seven projects and ~23 tasks spread across WORK / SPORT / LIFE.
 *
 * Safe to re-run: it clears the tables it owns first, so `npm run db:seed`
 * always lands on a known state. Task completion is derived (never seeded by
 * hand) using the same rule the app uses.
 */

import { PrismaClient } from '@prisma/client';
import { WORK_GROUPS } from '../src/lib/types';

const prisma = new PrismaClient();

const today = new Date();

/** `n` days from today, optionally pinned to a whole hour. */
function at(days: number, hour?: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  return d;
}

type SeedSub = { text: string; done: boolean; deadline?: Date; start?: Date };

interface SeedTask {
  title: string;
  project: string;
  workflow: string;
  group: string;
  assignee: string;
  executors?: string[];
  priority: 'ASAP' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  deadline?: Date;
  start?: Date;
  estimateHours?: number;
  actualHours?: number;
  completedAt?: Date;
  hashtags?: string[];
  subtasks?: SeedSub[];
}

/** Same rule as src/lib/domain.ts — kept in sync so seeded data is consistent. */
function completionFor(t: SeedTask): number {
  if (t.status === 'DONE') return 100;
  if (!t.subtasks || !t.subtasks.length) return 0;
  return Math.round((t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100);
}

async function main() {
  console.log('· clearing existing data');
  // Order matters only for the tables Prisma cannot cascade on its own.
  await prisma.noteTaskLink.deleteMany();
  await prisma.noteHashtag.deleteMany();
  await prisma.noteAttachment.deleteMany();
  await prisma.noteVersion.deleteMany();
  await prisma.note.deleteMany();
  await prisma.notebook.deleteMany();
  await prisma.taskExecutor.deleteMany();
  await prisma.taskHashtag.deleteMany();
  await prisma.projectHashtag.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.person.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.workGroup.deleteMany();

  console.log('· work groups');
  for (const [i, g] of WORK_GROUPS.entries()) {
    await prisma.workGroup.create({
      data: { key: g.key, name: g.name, icon: g.icon, color: g.color, sortOrder: i },
    });
  }

  console.log('· people');
  const people = [
    { name: 'Bach Office', username: 'admin', password: 'admin123', email: 'owner@bachoffice.vn', phone: '', role: 'OWNER', groupKey: 'work' },
    { name: 'Trần Minh Tuấn', username: 'tuan', password: '123456', email: 'tuan@bachoffice.vn', phone: '0912345001', role: 'LEAD', groupKey: 'work' },
    { name: 'Lê Thị Hương', username: 'huong', password: '123456', email: 'huong@bachoffice.vn', phone: '0912345002', role: 'MEMBER', groupKey: 'work' },
    { name: 'Nguyễn Thị Lan', username: 'lan', password: '123456', email: 'lan@bachoffice.vn', phone: '0912345004', role: 'LEAD', groupKey: 'sport' },
    { name: 'Hoàng Đức Anh', username: 'anh', password: '123456', email: 'anh@bachoffice.vn', phone: '0912345005', role: 'MEMBER', groupKey: 'sport' },
    { name: 'Vũ Thanh Mai', username: 'mai', password: '123456', email: 'mai@bachoffice.vn', phone: '0912345006', role: 'LEAD', groupKey: 'life' },
  ];
  const personId: Record<string, string> = {};
  for (const p of people) {
    const row = await prisma.person.create({ data: p });
    personId[p.username] = row.id;
  }
  const owner = personId.admin;

  console.log('· workflows');
  const workflows = [
    { name: 'Phát triển', icon: 'play', color: '#2563EB', isDefault: true },
    { name: 'Thiết kế', icon: 'star', color: '#EC4899', isDefault: false },
    { name: 'Marketing', icon: 'chart', color: '#F59E0B', isDefault: false },
    { name: 'Vận hành', icon: 'settings', color: '#0EA5E9', isDefault: false },
  ];
  const wfId: Record<string, string> = {};
  for (const w of workflows) {
    const row = await prisma.workflow.create({ data: w });
    wfId[w.name] = row.id;
  }

  console.log('· projects');
  const projects = [
    { name: 'Website Thương mại điện tử', groupKey: 'work', description: 'Xây dựng hệ thống website bán hàng trực tuyến hiện đại.', icon: 'globe', color: '#2563EB', startDate: at(-30), endDate: at(60), goal: 'Hoàn thành MVP, đạt 1000 đơn hàng/tháng', status: 'IN_PROGRESS', priority: 'HIGH', owner: 'tuan', hashtags: [] as string[] },
    { name: 'App Quản lý Nhân sự', groupKey: 'work', description: 'Xây dựng ứng dụng nội bộ quản lý nhân sự cùng OTP.', icon: 'briefcase', color: '#7C3AED', startDate: at(-10), endDate: at(80), goal: 'Launch phiên bản 1.0 trước tháng 3/2026', status: 'IN_PROGRESS', priority: 'MEDIUM', owner: 'huong', hashtags: [] },
    { name: 'Chiến dịch Marketing Q3', groupKey: 'work', description: 'Triển khai quảng cáo trên Meta, Google, email marketing.', icon: 'chart', color: '#EC4899', startDate: at(-20), endDate: at(5), goal: 'Đạt 50.000 lượt tiếp cận và 500 khách hàng mới', status: 'COMPLETED', priority: 'HIGH', owner: 'lan', hashtags: [] },
    { name: 'Nâng cấp Hạ tầng Server', groupKey: 'work', description: 'Di chuyển hệ thống sang cloud, tối ưu chi phí vận hành.', icon: 'board', color: '#0EA5E9', startDate: at(-5), endDate: at(40), goal: 'Giảm downtime xuống dưới 0.1%, giảm chi phí 15%', status: 'IN_PROGRESS', priority: 'MEDIUM', owner: 'tuan', hashtags: ['hatang'] },
    { name: 'Đào tạo Nội bộ 2026', groupKey: 'work', description: 'Chương trình đào tạo kỹ năng mềm và chuyên môn.', icon: 'star', color: '#F59E0B', startDate: at(0), endDate: at(90), goal: '100% người thực hiện hoàn thành khoá học', status: 'NOT_STARTED', priority: 'LOW', owner: 'mai', hashtags: ['daotao'] },
    { name: 'Half Marathon 21K', groupKey: 'sport', description: 'Giáo án 12 tuần chuẩn bị chạy bán marathon.', icon: 'activity', color: '#F4622E', startDate: at(-14), endDate: at(70), goal: 'Về đích dưới 2 giờ', status: 'IN_PROGRESS', priority: 'HIGH', owner: 'tuan', hashtags: ['chaybo'] },
    { name: 'Sức khoẻ & Gia đình', groupKey: 'life', description: 'Thói quen sinh hoạt, khám sức khoẻ và thời gian cho gia đình.', icon: 'leaf', color: '#118C8C', startDate: at(-7), endDate: at(120), goal: 'Ngủ đủ 7h/đêm, khám sức khoẻ định kỳ', status: 'IN_PROGRESS', priority: 'MEDIUM', owner: 'mai', hashtags: ['suckhoe'] },
  ];

  const hashtagId: Record<string, string> = {};
  async function tagId(name: string): Promise<string> {
    if (!hashtagId[name]) {
      const row = await prisma.hashtag.upsert({
        where: { name }, update: {}, create: { name },
      });
      hashtagId[name] = row.id;
    }
    return hashtagId[name];
  }

  const projId: Record<string, string> = {};
  for (const p of projects) {
    const { owner: ownerKey, hashtags, ...rest } = p;
    const row = await prisma.project.create({
      data: { ...rest, ownerId: personId[ownerKey], creatorId: owner },
    });
    projId[p.name] = row.id;
    for (const tag of hashtags) {
      await prisma.projectHashtag.create({
        data: { projectId: row.id, hashtagId: await tagId(tag) },
      });
    }
  }

  console.log('· tasks');
  const tasks: SeedTask[] = [
    // ---- WORK ----
    { title: 'Tối ưu SEO trang sản phẩm', project: 'Website Thương mại điện tử', workflow: 'Phát triển', group: 'work', assignee: 'huong', priority: 'MEDIUM', status: 'TODO', deadline: at(4, 18), start: at(0, 14), estimateHours: 4,
      subtasks: [{ text: 'Audit từ khoá', done: true }, { text: 'Cập nhật thẻ meta', done: false }] },
    { title: 'Kiểm tra lại backend', project: 'Website Thương mại điện tử', workflow: 'Phát triển', group: 'work', assignee: 'admin', priority: 'HIGH', status: 'IN_PROGRESS', deadline: at(0, 18), estimateHours: 3 },
    { title: 'Kiểm thử tích hợp thanh toán', project: 'Website Thương mại điện tử', workflow: 'Phát triển', group: 'work', assignee: 'admin', priority: 'MEDIUM', status: 'IN_PROGRESS', deadline: at(1, 18), estimateHours: 2 },
    { title: 'Review code sprint 15', project: 'Website Thương mại điện tử', workflow: 'Phát triển', group: 'work', assignee: 'tuan', executors: ['tuan', 'huong'], priority: 'HIGH', status: 'IN_PROGRESS', deadline: at(1, 18), estimateHours: 3 },
    { title: 'Thiết kế giao diện trang chủ', project: 'Website Thương mại điện tử', workflow: 'Thiết kế', group: 'work', assignee: 'huong', priority: 'HIGH', status: 'DONE', deadline: at(-3, 18), estimateHours: 5, actualHours: 5.5, completedAt: at(-2) },
    { title: 'Thiết kế database schema nhân sự', project: 'App Quản lý Nhân sự', workflow: 'Phát triển', group: 'work', assignee: 'tuan', priority: 'HIGH', status: 'DONE', deadline: at(-6, 18), estimateHours: 4, actualHours: 4, completedAt: at(-5) },
    { title: 'Xây dựng API giỏ hàng', project: 'Website Thương mại điện tử', workflow: 'Phát triển', group: 'work', assignee: 'tuan', priority: 'HIGH', status: 'IN_PROGRESS', deadline: at(6, 18), estimateHours: 6,
      subtasks: [{ text: 'Thiết kế endpoint', done: true }, { text: 'Viết unit test', done: false }, { text: 'Tài liệu API', done: false }] },
    { title: 'Phân tích báo cáo chiến dịch', project: 'Chiến dịch Marketing Q3', workflow: 'Marketing', group: 'work', assignee: 'lan', executors: ['lan', 'anh'], priority: 'MEDIUM', status: 'DONE', deadline: at(-1, 18), estimateHours: 3, actualHours: 3, completedAt: at(-1) },
    { title: 'Chạy quảng cáo Facebook Ads', project: 'Chiến dịch Marketing Q3', workflow: 'Marketing', group: 'work', assignee: 'lan', executors: ['anh'], priority: 'HIGH', status: 'DONE', deadline: at(-8, 18), estimateHours: 2, actualHours: 2, completedAt: at(-8) },
    { title: 'Viết content SEO blog', project: 'Chiến dịch Marketing Q3', workflow: 'Marketing', group: 'work', assignee: 'anh', priority: 'MEDIUM', status: 'DONE', deadline: at(-5, 18), estimateHours: 3, actualHours: 2.5, completedAt: at(-4) },
    { title: 'Thu thập yêu cầu nghỉ phép', project: 'App Quản lý Nhân sự', workflow: 'Vận hành', group: 'work', assignee: 'mai', priority: 'LOW', status: 'DONE', deadline: at(-3, 18), estimateHours: 1.5, actualHours: 1, completedAt: at(-3) },
    { title: 'Đánh giá nhà cung cấp cloud', project: 'Nâng cấp Hạ tầng Server', workflow: 'Vận hành', group: 'work', assignee: 'tuan', priority: 'HIGH', status: 'DONE', deadline: at(-2, 18), estimateHours: 3, actualHours: 3, completedAt: at(-2) },
    { title: 'Chuẩn bị báo cáo doanh thu tháng 3', project: 'Chiến dịch Marketing Q3', workflow: 'Marketing', group: 'work', assignee: 'lan', priority: 'HIGH', status: 'TODO', deadline: at(3, 18), estimateHours: 2 },
    { title: 'Thiết kế banner quảng cáo Q2', project: 'Chiến dịch Marketing Q3', workflow: 'Thiết kế', group: 'work', assignee: 'anh', priority: 'MEDIUM', status: 'TODO', deadline: at(2, 18), estimateHours: 2.5 },
    { title: 'Cấu hình monitoring & alerting', project: 'Nâng cấp Hạ tầng Server', workflow: 'Vận hành', group: 'work', assignee: 'huong', priority: 'HIGH', status: 'TODO', deadline: at(5, 18), estimateHours: 3, hashtags: ['hatang'] },
    { title: 'Soạn giáo trình kỹ năng mềm', project: 'Đào tạo Nội bộ 2026', workflow: 'Vận hành', group: 'work', assignee: 'mai', priority: 'LOW', status: 'TODO', deadline: at(21, 18), estimateHours: 6, hashtags: ['daotao'] },

    // ---- SPORT ----
    { title: 'Chạy dài 15km cuối tuần', project: 'Half Marathon 21K', workflow: 'Vận hành', group: 'sport', assignee: 'tuan', priority: 'HIGH', status: 'TODO', deadline: at(3, 7), start: at(3, 6), estimateHours: 2, hashtags: ['chaybo'],
      subtasks: [{ text: 'Khởi động 10 phút', done: false }, { text: 'Chạy 15km', done: false }, { text: 'Giãn cơ', done: false }] },
    { title: 'Tập gym — nhóm chân', project: 'Half Marathon 21K', workflow: 'Vận hành', group: 'sport', assignee: 'tuan', priority: 'MEDIUM', status: 'IN_PROGRESS', deadline: at(0, 20), start: at(0, 18), estimateHours: 1.5, hashtags: ['gym'] },
    { title: 'Bơi 1km phục hồi', project: 'Half Marathon 21K', workflow: 'Vận hành', group: 'sport', assignee: 'lan', priority: 'LOW', status: 'TODO', deadline: at(6, 18), estimateHours: 1, hashtags: ['chaybo'] },
    { title: 'Đo lại nhịp tim & VO2max', project: 'Half Marathon 21K', workflow: 'Vận hành', group: 'sport', assignee: 'tuan', priority: 'MEDIUM', status: 'DONE', deadline: at(-4, 18), estimateHours: 1, actualHours: 1, completedAt: at(-4) },

    // ---- LIFE ----
    { title: 'Khám sức khoẻ định kỳ', project: 'Sức khoẻ & Gia đình', workflow: 'Vận hành', group: 'life', assignee: 'mai', priority: 'ASAP', status: 'TODO', deadline: at(2, 9), start: at(2, 8), estimateHours: 3, hashtags: ['suckhoe'],
      subtasks: [{ text: 'Đặt lịch bệnh viện', done: true }, { text: 'Nhịn ăn trước xét nghiệm', done: false }] },
    { title: 'Đọc sách 30 phút mỗi tối', project: 'Sức khoẻ & Gia đình', workflow: 'Vận hành', group: 'life', assignee: 'admin', priority: 'LOW', status: 'IN_PROGRESS', deadline: at(20, 22), start: at(0, 21), estimateHours: 0.5, hashtags: ['thoiquen'] },
    { title: 'Về quê thăm bố mẹ', project: 'Sức khoẻ & Gia đình', workflow: 'Vận hành', group: 'life', assignee: 'admin', priority: 'HIGH', status: 'TODO', deadline: at(12, 18), estimateHours: 8, hashtags: ['giadinh'] },
    { title: 'Dọn dẹp & sắp xếp lại phòng làm việc', project: 'Sức khoẻ & Gia đình', workflow: 'Vận hành', group: 'life', assignee: 'mai', priority: 'LOW', status: 'DONE', deadline: at(-2, 18), estimateHours: 2, actualHours: 2.5, completedAt: at(-2) },
  ];

  for (const t of tasks) {
    const row = await prisma.task.create({
      data: {
        title: t.title,
        priority: t.priority,
        status: t.status,
        deadline: t.deadline ?? null,
        start: t.start ?? null,
        estimateHours: t.estimateHours ?? 2,
        actualHours: t.actualHours ?? 0,
        completion: completionFor(t),
        completedAt: t.completedAt ?? null,
        groupKey: t.group,
        projectId: projId[t.project],
        workflowId: wfId[t.workflow],
        assigneeId: personId[t.assignee],
        creatorId: owner,
        subtasks: {
          create: (t.subtasks ?? []).map((s, i) => ({
            text: s.text,
            done: s.done,
            order: i,
            deadline: s.deadline ?? null,
            start: s.start ?? null,
          })),
        },
        activity: { create: [{ text: 'Nhiệm vụ được tạo' }] },
      },
    });

    for (const ex of t.executors ?? [t.assignee]) {
      await prisma.taskExecutor.create({ data: { taskId: row.id, personId: personId[ex] } });
    }
    for (const tag of t.hashtags ?? []) {
      await prisma.taskHashtag.create({ data: { taskId: row.id, hashtagId: await tagId(tag) } });
    }
  }

  console.log('· notebooks & notes');
  const notebooks = [
    { name: 'Công việc', icon: 'briefcase', color: '#2563EB' },
    { name: 'Cá nhân', icon: 'leaf', color: '#118C8C' },
  ];
  const nbId: Record<string, string> = {};
  for (const [i, nb] of notebooks.entries()) {
    const row = await prisma.notebook.create({ data: { ...nb, sortOrder: i } });
    nbId[nb.name] = row.id;
  }

  const seededNotes = [
    {
      title: 'Trao đổi giá với NRV',
      notebook: 'Công việc',
      project: 'Chiến dịch Marketing Q3',
      group: 'work',
      favorite: true,
      hashtags: ['nrv', 'baogia'],
      // Linked by task title so the seed does not depend on generated ids.
      linkTitles: ['Chuẩn bị báo cáo doanh thu tháng 3', 'Thiết kế banner quảng cáo Q2'],
      content: `# Trao đổi giá với NRV

**Thời gian:** sáng nay
**Thành phần:** NRV, phòng kinh doanh

## Thảo luận
Khách quan tâm mức giá theo **gói năm** thay vì trả theo tháng. Cần đối chiếu lại
biên lợi nhuận trước khi chốt.

> Nếu ký trước cuối quý, có thể giữ mức chiết khấu hiện tại.

## Quyết định
- Gửi báo giá bản nháp trong tuần này
- Chưa cam kết mức chiết khấu quá 15%

## Việc cần làm
- [ ] Chuẩn bị báo giá gói năm
- [ ] Kiểm tra khả năng cung ứng
- [x] Gửi tài liệu giới thiệu
`,
    },
    {
      title: 'Tổng kết tuần',
      notebook: 'Công việc',
      project: null,
      group: 'work',
      favorite: false,
      hashtags: ['tongket'],
      linkTitles: ['Review code sprint 15'],
      templateKey: 'weekly',
      content: `# Tổng kết tuần

## Việc đã xong
- Chốt xong giao diện trang chủ
- Đánh giá nhà cung cấp cloud

## Chưa xong
- API giỏ hàng còn thiếu phần tài liệu

## Bài học
Ước lượng cho phần tích hợp thanh toán quá lạc quan — lần sau nhân đôi.

## Kế hoạch tuần tới
- [ ] Hoàn thiện tài liệu API
- [ ] Cấu hình monitoring
`,
    },
    {
      title: 'Giáo án chạy bộ 12 tuần',
      notebook: 'Cá nhân',
      project: 'Half Marathon 21K',
      group: 'sport',
      favorite: false,
      hashtags: ['chaybo'],
      linkTitles: ['Chạy dài 15km cuối tuần'],
      content: `# Giáo án chạy bộ 12 tuần

Mục tiêu: về đích **dưới 2 giờ**.

## Nguyên tắc
1. Tăng cự ly không quá 10% mỗi tuần
2. Một buổi chạy dài mỗi tuần
3. Nghỉ hoàn toàn ít nhất 1 ngày

## Tuần này
- [ ] Chạy nhẹ 5km
- [ ] Chạy biến tốc
- [ ] Chạy dài 15km

\`\`\`
Nhịp tim mục tiêu: 145–155
\`\`\`
`,
    },
  ];

  for (const n of seededNotes) {
    const note = await prisma.note.create({
      data: {
        title: n.title,
        content: n.content,
        notebookId: nbId[n.notebook],
        projectId: n.project ? projId[n.project] : null,
        groupKey: n.group,
        authorId: owner,
        favorite: n.favorite,
        templateKey: n.templateKey ?? null,
      },
    });
    for (const tag of n.hashtags) {
      await prisma.noteHashtag.create({ data: { noteId: note.id, hashtagId: await tagId(tag) } });
    }
    for (const title of n.linkTitles) {
      const task = await prisma.task.findFirst({ where: { title }, select: { id: true } });
      if (task) await prisma.noteTaskLink.create({ data: { noteId: note.id, taskId: task.id } });
    }
  }

  console.log('· settings');
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const counts = {
    people: await prisma.person.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    subtasks: await prisma.subtask.count(),
    hashtags: await prisma.hashtag.count(),
    notebooks: await prisma.notebook.count(),
    notes: await prisma.note.count(),
    noteLinks: await prisma.noteTaskLink.count(),
  };
  console.log('✔ seeded', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
