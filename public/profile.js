// Shared by menu.html and prep.html: ranks, RP and the saved profile (localStorage battler.profile).
/* ---------- Ranked: R6-style tiers, 5 divisions of 100 RP each; Champion is open-ended ---------- */
const RANKS = [
  ['COPPER', 1000, 'hsl(8 65% 52%)'], ['BRONZE', 1500, 'hsl(28 55% 50%)'], ['SILVER', 2000, 'hsl(220 10% 74%)'], ['GOLD', 2500, 'hsl(45 90% 55%)'],
  ['PLATINUM', 3000, 'hsl(180 50% 55%)'], ['EMERALD', 3500, 'hsl(150 60% 48%)'], ['DIAMOND', 4000, 'hsl(265 65% 72%)'], ['CHAMPION', 4500, 'hsl(340 75% 62%)'],
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const RP_FLOOR = 1000, RP_START = 2000;   // can't drop below Copper V; new players start at Silver V
const RP_TABLE = [-60, -50, -40, -25, -10, 5, 20, 35, 55, 75, 100]; // by final wins (Endless wins past 10 count as 10)
const RP_TAX = 8;                          // each tier up takes 8 more RP off every result
function rankOf(rp) {
  let i = 0; RANKS.forEach((r, k) => { if (rp >= r[1]) i = k; });
  const [name, lo, color] = RANKS[i];
  if (name === 'CHAMPION') return { i, name, color, div: 0, lo, hi: null, label: 'CHAMPION' };
  const div = 5 - Math.min(4, Math.floor((rp - lo) / 100));
  return { i, name, color, div, lo: lo + (5 - div) * 100, hi: lo + (6 - div) * 100, label: `${name} ${ROMAN[div]}` };
}
const rpDelta = (wins, rp) => RP_TABLE[Math.min(10, wins)] - RP_TAX * rankOf(rp).i;
// 1234 -> 1.2K, 1234567 -> 1.2M (under 1000 shown as is)
const fmtK = n => { const a = Math.abs(n), s = n < 0 ? "-" : ""; return !(a >= 1000) ? String(n) : a < 999950 ? s + (a / 1e3).toFixed(1) + "K" : s + (a / 1e6).toFixed(1) + "M"; };
function loadProfile() {
  const d = { rp: RP_START, peak: RP_START, runs: 0 };
  try { return { ...d, ...JSON.parse(localStorage.getItem('battler.profile') || '{}') }; } catch { return d; }
}
const saveProfile = p => { try { localStorage.setItem('battler.profile', JSON.stringify(p)); } catch {} };
function rankHTML(rp) {
  const r = rankOf(rp), f = r.hi ? (rp - r.lo) / (r.hi - r.lo) : 1;
  return `<div class="rankRow" style="--rk:${r.color}"><span class="rhex">${ROMAN[r.div] || '★'}</span><span class="rname">${r.label}</span></div>
    <div class="rbar" style="--rk:${r.color}"><i style="width:${Math.round(f * 100)}%"></i></div>
    <div class="rsub">${fmtK(rp)} RP${r.hi ? ` · ${fmtK(r.hi - rp)} to next division` : ''}</div>`;
}

// Ends the run in progress early (QUIT RUN on the home screen or the in-run menu). A ranked run is scored
// like a finished run at its current wins, so quitting can't dodge a bad run. Returns { text, delta } for
// the home screen, or null when there's no run.
function quitRun() {
  let run = null; try { run = JSON.parse(localStorage.getItem('battler.save')); } catch {}
  if (!run?.mode) return null;
  let delta = null;
  if (run.mode === 'ranked') {
    const P = loadProfile(), before = P.rp;
    P.rp = Math.max(RP_FLOOR, P.rp + rpDelta(run.wins, P.rp)); delta = P.rp - before;
    P.peak = Math.max(P.peak, P.rp); P.runs++; saveProfile(P);
    // The server scores it too (its RP is the real one; the menu copies it back)
    if (run.runId && window.SYNC) SYNC.quitRanked(run.runId);
  }
  ['battler.save', 'battler.run', 'battler.result', 'battler.phase', 'battler.prog'].forEach(k => { try { localStorage.removeItem(k); } catch {} });
  return { text: `RUN QUIT · ${run.wins}-${run.losses}`, delta };
}
globalThis.RANKED = { RANKS, RP_FLOOR, RP_START, RP_TABLE, RP_TAX, rankOf, rpDelta }; // the server scores ranked runs with these
