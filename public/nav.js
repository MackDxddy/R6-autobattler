// Back and Forward (buttons or an edge swipe) do nothing in the game.
// The page keeps one extra history step of its own. Going Back only uses that step up, and the page adds it
// again right away, so you never leave. Browsers ignore steps added without a tap, so it's (re)armed on taps.
// The installed app (Add to Home Screen) has no Back at all; this covers playing in the browser.
(() => {
  let armed = false;
  const arm = () => { if (armed) return; armed = true; history.pushState({ stay: 1 }, ''); };
  addEventListener('pointerdown', arm, true);
  addEventListener('keydown', arm, true);
  // Back was used: put the step back now, and again on the next tap (one added without a tap may be skipped)
  addEventListener('popstate', () => { history.pushState({ stay: 1 }, ''); armed = false; });
})();
