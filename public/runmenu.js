// The in-run menu (☰ in prep and in fights): RESUME, MAIN MENU, QUIT RUN (asks once, says what it costs).
// RUNMENU.open({ onOpen, onClose, beforeMenu, beforeQuit })
//   beforeMenu: save what needs saving before going to the main menu (the run continues from there)
//   beforeQuit: stop this page from saving anything more (the run is about to be deleted)
window.RUNMENU = (() => {
  let el, hooks = {}, confirming = false;
  const css = `
    .runmenu { position: fixed; inset: 0; z-index: 998; display: grid; place-items: center; background: color-mix(in srgb, var(--bg) 92%, transparent); }
    .runmenu .rm { display: grid; gap: .6rem; width: min(20rem, 90%); text-align: center; }
    .runmenu h2 { font-size: 1.2rem; letter-spacing: .25em; color: var(--accent); margin-bottom: .3rem; }
    .runmenu button { height: 2.8rem; border: 1px solid var(--border); background: var(--card, transparent); color: var(--fg); font: inherit; font-weight: 700; letter-spacing: .15em; border-radius: 2px; cursor: pointer; }
    .runmenu .go { background: var(--primary); border-color: var(--primary); color: var(--bg); }
    .runmenu .bad { border-color: var(--danger); color: var(--danger); }
    .runmenu .note { color: var(--danger); font-size: .86rem; line-height: 1.3; }
    .runmenu .two { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }`;
  function run() { try { return JSON.parse(localStorage.getItem('battler.save')); } catch { return null; } }
  function render() {
    const r = run();
    el.querySelector('.rm').innerHTML = confirming
      ? `<h2>QUIT RUN?</h2><div class="note">${r?.mode === 'ranked' ? `Counts as finished at ${r.wins} wins for RP.` : "This run ends. It can't be undone."}</div>
         <div class="two"><button data-rm="no">CANCEL</button><button class="bad" data-rm="quit">QUIT RUN</button></div>`
      : `<h2>PAUSED</h2><button class="go" data-rm="resume">RESUME</button><button data-rm="menu">MAIN MENU</button>
         <button class="bad" data-rm="ask">QUIT RUN</button>`;
  }
  function close() { el.hidden = true; confirming = false; hooks.onClose?.(); }
  function open(h = {}) {
    hooks = h; confirming = false;
    if (!el) {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      el = document.createElement('div'); el.className = 'runmenu'; el.innerHTML = '<div class="rm"></div>';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-rm]'); e.stopPropagation();
        if (!b) { if (e.target === el) close(); return; }
        const a = b.dataset.rm;
        if (a === 'resume') return close();
        if (a === 'ask') { confirming = true; return render(); }
        if (a === 'no') { confirming = false; return render(); }
        if (a === 'menu') { hooks.beforeMenu?.(); return location.replace('menu.html'); }
        if (a === 'quit') {
          hooks.beforeQuit?.();
          const over = quitRun(); // profile.js
          try { if (over) localStorage.setItem('battler.over', JSON.stringify(over)); } catch {}
          return location.replace('menu.html');
        }
      });
      document.body.appendChild(el);
    }
    render(); el.hidden = false; hooks.onOpen?.();
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden) close(); });
  return { open, close };
})();
