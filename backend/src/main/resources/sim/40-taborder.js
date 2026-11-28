// ======[ 40-taborder.js ]=========
// Tab-order overlay: numbers every keyboard stop in the order the browser would visit it,
// colours positive-tabindex stops orange, and reports { count, warnings } to Angular as 'taborder'.
(function () {
  const P = window.__potg;
  const POLL_MS = 1500;
  const MAX_WARNINGS = 100;            // the panel stays readable on huge pages, count is still the true total
  let on = false, layer = null, timer = 0, lastSig = '', lastDraw = '';
  const SEL = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
              '[tabindex], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    return el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : true;
  }

  // ======[ the browser's own order ]=========
  // tabIndex is already -1 for non-focusable, 0 for naturally focusable, n for tabindex="n".
  // One exception found in Chrome: a plain contenteditable element reports -1 although Tab does stop on it.
  function tabIndexOf(el) {
    if (!el.hasAttribute('tabindex') && el.isContentEditable) {
      return el.parentElement && el.parentElement.isContentEditable ? -1 : 0;   // only the editing host is a stop
    }
    return el.tabIndex;
  }

  function stops() {
    const all = Array.from(document.querySelectorAll(SEL))
      .filter((el) => !el.disabled && tabIndexOf(el) >= 0 && visible(el) && !el.closest('[inert]'));
    const positive = all.filter((e) => tabIndexOf(e) > 0).sort((a, b) => tabIndexOf(a) - tabIndexOf(b));  // sort is stable
    return positive.concat(all.filter((e) => tabIndexOf(e) === 0));
  }

  function labelOf(el) {
    const t = (el.getAttribute('aria-label') || el.textContent || el.value || el.id || '').replace(/\s+/g, ' ').trim();
    return el.tagName.toLowerCase() + (t ? ': ' + t.slice(0, 30) : '');
  }

  // ======[ the overlay layer ]=========
  function ensureLayer() {
    if (layer && layer.isConnected) return layer;          // a page may replace its body, then we rebuild
    layer = document.createElement('div');
    layer.id = 'potg-taborder';
    layer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(layer);
    lastDraw = '';
    return layer;
  }

  function clear() {
    if (layer) { layer.remove(); layer = null; }
    lastDraw = '';
  }

  function draw() {
    if (!on || !document.body) return;
    const list = stops();
    const host = ensureLayer();
    // badges use page coordinates, so measure where the layer's own (0,0) sits (body may be positioned or have margins)
    const o = host.getBoundingClientRect();
    const ox = o.left + window.scrollX, oy = o.top + window.scrollY;

    const warnings = [];
    const rows = [];
    let prevTop = null;

    list.forEach((el, i) => {
      const n = i + 1, r = el.getBoundingClientRect();
      const top = r.top + window.scrollY, left = r.left + window.scrollX;
      let reason = null;
      const ti = tabIndexOf(el);
      if (ti > 0) reason = 'positive tabindex (' + ti + ')';
      else if (prevTop !== null && top < prevTop - 200) reason = 'focus jumps back up the page';
      if (reason) warnings.push({ n, reason, label: labelOf(el) });
      prevTop = top;
      rows.push({ n, x: Math.round(Math.max(0, left - 8) - ox), y: Math.round(Math.max(0, top - 8) - oy), warn: !!reason });
    });

    // rebuild the badges only when something moved, so pages with their own MutationObserver are not disturbed
    const drawSig = JSON.stringify(rows);
    if (drawSig !== lastDraw) {
      lastDraw = drawSig;
      host.textContent = '';
      const frag = document.createDocumentFragment();
      rows.forEach((row) => {
        const b = document.createElement('div');
        b.textContent = String(row.n);
        b.style.cssText = 'position:absolute;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;' +
          'border-radius:10px;font:700 12px/20px system-ui,sans-serif;text-align:center;color:#fff;' +
          'box-shadow:0 0 0 2px #fff;background:' + (row.warn ? '#d84315' : '#1565c0') + ';' +
          'left:' + row.x + 'px;top:' + row.y + 'px;';
        frag.appendChild(b);
      });
      host.appendChild(frag);
    }

    const sig = JSON.stringify([list.length, warnings]);
    if (sig !== lastSig) {
      lastSig = sig;
      P.send('taborder', { count: list.length, warnings: warnings.slice(0, MAX_WARNINGS) });
    }
  }

  function start() { draw(); timer = setInterval(draw, POLL_MS); window.addEventListener('resize', draw); }
  function stop() {
    clearInterval(timer); timer = 0;
    window.removeEventListener('resize', draw);
    clear();
    lastSig = '';
    P.send('taborder', null);
  }

  // ======[ module contract (section 5.6) ]=========
  P.modules.taborder = {
    apply(cfg) {
      try {
        const want = !!(cfg && cfg.tabOrder);
        if (want === on) return;
        on = want;
        if (on) start(); else stop();
      } catch (err) { /* never break the other modules, core calls them in one loop */ }
    },
  };
})();