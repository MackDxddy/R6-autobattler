// The fight engine: tables, unit stats and simulate(). Shared by battle.html (to play the fight) and the server
// (functions/api/_game.js, to decide it), so both get the same result from the same two boards.
// Loaded as a plain script in the page (everything here is global); the server imports it and uses SIMCORE.
// simulate(run, ghost): run = { team, round, wins, trinkets, duos }, ghost = { name, team, w, l }.
let SIM_RUN = null, SIM_GHOST = null; // the two sides of the fight being simulated
// Where each position stands on the schematic (% of the map). Matchups share a spot:
// your Entry at their site door facing their Anchor, your Flank meeting their Roam on the top route, and so on.
const SPOTS = {
  mine:   { Anchor: [16, 50], Entry: [65, 50], Flank: [38, 17], Roam: [38, 83], Support: [9, 83] },
  theirs: { Anchor: [84, 50], Entry: [35, 50], Roam: [62, 17], Flank: [62, 83], Support: [91, 83] },
};
// [armor, default primary, damage per bullet, real RPM, class], from R6 Manager's operator data (src/core/data/operators.ts)
const OPS = {
  ash: [1, 'R4-C', 39, 860, 'AR'], thermite: [2, '556XI', 43, 690, 'AR'], hibana: [1, 'TYPE-89', 40, 850, 'AR'], ace: [2, 'AK-12', 45, 850, 'AR'],
  blackbeard: [2, 'SR-25', 72, 260, 'DMR'], buck: [2, 'C8-SFW', 40, 837, 'AR'], dokkaebi: [2, 'Mk 14 EBR', 60, 450, 'DMR'], mute: [2, 'MP5K', 30, 800, 'SMG'],
  smoke: [2, 'FMG-9', 34, 800, 'SMG'], thatcher: [2, 'AR33', 40, 749, 'AR'], lesion: [2, 'T-5 SMG', 28, 900, 'SMG'], vigil: [2, 'K1A', 36, 720, 'SMG'],
  jager: [2, '416-C Carbine', 38, 740, 'AR'], twitch: [2, 'F2', 37, 980, 'AR'], grim: [2, '552 Commando', 43, 690, 'AR'], nomad: [2, 'AK-74M', 44, 650, 'AR'],
  deimos: [2, 'AK-74M', 44, 650, 'AR'], azami: [2, '9x19VSN', 34, 750, 'SMG'], warden: [2, 'MPX', 26, 830, 'SMG'], goyo: [2, 'Vector .45 ACP', 21, 1200, 'SMG'],
  kaid: [3, 'AUG A3', 33, 760, 'SMG'], caveira: [1, 'M12', 36, 550, 'SMG'], solis: [2, 'P90', 22, 970, 'SMG'], ela: [1, 'Scorpion EVO 3 A1', 23, 1080, 'SMG'],
};
// Every primary in R6 Manager's data: [type, damage, RPM (0 = pump or bolt action), magazine]
const WEAPONS = {"L85A2":["AR",47,670,31],"AR33":["AR",40,749,26],"G36C":["AR",38,780,31],"R4-C":["AR",39,860,31],"556XI":["AR",43,690,31],"F2":["AR",37,980,26],"AK-12":["AR",45,850,31],"AUG A2":["AR",38,750,31],"552 Commando":["AR",43,690,26],"416-C Carbine":["AR",38,740,26],"C8-SFW":["AR",40,837,31],"Mk17 CQB":["AR",48,585,21],"PARA-308":["AR",48,650,31],"TYPE-89":["AR",40,850,21],"C7E":["AR",46,800,31],"M762":["AR",45,730,26],"V308":["AR",44,700,51],"Spear .308":["AR",42,700,31],"M4":["AR",44,750,31],"AK-74M":["AR",44,650,31],"ARX200":["AR",47,700,21],"F90":["AR",38,780,31],"Commando 9":["AR",36,780,26],"SC3000K":["AR",45,860,26],"POF-9":["AR",35,740,51],"PCX-33":["AR",36,800,31],"FMG-9":["SMG",34,800,26],"MP5K":["SMG",30,800,21],"UMP45":["SMG",38,600,26],"MP5":["SMG",27,800,31],"P90":["SMG",22,970,51],"9x19VSN":["SMG",34,750,31],"MP7":["SMG",32,900,31],"9mm C1":["SMG",45,575,34],"MPX":["SMG",26,830,31],"M12":["SMG",36,550,31],"MP5SD":["SMG",27,800,31],"PDW9":["SMG",34,800,51],"Vector .45 ACP":["SMG",21,1200,26],"T-5 SMG":["SMG",28,900,31],"Scorpion EVO 3 A1":["SMG",23,1080,41],"K1A":["SMG",36,720,31],"Mx4 Storm":["SMG",26,950,26],"AUG A3":["SMG",33,760,31],"UZK50Gi":["SMG",44,700,21],"6P41":["LMG",46,680,101],"G8A1":["LMG",37,850,51],"M249":["LMG",48,650,61],"T-95 LSW":["LMG",43,650,81],"LMG-E":["LMG",44,730,151],"ALDA 5.56":["LMG",35,900,81],"M249 SAW":["LMG",48,650,61],"DP27":["LMG",49,550,71],"417":["DMR",69,450,21],"OTs-03":["DMR",72,200,11],"CAMRS":["DMR",69,450,21],"SR-25":["DMR",72,260,21],"Mk 14 EBR":["DMR",60,450,21],"AR-15.50":["DMR",72,450,11],"CSRX 300":["DMR",122,0,6],"PMR90A2":["DMR",47,260,11],"M590A1":["SG",48,0,7],"M1014":["SG",34,0,9],"SG-CQB":["SG",53,0,7],"SASG-12":["SG",50,180,9],"M870":["SG",60,0,8],"Super 90":["SG",35,300,9],"SPAS-12":["SG",50,0,7],"SPAS-15":["SG",30,300,7],"SuperNova":["SG",55,0,7],"ITA12L":["SG",50,0,9],"SIX12":["SG",35,200,6],"SIX12 SD":["SG",35,200,6],"FO-12":["SG",25,400,9],"BOSG.12.2":["SG",125,0,2],"ACS12":["SG",69,300,9],"TCSG12":["SG",57,0,6],"SMG-11":["MP",35,1270,17],"Bearing 9":["MP",33,1100,26],"C75 Auto":["MP",35,1000,20],"SMG-12":["MP",25,1270,34],"SPSMG9":["MP",35,1000,16],"Reaper MK2":["MP",33,900,35]};
// Range comes from where a player stands: Entry and Anchor fight up close, Flank and Roam at mid range, Support from long.
// Automatic fire also sprays rounds that never reach the target (pre-fire, suppression), so magazines run dry mid-fight
let SPRAY = 2.2;
const RANGE = { Entry: 'close', Anchor: 'close', Flank: 'mid', Roam: 'mid', Support: 'long' };
// What each type is good at: hit chance and damage by range, reload time, headshots. pump = shots per minute for pump/bolt guns.
const TYPES = {
  AR:  { name: 'Rifle',          reload: 2400, hit: { close: 0,    mid: 0,    long: 0 } },
  SMG: { name: 'SMG',            reload: 2000, hit: { close: .06,  mid: 0,    long: -.08 } },
  MP:  { name: 'Machine pistol', reload: 1700, hit: { close: .05,  mid: -.03, long: -.12 } },
  LMG: { name: 'LMG',            reload: 4500, hit: { close: -.04, mid: 0,    long: .02 } },
  DMR: { name: 'Marksman',       reload: 2600, hit: { close: -.06, mid: 0,    long: .06 }, hs: 1.4, pump: 60 },
  SG:  { name: 'Shotgun',        reload: 3000, hit: { close: .12,  mid: -.08, long: -.2 }, dmg: { close: 1.35, mid: .85, long: .5 }, pump: 70 },
};
// Attachments stay on the gun they were bought for; a new gun comes bare. One of each.
const ATTACH = {
  ext:  { name: 'Extended Mag', info: '+50% mag size.' },
  comp: { name: 'Compensator',  info: '+5% hit chance.' },
  acog: { name: 'ACOG',         info: '+6% hit at range. -4% up close.' },
  grip: { name: 'Angled Grip',  info: 'First shot 80ms faster.' },
};
// Gear is permanent and stacks: buy as many as you like. Scaling gear grows between battles (n = stacks so far).
const GEAR = {
  kevlar:   { name: 'Kevlar Vest',   info: '+32 HP. From the 3rd vest, also -5% RPM.' },
  plate:    { name: 'Ceramic Plate', info: '+10 armor (blocks 10 damage per bullet). -15% fire damage. -2.5% RPM.' },
  hollow:   { name: 'Hollow Points', info: '+40% damage. Armor blocks double.' },
  momentum: { name: 'Momentum',      info: '+15% damage per kill.' },
  blood:    { name: 'Bloodthirst',   info: 'Heal 30 HP per kill.' },
  fresh:    { name: 'Fresh Mag',     info: '+20% damage on the first half of each mag.' },
  wind:     { name: 'Second Wind',   info: 'Below 50% HP: heal 35 and +40% RPM. Once per fight.' },
  revenge:  { name: 'Revenge',       info: '+35% damage for 3s when a teammate dies.' },
  spons:    { name: 'Sponsorship',   info: 'Earns credits. No combat effect.' },
  thick:    { name: 'Thick Skin',    info: 'Takes 10% less damage, plus 4% less per hit taken (max 60%). Half as strong vs Shred.' },
  shred:    { name: 'Shred Rounds',  info: "Hits also deal 8% of the target's max HP. Halves Thick Skin. One per player." },
  cond:     { name: 'Conditioning',  base: 12, scale: 8,  info: '+12 HP. +8 more each battle.' },
  vet:      { name: 'Veteran',       base: 2,  scale: .75, info: '+2 damage. +3 more every 4 kills.' },
  iron:     { name: 'Iron Wall',     base: 1,  scale: .75, info: '+1 armor. +3 more every 4 battles survived.' },
};
// Role passives: a shared pool per role (3 each). Prep picks one per player from their real stats; strength scales with rarity.
// Self passives (Entry, Anchor, Flank, Roam) are full strength in their own zone and half elsewhere; team calls work from anywhere,
// and the same call doesn't stack (best one counts). 'ramp' passives build up during the battle and reset after it.
const ROLE_MULT = { common: 1, rare: 1.33, epic: 1.67, legendary: 2 };
const pct = v => Math.round(v * 100) + '%';
const ROLE_PASSIVES = {
  aim:       { role: 'IGL',     name: 'Aim Discipline', team: true, v: 0.013,  info: v => `Team +${pct(v)} hit chance.` },
  reload:    { role: 'IGL',     name: 'Reload Drills',  team: true, v: 0.3,  info: v => `Team reloads ${pct(v)} faster.` },
  tempo:     { role: 'IGL',     name: 'Tempo',          team: true, v: .04,  ramp: true, info: v => `Team +${pct(v)} RPM per team kill.` },
  lurker:    { role: 'Roam',    name: 'Lurker',         v: 0.12,  ramp: true, info: v => `+${pct(v)} damage per second in a fight (max 5s).` },
  hunter:    { role: 'Roam',    name: 'Hunter',         v: 0.2,   ramp: true, info: v => `+${pct(v)} damage per team kill.` },
  ghost:     { role: 'Roam',    name: 'Ghost',          v: 0.08,  info: v => `${pct(v)} of shots at them miss.` },
  first:     { role: 'Entry',   name: 'First Contact',  v: 0.15,  info: v => `+${pct(v)} RPM for the first 2s.` },
  flash:     { role: 'Entry',   name: 'Flash Hands',    v: 0.1,  info: v => `Their first target misses ${pct(v)} more for 2s.` },
  space:     { role: 'Entry',   name: 'Space Maker',    v: 0.08,  info: v => `When they die, team +${pct(v)} hit on their killer.` },
  hold:      { role: 'Anchor',  name: 'Hold',           v: 6,    info: v => `+${Math.round(v)} armor until first hit.` },
  digin:     { role: 'Anchor',  name: 'Dig In',         v: 1.5,   ramp: true, info: v => `+${v.toFixed(1)} armor per second in a fight (max 8s).` },
  lastline:  { role: 'Anchor',  name: 'Last Line',      v: .1,   info: v => `+${pct(v)} damage while 3+ teammates are alive.` },
  medic:     { role: 'Support', name: 'Medic',          team: true, v: .3,  info: v => `Team heals +${pct(v)}.` },
  quarter:   { role: 'Support', name: 'Quartermaster',  team: true, v: 1,   info: v => `Team gadgets get +${Math.floor(v)} charge${Math.floor(v) > 1 ? 's' : ''}.` },
  ammo:      { role: 'Support', name: 'Ammo Runner',    team: true, v: 0.3, info: v => `Team magazines +${pct(v)}.` },
  crossfire: { role: 'Flank',   name: 'Crossfire',      v: 0.2,  info: v => `+${pct(v)} hit on enemies fighting someone else.` },
  pincer:    { role: 'Flank',   name: 'Pincer',         v: 0.18,  info: v => `+${pct(v)} damage while your Roam is alive.` },
  pressure:  { role: 'Flank',   name: 'Pressure',       v: .05,  ramp: true, info: v => `+${pct(v)} damage per burst fired (max 8).` },
  fill:      { role: 'Flex',    name: 'Fill',           v: .75,  info: v => `Copies a missing role's passive at ${pct(v)}.` },
  glue:      { role: 'Flex',    name: 'Glue',           team: true, v: 4,   info: v => `Team +${Math.round(v)} HP.` },
  adapt:     { role: 'Flex',    name: 'Adaptable',      v: .03,  info: v => `+${pct(v)} hit and +${pct(v)} damage.` },
};
// Recurring scaling (kept all run, grows between battles):
//  Mastery: every battle a player plays makes their role passive stronger.
//  Duos: two roles fighting together build stacks every battle they both play; stacks stay if the pair splits up.
const MASTERY = { per: .08, cap: 10 };
const DUOS = [
  { id: 'call',  a: 'IGL',    b: 'Entry',   to: ['Entry'],         short: 'CP', name: 'Called Push',  per: .03,  cap: 8, info: v => `Entry +${pct(v)} damage.` },
  { id: 'trade', a: 'Entry',  b: 'Support', to: ['Entry'],         short: 'TK', name: 'Trade Kit',    per: 8,    cap: 8, info: v => `Entry +${Math.round(v)} HP.` },
  { id: 'fort',  a: 'Anchor', b: 'Support', to: ['Anchor'],        short: 'FT', name: 'Fortified',    per: 1,    cap: 8, info: v => `Anchor +${Math.round(v)} armor.` },
  { id: 'hunt',  a: 'Flank',  b: 'Roam',    to: ['Flank', 'Roam'], short: 'HP', name: 'Hunting Pair', per: .015, cap: 8, info: v => `Flank and Roam +${pct(v)} hit chance.` },
];
// Trinkets: team-wide and permanent. Every 3rd round you pick 1 of 3; later picks come from better tiers.
// Stat keys (battle): hit, mag, hp, armor, rpm, dmg, rp (role passive strength), heal (team heals per team kill), banner (dmg per win).
// Run keys (prep): income (¢ per round), mastery (extra per battle), duo (stacks added to every duo when picked).
const TRINKETS = [
  { id: 'comms',   tier: 1, short: 'COMMS',  name: 'Comms Headset', hit: .03,          desc: 'Team +3% hit chance.' },
  { id: 'spare',   tier: 1, short: 'AMMO',   name: 'Spare Mags',    mag: .5,           desc: 'Team +50% mag size.' },
  { id: 'pouch',   tier: 1, short: 'POUCH',  name: 'Med Pouch',     hp: 8,             desc: 'Team +8 HP.' },
  { id: 'range',   tier: 1, short: 'RANGE',  name: 'Range Time',    dmg: .05,          desc: 'Team +5% damage.' },
  { id: 'piggy',   tier: 1, short: 'PIGGY',  name: 'Piggy Bank',    income: 1,         desc: '+¢1 per round.' },
  { id: 'supply',  tier: 2, short: 'ARMOR',  name: 'Armor Supply',  armor: 4,          desc: 'Team +4 armor.' },
  { id: 'surgeon', tier: 2, short: 'MEDIC',  name: 'Field Surgeon', heal: 20,          desc: 'Each team kill heals everyone 20 HP.' },
  { id: 'drill',   tier: 2, short: 'DRILL',  name: 'Drill Sergeant', mastery: 1,       desc: '2 mastery per battle instead of 1.' },
  { id: 'chest',   tier: 2, short: 'CHEST',  name: 'War Chest',     income: 3,         desc: '+¢3 per round.' },
  { id: 'chem',    tier: 2, short: 'CHEM',   name: 'Team Chemistry', duo: 3,           desc: '+3 stacks to every duo.' },
  { id: 'invest',  tier: 2, short: 'INVEST', name: 'Org Investment', invest: 2,      desc: '+¢2 per round, +¢2 more each round (max ¢10).' },
  { id: 'banner',  tier: 3, short: 'BANNER', name: 'Team Banner',   banner: .02,       desc: 'Team +2% damage per win.' },
  { id: 'over',    tier: 3, short: 'OVERCLK', name: 'Overclock',    rpm: .12,          desc: 'Team +12% RPM.' },
  { id: 'crates',  tier: 3, short: 'CRATES', name: 'Kevlar Crates', hp: 20,            desc: 'Team +20 HP.' },
  { id: 'head',    tier: 3, short: 'HEADCO', name: 'Head Coach',    rp: .6,            desc: 'Role passives 60% stronger.' },
  { id: 'scopes',  tier: 3, short: 'SCOPES', name: 'Tac Scopes',    hit: .06,          desc: 'Team +6% hit chance.' },
  { id: 'cracked', tier: 4, short: 'CRACKED', name: 'Cracked',      dmg: .25,          desc: 'Team +25% damage.' },
  { id: 'jugg',    tier: 4, short: 'JUGG',   name: 'Juggernaut Kit', armor: 4, hp: 20, desc: 'Team +4 armor, +20 HP.' },
  { id: 'golden',  tier: 4, short: 'GOLDEN', name: 'Golden Hands',  rpm: .2, mag: .5,  desc: 'Team +20% RPM, +50% mag size.' },
  { id: 'dynasty', tier: 4, short: 'DYNASTY', name: 'Dynasty',      banner: .03, income: 3, desc: 'Team +3% damage per win. +¢3 per round.' },
  { id: 'legend',  tier: 4, short: 'LEGEND', name: 'Legend Status', rp: 1.2,           desc: 'Role passives 120% stronger.' },
];
const TRK_EVERY = 3;
const trkTier = round => Math.min(4, Math.floor(round / TRK_EVERY));
const trkSum = (ids, k) => ids.reduce((a, id) => a + (TRINKETS.find(t => t.id === id)?.[k] || 0), 0);
// A ghost board picked trinkets at the same rounds you did (seeded by its name, so replays match)
function ghostTrinkets() {
  const out = [];
  for (let k = 1; k <= Math.floor(SIM_RUN.round / TRK_EVERY); k++) {
    const pool = TRINKETS.filter(t => t.tier === Math.min(4, k) && !out.includes(t.id) && (t.banner || !(t.income || t.mastery || t.duo || t.invest))); // ghosts only carry battle trinkets
    if (pool.length) out.push(pool[Math.abs(hash(SIM_GHOST.name + k)) % pool.length].id);
  }
  return out;
}
const mastMul = m => 1 + MASTERY.per * Math.min(MASTERY.cap, m || 0);
// Each Flex on the team stands in for one missing duo role (in duo order), so Flex-heavy teams can still build duos.
const DUO_ROLES = [...new Set(DUOS.flatMap(d => [d.a, d.b]))];
function flexSubs(team) {
  const need = DUO_ROLES.filter(r => !team.some(p => p.role === r)), m = new Map();
  team.filter(p => p.role === 'Flex').forEach((p, i) => need[i] && m.set(p, need[i]));
  return m;
}
// Who gets this duo's bonus, or null when the team can't field both roles
function duoCast(d, team) {
  const subs = flexSubs(team), roleOf = p => subs.get(p) || p.role;
  if (![d.a, d.b].every(r => team.some(p => roleOf(p) === r))) return null;
  return team.filter(p => d.to.includes(roleOf(p)));
}
const duoStacks = side => side === 'mine' ? (SIM_RUN.duos || {}) : Object.fromEntries(DUOS.map(d => [d.id, Math.min(d.cap, SIM_GHOST.w + SIM_GHOST.l)]));
function duosFor(u, team) {
  const st = duoStacks(u.side);
  return DUOS.filter(d => st[d.id] > 0 && duoCast(d, team)?.includes(u)).map(d => ({ d, n: st[d.id], v: d.per * st[d.id] }));
}
const ROLE_ZONE = { Entry: 'Entry', Anchor: 'Anchor', Flank: 'Flank', Roam: 'Roam' };
const FILL_ORDER = [['IGL', 'aim'], ['Support', 'medic'], ['Entry', 'first'], ['Anchor', 'hold'], ['Roam', 'lurker'], ['Flank', 'crossfire']];
// A unit's role passive, resolved for this battle: { id, v } with rarity, zone and Fill applied
function rolePassive(u, team) {
  let id = u.rp, mult = (ROLE_MULT[u.rarity] || 1) * mastMul(u.mastery);
  if (!ROLE_PASSIVES[id]) return null;
  if (id === 'fill') {
    const missing = FILL_ORDER.find(([r]) => !team.some(x => x.role === r));
    if (!missing) return null;
    id = missing[1]; mult *= ROLE_PASSIVES.fill.v;
  }
  const P = ROLE_PASSIVES[id], zone = ROLE_ZONE[P.role];
  if (zone && u.zone !== zone) mult *= .5;
  return { id, v: P.v * mult };
}
// Overtime: rounds can't stall. After OT.at every shot hits harder and gas chips everyone, faster and faster.
const OT = { at: 9000, tick: 500, gas: .025, dmg: .25 }; // gas: share of max HP per tick, ramping each tick (HP and armor builds suffer alike)
// A headshot adds a flat chunk on top of the bullet: it kills any normal player outright, but a stacked tank can take one.
const HS_BONUS = 100;
// When each position first sees someone (ms into the round)
const CONTACT_AT = { Entry: 250, Flank: 450, Roam: 450, Anchor: 600, Support: 800 };
// Standard utility is one use: each throwable goes off once in the round. Guns are kept (u.weapon) and replace the op's own gun.
const ITEMS = {
  Frag:            { throw: 'frag',   at: 480, label: 'FRAG',          boom: 35, chance: .65, info: 'May hit their lane player for 35. Blocked by ADS.' },
  'Breach Charge': { throw: 'breach', at: 560, label: 'BREACH CHARGE', site: .5, info: '+50% damage vs their Anchor. Blocked by Mute.' },
  Stun:            { throw: 'flash',  at: 'contact', label: 'FLASH',    blind: 2000, info: 'Their lane player misses more for 2s. Blocked by ADS and Warden.' },
  Smoke:           { throw: 'smoke',  at: 'contact', label: 'SMOKE',    smoke: 3000, info: 'Enemies miss more into this lane for 3s. Blocked by ADS and Warden.' },
  'Stim Pack':     { label: 'STIM',     hp: 35,      info: '+35 HP.' },
  // Consumables: simple stat changes for one battle
  'Hot Loads':     { label: 'HOT LOADS',    dmgMul: 1.25,               info: '+25% damage.' },
  'Heavy Rounds':  { label: 'HEAVY ROUNDS', dmgMul: 1.75, rpmMul: .7,   info: '+75% damage, -30% RPM.' },
  'Hair Trigger':  { label: 'HAIR TRIGGER', dmgMul: .9, rpmMul: 1.45,   info: '+45% RPM, -10% damage.' },
  'Extra Mags':    { label: 'EXTRA MAGS',   magMul: 2, reloadMul: .5,   info: '2x mag size, 50% faster reloads.' },
  'Trauma Plate':  { label: 'TRAUMA PLATE', armor: 7,                   info: '+7 armor.' },
  'Steady Aim':    { label: 'STEADY AIM',   hit: .1,                    info: '+10% hit chance.' },
  'Prize Money':   { label: 'PRIZE MONEY', info: '+¢4 if they get the most kills on your team.' },
  Painkillers:     { label: 'PAINKILLERS',  dr: .18,                    info: '-18% damage taken.' },
  Adrenaline:      { label: 'ADRENALINE', adren: .4, info: '+40% RPM for the first 3s.' },
  'AP Rounds':     { label: 'AP ROUNDS', pierce: 1,  info: 'Bullets ignore armor.' },
  Incendiary:      { label: 'INCENDIARY', burn: .03, info: 'Hits burn 3% max HP per second for 2s.' },
  Claymore:        { throw: 'clay',   at: 'contact', label: 'CLAYMORE', boom: 35, chance: .65, info: 'May hit the first pusher for 35. Blocked by Grim.' },
};

