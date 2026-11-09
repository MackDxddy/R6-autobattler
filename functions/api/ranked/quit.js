// POST /api/ranked/quit { run } -> { run, profile, delta }
// Ends a ranked run early. A run that hasn't reached 10 wins is scored at its current wins.
import { json, fail, readJson, player, handle } from '../_lib.js';
import { scoreRun, runView, profileOf } from '../_game.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const me = await player(request, env);
  const { run } = await readJson(request, 500);
  const r = await env.DB.prepare('SELECT * FROM runs WHERE id = ? AND player_id = ?').bind(run | 0, me.id).first();
  if (!r) return fail(404, 'No such run');
  let delta = r.rp_delta;
  if (r.status === 'live') delta = (await scoreRun(env, me.id, r.wins)).delta;
  if (r.status !== 'done') await env.DB.prepare("UPDATE runs SET status = 'done', rp_delta = ?, updated_at = ? WHERE id = ?")
    .bind(delta, Date.now(), r.id).run();
  return json({ run: runView({ ...r, status: 'done' }), profile: await profileOf(env, me.id), delta });
});
