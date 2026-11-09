// Boards come from players' devices, so they're untrusted. cleanTeam keeps only known fields, in safe shapes
// and ranges (the game rebuilds and re-scores each player from its own tables before a fight, too).
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const ZONES = ['Entry', 'Anchor', 'Flank', 'Roam', 'Support'];
const ID = /^[a-z0-9-]{1,24}$/, WORD = /^[A-Za-z][A-Za-z .'-]{0,29}$/;
const str = (v, max) => typeof v === 'string' && v.length && v.length <= max ? v : null;
const int = (v, lo, hi, d) => Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : d;
const named = v => v && typeof v === 'object' && str(v.name, 40) ? { name: v.name } : null;

export function cleanTeam(team) {
  if (!Array.isArray(team) || team.length < 1 || team.length > 5) return null;
  const out = [];
  for (const p of team) {
    if (!p || typeof p !== 'object') return null;
    const name = str(p.name, 24), zone = ZONES.includes(p.zone) ? p.zone : null;
    if (!name || !zone) return null;
    out.push({
      name, zone,
      rarity: RARITIES.includes(p.rarity) ? p.rarity : 'common',
      op: typeof p.op === 'string' && ID.test(p.op) ? p.op : null,
      lvl: int(p.lvl, 1, 3, 1),
      mastery: int(p.mastery, 0, 20, 0),
      pow: typeof p.pow === 'number' && isFinite(p.pow) ? Math.min(320, Math.max(40, Math.round(p.pow))) : 100,
      role: typeof p.role === 'string' && WORD.test(p.role) ? p.role : null,
      rp: typeof p.rp === 'string' && ID.test(p.rp) ? p.rp : null,
      passives: Array.isArray(p.passives) ? p.passives.filter(x => typeof x === 'string' && WORD.test(x)).slice(0, 6) : [],
      buffs: (Array.isArray(p.buffs) ? p.buffs : p.buff ? [p.buff] : []).map(named).filter(Boolean).slice(0, 12), weapon: named(p.weapon),
      att: Array.isArray(p.att) ? p.att.filter(x => typeof x === 'string' && ID.test(x)).slice(0, 12) : [],
      gear: Array.isArray(p.gear) ? p.gear.filter(g => g && typeof g.id === 'string' && ID.test(g.id)).slice(0, 12).map(g => ({ id: g.id, n: int(g.n, 0, 99, 0) })) : [],
    });
  }
  return out;
}
