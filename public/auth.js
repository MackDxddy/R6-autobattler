// Accounts. Stand-in until there's a backend (plan: Supabase): only guest accounts work, and they live on
// this device (localStorage battler.user). Google, Discord and email sign-in go through signIn(), which is
// the one place to wire up later; the menu already handles its errors.
window.AUTH = (() => {
  const KEY = 'battler.user';
  const NAME_RULE = /^[A-Za-z0-9_.-]{3,16}$/;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  return {
    user: read,
    // Returns an error message, or null when it worked
    checkName: name => NAME_RULE.test(name) ? null : '3 to 16 letters, numbers, _ . or -',
    guest(name) {
      const err = this.checkName(name); if (err) return err;
      const u = { id: read()?.id || 'g_' + Math.random().toString(36).slice(2, 10), name, kind: 'guest' };
      try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { return 'Could not save on this device'; }
      return null;
    },
    // provider: 'google' | 'discord' | 'email'
    async signIn(provider) { throw new Error('Accounts are not live yet. Play as guest for now.'); },
    signOut() { try { localStorage.removeItem(KEY); } catch {} },
  };
})();
