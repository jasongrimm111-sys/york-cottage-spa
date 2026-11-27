/* email addresses are checked the same way everywhere (user 2026-11-27) */
window.YCValidEmail = (v => { v = String(v || '').trim(); if (!v || v.length > 254) return false; const m = /^([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+)@((?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,})$/.exec(v); return !!m && m[1].length <= 64 && m[1][0] !== '.' && m[1].slice(-1) !== '.' && !m[1].includes('..'); });
document.addEventListener('focusout', e => { const i = e.target; if (!i.matches || !i.matches('input[type=email]') || i.closest('.cform-q')) return;
  const bad = i.value.trim() && !window.YCValidEmail(i.value); i.classList.toggle('em-bad', !!bad); i.setAttribute('aria-invalid', bad ? 'true' : 'false');
  let m = i.parentElement.querySelector(':scope > .em-err'); if (bad && !m) { m = document.createElement('small'); m.className = 'em-err'; m.setAttribute('role', 'alert'); i.after(m); }
  if (m) { if (bad) m.textContent = 'That doesn’t look like an email address, e.g. name@example.com'; else m.remove(); } });
document.addEventListener('input', e => { const i = e.target; if (i.matches && i.matches('input[type=email].em-bad') && window.YCValidEmail(i.value)) { i.classList.remove('em-bad'); const m = i.parentElement.querySelector(':scope > .em-err'); if (m) m.remove(); } });
(() => {
  const h = document.querySelector('header'), b = document.querySelector('.burger');
  const onScroll = () => {
    h.classList.add('solid'); // always the solid look (user preference)
    const p = document.getElementById('parallax');
    if (p){ const r = p.parentElement.getBoundingClientRect(); p.style.transform = `translateY(${(r.top + r.height/2 - innerHeight/2) * -0.08}px)`; }
  };
  addEventListener('scroll', onScroll, { passive:true }); onScroll();
  b.addEventListener('click', () => { const o = document.body.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
  document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('open')));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold:.12, rootMargin:'0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
})();
/* highlight the menu item for this page, or for the section in view on the home page */
(() => {
  const links = [...document.querySelectorAll('.menu a[data-nav]')];
  const set = id => links.forEach(a => a.classList.toggle('active', a.dataset.nav === id));
  const pageId = document.body.dataset.page;
  if (pageId){ set(pageId); return; }
  const secs = links.map(a => document.getElementById(a.dataset.nav)).filter(Boolean);
  const spy = () => {
    const y = innerHeight * 0.35; let cur = null;
    secs.forEach(sec => { const r = sec.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = sec.id; });
    set(cur);
  };
  addEventListener('scroll', spy, { passive:true }); addEventListener('resize', spy); spy();
})();


/* Book now: pulse when the header turns solid; mobile booking bar after the opening section */
(() => {
  const h = document.querySelector('header'), btn = document.querySelector('.menu .btn'), bar = document.querySelector('.mbar');
  let was = false;
  const tick = () => {
    const solid = h.classList.contains('solid');
    if (solid && !was && btn){ btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse'); }
    was = solid;
    if (bar){
      const hero = document.querySelector('.hero, .page-hero'), past = hero ? hero.getBoundingClientRect().bottom < 80 : scrollY > 400;
      const foot = document.querySelector('footer').getBoundingClientRect().top < innerHeight - 40;
      bar.classList.toggle('show', past && !foot);
    }
  };
  addEventListener('scroll', tick, { passive:true }); tick();
})();

/* treatment page: highlight the treatment tab for the section in view */
(() => {
  const tabs = [...document.querySelectorAll('.tm-nav a[href^="#"]')]; if (!tabs.length) return;
  const spy = () => { const y = innerHeight * 0.35; let cur = null;
    tabs.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s){ const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = a; } });
    tabs.forEach(a => a.classList.toggle('active', a === cur)); };
  addEventListener('scroll', spy, { passive:true }); spy();
})();

/* hero quick booking: the button opens the checkout for the chosen type */
(() => { const sel = document.getElementById('qbType'), go = document.getElementById('qbGo'); if (!sel || !go) return;
  sel.addEventListener('change', () => { go.dataset.book = sel.value; }); })();

/* gallery lightbox and contact form */
(() => {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-lb]'); if (!a) return;
    e.preventDefault();
    const lb = document.createElement('div'); lb.className = 'lb';
    const im = document.createElement('img'); im.src = a.href; im.alt = ''; lb.appendChild(im);
    lb.onclick = () => lb.remove(); document.body.appendChild(lb);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.lb').forEach(x => x.remove()); });
  // the contact form is handled by support.js (it opens a support ticket)
})();

/* website text edited in the admin (Set-up → Website text) (user 2026-11-27).
   Every fixed piece of text (headings, paragraphs, list items, buttons) gets a key from its page and its original wording;
   the admin saves replacements in config.siteText, keyed the same way. Header and footer text is shared by all pages.
   Text that the booking system fills in itself is never touched: a replacement only applies while the original is showing. */
