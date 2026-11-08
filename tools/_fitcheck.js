(async () => {
  await new Promise(r => setTimeout(r, 600));
  const check = label => {
    const bad = [];
    const boxOf = el => el.closest('.pad,.tile,.card,.bslot,.zg,.pop,.tool,.ready,.chip,.syn,.sock,.price,.pow') || el.parentElement;
    document.querySelectorAll('.nm,.zl .zn,.pad .zn,.zl .zp,.pop .h,.pop .ln,.pop .hint,.pop .btn,.tool,.ready,.chip,.syn span,.price,.pow,.lbl,.power').forEach(el => {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
      const r = document.createRange(); r.selectNodeContents(el);
      const t = r.getBoundingClientRect(), b = boxOf(el).getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (t.width && (t.right > b.right + 1 || t.left < b.left - 1 || t.bottom > b.bottom + fs * .3 || t.top < b.top - fs * .3)) bad.push(`${label}: CUT "${el.textContent.trim().slice(0, 24)}" ${Math.round(t.right - b.right)}`);
      if (fs < 11.9) bad.push(`${label}: SMALL ${fs.toFixed(1)}px "${el.textContent.trim().slice(0, 24)}"`);
    });
    // nothing may leave the viewport
    document.querySelectorAll('.app *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) bad.push(`${label}: OFFSCREEN ${el.className}`); });
    return [...new Set(bad)];
  };
  const out = [];
  out.push(...check('default'));
  document.querySelector('[data-player^="Stompn"]').click(); out.push(...check('player-pop'));
  document.querySelector('[data-buy="0"]').click(); out.push(...check('shop-pop'));
  document.querySelector('[data-lane="Roam"]').click(); out.push(...check('lane-pop'));
  document.body.click();
  const a = S.players.find(p => p.name === 'Always'); a.name = 'Benjamaster'; a.zone = 'Entry';
  S.players.find(p => p.name === 'Kyno').zone = 'bench'; S.players.find(p => p.name === 'Gaspro').zone = 'Entry';
  render(); out.push(...check('stress'));
  return { size: innerWidth + 'x' + innerHeight, scroll: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight], problems: out.slice(0, 25), n: out.length };
})()
