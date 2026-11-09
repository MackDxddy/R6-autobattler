// Shop rules shared by prep.html and the server (functions/api/_game.js): operators, lanes, the player list,
// gear and utility, player strength, AI opponents and cleaning boards from other players.
// Needs pool.js and rarity.js loaded first. In the page everything here is global; the server uses RULES.
const OPS = {
  ash:['Ash','Entry'], thermite:['Thermite','Entry'], hibana:['Hibana','Entry'], ace:['Ace','Entry'], blackbeard:['Blackbeard','Entry'],
  buck:['Buck','Flank'], dokkaebi:['Dokkaebi','Flank'], deimos:['Deimos','Flank'], nomad:['Nomad','Flank'],
  thatcher:['Thatcher','Support'], twitch:['Twitch','Support'], grim:['Grim','Support'],
  mute:['Mute','Anchor'], smoke:['Smoke','Anchor'], azami:['Azami','Anchor'], jager:['Jäger','Anchor'], warden:['Warden','Anchor'], kaid:['Kaid','Anchor'],
  goyo:['Goyo','Anchor'], vigil:['Vigil','Roam'], lesion:['Lesion','Roam'], caveira:['Caveira','Roam'], solis:['Solis','Roam'], ela:['Ela','Roam'],
};
const ZONES = [
  { id:'Entry',   info:'Pushes into their Anchor.' },
  { id:'Anchor',  info:'Holds against their Entry.' },
  { id:'Flank',   info:'Fights their Roam for picks.' },
  { id:'Roam',    info:'Hunts their Flank.' },
  { id:'Support', info:'Backs up one lane.' },
];

const MAP_MODS = { Anchor:+10, Flank:-5 };

const MASTERY = { per: .08, cap: 10 };

const ROLE_LIST = ['IGL', 'Entry', 'Anchor', 'Flank', 'Roam', 'Support', 'Flex'];
function pickRole(roles, st) {
  const role = roles.includes('IGL') ? 'IGL' : roles.find(r => ROLE_LIST.includes(r)) || 'Flex';
  const { hs, ent, srv, clutch, wr, kd, rating } = st;
  const rp = {
    IGL:     hs >= 55 ? 'aim' : ent >= 0 ? 'tempo' : 'reload',
    Roam:    srv >= 36 ? 'ghost' : kd >= 1.1 ? 'hunter' : 'lurker',
    Entry:   ent >= 15 ? 'first' : hs >= 55 ? 'flash' : 'space',
    Anchor:  srv >= 36 ? 'hold' : clutch >= 8 ? 'lastline' : 'digin',
    Support: srv >= 36 ? 'medic' : wr >= .6 ? 'quarter' : 'ammo',
    Flank:   hs >= 55 ? 'crossfire' : ent >= 0 ? 'pincer' : 'pressure',
    Flex:    rating >= 1.1 ? 'fill' : wr >= .6 ? 'glue' : 'adapt',
  }[role];
  return { role, rp };
}

const RAR = { c: 'common', r: 'rare', e: 'epic', l: 'legendary' };
// exact name first, then without trailing digits (rosters say "soulz1", stats say "soulz")
const impactOf = name => { const R = window.RARITY || {}, n = name.toLowerCase(); return R[n] || R[n.replace(/\d+$/, '')]; };
const rarityOf = (r, name, year) => { const x = impactOf(name); return x ? RAR[x[0]] : r >= 1.17 ? 'legendary' : r >= 1.10 ? 'epic' : r >= 1.02 ? 'rare' : 'common'; };
const COST = { common:2, rare:3, epic:5, legendary:7 };

