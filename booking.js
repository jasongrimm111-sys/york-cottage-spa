/* ===== York Cottage checkout =====
   Prices, days and policies follow the current yorkcottagespa.com pages and terms.
   DEMO: there is no live availability or payment yet. Connect a booking system / Stripe at the
   two places marked CONNECT below. */
(() => {
  const P = {
    day:    { name:'Day Spa', group:'Spa', kind:'pay', price:100, per:'per person', from:'£100 per person', min:1, max:8, treat:true, food:true,
              sessions:[['Morning','09:30 – 13:30'],['Afternoon','13:00 – 17:00']],
              blurb:'4-hour session: 20-minute massage or facial, afternoon tea or grazing board, spa pool, sauna & lounge.' },
    access: { name:'Spa Access', group:'Spa', kind:'pay', price:50, per:'per person', from:'£50 per person', min:1, max:8,
              sessions:[['Morning','09:30 – 13:30'],['Afternoon','14:00 – 18:00'],['Evening','times confirmed when you book']],
              blurb:'4-hour session: hot tub, sauna and lounge with hot & cold refreshments, towel and robe.' },
    private:{ name:'Private Spa', group:'Spa', kind:'pay', price:100, per:'per person', from:'from £100 per person', min:4, max:16, treat:true, food:true, facial:'Luxury facial',
              sessions:[['Morning','time confirmed by email'],['Afternoon','time confirmed by email']],
              blurb:'The spa just for your group, with food, drinks and a 20-minute massage or luxury facial each. Minimum 4 guests (6 on Sundays, from 11:30).' },
    break:  { name:'1-Night Spa Break', group:'Stay', kind:'pay', priceN:{1:145}, per:'per person', from:'£145 per person', min:2, max:6, rule:'mid', nights:[1], bfast:true,
              blurb:'One night, from £145 per person based on 2 sharing. King ensuite room, grazing board, a 20-minute aromatherapy massage each and spa access. Sunday to Thursday.' },
    break2: { name:'2-Night Spa Break', group:'Stay', kind:'pay', priceN:{2:220}, per:'per person', from:'£220 per person', min:2, max:6, rule:'mid', nights:[2], bfast:true,
              blurb:'Two nights, from £220 per person based on 2 sharing. King ensuite room, grazing board, 20-minute aromatherapy massages and spa access. Arrive Sunday to Wednesday.' },
    group:  { name:'Group Spa Break', group:'Stay', kind:'pay', priceN:{1:145}, per:'per person', from:'from £145 per person', min:7, max:16, rule:'mid', nights:[1], food:true, foods:['Grazing board','Afternoon tea'], bfast:true,
              blurb:'7+ guests, Sunday to Thursday. Up to 8 rooms, the spa just for your group, a grazing board or afternoon tea and a 20-minute aromatherapy massage each.' },
    house:  { name:'Whole House & Spa', group:'House', kind:'pay', night:1840, per:'per night', from:'from £1,840 per night', min:1, max:16, rule:'range', minN:2, maxN:30,
              blurb:'Exclusive use of the house and spa for up to 16 guests: 8 bedrooms, kitchen, 2 living rooms, hot tub and sauna. 2-night minimum.' },
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
      L.ok = !!c; applyLive();
      if (box.classList.contains('on')) draw();
    } catch (e) { /* keep the built-in rules */ }
  }
  // Arrival, spa and food times from the stay pages
  function stayTimes(k, d, nights){
    if (YE && L.cfg && L.cfg.products[k] && L.cfg.products[k].times) {
      const t = YE.stayTimes(L.cfg, k, iso(d), nights), p = L.cfg.products[k];
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
      if (q.kind === 'session' || q.kind === 'private') p.sessions = c.sessions.filter(x => x.product === k && x.active !== false).map(x => [x.name, `${x.start} – ${x.end}`, x.id]);
      p.off = q.active === false || q.online === false;
    }
    const menu = c.treatments.filter(t => YE.sellable(t) && t.online !== false).map(t => ({ id: t.id, cat: t.cat, name: t.name, min: t.min, price: t.price, head: !!t.head, desc: t.desc || '' }));
    if (menu.length) { TR.length = 0; TR.push(...menu); TRi = Object.fromEntries(TR.map(t => [t.id, t])); }
    HEAD_OFF = (c.rules.headSpaOff || 10) / 100; BFAST = c.breakfastPrice || BFAST;
    banner();
  }
  // which session id a session name is (on the chosen day)
  const sesId = (k, name, d) => { const c = L.cfg; if (!c || !d) return null; const x = c.sessions.find(s => s.product === k && s.name === name && s.active !== false && (!s.days || s.days.includes(d.getDay()))); return x ? x.id : null; };
  // the booking as the engine sees it
  function engineBooking() {
    const c = L.cfg, p = c.products[S.p], d = S.date ? iso(S.date) : null;
    const inc = v => { const ids = YE.includedFor(c, S.p).map(t => t.id); if (!ids.length) return null; if (ids.includes(v)) return v; const byName = YE.includedFor(c, S.p).find(t => t.name === v); if (byName) return byName.id; const want = /facial/i.test(v || '') ? 'facial' : 'massage'; return ids.find(id => id.includes(want)) || ids[0]; };
    const food = v => { if (!v) return null; const f = c.foods.find(x => x.name === v) || c.foods.find(x => (/tea/i.test(v) && x.id === 'tea') || (/grazing/i.test(v) && x.id === 'grazing')); return f ? f.id : null; };
    return { id: 'web', product: S.p, date: d, nights: P[S.p].rule ? S.nights : 0, sessionId: sesId(S.p, S.session, S.date), guests: S.guests, blueLight: !!S.blue, treatStart: null, times: S.times || {},
      guestList: Array.from({ length: S.guests }, (_, i) => ({ name: ((S.names || [])[i] || '').trim(), room: (S.roomOf || [])[i] || null, included: incMode(S.p) === 'treat' ? inc((S.picks[i] || {}).treat) : null, food: P[S.p].food ? food((S.picks[i] || {}).food) : null, extras: (S.adds[i] || []).slice() })) };
  }
  // the engine sets every treatment time (spa days, stays, whole house); guests only choose a start time for treatments-only
  // answers are worked out once per redraw (picking a time redraws)
  let memo = {}; const memoKey = () => JSON.stringify([S.p, S.date && +S.date, S.session, S.nights, S.guests, S.adds, S.picks && S.picks.map(x => x.treat), S.times, S.blue]);
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
  function promoOff(pr) {
    if (!S.promo) return 0; const q = S.promo;
    const basis = q.on === 'all' ? pr.base + pr.bf + pr.tc.sub - pr.tc.off : q.on === 'treat' ? pr.tc.sub - pr.tc.off : pr.base;
    return Math.max(0, Math.min(basis, q.type === 'pct' ? Math.round(basis * q.value) / 100 : q.value));
  }
  // offer bar on every page, between the dates set in the admin
  function banner() {
    if (!YE || !L.cfg || document.querySelector('.offer-bar')) return;
    const list = YE.promoBanners(L.cfg); if (!list.length) return;
    const o = list[0], bar = document.createElement('div'); bar.className = 'offer-bar';
    bar.innerHTML = `<span>${esc(o.banner.text)}</span><button type="button" data-book="${(o.products || [])[0] || ''}" data-promo="${esc(o.show || '')}">Book now</button>`;
    const hd = document.querySelector('header'); if (hd) hd.prepend(bar); else document.body.prepend(bar);
    document.documentElement.classList.add('has-offer');
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
      const c = YE.dateCheck(L.cfg, L.ix, { product: k, date: iso(d), nights: n, guests: S.gOK ? S.guests : (P[k].min || 1) });
      if (!c.ok) return false;
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
    guests:k ? Math.max(P[k].min, k === 'group' ? 8 : k === 'treat' ? 1 : 2) : 2, gOK:false, treatStart:null, plan:null, times:{}, tpDate:{}, names:[], g0Own:false, roomOf:[], promo:S.promo || null, promoMsg:'', end:null, bfast:false, picks:[], adds:[], pending:null, tg:0, cat:undefined, pm:'card', paid:null, d:{}, agree:false, adult:false, mkt:false, month:null, ref:null, paying:false });

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
    const base = S.p === 'house' ? p.night * nights : p.priceN ? p.priceN[nights] * S.guests : p.price * S.guests;
    const bf = S.bfast && p.bfast ? BFAST * S.guests * nights : 0;
    const promo = promoOff({ base, bf, tc });
    const total = base + bf + tc.sub - tc.off - promo;
    let now = total, bal = 0, balDue = null;
    if (S.p === 'house' && S.date && (S.date - today) / 864e5 > 42){ now = total / 2; bal = total - now; balDue = add(S.date, -42); }
    return { base, bf, tc, total, now, bal, balDue, nights, promo };
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
    const st = steps();
    const shown = i => i !== ROOMS || needRooms(), num = i => st.slice(0, i + 1).filter((_, k) => shown(k)).length;
    stepsEl.innerHTML = S.ref ? '' : st.map((t, i) => !shown(i) ? '' : `<li class="${i === S.step ? 'now' : i < S.step ? 'done' : ''}">${i < S.step ? `<button data-goto="${i}" title="Back to ${t}">` : '<span>'}<i>${i < S.step ? '✓' : num(i)}</i><b>${t}</b>${i < S.step ? '</button>' : '</span>'}</li>`).join('');
    stepsEl.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { S.step = +b.dataset.goto; draw(); });
    const bar = S.step > 0 && !S.ref ? selBar() : '';
    body.innerHTML = bar + (S.ref ? doneView() : [chooseView, guestView, dateView, roomsView, treatView, detailView, payView][S.step]());
    body.querySelectorAll('.sel-bar [data-goto]').forEach(b => b.onclick = () => { S.step = +b.dataset.goto; draw(); });
    navView(); sideView(); sideWire(); wire(); save();
    const at = S.step + ':' + (S.tg || 0) + ':' + !!S.ref;  // only jump to the top on a new step or guest
    if (at !== lastAt){ if (PAGE && lastAt) { const y = box.getBoundingClientRect().top + scrollY - 90; if (scrollY > y) scrollTo({ top: Math.max(0, y) }); } else { body.scrollTop = 0; $('.bk-main', box).scrollTop = 0; box.scrollTop = 0; side.scrollTop = 0; } lastAt = at; }
  }

  const TYPE_NAMES = { Spa:'Spa day', Treat:'Treatments only', Stay:'Overnight stay', House:'Exclusive use' };
  function selBar(){
    if (!S.cat) return '';
    const p = S.p && P[S.p] && P[S.p].group === S.cat ? P[S.p] : null;
    return p ? `<div class="sel-bar"><span>You’re booking</span><button data-goto="0" title="Change what you’re booking">${p.name} <i>✎</i></button></div>` : '';
  }
  const typeView = () => chooseView(), optionView = () => chooseView();
  function chooseView(){
    const cost = p => p.price || (p.priceN && (p.priceN[1] ?? Object.values(p.priceN)[0])) || p.night || 0;
    const RANK = { break: 1, break2: 2, group: 3 };   // stays: the two spa breaks side by side, then groups (user, 2026-11-27)
    const grp = g => Object.entries(P).filter(([, p]) => p.group === g && !p.off).sort((a, b) => (RANK[a[0]] ?? 50) - (RANK[b[0]] ?? 50) || cost(a[1]) - cost(b[1])).map(([k, p]) => `<button class="bk-opt ${S.p === k ? 'sel' : ''}" data-p="${k}"><small>${k === 'break' ? '1 night · Sunday to Thursday' : k === 'break2' ? '2 nights · arrive Sunday to Wednesday' : k === 'group' ? 'Sun – Thu · 7+ guests' : k === 'house' ? '2 – 30 nights' : p.only ? 'No spa session' : k === 'private' ? '4+ guests (6+ on Sundays)' : '4-hour sessions'}</small><b>${p.name}</b><span>${p.blurb}</span><em>${p.from[0] === 'f' ? 'F' + p.from.slice(1) : p.from}</em><span class="opt-cta">${S.p === k ? 'Selected' : 'Select'} <span class="arrow">→</span></span></button>`).join('');
    const pend = S.pending ? `<div class="notice"><b>${TRi[S.pending].name}</b> is ready to add. Book it on its own, or add it to a spa day or a stay (Japanese head spa is 10% off with a spa session or stay).</div>` : '';
    const TYPES = [
      ['Spa', 'Spa day', 'Day Spa, Spa Access or the Private Spa', 'From £50 pp', 'https://static.wixstatic.com/media/7a9273_c527bfae78d645c096615f66806d3b0f~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_c527bfae78d645c096615f66806d3b0f~mv2.jpg'],
      ['Treat', 'Treatments only', 'Massage, facials & Japanese head spa', 'From £50', 'https://static.wixstatic.com/media/7a9273_0fed7351ea044db299d21524d0244378~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_0fed7351ea044db299d21524d0244378~mv2.jpg'],
      ['Stay', 'Overnight stay', 'Spa breaks for 2 or groups of 7+', 'From £145 pp', 'https://static.wixstatic.com/media/7a9273_372efc1386f3463b863c2d3b93d28915~mv2.jpg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_372efc1386f3463b863c2d3b93d28915~mv2.jpg'],
      ['House', 'Exclusive use', 'The whole house & spa, up to 16 guests', 'From £1,840 / night', 'https://static.wixstatic.com/media/7a9273_2f589cc654944731b1719bd595e8039c~mv2.jpeg/v1/fill/w_640,h_396,al_c,q_80,enc_auto/7a9273_2f589cc654944731b1719bd595e8039c~mv2.jpeg']];
    if (S.cat === undefined) S.cat = S.p ? P[S.p].group : null;
    const T = TYPES.find(t => t[0] === S.cat), many = S.cat && Object.values(P).filter(x => x.group === S.cat && !x.off).length > 1;
    return `<h2>What would you like to <em>book</em>?</h2>${pend}<div class="bk-types">${TYPES.map(([g, t, d, f, img]) => `<button class="bk-type ${S.cat === g ? 'sel' : ''}" data-cat="${g}"><span class="bt-img" style="background-image:url('${img}')"></span><b>${t}</b><span>${d}</span><em>${f}</em><span class="opt-cta">${S.cat === g ? 'Selected' : 'Choose'} <span class="arrow">→</span></span></button>`).join('')}</div>${T && many ? `<div class="bk-group bk-opts-h" id="bkOpts">${T[1]}: choose one</div><div class="bk-opts">${grp(S.cat)}</div>` : ''}`;
  }

  // the first day that can be booked (with a session free, for session bookings), chosen for the guest (user, 2026-11-26)
  function firstFree(){
    const p = P[S.p];
    for (let d = new Date(first); d <= last; d = add(d, 1)) {
      if (!dateOK(S.p, d)) continue;
      if (p.sessions && !p.only && YE && L.cfg) { const l = YE.sessions(L.cfg, L.ix, S.p, iso(d), S.guests); if (l && l.length && !l.some(x => x.ok)) continue; }
      return d;
    }
    return null;
  }
  function dateView(){
    const p = P[S.p], range = p.rule === 'range';
    if (!S.date) { const d = firstFree(); if (d) { S.date = d; S.end = null; S.month = new Date(d.getFullYear(), d.getMonth(), 1); S.times = {}; } }
    const m = S.month || (S.date ? new Date(S.date.getFullYear(), S.date.getMonth(), 1) : new Date(first.getFullYear(), first.getMonth(), 1));
    S.month = m;
    const endSel = endDate(), two = !!p.rule && innerWidth > 900;
    const grid = mm => {
      const startW = (mm.getDay() + 6) % 7, dim = new Date(mm.getFullYear(), mm.getMonth() + 1, 0).getDate();
      let cells = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<span class="dw">${d}</span>`).join('') + '<span></span>'.repeat(startW);
      for (let i = 1; i <= dim; i++){
        const d = new Date(mm.getFullYear(), mm.getMonth(), i), ok = dateOK(S.p, d);
        let c = BH.has(iso(d)) ? 'bh' : '';
        if (S.date && +d === +S.date) c += ' sel';
        else if (endSel && d > S.date && d < endSel) c += ' in';
        else if (endSel && +d === +endSel) c += ' end';
        cells += `<button data-d="${iso(d)}" class="${c}" ${ok ? '' : 'disabled'} aria-label="${nice(d, { year:'numeric' })}">${i}</button>`;
      }
      return `<div class="cal-m"><b class="cal-t">${mm.toLocaleDateString('en-GB', { month:'long', year:'numeric' })}</b><div class="cal-g">${cells}</div></div>`;
    };
    const m2 = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const prevOK = new Date(m.getFullYear(), m.getMonth(), 0) >= first, nextOK = new Date(m.getFullYear(), m.getMonth() + (two ? 2 : 1), 1) <= last;
    const times = rows => `<ul class="times">${rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>`;
    let right = '';
    const live = YE && L.cfg && S.date && p.sessions && !p.only ? YE.sessions(L.cfg, L.ix, S.p, iso(S.date), S.guests) : null;
    const sesList = p.only ? [] : (p.sessions || []).filter(x => !S.date || !live || live.some(l => l.name === x[0]));
    if (p.only) right = `<div class="bk-group" style="margin-top:0">Your time</div><p class="cal-note">Choose your treatments next, then pick from the start times that are free on this day.</p>`;
    else if (p.sessions) right = `<div class="bk-group" style="margin-top:0">Session</div><div class="ses">${sesList.map(([n, t]) => { const l = live && live.find(x => x.name === n); const off = l && !l.ok; return `<button class="ses-opt ${S.session === n ? 'sel' : ''}" data-s="${n}" ${off ? 'disabled' : ''}><b>${n}</b><span>${t}</span>${l ? `<small class="${off ? 'full' : ''}">${off ? esc(l.why) : l.left <= 3 ? `Only ${l.left} place${l.left === 1 ? '' : 's'} left` : 'Available'}</small>` : ''}</button>`; }).join('') || '<p class="cal-note">No sessions on this day.</p>'}</div>
      ${S.p === 'private' ? `<p class="cal-note">Minimum 4 guests, or 6 on Sundays (from 11:30).${S.guests < 6 ? ' Sundays open up for groups of 6 or more.' : ''}</p>` : ''}`;
    else if (p.nights && p.nights.length > 1) right = `<div class="bk-group" style="margin-top:0">How many nights?</div><div class="pills">${p.nights.map(n => `<button class="pill ${S.nights === n ? 'sel' : ''}" data-n="${n}">${n} night${n > 1 ? 's' : ''} · ${gbp(p.priceN[n])} pp</button>`).join('')}</div>`;
    if (p.rule === 'mid' || p.rule === 'stay'){
      right += `<div class="bk-group">Your stay</div>` + (S.date
        ? `<p class="stay-when"><b>${nice(S.date)}</b> → <b>${nice(add(S.date, S.nights))}</b> · ${S.nights} night${S.nights > 1 ? 's' : ''}</p>${times(stayTimes(S.p, S.date, S.nights))}`
        : `<p class="cal-note">${(() => { const q = L.cfg && L.cfg.products[S.p], days = q && q.arriveDays && q.arriveDays[S.nights]; if (!days) return S.nights > 1 ? '2-night breaks arrive Sunday to Wednesday.' : 'Breaks run Sunday to Thursday nights.'; const N = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; return days.length === 7 ? 'Arrive any day.' : `${S.nights}-night stays arrive on ${[1, 2, 3, 4, 5, 6, 0].filter(d => days.includes(d)).map(d => N[d]).join(', ')}.`; })()} Pick your arrival day.</p>`);
    }
    if (range){
      right = `<div class="bk-group" style="margin-top:0">Your stay</div>` + (!S.date
        ? `<p class="cal-note">Pick your check-in day, then your check-out day. Minimum 2 nights, up to 30.</p>`
        : !S.end ? `<p class="stay-when">Check-in <b>${nice(S.date)}</b></p><p class="cal-note">Now pick your check-out day (at least 2 nights).</p>`
        : `<p class="stay-when"><b>${nice(S.date)}</b> → <b>${nice(S.end)}</b> · ${S.nights} nights</p>${times(stayTimes('house', S.date, S.nights))}<p class="cal-note">From £1,840 per night for the whole house. Rates can vary by date.</p>`);
    }
    return `<h2>Choose your <em>${p.rule ? 'dates' : 'day'}</em></h2><p class="bk-sub">${p.name}${p.rule === 'mid' ? ' · Sunday to Thursday' : range ? ' · 2 to 30 nights' : p.only ? ' · you’ll pick a start time after choosing treatments' : ' · 4-hour sessions'}</p>
      <div class="bk-row ${two ? 'wide' : ''}"><div class="cal"><div class="cal-nav"><button data-m="-1" ${prevOK ? '' : 'disabled'} aria-label="Previous month">‹</button><button data-m="1" ${nextOK ? '' : 'disabled'} aria-label="Next month">›</button></div>
      <div class="cal-ms">${grid(m)}${two ? grid(m2) : ''}</div><div class="cal-note"><span><i></i>Bank holiday</span>${p.rule ? '<span>Tap your arrival day' + (p.rule === 'range' ? ', then your departure day' : '') + '</span>' : ''}</div></div><div class="bk-right">${right}</div></div>`;
  }

  const gMin = () => P[S.p].min;
  function guestView(){
    const p = P[S.p], minG = gMin();
    if (S.guests < minG) S.guests = minG;
    while (S.picks.length < S.guests) S.picks.push({ treat:'Aromatherapy massage', food:(p.foods || ['Afternoon tea'])[0] });
    S.picks.length = S.guests; syncAdds();
    const quick = [...new Set([minG, 2, 4, 6, 8, 10, 12, 16].filter(n => n >= minG && n <= p.max))].slice(0, 6);
    const note = /^break/.test(S.p) ? `${Math.ceil(S.guests / 2)} king ensuite room${S.guests > 2 ? 's' : ''} · prices are based on 2 sharing`
      : S.p === 'group' ? 'Groups of 7 to 16 guests.</p><p class="gc-alt">6 or fewer? <button type="button" class="linkbtn-site" data-alt="break">Choose a Spa Break instead</button>'
      : S.p === 'house' ? 'Up to 16 guests · the price is for the whole house'
      : S.p === 'private' ? 'Minimum 4 guests, 6 on Sundays'
      : `Up to ${p.max} guests per booking`;
    let h = `<h2>How many <em>guests</em>?</h2>
      <div class="gcount">
        <div class="gc-main"><button class="gc-btn" data-g="-1" ${S.guests <= minG ? 'disabled' : ''} aria-label="Fewer guests">−</button>
          <div class="gc-num"><b>${S.guests}</b><span>guest${S.guests > 1 ? 's' : ''}</span></div>
          <button class="gc-btn" data-g="1" ${S.guests >= p.max ? 'disabled' : ''} aria-label="More guests">+</button></div>
        <div class="gc-side"><p>${note}</p></div>
      </div>
      <div class="bk-group">Who’s coming?</div><p class="cal-note" style="margin:-4px 0 10px">The full name of each guest, so we can welcome everyone and your therapists know who they’re treating.</p>
      <div class="bk-2 gnames">${Array.from({ length: S.guests }, (_, i) => `<div class="bk-field" data-fd="g${i}"><label for="bk_g${i}">Guest ${i + 1}${i === 0 ? ' (lead guest)' : ''}</label><input id="bk_g${i}" type="text" autocomplete="${i === 0 ? 'name' : 'off'}" value="${esc((S.names || [])[i] || '')}" placeholder="First and last name"><small class="err">Please enter this guest’s name</small></div>`).join('')}</div>`;
    if (p.bfast && (S.p === 'group' || S.nights > 1))
      h += `<label class="check opt-line"><input type="checkbox" id="bkBf" ${S.bfast ? 'checked' : ''}> Add continental breakfast · £${BFAST} per person, per morning</label>`;
    return h;
  }

  const pricePart = () => '';
  const INCLUDED = { day:'treat', private:'treat', break:'massage', break2:'massage', group:'massage' };
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
    const dots = n > 1 ? `<div class="gsteps">${Array.from({ length:n }, (_, i) => `<button class="gstep ${i === g ? 'now' : ''} ${i < g || (i !== g && S.seen && S.seen[i]) ? 'done' : ''}" data-gt="${i}">${i < g || (S.seen && S.seen[i] && i !== g) ? '✓' : i + 1}</button>`).join('<i></i>')}</div>` : '';
    const incOff = v => { if (!(YE && L.cfg && S.date)) return false; const t = (incList(S.p) || []).find(x => x.name === v); return t ? !fitsWith(g, x => ({ ...x, included: t.id }), 'inc=' + t.id) : false; };
    const choice = (fld, opts) => `<div class="choice">${opts.map(([v, sub]) => { const off = fld === 'treat' && pick.treat !== v && incOff(v); return `<button class="ch ${pick[fld] === v ? 'sel' : ''}" data-pk="${g}" data-f="${fld}" data-v="${v}" ${off ? 'disabled' : ''}><span class="ch-r"></span><b>${v}</b>${off ? '<small>No available times in this session</small>' : sub ? `<small>${sub}</small>` : ''}</button>`; }).join('')}</div>`;
    let h = `<div class="gc-head"><h2>${n > 1 ? `${esc(gName(g))} <em>· ${g + 1} of ${n}</em>` : p.only ? 'Choose your <em>treatments</em>' : 'Your <em>choices</em>'}</h2>${dots}</div>`;
    const il = incList(S.p);
    if (incMode(S.p) === 'treat') { if (il && !il.some(t => t.name === pick.treat)) pick.treat = il[0].name; h += `<div class="bk-group">Included treatment: choose one</div>${choice('treat', il ? il.map(t => [t.name, t.desc || `${t.min} minutes`]) : [['Aromatherapy massage', 'Relaxing, with aromatherapy oils'], [p.facial || 'Facial', S.p === 'private' ? 'A luxury facial' : 'An aromatherapy facial']])}`; }
    if (incMode(S.p) === 'massage') h += `<div class="inc-line"><span>✓</span> ${il ? esc(il.map(t => t.name).join(' and ')) + (il.length > 1 ? ' are' : ' is') : 'A 20-minute aromatherapy massage is'} included</div>`;
    if (p.food) h += `<div class="bk-group">Food</div>${choice('food', (p.foods || ['Afternoon tea', 'Sweet & savoury grazing board']).map(v => [v, v === 'Afternoon tea' ? 'Sweet & savoury treats' : v === 'Grazing board' ? 'Meats, cheese & sweet treats' : 'Meats, cheese & sweet treats · vegan available']))}`;
    const cats = [...new Set(TR.map(t => t.cat))];
    const extras = cats.map(c => `<div class="tr-cat">${c}${c === 'Japanese Head Spa' && !p.only ? ' <span>10% off with your booking</span>' : ''}</div><div class="tr-list">` + TR.filter(t => t.cat === c).map(t => {
      const on = S.adds[g].includes(t.id), max = !on && S.adds[g].length >= maxExtras();
      const incN = YE && L.cfg && S.date ? siteNeeds().find(n => n.guest === g && n.included) : null, sameKind = !!(incN && YE.combineMax && (L.cfg.rules || {}).combineIncluded !== false && (YE.tr(L.cfg, incN.tid) || {}).cat === t.cat);
      // only offered if the whole booking still fits with it, so no guest is left without a time for their included treatment
      const none = !on && YE && L.cfg && S.date && !fitsWith(g, x => ({ ...x, extras: x.extras.concat(t.id) }), 'x+' + t.id);
      const full = max || none || (sameKind && !on && (S.adds[g] || []).some(id => { const c = chargeOf(g, id); return c && c.extends; }));
      // same kind as the included treatment: it extends it, up to the 55-minute cap, charged for the minutes it adds
      let ext = null;
      if (sameKind && !on) { const already = (S.adds[g] || []).some(id => { const c = chargeOf(g, id); return c && c.extends; }), cap = YE.combineMax(L.cfg), add = already ? 0 : Math.max(0, Math.min(t.min, cap - incN.min));
        ext = { already, add, total: incN.min + add, price: add >= t.min ? t.price : YE.extendPrice(L.cfg) }; }
      else if (sameKind && on) { const c = chargeOf(g, t.id); if (c && c.extends) ext = { add: c.mins, total: Math.min(YE.combineMax(L.cfg), (siteNeeds().find(n => n.guest === g && n.included) || {}).min || 0), price: c.price }; }
      const blocked = ext && ext.already, price = ext && !blocked ? ext.price : t.price;
      const pr = t.head && !p.only ? `<s>${gbp(price)}</s> ${gbp(price * (1 - HEAD_OFF))}` : (ext && !blocked && price !== t.price ? `<s>${gbp(t.price)}</s> ${gbp(price)}` : gbp(price));
      return `<button class="tr-opt ${on ? 'sel' : ''}" data-add="${t.id}" data-gi="${g}" ${full ? 'disabled' : ''}><span class="tr-tick">${on ? '✓' : '+'}</span><span class="tr-txt"><b>${t.name}</b><span>${t.desc}</span>${none ? '<em class="tr-note off">No available times</em>' : ext && ext.already ? '<em class="tr-note off">Your included treatment is already extended</em>' : ext ? `<em class="tr-note">Extends the included treatment to ${ext.total} min</em>` : ''}</span><span class="tr-pr"><b>${pr}</b><small>${ext && !ext.already ? `+${ext.add} min` : t.min + ' min'}</small></span></button>`;
    }).join('') + '</div>').join('');
    h += p.only
      ? `<p class="bk-sub" style="margin-top:6px">Pick up to ${maxExtras()} treatments${n > 1 ? ' for this guest' : ''}, then choose a time for each one below.</p>${S.adds[g].length >= maxExtras() ? `<div class="notice">That’s the most we can book online for one guest. For more, call us on 01933 580 100.</div>` : ''}${extras}`
      : `<div class="extra-box"><div class="extra-h"><b>Add extra treatments <span>optional</span></b><p>${incMode(S.p) ? 'Your booking already includes a treatment. Want more time? Add any of these.' : 'Add a massage, facial or Japanese head spa to your visit.'} Up to ${maxExtras()} per guest${p.rule ? ' across your stay' : ''}; we’ll fit them around your ${p.rule ? 'stay' : 'session'}.</p></div>${S.adds[g].length >= maxExtras() ? `<div class="notice">That’s the most we can book online for one guest. For more, call us on 01933 580 100.</div>` : ''}${extras}</div>`;
    if (S.sameNote && g > 0) { h = `<div class="notice">${esc(S.sameNote)}</div>` + h; if (g === n - 1) S.sameNote = ''; }
    if (n > 1 && g === 0) h += `<button class="bk-backlink" data-same style="margin-top:14px">Give everyone the same choices as Guest 1</button>`;
    // ---- this guest's treatment times, right under their treatments ----
    if (YE && L.cfg && S.date) {
      S.times = S.times || {}; S.tpDate = S.tpDate || {};
      const mine = siteNeeds().filter(x => x.guest === g);
      if (mine.length) {
        h += `<div class="bk-group">${n > 1 ? `${esc(gName(g))}’s` : 'Your'} treatment times</div><p class="cal-note" style="margin:-4px 0 10px">Pick a time for each treatment. Only times when a therapist and a treatment room are free are shown${P[S.p].rule ? ', on any day of your stay' : ''}.</p>`;
        for (const need of mine) {
          const t = { ...(YE.tr(L.cfg, need.tid) || {}), name: YE.itemName(L.cfg, need) }, sl = slotsFor(need), cur = S.times[need.key];
          if (cur && !sl.some(d => d.date === cur.date && d.times.some(x => x.start === cur.start))) delete S.times[need.key];
          const days = sl.filter(d => d.times.length), day = (S.times[need.key] || {}).date || S.tpDate[need.key] || (days[0] || {}).date;
          h += `<div class="tpick ${S.times[need.key] ? 'done' : ''}"><div class="tp-h"><b>${esc(t.name)}</b><span>${need.min || t.min} min${need.included ? ((need.with || []).length ? ` · ${(YE.tr(L.cfg, need.tid) || {}).min} min included + ${(need.min || 0) - ((YE.tr(L.cfg, need.tid) || {}).min || 0)} min extra` : ' · included') : ''}</span>${S.times[need.key] ? `<em>✓ ${sl.length > 1 ? fdShort(S.times[need.key].date) + ' ' : ''}${S.times[need.key].start}</em>` : ''}</div>
            ${!days.length ? `<p class="tp-none">Sorry, there are no available times for this treatment${P[S.p].rule ? ' during your stay' : ' in your session'}. ${need.included ? 'Please choose another session or day.' : 'Please remove it or choose another day.'}</p>`
              : `${sl.length > 1 ? `<div class="pills tp-days">${sl.map(d => `<button class="pill ${d.date === day ? 'sel' : ''}" data-tpd="${need.key}|${d.date}" ${d.times.length ? '' : 'disabled'}>${fdShort(d.date)}${d.times.length ? '' : ' · full'}</button>`).join('')}</div>` : ''}
                <div class="pills tp-times">${(sl.find(d => d.date === day) || { times: [] }).times.map(x => `<button class="pill ${(S.times[need.key] || {}).start === x.start && (S.times[need.key] || {}).date === day ? 'sel' : ''}" data-tp="${need.key}|${day}|${x.start}">${x.start}</button>`).join('')}</div>`}</div>`;
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
          <div class="bk-2">${f('email', 'Email', 'email', 'email', 'Please enter a valid email')}${f('phone', 'Mobile', 'tel', 'tel', 'Please enter a phone number')}</div>
          <div class="bk-field"><label for="bk_notes">Dietary needs, celebrations or anything else <span class="opt">optional</span></label><textarea id="bk_notes" rows="2" placeholder="e.g. one vegan, a birthday">${esc(S.d.notes)}</textarea></div>
          <label class="check"><input type="checkbox" id="bkBlue" ${S.blue ? 'checked' : ''}> I have a Blue Light Card (free upgrade to 30-minute treatments)</label>
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
    return `<h2>Review &amp; <em>pay</em></h2><p class="bk-sub">Please check everything before paying.</p><div class="pay-grid">${reviewList()}
      <div class="stripe">
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
      </div></div>
      <details class="vcode" ${S.voucher || S.promo || S.promoMsg ? 'open' : ''}><summary>Have a discount code or gift voucher?</summary><div class="vc-row"><input id="bkVoucher" placeholder="Code" value="${esc(S.promo ? S.promo.code : S.voucher || '')}" maxlength="40"><button class="pill" id="bkVApply">${S.promo ? 'Remove' : 'Apply'}</button></div><p class="cal-note">${S.promo ? `<b>${esc(S.promo.code)}</b> applied: ${S.promo.type === 'pct' ? S.promo.value + '% off' : gbp(S.promo.value) + ' off'}.` : S.promoMsg ? esc(S.promoMsg) : 'Gift vouchers are valid for 12 months. We’ll check a voucher code and adjust the balance before your visit.'}</p></details>
      ${pr.bal ? `<div class="notice"><b>Paying ${gbp(pr.now)} today</b> (50% deposit). The balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}. A £500 damage deposit will be pre-authorised before arrival.</div>`
        : S.p === 'house' ? `<div class="notice"><b>Paying in full today</b> because your stay is within 6 weeks. A £500 damage deposit will be pre-authorised before arrival.</div>` : ''}`;
  }

  function reviewList(){
    const p = P[S.p], d = S.d;
    const when = p.rule ? `${nice(S.date)} – ${nice(endDate(), { year:'numeric' })} (${S.nights} night${S.nights > 1 ? 's' : ''})<br>${stayTimes(S.p, S.date, S.nights).map(([a, b]) => a + ' ' + b).join(' · ')}` : `${nice(S.date, { year:'numeric' })} · ${sesLabel()}`;
    const picks = (incMode(S.p) === 'treat' || p.food) ? S.picks.map((g, i) => `Guest ${i + 1}: ${[incMode(S.p) === 'treat' && g.treat, p.food && g.food].filter(Boolean).join(', ')}`).join('<br>') : '';
    const rows = [['Booking', p.name], ['When', when], ['Guests', S.guests + (/^break/.test(S.p) ? ` · ${Math.ceil(S.guests / 2)} room${S.guests > 2 ? 's' : ''}` : '')], picks && ['Included', picks], treatCost().n && ['Treatments', treatLines('<br>', true)], S.bfast && p.bfast && ['Breakfast', `Continental, ${S.nights} morning${S.nights > 1 ? 's' : ''}`], S.blue && ['Blue Light Card', 'Treatments upgraded to 30 minutes'], S.voucher && ['Gift voucher', esc(S.voucher) + ' (checked before your visit)'],
      S.plan && S.plan.length && ['Your treatment times', timesList(S.plan)],
      ['Name', esc(d.first + ' ' + d.last)], ['Contact', esc(d.email) + '<br>' + esc(d.phone)], d.notes && ['Notes', esc(d.notes)]].filter(Boolean);
    return `<div class="pay" style="margin-bottom:18px"><ul class="sum" style="color:var(--ink)">${rows.map(([a, b]) => `<li><span style="color:var(--muted)">${a}</span><b>${b}</b></li>`).join('')}</ul></div>`;
  }

  function doneView(){
    const p = P[S.p], ask = p.kind === 'ask', pr = price();
    return `<div class="done-ico"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg></div>
      <h2>${ask ? (S.ticket ? 'Request <em>sent</em>' : 'Request <em>not sent</em>') : 'You’re <em>booked</em>'}, ${esc(S.d.first)}</h2>
      <p class="bk-sub">${ask ? 'Your reference is below.' : `${S.paid ? (S.paid.method === 'klarna' ? `First Klarna payment of ${gbp(Math.floor(S.paid.amount / 3 * 100) / 100)} taken, 2 more to follow. ` : `${gbp(S.paid.amount)} paid by card. `) : ''}We’ve emailed your confirmation to ${esc(S.d.email)}.<br><span style="font-size:13px">Stripe test payment ${S.paid ? S.paid.id : ''} · no money was taken.</span>`}</p>
      <div class="ref">${S.ref}</div>
      ${S.plan && S.plan.length ? `<div class="pay" style="margin:14px auto;max-width:460px;text-align:left"><div class="bk-group" style="margin-top:0">Your treatment times</div><p>${timesList(S.plan)}</p><p class="cal-note">Set by our booking system around your ${P[S.p].rule ? 'stay' : 'visit'}. We’ll email these too.</p></div>` : ''}
      <ol class="next">${ask
        ? (S.ticket ? `<li>Your request is with the team (reference ${esc(S.ticket.id)}).</li><li>We’ll check the date and reply with a price, by email.</li><li>Confirm and pay to secure your booking.</li>` : `<li>We couldn’t send your request just now${S.sendErr ? ' (' + esc(S.sendErr) + ')' : ''}. Please call us on 01933 580 100 and quote ${esc(S.ref)}.</li>`)
        : `<li>Look out for your confirmation email with session times and directions.</li><li>${p.treat || treatCost().n ? 'Complete the short consultation form for each guest before your visit.' : 'Bring your swimwear; towels and robes are waiting for you.'}</li>${pr && pr.bal ? `<li>Your balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}.</li>` : ''}<li>${p.rule ? (stayTimes(S.p, S.date, S.nights)[0] || ['Check-in', ''])[0] + ' ' + (stayTimes(S.p, S.date, S.nights)[0] || ['', 'from 16:00'])[1] + ' on ' + nice(S.date) + '.' : 'Arrive a few minutes before your session (' + sesLabel() + ') on ' + nice(S.date) + '.'}</li>`}</ol>
      <div class="hero-cta">${ask && S.ticket ? `<a class="btn btn-solid" href="ticket.html?t=${S.ticket.id}&k=${S.ticket.k}">See your request <span class="arrow">&rarr;</span></a>` : ''}<button class="btn btn-ghost" data-close>Back to the site</button></div>`;
  }

  // ---------- validation ----------
  function problem(){
    const p = P[S.p];
    if (S.step === 0) return !S.cat ? 'Choose what you’d like to book' : S.p && P[S.p].group === S.cat ? '' : 'Choose an option';
    if (S.step === DATE){ if (!S.date) return p.rule ? 'Choose your arrival day' : 'Choose a day'; if (p.rule === 'range' && !S.end) return 'Choose your check-out day'; if (p.sessions && !p.only && !S.session) return 'Choose a session'; }
    if (S.step === GUESTS) { S.gOK = true; const bad = []; for (let i = 0; i < S.guests; i++) if (((S.names || [])[i] || '').trim().length < 2) bad.push('g' + i); if (bad.length) return { bad }; }
    if (S.step === ROOMS && needRooms()) { const miss = Array.from({ length: S.guests }, (_, i) => i).filter(i => !(S.roomOf || [])[i]); if (miss.length) return `Choose a room for ${gName(miss[0])}`; }
    if (S.step === CHOICES && P[S.p].only && !S.adds[S.tg].length) return 'Choose at least one treatment for this guest';
    if (S.step === CHOICES && YE && L.cfg) { const miss = siteNeeds().filter(x => x.guest === S.tg && !(S.times || {})[x.key]); if (miss.length) return 'Choose a time for ' + (YE.tr(L.cfg, miss[0].tid) || {}).name; }
    if (S.step === CHOICES && S.tg >= S.guests - 1 && YE && L.cfg) { const miss = siteNeeds().find(x => !(S.times || {})[x.key]); if (miss) { return `Choose a time for ${gName(miss.guest)}’s ${(YE.tr(L.cfg, miss.tid) || {}).name}`; } }
    if (S.step === CHOICES && S.tg >= S.guests - 1 && YE && L.cfg) {
      const r = planNow(); if (r && !r.ok) return `Sorry, we can’t fit ${r.fail && r.fail.name ? r.fail.name : 'all the treatments'} in on this ${P[S.p].rule ? 'stay' : 'day'}. Try fewer treatments or another ${P[S.p].rule ? 'date' : 'session'}.`;
    }
    if (S.step === DATE && S.session && YE && L.cfg && !P[S.p].only) { const l = YE.sessions(L.cfg, L.ix, S.p, iso(S.date), S.guests).find(x => x.name === S.session); if (l && !l.ok) return S.session + ': ' + l.why; }
    if (S.step === DETAILS){
      const d = S.d, bad = [];
      if (!(d.first || '').trim()) bad.push('first'); if (!(d.last || '').trim()) bad.push('last');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) bad.push('email');
      if ((d.phone || '').replace(/\D/g, '').length < 10) bad.push('phone');

      if (bad.length) return { bad };
      if (!S.adult) return { ck:'adult' }; if (!S.agree) return { ck:'agree' };
    }
    return '';
  }

  function navView(){
    if (S.ref){ nav.innerHTML = '<span></span><button class="bk-close">Close</button>'; $('.bk-close', nav).onclick = close; return; }
    const last = S.step === LAST, ask = S.p && P[S.p].kind === 'ask', pr = price();
    const label = last ? (ask ? 'Send request' : S.pm === 'klarna' ? 'Continue with Klarna' : `Pay ${gbp(pr.now)}`) : S.step === CHOICES && S.tg < S.guests - 1 ? `Next: Guest ${S.tg + 2}` : 'Continue';
    nav.innerHTML = `<span class="bk-msg"></span>${PAGE ? '' : '<button class="bk-close" title="Your choices are saved">Close</button>'}${S.step ? '<button class="back">← Back</button>' : ''}<button class="btn btn-solid go">${S.paying ? '<span class="spin"></span> ' + (S.pm === 'klarna' && !ask ? 'Opening Klarna…' : 'Processing…') : label + ' <span class="arrow">→</span>'}</button>`;
  }

  function sideWire(){ const x = $('.side-x', side); if (x) x.onclick = close; side.querySelectorAll('[data-sgoto]').forEach(b => b.onclick = () => { S.step = +b.dataset.sgoto; draw(); }); }
  function sideView(){
    const p = P[S.p], pr = price(), est = estimate();
    if (!p){ side.innerHTML = `<div class="side-top"><div class="eyebrow">Your booking</div><button class="side-x" aria-label="Close booking">&times;</button></div><h3>Nothing chosen yet</h3><p class="sum-empty">Pick a spa day, a stay or a treatment to see your total here.</p><p class="foot-note">Questions? Call 01933 580 100 or message us on WhatsApp.</p>`; return; }
    const tc = treatCost(), g = S.gOK;
    const unit = S.p === 'house' ? `${gbp(p.night)} × ${S.nights} nights` : p.priceN ? `${gbp(p.priceN[S.nights])} × ${S.guests}` : `${gbp(p.price)} × ${S.guests}`;
    const rows = [['Booking', p.name],
      S.date && ['Date', p.rule ? `${nice(S.date)}${endDate() ? ' → ' + nice(endDate()) : ''}` : nice(S.date)],
      S.session && ['Session', sesLabel()],
      g && ['Guests', S.guests],
      pr && !p.only && (S.p === 'house' ? S.nights : g) && ['Price', unit],
      pr && pr.bf && ['Breakfast', gbp(pr.bf)],
      ...S.adds.flatMap((a, gi) => a.map(id => { const t = TRi[id]; if (!t) return null; const head = t.head && !P[S.p].only, c = chargeOf(gi, id), price = c ? c.price : t.price; return [`${esc(t.name)}${c && c.extends && c.mins < t.min ? ` <small class="sum-who">${c.mins} min added to the included treatment</small>` : ''}${S.guests > 1 ? `<small class="sum-who">${esc(gName(gi))}</small>` : ''}`, head ? `<s>${gbp(price)}</s> ${gbp(price * (1 - HEAD_OFF))}` : gbp(price)]; })), pr && pr.promo && ['Code ' + esc(S.promo.code), '−' + gbp(pr.promo)]].filter(Boolean);
    const ready = pr && (S.p === 'house' ? S.nights >= 2 : g || p.only);
    const tot = p.kind === 'ask'
      ? `<div class="big"><span>${g ? 'Estimate' : 'From'}</span><b>${g ? gbp(est) : gbp(p.est)}</b></div><p>${g ? 'We’ll confirm the exact price.' : 'per person'} Nothing to pay now.</p>`
      : ready ? `<div class="big"><span>Total</span><b>${gbp(pr.total)}</b></div>${pr.bal ? `<p>${gbp(pr.now)} deposit today, ${gbp(pr.bal)} by ${nice(pr.balDue)}.</p>` : '<p>Paid in full today. VAT included.</p>'}`
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
    body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; if (k !== S.p){ const pend = S.pending, cat = S.cat; reset(k); S.pending = pend; S.cat = cat; syncAdds(); } S.cat = P[k].group; S.step = 0; draw(); });
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + +b.dataset.m, 1); draw(); });
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [y, m, d] = b.dataset.d.split('-').map(Number); const D = new Date(y, m - 1, d);
      if (S.p === 'house'){
        if (!S.date || S.end || D <= S.date){ S.date = D; S.end = null; S.nights = 0; }
        else { const n = Math.round((D - S.date) / 864e5); if (n < 2){ $('.bk-msg', nav).textContent = 'The whole house has a 2-night minimum'; return; } if (n > 30){ $('.bk-msg', nav).textContent = 'Stays are up to 30 nights'; return; }
          if (YE && L.cfg){ const c = YE.dateCheck(L.cfg, L.ix, { product: 'house', date: iso(S.date), nights: n, guests: S.guests }); if (!c.ok){ $('.bk-msg', nav).textContent = 'Those dates aren’t all free: ' + c.why; return; } }
          S.end = D; S.nights = n; }
      } else { if (!S.date || +S.date !== +D) S.times = {}; S.date = D; }
      draw(); });
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { if (S.session !== b.dataset.s) S.times = {}; S.session = b.dataset.s; draw(); });
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { S.nights = +b.dataset.n; if (S.date && !dateOK(S.p, S.date)) S.date = null; draw(); });
    body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const p = P[S.p]; S.guests = Math.min(p.max, Math.max(gMin(), S.guests + +b.dataset.g)); S.gOK = true; if (S.date && !dateOK(S.p, S.date)){ S.date = null; S.end = null; } draw(); });
    const bf = $('#bkBf', body); if (bf) bf.onchange = () => { S.bfast = bf.checked; draw(); };
    body.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { S.picks[+b.dataset.pk][b.dataset.f] = b.dataset.v; if (b.dataset.f === 'treat' && S.times) Object.keys(S.times).filter(k => k.startsWith(`g${b.dataset.pk}-inc`)).forEach(k => delete S.times[k]); draw(); });
    body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const gi = +b.dataset.gi, g = S.adds[gi], id = b.dataset.add, i = g.indexOf(id);
      if (i >= 0) { g.splice(i, 1); if (S.times) { const keep = {}; g.forEach((x, j) => { const old = S.times[`g${gi}-x${j + (j >= i ? 1 : 0)}`]; if (old) keep[`g${gi}-x${j}`] = old; }); Object.keys(S.times).filter(k => k.startsWith(`g${gi}-x`)).forEach(k => delete S.times[k]); Object.assign(S.times, keep); } }
      else if (g.length < maxExtras()) g.push(id); draw(); });
    body.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { S.pm = b.dataset.pm; draw(); });
    body.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { const [k, d, t] = b.dataset.tp.split('|'); S.times = S.times || {}; S.times[k] = { date: d, start: t }; draw(); });
    body.querySelectorAll('[data-tpd]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.tpd.split('|'); S.tpDate = S.tpDate || {}; S.tpDate[k] = d; draw(); });
    body.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { (S.seen = S.seen || {})[S.tg] = 1; S.tg = +b.dataset.gt; draw(); });
    ['first','last','email','phone','notes'].forEach(k => { const el = $('#bk_' + k, body); if (el) el.oninput = () => { S.d[k] = el.value; el.closest('.bk-field').classList.remove('bad');
      if ((k === 'first' || k === 'last') && !S.g0Own) { S.names = S.names || []; S.names[0] = `${S.d.first || ''} ${S.d.last || ''}`.trim(); const g0 = $('#bk_g0', body); if (g0) g0.value = S.names[0]; } }; });
    body.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { const [r, i] = b.dataset.rg.split('|'); S.roomOf = S.roomOf || []; S.roomOf[+i] = S.roomOf[+i] === r ? '' : r; draw(); });
    body.querySelectorAll('[id^="bk_g"]').forEach(el => { if (!/^bk_g\d+$/.test(el.id)) return; el.oninput = () => { const i = +el.id.slice(4); S.names = S.names || []; S.names[i] = el.value; if (i === 0) S.g0Own = true; el.closest('.bk-field').classList.remove('bad'); }; });
    [['#bkAdult','adult'],['#bkAgree','agree'],['#bkMkt','mkt'],['#bkBlue','blue']].forEach(([s, k]) => { const el = $(s, body); if (el) el.onchange = () => { S[k] = el.checked; el.closest('.check').classList.remove('bad'); }; });
    const c = body.querySelector('[data-close]'); if (c) c.onclick = close;
    const back = $('.back', nav); if (back) back.onclick = () => { if (S.step === CHOICES && S.tg > 0){ S.tg--; draw(); return; } S.step--; if (S.step === ROOMS && !needRooms()) S.step--; if (S.step === CHOICES) S.tg = S.guests - 1; draw(); };
    const go = $('.go', nav); if (go) go.onclick = next;
    const cl = $('.bk-close', nav); if (cl) cl.onclick = close;
    // start again: a second press confirms, so one stray tap doesn't lose the booking (user, 2026-11-26)
    const rs = $('.bk-reset', side); if (rs) rs.onclick = () => { if (!rs.dataset.sure) { rs.dataset.sure = '1'; rs.textContent = 'Sure? Clear it all'; rs.classList.add('sure'); setTimeout(() => { if (rs.isConnected) { delete rs.dataset.sure; rs.textContent = 'Start again'; rs.classList.remove('sure'); } }, 4000); return; }
      try { sessionStorage.removeItem(SKEY); } catch (e) {} reset(null); S.cat = null; S.promo = null; S.d = {}; S.names = []; S.roomOf = []; draw(); window.scrollTo({ top: 0 }); };
    const va = $('#bkVApply', body); if (va) va.onclick = async () => {
      if (S.promo) { S.promo = null; S.promoMsg = ''; draw(); return; }
      const code = ($('#bkVoucher', body).value || '').trim(); if (!code) return;
      const pr = await findPromo(code);
      if (pr) { const why = YE.promoCheck(L.cfg, { ...pr, code }, engineBooking()); if (why) { S.promoMsg = why; S.promo = null; } else { S.promo = { code: code.toUpperCase(), type: pr.type, value: pr.value, on: pr.on }; S.promoMsg = ''; S.voucher = ''; } }
      else { S.voucher = code; S.promo = null; S.promoMsg = /^YCV-/i.test(code) ? '' : 'We don’t recognise that discount code, so we’ll treat it as a gift voucher and check it before your visit.'; }
      draw(); };
    body.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { const k = b.dataset.alt; if (!P[k]) return; const pend = S.pending; reset(k); S.pending = pend; S.cat = P[k].group; syncAdds(); S.step = GUESTS; draw(); });
    body.querySelectorAll('[data-gq]').forEach(b => b.onclick = () => { S.guests = +b.dataset.gq; S.gOK = true; if (S.date && !dateOK(S.p, S.date)){ S.date = null; S.end = null; } draw(); });
    const same = body.querySelector('[data-same]'); if (same) same.onclick = () => {
      S.picks = S.picks.map((x, i) => i === 0 ? x : { ...S.picks[0] });
      // the others' own times go (they choose again); extras are copied one by one, only while everyone's treatments still fit
      if (S.times) Object.keys(S.times).filter(k => !k.startsWith('g0-')).forEach(k => delete S.times[k]);
      const left = [];
      for (let i = 1; i < S.guests; i++) { S.adds[i] = []; for (const id of S.adds[0]) { if (!YE || !L.cfg || fitsWith(i, x => ({ ...x, extras: x.extras.concat(id) }), 'same' + i + ':' + S.adds[i].join(',') + '+' + id)) S.adds[i].push(id); else left.push(`${(TRi[id] || {}).name} for ${gName(i)}`); } }
      S.sameNote = left.length ? `Copied. There wasn’t time for: ${left.join('; ')}.` : 'Copied to everyone. Now choose a time for each guest.';
      S.seen = {}; S.seen[0] = 1; S.tg = 1; draw(); };
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
    if (S.step < LAST){ S.step++; if (S.step === ROOMS && !needRooms()) { autoRooms(stayRooms()); S.step++; } draw(); return; }
    // CONNECT: create the booking (server) -> Stripe PaymentIntent -> stripe.confirmPayment(); show the confirmation on success.
    // Test mode: simulate a successful Stripe payment. No request is sent anywhere.
    { const pr = price(); S.paid = pr ? { method: S.pm, amount: pr.now, id: 'pi_test_' + Math.random().toString(36).slice(2, 14) } : null; }
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
    setTimeout(() => { S.paying = false; S.ref = 'YC-' + Math.random().toString(36).slice(2, 8).toUpperCase(); draw(); }, 1400);
  }
  loadLive();

  if (PAGE) {
    const q = new URLSearchParams(location.search), k = q.get('b'), tr = q.get('tr'), pr = q.get('promo');
    if (pr) findPromo(pr).then(x => { if (x) { S.promo = { code: pr.toUpperCase(), type: x.type, value: x.value, on: x.on }; draw(); } });
    open(k || undefined, tr || undefined);
    if (k || tr) history.replaceState(null, '', 'book.html');   // a reload keeps the booking in progress instead of starting again
  }
})();
