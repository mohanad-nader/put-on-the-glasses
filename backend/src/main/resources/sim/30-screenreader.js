// ======[ 30-screenreader.js ]=========
// Screen-reader view: builds the linear list "role, name, state" that a screen reader would expose,
// plus problem flags, and sends it to Angular as 'sr-items'. A simplified model, not a real screen reader.
(function () {
  const P = window.__potg;
  const MAX_ITEMS = 800;               // keep the list usable on huge pages
  const POLL_MS = 1500;
  let on = false, timer = 0, lastSig = '';
  let tagged = [];                     // elements that currently carry data-potg-id
  let flashTimer = 0, flashEl = null, flashOld = '';

  // ======[ roles ]=========
  const IMPLICIT = {
    a: 'link', button: 'button', nav: 'navigation', main: 'main', aside: 'complementary',
    form: 'form', ul: 'list', ol: 'list', li: 'listitem', table: 'table', img: 'image',
    select: 'combobox', textarea: 'textbox', summary: 'button', dialog: 'dialog',
  };

  function roleOf(el) {
    const explicit = (el.getAttribute('role') || '').trim().split(/\s+/)[0];
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
    if (tag === 'header' || tag === 'footer') {          // landmarks only at page level
      if (el.closest('article, section, main, aside, nav')) return null;
      return tag === 'header' ? 'banner' : 'contentinfo';
    }
    if (tag === 'input') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (t === 'hidden') return null;
      return {
        checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button',
        reset: 'button', image: 'button', range: 'slider', search: 'searchbox',
      }[t] || 'textbox';
    }
    if (tag === 'p') return 'text';
    return IMPLICIT[tag] || null;
  }

  // ======[ accessible name (simplified accname) ]=========
  const FROM_CONTENT = ['link', 'button', 'heading', 'text', 'tab', 'menuitem'];
  const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();

  function nameOf(el, role) {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      return squash(lb.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' '));
    }
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    if (el.labels && el.labels.length) return squash(Array.from(el.labels).map((l) => l.textContent).join(' '));
    if (el.tagName === 'IMG') return (el.getAttribute('alt') || '').trim();
    if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) return el.value || '';
    if (FROM_CONTENT.includes(role)) {
      const text = squash(el.textContent);
      if (text) return text;
      const img = el.querySelector('img[alt]');            // icon links: <a><img alt="Home"></a>
      if (img && img.alt.trim()) return img.alt.trim();
    }
    return (el.getAttribute('title') || '').trim();        // last resort, screen readers do use it
  }

  // ======[ states and flags ]=========
  function statesOf(el) {
    const s = [];
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') s.push('disabled');
    if (el.checked || el.getAttribute('aria-checked') === 'true') s.push('checked');
    if (el.required || el.getAttribute('aria-required') === 'true') s.push('required');
    const ex = el.getAttribute('aria-expanded');
    if (ex) s.push(ex === 'true' ? 'expanded' : 'collapsed');
    if (el.getAttribute('aria-current')) s.push('current');
    return s;
  }

  const NEED_NAME = ['link', 'button', 'textbox', 'searchbox', 'checkbox', 'radio', 'combobox', 'slider', 'image'];
  const GENERIC = /^(click here|here|read more|more|link|learn more)$/i;
  const FILENAME = /\.(png|jpe?g|gif|svg|webp)$|^img[_-]?\d+/i;

  function flagsOf(el, role, name) {
    const f = [];
    if (NEED_NAME.includes(role) && !name) {
      if (role === 'image') f.push('no-alt');
      else if (role === 'textbox' && el.placeholder) f.push('placeholder-only');   // the more specific flag wins
      else f.push('no-name');
    }
    if (role === 'link' && GENERIC.test(name)) f.push('generic-link');
    if (role === 'image' && name && FILENAME.test(name)) f.push('filename-alt');
    if (role === 'heading' && !name) f.push('empty-heading');
    return f;
  }

  // ======[ visibility ]=========
  function hidden(el) {
    if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return true;
    return el.checkVisibility ? !el.checkVisibility({ visibilityProperty: true }) : false;
  }

  // ======[ collect ]=========
  function collect() {
    const body = document.body;
    if (!body) return [];                                   // config can arrive before the body exists
    const items = [], seen = [];
    let id = 1, lastLevel = 0;
    for (const el of body.querySelectorAll('*')) {
      if (items.length >= MAX_ITEMS) break;
      if (el.closest('#potg-taborder, #potg-cursor')) continue;      // never list our own overlays
      const role = roleOf(el);
      if (!role || role === 'listitem' || role === 'presentation' || role === 'none') continue;
      if (hidden(el)) continue;
      if (role === 'image' && el.getAttribute('alt') === '') continue;   // alt="" means decorative, skipped on purpose

      let name = nameOf(el, role);
      if (role === 'text') { if (name.length < 2) continue; }
      name = name.slice(0, 140);

      const item = { id, role, name, states: statesOf(el), flags: flagsOf(el, role, name), tag: el.tagName.toLowerCase() };
      if (role === 'heading') {
        item.level = parseInt(el.getAttribute('aria-level') || el.tagName.slice(1), 10) || 2;
        if (lastLevel && item.level > lastLevel + 1) item.flags.push('skipped-level');
        lastLevel = item.level;
      }
      if (el.getAttribute('data-potg-id') !== String(id)) el.setAttribute('data-potg-id', id);
      seen.push(el);
      items.push(item);
      id++;
    }
    // elements that dropped out of the list must not keep a stale id, or a click could jump to the wrong one
    const keep = new Set(seen);
    tagged.forEach((e) => { if (!keep.has(e)) e.removeAttribute('data-potg-id'); });
    tagged = seen;
    return items;
  }

  // ======[ polling beats MutationObserver here: our own attributes would retrigger it ]=========
  function refresh() {
    const items = collect();
    const sig = JSON.stringify(items);
    if (sig !== lastSig) { lastSig = sig; P.send('sr-items', items); }
  }
  function start() { refresh(); timer = setInterval(refresh, POLL_MS); }
  function stop() {
    clearInterval(timer); timer = 0; lastSig = '';
    clearFlash();
    tagged.forEach((e) => e.removeAttribute('data-potg-id'));
    tagged = [];
    P.send('sr-items', []);
  }

  // ======[ click to jump ]=========
  function clearFlash() {
    clearTimeout(flashTimer);
    if (flashEl) { flashEl.style.outline = flashOld; flashEl = null; }
  }
  function highlight(id) {
    const n = Number(id);
    if (!Number.isInteger(n)) return;
    const el = document.querySelector('[data-potg-id="' + n + '"]');
    if (!el) return;
    clearFlash();
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flashEl = el;
    flashOld = el.style.outline;
    el.style.outline = '3px solid #ff9800';
    flashTimer = setTimeout(clearFlash, 2000);
  }

  // ======[ module contract (section 5.6) ]=========
  P.modules.screenreader = {
    apply(cfg) {
      try {
        const want = !!(cfg && cfg.screenReader);
        if (want === on) return;
        on = want;
        if (on) start(); else stop();
      } catch (err) { /* never break the other modules, core calls them in one loop */ }
    },
    onMessage(m) {
      try { if (m && m.type === 'sr-focus' && m.payload) highlight(m.payload.id); } catch (err) { /* ignore */ }
    },
  };
})();