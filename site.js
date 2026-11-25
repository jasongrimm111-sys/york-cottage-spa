(() => {
  const h = document.querySelector('header'), b = document.querySelector('.burger');
  const onScroll = () => {
    h.classList.toggle('solid', scrollY > 60);
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
