// GET /api/opponent?round=3&wins=2 -> { board: { name, wins, losses, team } } or { board: null }
// A real board another player took into a fight at this round, closest in wins, picked at random among those.
// No board yet (or only your own) -> null, and the game uses an AI board instead.
import { json, fail, player, handle } from './_lib.js';
import { cleanTeam } from './_board.js';

const FRESH = 14 * 24 * 3600 * 1000; // boards older than two weeks aren't used

export const onRequestGet = handle(async ({ request, env }) => {
  const me = await player(request, env);
  const q = new URL(request.url).searchParams, round = +q.get('round'), wins = +q.get('wins');
  if (!Number.isInteger(round) || round < 1 || round > 999 || !Number.isInteger(wins) || wins < 0 || wins > 999) return fail(400, 'Bad round');
  const row = await env.DB.prepare(
    `SELECT b.team, b.wins, b.losses, p.name FROM boards b JOIN players p ON p.id = b.player_id
     WHERE b.round = ? AND b.player_id != ? AND b.created_at > ?
     ORDER BY ABS(b.wins - ?), RANDOM() LIMIT 1`).bind(round, me.id, Date.now() - FRESH, wins).first();
  if (!row) return json({ board: null });
  let team = null; try { team = cleanTeam(JSON.parse(row.team)); } catch {}
  return json({ board: team ? { name: row.name, wins: row.wins, losses: row.losses, team } : null });
});