// A player can hold any number of one-battle items. Their effects add up (two Hot Loads = +50% damage, not x1.56),
// with floors so stacking a downside can't zero a stat.
const buffsOf = u => Array.isArray(u.buffs) ? u.buffs : u.buff ? [u.buff] : [];
function mergeItems(list, table = ITEMS) {
  const m = { hp: 0, armor: 0, hit: 0, dmgMul: 1, rpmMul: 1, magMul: 1, reloadMul: 1, dr: 0, adren: 0, burn: 0, pierce: 0 };
  for (const b of list) { const it = table[b?.name]; if (!it) continue;
    for (const k of ['hp', 'armor', 'hit', 'dr', 'adren', 'burn']) m[k] += it[k] || 0;
    for (const k of ['dmgMul', 'rpmMul', 'magMul', 'reloadMul']) m[k] += (it[k] || 1) - 1;
    if (it.pierce) m.pierce = 1; }
  m.dmgMul = Math.max(.3, m.dmgMul); m.rpmMul = Math.max(.3, m.rpmMul); m.reloadMul = Math.max(.25, m.reloadMul); m.dr = Math.min(.6, m.dr);
  return m;
}
const attCount = (u, id) => (u.att || []).filter(x => x === id).length;

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
/* ---------- Sim: one 5v5 round of gunfights and utility, seeded so the same boards replay the same round ---------- */
// Guns use their real RPM, pulled toward a shared damage-per-second so no class simply out-DPSes the rest:
// what's left is the profile. DMRs hit hard and slow, SMGs spray light rounds fast, rifles sit between.
const TUNE = { ref: 24000, pull: .75 }; // pull: 1 = every gun the same DPS, 0 = real numbers
// Armor: heavy blocks a flat amount off every bullet (hurts sprays most), light is quicker and can slip the first bullet of a burst
const ARMOR = { 1: { hp: 100, block: 0, react: -60, dodge: .28 }, 2: { hp: 110, block: 2, react: 0, dodge: 0 }, 3: { hp: 125, block: 5, react: 60, dodge: 0 } };
const BASE_RPM = 600; // only used to tell when a buff has moved RPM
const WALL = { dr: .35, hit: .06, breachDmg: .2 }; // Anchors fight from behind a reinforced wall (take less, hit more) until it's breached
const CROSS = { Entry: 'Anchor', Anchor: 'Entry', Flank: 'Roam', Roam: 'Flank' };
const PUSHERS = ['Entry', 'Flank', 'Roam'];

