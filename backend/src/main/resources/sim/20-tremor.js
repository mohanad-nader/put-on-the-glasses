// ======[ 20-tremor.js: "Hand tremor" mode ]=========
// Physiological tremor is a smooth oscillation of about 4 to 12 cycles per second, not random
// noise. We sum three sine waves (4.3, 6.7 and 9.1 Hz). The same function moves the fake cursor
// and decides where a click lands, so what the tester sees is what the click does.
(function () {
  const P = window.__potg;
  let on = false;
  let amp = 8;                 // px, set from the config (0 to 30)
  let mx = -100, my = -100;    // real mouse position
  let cursor = null, style = null, raf = 0;
  const t0 = performance.now();

  // ======[ the tremor function: smooth, range -1 to 1 ]=========
  const wave = function (t, seed) {
    return (Math.sin(2 * Math.PI * 4.3 * t + seed) +
            0.6 * Math.sin(2 * Math.PI * 6.7 * t + seed * 1.7) +
            0.4 * Math.sin(2 * Math.PI * 9.1 * t + seed * 0.6)) / 2;
  };
  const offset = function (now) {
    const t = (now - t0) / 1000;
    return { x: amp * wave(t, 0), y: amp * wave(t, 2.4) };
  };

  // ======[ the fake cursor ]=========
  function showCursor() {
    if (cursor || !document.body) return;
    style = document.createElement('style');
    style.id = 'potg-tremor-style';
    style.textContent = 'html, html * { cursor: none !important; }';
    document.head.appendChild(style);

    cursor = document.createElement('div');
    cursor.id = 'potg-cursor';
    cursor.style.cssText =
      'position:fixed;left:0;top:0;width:18px;height:18px;z-index:2147483647;pointer-events:none;' +
      'background:url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2718%27 height=%2718%27>' +
      '<path d=%27M1 1 L1 15 L5 11 L8 17 L10 16 L7 10 L12 10 Z%27 fill=%27black%27 stroke=%27white%27/></svg>") no-repeat;';
    document.body.appendChild(cursor);
    raf = requestAnimationFrame(frame);
  }
  function hideCursor() {
    cancelAnimationFrame(raf);
    if (cursor) cursor.remove();
    if (style) style.remove();
    cursor = style = null;
  }
  function frame(now) {
    if (!on || !cursor) return;
    const o = offset(now);
    cursor.style.transform = 'translate(' + (mx + o.x) + 'px,' + (my + o.y) + 'px)';
    raf = requestAnimationFrame(frame);
  }

  // ======[ clicks land where the fake cursor is ]=========
  function redirect(e) {
    if (!on || !e.isTrusted) return;     // our own synthetic click has isTrusted false, so no loop
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'click') return;      // swallow mousedown and mouseup, act once on click
    const o = offset(performance.now());
    const el = document.elementFromPoint(e.clientX + o.x, e.clientY + o.y);
    if (!el) return;
    if (el.focus) el.focus();            // inputs need focus, a bare click() would not give it
    el.click();
  }

  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, true);
  ['mousedown', 'mouseup', 'click'].forEach(function (t) { window.addEventListener(t, redirect, true); });

  P.modules.tremor = {
    apply: function (cfg) {
      const t = (cfg && cfg.tremor) || {};
      amp = Math.max(0, Math.min(30, Number(t.amp) || 0));
      if (!!t.on === on) return;
      on = !!t.on;
      if (on) showCursor(); else hideCursor();
    },
    // exposed so tests and the console can check the model
    _offset: offset,
  };
})();
