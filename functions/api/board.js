// POST /api/board {mode, round, wins, losses, team} -> {id}
// The board a player locked in for a fight. These become the opponents (ghosts) for other players later.
import { json, fail, readJson, player, handle } from './_lib.js';
import { cleanTeam } from './_board.js';

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

export const onRequestPost = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const b = await readJson(request, 30000);
  if (!['casual', 'ranked'].includes(b.mode) || !int(b.round, 1, 999) || !int(b.wins, 0, 999) || !int(b.losses, 0, 999)
      ) return fail(400, 'Bad board');
  const team = cleanTeam(b.team); if (!team) return fail(400, 'Bad team');
  const r = await env.DB.prepare('INSERT INTO boards (player_id, mode, round, wins, losses, team, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(p.id, b.mode, b.round, b.wins, b.losses, JSON.stringify(team), Date.now()).run();
  return json({ id: r.meta.last_row_id });
});
