/**
 * POST /api/gemini — server-side proxy to Google Gemini.
 *
 * This exists so the production deployment can talk to Gemini WITHOUT the key
 * ever reaching a browser. The key lives in the Vercel environment variable
 * GEMINI_API_KEY and is read here, server-side, per request.
 *
 * There is a second, clearly-separated path in the client: a user may paste
 * their own key into Settings, which is kept in that browser's localStorage
 * and used to call Gemini directly. That mode is labelled "local" in the UI
 * and is NOT presented as secure — a key held in a browser is readable by
 * anything running in that browser. The client prefers this proxy whenever it
 * answers, and only falls back to the local key when it does not.
 *
 * Deploy note: set GEMINI_API_KEY in Vercel → Project → Settings →
 * Environment Variables. Without it this endpoint reports "not configured"
 * and the client quietly falls back.
 */
const ALLOWED_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);
const DEFAULT_MODEL = 'gemini-2.0-flash';

// A ceiling on what we will relay. The client builds a compact context, but
// the endpoint should not be a way to push megabytes through someone's quota.
const MAX_BODY_CHARS = 120000;

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Capability probe: lets the client decide whether a proxy is available
    // before it decides to fall back to a local key. Deliberately says only
    // whether a key exists — never any part of it.
    return res.status(200).json({ ok: true, configured: !!process.env.GEMINI_API_KEY });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'not_configured',
      message: 'Máy chủ chưa cấu hình GEMINI_API_KEY.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });

  const model = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
  const contents = Array.isArray(body.contents) ? body.contents : null;
  if (!contents || !contents.length) return res.status(400).json({ error: 'missing_contents' });

  const payload = {
    contents,
    generationConfig: Object.assign(
      { temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      body.generationConfig || {}
    ),
  };
  if (body.systemInstruction) payload.systemInstruction = body.systemInstruction;

  const serialised = JSON.stringify(payload);
  if (serialised.length > MAX_BODY_CHARS) {
    return res.status(413).json({ error: 'context_too_large' });
  }

  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: serialised,
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      // Upstream messages can name the key's project or quota. The status is
      // enough for the client to decide what to show the user.
      return res.status(r.status === 429 ? 429 : 502).json({
        error: r.status === 429 ? 'rate_limited' : 'upstream_error',
        status: r.status,
      });
    }
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(504).json({ error: 'upstream_unreachable' });
  }
};
