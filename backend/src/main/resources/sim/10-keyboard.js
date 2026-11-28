// ======[ 10-keyboard.js: "No keyboard" mode ]=========
// A person who cannot use a keyboard works with the mouse only. While the mode is on,
// every real key event inside the page is cancelled before the site can see it.
(function () {
  const P = window.__potg;
  let on = false;
  let count = 0;
  let last = 0;

  function block(e) {
    // isTrusted is true only for real keys. Synthetic events from other modes pass through.
    if (!on || !e.isTrusted) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // the page's own handlers never see the key
    if (e.type === 'keydown') {
      count++;
      const now = Date.now();
      if (now - last > 250) { // at most 4 messages per second
        last = now;
        P.send('keyboard-blocked', { count: count });
      }
    }
  }

  // Capture phase on window runs before any handler the site registered.
  ['keydown', 'keypress', 'keyup', 'beforeinput'].forEach(function (t) {
    window.addEventListener(t, block, true);
  });

  P.modules.keyboard = {
    apply: function (cfg) {
      const next = !!(cfg && cfg.noKeyboard);
      if (!next) count = 0;
      on = next;
    },
  };
})();
