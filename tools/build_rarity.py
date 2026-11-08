"""Builds rarity.js for the battler: one rarity per player-season from their whole stat line.

How a player is scored
  1. Every stat is compared only against Tier 1 players in the same role (Entry, Flex, IGL, Support), as a z-score.
  2. Each role weights stats differently: Entry cares about opening duels, IGL and Support about KOST,
     plants and winning, Flex about rating and KOST.
  3. Small samples are pulled toward average (a 40-round season can't outrank a 400-round one).
  4. Career length adds a bonus (more seasons = more proven).
  5. Trophies add a bonus: international titles from Liquipedia (data/titles.json, made by fetch_titles.py),
     weighted by event (Six Invitational 3, Major / EWC 2, Pro League Finals / Gamers8 / World Cup 1.5, RE:LOAD 1).
     The bonus is relative: the most decorated player gets the full bonus, everyone else is scaled against them
     (square root, so one title still counts but two back-to-back SIs beat one). Capped, so titles alone can't
     carry a weak career to Legendary.
Seasons are combined into one career score per player (one rarity per player).
Rarity is a percentile cut among Tier 1 players (pros ranked against pros; others are placed on the same scale), and a player with only one season in the data can't be Legendary.

Run:  python tools/build_rarity.py
"""
import csv, json, math, os, re, statistics
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'data', 'R6_Stats_primary_roles.csv')
OUT = os.path.join(HERE, '..', 'public', 'rarity.js')
TITLES = os.path.join(HERE, '..', 'data', 'titles.json')

WEIGHTS = {  # stat -> weight, per role
    'Entry':   {'rating': .30, 'kost': .15, 'kpr': .15, 'entry': .25, 'srv': .05, 'wr': .10},
    'Flex':    {'rating': .40, 'kost': .20, 'kpr': .15, 'entry': .10, 'srv': .05, 'clutch': .05, 'wr': .05},
    'IGL':     {'rating': .20, 'kost': .25, 'srv': .10, 'plants': .10, 'clutch': .05, 'wr': .30},
    'Support': {'rating': .25, 'kost': .25, 'srv': .15, 'plants': .15, 'clutch': .05, 'wr': .15},
}
SHRINK = 120            # rounds at which a season counts half
SEASON_BONUS = .12      # per season beyond the first
SEASON_BONUS_MAX = .5
TROPHY_MAX = .6          # bonus for the most decorated player; everyone else is scaled against them
CUTS = [('legendary', .07), ('epic', .22), ('rare', .50)]  # cumulative share from the top; the rest are common


def num(x):
    try:
        return float(str(x).strip().rstrip('%'))
    except ValueError:
        return None


def diff(x):  # "62-36 (+26)" -> 26
    m = re.search(r'\(([+-]?\d+)\)', x or '')
    return int(m.group(1)) if m else 0


rows = []
with open(SRC, encoding='utf-8') as f:
    for r in csv.DictReader(f):
        kills = int((r['KD (+/-)'] or '0-0').split('-')[0] or 0)
        kpr = num(r['KPR']) or 0
        rounds = kills / kpr if kpr > 0 else 0
        if rounds <= 0:
            continue
        rows.append({
            'name': r['Player'].strip(), 'year': int(r['Year']), 'role': r['Role'].strip(), 'tier1': r['Tier 1'].strip() == 'Yes',
            'rounds': rounds, 'rating': num(r['Rating']) or 0, 'kost': num(r['KOST']) or 0, 'kpr': kpr, 'srv': num(r['SRV']) or 0,
            'entry': diff(r['Entry (+/-)']) / rounds, 'clutch': (num(r['1vX']) or 0) / rounds,
            'plants': (num(r['Plants']) or 0) / rounds, 'wr': num(r['WinRate']) if num(r['WinRate']) is not None else .5,
        })

# z-score each stat within role, against Tier 1 seasons only (pros are graded against pros; others land on the same scale)
stats = sorted({k for w in WEIGHTS.values() for k in w})
norm = {}
for role in WEIGHTS:
    rs = [r for r in rows if r['role'] == role and r['tier1']]
    for k in stats:
        vals = [r[k] for r in rs]
        norm[role, k] = (statistics.mean(vals), statistics.pstdev(vals) or 1)

seasons = defaultdict(set)
tier1 = defaultdict(bool)
for r in rows:
    seasons[r['name'].lower()].add(r['year'])
    tier1[r['name'].lower()] |= r['tier1']