(() => {
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const OK_INLINE = /^(EM|I|STRONG|B|BR)$/;
  const kindOf = el => /^H1$/.test(el.tagName) ? 'Main heading' : /^H[2-4]$/.test(el.tagName) ? 'Heading' : el.tagName === 'LI' ? 'List item' : el.tagName === 'SUMMARY' ? 'Question' : el.matches('.btn,button') ? 'Button' : el.matches('[class*=eyebrow],[class*=kicker],small') ? 'Small heading' : 'Text';
  const items = [];
  const SEL = 'h1,h2,h3,h4,p,li,summary,a.btn,blockquote,figcaption,dd,dt,[class*=eyebrow],[class*=kicker]';
  document.querySelectorAll(SEL).forEach(el => {
    if (el.closest('script,template,noscript,.lb,[data-chat-panel],.chat,[hidden]')) return;
    if ([...el.attributes].some(a => /^data-(?!nav$|lb$)/.test(a.name)) || el.closest('[data-book-root],[data-vouchers],[data-reviews],[data-treatments],[data-offers],[data-prices],[data-gallery]')) return;
    if ([...el.querySelectorAll('*')].some(c => !OK_INLINE.test(c.tagName) || [...c.attributes].some(a => /^data-/.test(a.name)))) return;
    if (el.parentElement && el.parentElement.closest(SEL) && items.some(x => x.el === el.parentElement.closest(SEL))) return;
    const text = norm(el.textContent); if (text.length < 2 || /^[\d£$.,:%\-–\s]+$/.test(text)) return;
    const shared = !!el.closest('header,footer,.foot,.site-foot'), k = (shared ? 'all' : page) + ':' + hash(text);
    if (items.some(x => x.k === k)) { items.find(x => x.k === k).els.push(el); return; }
    items.push({ k, el, els: [el], page: shared ? 'all' : page, kind: kindOf(el), text, html: el.innerHTML.trim() });
  });
  const meta = document.querySelector('meta[name=description]');
  items.push({ k: page + ':title', page, kind: 'Google title', text: document.title, meta: 'title' });
  if (meta) items.push({ k: page + ':desc', page, kind: 'Google description', text: meta.content, meta: 'desc' });
  window.__ycText = items.map(({ k, page, kind, text }) => ({ k, page, kind, text }));   // read by the admin's text list builder
  const toHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  const apply = map => { if (!map) return;
    for (const it of items) { const v = map[it.k]; if (v == null || v === '') continue;
      if (it.meta === 'title') { document.title = v; const o = document.querySelector('meta[property="og:title"]'); if (o) o.content = v; continue; }
      if (it.meta === 'desc') { meta.content = v; const o = document.querySelector('meta[property="og:description"]'); if (o) o.content = v; continue; }
      it.els.forEach(el => { if (norm(el.textContent) === it.text || el.dataset.ycEdited) { el.innerHTML = toHtml(v); el.dataset.ycEdited = '1'; } }); } };
  // live preview inside the admin's Website text editor: the admin page loads this page in a frame with ?yc-preview,
  // and sends the text being typed; only the York Cottage admin may do this, and nothing is saved here
  if (/[?&]yc-preview\b/.test(location.search) && parent !== window) {
    document.documentElement.classList.add('yc-preview');
    addEventListener('message', e => {
      if (!/^https:\/\/admin\.yorkcottages\.grimmittgames\.com$|^http:\/\/localhost(:\d+)?$/.test(e.origin)) return;
      const d = e.data; if (!d || d.yc !== 'preview') return;
      const it = items.find(x => x.k === d.k); if (!it || it.meta) return;
      document.querySelectorAll('.yc-hl').forEach(x => x.classList.remove('yc-hl'));
      it.els.forEach(el => { el.innerHTML = d.v ? toHtml(d.v) : it.html; el.classList.add('yc-hl'); });
      if (d.scroll) { const el = it.els[0]; let h = el.closest('details'); if (h) h.open = true; el.scrollIntoView({ block: 'center' }); }
    });
    parent.postMessage({ yc: 'ready', page }, '*');
  }
  let cached = null; try { cached = JSON.parse(localStorage.getItem('yc-site-text') || 'null'); } catch (e) {}
  apply(cached);
  fetch('https://raw.githubusercontent.com/jasongrimm111-sys/york-cottage-spa-live/main/config.json?v=' + Math.floor(Date.now() / 60000), { cache: 'no-store' }).then(r => r.json()).then(c => {
    const m = c.siteText || {}; try { localStorage.setItem('yc-site-text', JSON.stringify(m)); } catch (e) {}
    // a replacement that has been removed (back to default) puts the original back
    items.forEach(it => { if (!it.meta && cached && cached[it.k] && !m[it.k]) it.els.forEach(el => { if (el.dataset.ycEdited) { el.innerHTML = it.html; delete el.dataset.ycEdited; } }); });
    apply(m);
  }).catch(() => {});
})();
