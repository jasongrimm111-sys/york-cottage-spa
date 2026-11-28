/* ===== York Cottage checkout =====
   Prices, days and policies follow the current yorkcottagespa.com pages and terms.
   DEMO: there is no live availability or payment yet. Connect a booking system / Stripe at the
   two places marked CONNECT below. */
(() => {
  const P = {
    access: { name:'Spa Access Only', group:'Spa', kind:'pay', price:50, per:'per person', from:'from £50 per person', min:1, max:6, exOpt:true, exFrom:6, exCharge:6,
              sessions:[['Morning','09:30 – 13:30',null,'half',50],['Afternoon','13:00 – 17:00',null,'half',50],['Full day','09:30 – 17:00',null,'full',75]],
              blurb:'Just the spa: pool, sauna and relaxation lounge, with hot & cold drinks, towel and robe. No food or treatment. Half day (4 hours) or full day (7½ hours).' },
    day:    { name:'Spa, Lunch & Treatment', group:'Spa', kind:'pay', price:100, per:'per person', from:'from £100 per person', min:1, max:6, treat:true, food:true, exOpt:true, exFrom:6, exCharge:6,
              sessions:[['Morning','09:30 – 13:30',null,'half',100],['Afternoon','13:00 – 17:00',null,'half',100],['Full day','09:30 – 17:00',null,'full',135]],
              blurb:'Everything in Spa Access Only, plus lunch (afternoon tea or a grazing board) and a 20-minute massage or facial each. Half day (4 hours) or full day (7½ hours).' },
    private:{ off:true, name:'Private Spa', group:'Spa', kind:'pay', price:100, per:'per person', from:'from £100 per person', min:4, max:16, treat:true, food:true, facial:'Luxury facial',
              sessions:[['Morning','time confirmed by email'],['Afternoon','time confirmed by email']],
              blurb:'The spa just for your group, with food, drinks and a 20-minute massage or luxury facial each. Minimum 4 guests (6 on Sundays, from 11:30).' },
    break:  { name:'Spa Break', group:'Stay', kind:'pay', priceN:{1:150,2:250,3:350,4:450,5:550}, per:'per person', from:'from £150 per person', min:1, max:16, rule:'mid', nights:[1,2,3,4,5], bfast:true, exOpt:true, exFrom:6, exCharge:6, single:50,
              blurb:'Sunday to Thursday nights, 1 to 5 nights, 1 to 16 guests. The spa from 2pm on the day you arrive until 6pm on your last evening, lunch every day, the kitchen for your dinner and a 20-minute massage or facial each.' },
    break2: { off:true, name:'2-Night Spa Break', group:'Stay', kind:'pay', priceN:{2:220}, per:'per person', from:'£220 per person', min:2, max:6, rule:'mid', nights:[2], bfast:true,
              blurb:'Two nights, from £220 per person based on 2 sharing. King ensuite room, grazing board, a 20-minute aromatherapy massage or facial each and spa access. Arrive Sunday to Wednesday.' },
    group:  { off:true, name:'Group Spa Break', group:'Stay', kind:'pay', priceN:{1:145}, per:'per person', from:'from £145 per person', min:7, max:16, rule:'mid', nights:[1], food:true, foods:['Grazing board','Afternoon tea'], bfast:true,
              blurb:'7+ guests, Sunday to Thursday. Up to 8 rooms, the spa just for your group, a grazing board or afternoon tea and a 20-minute aromatherapy massage or facial each.' },
    house:  { name:'Whole House & Spa', group:'House', kind:'pay', night:1840, per:'per night', from:'from £1,840 per night', min:1, max:16, rule:'range', minN:2, maxN:30,
              blurb:'The whole house and spa just for your group, up to 16 guests: 8 bedrooms, kitchen, 2 living rooms, hot tub and sauna. Friday and Saturday nights, and you can add nights either side.' },
    treat:  { name:'Treatments only', group:'Treat', kind:'pay', price:0, per:'', from:'from £50', min:1, max:6, only:true,
              sessions:[['Morning','time confirmed when you book'],['Afternoon','time confirmed when you book']],
              blurb:'Just here for a massage, facial or head spa? Choose your treatments with no spa session.' }
  };
  let BFAST = 10; // optional continental breakfast, per person per morning
  /* ---- Live rules from the admin portal (york-cottage-spa-live): opening, sessions, prices, therapists and what's taken.
     The same booking engine as the admin decides availability and sets treatment times. ---- */
  const YE = window.YCEngine;
  const LIVE_URL = 'https://raw.githubusercontent.com/jasongrimm111-sys/york-cottage-spa-live/main/';
  const L = { cfg: window.YC_DEFAULTS ? JSON.parse(JSON.stringify(window.YC_DEFAULTS)) : null, ix: null, ok: false };
  L.ix = YE ? YE.fromBusy({}) : null;
  const fill = (o, d) => { if (o == null) return d; if (typeof d !== 'object' || Array.isArray(d) || !d) return o; for (const k in d) o[k] = k in o ? fill(o[k], d[k]) : d[k]; return o; };
  async function loadLive() {
    if (!YE || !L.cfg) return;
    try {
      const v = Math.floor(Date.now() / 60000);
      const [c, b] = await Promise.all(['config.json', 'busy.json'].map(f => fetch(LIVE_URL + f + '?v=' + v, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)));
      if (c) L.cfg = fill(c, JSON.parse(JSON.stringify(window.YC_DEFAULTS)));
      if (b) L.ix = YE.fromBusy(b);
      const ep = c && (c.consult || {}).endpoint;
      if (ep && L.ix) { try { const h = await (await fetch(ep.replace(/\/$/, '') + '/holds', { cache: 'no-store' })).json(); for (const x of (h.holds || [])) if (x.id !== S.hold) YE.addToIndex(L.cfg, L.ix, x); } catch (e) {} }
      L.ok = !!c; applyLive();
      if (box.classList.contains('on')) draw();
    } catch (e) { /* keep the built-in rules */ }
  }
  // Arrival, spa and food times from the stay pages
  function stayTimes(k, d, nights){
    if (YE && L.cfg && L.cfg.products[k] && L.cfg.products[k].times) {
      const t = YE.stayTimes(L.cfg, k, iso(d), nights), p = L.cfg.products[k];
      if (p.lunchDaily) { const sun = d.getDay() === 0, mid = (p.times.default || {}).spaMid;
        return [['Check-in', 'from ' + t.checkIn], ['Spa on arrival', `${t.spa[0]} – ${t.spa[1]}`], nights > 1 && mid && ['Spa on other days', `${mid[0]} – ${mid[1]}`],
          sun && nights === 1 ? ['Grazing board', 'from ' + t.food] : ['Lunch', sun ? 'each day from Monday, 13:00' : 'each day, 13:00'], ['Dinner', 'use of the kitchen'], ['Check-out', t.checkOut]].filter(Boolean); }
      return [['Check-in', 'from ' + t.checkIn], t.food && [p.kind === 'house' ? 'Food' : 'Food', 'from ' + t.food], t.spa && [p.kind === 'house' ? 'Spa pool & hot tub' : 'Spa & treatments', `${t.spa[0]} – ${t.spa[1]}`], ['Check-out', t.checkOut]].filter(Boolean);
    }
    const sun = d.getDay() === 0;
    if (k === 'break' || k === 'break2') return sun
      ? [['Check-in', 'from 14:00'], ['Grazing board', 'from 16:30'], ['Spa & treatments', nights > 1 ? '17:30 – 22:00' : '18:00 – 22:30'], ['Check-out', '11:00']]
      : [['Check-in', 'from 13:30'], ['Spa & treatments', '14:00 – 18:00'], ['Grazing board', 'from 18:00'], ['Check-out', '11:00']];
    if (k === 'group') return sun
      ? [['Check-in', 'from 15:30'], ['Grazing board or afternoon tea', 'from 16:30'], ['Spa & treatments', '17:30 – 22:00'], ['Check-out', '11:00']]
      : [['Check-in', 'from 13:30'], ['Spa & treatments', '14:00 – 22:00'], ['Check-out', '11:00']];
    if (k === 'house') return [['Check-in', 'from 16:00'], ['Spa pool & hot tub', '08:00 – 22:00 daily'], ['Check-out', '11:00']];
    return [];
  }
  const sesTime = (p, name) => { const x = (p.sessions || []).find(z => z[0] === name); return x ? x[1] : ''; };
  const sesLabel = () => { const p = P[S.p]; if (p.only) { const ts = Object.values(S.times || {}).map(x => x.start).sort(); return ts.length ? 'from ' + ts[0] : 'times to choose'; } const t = sesTime(p, S.session); return S.session + (t && /\d/.test(t) ? ' · ' + t : ''); };
  const endDate = () => S.p === 'house' ? S.end : (S.date && P[S.p] && P[S.p].rule ? add(S.date, S.nights) : null);  // one-day visits have no end day

  // Treatment menu (from the York Cottage treatment menu)
  const TR = window.YC_TREATMENTS = [
    { id:'basics',   cat:'Facials',   name:'Back to Basics Facial', min:30, price:50, desc:'Aromatherapy facial with double cleanse, exfoliation, shoulder massage, serum and moisturiser.' },
    { id:'radiance', cat:'Facials',   name:'Recipe for Radiance Relaxation Facial', min:45, price:70, desc:'Aromatherapy facial with double cleanse, tone, exfoliation and mask, a chest, neck, shoulder and scalp massage, serum and moisturiser.' },
    { id:'tension',  cat:'Massage',   name:'Tension Melt Back, Neck & Shoulder Massage', min:30, price:50, desc:'Focused massage to ease tight backs, necks and shoulders.' },
    { id:'scalp',    cat:'Massage',   name:'Ultimate Relaxation Scalp, Neck & Shoulder Massage', min:30, price:50, desc:'Slow, soothing massage for the scalp, neck and shoulders.' },
    { id:'recipe',   cat:'Massage',   name:'Recipe for Relaxation Massage', min:45, price:70, desc:'Back, neck, shoulder and scalp massage.' },
    { id:'full',     cat:'Massage',   name:'Relax & Unwind Full Body Massage', min:60, price:80, desc:'A full body massage from head to toe.' },
    { id:'classic',  cat:'Japanese Head Spa', name:'The Classic Renewal', min:60, price:90, head:true, desc:'Traditional Japanese scalp massage with deep cleansing and nourishing scalp care. Eases tension and leaves hair healthy and shiny.' },
    { id:'ritual',   cat:'Japanese Head Spa', name:'The Radiance Ritual', min:70, price:115, head:true, desc:'An extended head spa with a mini facial: scalp therapy and skin nourishment to release tension and brighten your complexion.' },
    { id:'zen',      cat:'Japanese Head Spa', name:'The Ultimate Zen Experience', min:80, price:145, head:true, desc:'Deep scalp renewal with a bespoke facial, extended massage and premium botanical serums.' }
  ];
  let TRi = Object.fromEntries(TR.map(t => [t.id, t]));
  let HEAD_OFF = 0.10; // 10% off head spa when booked with a spa session
  // copy the admin's prices, guest numbers, sessions and treatment menu into the checkout
  function applyLive() {
    const c = L.cfg; if (!c) return;
    // booking types added in the admin
    const GROUP = { session: 'Spa', private: 'Spa', stay: 'Stay', house: 'House', treat: 'Treat' };
    for (const [k, q] of Object.entries(c.products)) if (!P[k]) P[k] = { name: q.name, group: GROUP[q.kind] || 'Spa', kind: 'pay', price: q.price || 0, priceN: q.priceN, night: q.night, per: q.kind === 'house' ? 'per night' : 'per person', from: '', min: q.min || 1, max: q.max || 8,
      treat: YE.includedFor(c, k).length > 0, food: !!q.food, rule: q.kind === 'stay' ? 'stay' : q.kind === 'house' ? 'range' : undefined, nights: q.nights, bfast: !!q.breakfast, only: q.kind === 'treat', minN: q.minN, maxN: q.maxN, blurb: q.blurb || '', custom: true };
    for (const [k, p] of Object.entries(P)) {
      const q = c.products[k]; if (!q) { p.off = true; continue; }
      if (q.price != null) p.price = q.price; if (q.priceN) p.priceN = { ...p.priceN, ...q.priceN }; if (q.night != null) p.night = q.night;
      if (q.min) p.min = q.min; if (q.max) p.max = q.max; if (q.blurb) p.blurb = q.blurb; if (q.minN) p.minN = q.minN; if (q.maxN) p.maxN = q.maxN;
      if (q.nights) p.nights = q.nights;
      p.from = q.kind === 'house' ? `from £${q.night.toLocaleString('en-GB')} per night` : q.priceN ? `from £${q.priceN[1] ?? Object.values(q.priceN)[0]} per person` : q.kind === 'treat' ? p.from : `${q.kind === 'private' ? 'from ' : ''}£${q.price} per person`;
      if (q.kind === 'session' || q.kind === 'private') p.sessions = c.sessions.filter(x => x.product === k && x.active !== false).map(x => [x.name, `${x.start} – ${x.end}`, x.id, x.length || 'half', x.price != null ? x.price : q.price]);
      p.exOpt = !!q.exclusiveOption; p.exFrom = q.exclusiveFrom || 0; p.exCharge = q.exclusiveCharge || 0; p.single = q.singleSupp || 0;
      if (q.kind === 'session' && p.sessions.some(x => x[3] === 'full')) p.from = `from £${Math.min(...p.sessions.map(x => x[4]))} per person`;
      p.off = q.active === false || q.online === false;
    }
    const menu = c.treatments.filter(t => YE.sellable(t) && t.online !== false).map(t => ({ id: t.id, cat: t.cat, name: t.name, min: t.min, price: t.price, head: !!t.head, desc: t.desc || '' }));
    if (menu.length) { TR.length = 0; TR.push(...menu); TRi = Object.fromEntries(TR.map(t => [t.id, t])); }
    HEAD_OFF = (c.rules.headSpaOff || 10) / 100; BFAST = c.breakfastPrice || BFAST;
    banner(); stats();
  }
  // visitor stats (user 2026-11-27): GoatCounter, no cookies or personal data, only when a code is set in the admin; never on private pages
  function stats() {
    const code = String(((L.cfg || {}).business || {}).goatcounter || '').trim().replace(/[^a-z0-9-]/gi, '');
    if (!code || window.__ycStats || /^(localhost|127\.)/.test(location.hostname) || /(manage|consult|ticket|pay)\.html$/.test(location.pathname)) return;
    window.__ycStats = 1; const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = `https://${code}.goatcounter.com/count`; document.head.appendChild(s);
  }
  // which session id a session name is (on the chosen day)
  const sesId = (k, name, d) => { const c = L.cfg; if (!c || !d) return null; const x = c.sessions.find(s => s.product === k && s.name === name && s.active !== false && (!s.days || s.days.includes(d.getDay()))); return x ? x.id : null; };
  // the booking as the engine sees it
  function engineBooking() {
    const c = L.cfg, p = c.products[S.p], d = S.date ? iso(S.date) : null;
    const inc = v => { const ids = YE.includedFor(c, S.p).map(t => t.id); if (!ids.length) return null; if (ids.includes(v)) return v; const byName = YE.includedFor(c, S.p).find(t => t.name === v); if (byName) return byName.id; const want = /facial/i.test(v || '') ? 'facial' : 'massage'; return ids.find(id => id.includes(want)) || ids[0]; };
    const food = v => { if (!v) return null; const f = c.foods.find(x => x.name === v) || c.foods.find(x => (/tea/i.test(v) && x.id === 'tea') || (/grazing/i.test(v) && x.id === 'grazing')); return f ? f.id : null; };
    return { id: 'web', product: S.p, date: d, nights: P[S.p].rule ? S.nights : 0, sessionId: sesId(S.p, S.session, S.date), guests: S.guests, exclusive: exclOn(), blueLight: !!S.blue, treatStart: null, times: S.times || {}, pairs: S.pairs || {},
      guestList: Array.from({ length: S.guests }, (_, i) => ({ name: ((S.names || [])[i] || '').trim(), room: (S.roomOf || [])[i] || null, included: incMode(S.p) === 'treat' ? inc((S.picks[i] || {}).treat) : null, food: P[S.p].food ? food((S.picks[i] || {}).food) : null, extras: (S.adds[i] || []).slice() })) };
  }
  // exclusive use (user 2026-11-28): ticked for 5 or fewer, automatic from 6 guests
  const exclOn = () => !!(S.p && P[S.p] && P[S.p].exOpt && S.excl && S.guests < (P[S.p].exFrom || 99));
  // can the spa be theirs alone on this day (any session, or the whole stay)?
  const exOK = d => { if (!exclOn() || !YE || !L.cfg || !d) return true; const k = S.p, P0 = P[k];
    if (P0.sessions && !P0.only) return YE.sessions(L.cfg, L.ix, k, iso(d), S.guests, { exclusive: true }).some(x => x.ok);
    return YE.dateCheck(L.cfg, L.ix, { product: k, date: iso(d), nights: S.nights, guests: S.guests, exclusive: true }).ok; };
  // what "just for us" adds for a half or full day on the chosen date (last-minute discount included)
  const exAdd = len => { if (!exclOn() || !YE || !L.cfg || !YE.exclusiveExtra) return 0; const x = (P[S.p].sessions || []).find(z => (z[3] || 'half') === len);
    const r = YE.exclusiveExtra(L.cfg, { ...engineBooking(), sessionId: x ? x[2] || sesId(S.p, x[0], S.date) : null }); return r ? r.amount : 0; };
  const exclAuto = () => !!(S.p && P[S.p] && P[S.p].exFrom && S.guests >= P[S.p].exFrom);
  // half day or full day (sessions carry their length)
  const lens = () => { const ss = (P[S.p] || {}).sessions || []; return [...new Set(ss.map(x => x[3] || 'half'))]; };
  const hrs = t => { const [a, b] = String(t).split('–').map(x => x.trim().split(':').map(Number)); if (!b) return ''; const h = (b[0] * 60 + b[1] - a[0] * 60 - a[1]) / 60; return (h % 1 ? Math.floor(h) + '½' : h) + ' hours'; };
  // the engine sets every treatment time (spa days, stays, whole house); guests only choose a start time for treatments-only
  // answers are worked out once per redraw (picking a time redraws)
  let memo = {}; const memoKey = () => JSON.stringify([S.p, S.date && +S.date, S.session, S.nights, S.guests, S.adds, S.picks && S.picks.map(x => x.treat), S.times, S.pairs, S.blue]);
  let memoFor = '';
  const cached = (k, fn) => { const mk = memoKey(); if (mk !== memoFor) { memo = {}; memoFor = mk; } return k in memo ? memo[k] : (memo[k] = fn()); };
  const siteNeeds = () => cached('needs', () => YE.treatmentNeeds(L.cfg, engineBooking()));
  // treatments already given a time (except one), placed with a therapist and room
  function pickedItems(exceptKey) {
    return cached('picked:' + exceptKey, () => {
      S.times = S.times || {};
      const b = engineBooking(), needs = YE.treatmentNeeds(L.cfg, b).filter(n => n.key !== exceptKey && S.times[n.key]);
      return needs.length ? YE.plan(L.cfg, L.ix, b, { needs }).items : [];
    });
  }
  const slotsFor = (need, exceptKey) => cached('slots:' + need.key + ':' + need.tid + ':' + (exceptKey || need.key), () => (exceptKey && exceptKey !== need.key ? YE.slotsFor : YE.slotsAhead)(L.cfg, L.ix, engineBooking(), need, pickedItems(exceptKey || need.key)));
  const nSlots = sl => sl.reduce((a, d) => a + d.times.length, 0);
  // would the whole booking still fit (every guest's treatments, times already picked) with this change to one guest?
  const fitsWith = (g, change, key) => cached('fits:' + g + ':' + key, () => { const b = engineBooking(); b.guestList = b.guestList.map((x, i) => i === g ? change({ ...x, extras: (x.extras || []).slice() }) : x); return YE.plan(L.cfg, L.ix, b, { needs: YE.treatmentNeeds(L.cfg, b) }).ok; });
  function planNow() { if (!YE || !L.cfg || !S.date) return null; const r = YE.plan(L.cfg, L.ix, engineBooking()); S.plan = r.ok ? r.items : null; return r; }
  const fdShort = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  function timesList(items) {
    if (!items || !items.length) return '';
    const multi = items.some(i => i.date !== iso(S.date));
    return Array.from({ length: S.guests }, (_, g) => { const its = items.filter(i => i.guest === g).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)); if (!its.length) return '';
      return `${S.guests > 1 ? `<b>${esc(gName(g))}</b><br>` : ''}${its.map(i => `${multi ? fdShort(i.date) + ' ' : ''}${i.start} · ${esc(YE.itemName(L.cfg, i))} (${i.min} min)`).join('<br>')}`; }).filter(Boolean).join('<br>');
  }
  // discount codes: the public copy only has a fingerprint of each code
  const fp = async code => { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('yc:' + code.trim().toUpperCase()))); let b = ''; d.forEach(x => b += String.fromCharCode(x)); return btoa(b).replace(/=+$/, ''); };
  async function findPromo(code) { if (!L.cfg || !code) return null; const h = await fp(code); return (L.cfg.promos || []).find(p => p.hash === h) || null; }
  const codeWins = () => { const pr = S.promo && price(); return !!(pr && pr.promo); };
  function promoOff(pr) {
    if (!S.promo) return 0; const q = S.promo;
    const basis = q.on === 'all' ? pr.base + pr.bf + pr.tc.sub : q.on === 'treat' ? pr.tc.sub : pr.base;
    return Math.max(0, Math.min(basis, q.type === 'pct' ? Math.round(basis * q.value) / 100 : q.value));
  }
  // offer bar on every page, between the dates set in the admin
  function banner() {
    if (!YE || !L.cfg || document.querySelector('.offer-bar')) return;
    const list = YE.promoBanners(L.cfg); if (!list.length) return;
    const o = list[0], HIDE = 'yc-offer-hide', DAYS = 3;
    // closed recently? stay hidden for a few days (user 2026-11-27)
    try { const h = JSON.parse(localStorage.getItem(HIDE) || 'null'); if (h && h.id === o.id && h.until > Date.now()) return; } catch (e) {}
    const bar = document.createElement('div'); bar.className = 'offer-bar';
    bar.innerHTML = `<span>${esc(o.banner.text)}</span><button type="button" data-book="${(o.products || [])[0] || ''}" data-promo="${esc(o.show || '')}">Book now</button><button type="button" class="offer-x" aria-label="Close this offer">×</button>`;
    bar.querySelector('.offer-x').onclick = () => { bar.remove(); document.documentElement.classList.remove('has-offer'); document.documentElement.style.setProperty('--offer-h', '0px');
      try { localStorage.setItem(HIDE, JSON.stringify({ id: o.id, until: Date.now() + DAYS * 864e5 })); } catch (e) {} };
    const hd = document.querySelector('header'); if (hd) hd.prepend(bar); else document.body.prepend(bar);
    document.documentElement.classList.add('has-offer');
    const fit = () => document.documentElement.style.setProperty('--offer-h', bar.offsetHeight + 'px'); fit(); addEventListener('resize', fit);
  }
  // England & Wales bank holidays
  const BH = new Set(['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28',
    '2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28']);
  const POLICY = {
    spa:  'Spa days are paid in full and are non-refundable. You can move your visit (subject to availability) by emailing us at least 30 days before.',
    stay: 'Spa breaks can be refunded if you cancel at least 30 days before arrival. With less notice the full cost is charged, and there are no refunds for leaving early.',
    house:'50% is paid now and the balance 6 weeks before arrival (bookings within 6 weeks are paid in full). Cancel 6+ months ahead and you can move your dates; 6+ weeks ahead, the deposit is kept; under 6 weeks, the full cost is kept. A £500 damage deposit is pre-authorised on your card and released within 48 hours of departure.',
    ask:  'This is a request, not a booking. We’ll check availability and send you a price to confirm.'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gbp = n => '£' + (Math.round(n * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const nice = (d, o = {}) => d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', ...o });
  const today = day0(new Date()), first = add(today, 1), last = add(today, 365);

  const nightOK = (rule, d) => {
    const w = d.getDay();
    if (rule === 'mid') return w <= 4;                                   // Sun–Thu nights
    return w === 5 || w === 6 || BH.has(iso(add(d, 1))) || BH.has(iso(d)); // Fri/Sat nights, plus nights next to a bank holiday
  };
  const runFrom = d => { let n = 0; while (nightOK('wkd', add(d, n)) && n < 5) n++; return n; };
  function dateOK(k, d){
    if (d < first || d > last) return false;
    if (YE && L.cfg) {
      const n = P[k].rule === 'range' ? (L.cfg.products.house || {}).minN || 2 : P[k].rule ? S.nights : 0;
      if (P[k].rule === 'range' && YE.houseMinNights && !YE.houseStartOK(L.cfg, L.ix, iso(d), { guests: S.guests })) return false;
      const q = { product: k, date: iso(d), nights: n, guests: S.gOK ? S.guests : (P[k].min || 1) };
      const c = P[k].rule === 'range' ? { ok: true } : YE.dateCheck(L.cfg, L.ix, { ...q, exclusive: exclOn() });
      if (!c.ok && !(exclOn() && YE.dateCheck(L.cfg, L.ix, q).ok)) return false;
      return true;   // the admin's rules (arrival days, nights, minimum guests) have decided
    }
    const p = P[k];
    if (k === 'private' && d.getDay() === 0 && S.guests < 6) return false; // Sundays: 6 guest minimum
    if (!p.rule) return true;
    if (p.rule === 'mid') return nightOK('mid', d) && (S.nights < 2 || nightOK('mid', add(d, 1)));
    return true;                                                         // whole house: any dates, 2-30 nights
  }

  const S = { step:0 };
  const reset = k => Object.assign(S, { p:k || null, step:0, date:null, nights:k && P[k].nights ? P[k].nights[0] : 1, session:null,
    guests:k ? Math.max(P[k].min, k === 'group' ? 8 : k === 'treat' ? 1 : 2) : 2, gOK:false, excl:false, len:null, treatStart:null, plan:null, times:{}, tpDate:{}, names:[], g0Own:false, roomOf:[], promo:S.promo || null, promoMsg:'', end:null, bfast:false, picks:[], adds:[], pending:null, tg:0, cat:undefined, pm:'card', paid:null, d:{}, agree:false, adult:false, mkt:false, month:null, ref:null, paying:false });

  const steps = () => ['Booking', 'Guests', 'Date', 'Rooms', 'Guest choices', 'Details', S.p && P[S.p].kind === 'ask' ? 'Send' : 'Pay'];
  const LAST = 6, DETAILS = 5, TIMES = -1, CHOICES = 4, ROOMS = 3, DATE = 2, GUESTS = 1;
  // the times step is skipped when nothing needs a time (e.g. a session with no treatments)
  const hasTimes = () => !!(YE && L.cfg && S.date && siteNeeds().length);
  function syncAdds(){
    while (S.adds.length < S.guests) S.adds.push([]); S.adds.length = S.guests;
    if (S.pending){ if (!S.adds[0].includes(S.pending)) S.adds[0].push(S.pending); S.pending = null; }
  }
  const charges = () => (YE && L.cfg && S.p && YE.extraCharges) ? cached('charges', () => YE.extraCharges(L.cfg, engineBooking())) : null;
  const chargeOf = (gi, id) => { const c = charges(); return c ? c.find(x => x.guest === gi && x.tid === id) : null; };
  function treatCost(){
    let sub = 0, off = 0;
    S.adds.forEach((a, gi) => a.forEach(id => { const t = TRi[id], c = chargeOf(gi, id), price = c ? c.price : t.price; sub += price; if (t.head && !P[S.p].only) off += price * HEAD_OFF; }));
    return { sub, off, n: S.adds.reduce((n, a) => n + a.length, 0) };
  }
  const gName = i => ((S.names || [])[i] || '').trim() || `Guest ${i + 1}`;
  const needRooms = () => stayRooms().length > 1;
  function stayRooms(){
    if (!(YE && L.cfg && S.date && P[S.p] && P[S.p].rule)) return [];
    const ids = YE.pickRooms(L.cfg, L.ix, S.p, iso(S.date), S.nights, S.guests) || [];
    return ids.map(id => L.cfg.rooms.find(r => r.id === id)).filter(Boolean);
  }
  // one room for everyone: nothing to choose
  function autoRooms(rs){ S.roomOf = S.roomOf || []; if (rs.length === 1) for (let i = 0; i < S.guests; i++) S.roomOf[i] = rs[0].id; else S.roomOf = S.roomOf.map(x => rs.some(r => r.id === x) ? x : ''); }
  const treatLines = (sep, withMin) => S.adds.map((a, i) => a.length ? `${gName(i)}: ` + a.map(id => TRi[id].name + (withMin ? ' (' + TRi[id].min + ' min)' : '')).join(', ') : '').filter(Boolean).join(sep);

  function estimate(){ const p = P[S.p]; return p && p.kind === 'ask' ? p.est * S.guests * (p.rule ? S.nights : 1) + (S.bfast && p.bfast ? BFAST * S.guests * S.nights : 0) + treatCost().sub - treatCost().off : 0; }
  function price(){
    const p = P[S.p]; if (!p || p.kind === 'ask') return null;
    const nights = p.rule ? S.nights : 0, tc = treatCost();
    const bl = YE && L.cfg && YE.baseLines && S.p !== 'house' && !p.only ? YE.baseLines(L.cfg, engineBooking()) : null;
    const base = S.p === 'house' ? p.night * nights : bl ? bl.reduce((a, l) => a + l.amount, 0) : p.priceN ? p.priceN[nights] * S.guests : p.price * S.guests;
    const bf = S.bfast && p.bfast ? BFAST * S.guests * nights : 0;
    // only one discount per booking: the code or the head spa offer, whichever saves more (user 2026-11-27)
    // the group discount (6+) joins them: whichever single discount saves most (user 2026-11-28)
    const gd = YE && L.cfg && YE.groupOff && S.p !== 'house' && !p.only ? YE.groupOff(L.cfg, engineBooking()) : null, grp = gd ? gd.amount : 0;
    const code = promoOff({ base, bf, tc }), useCode = code > 0 && code > tc.off && code > grp, promo = useCode ? code : 0, codeBeaten = !!S.promo && !useCode;
    const useGroup = !useCode && grp > 0 && grp >= tc.off, group = useGroup ? grp : 0;
    if (useCode || useGroup) tc.off = 0;
    const total = base + bf + tc.sub - tc.off - promo - group;
    let now = total, bal = 0, balDue = null;
    if (S.p === 'house' && S.date && (S.date - today) / 864e5 > 42){ now = total / 2; bal = total - now; balDue = add(S.date, -42); }
    // a checked gift voucher pays today's amount first, then any balance; what's left stays on the voucher (user 2026-11-27)
    if (typeof S.voucher === 'string') S.voucher = S.voucher ? { code: S.voucher, balance: null } : null;
    const r2 = x => Math.round(x * 100) / 100;
    const voucher = S.voucher && S.voucher.balance != null ? r2(Math.min(S.voucher.balance, total)) : 0;
    const vNow = Math.min(voucher, now); now = r2(now - vNow); bal = r2(bal - (voucher - vNow));
    const voucherLeft = voucher ? r2(S.voucher.balance - voucher) : 0;
    return { base, bf, tc, total, now, bal, balDue, nights, promo, codeBeaten, voucher, voucherLeft, lines: bl, group, groupPct: gd && gd.pct };
  }

  // ---------- shell ----------
  const PAGE = document.body.dataset.page === 'book';
  const box = document.createElement('div');
  box.className = PAGE ? 'bk page on' : 'bk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Book York Cottage Spa');
  box.innerHTML = `<div class="bk-box"><div class="bk-main"><div class="bk-head"><ol class="bk-steps"></ol></div><div class="bk-body"></div><div class="bk-nav"></div></div><aside class="bk-side"></aside></div>`;
  (PAGE ? (document.querySelector('#bookPage .wrap') || document.body) : document.body).appendChild(box);
  const body = $('.bk-body', box), nav = $('.bk-nav', box), side = $('.bk-side', box), stepsEl = $('.bk-steps', box);

  // keep an unfinished booking when the checkout is closed, also across pages (this browser tab only)
  const SKEY = 'yc-booking-v1';
  const DATES = ['date', 'end', 'month'];
  function save(){
    try {
      if (!S.p || S.ref){ sessionStorage.removeItem(SKEY); return; }
      const o = { ...S, paying:false }; DATES.forEach(k => o[k] = S[k] ? +S[k] : null);
      sessionStorage.setItem(SKEY, JSON.stringify(o));
    } catch (e) {}
  }
  function restore(){
    try {
      const o = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); if (!o || !P[o.p]) return false;
      DATES.forEach(k => o[k] = o[k] ? new Date(o[k]) : null);
      if (o.date && o.date < first){ o.date = null; o.end = null; if (o.step > DATE) o.step = DATE; }
      Object.assign(S, o); return true;
    } catch (e) { return false; }
  }
  let started = false;
  function open(k, tr){
    if (!started){ started = true; if (!S.p) restore(); }
    const keep = S.p && !S.ref && (!P[k] || k === S.p);
    if (!keep){ reset(P[k] ? k : null); }
    if (TRi[tr]){ S.pending = tr; if (keep && S.step > CHOICES) S.step = CHOICES; }
    if (S.p) syncAdds();
    box.classList.add('on'); if (!PAGE) document.body.classList.add('bk-open'); draw(); const fb = $('.bk-close', nav); if (fb) fb.focus({ preventScroll:true });
  }
  function close(){
    if (PAGE) { if (S.ref) reset(null); save(); const back = document.referrer && new URL(document.referrer).origin === location.origin && !/book\.html/.test(document.referrer); if (back) history.back(); else location.href = 'index.html'; return; }
    box.classList.remove('on'); document.body.classList.remove('bk-open'); if (S.ref) reset(null); save(); }
  if (!PAGE) { box.addEventListener('click', e => { if (e.target === box) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('on')) close(); }); }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-book]'); if (!a) return;
    e.preventDefault(); document.body.classList.remove('open');
    if (!PAGE) { const q = new URLSearchParams(); if (a.dataset.book) q.set('b', a.dataset.book); if (a.dataset.tr) q.set('tr', a.dataset.tr); if (a.dataset.promo) q.set('promo', a.dataset.promo); location.href = 'book.html' + (q.toString() ? '?' + q : ''); return; }
    if (a.dataset.promo) findPromo(a.dataset.promo).then(pr => { if (pr) { S.promo = { code: a.dataset.promo.toUpperCase(), type: pr.type, value: pr.value, on: pr.on }; draw(); } });
    open(a.dataset.book, a.dataset.tr);
  });

  // ---------- steps ----------
  let lastAt = '';
  function draw(){
    // booking page: the offer bar shows on the first step only, so it never covers the summary (user 2026-11-27)
    if (PAGE) document.documentElement.classList.toggle('bk-on', S.step > 0);
    const st = steps();
    const shown = i => i !== ROOMS || needRooms(), num = i => st.slice(0, i + 1).filter((_, k) => shown(k)).length;
    stepsEl.innerHTML = S.ref ? '' : st.map((t, i) => !shown(i) ? '' : `<li class="${i === S.step ? 'now' : i < S.step ? 'done' : ''}">${i < S.step ? `<button data-goto="${i}" title="Back to ${t}">` : '<span>'}<i>${i < S.step ? '✓' : num(i)}</i><b>${t}</b>${i < S.step ? '</button>' : '</span>'}</li>`).join('');
    stepsEl.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { S.step = +b.dataset.goto; draw(); });
    const bar = S.step > 0 && !S.ref ? selBar() : '';
    body.innerHTML = bar + (S.ref ? doneView() : [chooseView, guestView, dateView, roomsView, treatView, detailView, payView][S.step]());
    body.querySelectorAll('.sel-bar [data-goto]').forEach(b => b.onclick = () => { S.step = +b.dataset.goto; draw(); });
    body.querySelectorAll('[data-gostep]').forEach(b => b.onclick = () => { S.step = +b.dataset.gostep; draw(); });
    navView(); sideView(); sideWire(); wire(); save();
    const at = S.step + ':' + (S.tg || 0) + ':' + !!S.ref;  // only jump to the top on a new step or guest
    if (at !== lastAt){ if (PAGE && lastAt) { const y = box.getBoundingClientRect().top + scrollY - 90; if (scrollY > y) scrollTo({ top: Math.max(0, y) }); } else { body.scrollTop = 0; $('.bk-main', box).scrollTop = 0; box.scrollTop = 0; side.scrollTop = 0; } lastAt = at; }
  }

  const TYPE_NAMES = { Spa:'Spa day', Treat:'Treatments only', Stay:'Spa break', House:'Whole house' };
  function selBar(){
    if (!S.cat) return '';
    const p = S.p && P[S.p] && P[S.p].group === S.cat ? P[S.p] : null;
    return p ? `<div class="sel-bar"><span>You’re booking</span><button data-goto="0" title="Change what you’re booking">${p.name} <i>✎</i></button></div>` : '';
  }
  const typeView = () => chooseView(), optionView = () => chooseView();
  function chooseView(){
    const cost = p => p.price || (p.priceN && (p.priceN[1] ?? Object.values(p.priceN)[0])) || p.night || 0;
    const RANK = { access: 1, day: 2, break: 1, break2: 2, group: 3 };   // Spa Access Only, then with lunch & treatment (user 2026-11-28)
    const grp = g => Object.entries(P).filter(([, p]) => p.group === g && !p.off).sort((a, b) => (RANK[a[0]] ?? 50) - (RANK[b[0]] ?? 50) || cost(a[1]) - cost(b[1])).map(([k, p]) => `<button class="bk-opt ${S.p === k ? 'sel' : ''}" data-p="${k}"><small>${k === 'break' ? '1 – 5 nights · Sunday to Thursday' : k === 'break2' ? '2 nights · arrive Sunday to Wednesday' : k === 'group' ? 'Sun – Thu · 7+ guests' : k === 'house' ? 'Friday & Saturday nights' : p.only ? 'No spa session' : k === 'private' ? '4+ guests (6+ on Sundays)' : k === 'access' ? 'Spa only' : k === 'day' ? 'Lunch & a treatment included' : 'Half or full day'}</small><b>${p.name}</b><span>${p.blurb}</span><em>${p.from[0] === 'f' ? 'F' + p.from.slice(1) : p.from}</em><span class="opt-cta">${S.p === k ? 'Selected' : 'Select'} <span class="arrow">→</span></span></button>`).join('');
    const pend = S.pending ? `<div class="notice"><b>${TRi[S.pending].name}</b> is ready to add. Book it on its own, or add it to a spa day or a stay (Japanese head spa is 10% off with a spa session or stay).</div>` : '';
    const TYPES = [
      ['Spa', 'Spa day', 'Spa Access Only, or Spa, Lunch & Treatment · half or full day', 'From £50 pp', 'https://static.wixstatic.com/media/7a9273_c527bfae78d645c096615f66806d3b0f~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_c527bfae78d645c096615f66806d3b0f~mv2.jpg'],
      ['Treat', 'Treatments only', 'Massage, facials & Japanese head spa', 'From £50', 'https://static.wixstatic.com/media/7a9273_0fed7351ea044db299d21524d0244378~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_0fed7351ea044db299d21524d0244378~mv2.jpg'],
      ['Stay', 'Spa break', 'Sunday to Thursday nights, 1 to 16 guests', 'From £150 pp', 'https://static.wixstatic.com/media/7a9273_372efc1386f3463b863c2d3b93d28915~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_372efc1386f3463b863c2d3b93d28915~mv2.jpg'],
      ['House', 'Whole house', 'Friday & Saturday nights, the house & spa for up to 16', 'From £1,840 / night', 'https://static.wixstatic.com/media/7a9273_2f589cc654944731b1719bd595e8039c~mv2.jpeg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_2f589cc654944731b1719bd595e8039c~mv2.jpeg']];
    if (S.cat === undefined) S.cat = S.p ? P[S.p].group : null;
    const T = TYPES.find(t => t[0] === S.cat), many = S.cat && Object.values(P).filter(x => x.group === S.cat && !x.off).length > 1;
    const G0 = YE && L.cfg && YE.groupRates ? YE.groupRates(L.cfg) : { on: true, from: 6, pct: 10 };
    const gNote = G0.on && (S.cat === 'Spa' || S.cat === 'Stay') ? `<p class="group-nudge"><b>Coming as a group?</b> ${G0.from} or more guests get ${G0.pct}% off and the spa to themselves.</p>` : '';
    return `<h2>What would you like to <em>book</em>?</h2>${pend}<div class="bk-types">${TYPES.map(([g, t, d, f, img]) => `<button class="bk-type ${S.cat === g ? 'sel' : ''}" data-cat="${g}"><span class="bt-img" style="background-image:url('${img}')"></span><b>${t}</b><span>${d}</span><em>${f}</em><span class="opt-cta">${S.cat === g ? 'Selected' : 'Choose'} <span class="arrow">→</span></span></button>`).join('')}</div>${T && many ? `<div class="bk-group bk-opts-h" id="bkOpts">${T[1]}: choose one</div><div class="bk-opts">${grp(S.cat)}</div>` : ''}${gNote}`;
  }

  // the first day that can be booked (with a session free, for session bookings), chosen for the guest (user, 2026-11-26)
  // could these two treatments be had together (same room, same time)? at the other guest's time if they've picked one
  const canPair = (k, w) => cached('pair:' + k + '>' + w, () => { const b = { ...engineBooking(), pairs: { ...(S.pairs || {}), [k]: w } }, tm = { ...(b.times || {}) }; delete tm[k]; b.times = tm; return YE.plan(L.cfg, L.ix, b, { needs: YE.treatmentNeeds(L.cfg, b) }).ok; });
  const blueName = n => S.blue && YE && L.cfg && YE.minName && L.cfg.rules.blueLight ? YE.minName(n, L.cfg.rules.blueLightMin || 30) : n;
  const resetAfter = () => { S.pairs = {}; S.times = {}; S.tpDate = {}; S.adds = S.adds.map(() => []); S.picks = []; S.roomOf = []; S.seen = {}; S.tg = 0; S.sameNote = ''; };
  function firstFree(){
    const p = P[S.p];
    for (let d = new Date(first); d <= last; d = add(d, 1)) {
      if (p.rule === 'range' && d.getDay() !== 5) continue;   // whole house: Friday check-in first (user 2026-11-28)
      if (!exOK(d)) continue;
      if (!dateOK(S.p, d)) continue;
      if (p.sessions && !p.only && YE && L.cfg) { const l = YE.sessions(L.cfg, L.ix, S.p, iso(d), S.guests, { exclusive: exclOn() }); if (l && l.length && !l.some(x => x.ok)) continue; }
      return d;
    }
    return null;
  }
  const roomMemo = new Map(); let roomIx = null;
  const roomShow = () => YE && L.cfg && YE.treatRoom && S.p && !P[S.p].only && P[S.p].rule !== 'range' && P[S.p].kind !== 'ask';
  const roomAt = (d, ses) => { if (roomIx !== L.ix) { roomMemo.clear(); roomIx = L.ix; }
    const sid = ses ? sesId(S.p, ses, d) : null; if (ses && !sid) return -1;
    const k = [S.p, iso(d), sid, S.guests, S.nights].join('|');
    if (!roomMemo.has(k)) roomMemo.set(k, YE.treatRoom(L.cfg, L.ix, { product: S.p, date: iso(d), sessionId: sid, nights: P[S.p].rule ? S.nights : 0, guests: S.guests }));
    return roomMemo.get(k); };
  // the best a day offers: its roomiest session, or the stay starting that day
  const dayRoom = d => !roomShow() ? null : P[S.p].sessions ? Math.max(-1, ...P[S.p].sessions.map(([n]) => roomAt(d, n))) : roomAt(d, null);
  const roomText = m => m === 0 ? 'Included treatments only' : m > 0 && m < 60 ? `Extras up to ${m} min` : '';

  function dateView(){
    if (S.goneMsg) { const m = S.goneMsg; S.goneMsg = ''; return `<div class="notice bad">${esc(m)}</div>` + dateView(); }
    const p = P[S.p], range = p.rule === 'range';
    if (!S.date) { const d = firstFree(); if (d) { S.date = d; S.end = null; S.month = new Date(d.getFullYear(), d.getMonth(), 1); S.times = {}; } }
    const m = S.month || (S.date ? new Date(S.date.getFullYear(), S.date.getMonth(), 1) : new Date(first.getFullYear(), first.getMonth(), 1));
    S.month = m;
    const endSel = endDate(), two = !!p.rule && innerWidth > 900;
    const grid = mm => {
      const startW = (mm.getDay() + 6) % 7, dim = new Date(mm.getFullYear(), mm.getMonth() + 1, 0).getDate();
      let cells = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<span class="dw">${d}</span>`).join('') + '<span></span>'.repeat(startW);
      for (let i = 1; i <= dim; i++){
        const d = new Date(mm.getFullYear(), mm.getMonth(), i), ok = range && S.date && !S.end && d > S.date ? houseEnd(d) : dateOK(S.p, d);
        let c = BH.has(iso(d)) ? 'bh' : '';
        if (S.date && +d === +S.date) c += ' sel';
        else if (endSel && d > S.date && d < endSel) c += ' in';
        else if (endSel && +d === +endSel) c += ' end';
        const rm = ok ? dayRoom(d) : null; if (rm === 0) c += ' r-none'; else if (rm > 0 && rm < 60) c += ' r-some';
        if (ok && exclOn() && !exOK(d)) c += ' no-ex';
        cells += `<button data-d="${iso(d)}" class="${c}" ${ok ? '' : 'disabled'} aria-label="${nice(d, { year:'numeric' })}${rm != null && roomText(rm) ? ' · ' + roomText(rm) : ''}">${i}</button>`;
      }
      return `<div class="cal-m"><b class="cal-t">${mm.toLocaleDateString('en-GB', { month:'long', year:'numeric' })}</b><div class="cal-g">${cells}</div></div>`;
    };
    const m2 = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const prevOK = new Date(m.getFullYear(), m.getMonth(), 0) >= first, nextOK = new Date(m.getFullYear(), m.getMonth() + (two ? 2 : 1), 1) <= last;
    const times = rows => `<ul class="times">${rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>`;
    let right = '';
    const exMsg = S.date && exclOn() && !exOK(S.date) ? `<div class="notice bad ex-msg"><b>Exclusive use isn’t available on this day.</b> Other guests are already booked in${p.rule ? ' during your stay' : ''}. If you’d like the spa just for you, please choose another day (marked days aren’t available just for you).<button type="button" class="linkbtn-site" data-noexcl>Carry on without exclusive use</button></div>` : '';
    const live = YE && L.cfg && S.date && p.sessions && !p.only ? YE.sessions(L.cfg, L.ix, S.p, iso(S.date), S.guests, { exclusive: exclOn() }) : null;
    const LN = lens(), twoLen = LN.length > 1;
    if (twoLen && S.session && !S.len) { const x = p.sessions.find(z => z[0] === S.session); if (x) S.len = x[3] || 'half'; }
    const sesList = p.only ? [] : (p.sessions || []).filter(x => (!S.date || !live || live.some(l => l.name === x[0])) && (!twoLen || (x[3] || 'half') === S.len));
    const lenPick = !twoLen ? '' : `<div class="bk-group" style="margin-top:0">Half day or full day?</div><div class="pills len-pills">${['half', 'full'].filter(l => LN.includes(l)).map(l => { const x = p.sessions.find(z => (z[3] || 'half') === l), any = !live || live.some(v => v.length === l && v.ok);
      return `<button class="pill ${S.len === l ? 'sel' : ''}" data-len="${l}" ${any ? '' : 'disabled'}>${l === 'full' ? 'Full day' : 'Half day'} · ${hrs(x[1])} · ${gbp(x[4] != null ? x[4] : p.price)} pp${exAdd(l) ? ` + ${gbp(exAdd(l))} just for you` : ''}${any ? '' : ' · full'}</button>`; }).join('')}</div>${S.len === 'full' ? '' : S.len ? '<div class="bk-group">Morning or afternoon?</div>' : ''}`;
    if (p.only) right = `<div class="bk-group" style="margin-top:0">Your time</div><p class="cal-note">Choose your treatments next, then pick from the start times that are free on this day.</p>`;
    else if (p.sessions) right = (twoLen ? lenPick : `<div class="bk-group" style="margin-top:0">Session</div>`) + (twoLen && !S.len ? '' : `<div class="ses">${sesList.map(([n, t]) => { const l = live && live.find(x => x.name === n); const off = l && !l.ok; return `<button class="ses-opt ${S.session === n ? 'sel' : ''}" data-s="${n}" ${off ? 'disabled' : ''}><b>${n}</b><span>${t}</span>${l ? `<small class="${off ? 'full' : ''}">${off ? esc(l.why) : l.left <= 3 ? `Only ${l.left} place${l.left === 1 ? '' : 's'} left` : 'Available'}</small>` : ''}${!off && S.date && roomShow() && roomText(roomAt(S.date, n)) ? `<em class="ses-room">${roomText(roomAt(S.date, n))}</em>` : ''}</button>`; }).join('') || '<p class="cal-note">No sessions on this day.</p>'}</div>`) + `
      ${S.p === 'private' ? `<p class="cal-note">Minimum 4 guests, or 6 on Sundays (from 11:30).${S.guests < 6 ? ' Sundays open up for groups of 6 or more.' : ''}</p>` : ''}`;
    else if (p.nights && p.nights.length > 1) { const q = L.cfg && L.cfg.products[S.p], fits = n => !S.date || !q || !q.arriveDays || !q.arriveDays[n] || q.arriveDays[n].includes(S.date.getDay());
      right = `<div class="bk-group" style="margin-top:0">How many nights?</div><div class="pills nights-pills">${p.nights.map(n => `<button class="pill ${S.nights === n ? 'sel' : ''}" data-n="${n}" ${fits(n) ? '' : 'disabled title="Breaks end by Friday morning"'}>${n} night${n > 1 ? 's' : ''} · ${gbp(p.priceN[n])} pp</button>`).join('')}</div>${p.single ? `<p class="cal-note">Prices are per person, based on 2 sharing a room. Breaks end by Friday morning.</p>` : ''}`; }
    const stayRoom = S.date && !p.sessions && roomShow() ? roomText(roomAt(S.date, null)) : '';
    if (p.rule === 'mid' || p.rule === 'stay'){
      right += `<div class="bk-group">Your stay</div>` + (S.date
        ? `<p class="stay-when"><b>${nice(S.date)}</b> → <b>${nice(add(S.date, S.nights))}</b> · ${S.nights} night${S.nights > 1 ? 's' : ''}</p>${stayRoom ? `<p class="room-note">${stayRoom} on these dates. Other dates have more treatment time.</p>` : ''}${times(stayTimes(S.p, S.date, S.nights))}`
        : `<p class="cal-note">${(() => { const q = L.cfg && L.cfg.products[S.p], days = q && q.arriveDays && q.arriveDays[S.nights]; if (!days) return S.nights > 1 ? '2-night breaks arrive Sunday to Wednesday.' : 'Breaks run Sunday to Thursday nights.'; const N = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; return days.length === 7 ? 'Arrive any day.' : `${S.nights}-night stays arrive on ${[1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d)).map(d => N[d]).join(', ')}.`; })()} Pick your arrival day.</p>`);
    }
    if (range){
      right = `<div class="bk-group" style="margin-top:0">Your stay</div>` + (!S.date
        ? `<p class="cal-note">Pick your check-in day, then your check-out day. Your stay includes Friday and Saturday night; add nights either side if you like.</p>`
        : !S.end ? `<p class="stay-when">Check-in <b>${nice(S.date)}</b></p><p class="cal-note">Now pick your check-out day (your stay must include Friday and Saturday night).</p>`
        : `<p class="stay-when"><b>${nice(S.date)}</b> → <b>${nice(S.end)}</b> · ${S.nights} nights</p>${times(stayTimes('house', S.date, S.nights))}<p class="cal-note">From £1,840 per night for the whole house. Rates can vary by date.</p>`);
    }
    return `<h2>Choose your <em>${p.rule ? 'dates' : 'day'}</em></h2><p class="bk-sub">${p.name}${p.rule === 'mid' ? ' · Sunday to Thursday nights' : range ? ' · Friday & Saturday nights, plus any nights either side' : p.only ? ' · you’ll pick a start time after choosing treatments' : twoLen ? ' · half day (4 hours) or full day (7½ hours)' : ' · 4-hour sessions'}</p>
      <div class="bk-row ${two ? 'wide' : ''}"><div class="cal"><div class="cal-nav"><button data-m="-1" ${prevOK ? '' : 'disabled'} aria-label="Previous month">‹</button><button data-m="1" ${nextOK ? '' : 'disabled'} aria-label="Next month">›</button></div>
      <div class="cal-ms">${grid(m)}${two ? grid(m2) : ''}</div><div class="cal-note"><span><i></i>Bank holiday</span>${exclOn() ? '<span><i class="k-noex"></i>Not available just for you</span>' : ''}${roomShow() ? '<span><i class="k-some"></i>Shorter extra treatments</span><span><i class="k-none"></i>Included treatments only</span>' : ''}${p.rule ? '<span>Tap your arrival day' + (p.rule === 'range' ? ', then your departure day' : '') + '</span>' : ''}</div></div><div class="bk-right">${exMsg}${right}</div></div>`;
  }

  // whole house: can the stay end on this day? (must include the set nights, and all of it free)
  function houseEnd(d){ const n = Math.round((d - S.date) / 864e5); if (n < 1 || n > ((L.cfg && L.cfg.products.house.maxN) || 30)) return false;
    if (!(YE && L.cfg)) return n >= 2; return YE.dateCheck(L.cfg, L.ix, { product: 'house', date: iso(S.date), nights: n, guests: S.guests }).ok; }
  const gMin = () => P[S.p].min;
  function guestView(){
    const p = P[S.p], minG = gMin();
    if (S.guests < minG) S.guests = minG;
    while (S.picks.length < S.guests) S.picks.push({ treat:'Aromatherapy massage', food:(p.foods || ['Afternoon tea'])[0] });
    S.picks.length = S.guests; syncAdds();
    const quick = [...new Set([minG, 2, 4, 6, 8, 10, 12, 16].filter(n => n >= minG && n <= p.max))].slice(0, 6);
    const note = S.p === 'break' ? (exclAuto() || exclOn() ? 'Every bedroom is yours, sleep as you like · prices are based on 2 sharing' : `${Math.ceil(S.guests / 2)} bedroom${S.guests > 2 ? 's' : ''} · prices are based on 2 sharing${S.guests % 2 && p.single ? ` · one guest has a room to themselves (+${gbp(p.single)} a night)` : ''}`)
      : /^break/.test(S.p) ? `${Math.ceil(S.guests / 2)} king ensuite room${S.guests > 2 ? 's' : ''} · prices are based on 2 sharing`
      : S.p === 'group' ? 'Groups of 7 to 16 guests.</p><p class="gc-alt">6 or fewer? <button type="button" class="linkbtn-site" data-alt="break">Choose a Spa Break instead</button>'
      : S.p === 'house' ? 'Up to 16 guests · the price is for the whole house'
      : S.p === 'private' ? 'Minimum 4 guests, 6 on Sundays'
      : `Up to ${p.max} guests per booking`;
    const exBox = exclBox();
    let h = `<h2>How many <em>guests</em>?</h2>
      <div class="gcount">
        <div class="gc-main"><button class="gc-btn" data-g="-1" ${S.guests <= minG ? 'disabled' : ''} aria-label="Fewer guests">−</button>
          <div class="gc-num"><b>${S.guests}</b><span>guest${S.guests > 1 ? 's' : ''}</span></div>
          <button class="gc-btn" data-g="1" ${S.guests >= p.max ? 'disabled' : ''} aria-label="More guests">+</button></div>
        <div class="gc-side"><p>${note}</p></div>
      </div>${exBox}
      <div class="bk-group">Who’s coming?</div><p class="cal-note" style="margin:-4px 0 10px">The full name of each guest, so we can welcome everyone and your therapists know who they’re treating.</p>
      <div class="bk-2 gnames">${Array.from({ length: S.guests }, (_, i) => `<div class="bk-field" data-fd="g${i}"><label for="bk_g${i}">Guest ${i + 1}${i === 0 ? ' (lead guest)' : ''}</label><input id="bk_g${i}" type="text" autocomplete="${i === 0 ? 'name' : 'off'}" value="${esc((S.names || [])[i] || '')}" placeholder="First and last name"><small class="err">Please enter this guest’s name</small></div>`).join('')}</div>${incMode(S.p) && (!L.cfg || (L.cfg.rules || {}).blueLight !== false) ? `<label class="check blue-q"><input type="checkbox" id="bkBlue" ${S.blue ? 'checked' : ''}> Someone in the group has a Blue Light Card <span class="opt">included treatments become ${(L.cfg && L.cfg.rules.blueLightMin) || 30} minutes, free</span></label>` : ''}`;
    if (p.bfast && (S.p === 'group' || S.p === 'break' || S.nights > 1))
      h += `<label class="check opt-line"><input type="checkbox" id="bkBf" ${S.bfast ? 'checked' : ''}> Add continental breakfast · £${BFAST} per person, per morning</label>`;
    return h;
  }

  const pricePart = () => '';
  // "just for us": spa days and spa breaks of 5 or fewer can have the spa to themselves, priced per empty place; 6+ have it anyway
  function exclBox(){
    const p = P[S.p]; if (!p.exFrom) return '';
    const stay = !!p.rule, what = stay ? 'the spa during your spa times, and no other guests stay those nights' : 'the spa for your whole session';
    const G = YE && L.cfg && YE.groupRates ? YE.groupRates(L.cfg) : { on: true, from: 6, pct: 10 }, gOn = G.on && p.group !== 'House' && (!L.cfg || (L.cfg.products[S.p] || {}).groupDiscount);
    if (exclAuto()) return `<div class="notice excl-note group-yes"><b>${p.exFrom} or more guests: ${gOn ? `${G.pct}% off, and ` : ''}it’s just for you.</b> ${gOn ? `Your group saves ${G.pct}% on the ${p.rule ? 'break' : 'spa day'} price, and you` : 'You'} have ${what}, at no extra cost. Guests booked only for treatments may still come in.</div>`;
    const nudge = gOn && S.guests < G.from ? `<p class="group-nudge"><b>Bring ${G.from - S.guests} more and save ${G.pct}%.</b> Groups of ${G.from} or more get ${G.pct}% off and the spa to themselves.</p>` : '';
    if (!p.exOpt) return nudge;
    const R = YE && L.cfg && YE.exclusiveRates ? YE.exclusiveRates(L.cfg) : { half: 25, full: 40, night: 75, lastOn: false, lastDays: 7, lastPct: 50 };
    const empty = p.exFrom - S.guests, each = n => `${empty} empty place${empty === 1 ? '' : 's'} × ${gbp(n)}`;
    const cost = stay ? `<b>+${gbp(empty * R.night)} a night</b> (${each(R.night)})`
      : `<b>+${gbp(empty * R.half)} for a half day, +${gbp(empty * R.full)} for a full day</b> (${empty} empty place${empty === 1 ? '' : 's'} × ${gbp(R.half)} or ${gbp(R.full)})`;
    const last = R.lastOn ? ` Booking within ${R.lastDays} days of your visit? It’s ${R.lastPct}% off.` : '';
    return `<label class="excl-q ${S.excl ? 'on' : ''}"><input type="checkbox" id="bkExcl" ${S.excl ? 'checked' : ''}><span><b>Make it just for us</b><small>${what[0].toUpperCase() + what.slice(1)}. ${cost}.${last} Guests booked only for treatments may still come in.</small></span></label>${nudge}`;
  }
  const INCLUDED = { day:'treat', private:'treat', break:'treat', break2:'treat', group:'treat' };
  // most extra treatments one guest can add online (set per booking type in the admin; staff can add more)
  const maxExtras = () => { const q = L.cfg && L.cfg.products[S.p]; if (q && q.maxExtras) return q.maxExtras; return P[S.p].rule ? 3 * ((S.nights || 1) + 1) : 3; };
  // included treatments for a booking type (from the admin): 'treat' = guests choose one, 'massage' = everyone has them
  const incList = k => YE && L.cfg ? YE.includedFor(L.cfg, k) : null;
  const incMode = k => { const l = incList(k); if (!l) return INCLUDED[k]; if (!l.length) return null; return l.length > 1 && YE.includedPick(L.cfg, k) === 'one' ? 'treat' : 'massage'; };
  function treatView(){
    const p = P[S.p]; syncAdds();
    while (S.picks.length < S.guests) S.picks.push({ treat:'Aromatherapy massage', food:(p.foods || ['Afternoon tea'])[0] });
    const g = Math.min(Math.max(S.tg || 0, 0), S.guests - 1); S.tg = g;
    const pick = S.picks[g], n = S.guests;
    const dots = n > 1 ? `<div class="gtabs">${Array.from({ length:n }, (_, i) => { const done = i !== g && (i < g || (S.seen && S.seen[i])); return `<button class="gtab ${i === g ? 'now' : ''} ${done ? 'done' : ''}" data-gt="${i}">${done ? '<i>✓</i>' : ''}${esc(gName(i))}</button>`; }).join('')}</div>` : '';
    const incOff = v => { if (!(YE && L.cfg && S.date)) return false; const t = (incList(S.p) || []).find(x => x.name === v); return t ? !fitsWith(g, x => ({ ...x, included: t.id }), 'inc=' + t.id) : false; };
    const choice = (fld, opts) => `<div class="choice">${opts.map(([v, sub]) => { const off = fld === 'treat' && pick.treat !== v && incOff(v); return `<button class="ch ${pick[fld] === v ? 'sel' : ''}" data-pk="${g}" data-f="${fld}" data-v="${v}" ${off ? 'disabled' : ''}><span class="ch-r"></span><b>${fld === 'treat' ? blueName(v) : v}</b>${off ? '<small>No available times in this session</small>' : sub ? `<small>${sub}</small>` : ''}</button>`; }).join('')}</div>`;
    let h = `<div class="gc-head"><h2>${n > 1 ? `${esc(gName(g))} <em>· ${g + 1} of ${n}</em>` : p.only ? 'Choose your <em>treatments</em>' : 'Your <em>choices</em>'}</h2>${dots}</div>`;
    const il = incList(S.p);
    if (incMode(S.p) === 'treat') { if (il && !il.some(t => t.name === pick.treat)) pick.treat = il[0].name; h += `<div class="bk-group">Included treatment: choose one</div>${choice('treat', il ? il.map(t => [t.name, t.desc || `${t.min} minutes`]) : [['Aromatherapy massage', 'Relaxing, with aromatherapy oils'], [p.facial || 'Facial', S.p === 'private' ? 'A luxury facial' : 'An aromatherapy facial']])}`; }
    if (incMode(S.p) === 'massage') h += `<div class="inc-line"><span>✓</span> ${il ? esc(il.map(t => blueName(t.name)).join(' and ')) + (il.length > 1 ? ' are' : ' is') : 'A 20-minute aromatherapy massage is'} included</div>`;
    if (p.food) h += `<div class="bk-group">Food</div>${choice('food', (p.foods || ['Afternoon tea', 'Sweet & savoury grazing board']).map(v => [v, v === 'Afternoon tea' ? 'Sweet & savoury treats' : v === 'Grazing board' ? 'Meats, cheese & sweet treats' : 'Meats, cheese & sweet treats · vegan available']))}`;
    const cats = [...new Set(TR.map(t => t.cat))];
    let anyNone = false;
    const extras = cats.map(c => `<div class="tr-cat">${c}${c === 'Japanese Head Spa' && !p.only ? ' <span>10% off with your booking</span>' : ''}</div><div class="tr-list">` + TR.filter(t => t.cat === c).map(t => {
      const on = S.adds[g].includes(t.id), max = !on && S.adds[g].length >= maxExtras();
      const incN = YE && L.cfg && S.date ? siteNeeds().find(n => n.guest === g && n.included) : null, sameKind = !!(incN && YE.combineMax && (L.cfg.rules || {}).combineIncluded !== false && (YE.tr(L.cfg, incN.tid) || {}).cat === t.cat);
      // only offered if the whole booking still fits with it, so no guest is left without a time for their included treatment
      const none = !on && YE && L.cfg && S.date && !fitsWith(g, x => ({ ...x, extras: x.extras.concat(t.id) }), 'x+' + t.id);
      if (none) anyNone = true;
      const full = max || none || (sameKind && !on && (S.adds[g] || []).some(id => { const c = chargeOf(g, id); return c && c.extends; }));
      // same kind as the included treatment: it extends it, up to the 55-minute cap, charged for the minutes it adds
      let ext = null;
      if (sameKind && !on) { const already = (S.adds[g] || []).some(id => { const c = chargeOf(g, id); return c && c.extends; }), cap = YE.combineMax(L.cfg), add = already ? 0 : Math.max(0, Math.min(t.min, cap - incN.min));
        ext = { already, add, total: incN.min + add, price: add >= t.min ? t.price : YE.extendPrice(L.cfg) }; }
      else if (sameKind && on) { const c = chargeOf(g, t.id); if (c && c.extends) ext = { add: c.mins, total: Math.min(YE.combineMax(L.cfg), (siteNeeds().find(n => n.guest === g && n.included) || {}).min || 0), price: c.price }; }
      const blocked = ext && ext.already, price = ext && !blocked ? ext.price : t.price;
      const pr = t.head && !p.only && !codeWins() ? `<s>${gbp(price)}</s> ${gbp(price * (1 - HEAD_OFF))}` : (ext && !blocked && price !== t.price ? `<s>${gbp(t.price)}</s> ${gbp(price)}` : gbp(price));
      return `<button class="tr-opt ${on ? 'sel' : ''}" data-add="${t.id}" data-gi="${g}" ${full ? 'disabled' : ''}><span class="tr-tick">${on ? '✓' : '+'}</span><span class="tr-txt"><b>${t.name}</b><span>${t.desc}</span>${none ? '<em class="tr-note off">No available times</em>' : ext && ext.already ? '<em class="tr-note off">Your included treatment is already extended</em>' : ext ? `<em class="tr-note">Extends the included treatment to ${ext.total} min</em>` : ''}</span><span class="tr-pr"><b>${pr}</b><small>${ext && !ext.already ? `+${ext.add} min` : t.min + ' min'}</small></span></button>`;
    }).join('') + '</div>').join('');
    h += p.only
      ? `<p class="bk-sub" style="margin-top:6px">Pick up to ${maxExtras()} treatments${n > 1 ? ' for this guest' : ''}, then choose a time for each one below.</p>${S.adds[g].length >= maxExtras() ? `<div class="notice">That’s the most we can book online for one guest. For more, call us on 01933 580 100.</div>` : ''}${extras}`
      : `<div class="extra-box"><div class="extra-h"><b>Add extra treatments <span>optional</span></b><p>${incMode(S.p) ? 'Your booking already includes a treatment. Want more time? Add any of these.' : 'Add a massage, facial or Japanese head spa to your visit.'} Up to ${maxExtras()} per guest${p.rule ? ' across your stay' : ''}; we’ll fit them around your ${p.rule ? 'stay' : 'session'}.</p></div>${S.adds[g].length >= maxExtras() ? `<div class="notice">That’s the most we can book online for one guest. For more, call us on 01933 580 100.</div>` : ''}${extras}</div>`;
    if (anyNone) h = h.replace('<div class="tr-cat">', `<div class="more-time"><span>Some treatments have no available times ${p.rule ? 'on these dates' : 'in this session'}.</span><button type="button" class="bk-backlink" data-gostep="${DATE}">Change your ${p.sessions ? 'day or session' : 'dates'} for more availability →</button></div><div class="tr-cat">`);
    if (S.sameNote && g > 0) { h = `<div class="notice">${esc(S.sameNote)}</div>` + h; if (g === n - 1) S.sameNote = ''; }
    // ---- this guest's treatment times, right under their treatments ----
    if (YE && L.cfg && S.date) {
      S.times = S.times || {}; S.tpDate = S.tpDate || {};
      const mine = siteNeeds().filter(x => x.guest === g);
      if (mine.length) {
        h += `<div class="bk-group">${n > 1 ? `${esc(gName(g))}’s` : 'Your'} treatment times</div><p class="cal-note" style="margin:-4px 0 10px">Pick a time for each treatment. Only times when a therapist and a treatment room are free are shown${P[S.p].rule ? ', on any day of your stay' : ''}.</p>`;
        S.pairs = S.pairs || {};
        for (const need of mine) {
          const t0 = { ...(YE.tr(L.cfg, need.tid) || {}), name: YE.itemName(L.cfg, need) };
          // treated together with someone else in this booking: their time, the same room, a therapist each
          const pk = S.pairs[need.key], pn = pk && siteNeeds().find(x => x.key === pk);
          if (pk && !pn) delete S.pairs[need.key];
          if (pn) { const pt = S.times[pk];
            h += `<div class="tpick done tp-pair"><div class="tp-h"><b>${esc(t0.name)}</b><span>${need.min || t0.min} min</span>${pt ? `<em>✓ ${pt.start}</em>` : ''}</div>
              <p class="tp-with">Together with ${esc(gName(pn.guest))}’s ${esc(YE.itemName(L.cfg, pn))}, in the same room${pt ? ` at ${pt.start}` : ''}, each with your own therapist.${pt ? '' : ` Your time will match ${esc(gName(pn.guest))}’s once it’s chosen.`}</p>
              <button type="button" class="bk-backlink" data-unpair="${need.key}">Have it on my own instead</button></div>`;
            continue; }
          // who could this be shared with: other guests' treatments, where a room suits both, not already paired
          const taken = new Set([...Object.keys(S.pairs), ...Object.values(S.pairs)]);
          const mates = n > 1 && !taken.has(need.key) ? siteNeeds().filter(x => x.guest !== g && !taken.has(x.key) && YE.canShare(L.cfg, [need.tid, x.tid]) && canPair(need.key, x.key)) : [];
          const pairNote = S.pairNote && S.pairNote.key === need.key ? S.pairNote.text : '';
          const withHtml = mates.length ? `<div class="tp-mates"><span>Have this together with</span>${mates.map(x => `<button type="button" class="pill" data-pair="${need.key}|${x.key}">${esc(gName(x.guest))} · ${esc(YE.itemName(L.cfg, x))}</button>`).join('')}${pairNote ? `<p class="tp-none">${esc(pairNote)}</p>` : ''}</div>` : '';
          const t = t0, sl = slotsFor(need), cur = S.times[need.key];
          if (cur && !sl.some(d => d.date === cur.date && d.times.some(x => x.start === cur.start))) delete S.times[need.key];
          const days = sl.filter(d => d.times.length), day = (S.times[need.key] || {}).date || S.tpDate[need.key] || (days[0] || {}).date;
          h += `<div class="tpick ${S.times[need.key] ? 'done' : ''}"><div class="tp-h"><b>${esc(t.name)}</b><span>${need.min || t.min} min${need.included ? ((need.with || []).length ? ` · ${need.baseMin || (YE.tr(L.cfg, need.tid) || {}).min} min included + ${(need.min || 0) - (need.baseMin || (YE.tr(L.cfg, need.tid) || {}).min || 0)} min extra` : ' · included') : ''}</span>${S.times[need.key] ? `<em>✓ ${sl.length > 1 ? fdShort(S.times[need.key].date) + ' ' : ''}${S.times[need.key].start}</em>` : ''}</div>
            ${!days.length ? `<p class="tp-none">Sorry, there are no available times for this treatment${P[S.p].rule ? ' during your stay' : ' in your session'}. ${need.included ? 'Please choose another session or day.' : 'Please remove it or choose another day.'}</p>`
              : `${sl.length > 1 ? `<div class="pills tp-days">${sl.map(d => `<button class="pill ${d.date === day ? 'sel' : ''}" data-tpd="${need.key}|${d.date}" ${d.times.length ? '' : 'disabled'}>${fdShort(d.date)}${d.times.length ? '' : ' · full'}</button>`).join('')}</div>` : ''}
                <div class="pills tp-times">${(sl.find(d => d.date === day) || { times: [] }).times.map(x => `<button class="pill ${(S.times[need.key] || {}).start === x.start && (S.times[need.key] || {}).date === day ? 'sel' : ''}" data-tp="${need.key}|${day}|${x.start}">${x.start}</button>`).join('')}</div>`}${withHtml}</div>`;
        }
      }
        }
    return h;
  }

  function roomsView(){
    const rs = stayRooms(); autoRooms(rs);
    if (rs.length < 2) return `<h2>Your <em>room</em></h2><p class="bk-sub">${rs[0] ? esc(rs[0].name) + ' is yours for the stay.' : 'We’ll get your room ready.'}</p>`;
    const cnt = id => (S.roomOf || []).filter(x => x === id).length;
    return `<h2>Who’s in <em>which room</em>?</h2><p class="bk-sub">Your stay has ${rs.length} bedrooms. Tap a guest under each room to put them in it.</p>
      <div class="rooms-pick">${rs.map(r => `<div class="rp-card ${cnt(r.id) >= r.people ? 'full' : ''}"><div class="rp-img" style="background-image:url('${esc(r.photo || '')}')"></div>
        <div class="rp-body"><div class="rp-h"><b>${esc(r.name)}</b><span>${cnt(r.id)} of ${r.people}</span></div><small>${esc([r.bed ? r.bed + ' bed' : '', r.ensuite ? 'ensuite' : '', 'sleeps ' + r.people].filter(Boolean).join(' · '))}</small>
        <div class="rp-guests">${Array.from({ length: S.guests }, (_, i) => { const here = (S.roomOf || [])[i] === r.id, elsewhere = (S.roomOf || [])[i] && !here; return `<button type="button" class="rp-g ${here ? 'on' : ''} ${elsewhere ? 'away' : ''}" data-rg="${r.id}|${i}" ${!here && cnt(r.id) >= r.people ? 'disabled' : ''}>${here ? '✓ ' : ''}${esc(gName(i))}</button>`; }).join('')}</div></div></div>`).join('')}</div>`;
  }

  function detailView(){
    // phone numbers: a dialling code, and the leading 0 handled (user 2026-11-27)
    const DIAL = [['+44', '🇬🇧 +44'], ['+353', '🇮🇪 +353'], ['+33', '🇫🇷 +33'], ['+49', '🇩🇪 +49'], ['+34', '🇪🇸 +34'], ['+39', '🇮🇹 +39'], ['+31', '🇳🇱 +31'], ['+32', '🇧🇪 +32'], ['+351', '🇵🇹 +351'], ['+41', '🇨🇭 +41'], ['+48', '🇵🇱 +48'], ['+46', '🇸🇪 +46'], ['+47', '🇳🇴 +47'], ['+45', '🇩🇰 +45'], ['+30', '🇬🇷 +30'], ['+1', '🇺🇸 🇨🇦 +1'], ['+61', '🇦🇺 +61'], ['+64', '🇳🇿 +64'], ['+27', '🇿🇦 +27'], ['+971', '🇦🇪 +971'], ['+91', '🇮🇳 +91'], ['+86', '🇨🇳 +86'], ['+81', '🇯🇵 +81']];
    const f = (id, label, type = 'text', ac = '', err = 'Please fill this in', opt = false) => `<div class="bk-field" data-fd="${id}"><label for="bk_${id}">${label}${opt ? ' <span class="opt">optional</span>' : ''}</label><input id="bk_${id}" type="${type}" autocomplete="${ac}" value="${esc(S.d[id])}"><span class="err">${err}</span></div>`;
    const ageLine = (S.p === 'private' || S.p === 'house')
      ? 'I’m 18 or over. Under-16s only join on a Private Spa or whole-house booking, with an adult.'
      : /^break/.test(S.p) || S.p === 'group' ? 'Everyone staying is 18 or over.'
      : 'I’m 18 or over, and any 16 or 17-year-olds will be with an adult.';
    const pol = (L.cfg && L.cfg.products[S.p] && L.cfg.products[S.p].policy) || POLICY[S.p === 'house' ? 'house' : P[S.p].rule ? 'stay' : 'spa'];
    return `<h2>Your <em>details</em></h2>
      <div class="det-grid">
        <div class="det-card"><div class="bk-group" style="margin-top:0">Lead guest</div>
          <div class="bk-2">${f('first', 'First name', 'text', 'given-name')}${f('last', 'Last name', 'text', 'family-name')}</div>
          ${f('email', 'Email', 'email', 'email', 'Please enter a valid email address, e.g. name@example.com')}
          <div class="bk-field" data-fd="phone"><label for="bk_phone">Mobile</label><div class="bk-phone"><select id="bk_dial" aria-label="Dialling code">${DIAL.map(([c, l]) => `<option value="${c}" ${c === (S.d.dial || '+44') ? 'selected' : ''}>${l}</option>`).join('')}</select><input id="bk_phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="7700 900123" value="${esc(S.d.phoneNum != null ? S.d.phoneNum : S.d.phone || '')}"></div><span class="err">Please check your mobile number, e.g. 7700 900123</span></div>
          ${L.cfg && L.cfg.sms && L.cfg.sms.on ? `<div class="bk-field"><label>How should we keep you updated?</label><div class="seg-pick">${[['email', 'Email'], ['sms', 'Text message'], ['both', 'Both']].map(([k, t]) => `<button type="button" class="${(S.notify || 'email') === k ? 'on' : ''}" data-notify="${k}">${t}</button>`).join('')}</div><small class="cal-note">Booking confirmation, reminders and any changes. We’ll always email your receipt.</small></div>` : ''}
          <div class="bk-field"><label for="bk_notes">Dietary needs, celebrations or anything else <span class="opt">optional</span></label><textarea id="bk_notes" rows="2" placeholder="e.g. one vegan, a birthday">${esc(S.d.notes)}</textarea></div>
        </div>
        <div class="det-card soft"><div class="bk-group" style="margin-top:0">Before you book</div>
          <p class="det-pol">${pol}</p>
          ${S.p === 'house' ? '<p class="det-pol">Up to 16 guests. No parties or events, no pets (working animals welcome), no smoking or vaping indoors and no candles.</p>' : ''}
          <p class="det-pol">Each guest completes a short consultation form before treatments. Our therapists are trained in pregnancy massage.</p>
          <label class="check" data-ck="adult"><input type="checkbox" id="bkAdult" ${S.adult ? 'checked' : ''}> ${ageLine}</label>
          <label class="check" data-ck="agree"><input type="checkbox" id="bkAgree" ${S.agree ? 'checked' : ''}> <span>I agree to the <a href="terms.html" target="_blank" rel="noopener">terms &amp; conditions</a>.</span></label>
          <label class="check"><input type="checkbox" id="bkMkt" ${S.mkt ? 'checked' : ''}> Send me news and offers (optional).</label>
        </div>
      </div>`;
  }

  function payView(){
    const p = P[S.p], pr = price();
    if (p.kind === 'ask') return `<h2>Send your <em>request</em></h2><p class="bk-sub">Check the details, then send. We’ll reply with availability and a price. Nothing is charged now.</p>${reviewList()}
      <div class="notice">${POLICY.ask}</div>`;
    return `<h2>Review &amp; <em>pay</em></h2><p class="bk-sub">Please check your booking in the summary before paying.</p><div class="pay-grid pay-two">
      <div class="pay-col">${codeBox(pr)}
      ${pr.bal ? `<div class="notice"><b>Paying ${gbp(pr.now)} today</b> (50% deposit). The balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}. A £500 damage deposit will be pre-authorised before arrival.</div>`
        : S.p === 'house' ? `<div class="notice"><b>Paying in full today</b> because your stay is within 6 weeks. A £500 damage deposit will be pre-authorised before arrival.</div>` : ''}
      </div>
      ${!pr.now ? `<div class="notice vc-covers"><b>Nothing to pay today.</b> Your gift voucher covers ${pr.bal ? 'today’s deposit' : 'the full price'}${pr.voucherLeft > 0 ? `, and ${gbp(pr.voucherLeft)} stays on it for next time` : ''}.${pr.bal ? ` The balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}.` : ''}</div>` : `<div class="stripe">
        <div class="stripe-top"><span class="stripe-test">Test mode</span><span>Powered by <b>stripe</b></span></div>
        <!-- CONNECT: replace this mock with the real Stripe Payment Element (stripe.elements({ clientSecret }).create('payment')).
             Card details then go straight to Stripe and never touch this page. Klarna is enabled in the Stripe dashboard. -->
        <div class="pm-tabs" role="tablist">
          <button class="pm ${S.pm === 'card' ? 'sel' : ''}" data-pm="card" role="tab"><svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1" y="1" width="22" height="14" rx="2.5"/><path d="M1 5.5h22M5 11h4"/></svg>Card</button>
          <button class="pm ${S.pm === 'klarna' ? 'sel' : ''}" data-pm="klarna" role="tab"><span class="klarna-logo">Klarna.</span>Pay in 3</button>
        </div>
        ${S.pm === 'klarna' ? `
        <div class="klarna-box">
          <p><b>Pay in 3 interest-free instalments</b></p>
          <div class="k-plan">${[0, 1, 2].map(i => `<div><i class="${i === 0 ? 'now' : ''}"></i><b>${gbp(i < 2 ? Math.floor(pr.now / 3 * 100) / 100 : Math.round((pr.now - 2 * Math.floor(pr.now / 3 * 100) / 100) * 100) / 100)}</b><small>${i === 0 ? 'Today' : 'In ' + (i * 30) + ' days'}</small></div>`).join('')}</div>
          <p class="k-small">You’ll be taken to Klarna to confirm. No interest or fees when you pay on time. Subject to Klarna’s approval.</p>
        </div>` : `
        <div class="card-form">
          <label>Card number<input value="4242 4242 4242 4242" readonly tabindex="-1"><span class="brands"><i>VISA</i><i>MC</i><i>AMEX</i></span></label>
          <div class="cf-2"><label>Expiry<input value="12 / 34" readonly tabindex="-1"></label><label>CVC<input value="123" readonly tabindex="-1"></label></div>
          <div class="cf-2"><label>Country<input value="United Kingdom" readonly tabindex="-1"></label><label>Postcode<input value="NN29 7NN" readonly tabindex="-1"></label></div>
          <p class="k-small">Test mode: this uses Stripe’s test card, so you can’t enter a real card and nothing is charged.</p>
        </div>`}
        <div class="lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Payments are encrypted and processed securely by Stripe.</div>
      </div>`}</div>
`;
  }

  // the last check before paying: everything chosen, guest by guest (user 2026-11-27)
  // discount code + gift voucher: one discount code per booking; a gift voucher can go alongside it (user 2026-11-27)
  function codeBox(pr){
    const off = S.promo && !pr.codeBeaten, pct = Math.round(HEAD_OFF * 100);
    const chips = [
      S.promo && `<div class="vc-chip ${pr.codeBeaten ? 'muted' : ''}"><span><b>${esc(S.promo.code)}</b> ${pr.codeBeaten ? `isn’t used: only one discount per booking, and your head spa ${pct}% off saves you more` : `applied · ${S.promo.type === 'pct' ? S.promo.value + '% off' : gbp(S.promo.value) + ' off'}${pr.promo ? ` (−${gbp(pr.promo)})` : ''}`}</span><button type="button" class="vc-rm" data-vrm="promo">Remove</button></div>`,
      S.voucher && `<div class="vc-chip"><span>Gift voucher <b>${esc(S.voucher.code)}</b> ${S.voucher.balance == null ? 'added · we’ll check it and take it off your balance before your visit' : `· ${gbp(S.voucher.balance)} on it · using ${gbp(pr.voucher)}${pr.voucherLeft > 0 ? `, ${gbp(pr.voucherLeft)} left for next time` : ''}`}</span><button type="button" class="vc-rm" data-vrm="voucher">Remove</button></div>`].filter(Boolean).join('');
    const need = !S.promo && !S.voucher ? 'Discount code or gift voucher' : !S.voucher ? 'Gift voucher' : !S.promo ? 'Discount code' : '';
    const note = S.promoMsg ? esc(S.promoMsg) : !S.promo && !S.voucher ? `One discount code per booking. Gift vouchers are valid for 12 months and can be used with a code.` : '';
    return `<div class="vcode vbar${need ? '' : ' done'}">${need ? `<label for="bkVoucher">${need}</label><div class="vc-row"><input id="bkVoucher" placeholder="Enter code" maxlength="40" autocomplete="off"><button class="pill" id="bkVApply">Apply</button></div>` : ''}${chips ? `<div class="vc-chips">${chips}</div>` : ''}${note ? `<p class="cal-note">${note}</p>` : ''}</div>`;
  }
  function reviewList(){
    const p = P[S.p], d = S.d, multi = S.guests > 1, pr = price();
    const when = p.rule ? `${nice(S.date)} – ${nice(endDate(), { year:'numeric' })} (${S.nights} night${S.nights > 1 ? 's' : ''})<br><small>${stayTimes(S.p, S.date, S.nights).map(([a, b]) => a + ' ' + b).join(' · ')}</small>` : `${nice(S.date, { year:'numeric' })} · ${sesLabel()}`;
    const top = [['Booking', esc(p.name)], ['When', when], ['Guests', String(S.guests)], S.bfast && p.bfast && ['Breakfast', `Continental, ${S.nights} morning${S.nights > 1 ? 's' : ''}`], S.blue && ['Blue Light Card', 'Longer included treatments'], S.promo && S.promo.code && ['Discount code', esc(S.promo.code)]].filter(Boolean);
    const items = (YE && L.cfg && S.plan) || [], roomName = id => esc((((L.cfg || {}).treatRooms || []).find(r => r.id === id) || {}).name || '');
    const bed = id => { const r = ((L.cfg || {}).rooms || []).find(x => x.id === id); return r ? esc(r.name) : ''; };
    const line = (it, extra) => { const nm = YE ? YE.itemName(L.cfg, it) : (TRi[it.tid] || {}).name, mate = it.pair ? items.find(o => o !== it && o.pair === it.pair) : null;
      return `<li><div><b>${esc(nm)}</b>${extra ? ` <span class="rv-tag">${extra}</span>` : ''}<small>${it.date && p.rule ? fdShort(it.date) + ', ' : ''}${it.start} · ${it.min} min${roomName(it.troom) ? ' · ' + roomName(it.troom) : ''}</small>${mate ? `<small class="rv-pair">Together with ${esc(gName(mate.guest))}, same room, each with your own therapist</small>` : ''}</div></li>`; };
    const guestBox = i => { const mine = items.filter(it => it.guest === i).sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.start.localeCompare(b.start)), pk = S.picks[i] || {};
      const charge = id => { const c = chargeOf(i, id); return c ? c.price : (TRi[id] || {}).price || 0; };
      const extras = (S.adds[i] || []).filter(id => !mine.some(it => (it.with || []).includes(id)));
      const rows = [
        ...mine.map(it => { const inc = /-inc/.test(it.key), ext = (it.with || []).length; return line(it, inc ? (ext ? `included 20 min + extension ${gbp(charge(it.with[0]))}` : 'included') : gbp(charge(it.tid))); }),
        ...(!mine.length ? extras.map(id => `<li><div><b>${esc((TRi[id] || {}).name)}</b> <span class="rv-tag">${gbp(charge(id))}</span></div></li>`) : [])
      ];
      const facts = [p.food && pk.food && ['Food', esc(pk.food)], p.rule && (S.roomOf || [])[i] && ['Bedroom', bed(S.roomOf[i])]].filter(Boolean);
      return `<div class="rv-guest"><div class="rv-gh"><b>${esc(gName(i))}</b>${multi && i === 0 ? '<span>Lead guest</span>' : ''}</div>
        ${rows.length ? `<ul class="rv-tr">${rows.join('')}</ul>` : '<p class="small muted">No treatments</p>'}
        ${facts.length ? `<dl class="rv-facts">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>` : ''}</div>`; };
    const plines = pr ? [...(pr.lines && pr.lines.length ? pr.lines.map(l => [esc(l.label.replace(/ · (\d+) × £(\d+)/, (m, a, b) => ` · ${a} × ${gbp(+b)}`)), l.amount]) : [[S.p === 'house' ? `Whole house · ${S.nights} night${S.nights > 1 ? 's' : ''}` : `${p.name} · ${S.guests} × ${gbp(pr.base / S.guests)}`, pr.base]]), pr.bf && ['Breakfast', pr.bf], pr.tc.sub && ['Extra treatments', pr.tc.sub], pr.tc.off && ['Head spa discount', -pr.tc.off], pr.group && [`Group discount (${pr.groupPct}% off)`, -pr.group], pr.promo && ['Discount code', -pr.promo]].filter(x => x && x[1]) : [];
    const money = pr ? `<ul class="sum rv-money">${plines.map(([l, v]) => `<li><span>${l}</span><b>${v < 0 ? '−' : ''}${gbp(Math.abs(v))}</b></li>`).join('')}<li class="rv-total"><span>Total</span><b>${gbp(pr.total)}</b></li>${pr.voucher ? `<li><span>Gift voucher ${esc(S.voucher.code)}</span><b>−${gbp(pr.voucher)}</b></li>` : ''}${pr.now !== pr.total ? `<li><span>Paying today</span><b>${gbp(pr.now)}</b></li>` : ''}</ul>` : '';
    return `<div class="pay review">
      <ul class="sum" style="color:var(--ink)">${top.map(([a, b]) => `<li><span style="color:var(--muted)">${a}</span><b>${b}</b></li>`).join('')}</ul>
      <div class="bk-group">${multi ? 'Each guest' : 'Your treatments'}</div><div class="rv-guests">${Array.from({ length: S.guests }, (_, i) => guestBox(i)).join('')}</div>
      ${money ? `<div class="bk-group">Price</div>${money}` : ''}
      <div class="bk-group">Your details</div><ul class="sum" style="color:var(--ink)">${[['Name', esc(d.first + ' ' + d.last)], ['Email', esc(d.email)], ['Phone', esc(d.phone)], L.cfg && L.cfg.sms && L.cfg.sms.on && ['Updates by', { email: 'Email', sms: 'Text message', both: 'Email and text' }[S.notify || 'email']], d.notes && ['Notes', esc(d.notes)]].filter(Boolean).map(([a, b]) => `<li><span style="color:var(--muted)">${a}</span><b>${b}</b></li>`).join('')}</ul>
      <button type="button" class="bk-backlink" data-gostep="${CHOICES}">Change treatments or times</button></div>`;
  }

  function doneView(){
    const p = P[S.p], ask = p.kind === 'ask', pr = price();
    return `<div class="done-ico"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg></div>
      <h2>${ask ? (S.ticket ? 'Request <em>sent</em>' : 'Request <em>not sent</em>') : 'You’re <em>booked</em>'}, ${esc(S.d.first)}</h2>
      <p class="bk-sub">${ask ? 'Your reference is below.' : `${S.paid && S.paid.voucher ? `${gbp(S.paid.voucher.amount)} taken from gift voucher ${esc(S.paid.voucher.code)}${S.paid.voucher.left > 0 ? ` (${gbp(S.paid.voucher.left)} left on it for next time)` : ''}. ` : ''}${S.paid && !S.paid.amount ? '' : S.paid ? (S.paid.method === 'klarna' ? `First Klarna payment of ${gbp(Math.floor(S.paid.amount / 3 * 100) / 100)} taken, 2 more to follow. ` : `${gbp(S.paid.amount)} paid by card. `) : ''}We’ve emailed your confirmation to ${esc(S.d.email)}.<br><span style="font-size:13px">Stripe test payment ${S.paid ? S.paid.id : ''} · no money was taken.</span>`}</p>
      <div class="ref">${S.ref}</div>
      ${S.plan && S.plan.length ? `<div class="pay" style="margin:14px auto;max-width:460px;text-align:left"><div class="bk-group" style="margin-top:0">Your treatment times</div><p>${timesList(S.plan)}</p>${P[S.p].kind === 'treat' && YE && L.cfg ? (() => { const first = S.plan.filter(i => i.start && (!i.date || i.date === iso(S.date))).map(i => i.start).sort()[0]; if (!first) return ''; const m = YE.arriveBefore(L.cfg), t = YE.T(first) - m; return `<p><b>Please arrive by ${YE.HM(Math.max(0, t))}</b>, ${m} minutes before your first treatment, for your consultation and to change.</p>`; })() : ''}<p class="cal-note">Set by our booking system around your ${P[S.p].rule ? 'stay' : 'visit'}. We’ll email these too.</p></div>` : ''}
      <ol class="next">${ask
        ? (S.ticket ? `<li>Your request is with the team (reference ${esc(S.ticket.id)}).</li><li>We’ll check the date and reply with a price, by email.</li><li>Confirm and pay to secure your booking.</li>` : `<li>We couldn’t send your request just now${S.sendErr ? ' (' + esc(S.sendErr) + ')' : ''}. Please call us on 01933 580 100 and quote ${esc(S.ref)}.</li>`)
        : `<li>Look out for your confirmation email with session times and directions.</li><li>${p.treat || treatCost().n ? 'Complete the short consultation form for each guest before your visit.' : 'Bring your swimwear; towels and robes are waiting for you.'}</li>${pr && pr.bal ? `<li>Your balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}.</li>` : ''}<li>${p.rule ? (stayTimes(S.p, S.date, S.nights)[0] || ['Check-in', ''])[0] + ' ' + (stayTimes(S.p, S.date, S.nights)[0] || ['', 'from 16:00'])[1] + ' on ' + nice(S.date) + '.' : 'Arrive a few minutes before your session (' + sesLabel() + ') on ' + nice(S.date) + '.'}</li>`}</ol>
      <div class="hero-cta">${ask && S.ticket ? `<a class="btn btn-solid" href="ticket.html?t=${S.ticket.id}&k=${S.ticket.k}">See your request <span class="arrow">&rarr;</span></a>` : ''}<button class="btn btn-ghost" data-close>Back to the site</button></div>`;
  }

  // ---------- validation ----------
  function problem(){
    const p = P[S.p];
    if (S.step === 0) return !S.cat ? 'Choose what you’d like to book' : S.p && P[S.p].group === S.cat ? '' : 'Choose an option';
    if (S.step === DATE){ if (!S.date) return p.rule ? 'Choose your arrival day' : 'Choose a day'; if (exclOn() && !exOK(S.date)) return 'Exclusive use isn’t available on this day: choose another day, or carry on without it'; if (p.rule === 'range' && !S.end) return 'Choose your check-out day'; if (p.sessions && !p.only && lens().length > 1 && !S.len) return 'Choose half day or full day'; if (p.sessions && !p.only && !S.session) return S.len === 'half' ? 'Choose morning or afternoon' : 'Choose a session'; }
    if (S.step === GUESTS) { S.gOK = true; const bad = []; for (let i = 0; i < S.guests; i++) if (((S.names || [])[i] || '').trim().length < 2) bad.push('g' + i); if (bad.length) return { bad }; }
    if (S.step === ROOMS && needRooms()) { const miss = Array.from({ length: S.guests }, (_, i) => i).filter(i => !(S.roomOf || [])[i]); if (miss.length) return `Choose a room for ${gName(miss[0])}`; }
    if (S.step === CHOICES && P[S.p].only && !S.adds[S.tg].length) return 'Choose at least one treatment for this guest';
    if (S.step === CHOICES && YE && L.cfg) { const miss = siteNeeds().filter(x => x.guest === S.tg && !x.start); if (miss.length) return 'Choose a time for ' + YE.itemName(L.cfg, miss[0]); }
    if (S.step === CHOICES && S.tg >= S.guests - 1 && YE && L.cfg) { const miss = siteNeeds().find(x => !x.start); if (miss) { return `Choose a time for ${gName(miss.guest)}’s ${YE.itemName(L.cfg, miss)}`; } }
    if (S.step === CHOICES && S.tg >= S.guests - 1 && YE && L.cfg) {
      const r = planNow(); if (r && !r.ok) return `Sorry, we can’t fit ${r.fail && r.fail.name ? r.fail.name : 'all the treatments'} in on this ${P[S.p].rule ? 'stay' : 'day'}. Try fewer treatments or another ${P[S.p].rule ? 'date' : 'session'}.`;
    }
    if (S.step === DATE && S.session && YE && L.cfg && !P[S.p].only) { const l = YE.sessions(L.cfg, L.ix, S.p, iso(S.date), S.guests, { exclusive: exclOn() }).find(x => x.name === S.session); if (l && !l.ok) return S.session + ': ' + l.why; }
    if (S.step === DETAILS){
      const d = S.d, bad = [];
      if (!(d.first || '').trim()) bad.push('first'); if (!(d.last || '').trim()) bad.push('last');
      if (!(window.YCValidEmail ? window.YCValidEmail(d.email) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || ''))) bad.push('email');
      { const n = String(d.phoneNum != null ? d.phoneNum : d.phone || '').trim().replace(/^0+(?=\d)/, ''), dg = n.replace(/\D/g, ''); if (dg.length < 7 || dg.length > 12 || !/^[\d\s()-]+$/.test(n)) bad.push('phone'); }

      if (bad.length) return { bad };
      if (!S.adult) return { ck:'adult' }; if (!S.agree) return { ck:'agree' };
    }
    return '';
  }

  function navView(){
    if (S.ref){ nav.innerHTML = '<span></span><button class="bk-close">Close</button>'; $('.bk-close', nav).onclick = close; return; }
    const last = S.step === LAST, ask = S.p && P[S.p].kind === 'ask', pr = price();
    const label = last ? (ask ? 'Send request' : !pr.now ? 'Confirm booking' : S.pm === 'klarna' ? 'Continue with Klarna' : `Pay ${gbp(pr.now)}`) : S.step === CHOICES && S.tg < S.guests - 1 ? `Next: ${esc(gName(S.tg + 1).split(' ')[0])}` : 'Continue';
    nav.innerHTML = `<span class="bk-msg"></span>${PAGE ? '' : '<button class="bk-close" title="Your choices are saved">Close</button>'}${S.step ? '<button class="back">← Back</button>' : ''}<button class="btn btn-solid go">${S.paying ? '<span class="spin"></span> ' + (S.pm === 'klarna' && !ask ? 'Opening Klarna…' : 'Processing…') : label + ' <span class="arrow">→</span>'}</button>`;
  }

  function sideWire(){ const x = $('.side-x', side); if (x) x.onclick = close; side.querySelectorAll('[data-sgoto]').forEach(b => b.onclick = () => { S.step = +b.dataset.sgoto; draw(); }); }
  function sideView(){
    const p = P[S.p], pr = price(), est = estimate();
    if (!p){ side.innerHTML = `<div class="side-top"><div class="eyebrow">Your booking</div><button class="side-x" aria-label="Close booking">&times;</button></div><h3>Nothing chosen yet</h3><p class="sum-empty">Pick a spa day, a stay or a treatment to see your total here.</p><p class="foot-note">Questions? Call 01933 580 100 or message us on WhatsApp.</p>`; return; }
    const tc = treatCost(), g = S.gOK;
    const cg = S.guests, u1 = pr && pr.lines && pr.lines[0] ? pr.lines[0].amount / cg : null, ln = k => pr && pr.lines && pr.lines.find(l => l.k === k);
    const unit = S.p === 'house' ? `${gbp(p.night)} × ${S.nights} nights` : u1 != null ? `${gbp(u1)} × ${cg}` : p.priceN ? `${gbp(p.priceN[S.nights])} × ${S.guests}` : `${gbp(p.price)} × ${S.guests}`;
    const rows = [['Booking', p.name],
      S.date && ['Date', p.rule ? `${nice(S.date)}${endDate() ? ' → ' + nice(endDate()) : ''}` : nice(S.date)],
      S.session && ['Session', sesLabel()],
      g && ['Guests', S.guests],
      ...(S.date && p.rule && S.p !== 'house' || (S.p === 'house' && S.end) ? stayTimes(S.p, S.date, S.nights).filter(Boolean).map(([a, b]) => [`<span class="sum-sub">${a}</span>`, `<span class="sum-sub">${b}</span>`]) : []),
      pr && !p.only && (S.p === 'house' ? S.end && S.nights : g) && ['Price', unit],
      ln('excl') && ['Just for you', '+' + gbp(ln('excl').amount)],
      pr && pr.group && [`Group discount`, `−${gbp(pr.group)} (${pr.groupPct}% off)`],
      ln('single') && ['Room to themselves', gbp(ln('single').amount)],
      pr && pr.bf && ['Breakfast', gbp(pr.bf)],
      ...(S.step >= CHOICES ? Array.from({ length: S.guests }, (_, gi) => { const pk = S.picks[gi] || {}, il = incList(S.p) || [];
        const inc = incMode(S.p) === 'treat' ? (pk.treat || (il[0] || {}).name) : incMode(S.p) ? (il[0] || {}).name : null, food = p.food ? pk.food : null;
        if (!inc && !food) return null;
        const tn = (YE && L.cfg && S.date) ? siteNeeds().find(x => x.guest === gi && x.included) : null, tt = tn && tn.start ? ` · ${p.rule && tn.date ? fdShort(tn.date) + ' ' : ''}${tn.start}` : '';
        return [`${inc ? esc(tn && (tn.with || []).length ? YE.itemName(L.cfg, tn) : blueName(inc)) : esc(food)}<small class="sum-who">${tt ? '<b class="sum-time">' + tt.slice(3) + '</b> · ' : ''}${S.guests > 1 ? esc(gName(gi)) + (inc && food ? ' · ' : '') : ''}${inc && food ? esc(food) : ''}</small>`, 'Included']; }) : []),
      ...S.adds.flatMap((a, gi) => a.map(id => { const t = TRi[id]; if (!t) return null; const head = t.head && !P[S.p].only && !codeWins(), c = chargeOf(gi, id), price = c ? c.price : t.price; const xn = (YE && L.cfg && S.date) ? siteNeeds().find(x => x.guest === gi && (x.tid === id || (x.with || []).includes(id))) : null, xt = xn && xn.start ? `<b class="sum-time">${p.rule && xn.date ? fdShort(xn.date) + ' ' : ''}${xn.start}</b>` : '';
        return [`${esc(t.name)}${c && c.extends && c.mins < t.min ? ` <small class="sum-who">${c.mins} min added to the included treatment</small>` : ''}${S.guests > 1 || xt ? `<small class="sum-who">${xt}${xt && S.guests > 1 ? ' · ' : ''}${S.guests > 1 ? esc(gName(gi)) : ''}</small>` : ''}`, head ? `<s>${gbp(price)}</s> ${gbp(price * (1 - HEAD_OFF))}` : gbp(price)]; })), pr && pr.promo && ['Code ' + esc(S.promo.code), '−' + gbp(pr.promo)]].filter(Boolean);
    const ready = pr && (S.p === 'house' ? S.nights >= 2 : g || p.only);
    const tot = p.kind === 'ask'
      ? `<div class="big"><span>${g ? 'Estimate' : 'From'}</span><b>${g ? gbp(est) : gbp(p.est)}</b></div><p>${g ? 'We’ll confirm the exact price.' : 'per person'} Nothing to pay now.</p>`
      : ready ? `<div class="big"><span>Total</span><b>${gbp(pr.total)}</b></div>${pr.voucher ? `<p>Gift voucher −${gbp(pr.voucher)}${pr.voucherLeft > 0 ? ` (${gbp(pr.voucherLeft)} left on it)` : ''}. ${pr.now ? `${gbp(pr.now)} to pay today` : 'Nothing to pay today'}${pr.bal ? `, ${gbp(pr.bal)} by ${nice(pr.balDue)}` : ''}.</p>` : pr.bal ? `<p>${gbp(pr.now)} deposit today, ${gbp(pr.bal)} by ${nice(pr.balDue)}.</p>` : '<p>Paid in full today. VAT included.</p>'}`
      : `<div class="big"><span>From</span><b>${p.from.replace(/^from /, '').split(' ')[0]}</b></div><p>${p.from.replace(/^from /, '').split(' ').slice(1).join(' ')}. Your total appears once you choose ${S.p === 'house' ? 'your dates' : 'your guests'}.</p>`;
    side.innerHTML = `<div class="side-top"><div class="eyebrow">Your booking</div><button class="side-x" aria-label="Close booking" title="Close (your choices are saved)">&times;</button></div><h3>${p.name}</h3><ul class="sum">${rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>
      <div class="sum-tot">${tot}<button class="sum-toggle">Details</button></div>
      <p class="sum-pol">${{ house:'50% deposit. Move your dates with 6+ months’ notice.', break:'Refundable with 30+ days’ notice.', break2:'Refundable with 30+ days’ notice.', group:'Refundable with 30+ days’ notice.' }[S.p] || (p.only ? 'Pay today. Move your appointment with 30+ days’ notice.' : 'Non-refundable, but you can move your visit with 30+ days’ notice.')}</p>
      <p class="foot-note">Questions? Call 01933 580 100 or message us on WhatsApp.${S.p && !S.ref ? '<br><button class="bk-reset" title="Clear everything and start again">Start again</button>' : ''}</p>`;
    const t = $('.sum-toggle', side); if (t) t.onclick = () => side.classList.toggle('full');
  }

  // ---------- events ----------
  function wire(){
    body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
      const g = b.dataset.cat || null, opts = Object.keys(P).filter(k => P[k].group === g);
      if (g && opts.length === 1 && opts[0] !== S.p){ const pend = S.pending; reset(opts[0]); S.pending = pend; syncAdds(); }
      S.cat = g; S.step = 0; draw(); const o = $('#bkOpts', body); if (o) setTimeout(() => o.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); });
    body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; if (k !== S.p){ const pend = S.pending, cat = S.cat; reset(k); S.pending = pend; S.cat = cat; syncAdds(); } S.cat = P[k].group; S.step = 0; const y = scrollY, bt = body.scrollTop; draw(); body.scrollTop = bt; scrollTo({ top: y }); requestAnimationFrame(() => scrollTo({ top: y })); });
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + +b.dataset.m, 1); draw(); });
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [y, m, d] = b.dataset.d.split('-').map(Number); const D = new Date(y, m - 1, d);
      if (S.p === 'house'){
        if (!S.date || S.end || D <= S.date){ S.date = D; S.end = null; S.nights = 0; resetAfter(); }
        else { const n = Math.round((D - S.date) / 864e5); if (n < 2 || (YE && L.cfg && YE.houseNightsOK && !YE.houseNightsOK(L.cfg, iso(S.date), n))){ $('.bk-msg', nav).textContent = YE && L.cfg && YE.houseRule ? YE.houseRule(L.cfg) : 'The whole house has a 2-night minimum'; return; } if (n > 30){ $('.bk-msg', nav).textContent = 'Stays are up to 30 nights'; return; }
          if (YE && L.cfg){ const c = YE.dateCheck(L.cfg, L.ix, { product: 'house', date: iso(S.date), nights: n, guests: S.guests }); if (!c.ok){ $('.bk-msg', nav).textContent = 'Those dates aren’t all free: ' + c.why; return; } }
          S.end = D; S.nights = n; }
      } else { if (!S.date || +S.date !== +D) resetAfter(); S.date = D; }
      draw(); });
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { if (S.session !== b.dataset.s) resetAfter(); S.session = b.dataset.s; draw(); });
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (S.nights !== +b.dataset.n) resetAfter(); S.nights = +b.dataset.n; if (S.date && !dateOK(S.p, S.date)) S.date = null; draw(); });
    body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const p = P[S.p]; S.guests = Math.min(p.max, Math.max(gMin(), S.guests + +b.dataset.g)); S.gOK = true; if (S.guests >= (p.exFrom || 99)) S.excl = false; if (S.date && !dateOK(S.p, S.date)){ S.date = null; S.end = null; } draw(); });
    const bf = $('#bkBf', body); if (bf) bf.onchange = () => { S.bfast = bf.checked; draw(); };
    const nx = $('[data-noexcl]', body); if (nx) nx.onclick = () => { S.excl = false; S.session = null; resetAfter(); draw(); };
    const ex = $('#bkExcl', body); if (ex) ex.onchange = () => { S.excl = ex.checked; S.session = null; resetAfter(); if (S.date && !dateOK(S.p, S.date)) { S.date = null; S.end = null; } draw(); };
    body.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { if (S.len !== b.dataset.len) { resetAfter(); S.session = null; } S.len = b.dataset.len;
      const one = (P[S.p].sessions || []).filter(x => (x[3] || 'half') === S.len); if (one.length === 1) S.session = one[0][0]; draw(); });
    body.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { S.picks[+b.dataset.pk][b.dataset.f] = b.dataset.v; if (b.dataset.f === 'treat' && S.times) Object.keys(S.times).filter(k => k.startsWith(`g${b.dataset.pk}-inc`)).forEach(k => delete S.times[k]); draw(); });
    body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const gi = +b.dataset.gi, g = S.adds[gi], id = b.dataset.add, i = g.indexOf(id);
      if (i >= 0) { g.splice(i, 1); if (S.times) { const keep = {}; g.forEach((x, j) => { const old = S.times[`g${gi}-x${j + (j >= i ? 1 : 0)}`]; if (old) keep[`g${gi}-x${j}`] = old; }); Object.keys(S.times).filter(k => k.startsWith(`g${gi}-x`)).forEach(k => delete S.times[k]); Object.assign(S.times, keep); } }
      else if (g.length < maxExtras()) g.push(id); draw(); });
    body.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { S.pm = b.dataset.pm; draw(); });
    body.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => { const [k, w] = b.dataset.pair.split('|'); S.pairNote = null;
      const test = { ...engineBooking(), pairs: { ...(S.pairs || {}), [k]: w } }, tm = { ...(test.times || {}) }; delete tm[k]; test.times = tm;
      const r = YE.plan(L.cfg, L.ix, test, { needs: YE.treatmentNeeds(L.cfg, test) });
      if (!r.ok) { S.pairNote = { key: k, text: (S.times || {})[w] ? `Sorry, there isn’t a room and two therapists free together at ${S.times[w].start}. Try another time for ${gName((siteNeeds().find(x => x.key === w) || {}).guest)} or have it on your own.` : 'Sorry, there’s no time when you can both be treated together in this session.' }; draw(); return; }
      S.pairs = { ...(S.pairs || {}), [k]: w }; delete S.times[k]; draw(); });
    body.querySelectorAll('[data-unpair]').forEach(b => b.onclick = () => { delete S.pairs[b.dataset.unpair]; draw(); });
    body.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { const [k, d, t] = b.dataset.tp.split('|'); S.times = S.times || {}; S.times[k] = { date: d, start: t }; draw(); });
    body.querySelectorAll('[data-tpd]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.tpd.split('|'); S.tpDate = S.tpDate || {}; S.tpDate[k] = d; draw(); });
    body.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { (S.seen = S.seen || {})[S.tg] = 1; S.tg = +b.dataset.gt; draw(); });
    body.querySelectorAll('[data-notify]').forEach(b => b.onclick = () => { S.notify = b.dataset.notify; body.querySelectorAll('[data-notify]').forEach(x => x.classList.toggle('on', x === b)); });
    { const pi = $('#bk_phone', body), pd = $('#bk_dial', body);
      const full = () => { const n = String(S.d.phoneNum || '').trim().replace(/^0+(?=\d)/, ''); S.d.phone = n ? `${S.d.dial || '+44'} ${n}` : ''; };
      if (pi) { pi.oninput = () => { S.d.phoneNum = pi.value; full(); pi.closest('.bk-field').classList.remove('bad'); }; pi.onblur = () => { const n = pi.value.trim().replace(/^0+(?=\d)/, ''); if (n !== pi.value) { pi.value = n; S.d.phoneNum = n; full(); } }; }
      if (pd) pd.onchange = () => { S.d.dial = pd.value; full(); }; }
    ['first','last','email','notes'].forEach(k => { const el = $('#bk_' + k, body); if (el) el.oninput = () => { S.d[k] = el.value; el.closest('.bk-field').classList.remove('bad');
      if ((k === 'first' || k === 'last') && !S.g0Own) { S.names = S.names || []; S.names[0] = `${S.d.first || ''} ${S.d.last || ''}`.trim(); const g0 = $('#bk_g0', body); if (g0) g0.value = S.names[0]; } }; });
    body.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { const [r, i] = b.dataset.rg.split('|'); S.roomOf = S.roomOf || []; S.roomOf[+i] = S.roomOf[+i] === r ? '' : r; draw(); });
    body.querySelectorAll('[id^="bk_g"]').forEach(el => { if (!/^bk_g\d+$/.test(el.id)) return; el.oninput = () => { const i = +el.id.slice(4); S.names = S.names || []; S.names[i] = el.value; if (i === 0) S.g0Own = true; el.closest('.bk-field').classList.remove('bad'); }; });
    [['#bkAdult','adult'],['#bkAgree','agree'],['#bkMkt','mkt']].forEach(([s, k]) => { const el = $(s, body); if (el) el.onchange = () => { S[k] = el.checked; el.closest('.check').classList.remove('bad'); }; });
    { const el = $('#bkBlue', body); if (el) el.onchange = () => { if (S.blue !== el.checked) { S.times = {}; S.pairs = {}; } S.blue = el.checked; draw(); }; }
    const c = body.querySelector('[data-close]'); if (c) c.onclick = close;
    const back = $('.back', nav); if (back) back.onclick = () => { if (S.step === CHOICES && S.tg > 0){ S.tg--; draw(); return; } S.step--; if (S.step === ROOMS && !needRooms()) S.step--; if (S.step === CHOICES) S.tg = S.guests - 1; draw(); };
    const go = $('.go', nav); if (go) go.onclick = next;
    const cl = $('.bk-close', nav); if (cl) cl.onclick = close;
    // start again: a second press confirms, so one stray tap doesn't lose the booking (user, 2026-11-26)
    const rs = $('.bk-reset', side); if (rs) rs.onclick = () => { if (!rs.dataset.sure) { rs.dataset.sure = '1'; rs.textContent = 'Sure? Clear it all'; rs.classList.add('sure'); setTimeout(() => { if (rs.isConnected) { delete rs.dataset.sure; rs.textContent = 'Start again'; rs.classList.remove('sure'); } }, 4000); return; }
      try { sessionStorage.removeItem(SKEY); } catch (e) {} if (S.hold && L.cfg && (L.cfg.consult || {}).endpoint) fetch(L.cfg.consult.endpoint.replace(/\/$/, '') + '/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hold: S.hold }) }).catch(() => {}); S.hold = null; reset(null); S.cat = null; S.promo = null; S.d = {}; S.names = []; S.roomOf = []; draw(); window.scrollTo({ top: 0 }); };
    const va = $('#bkVApply', body); if (va) va.onclick = async () => {
      const code = ($('#bkVoucher', body).value || '').trim(); if (!code) return;
      const pr = await findPromo(code);
      if (pr && S.promo) { S.promoMsg = `Only one discount code can be used per booking. Remove ${S.promo.code} first to use ${code.toUpperCase()} instead.`; draw(); return; }
      if (!pr && S.voucher) { S.promoMsg = 'One gift voucher can be added online. Tell us about any others in your booking notes and we’ll take them off your balance.'; draw(); return; }
      if (pr) { const why = YE.promoCheck(L.cfg, { ...pr, code }, engineBooking()); if (why) { S.promoMsg = why; S.promo = null; } else { S.promo = { code: code.toUpperCase(), type: pr.type, value: pr.value, on: pr.on }; S.promoMsg = '';
        const after = price(); if (after && after.codeBeaten) { S.promo = null; S.promoMsg = `Only one discount can be used per booking, and your head spa ${Math.round(HEAD_OFF * 100)}% off already saves you more, so we’ve kept that.`; }
        else if (after && after.promo && treatCost().off) S.promoMsg = `Only one discount can be used per booking, so this code replaces the head spa ${Math.round(HEAD_OFF * 100)}% off.`; } }
      else {
        const ep = L.cfg && (L.cfg.consult || {}).endpoint;
        if (ep) {
          va.disabled = true; va.textContent = 'Checking…';
          try { const r = await fetch(ep.replace(/\/$/, '') + '/voucher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }); const j = await r.json().catch(() => ({}));
            if (j.ok) { S.voucher = { code: j.code, balance: j.balance, expires: j.expires }; S.promoMsg = ''; } else S.promoMsg = j.why || j.error || 'We couldn’t check that code just now. Please try again.'; }
          catch (e) { S.promoMsg = 'We couldn’t check that code just now. Please try again.'; }
        } else { S.voucher = { code: code.toUpperCase(), balance: null }; S.promoMsg = /^YCV-/i.test(code) ? '' : 'We don’t recognise that discount code, so we’ll treat it as a gift voucher and check it before your visit.'; }
      }
      draw(); };
    const vin = $('#bkVoucher', body); if (vin) vin.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); va && va.click(); } };
    body.querySelectorAll('[data-vrm]').forEach(b => b.onclick = () => { if (b.dataset.vrm === 'promo') S.promo = null; else S.voucher = null; S.promoMsg = ''; draw(); });
    body.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { const k = b.dataset.alt; if (!P[k]) return; const pend = S.pending; reset(k); S.pending = pend; S.cat = P[k].group; syncAdds(); S.step = GUESTS; draw(); });
    body.querySelectorAll('[data-gq]').forEach(b => b.onclick = () => { S.guests = +b.dataset.gq; S.gOK = true; if (S.date && !dateOK(S.p, S.date)){ S.date = null; S.end = null; } draw(); });
  }

  function next(){
    if (S.paying) return;
    const pb = problem(), msg = $('.bk-msg', nav);
    if (pb){
      if (typeof pb === 'string'){ msg.textContent = pb; const o = $(S.cat ? '.bk-opts' : '.bk-types', body); if (o && S.step === 0){ o.classList.remove('nudge'); void o.offsetWidth; o.classList.add('nudge'); } return; }
      if (pb.bad){ pb.bad.forEach(k => $(`[data-fd="${k}"]`, body).classList.add('bad')); msg.textContent = 'Please check the highlighted fields'; $(`#bk_${pb.bad[0]}`, body).focus(); return; }
      if (pb.ck){ $(`[data-ck="${pb.ck}"]`, body).classList.add('bad'); msg.textContent = pb.ck === 'adult' ? 'Please confirm the age requirement' : 'Please agree to the terms to continue'; return; }
    }
    if (S.step === CHOICES && S.tg < S.guests - 1){ (S.seen = S.seen || {})[S.tg] = 1; S.tg++; draw(); return; }
    if (S.step === DATE) S.tg = 0;
    if (S.step === DETAILS && YE && L.cfg) { const r = planNow(); if (r && !r.ok) { msg.textContent = 'Those treatments no longer fit on that day. Please go back and choose another time.'; return; } }
    // the lead guest's name from the Guests step fills in their details (user 2026-11-27)
    if (S.step + 1 === DETAILS || (S.step < DETAILS && S.step + 1 > DETAILS)) { const nm = ((S.names || [])[0] || '').trim().split(/\s+/); S.d = S.d || {}; if (nm[0] && !S.d.first && !S.d.last) { S.d.first = nm[0]; S.d.last = nm.slice(1).join(' '); } }
    if (S.step < LAST){ S.step++; if (S.step === ROOMS && !needRooms()) { autoRooms(stayRooms()); S.step++; } draw(); return; }
    if (P[S.p].kind !== 'ask' && !S.holdOK) { holdThenPay(); return; }
    S.holdOK = false;
    // CONNECT: create the booking (server) -> Stripe PaymentIntent -> stripe.confirmPayment(); show the confirmation on success.
    // Test mode: simulate a successful Stripe payment. No request is sent anywhere.
    { const pr = price(); S.paid = pr ? { method: pr.now ? S.pm : 'voucher', amount: pr.now, id: 'pi_test_' + Math.random().toString(36).slice(2, 14), voucher: pr.voucher ? { code: S.voucher.code, amount: pr.voucher, left: pr.voucherLeft } : null } : null; }
    S.paying = true; navView();
    // an enquiry goes to the team as a support message (user, 2026-11-26), with a link for the guest to follow it
    if (P[S.p].kind === 'ask') {
      const p = P[S.p], ref = 'YC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const msg = [`Enquiry: ${p.name}`, p.rule ? `Arriving ${nice(S.date, { year: 'numeric' })}, ${S.nights} night${S.nights > 1 ? 's' : ''}` : `Date: ${nice(S.date, { year: 'numeric' })}${S.session ? ', ' + S.session : ''}`, `Guests: ${S.guests}${(S.names || []).filter(Boolean).length ? ' (' + S.names.filter(Boolean).join(', ') + ')' : ''}`, treatLines('; ', true) ? 'Treatments: ' + treatLines('; ', true) : '', S.d.notes ? 'Notes: ' + S.d.notes : '', `Website reference: ${ref}`].filter(Boolean).join('\n');
      (window.YCSupport ? window.YCSupport.send({ name: `${S.d.first} ${S.d.last}`.trim(), email: S.d.email, phone: S.d.phone, topic: 'Booking enquiry', ref, message: msg }) : Promise.reject(new Error('not available')))
        .then(t => { S.ticket = t; }).catch(e => { S.sendErr = e.message || 'Could not send'; })
        .finally(() => { S.paying = false; S.ref = ref; draw(); });
      return;
    }
    const ref = 'YC-' + Math.random().toString(36).slice(2, 8).toUpperCase(), ep = L.cfg && (L.cfg.consult || {}).endpoint;
    // payment went through: take the gift voucher amount off its balance (held for this booking since the hold)
    const redeem = S.paid && S.paid.voucher && S.hold && ep ? fetch(ep.replace(/\/$/, '') + '/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hold: S.hold, ref }) }).then(r => r.json()).then(j => { if (j.ok && S.paid.voucher) S.paid.voucher.left = j.balance; }).catch(() => {}) : Promise.resolve();
    Promise.all([redeem, new Promise(r => setTimeout(r, 1400))]).then(() => { S.paying = false; S.ref = ref; draw(); });
  }
  // just before paying, the receiver re-checks the times against every booking and anyone else paying right now, and holds
  // them for 30 minutes. If someone got there first, the guest goes back to choose again.
  async function holdThenPay(){
    const ep = L.cfg && (L.cfg.consult || {}).endpoint, msg = $('.bk-msg', nav);
    if (!ep) { S.holdOK = true; next(); return; }   // not switched on yet (test mode)
    S.paying = true; navView();
    try {
      const b = { ...engineBooking(), rooms: P[S.p].rule ? [...new Set((S.roomOf || []).filter(Boolean))] : [] };
      b.guestList = b.guestList.map(g => ({ included: g.included, food: g.food, extras: g.extras }));
      const pv = price(), voucher = pv && pv.voucher ? { code: S.voucher.code, amount: pv.voucher } : null;
      const r = await fetch(ep.replace(/\/$/, '') + '/hold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking: b, release: S.hold || null, voucher }) });
      const j = await r.json().catch(() => ({}));
      S.paying = false;
      if (r.ok && j.ok) { S.hold = j.hold; S.holdOK = true; next(); return; }
      if (j.voucher) { S.voucher = j.voucher.balance > 0 ? { ...S.voucher, balance: j.voucher.balance } : null; S.promoMsg = j.why; draw(); return; }
      if (j.gone) { await loadLive(); resetAfter(); S.step = DATE; S.goneMsg = (j.why || 'Someone has just booked that time') + '. Please choose again; nothing has been charged.'; draw(); return; }
      navView(); $('.bk-msg', nav).textContent = j.error || j.why || 'We couldn’t check availability just now. Please try again.';
    } catch (e) { S.paying = false; navView(); $('.bk-msg', nav).textContent = 'We couldn’t check availability just now. Please try again.'; }
  }
  loadLive();

  if (PAGE) {
    const q = new URLSearchParams(location.search), k = q.get('b'), tr = q.get('tr'), pr = q.get('promo');
    if (pr) findPromo(pr).then(x => { if (x) { S.promo = { code: pr.toUpperCase(), type: x.type, value: x.value, on: x.on }; draw(); } });
    open(k || undefined, tr || undefined);
    // a waitlist email's link: the date, guests (and nights) they asked for (user 2026-11-27)
    const qd = q.get('d'), qg = +q.get('g'), qn = +q.get('n');
    if (P[k] && /^\d{4}-\d\d-\d\d$/.test(qd || '')) {
      const [y, mo, da] = qd.split('-').map(Number), D = new Date(y, mo - 1, da);
      if (qg) { S.guests = Math.min(P[k].max || qg, Math.max(P[k].min || 1, qg)); S.gOK = true; }
      if (qn && P[k].rule) S.nights = qn;
      S.date = D; S.end = null; S.month = new Date(y, mo - 1, 1); S.step = DATE; draw();
    }
    if (k || tr) history.replaceState(null, '', 'book.html');   // a reload keeps the booking in progress instead of starting again
  }
})();
