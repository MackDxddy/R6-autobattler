// GET /api/save -> {data, updatedAt} (or {data: null}).  PUT /api/save {data} -> {updatedAt}
// A backup of the run and rank kept on this device. Not trusted for anything yet.
import { json, fail, readJson, player, handle } from './_lib.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const row = await env.DB.prepare('SELECT data, updated_at FROM saves WHERE player_id = ?').bind(p.id).first();
  return json(row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null });
});

export const onRequestPut = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const { data } = await readJson(request, 200000);
  if (!data || typeof data !== 'object') return fail(400, 'No data');
  const now = Date.now();
  await env.DB.prepare('INSERT INTO saves (player_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
    .bind(p.id, JSON.stringify(data), now).run();
  return json({ updatedAt: now });
});
