import { badRequest, json, readBody, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * Checks a Zalo OA token by fetching the account profile.
 *
 * The HTML preview could only attempt this from the browser, where Zalo's CORS
 * policy blocked it. Running it here is the proxy that note asked for, so the
 * result now reflects the token rather than a browser restriction.
 */
export async function POST(req: Request) {
  try {
    const b = await readBody<{ token?: string }>(req);
    const token = String(b?.token ?? '').trim();
    if (!token) return badRequest('Nhập Zalo Bot Token trước');

    const res = await fetch('https://openapi.zalo.me/v3.0/oa/getoa', {
      headers: { access_token: token },
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: number; message?: string; data?: { name?: string } }
      | null;

    if (!data) return json({ ok: false, error: 'Không đọc được phản hồi từ Zalo' }, 502);
    if (data.error !== 0) {
      return json({ ok: false, error: data.message ?? 'Zalo phản hồi lỗi' }, 502);
    }
    return json({ ok: true, name: data.data?.name ?? '' });
  } catch (e) {
    return serverError(e);
  }
}
