// Landscape without asking. iPhone browsers can't lock the screen to landscape, so when the phone reports
// portrait we draw the page turned 90 degrees: hold the phone with its top to the left (home bar on the
// right). If the phone really is in landscape, nothing changes.
// Page code keeps working in landscape terms: rects, pointer positions and elementFromPoint are translated
// here; for the page size use TURN.w / TURN.h, so no other file needs to know.
(() => {
  const html = document.documentElement;
  const mq = matchMedia('(orientation: portrait)');
  const raw = {
    w: Object.getOwnPropertyDescriptor(window, 'innerWidth') || Object.getOwnPropertyDescriptor(Window.prototype, 'innerWidth'),
    h: Object.getOwnPropertyDescriptor(window, 'innerHeight') || Object.getOwnPropertyDescriptor(Window.prototype, 'innerHeight'),
    x: Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientX'),
    y: Object.getOwnPropertyDescriptor(MouseEvent.prototype, 'clientY'),
    rect: Element.prototype.getBoundingClientRect,
    pick: Document.prototype.elementFromPoint,
  };
  const sw = () => raw.w.get.call(window), sh = () => raw.h.get.call(window); // real screen size
  let on = false;
  const H = () => sw(); // landscape height = the phone's width

  function update() {
    on = mq.matches;
    html.classList.toggle('turned', on);
    html.style.setProperty('--lw', on ? sh() + 'px' : '100vw');
    html.style.setProperty('--lh', on ? sw() + 'px' : '100dvh');
  }

  // Screen point (x', y') -> page point (x, y): x = y', y = H - x'
  Object.defineProperty(MouseEvent.prototype, 'clientX', { configurable: true, get() { return on ? raw.y.get.call(this) : raw.x.get.call(this); } });
  Object.defineProperty(MouseEvent.prototype, 'clientY', { configurable: true, get() { return on ? H() - raw.x.get.call(this) : raw.y.get.call(this); } });
  Element.prototype.getBoundingClientRect = function () {
    const r = raw.rect.call(this);
    return on ? new DOMRect(r.top, H() - r.right, r.height, r.width) : r;
  };
  Document.prototype.elementFromPoint = function (x, y) { return on ? raw.pick.call(this, H() - y, x) : raw.pick.call(this, x, y); };
  // Page size in landscape terms (use instead of innerWidth/innerHeight)
  window.TURN = { get w() { return on ? sh() : sw(); }, get h() { return on ? sw() : sh(); }, get on() { return on; } };

  const css = document.createElement('style');
  css.textContent = `
    html.turned body { position: fixed; top: 0; left: 0; width: var(--lw); height: var(--lh);
      transform-origin: 0 0; transform: rotate(90deg) translateY(-100%); }
    /* The notch side becomes the left edge, the home bar side the right */
    html.turned { --sa-top: env(safe-area-inset-right); --sa-right: env(safe-area-inset-bottom);
      --sa-bottom: env(safe-area-inset-left); --sa-left: env(safe-area-inset-top); }
    /* Full-screen overlays keep clear of the camera and home bar too */
    .drop, .result, .modes, .elsewhere {
      padding-top: max(1rem, var(--sa-top, env(safe-area-inset-top))); padding-right: max(1rem, var(--sa-right, env(safe-area-inset-right)));
      padding-bottom: max(1rem, var(--sa-bottom, env(safe-area-inset-bottom))); padding-left: max(1rem, var(--sa-left, env(safe-area-inset-left))); }`;
  document.head.appendChild(css);

  update();
  mq.addEventListener?.('change', update);
  addEventListener('resize', update);
})();