function P(name, year, rating, kd, entry, srv, clutch, plants, hs, atk, def, roles, wr) {
  const passives = [];
  const ent = parseInt(entry.match(/\(([+-]\d+)\)/)[1], 10);
  if (clutch >= 10) passives.push('Clutch Gene');
  if (ent >= 20) passives.push('Opener');
  if (hs >= 58) passives.push('Headhunter');
  if (srv >= 36) passives.push('Survivor');
  if (plants >= 25) passives.push('Closer');
  if (wr >= .68) passives.push('Winner');
  const [k, d] = kd.split('-').map(Number);
  const { role, rp } = pickRole(roles, { hs, ent, srv, clutch, wr, kd: k / Math.max(1, d), rating });
  return { id: name + year, name, year, rating, kd, entry, srv, clutch, hs, mains:[atk, def], roles, wr, role, rp,
           rarity: rarityOf(rating, name, year), passives: passives.slice(0, 2), mastery: 0, op: null, zone: null, buff: null, weapon: null, att: [], gear: [] };
}

const POOL_FALLBACK = [
  P('Nina',2024,1.23,'389-263','62-36 (+26)',36,6,3,56,'dokkaebi','warden',['Entry'],.565),
  P('Levy',2025,1.01,'354-346','66-54 (+12)',29,2,3,60,'grim','warden',['Flex'],.40),
  P('Reeps96',2024,1.19,'569-423','115-81 (+34)',33,16,5,51,'buck','mute',['Flex'],.696),
  P('Gotti',2024,1.17,'153-118','22-9 (+13)',47,6,26,54,'ace','mute',['Support'],.65),
  P('Woogiman',2025,1.01,'301-290','41-47 (-6)',35,13,14,52,'blackbeard','smoke',['Flex','IGL'],.646),
  P('Jigsaw',2025,1.15,'244-200','58-23 (+35)',25,2,0,59,'nomad','azami',['Entry'],.636),
  P('Slater',2025,1.18,'160-125','22-10 (+12)',29,0,3,52,'deimos','smoke',['Flex'],.667),
  P('Mephi',2025,1.01,'398-375','49-55 (-6)',33,11,9,41,'ash','smoke',['Flex'],.543),
  P('yass',2024,1.14,'266-202','34-26 (+8)',41,5,4,57,'ash','lesion',['Flex'],.646),
];
// Shop players: every Tier 1 pro from pool.js (build_pool.py); the short list above is only a fallback
const POOL = (window.POOL_DATA || []).length ? window.POOL_DATA.map(a => P(...a)) : POOL_FALLBACK;

