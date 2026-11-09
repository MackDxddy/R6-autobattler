// The game's own rules on the server, from the same files the page loads (public/), so a fight decided here
// comes out exactly like the one the page plays.
import './_shim.js';
import '../../public/rarity.js';
import '../../public/pool.js';
import '../../public/rules.js';
import '../../public/sim.js';
import '../../public/profile.js';

export const { RULES, SIMCORE, RANKED } = globalThis;

// Same as prep.html and battle.html
export const LIVES = 10, RUN_WIN = 10;
export const lossCost = day => day <= 2 ? 1 : day <= 4 ? 2 : 3;

// Trinkets: one pick every 3 rounds, of that pick's tier or lower
export function cleanTrinkets(ids, round) {
  const { TRINKETS, TRK_EVERY } = SIMCORE, picks = Math.floor(round / TRK_EVERY), out = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    const t = TRINKETS.find(x => x.id === id);
    if (t && !out.includes(id) && t.tier <= Math.min(4, picks) && out.length < picks) out.push(id);
  }
  return out;
}
// Duo stacks: at most one per fight played, up to each duo's cap
export function cleanDuos(duos, round) {
  const out = {};
  for (const d of SIMCORE.DUOS) {
    const n = duos && Number.isInteger(duos[d.id]) ? duos[d.id] : 0;
    if (n > 0) out[d.id] = Math.min(d.cap, round - 1, n);
  }
  return out;
}

// RP for a finished ranked run (wins past 10 count as 10), applied to the player row
export async function scoreRun(env, playerId, wins) {
  const p = await env.DB.prepare('SELECT rp, peak, runs FROM players WHERE id = ?').bind(playerId).first();
  const rp = Math.max(RANKED.RP_FLOOR, p.rp + RANKED.rpDelta(wins, p.rp));
  const peak = Math.max(p.peak, rp), runs = p.runs + 1;
  await env.DB.prepare('UPDATE players SET rp = ?, peak = ?, runs = ? WHERE id = ?').bind(rp, peak, runs, playerId).run();
  return { rp, peak, runs, delta: rp - p.rp };
}

export const profileOf = (env, playerId) => env.DB.prepare('SELECT rp, peak, runs FROM players WHERE id = ?').bind(playerId).first();
export const runView = r => ({ id: r.id, round: r.round, wins: r.wins, losses: r.losses, hp: r.hp, status: r.status });
