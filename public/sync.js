// Server sync (Cloudflare D1 via /api). Everything here is best effort: the game runs from this device's
// storage and never waits on the network. Offline or on a plain local server, calls just fail quietly.
//  - A guest gets a server id and a secret token the first time we're online (kept in battler.user).
//  - The run and rank are backed up after each READY and when prep opens.
//  - Each board taken into a fight is sent up; those become real opponents later.
window.SYNC = (() => {
  const KEY = 'battler.user';
  const user = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const setUser = u => { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {} };
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

  async function call(method, path, body, opts = {}) {
    const u = user(), headers = { 'content-type': 'application/json' };
    if (u?.token) headers.authorization = `Bearer ${u.id}.${u.token}`;
    const res = await fetch('/api/' + path, { method, headers, body: body && JSON.stringify(body), keepalive: !!opts.keepalive, signal: opts.signal });
    if (!res.ok) { const e = new Error((await res.json().catch(() => ({}))).error || res.status); e.status = res.status; throw e; }
    return res.json();
  }

  // Make sure this guest exists on the server (and has its current name there)
  let registering = null;
  function register() {
    const u = user(); if (!u) return Promise.resolve(null);
    if (u.token) return Promise.resolve(u);
    return registering ||= call('POST', 'guest', { name: u.name })
      .then(r => { const now = user(); if (now) { setUser({ ...now, id: r.id, token: r.token }); } return user(); })
      .catch(() => null).finally(() => { registering = null; });
  }
  async function rename(name) {
    const u = await register();
    if (u?.token) call('PATCH', 'me', { name }).catch(() => {});
  }

  async function backup() {
    const u = await register(); if (!u?.token) return;
    call('PUT', 'save', { data: { save: get('battler.save'), profile: get('battler.profile') } }).catch(() => {});
  }
  // board: { mode, round, wins, losses, team }. Sent with keepalive, since the page moves to the fight right after.
  function board(b) {
    const u = user(); if (!u?.token) { register(); return; }
    call('POST', 'board', b, { keepalive: true }).catch(() => {});
    call('PUT', 'save', { data: { save: get('battler.save'), profile: get('battler.profile') } }, { keepalive: true }).catch(() => {});
  }

  // A real opponent for this round: { name, wins, losses, team } or null (none yet, offline, or too slow).
  async function opponent(round, wins, ms = 2500) {
    const u = await Promise.race([register(), new Promise(r => setTimeout(() => r(null), ms))]);
    if (!u?.token) return null;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(`/api/opponent?round=${round}&wins=${wins}`, { headers: { authorization: `Bearer ${u.id}.${u.token}` }, signal: ctl.signal });
      return res.ok ? (await res.json()).board : null;
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // Ranked runs live on the server: ranked('start'), ranked('fight', {...}), ranked('quit', { run }).
  // Throws when offline or refused (error.status: 400 bad team, 409 run out of step); nothing is faked offline.
  async function ranked(what, body = {}, opts = {}) {
    const u = await register(); if (!u?.token) throw new Error('offline');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opts.ms || 8000);
    try { return await call('POST', 'ranked/' + what, body, { ...opts, signal: ctl.signal }); } finally { clearTimeout(timer); }
  }
  // Quit a ranked run on the server. The page is usually leaving, so it's also noted in battler.quit and
  // profile() makes sure it went through before reading the rank.
  function quitRanked(run) {
    try { localStorage.setItem('battler.quit', JSON.stringify(run)); } catch {}
    ranked('quit', { run }, { keepalive: true }).catch(() => {});
  }
  // Rank from the server (it scores ranked runs), copied into this device's profile. Returns it, or null offline.
  async function profile() {
    const u = await register(); if (!u?.token) return null;
    try {
      const pending = get('battler.quit');
      if (pending) {
        try { await ranked('quit', { run: pending }); } catch (e) { if (e.status !== 404) return null; } // quitting twice is fine
        localStorage.removeItem('battler.quit');
      }
      const me = await call('GET', 'me');
      if (me.profile) localStorage.setItem('battler.profile', JSON.stringify({ ...get('battler.profile'), ...me.profile }));
      return me.profile;
    } catch { return null; }
  }
  const leaderboard = () => call('GET', 'leaderboard');

  return { register, rename, backup, board, opponent, ranked, quitRanked, profile, leaderboard };
})();