// Guns: every primary in R6 Manager's data [type, damage, RPM (0 = pump/bolt), magazine]. Any gun on anyone; it replaces their op's gun and is kept.
const WEAPONS = {"L85A2":["AR",47,670,31],"AR33":["AR",40,749,26],"G36C":["AR",38,780,31],"R4-C":["AR",39,860,31],"556XI":["AR",43,690,31],"F2":["AR",37,980,26],"AK-12":["AR",45,850,31],"AUG A2":["AR",38,750,31],"552 Commando":["AR",43,690,26],"416-C Carbine":["AR",38,740,26],"C8-SFW":["AR",40,837,31],"Mk17 CQB":["AR",48,585,21],"PARA-308":["AR",48,650,31],"TYPE-89":["AR",40,850,21],"C7E":["AR",46,800,31],"M762":["AR",45,730,26],"V308":["AR",44,700,51],"Spear .308":["AR",42,700,31],"M4":["AR",44,750,31],"AK-74M":["AR",44,650,31],"ARX200":["AR",47,700,21],"F90":["AR",38,780,31],"Commando 9":["AR",36,780,26],"SC3000K":["AR",45,860,26],"POF-9":["AR",35,740,51],"PCX-33":["AR",36,800,31],"FMG-9":["SMG",34,800,26],"MP5K":["SMG",30,800,21],"UMP45":["SMG",38,600,26],"MP5":["SMG",27,800,31],"P90":["SMG",22,970,51],"9x19VSN":["SMG",34,750,31],"MP7":["SMG",32,900,31],"9mm C1":["SMG",45,575,34],"MPX":["SMG",26,830,31],"M12":["SMG",36,550,31],"MP5SD":["SMG",27,800,31],"PDW9":["SMG",34,800,51],"Vector .45 ACP":["SMG",21,1200,26],"T-5 SMG":["SMG",28,900,31],"Scorpion EVO 3 A1":["SMG",23,1080,41],"K1A":["SMG",36,720,31],"Mx4 Storm":["SMG",26,950,26],"AUG A3":["SMG",33,760,31],"UZK50Gi":["SMG",44,700,21],"6P41":["LMG",46,680,101],"G8A1":["LMG",37,850,51],"M249":["LMG",48,650,61],"T-95 LSW":["LMG",43,650,81],"LMG-E":["LMG",44,730,151],"ALDA 5.56":["LMG",35,900,81],"M249 SAW":["LMG",48,650,61],"DP27":["LMG",49,550,71],"417":["DMR",69,450,21],"OTs-03":["DMR",72,200,11],"CAMRS":["DMR",69,450,21],"SR-25":["DMR",72,260,21],"Mk 14 EBR":["DMR",60,450,21],"AR-15.50":["DMR",72,450,11],"CSRX 300":["DMR",122,0,6],"PMR90A2":["DMR",47,260,11],"M590A1":["SG",48,0,7],"M1014":["SG",34,0,9],"SG-CQB":["SG",53,0,7],"SASG-12":["SG",50,180,9],"M870":["SG",60,0,8],"Super 90":["SG",35,300,9],"SPAS-12":["SG",50,0,7],"SPAS-15":["SG",30,300,7],"SuperNova":["SG",55,0,7],"ITA12L":["SG",50,0,9],"SIX12":["SG",35,200,6],"SIX12 SD":["SG",35,200,6],"FO-12":["SG",25,400,9],"BOSG.12.2":["SG",125,0,2],"ACS12":["SG",69,300,9],"TCSG12":["SG",57,0,6],"SMG-11":["MP",35,1270,17],"Bearing 9":["MP",33,1100,26],"C75 Auto":["MP",35,1000,20],"SMG-12":["MP",25,1270,34],"SPSMG9":["MP",35,1000,16],"Reaper MK2":["MP",33,900,35]};

// Attachments stay on the gun they're bought for, one of each; a new gun (or a new op's gun) comes bare.
const ATTACH = [
  { id:'ext',  name:'Extended Mag', att:true, cost:2, short:'MAG',  desc:'+50% mag size.' },
  { id:'comp', name:'Compensator',  att:true, cost:2, short:'COMP', desc:'+5% hit chance.' },
  { id:'acog', name:'ACOG',         att:true, cost:2, short:'ACOG', desc:'+6% hit at range. -4% up close.' },
  { id:'grip', name:'Angled Grip',  att:true, cost:2, short:'GRIP', desc:'First shot 80ms faster.' },
];
// Gear is permanent and stacks (buy as many as you like). Scaling gear grows after every battle.
const GEAR = [
  { id:'kevlar', r:'common',   name:'Kevlar Vest',   gear:true, cost:3, short:'VEST',   desc:'+32 HP. From the 3rd vest, also -5% RPM.' },
  { id:'plate', r:'common',    name:'Ceramic Plate', gear:true, cost:3, short:'PLATE',  desc:'+10 armor (blocks 10 damage per bullet). -15% fire damage. -2.5% RPM.' },
  { id:'hollow', r:'epic',   name:'Hollow Points', gear:true, cost:3, short:'HOLLOW', desc:'+40% damage. Armor blocks double.' },
  { id:'momentum', r:'rare', name:'Momentum',      gear:true, cost:3, short:'MOMENT', desc:'+15% damage per kill.' },
  { id:'blood', r:'legendary',    name:'Bloodthirst',   gear:true, cost:3, short:'BLOOD',  desc:'Heal 30 HP per kill.' },
  { id:'fresh', r:'common',    name:'Fresh Mag',     gear:true, cost:3, short:'FRESH',  desc:'+20% damage on the first half of each mag.' },
  { id:'wind', r:'rare',     name:'Second Wind',   gear:true, cost:3, short:'WIND',   desc:'Below 50% HP: heal 35 and +40% RPM. Once per fight.' },
  { id:'revenge', r:'common',  name:'Revenge',       gear:true, cost:3, short:'REVENGE', desc:'+35% damage for 3s when a teammate dies.' },
  { id:'spons', r:'common',    name:'Sponsorship',   gear:true, cost:3, short:'SPONSOR', scale:true, desc:'+¢1 per battle. +¢1 more every 3 battles (max ¢4).' },
  { id:'shred', r:'epic',    name:'Shred Rounds',  gear:true, cost:3, short:'SHRED',  desc:"Hits also deal 8% of the target's max HP. Halves Thick Skin. One per player." },
  { id:'thick', r:'common',    name:'Thick Skin',    gear:true, cost:3, short:'SKIN',   desc:'Takes 10% less damage, plus 4% less per hit taken (max 60%). Half as strong vs Shred.' },
  { id:'cond', r:'epic',     name:'Conditioning',  gear:true, cost:3, short:'COND',   scale:true, desc:'+12 HP. +8 more each battle.' },
  { id:'vet', r:'legendary',      name:'Veteran',       gear:true, cost:3, short:'VET',    scale:true, desc:'+2 damage. +3 more every 4 kills.' },
  { id:'iron', r:'rare',     name:'Iron Wall',     gear:true, cost:3, short:'IRON',   scale:true, desc:'+1 armor. +3 more every 4 battles survived.' },
];

