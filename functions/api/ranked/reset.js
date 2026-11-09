// POST /api/ranked/reset -> { profile }
// RESET RANK in settings: back to Silver V with no finished runs (off the leaderboard until the next one).
// A ranked run in progress is closed without changing RP.
import { json, player, handle } from '../_lib.js';
import { RANKED, profileOf } from '../_game.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const me = await player(request, env);
  await env.DB.prepare("UPDATE runs SET status = 'done', updated_at = ? WHERE player_id = ? AND status != 'done'").bind(Date.now(), me.id).run();
  await env.DB.prepare('UPDATE players SET rp = ?, peak = ?, runs = 0 WHERE id = ?').bind(RANKED.RP_START, RANKED.RP_START, me.id).run();
  return json({ profile: await profileOf(env, me.id) });
});
