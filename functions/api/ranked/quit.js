// POST /api/ranked/quit { run } -> { run, profile, delta }
// Ends a ranked run early. A run that hasn't reached 10 wins is scored at its current wins.
// Safe to send twice: only the request that actually closes the run scores it.
import { json, fail, readJson, player, handle } from '../_lib.js';
import { closeRun, runView, profileOf } from '../_game.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const me = await player(request, env);
  const { run } = await readJson(request, 500);
  const r = await env.DB.prepare('SELECT * FROM runs WHERE id = ? AND player_id = ?').bind(run | 0, me.id).first();
  if (!r) return fail(404, 'No such run');
  await closeRun(env, me.id, r);
  const after = await env.DB.prepare('SELECT * FROM runs WHERE id = ?').bind(r.id).first();
  return json({ run: runView(after), profile: await profileOf(env, me.id), delta: after.rp_delta });
});
