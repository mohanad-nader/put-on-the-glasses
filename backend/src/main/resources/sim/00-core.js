(function () {
  if (window.__potg) return;
  const P = (window.__potg = { modules: {}, cfg: {}, pageUrl: window.__POTG_PAGE_URL });

  // messaging
  P.send = (type, payload) => window.parent.postMessage({ source: 'potg', type, payload }, '*');

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return; // only our Angular app may talk to us
    const m = e.data;
    if (!m || m.source !== 'potg') return;
    if (m.type === 'config') {
      P.cfg = m.payload || {};
      Object.values(P.modules).forEach((mod) => mod.apply && mod.apply(P.cfg));
    } else {
      Object.values(P.modules).forEach((mod) => mod.onMessage && mod.onMessage(m));
    }
  });

  // #fragment links: <base> points at the real site, so href="#top" would leave the proxy
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id ? document.getElementById(id) || document.getElementsByName(id)[0] : document.documentElement;
    if (el) el.scrollIntoView();
  });

  // ready
  const ready = () => P.send('ready', { url: P.pageUrl });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();