// POST /api/ranked/fight { run, round, team, trinkets, duos }
//   -> { win, team, trinkets, duos, ghost, ghostName, ghostW, ghostL, run, profile?, delta? }
// The server decides ranked fights: it rebuilds your team from the game's tables, picks the opponent (a real
// board from this round, or an AI board), runs the same fight engine as the page and records the result.
// The page then plays that fight with the returned team and opponent (same boards = same fight).
import { json, fail, readJson, player, handle } from '../_lib.js';
import { RULES, SIMCORE, lossCost, cleanTrinkets, cleanDuos, scoreRun, runView, RUN_WIN } from '../_game.js';

const FRESH = 14 * 24 * 3600 * 1000; // opponents' boards older than two weeks aren't used

export const onRequestPost = handle(async ({ request, env }) => {
  const me = await player(request, env);
  const b = await readJson(request, 60000);
  const r = await env.DB.prepare('SELECT * FROM runs WHERE id = ? AND player_id = ?').bind(b.run | 0, me.id).first();
  if (!r || r.status === 'done') return fail(409, 'This run is over');
  if (b.round !== r.round) return json({ error: 'Out of step', run: runView(r) }, 409);

  const team = RULES.cleanGhost(b.team, { own: true, round: r.round });
  if (!team) return fail(400, 'Bad team');
  const trinkets = cleanTrinkets(b.trinkets, r.round), duos = cleanDuos(b.duos, r.round);

  // Opponent: a real board from this round (closest in wins), else an AI board
  const row = await env.DB.prepare(
    `SELECT b.team, b.round, b.wins, b.losses, p.name FROM boards b JOIN players p ON p.id = b.player_id
     WHERE b.round = ? AND b.player_id != ? AND b.created_at > ?
     ORDER BY ABS(b.wins - ?), RANDOM() LIMIT 1`).bind(r.round, me.id, Date.now() - FRESH, r.wins).first();
  let theirs = null; try { theirs = row && RULES.cleanGhost(JSON.parse(row.team), { round: row.round }); } catch {}
  const opp = theirs ? { ghost: theirs, ghostName: row.name, ghostW: row.wins, ghostL: row.losses }
                     : { ghost: RULES.ghostFor(r.round, team.map(p => p.name)), ghostName: 'AI', ghostW: r.wins, ghostL: r.losses };

  const sim = SIMCORE.simulate({ team, round: r.round, wins: r.wins, trinkets, duos },
                               { name: opp.ghostName, team: opp.ghost, w: opp.ghostW, l: opp.ghostL });
  const win = !!sim.ev[sim.ev.length - 1].win;

  const wins = r.wins + (win ? 1 : 0), losses = r.losses + (win ? 0 : 1), hp = win ? r.hp : Math.max(0, r.hp - lossCost(r.round));
  let status = r.status, scored = null;
  if (status === 'live' && (hp <= 0 || wins >= RUN_WIN)) {
    scored = await scoreRun(env, me.id, wins);
    status = wins >= RUN_WIN && hp > 0 ? 'won' : 'done';
  } else if (status === 'won' && hp <= 0) status = 'done'; // Endless ran out of lives (already scored)
  // One fight per round: this fails if another request already moved the run on
  const up = await env.DB.prepare(
    `UPDATE runs SET round = round + 1, wins = ?, losses = ?, hp = ?, status = ?, rp_delta = COALESCE(?, rp_delta), updated_at = ?
     WHERE id = ? AND round = ?`).bind(wins, losses, hp, status, scored?.delta ?? null, Date.now(), r.id, r.round).run();
  if (!up.meta.changes) return fail(409, 'Out of step');

  await env.DB.prepare('INSERT INTO boards (player_id, mode, round, wins, losses, team, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(me.id, 'ranked', r.round, r.wins, r.losses, JSON.stringify(team.map(({ pid, ...p }) => p)), Date.now()).run();

  return json({ win, team, trinkets, duos, ...opp, run: runView({ ...r, round: r.round + 1, wins, losses, hp, status }),
    ...(scored ? { profile: { rp: scored.rp, peak: scored.peak, runs: scored.runs }, delta: scored.delta } : {}) });
});
