// GET /api/leaderboard -> { top: [{ name, rp, peak, runs }], me: { place, name, rp } | null }
// Players who have finished at least one ranked run, by RP. Signed in adds your own place.
import { json, player, handle } from './_lib.js';

const TOP = 50;

export const onRequestGet = handle(async ({ request, env }) => {
  const top = await env.DB.prepare('SELECT name, rp, peak, runs FROM players WHERE runs > 0 ORDER BY rp DESC, peak DESC LIMIT ?').bind(TOP).all();
  let me = null;
  if (request.headers.get('authorization')) {
    try {
      const p = await player(request, env);
      const row = await env.DB.prepare('SELECT rp, runs FROM players WHERE id = ?').bind(p.id).first();
      if (row.runs > 0) {
        const above = await env.DB.prepare('SELECT COUNT(*) AS n FROM players WHERE runs > 0 AND rp > ?').bind(row.rp).first();
        me = { place: above.n + 1, name: p.name, rp: row.rp };
      }
    } catch {}
  }
  return json({ top: top.results, me });
});