// Utility is one use per battle, each with one simple effect.
const ITEMS = [
  { id:'frag', r:'common',   name:'Frag', img:'Frag_Grenade.png',          cost:2, desc:'May hit their lane player for 35. Blocked by ADS.' },
  { id:'breach', r:'rare', name:'Breach Charge', img:'R6S_Breach_charge.png', cost:2, desc:'+50% damage vs their Anchor. Blocked by Mute.' },
  { id:'stun', r:'common',   name:'Stun', img:'Stun_Grenade.png',          cost:2, desc:'Their lane player misses more for 2s. Blocked by ADS and Warden.' },
  { id:'smoke', r:'common',  name:'Smoke', img:'Smoke_Grenade.png',        cost:2, desc:'Enemies miss more into this lane for 3s. Blocked by ADS and Warden.' },
  { id:'hot', r:'rare',    name:'Hot Loads',    short:'HOT',   cost:2, desc:'+25% damage.' },
  { id:'heavy', r:'epic',  name:'Heavy Rounds', short:'HEAVY', cost:2, desc:'+75% damage, -30% RPM.' },
  { id:'hair', r:'rare',   name:'Hair Trigger', short:'HAIR',  cost:2, desc:'+45% RPM, -10% damage.' },
  { id:'mags', r:'rare',   name:'Extra Mags',   short:'MAGS',  cost:2, desc:'2x mag size, 50% faster reloads.' },
  { id:'trauma', r:'common', name:'Trauma Plate', short:'PLATE', cost:2, desc:'+7 armor.' },
  { id:'steady', r:'common', name:'Steady Aim',   short:'AIM',   cost:2, desc:'+10% hit chance.' },
  { id:'prize', r:'common',  name:'Prize Money',  short:'PRIZE', cost:2, desc:'+¢4 if they get the most kills on your team.' },
  { id:'pain', r:'rare',   name:'Painkillers',  short:'PAIN',  cost:2, desc:'-18% damage taken.' },
  { id:'stim', r:'common',   name:'Stim Pack',  short:'STIM',  cost:2, desc:'+35 HP.' },
  { id:'adren', r:'rare',  name:'Adrenaline', short:'ADREN', cost:2, desc:'+40% RPM for the first 3s.' },
  { id:'ap', r:'epic',     name:'AP Rounds',  short:'AP',    cost:2, desc:'Bullets ignore armor.' },
  { id:'fire', r:'epic',   name:'Incendiary', short:'FIRE',  cost:2, desc:'Hits burn 3% max HP per second for 2s.' },
  { id:'clay', r:'common',   name:'Claymore', img:'Claymore.png',          cost:2, desc:'May hit the first pusher for 35. Blocked by Grim.' },
];