// Each operator's gadget. Charges grow with the op's level.
const GADGETS = {
  ash:        { name: 'Breaching Rounds',  img: 'Breaching-Rounds',      info: 'Opening shots chip their Anchor. Blocked by ADS.' },
  thermite:   { name: 'Exothermic Charge', img: 'Exothermic-Charge',     info: 'Breaches their wall. Stopped by Mute or Kaid.' },
  hibana:     { name: 'X-KAIROS',          img: 'X-Kairos',              info: 'Breaches their wall. Mute can\'t stop it, Kaid can.' },
  ace:        { name: 'S.E.L.M.A.',        img: null,                    info: 'Breaches their wall. 2 tries at L2+. Stopped by Mute or Kaid.' },
  blackbeard: { name: 'Rifle Shield',      img: null,                    info: 'Soaks damage and blocks headshots (one per level).' },
  buck:       { name: 'Skeleton Key',      img: 'Skeleton-Key',          info: 'Opening blast on the lane opponent.' },
  dokkaebi:   { name: 'Logic Bomb',        img: 'Logic-Bomb',            info: 'Reveals enemies so your team hits more. Blocked by Solis. Not Vigil.' },
  deimos:     { name: 'DeathMARK',         img: null,                    info: 'Marks their best player for a big hit bonus. Blocked by Solis. Not Vigil.' },
  nomad:      { name: 'Airjab',            img: 'Airjab-Launcher',       info: 'Knocks back a pusher. Blocked by Grim and ADS.' },
  thatcher:   { name: 'EMP Grenade',       img: null,                    info: 'Destroys their electronics: Kaid claws, Mute jammers, Jäger ADS.' },
  twitch:     { name: 'Shock Drone',       img: 'Shock-Drones',          info: 'Destroys a Jäger ADS or Kaid claw, or scouts an enemy. Mute jams it.' },
  grim:       { name: 'Kawan Hive',        img: null,                    info: 'Disarms their traps and reveals one enemy.' },
  mute:       { name: 'Signal Disruptor',  img: 'Signal-Disruptor',      info: 'Jams breaches (not Hibana) and drones. EMP destroys it.' },
  smoke:      { name: 'Gas Grenade',       img: 'Remote-Gas-Grenade',    info: 'Gas hurts their Entry over time. Blocked by Warden and ADS.' },
  azami:      { name: 'Kiba Barrier',      img: null,                    info: 'Shields herself and your Anchors.' },
  jager:      { name: 'Active Defense',    img: 'Active-Defense-System', info: 'Blocks frags, flashes, smokes, gas, Airjabs and Breaching Rounds. EMP destroys it.' },
  warden:     { name: 'Glance Glasses',    img: 'Glance-Smart-Glasses',  info: 'Team ignores gas and smoke. Sees stunned players.' },
  kaid:       { name: 'Electroclaw',       img: 'Rtila-Electroclaw',     info: 'Stops any breach. EMP destroys it.' },
  goyo:       { name: 'Volcán Shield',     img: 'Volcan-Shield',         info: 'Burns their Entry when they push. Grim disarms it.' },
  vigil:      { name: 'ERC-7',             img: 'ERC-7',                 info: 'Can\'t be revealed. Harder to target.' },
  lesion:     { name: 'Gu Mines',          img: 'Gu-mines',              info: 'Mines chip and slow their pushers. Grim disarms them.' },
  caveira:    { name: 'Silent Step',       img: 'Silent-Step',           info: 'After her first kill, reveals the whole enemy team.' },
  solis:      { name: 'SPEC-IO',           img: null,                    info: 'Blocks their reveals (one per level).' },
  ela:        { name: 'Grzmot Mine',       img: 'Grzmot-Mine',           info: 'Concusses a pusher: they miss more for a while. Grim disarms it.' },
};
const ELECTRONIC = ['kaid', 'mute', 'jager'];
const TRAPS = ['lesion', 'ela', 'goyo', 'nomad'];

