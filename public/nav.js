// Back and Forward (buttons or an edge swipe) do nothing in the game.
// The page keeps an extra history step of its own. Going Back only uses that step up, and the page adds it
// again right away, so you never leave. It's added on load (fights get no taps) and once more on the first
// tap, because Chrome skips steps that weren't added after a tap.
(() => {
  const stay = () => history.pushState({ stay: 1 }, '');
  stay();
  addEventListener('pointerdown', stay, { capture: true, once: true });
  addEventListener('popstate', stay); // Back was used: put the step back

  // iPhone: the back swipe starts at the very edge of the screen, so touches that start there are ignored.
  const EDGE = 10;
  addEventListener('touchstart', e => {
    const x = e.touches[0]?.clientX; // real screen position (turn.js doesn't change touches)
    if (x != null && (x < EDGE || x > innerWidth - EDGE)) e.preventDefault();
  }, { passive: false, capture: true });
})();
