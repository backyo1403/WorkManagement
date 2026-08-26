import { prisma } from '@/lib/prisma';
import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Sends a real test message through the Telegram Bot API.
 *
 * This runs server-side rather than from the browser, which is what the HTML
 * preview could not do: the token never reaches the client's network log, and
 * there is no CORS restriction to work around.
 */
export async function POST(req: Request) {
  try {
    const b = await readBody<{ token?: string; chatId?: string }>(req);
    const token = String(b?.token ?? '').trim();
    const chatId = String(b?.chatId ?? '').trim();
    if (!token || !chatId) return badRequest('Nhập đủ Bot Token và Chat ID');

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const name = settings?.companyName ?? 'Bach Office';

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `✅ Tin nhắn test từ ${name}` }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };

    if (!data.ok) {
      return json({ ok: false, error: data.description ?? 'Telegram từ chối yêu cầu' }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
