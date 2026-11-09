// POST /api/ranked/start -> { run, profile }
// Starts a ranked run on the server. A run still in progress is scored as quit first (same as QUIT RUN).
import { json, player, handle } from '../_lib.js';
import { closeRun, runView, profileOf, LIVES } from '../_game.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const me = await player(request, env);
  const old = await env.DB.prepare("SELECT * FROM runs WHERE player_id = ? AND status != 'done'").bind(me.id).all();
  for (const r of old.results) await closeRun(env, me.id, r);
  const now = Date.now();
  const r = await env.DB.prepare('INSERT INTO runs (player_id, hp, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING *')
    .bind(me.id, LIVES, now, now).first();
  return json({ run: runView(r), profile: await profileOf(env, me.id) });
});
