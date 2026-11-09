// GET /api/me -> {id, name}.  PATCH /api/me {name} -> {id, name}
import { json, fail, NAME_RULE, readJson, player, handle } from './_lib.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const p = await player(request, env);
  return json({ id: p.id, name: p.name });
});

export const onRequestPatch = handle(async ({ request, env }) => {
  const p = await player(request, env);
  const { name } = await readJson(request, 500);
  if (typeof name !== 'string' || !NAME_RULE.test(name)) return fail(400, '3 to 16 letters, numbers, _ . or -');
  await env.DB.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, p.id).run();
  return json({ id: p.id, name });
});