for r in rows:
    w = WEIGHTS.get(r['role'], WEIGHTS['Flex'])
    nm = r['role'] if r['role'] in WEIGHTS else 'Flex'
    r['raw'] = sum(wt * (r[k] - norm[nm, k][0]) / norm[nm, k][1] for k, wt in w.items())

# trophies: player -> [(weight, short label)]
SHORT = {'Six Invitational': 'SI', 'Major': 'Major', 'Esports World Cup': 'EWC', 'Pro League Finals': 'PL Finals',
         'Gamers8': 'Gamers8', 'World Cup': 'World Cup', 'RE:LOAD': 'RE:LOAD'}
KNOWN = {r['name'].lower() for r in rows}


def match_name(n):  # Liquipedia/rosters vs stats spellings: "soulz1" -> "soulz" when only that exists
    n = n.strip().lower()
    return n if n in KNOWN or re.sub(r'\d+$', '', n) not in KNOWN else re.sub(r'\d+$', '', n)


trophies = defaultdict(list)
if os.path.exists(TITLES):
    for t in json.load(open(TITLES, encoding='utf-8'))['titles']:
        for pl in t['players']:
            trophies[match_name(pl)].append((t['weight'], "%s '%02d" % (SHORT.get(t['kind'], t['kind']), t['year'] % 100)))
TOP_POINTS = max((sum(w for w, _ in v) for k, v in trophies.items() if k in KNOWN), default=0)

# One rarity per player: combine every season into a career score.
#   career = 70% round-weighted average season + 30% best (sample-shrunk) season, shrunk by total rounds,
#   plus a bonus for each season beyond the first.
players = defaultdict(list)
for r in rows:
    players[r['name'].lower()].append(r)
career = {}
for key, rs in players.items():
    tot = sum(r['rounds'] for r in rs)
    avg = sum(r['raw'] * r['rounds'] for r in rs) / tot
    peak = max(r['raw'] * r['rounds'] / (r['rounds'] + SHRINK) for r in rs)
    n = len({r['year'] for r in rs})
    tr = sorted(trophies.get(key, []), key=lambda x: -x[0])
    # relative to the most decorated player in the data: sqrt so a first title matters, more titles keep climbing
    bonus = TROPHY_MAX * math.sqrt(sum(w for w, _ in tr) / TOP_POINTS) if TOP_POINTS else 0
    score = (.7 * avg + .3 * peak) * tot / (tot + SHRINK) + min(SEASON_BONUS_MAX, SEASON_BONUS * (n - 1)) + bonus
    career[key] = {'name': rs[0]['name'], 'score': score, 'seasons': n, 'tier1': any(r['tier1'] for r in rs),
                   'titles': [l for _, l in tr]}

ref = sorted((c['score'] for c in career.values() if c['tier1']), reverse=True)   # Tier 1 players set the scale
cuts = [(name, ref[max(0, math.ceil(share * len(ref)) - 1)]) for name, share in CUTS]
for c in career.values():
    c['rarity'] = next((name for name, floor in cuts if c['score'] >= floor), 'common')
    if c['seasons'] == 1 and c['rarity'] == 'legendary':
        c['rarity'] = 'epic'          # one season of data can't be Legendary
    better = sum(1 for x in ref if x > c['score'])
    c['pct'] = round(100 * (1 - better / len(ref)))  # 100 = best Tier 1 career

table = {k: [c['rarity'][0], round(c['score'], 2), c['pct'], c['seasons']] + ([c['titles']] if c['titles'] else []) for k, c in career.items()}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Generated by build_rarity.py from data/R6_Stats_primary_roles.csv. Do not edit by hand.\n')
    f.write('// "name": [rarity c/r/e/l, career impact score, percentile among Tier 1 players, seasons in data, (titles won)]\n')
    f.write('// Titles: data from Liquipedia (liquipedia.net/rainbowsix), CC-BY-SA 3.0.\n')
    f.write('window.RARITY = ' + json.dumps(table, separators=(',', ':')) + ';\n')

counts = defaultdict(int)
for c in career.values():
    if c['tier1']:
        counts[c['rarity']] += 1
print(sum(1 for c in career.values() if c['titles']), 'players with titles ·', len(career), 'players · Tier 1:', dict(counts), '·', os.path.getsize(OUT) // 1024, 'KB')