// RPM is pulled toward the rate that gives every gun the same damage per second through medium armor;
// TUNE.pull keeps a little of the real gun's feel. Each bullet's damage varies (range dropoff), so there are no hard breakpoints.
const through = dmg => Math.max(1, dmg - ARMOR[2].block);
const normRpm = (dmg, rof) => rof * (TUNE.ref / (rof * through(dmg))) ** TUNE.pull;
const FALLOFF = .2;
// Armor soft cap: however much armor someone stacks, at least 35% of every bullet still gets through
let ARMOR_FLOOR = .28;
// Share of normal accuracy that lands. Lower = more bursts per kill, longer fights, more shooting on screen.
let HIT_SCALE = .45;
// The round plays back ~4x slower than it runs, so reloads and the pause to find a new target are kept short here
// (a 2.4s rifle reload shows as ~4s on screen, not ~10s).
let RELOAD_SCALE = .4, RETARGET = .5;
// Balance dials (gear text in both files must match these)
let KEV_HP = 32, PLATE_ARMOR = 10, HOLLOW_DMG = .4;
let SKIN_BASE = .10, SKIN = .04; // Thick Skin, per copy: damage cut from the first hit, plus this much per hit taken
let HOLLOW_FLOOR = .21; // armor floor for Hollow Points bullets
let SKIN_CAP = .6; // Thick Skin max damage cut
let BLOOD_HEAL = 30, PLATE_BURN = .15, BURN_CAP = .9, SHRED_SKIN = .5; // Bloodthirst heal per kill; fire damage cut per plate (max); share of Thick Skin that works vs Shred bullets // Bloodthirst heal per kill; burn cut per plate
let SHRED = .08; // Shred Rounds: share of the target's max HP added to each hit (doesn't stack)
function statsFor(u) {
  const [armor, opGun] = OPS[u.op] || [2, 'MP5'];
  const gun = WEAPONS[u.weapon?.name] ? u.weapon.name : opGun;
  const [cls, dmg, rof0, mag] = WEAPONS[gun] || ['AR', 38, 700, 30], T = TYPES[cls], rof = rof0 || T.pump || 60;
  const na = id => attCount(u, id), has = k => u.passives?.includes(k), lvl = u.lvl || 1, A = ARMOR[armor];
  const it = mergeItems(buffsOf(u)), gear = u.gear || [];
  const g = id => gear.filter(x => x.id === id).length, gn = id => gear.filter(x => x.id === id).reduce((a, x) => a + (x.n || 0), 0);
  const maxHp = A.hp + (has('Survivor') ? 15 : 0) + KEV_HP * g('kevlar') + GEAR.cond.base * g('cond') + Math.floor(GEAR.cond.scale * gn('cond')) + (it.hp || 0);
  return {
    armor, gun, cls, maxHp, hp: maxHp,
    // Automatics keep their damage and have RPM evened out; pump and bolt guns keep their slow rate and hit harder per shot instead
    dmg: Math.round(dmg * (rof0 ? 1 : normRpm(dmg, rof) / rof) * (1 + .1 * (lvl - 1)) * (1 + HOLLOW_DMG * g('hollow')) * (it.dmgMul || 1)) + GEAR.vet.base * g('vet') + Math.floor(GEAR.vet.scale * gn('vet')),
    rpm: Math.round((rof0 ? normRpm(dmg, rof) : rof) * .95 ** Math.max(0, g('kevlar') - 2) * .975 ** g('plate') * (it.rpmMul || 1)),
    hit: Math.min(.92, .32 + (u.pow - 100) / 250 + .05 * na('comp') + (it.hit || 0)),       // chance each bullet lands
    hs: (.02 + (u.pow - 100) / 3000 + (has('Headhunter') ? .04 : 0)) * through(dmg) / 36 * (T.hs || 1), // per landed bullet, scaled so headshots per second even out across guns
    mag: Math.round(mag * (1 + .5 * na('ext')) * (it.magMul || 1)), reload: Math.round(T.reload * RELOAD_SCALE * (it.reloadMul || 1)), att: [...(u.att || [])], acog: na('acog'),
    block: A.block + PLATE_ARMOR * g('plate') + GEAR.iron.base * g('iron') + Math.floor(GEAR.iron.scale * gn('iron')) + (it.armor || 0), dodge: A.dodge, react: A.react - 80 * na('grip'),
    dr: it.dr || 0, gear, hollow: g('hollow'), momentum: g('momentum'), blood: g('blood'), fresh: g('fresh'), wind: g('wind'), revenge: g('revenge'), thick: g('thick'), shred: g('shred'), plate: g('plate'), reloads: 0, hits: 0, revUntil: 0,
    pierce: !!it.pierce, burn: it.burn || 0, adren: it.adren || 0,
    fx: 0, spent: 0, fxDmg: it.dmgMul > 1 ? it.dmgMul : 0, rpmFx: it.rpmMul > 1 ? it.rpmMul : 0, itArmor: it.armor || 0, steady: it.hit || 0,
  };
}

