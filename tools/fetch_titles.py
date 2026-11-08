"""Fetches international R6 titles from Liquipedia (CC-BY-SA) into data/titles.json.

For each big event it reads the page's wikitext (TeamCard rosters) and the rendered prize pool
(the 1st-place team), then records the winning roster.

Liquipedia's API rules: identify yourself, 1 request per 2s, and action=parse at most 1 per 30s.
Responses are cached in .liquipedia-cache/ so re-runs don't re-fetch.

Run:  python tools/fetch_titles.py
"""
import gzip, json, os, re, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'titles.json')
CACHE = os.path.join(HERE, '.liquipedia-cache')
API = 'https://liquipedia.net/rainbowsix/api.php'
UA = 'R6-Manager-FanPrototype/0.1 (non-commercial fan project; R6 autobattler prototype)'

# page pattern -> (kind, weight)
KINDS = [
    (r'^Six_Invitational/\d{4}$', 'Six Invitational', 3),
    (r'^(Six_Major|BLAST_Major)/\d{4}(/Stage_\d)?$', 'Major', 2),
    (r'^Esports_World_Cup/\d{4}$', 'Esports World Cup', 2),
    (r'^Pro_League/(Year_2/)?Season_\d+/Finals$', 'Pro League Finals', 1.5),
    (r'^Gamers8/\d{4}$', 'Gamers8', 1.5),
    (r'^Six_World_Cup/\d{4}$', 'World Cup', 1.5),
    (r'^Reload/\d{4}$', 'RE:LOAD', 1),
]
PREFIXES = ['Six_Invitational/', 'Six_Major/', 'BLAST_Major/', 'Esports_World_Cup/', 'Pro_League/', 'Gamers8/', 'Six_World_Cup/', 'Reload/']

last = {'any': 0, 'parse': 0}


def get(params, parse=False):
    os.makedirs(CACHE, exist_ok=True)
    key = re.sub(r'[^\w.-]+', '_', urllib.parse.urlencode(sorted(params.items())))[:180]
    path = os.path.join(CACHE, key + '.json')
    if os.path.exists(path):
        return json.load(open(path, encoding='utf-8'))
    wait = max(last['any'] + 2.2, last['parse'] + 31 if parse else 0) - time.time()
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(API + '?' + urllib.parse.urlencode({**params, 'format': 'json'}),
                                 headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
    raw = urllib.request.urlopen(req, timeout=90).read()
    last['any'] = time.time()
    if parse:
        last['parse'] = time.time()
    try:
        raw = gzip.decompress(raw)
    except OSError:
        pass
    data = json.loads(raw)
    json.dump(data, open(path, 'w', encoding='utf-8'))
    return data


def discover():
    pages = set()
    for pre in PREFIXES:
        d = get({'action': 'query', 'list': 'prefixsearch', 'pssearch': pre, 'pslimit': 500, 'psnamespace': 0})
        for p in d['query']['prefixsearch']:
            t = p['title'].replace(' ', '_')
            if any(re.match(rx, t) for rx, *_ in KINDS):
                pages.add(t)
    return sorted(pages)


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def team_cards(wt):
    cards = []
    for m in re.finditer(r'\{\{TeamCard\s*\n([\s\S]*?)\n\}\}', wt):
        body = m.group(1)
        f = dict((k.strip(), v.strip()) for k, v in re.findall(r'\|\s*([\w]+)\s*=([^|\n]*)', body))
        players = [f[k] for k in sorted((k for k in f if re.fullmatch(r'p\d', k)), key=lambda k: int(k[1:])) if f[k]]
        cards.append({'team': f.get('team', ''), 'players': players})
    return cards


def html_roster(html, team):
    """Newer pages import rosters from Liquipedia's database ({{TeamParticipants}}), so read the rendered card:
    the "Main" tab (toggle area 1) holds players, tab 2 holds staff."""
    for m in re.finditer(r'team-participant-card(?:&#95;|_){2}opponent[\s\S]{0,1500}?title="([^"]+)"', html):
        if norm(m.group(1)) != norm(team):
            continue
        a = html.find('data-toggle-area-content="1"', m.end())
        b = html.find('data-toggle-area-content="2"', a)
        if a < 0:
            return []
        names = re.findall(r'<span class="name"[^>]*><a [^>]*>([^<]+)</a>', html[a:b if b > a else a + 20000])
        return [n.strip() for n in names]
    return []


def winner(html):
    i = html.find('placement-1"')
    if i < 0:
        return None
    m = re.search(r'<span class="name"[^>]*>(?:<a [^>]*>)?([^<]+)', html[i:i + 6000])
    return m.group(1).strip() if m else None


def main():
    pages = discover()
    print(len(pages), 'event pages:', ', '.join(pages))
    titles, missing, seen = [], [], set()
    for page in pages:
        kind, weight = next((k, w) for rx, k, w in KINDS if re.match(rx, page))
        q = get({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': page, 'redirects': 1})
        p = next(iter(q['query']['pages'].values()))
        real = p.get('title', page).replace(' ', '_')  # Six_Major/2023/... redirects to BLAST_Major/2023/...
        if real in seen:
            continue
        seen.add(real)
        wt = p.get('revisions', [{}])[0].get('slots', {}).get('main', {}).get('*', '')
        if not wt:
            missing.append((page, 'no page')); continue
        try:
            html = get({'action': 'parse', 'page': page, 'prop': 'text', 'disablelimitreport': 1, 'redirects': 1}, parse=True)['parse']['text']['*']
        except Exception as e:  # noqa
            missing.append((page, 'parse failed: %s' % e)); continue
        team = winner(html)
        if not team or norm(team) == 'tbd':
            missing.append((page, 'no 1st place yet')); continue
        cards = team_cards(wt)
        card = next((c for c in cards if norm(c['team']) == norm(team)), None) \
            or next((c for c in cards if norm(team) in norm(c['team']) or norm(c['team']) in norm(team)), None)
        if not card or not card['players']:
            card = {'players': html_roster(html, team)}
        if not card['players']:
            missing.append((page, 'winner %s but no roster' % team)); continue
        ed = re.search(r'\|edate=\s*(\d{4})', wt)
        year = int(ed.group(1) if ed else re.search(r'\d{4}', page).group() if re.search(r'\d{4}', page) else 0)
        titles.append({'event': page.replace('_', ' '), 'page': page, 'kind': kind, 'weight': weight, 'year': year,
                       'team': team, 'players': card['players'][:6]})
        print('  %-40s %-22s %s' % (page, team, ', '.join(card['players'][:6])), flush=True)
    json.dump({'source': 'Liquipedia (liquipedia.net/rainbowsix), CC-BY-SA 3.0', 'titles': titles, 'missing': missing},
              open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(len(titles), 'titles written ·', len(missing), 'missing:', missing)


if __name__ == '__main__':
    main()