function power(p, zone, idxInZone) {
  let v = p.rating * 100;
  if (!p.op) v *= .85;
  else {
    v *= [1, 1, 1.15, 1.35][p.lvl || 1];
    if (p.mains.includes(p.op)) v *= 1.10;
    if (OPS[p.op][1] === zone) v *= 1.10;
  }
  v *= 1 + (MAP_MODS[zone] || 0) / 100;
  if (idxInZone >= 2) v *= .85; // crowding: 3rd+ in a lane
  return Math.round(v);
}

// Price by rarity: one step per tier. Gear is permanent, utility lasts one battle so it stays cheap.
const GEAR_COST = { common: 3, rare: 4, epic: 5, legendary: 6 }, UTIL_COST = { common: 2, rare: 2, epic: 3, legendary: 3 };
GEAR.forEach(g => g.cost = GEAR_COST[g.r]); ITEMS.forEach(it => it.cost = UTIL_COST[it.r]);
// Shop rarity odds by day for players and items [common, rare, epic, legendary]: the good stuff gets easier to find later in the run
const RARITY_ODDS = day => day <= 2 ? [75, 25, 0, 0] : day <= 4 ? [55, 33, 12, 0] : day <= 6 ? [40, 35, 20, 5] : [30, 35, 25, 10];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];

// Stand-in opponent until real ghosts (other players' saved boards) exist: a team that looks like what a
// player would have on this day. Runs start with 3 free commons, so it has 3 on day 1, 4 on day 2 and 5
// from day 3. Ops come in about as fast as a player can buy them: 2 on day 1, then one more a day (all 5
// by day 4). One player is upgraded every 2 days (at that day's shop odds), about one gear piece a day;
// op levels and utility come in slowly.
let GHOST_TUNE = { upEvery: 2, gearPerDay: .8, lvl2: .03, lvl3: .01, buff: .05 }; // per day: share of op upgrades, utility chance
function ghostFor(day, exclude = []) { // exclude: names the opponent must not use (your own players)
  const T = GHOST_TUNE, pick = a => a[Math.floor(Math.random() * a.length)];
  const rare = (list, key) => { const odds = RARITY_ODDS(day); let roll = Math.random() * 100, k = 0;
    while (k < 3 && roll >= odds[k]) roll -= odds[k++];
    for (; k >= 0; k--) { const got = list.filter(x => (x[key] || 'common') === RARITIES[k]); if (got.length) return pick(got); }
    return pick(list); };
  const size = Math.min(5, 2 + day), slots = () => [...Array(size).keys()].sort(() => Math.random() - .5);
  const ups = new Set(slots().slice(0, Math.floor((day - 1) / T.upEvery))), withOp = new Set(slots().slice(0, day + 1));
  const commons = POOL.filter(p => p.rarity === 'common'), used = new Set(exclude), ops = new Set(); // never your own players
  const zones = ZONES.map(z => z.id).sort(() => Math.random() - .5).slice(0, size);
  const team = zones.map((zone, i) => {
    let p; do p = ups.has(i) ? rare(POOL, 'rarity') : pick(commons.length >= 5 ? commons : POOL); while (used.has(p.name)); used.add(p.name);
    if (!withOp.has(i)) return { ...p, zone, op: null, lvl: 1, gear: [], buff: null };
    const fits = p.mains.filter(o => OPS[o]?.[1] === zone && !ops.has(o));
    const op = fits[0] || pick(Object.keys(OPS).filter(o => OPS[o][1] === zone && !ops.has(o))); ops.add(op);
    const r = Math.random(), l3 = Math.max(0, T.lvl3 * (day - 6)), l2 = Math.min(.5, Math.max(0, T.lvl2 * (day - 2)));
    return { ...p, zone, op, lvl: r < l3 ? 3 : r < l3 + l2 ? 2 : 1, gear: [], buff: null };
  });
  for (let i = 0; i < Math.round((day - 1) * T.gearPerDay); i++) {
    const g = rare(GEAR.filter(x => x.id !== 'spons'), 'r'), p = pick(team);
    if (g.id === 'shred' && p.gear.some(x => x.id === 'shred')) continue;
    p.gear.push({ id: g.id, n: Math.floor(Math.random() * day) });
  }
  team.forEach(p => { if (Math.random() < Math.min(.4, T.buff * day)) p.buff = { name: rare(ITEMS, 'r').name }; });
  return team.map(p => ({ name: p.name, rarity: p.rarity, op: p.op, lvl: p.lvl, zone: p.zone, pow: power(p, p.zone, 0), passives: p.passives,
    role: p.role, rp: p.rp, buff: p.buff, weapon: null, att: [], gear: p.gear }));
}