function simulate(run, ghost) {
  SIM_RUN = run; SIM_GHOST = ghost;
  const rng = mulberry32(hash(JSON.stringify(SIM_RUN.team) + JSON.stringify(SIM_GHOST.team) + SIM_RUN.round));
  const units = [...SIM_RUN.team.map((p, i) => ({ ...p, side: 'mine', id: 'm' + i })), ...SIM_GHOST.team.map((p, i) => ({ ...p, side: 'theirs', id: 't' + i }))];
  units.forEach(u => Object.assign(u, statsFor(u), { mastery: u.mastery ?? (u.side === 'theirs' ? Math.min(MASTERY.cap, SIM_GHOST.w + SIM_GHOST.l) : 0), alive: true, kills: 0, rev: 0, shield: 0, conc: 0, gone: false }));
  const TRK = { mine: SIM_RUN.trinkets || [], theirs: ghostTrinkets() };
  const TS = Object.fromEntries(['mine', 'theirs'].map(s => [s, Object.fromEntries(['hit', 'mag', 'hp', 'armor', 'rpm', 'dmg', 'rp', 'heal', 'banner'].map(k => [k, trkSum(TRK[s], k)]))]));
  const ev = [], alive = s => units.filter(u => u.side === s && u.alive), other = s => s === 'mine' ? 'theirs' : 'mine';
  const has = (u, k) => u.passives?.includes(k), lv = u => u.lvl || 1;
  const supports = s => alive(s).filter(x => x.zone === 'Support').length;
  const solo = u => alive(u.side).length === 1;
  // Seeded shuffle (Fisher-Yates). Never sort with a random comparator: browsers sort that differently,
  // and the server and every device must get the same fight.
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const wpick = (arr, w) => { const tot = arr.reduce((a, x) => a + w(x), 0); let r = rng() * tot; for (const x of arr) { r -= w(x); if (r <= 0) return x; } return arr[arr.length - 1]; };
  let dead = 0, lastAlive = false, time = 0;
  const stage = () => alive('mine').length === 1 || alive('theirs').length === 1 ? 'clutch' : dead < 2 ? 'early' : dead < 5 ? 'mid' : 'late';

  // Pre-round: open lanes, item buffs, supports
  units.forEach(u => { if (CROSS[u.zone] && !units.some(x => x.side === other(u.side) && x.zone === CROSS[u.zone])) u.open = true; });
  units.filter(u => u.open).forEach(u => ev.push({ t: 'note', id: u.id, text: `${u.zone.toUpperCase()} OPEN`, val: '+10% DMG' }));
  ['mine', 'theirs'].forEach(s => { const sup = alive(s).filter(u => u.zone === 'Support'); if (sup.length) ev.push({ t: 'note', id: sup[0].id, team: true, text: 'TEAM', val: `+${8 * sup.length}% DMG` }); });

  /* ---- Utility ---- */
  const wall = { mine: units.some(u => u.side === 'mine' && u.zone === 'Anchor'), theirs: units.some(u => u.side === 'theirs' && u.zone === 'Anchor') };
  const breached = { mine: false, theirs: false };
  units.forEach(u => u.ch = ({ mute: lv(u), kaid: lv(u), jager: 1 + lv(u), lesion: 1 + lv(u), ela: lv(u), nomad: lv(u), solis: lv(u), blackbeard: lv(u), ace: lv(u) >= 2 ? 2 : 1, twitch: lv(u), thatcher: 1 + lv(u), grim: lv(u) })[u.op] ?? 1);
  // Role passives: resolve each unit's, then pool team calls (best of each kind counts)
  const aura = { mine: {}, theirs: {} };
  units.forEach(u => { u.rpx = rolePassive(u, units.filter(x => x.side === u.side)); if (u.rpx) u.rpx.v *= 1 + TS[u.side].rp; const r = u.rpx;
    if (r && ROLE_PASSIVES[r.id].team) aura[u.side][r.id] = Math.max(aura[u.side][r.id] || 0, r.v); });
  const my = (u, id) => u.rpx?.id === id ? u.rpx.v : 0, call = (u, id) => aura[u.side][id] || 0;
  units.forEach(u => {
    u.ch += Math.floor(call(u, 'quarter'));
    u.mag = Math.round(u.mag * (1 + call(u, 'ammo'))); u.reload = Math.round(u.reload * (1 - call(u, 'reload')));
    const glue = Math.round(call(u, 'glue')); u.maxHp += glue; u.hp += glue;
    u.holdArmor = Math.round(my(u, 'hold')); u.block += u.holdArmor;
    u.streak = 0;
    const T = TS[u.side], wins = u.side === 'mine' ? SIM_RUN.wins : SIM_GHOST.w; // trinkets
    u.hit = Math.min(.92, u.hit + T.hit); u.mag = Math.round(u.mag * (1 + T.mag)); u.maxHp += T.hp; u.hp += T.hp;
    u.block += T.armor; u.rpm = Math.round(u.rpm * (1 + T.rpm)); u.dmg = Math.round(u.dmg * (1 + T.dmg + T.banner * wins));
    u.duos = duosFor(u, units.filter(x => x.side === u.side));
    u.duos.forEach(({ d, v }) => {
      if (d.id === 'call') u.dmg = Math.round(u.dmg * (1 + v));
      if (d.id === 'trade') { u.maxHp += Math.round(v); u.hp += Math.round(v); }
      if (d.id === 'fort') u.block += Math.round(v);
      if (d.id === 'hunt') u.hit = Math.min(.92, u.hit + v);
    });
  });
  const tk = { mine: 0, theirs: 0 };   // team kills this battle (Tempo)
  const blockNow = t => t.block + my(t, 'digin') * Math.min(8, Math.max(0, (time - CONTACT_AT[t.zone]) / 1000));
  const gad = (u, text, x = {}) => ev.push({ t: 'gadget', at: time, id: u.id, op: u.op, text, ...x });
  const holders = (s, ops) => alive(s).filter(u => ops.includes(u.op) && u.ch > 0 && !u.gone);
  const spend = u => { u.ch--; if (u.ch <= 0) u.gone = true; return u; };
  const hurt = (t, d) => { d = Math.min(t.hp - 1, Math.round(d * (1 - t.dr))); t.hp -= d; return { id: t.id, dmg: d, hp: t.hp }; }; // utility never finishes anyone off
  // A reveal or mark can be blocked by the target team's Solis; Vigil can never be revealed
  const reveal = (u, foes, amt, text) => {
    const so = holders(other(u.side), ['solis'])[0];
    if (so) { spend(so); return gad(u, text, { block: { id: so.id, op: so.op, text: 'DETECTED' }, spent: so.gone ? [so.id] : [] }); }
    foes = foes.filter(f => f.op !== 'vigil'); if (!foes.length) return;
    foes.forEach(f => f.rev = Math.max(f.rev, amt));
    gad(u, text, { marks: foes.map(f => f.id) });
  };
  const timers = [], after = (at, fn) => timers.push({ at, fn });
  const smokeUntil = { mine: {}, theirs: {} }, smokeBy = { mine: {}, theirs: {} }; // a smoked lane: shots into it miss more

  // Setup: shields go up, traps and electronics get placed
  ev.push({ t: 'setup', ids: units.filter(u => GADGETS[u.op] && !['ash', 'thermite', 'hibana', 'ace', 'buck', 'dokkaebi', 'deimos', 'thatcher', 'twitch', 'grim', 'smoke', 'caveira'].includes(u.op)).map(u => u.id) });
  units.filter(u => u.op === 'azami').forEach(u => units.filter(a => a.side === u.side && (a.zone === 'Anchor' || a === u)).forEach(a => a.shield += 20 + 10 * lv(u)));
  units.filter(u => u.op === 'blackbeard').forEach(u => { u.hsShield = u.ch; u.shield += 20 + 10 * lv(u); });

  // Opening: EMPs and drones clear the way, then breaches, rounds and blasts, then gas and reveals
  units.forEach(u => {
    const s = u.side, foe = other(s), L = lv(u);
    if (globalThis.NO_GADGETS && !buffsOf(u).some(b => ITEMS[b.name])) return; // balance testing: guns only
    if (u.op === 'thatcher') after(250, () => {
      if (!u.alive) return;
      const hit = holders(foe, ELECTRONIC).sort((a, b) => ELECTRONIC.indexOf(a.op) - ELECTRONIC.indexOf(b.op)).slice(0, u.ch);
      if (!hit.length) return;
      hit.forEach(h => { h.ch = 0; h.gone = true; }); u.gone = true;
      gad(u, 'EMP', { marks: hit.map(h => h.id), spent: [u.id, ...hit.map(h => h.id)] });
    });
    if (u.op === 'twitch') after(320, () => {
      if (!u.alive) return;
      const mu = holders(foe, ['mute'])[0];
      if (mu) { u.gone = true; return gad(u, 'DRONE', { block: { id: mu.id, op: 'mute', text: 'JAMMED' }, spent: [u.id] }); }
      const hit = holders(foe, ['jager', 'kaid']).slice(0, u.ch);
      u.gone = true;
      if (!hit.length) { const t = wpick(alive(foe), () => 1); return t && reveal(u, [t], .08, 'DRONE SCOUT'); } // nothing to shock: it scouts instead
      hit.forEach(h => { h.ch = 0; h.gone = true; });
      gad(u, 'DRONE', { marks: hit.map(h => h.id), spent: [u.id, ...hit.map(h => h.id)] });
    });
    if (u.op === 'grim') after(380, () => {
      if (!u.alive) return;
      const traps = holders(foe, TRAPS).slice(0, u.ch);
      traps.forEach(h => { h.ch = 0; h.gone = true; });
      if (traps.length) gad(u, 'TRAPS CLEARED', { marks: traps.map(h => h.id), spent: traps.map(h => h.id) });
      const t = wpick(alive(foe), x => x.pow); if (t) reveal(u, [t], .05, 'REVEAL');
      u.gone = true;
    });
    if (u.op === 'ash') after(450, () => {
      if (!u.alive) return;
      const t = alive(foe).find(x => x.zone === 'Anchor') || alive(foe).find(x => x.zone === CROSS[u.zone]) || alive(foe)[0]; if (!t) return;
      const j = holders(foe, ['jager'])[0];
      u.gone = true;
      if (j) { spend(j); return gad(u, 'ROUNDS', { block: { id: j.id, op: 'jager', text: 'EATEN' }, spent: [u.id, ...(j.gone ? [j.id] : [])] }); }
      gad(u, 'ROUNDS', { hits: [hurt(t, 25 + 8 * (L - 1))], spent: [u.id] });
    });
    if (u.op === 'buck') after(520, () => {
      if (!u.alive) return;
      const t = alive(foe).find(x => x.zone === CROSS[u.zone]) || wpick(alive(foe), () => 1); if (!t) return;
      u.gone = true; gad(u, 'SKELETON KEY', { hits: [hurt(t, 20 + 8 * (L - 1))], spent: [u.id] });
    });
    if (['thermite', 'hibana', 'ace'].includes(u.op)) {
      const tryBreach = at => after(at, () => {
        if (!u.alive || !wall[foe] || breached[foe]) return;
        const blocker = u.op === 'hibana' ? holders(foe, ['kaid'])[0] : holders(foe, ['mute'])[0] || holders(foe, ['kaid'])[0]; // Mute takes what it can, saving claws for Hibana
        spend(u);
        if (blocker) { spend(blocker); gad(u, 'BREACH', { block: { id: blocker.id, op: blocker.op, text: blocker.op === 'kaid' ? 'CLAWED' : 'JAMMED' }, spent: [...(u.gone ? [u.id] : []), ...(blocker.gone ? [blocker.id] : [])] }); if (u.ch > 0) tryBreach(at + 500); return; }
        breached[foe] = true; u.gone = true;
        gad(u, 'WALL BREACHED', { breach: foe, spent: [u.id] });
      });
      tryBreach(600 + (u.op === 'ace' ? 50 : u.op === 'hibana' ? 100 : 0));
    }
    if (u.op === 'smoke') [700, 1300, 1900].forEach((at, k) => after(at, () => {
      if (!u.alive || (k && u.ch === 0)) return;
      const ts = alive(foe).filter(x => x.zone === 'Entry'); if (!ts.length) return;
      const w = holders(foe, ['warden'])[0], j = k === 0 && holders(foe, ['jager'])[0];
      if (k === 2) u.gone = true;
      if (j) { spend(j); u.gone = true; u.ch = 0; return gad(u, 'GAS', { block: { id: j.id, op: 'jager', text: 'EATEN' }, spent: [u.id, ...(j.gone ? [j.id] : [])] }); }
      if (w) { if (k === 0) gad(u, 'GAS', { block: { id: w.id, op: 'warden', text: 'IGNORED' }, spent: [u.id] }); return; }
      gad(u, k ? '' : 'GAS', { hits: ts.map(t => hurt(t, 7 + 4 * L)), quiet: k > 0, spent: k === 2 ? [u.id] : [] });
    }));
    if (u.op === 'dokkaebi') after(800, () => { if (!u.alive) return; u.gone = true; reveal(u, shuffle(alive(foe)).slice(0, 1 + L), .08, 'LOGIC BOMB'); });
    if (u.op === 'deimos') after(900, () => { if (!u.alive) return; u.gone = true; const t = alive(foe).filter(x => x.op !== 'vigil').sort((a, b) => b.pow - a.pow)[0]; if (t) reveal(u, [t], .18 + .04 * L, 'DEATHMARK'); });
    // Traps go off as their pushers make contact
    if (['lesion', 'ela', 'goyo', 'nomad'].includes(u.op)) {
      const lanes = u.op === 'goyo' ? ['Entry'] : u.op === 'nomad' ? ['Flank', 'Roam'] : PUSHERS;
      const n = u.op === 'goyo' ? 1 : u.ch;
      for (let k = 0; k < n; k++) after(CONTACT_AT[lanes[0]] + 150 + k * 350, () => {
        if (!u.alive || u.gone) return;
        const t = wpick(alive(foe).filter(x => lanes.includes(x.zone)), () => 1); if (!t || !lanes.includes(t.zone)) return;
        spend(u); if (u.op === 'goyo') u.gone = true;
        const sp = u.gone ? [u.id] : [];
        if (u.op === 'lesion') { t.next += 200; gad(u, 'GU MINE', { hits: [hurt(t, 9 + 4 * L)], spent: sp }); }
        if (u.op === 'ela')    { t.conc = time + 2500; gad(u, 'CONCUSSED', { marks: [t.id], conc: true, hits: [hurt(t, 10)], spent: sp }); }
        if (u.op === 'goyo')   { gad(u, 'VOLCÁN', { hits: alive(foe).filter(x => x.zone === 'Entry').map(x => hurt(x, 20 + 10 * L)), spent: sp }); }
        if (u.op === 'nomad')  { const j = holders(foe, ['jager'])[0]; if (j) { spend(j); return gad(u, 'AIRJAB', { block: { id: j.id, op: 'jager', text: 'EATEN' }, spent: [...sp, ...(j.gone ? [j.id] : [])] }); }
          t.next += 400; t.conc = time + 1000; gad(u, 'AIRJAB', { marks: [t.id], conc: true, spent: sp }); }
      });
    }
    // Throwables: each goes off once. ADS eats frags, flashes and smokes; Mute jams breach charges; Warden ignores flash and smoke
    buffsOf(u).map(b => ITEMS[b.name]).filter(it => it?.throw).forEach(it => after(it.at === 'contact' ? CONTACT_AT[u.zone] + 120 : it.at, () => {
      if (!u.alive) return;
      const foes = alive(foe), pushers = foes.filter(x => PUSHERS.includes(x.zone));
      const t = it.throw === 'breach' ? (foes.find(x => x.zone === 'Anchor') || foes.find(x => x.zone === CROSS[u.zone]))
        : it.throw === 'clay' ? (pushers.find(x => x.zone === CROSS[u.zone]) || pushers[0])
        : (foes.find(x => x.zone === CROSS[u.zone]) || foes[Math.floor(rng() * foes.length)]);
      if (!t) return;
      const base = { t: 'util', at: time, from: u.id, to: t.id, dmg: 0, hp: t.hp, label: it.label, fx: it.throw };
      const block = (b, text) => { spend(b); ev.push({ ...base, block: { id: b.id, op: b.op, text }, spent: b.gone ? [b.id] : [] }); };
      const ads = ['frag', 'flash', 'smoke'].includes(it.throw) && holders(foe, ['jager'])[0];
      if (ads) return block(ads, 'EATEN');
      const mu = it.throw === 'breach' && holders(foe, ['mute'])[0];
      if (mu) return block(mu, 'JAMMED');
      const gr = it.throw === 'clay' && alive(foe).find(x => x.op === 'grim');
      if (gr) return ev.push({ ...base, block: { id: gr.id, op: 'grim', text: 'SPOTTED' } });
      const wd = ['flash', 'smoke'].includes(it.throw) && alive(foe).find(x => x.op === 'warden');
      if (wd) return ev.push({ ...base, block: { id: wd.id, op: 'warden', text: 'IGNORED' } });
      if (it.boom) { if (rng() >= it.chance) return ev.push({ ...base, missed: true }); const h = hurt(t, it.boom); return ev.push({ ...base, dmg: h.dmg, hp: t.hp }); }
      if (it.site) { u.siteBonus = (u.siteBonus || 0) + it.site; return ev.push(base); }
      if (it.blind) { t.blind = time + it.blind; t.blindBy = u; return ev.push(base); }
      if (it.smoke) { smokeUntil[s][u.zone] = time + it.smoke; smokeBy[s][u.zone] = u; return ev.push({ ...base, to: u.id }); }
    }));
  });

  // Live numbers for this moment of the round
  const rpmNow = (u, st) => u.rpm * (1 + call(u, 'tempo') * tk[u.side]) * (time < CONTACT_AT[u.zone] + 2000 ? 1 + my(u, 'first') : 1) * (u.adren && time < CONTACT_AT[u.zone] + 3000 ? 1 + u.adren : 1) * (st === 'early' && has(u, 'Opener') ? 1.25 : 1) * ((st === 'late' || st === 'clutch') && has(u, 'Closer') ? 1.25 : 1) * (u.winded ? 1 + .4 * u.wind : 1);
  const dmgNow = (u, st, tg) => u.dmg * (1 + my(u, 'lurker') * Math.min(5, Math.max(0, (time - CONTACT_AT[u.zone]) / 1000)) + my(u, 'hunter') * tk[u.side]
      + my(u, 'pressure') * Math.min(8, u.streak) + (alive(u.side).length >= 3 ? my(u, 'lastline') : 0) + (alive(u.side).some(x => x.zone === 'Roam') ? my(u, 'pincer') : 0) + my(u, 'adapt')) * (1 + .15 * u.momentum * u.kills) * (time > OT.at ? 1 + OT.dmg * (time - OT.at) / 1000 : 1) * (TYPES[u.cls].dmg?.[RANGE[u.zone]] ?? 1) * (tg?.zone === 'Anchor' && u.siteBonus ? 1 + u.siteBonus : 1) * (u.open ? 1.1 : 1) * (1 + .08 * supports(u.side)) * (solo(u) && has(u, 'Clutch Gene') ? 1.25 : 1)
    * (breached[other(u.side)] && u.zone === 'Entry' && st === 'early' ? 1 + WALL.breachDmg : 1)
    * (u.fresh && u.ammo > u.mag / 2 ? 1 + .2 * u.fresh : 1) * (u.revenge && time < u.revUntil ? 1 + .35 * u.revenge : 1)
    * (has(u, 'Winner') && alive(u.side).length > alive(other(u.side)).length ? 1.15 : 1); // Winner: plays from in front
  const takeMul = (t, shred) => (1 - t.dr) * (1 - Math.min(SKIN_CAP, t.thick * (shred ? SHRED_SKIN : 1) * (SKIN_BASE + SKIN * t.hits))) * (t.zone === 'Anchor' && wall[t.side] && !breached[t.side] ? 1 - WALL.dr : 1); // share of damage that gets through

  // Everyone runs on one clock. Each player fires bursts on their own rhythm: a burst is a fixed trigger-pull,
  // so a fast gun puts more (lighter) rounds into it. They shoot whoever they can see, mostly the nearest enemy.
  const WINDOW = 600, RESET = 250; // pump and bolt guns: one trigger-pull window, then a short pause
  // Automatics vary each trigger pull: a tap, a short burst, a long spray or the rest of the mag, each with a pause that fits it.
  // [min shots, max shots (long: share of what's left in the mag), min pause, max pause]; mix = chance of each by gun type
  const FIRE = [['tap', 1, 1, 120, 260], ['short', 2, 3, 160, 340], ['long', .4, .7, 220, 420], ['dump', 1, 1, 80, 180]];
  const FIRE_MIX = { AR: [.15, .35, .3, .2], SMG: [.1, .3, .3, .3], MP: [.1, .3, .3, .3], LMG: [.05, .25, .35, .35] };
  const react = u => Math.max(100, 420 - (u.pow - 100) * 2.5 + u.react);
  const pos = u => SPOTS[u.side][u.zone], dist = (a, b) => Math.hypot(pos(a)[0] - pos(b)[0], pos(a)[1] - pos(b)[1]);
  units.forEach(u => { u.ammo = u.mag; u.next = CONTACT_AT[u.zone] + react(u) + rng() * 250; u.tg = null; u.by = null; u.killAt = -1e9; });
  // A death, from a gun, fire or overtime gas (killer may be null)
  const die = (killer, victim, at, hs, how) => {
    if (!victim.alive) return;
    const st = stage();
    const tag = how || (hs ? 'HEADSHOT' : at - victim.killAt < 2200 ? 'TRADE'
      : st === 'clutch' && solo(killer) && has(killer, 'Clutch Gene') ? 'CLUTCH GENE'
      : st === 'early' && has(killer, 'Opener') ? 'OPENER'
      : (st === 'late' || st === 'clutch') && has(killer, 'Closer') ? 'CLOSER'
      : dead === 0 ? 'OPENING PICK' : '');
    victim.alive = false; victim.hp = 0; dead++; tk[other(victim.side)]++;
    alive(victim.side).forEach(x => { if (x.revenge) x.revUntil = at + 3000; }); // Revenge
    if (killer && my(victim, 'space')) killer.rev = Math.max(killer.rev, my(victim, 'space'));   // Space Maker: their killer is exposed
    if (killer) { killer.kills++; killer.killAt = at; }
    ev.push({ t: 'kill', at, killer: killer?.id ?? null, victim: victim.id, tag });
    if (!killer) return;
    // Caveira's first kill becomes an interrogation: the whole enemy team is revealed
    if (killer.op === 'caveira' && !killer.gone && killer.alive) { killer.gone = true; time = Math.max(time, at + 200); reveal(killer, alive(victim.side), .08, 'INTERROGATED'); }
    // Anyone who was on the victim has to find a new angle
    alive(killer.side).forEach(u => { if (u.tg === victim) { u.tg = null; u.next = Math.max(u.next, at + RETARGET * react(u) + 80 + rng() * 150); } });
    // Their teammates swing toward the killer to trade
    alive(victim.side).forEach(u => { if (dist(u, killer) < 40 && rng() < .5) u.by = killer; });
    // Bloodthirst: the killer heals
    if (TS[killer.side].heal) alive(killer.side).forEach(x => { const amt = Math.min(TS[killer.side].heal, x.maxHp - x.hp); if (amt > 0) { x.hp += amt; ev.push({ t: 'heal', at: at + 250, from: x.id, to: x.id, amt, hp: x.hp }); } });
    if (killer.blood && killer.alive) { const amt = Math.min(BLOOD_HEAL * killer.blood, killer.maxHp - killer.hp); if (amt > 0) { killer.hp += amt; ev.push({ t: 'heal', at: at + 200, from: killer.id, to: killer.id, amt, hp: killer.hp }); } }
    // Supports patch up their most hurt teammate after each kill
    ['mine', 'theirs'].forEach(s => {
      const sup = alive(s).find(x => x.zone === 'Support'); if (!sup) return;
      const h = alive(s).filter(x => x.hp < x.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (!h) return;
      const amt = Math.min(Math.round(20 * (1 + call(sup, 'medic'))), h.maxHp - h.hp); h.hp += amt;
      ev.push({ t: 'heal', at: at + 400, from: sup.id, to: h.id, amt, hp: h.hp });
    });
  };
  // Fire: ticks every half second while it lasts
  const ignite = (by, t) => {
    const fresh = !(t.burnUntil > time); t.burnUntil = time + 2000; t.burnBy = by;
    if (!fresh) return;
    const tick = at => after(at, () => {
      if (!t.alive || !(t.burnUntil >= at)) return;
      const d = Math.max(1, Math.round(t.maxHp * by.burn / 2 * (1 - Math.min(BURN_CAP, PLATE_BURN * t.plate)))); t.hp -= d; by.fx += d;
      ev.push({ t: 'dot', at, id: t.id, dmg: d, hp: Math.max(0, t.hp), kind: 'burn' });
      if (t.hp <= 0) return die(by.alive ? by : null, t, at, false, 'BURNED');
      tick(at + 500);
    });
    tick(time + 500);
  };
  // Overtime: from OT.at, gas chips everyone and ramps each tick. The lowest HP goes first; stop once a team is gone.
  after(OT.at, () => { ev.push({ t: 'ot', at: OT.at }); });
  for (let k = 1; k < 60; k++) after(OT.at + k * OT.tick, () => {
    const at = OT.at + k * OT.tick;
    for (const u of units.filter(x => x.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)) {
      if (!alive('mine').length || !alive('theirs').length) break;
      const d = Math.max(1, Math.round(u.maxHp * OT.gas * k)); u.hp -= d; ev.push({ t: 'dot', at, id: u.id, dmg: d, hp: Math.max(0, u.hp), kind: 'gas' });
      if (u.hp <= 0) die(null, u, at, false, 'OVERTIME');
    }
  });
  const pickTarget = sh => wpick(alive(other(sh.side)), x =>
    (x === sh.by ? 3 : 1) * (x.tg === sh ? 1.5 : 1) * (CROSS[sh.zone] === x.zone ? 2 : 1) * (x.op === 'vigil' ? .6 : 1) * (x.rev ? 1.5 : 1) / (dist(sh, x) + 10) ** 2);

  ev.push({ t: 'start', at: 0 });
  for (let guard = 0; guard < 4000 && alive('mine').length && alive('theirs').length; guard++) {
    const sh = units.filter(u => u.alive).sort((a, b) => a.next - b.next)[0];
    timers.sort((a, b) => a.at - b.at);
    if (timers.length && timers[0].at <= sh.next) { const tm = timers.shift(); time = tm.at; tm.fn(); continue; }
    time = sh.next;
    const st = stage();
    if (st === 'clutch' && !lastAlive) {
      lastAlive = true;
      const c = alive('mine').length === 1 ? alive('mine')[0] : alive('theirs')[0];
      ev.push({ t: 'clutch', at: time, id: c.id, n: alive(other(c.side)).length });
    }
    // Stick with your target; sometimes swing onto whoever is hitting you
    let tg = sh.tg?.alive ? sh.tg : null;
    if (tg && !sh.jump && sh.by?.alive && sh.by !== tg && rng() < .25) tg = null;
    if (!tg) {
      tg = pickTarget(sh);
      sh.tg = tg; sh.jump = tg.tg !== sh;               // they're looking elsewhere: you get the jump on them
      ev.push({ t: 'aim', at: time, from: sh.id, to: tg.id });
      if (!tg.fired) tg.next = Math.min(tg.next, time + react(tg) * .8 + rng() * 100); // they see the peek and swing back
      sh.next = time + 120; continue;                   // a beat to line up the shot
    }
    // The burst: each bullet rolls to hit, each hit might be a headshot; armor blocks a flat amount per bullet
    const rpm = rpmNow(sh, st), mix = FIRE_MIX[sh.cls];
    let shots, pause = RESET;
    if (!mix) { const n = rpm * WINDOW / 60000; shots = Math.min(sh.ammo, Math.max(1, Math.floor(n) + (rng() < n % 1 ? 1 : 0))); }
    else {
      const left = Math.max(1, Math.ceil(sh.ammo / SPRAY)); let r = rng(), k = 0;
      while (k < 3 && r >= mix[k]) r -= mix[k++];
      const [mode, a, b, p0, p1] = FIRE[k];
      shots = mode === 'long' ? Math.max(4, Math.round(left * (a + rng() * (b - a)))) : mode === 'dump' ? left : a + Math.floor(rng() * (b - a + 1));
      shots = Math.min(left, shots); pause = p0 + rng() * (p1 - p0);
    }
    if (sh.rpmFx) sh.fx += shots * (1 - 1 / sh.rpmFx);
    if (sh.adren && time < CONTACT_AT[sh.zone] + 3000) sh.fx += shots * sh.adren / (1 + sh.adren);
    if (my(sh, 'flash') && !sh.flashed) { sh.flashed = true; tg.fhUntil = time + 2000; tg.fhV = my(sh, 'flash'); }   // Flash Hands: first target
    sh.streak++;                                                                                                         // Pressure: bursts fired
    let hitP = Math.max(.05, Math.min(.92, sh.hit + call(sh, 'aim') + my(sh, 'adapt') + (tg.tg && tg.tg !== sh ? my(sh, 'crossfire') : 0) - (sh.fhUntil > time ? sh.fhV : 0) + TYPES[sh.cls].hit[RANGE[sh.zone]] + sh.acog * (RANGE[sh.zone] === 'close' ? -.04 : .06) + (sh.jump ? .1 : 0) + tg.rev - (sh.conc > time ? .2 : 0) - (sh.blind > time ? .3 : 0) - ((smokeUntil[tg.side][tg.zone] || 0) > time ? .25 : 0) + (sh.zone === 'Anchor' && wall[sh.side] && !breached[sh.side] ? WALL.hit : 0)));
    hitP *= HIT_SCALE;   // one global dial: every bonus and penalty above shrinks with it
    const hsP = sh.hs + (solo(sh) && has(sh, 'Clutch Gene') ? .04 : 0);
    sh.jump = false; sh.fired = true;
    const b = []; let dmg = 0, hs = false, saved = false, cut = false;
    const gap = 60000 / rpm;
    // Taking fire wakes a player who hasn't started shooting yet
    const wakeAt = time + react(tg) * .6 + rng() * 120;
    for (let k = 0; k < shots && dmg < tg.hp; k++) {
      // A burst stops when its target is ready to fire their first shots, so nobody dies without shooting back
      if (k > 0 && !tg.fired && time + k * gap > Math.min(tg.next, dmg ? wakeAt : Infinity)) { cut = true; break; }
      if (k === 0 && tg.dodge && rng() < tg.dodge) { b.push(0); continue; }
      if (my(tg, 'ghost') && rng() < my(tg, 'ghost')) { b.push(0); continue; }    // Ghost: slips bullets      // light ops slip the first round
      const roll = rng();
      if (roll >= hitP) {
        if (sh.blind > time && roll < hitP + .3 * HIT_SCALE) sh.blindBy.fx++;
        else if ((smokeUntil[tg.side][tg.zone] || 0) > time && roll < hitP + .25 * HIT_SCALE) smokeBy[tg.side][tg.zone].fx++;
        b.push(0); continue;
      }
      if (sh.steady && roll >= hitP - sh.steady * HIT_SCALE) sh.fx++;
      let bonus = 0;
      if (rng() < hsP) {
        if (tg.hsShield > 0) { tg.hsShield--; saved = true; }
        else if (tg.hp - dmg <= HS_BONUS + dmgNow(sh, st, tg)) { hs = true; b.push(tg.hp - dmg); dmg = tg.hp; break; }
        else bonus = HS_BONUS;                                                       // a tank survives it, barely
      }
      const raw = dmgNow(sh, st, tg) * (1 - FALLOFF + rng() * 2 * FALLOFF) * takeMul(tg, sh.shred), blk = sh.pierce ? 0 : blockNow(tg) * (sh.hollow ? 2 : 1);
      const floor = sh.hollow && !sh.pierce ? HOLLOW_FLOOR : ARMOR_FLOOR;
      let d = Math.max(1, Math.round(Math.max(raw * floor, raw - blk))) + bonus;
      const arm = (r, k) => Math.max(1, Math.round(Math.max(r * floor, r - k))) + bonus;
      if (sh.fxDmg) sh.fx += d - arm(raw / sh.fxDmg, blk);
      if (sh.siteBonus && tg.zone === 'Anchor') sh.fx += d - arm(raw / (1 + sh.siteBonus), blk);
      if (sh.pierce) sh.fx += d - arm(raw, blockNow(tg) * (sh.hollow ? 2 : 1));
      if (tg.itArmor && !sh.pierce) tg.fx += arm(raw, Math.max(0, blk - tg.itArmor * (sh.hollow ? 2 : 1))) - d;
      if (tg.dr) tg.fx += arm(raw / (1 - tg.dr), blk) - d;
      if (sh.shred) d += Math.round(tg.maxHp * SHRED);   // Shred Rounds (one per player): the bigger they are, the more it hurts
      if (tg.shield > 0) { const a = Math.min(tg.shield, d); tg.shield -= a; d -= a; }
      d = Math.min(tg.hp - dmg, d); b.push(Math.max(d, .001)); dmg += d; if (d > 0) tg.hits++;
    }
    dmg = Math.round(dmg);
    if (cut) { shots = b.length; pause = 30 + rng() * 60; }
    if (dmg && !tg.fired && tg.hp - dmg > 0) tg.next = Math.min(tg.next, wakeAt);
    tg.hp -= dmg; if (dmg) { tg.by = sh; if (tg.holdArmor) { tg.block -= tg.holdArmor; tg.holdArmor = 0; } if (sh.burn && tg.hp > 0) ignite(sh, tg); }
    ev.push({ t: 'shot', at: time, from: sh.id, to: tg.id, b: b.map(x => x ? Math.round(x) || 1 : 0), cad: Math.round(60000 / rpm), dmg, hs, saved, hp: tg.hp });
    if (tg.wind && !tg.winded && tg.hp > 0 && tg.hp < .5 * tg.maxHp) { // Second Wind
      tg.winded = true; const amt = Math.min(35 * tg.wind, tg.maxHp - tg.hp); tg.hp += amt; ev.push({ t: 'heal', at: time + 120, from: tg.id, to: tg.id, amt, hp: tg.hp });
    }
    sh.next = time + shots * 60000 / rpm * (.9 + rng() * .2) + pause;
    const used = ['SG', 'DMR'].includes(sh.cls) ? shots : Math.ceil(shots * SPRAY);
    sh.ammo -= used; sh.spent += used;
    ev.at(-1).ammo = Math.max(0, sh.ammo);
    if (sh.ammo <= 0) { sh.ammo = sh.mag; sh.reloads++; ev.push({ t: 'reload', at: time + b.length * 60000 / rpm, id: sh.id, dur: sh.reload }); sh.next += sh.reload; }
    if (tg.hp > 0) continue;

    die(sh, tg, time + b.length * 60000 / rpm, hs);
  }
  ev.sort((a, b) => (a.at ?? -1) - (b.at ?? -1));
  ev.push({ t: 'result', at: Math.max(time, ...ev.map(e => e.at || 0)) + 600, win: alive('mine').length > 0, left: alive('mine').length || alive('theirs').length });
  return { units, ev, wall, breached, trk: TRK };
}
globalThis.SIMCORE = { SPOTS, buffsOf, mergeItems, ARMOR, ARMOR_FLOOR, ATTACH, BASE_RPM, BLOOD_HEAL, CONTACT_AT, CROSS, DUOS, DUO_ROLES, ELECTRONIC, FALLOFF, FILL_ORDER, GADGETS, GEAR, HIT_SCALE, HOLLOW_FLOOR, HS_BONUS, ITEMS, KEV_HP, MASTERY, OPS, OT, PUSHERS, RANGE, ROLE_MULT, ROLE_PASSIVES, ROLE_ZONE, SHRED, SKIN_BASE, SKIN_CAP, SPRAY, TRAPS, TRINKETS, TRK_EVERY, TUNE, TYPES, WALL, WEAPONS, duoCast, duoStacks, duosFor, flexSubs, ghostTrinkets, hash, mastMul, mulberry32, normRpm, pct, rolePassive, simulate, statsFor, through, trkSum, trkTier };
