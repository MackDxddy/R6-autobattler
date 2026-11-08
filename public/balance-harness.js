// Dev tool: build-vs-build win rates. Load in battle.html's console:
//   await import('./balance-harness.js'); MATRIX(60)
// Each build is applied to all five players of a random lineup; both sides get the same lineup.
const opsA = ['ash', 'thermite', 'hibana', 'ace', 'blackbeard', 'buck', 'dokkaebi', 'deimos', 'nomad', 'thatcher', 'twitch', 'grim'];
const opsD = Object.keys(OPS).filter(o => !opsA.includes(o));
const Z = ['Entry', 'Anchor', 'Flank', 'Roam', 'Support'];
const LMGS = Object.keys(WEAPONS).filter(g => WEAPONS[g][0] === 'LMG');
const G = (...ids) => ids.map(id => ({ id }));

window.BUILDS = {
  base: p => {},
  jugg: p => { p.gear = G('kevlar', 'kevlar', 'blood'); },
  fort: p => { p.gear = G('plate', 'plate', 'plate'); },
  glass: p => { p.gear = G('hollow', 'hollow', 'momentum'); },
  hose: (p, i) => { p.weapon = { name: LMGS[i % LMGS.length] }; p.att = ['ext', 'comp']; p.buff = { name: 'Adrenaline' }; },
  pierce: p => { p.buff = { name: 'AP Rounds' }; p.gear = G('hollow', 'momentum'); },
  burn: p => { p.buff = { name: 'Incendiary' }; p.gear = G('kevlar', 'hollow'); },
  scal5: p => { p.gear = [{ id: 'cond', n: 5 }, { id: 'vet', n: 6 }, { id: 'iron', n: 4 }]; },
  scal10: p => { p.gear = [{ id: 'cond', n: 10 }, { id: 'vet', n: 14 }, { id: 'iron', n: 8 }]; },
  mega: p => { p.gear = G('kevlar', 'kevlar', 'kevlar', 'kevlar', 'kevlar', 'kevlar', 'kevlar', 'kevlar', 'kevlar', 'blood'); },
  megaglass: p => { p.gear = G('hollow', 'hollow', 'hollow', 'hollow', 'momentum', 'momentum', 'momentum'); },
  megafort: p => { p.gear = G('plate', 'plate', 'plate', 'plate', 'plate', 'plate'); },
  megaburn: p => { p.buff = { name: 'Incendiary' }; p.gear = G('hollow', 'hollow', 'kevlar', 'kevlar', 'kevlar'); },
  shred: p => { p.gear = G('shred', 'hollow'); },
  skin: p => { p.gear = G('thick', 'thick', 'thick'); },
  megashred: p => { p.gear = G('shred', 'hollow', 'hollow', 'hollow', 'momentum', 'momentum'); },
  megaskin: p => { p.gear = G('thick', 'thick', 'thick', 'thick', 'kevlar', 'kevlar'); },
};
export const CHEAP = ['jugg', 'fort', 'glass', 'hose', 'pierce', 'burn', 'shred', 'skin'];
export const LATE = ['scal10', 'mega', 'megaglass', 'megafort', 'megaburn', 'megashred', 'megaskin'];
// Each build's average against its own tier, and who beats it (40% or less)
window.TIERS = (N = 30) => {
  const out = {};
  for (const [label, set] of [['cheap', CHEAP], ['late', LATE]]) {
    const { M } = MATRIX(N, set);
    out[label] = Object.fromEntries(set.map(a => { const o = set.filter(b => b !== a);
      return [a, { avg: Math.round(o.reduce((s, b) => s + M[a][b], 0) / o.length), beatenBy: o.filter(b => M[a][b] <= 40).map(b => `${b} ${M[a][b]}`) }]; }));
  }
  return out;
};

// Turn off run scaling so only the builds differ
export function neutral() {
  window.skipping = true;
  window.ghostTrinkets = () => [];
  GHOST.w = GHOST.l = 0; RUN.wins = RUN.losses = 0; RUN.trinkets = []; RUN.duos = {};
}

// Returns { M: win% of row vs column, avg: row's average, worst: its hardest matchup }
window.MATRIX = (N = 60, names = Object.keys(BUILDS)) => {
  neutral();
  let seed = 1; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const lineups = []; for (let i = 0; i < N; i++) lineups.push(Z.map(z => ({ name: 'x', op: (r() < .5 ? opsA : opsD)[Math.floor(r() * 12)], zone: z, pow: 120, lvl: 1, passives: [] })));
  const M = {};
  for (const a of names) { M[a] = {}; for (const b of names) { if (a === b) continue; let w = 0;
    lineups.forEach((L, i) => { const A = structuredClone(L), B = structuredClone(L); A.forEach((p, j) => BUILDS[a](p, j)); B.forEach((p, j) => BUILDS[b](p, j));
      RUN.team = A; GHOST.team = B; RUN.round = i; if (simulate().ev.at(-1).win) w++; });
    M[a][b] = Math.round(100 * w / N); } }
  const avg = {}, worst = {};
  for (const a of names) { const o = names.filter(b => b !== a); avg[a] = Math.round(o.reduce((s, b) => s + M[a][b], 0) / o.length); const w = o.sort((x, y) => M[a][x] - M[a][y])[0]; worst[a] = `${w} ${M[a][w]}%`; }
  return { M, avg, worst };
};