// A board from another player, rebuilt from this game's own tables. Players or values the game doesn't know
// are dropped, and each player's power is worked out here instead of trusting the upload.
// opts.round: the board's round, so mastery and scaling gear can't be more than that many fights could give.
// opts.own: it's the player's own team (server side): keep each player's pid so prep can match them up.
function cleanGhost(team, opts = {}) {
  if (!Array.isArray(team)) return null;
  const fights = opts.round ? Math.max(0, (opts.round | 0) - 1) : 99;
  const maxN = Math.min(60, 5 * fights), maxMastery = Math.min(MASTERY.cap, 3 * fights);
  const zones = ZONES.map(z => z.id), gearIds = new Set(GEAR.map(g => g.id)), attIds = new Set(ATTACH.map(a => a.id));
  const items = new Set(ITEMS.map(i => i.name)), seen = new Set(), lane = {}, out = [];
  for (const g of team.slice(0, 5)) {
    const base = g && (POOL.find(p => p.id === g.pid && p.name === g.name) || POOL.find(p => p.name === g.name));
    if (!base || seen.has(base.name) || !zones.includes(g.zone)) continue;
    seen.add(base.name);
    const op = OPS[g.op] ? g.op : null, lvl = op ? Math.min(3, Math.max(1, g.lvl | 0 || 1)) : 1;
    let shred = false;
    const gear = (Array.isArray(g.gear) ? g.gear : []).filter(x => gearIds.has(x?.id) && (x.id !== 'shred' || !shred && (shred = true)))
      .slice(0, 12).map(x => ({ id: x.id, n: Math.min(maxN, Math.max(0, x.n | 0)) }));
    const idx = (lane[g.zone] = (lane[g.zone] ?? -1) + 1);
    out.push({ ...(opts.own ? { pid: base.id } : {}), name: base.name, rarity: base.rarity, role: base.role, rp: base.rp, passives: base.passives, zone: g.zone, op, lvl,
      mastery: Math.min(maxMastery, Math.max(0, g.mastery | 0)), pow: power({ ...base, op, lvl }, g.zone, idx),
      buff: items.has(g.buff?.name) ? { name: g.buff.name } : null, weapon: WEAPONS[g.weapon?.name] ? { name: g.weapon.name } : null,
      att: [...new Set((Array.isArray(g.att) ? g.att : []).filter(a => attIds.has(a)))].slice(0, 4), gear });
  }
  return out.length ? out : null;
}

globalThis.RULES = { ATTACH, COST, GEAR, GEAR_COST, GHOST_TUNE, ITEMS, MAP_MODS, MASTERY, OPS, P, POOL, POOL_FALLBACK, RAR, RARITIES, RARITY_ODDS, ROLE_LIST, WEAPONS, ZONES, cleanGhost, ghostFor, impactOf, pickRole, power, rarityOf };
