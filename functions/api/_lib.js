// Shared bits for the API. The database is bound as env.DB (see wrangler.jsonc).
export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export const fail = (status, error) => json({ error }, status);

export const NAME_RULE = /^[A-Za-z0-9_.-]{3,16}$/; // same as public/auth.js

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const randomHex = bytes => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// Body as JSON, refusing anything over `max` characters
export async function readJson(request, max = 20000) {
  const text = await request.text();
  if (text.length > max) throw fail(413, 'Too big');
  try { return JSON.parse(text); } catch { throw fail(400, 'Bad JSON'); }
}

// "Authorization: Bearer <id>.<token>" -> the player row, or throws a 401 response
export async function player(request, env) {
  const m = /^Bearer (g_[a-z0-9]{8,24})\.([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '');
  if (!m) throw fail(401, 'Not signed in');
  const row = await env.DB.prepare('SELECT id, name, token_hash FROM players WHERE id = ?').bind(m[1]).first();
  if (!row || row.token_hash !== await sha256(m[2])) throw fail(401, 'Not signed in');
  await env.DB.prepare('UPDATE players SET last_seen = ? WHERE id = ?').bind(Date.now(), row.id).run();
  return row;
}

// Wraps a handler so thrown Responses (from the helpers above) are returned as-is
export const handle = fn => async ctx => {
  try { return await fn(ctx); }
  catch (e) { if (e instanceof Response) return e; console.error(e); return fail(500, 'Server error'); }
};
