import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';
import { settingsDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

interface PatchSettingsBody {
  companyName?: string;
  companyTagline?: string;
  workStartHour?: number;
  workEndHour?: number;
  autoLockMinutes?: number;
  autoArchiveDays?: number;
  reminderDaysBefore?: number;
  reminderTime?: string;
  reminderPerDay?: number;
  telegramBotToken?: string;
  telegramTestChatId?: string;
  zaloBotToken?: string;
  zaloTestUserId?: string;
  language?: string;
  theme?: string;
  dashboardLayout?: Array<{ id: string; w: number; h: number }>;
  dashboardHidden?: string[];
}

export async function PATCH(req: Request) {
  try {
    const b = await readBody<PatchSettingsBody>(req);
    if (!b) return badRequest('Dữ liệu không hợp lệ');

    const data: Record<string, unknown> = {};
    const strings = [
      'companyName', 'companyTagline', 'reminderTime',
      'telegramBotToken', 'telegramTestChatId', 'zaloBotToken', 'zaloTestUserId',
    ] as const;
    for (const k of strings) if (b[k] !== undefined) data[k] = b[k];

    const numbers = [
      'workStartHour', 'workEndHour', 'autoLockMinutes',
      'autoArchiveDays', 'reminderDaysBefore', 'reminderPerDay',
    ] as const;
    for (const k of numbers) {
      if (b[k] !== undefined) {
        const n = Number(b[k]);
        if (!Number.isFinite(n)) return badRequest(`Giá trị không hợp lệ: ${k}`);
        data[k] = n;
      }
    }

    if (b.language !== undefined) data.language = b.language === 'en' ? 'en' : 'vi';
    if (b.theme !== undefined) data.theme = b.theme === 'dark' ? 'dark' : 'light';
    // Stored as JSON strings — SQLite has no JSON column type.
    if (b.dashboardLayout !== undefined) data.dashboardLayout = JSON.stringify(b.dashboardLayout);
    if (b.dashboardHidden !== undefined) data.dashboardHidden = JSON.stringify(b.dashboardHidden);

    const row = await prisma.settings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    return json({ settings: settingsDTO(row) });
  } catch (e) {
    return serverError(e);
  }
}
