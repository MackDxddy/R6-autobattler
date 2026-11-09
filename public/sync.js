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
    const res = await fetch('/api/' + path, { method, headers, body: body && JSON.stringify(body), keepalive: !!opts.keepalive });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
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

  return { register, rename, backup, board };
})();
