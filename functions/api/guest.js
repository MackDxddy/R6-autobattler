// POST /api/guest {name} -> {id, token}. Makes a guest player. The device keeps the token; only its hash is stored.
import { json, fail, NAME_RULE, randomHex, sha256, readJson, handle, allow } from './_lib.js';

const GUESTS_PER_HOUR = 5; // per IP

export const onRequestPost = handle(async ({ request, env }) => {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!await allow(env, 'guest:' + ip, GUESTS_PER_HOUR, 3600 * 1000)) return fail(429, 'Too many new players from here. Try again later.');
  const { name } = await readJson(request, 500);
  if (typeof name !== 'string' || !NAME_RULE.test(name)) return fail(400, '3 to 16 letters, numbers, _ . or -');
  const id = 'g_' + randomHex(6), token = randomHex(32), now = Date.now();
  await env.DB.prepare('INSERT INTO players (id, token_hash, name, created_at, last_seen) VALUES (?, ?, ?, ?, ?)')
    .bind(id, await sha256(token), name, now, now).run();
  return json({ id, token });
});
