// GET /api/me -> {id, name, profile: {rp, peak, runs}, run: ranked run in progress or null}.  PATCH /api/me {name} -> {id, name}
import { json, fail, NAME_RULE, readJson, player, handle } from './_lib.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const profile = await env.DB.prepare('SELECT rp, peak, runs FROM players WHERE id = ?').bind(p.id).first();
  const run = await env.DB.prepare("SELECT id, round, wins, losses, hp, status FROM runs WHERE player_id = ? AND status != 'done' ORDER BY id DESC LIMIT 1").bind(p.id).first();
  return json({ id: p.id, name: p.name, profile, run: run || null });
});

export const onRequestPatch = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const { name } = await readJson(request, 500);
  if (typeof name !== 'string' || !NAME_RULE.test(name)) return fail(400, '3 to 16 letters, numbers, _ . or -');
  await env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, p.id).run();
  return json({ id: p.id, name });
});
