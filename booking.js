/* ===== York Cottage checkout =====
   Prices, days and policies follow the current yorkcottagespa.com pages and terms.
   DEMO: there is no live availability or payment yet. Connect a booking system / Stripe at the
   two places marked CONNECT below. */
(() => {
  const P = {
    day:    { name:'Day Spa', group:'Spa', kind:'pay', price:100, per:'per person', min:1, max:8, sessions:['Morning','Afternoon'], treat:true, food:true,
              blurb:'20-minute massage or facial, afternoon tea or grazing board, spa pool, sauna & lounge.' },
    access: { name:'Spa Access', group:'Spa', kind:'pay', price:50, per:'per person', min:1, max:8, sessions:['Morning','Afternoon','Evening'],
              blurb:'Hot tub, sauna and lounge with hot & cold refreshments, towel and robe.' },
    private:{ name:'Private Spa', group:'Spa', kind:'ask', min:1, max:16, sessions:['Morning','Afternoon','Evening'],
              blurb:'The spa reserved just for your group. Send a request and we’ll confirm a price.' },
    break:  { name:'Overnight Spa Break', group:'Stay', kind:'pay', price:145, per:'per person, per night', min:1, max:6, rule:'mid', nights:[1,2], treat:true,
              blurb:'Sunday–Thursday. Ensuite room, evening grazing board, 20-minute treatment, afternoon spa.' },
    group:  { name:'Group Spa Break', group:'Stay', kind:'pay', price:145, per:'per person', min:7, max:16, rule:'mid', nights:[1], treat:true,
              blurb:'Sunday–Thursday, 7+ guests. Grazing board, 20-minute treatments, private spa access.' },
    house:  { name:'Whole House & Spa', group:'House', kind:'pay', price:115, per:'per person, per night', min:2, max:16, rule:'wkd',
              blurb:'Friday–Sunday and bank holidays. 8 bedrooms, up to 16 guests, the house and spa to yourselves.' },
    treat:  { name:'Treatments only', group:'Treat', kind:'pay', price:0, per:'', min:1, max:6, sessions:['Morning','Afternoon'], only:true,
              blurb:'Just here for a massage, facial or head spa? Choose your treatments with no spa session.' }
  };
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
  const TRi = Object.fromEntries(TR.map(t => [t.id, t]));
  const HEAD_OFF = 0.10; // 10% off head spa when booked with a spa session
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
    const p = P[k];
    if (!p.rule) return true;
    if (p.rule === 'mid') return nightOK('mid', d) && (S.nights < 2 || nightOK('mid', add(d, 1)));
    return nightOK('wkd', d) && !nightOK('wkd', add(d, -1));            // whole-house stays start at the beginning of a weekend
  }

  const S = { step:0 };
  const reset = k => Object.assign(S, { p:k || null, step:k ? 1 : 0, date:null, nights:k && P[k].nights ? P[k].nights[0] : 1, session:null,
    guests:k ? Math.max(P[k].min, k === 'group' ? 8 : k === 'treat' ? 1 : 2) : 2, picks:[], adds:[], pending:null, tg:0, cat:null, pm:'card', paid:null, d:{}, agree:false, adult:false, mkt:false, month:null, ref:null, paying:false });

  const steps = () => ['Choose', 'Date', 'Guests', 'Treatments', 'Details', S.p && P[S.p].kind === 'ask' ? 'Send' : 'Pay'];
  const LAST = 5, DETAILS = 4;
  function syncAdds(){
    while (S.adds.length < S.guests) S.adds.push([]); S.adds.length = S.guests;
    if (S.pending){ if (!S.adds[0].includes(S.pending)) S.adds[0].push(S.pending); S.pending = null; }
  }
  function treatCost(){
    let sub = 0, off = 0;
    S.adds.forEach(a => a.forEach(id => { const t = TRi[id]; sub += t.price; if (t.head && !P[S.p].only) off += t.price * HEAD_OFF; }));
    return { sub, off, n: S.adds.reduce((n, a) => n + a.length, 0) };
  }
  const treatLines = (sep, withMin) => S.adds.map((a, i) => a.length ? `Guest ${i + 1}: ` + a.map(id => TRi[id].name + (withMin ? ' (' + TRi[id].min + ' min)' : '')).join(', ') : '').filter(Boolean).join(sep);

  function price(){
    const p = P[S.p]; if (!p || p.kind === 'ask') return null;
    const nights = p.rule === 'wkd' ? S.nights : (p.nights ? S.nights : 0);
    const base = p.price * S.guests * (nights || 1), tc = treatCost();
    const total = base + tc.sub - tc.off;
    let now = total, bal = 0, balDue = null;
    if (S.p === 'house' && S.date && (S.date - today) / 864e5 > 42){ now = total / 2; bal = total - now; balDue = add(S.date, -42); }
    return { base, tc, total, now, bal, balDue, nights };
  }

  // ---------- shell ----------
  const box = document.createElement('div');
  box.className = 'bk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Book York Cottage Spa');
  box.innerHTML = `<div class="bk-box"><div class="bk-main"><div class="bk-top"><span class="logo"><b>York Cottage</b><span>Book your visit</span></span><button class="bk-x" aria-label="Close">&times;</button></div><ol class="bk-steps"></ol><div class="bk-body"></div><div class="bk-nav"></div></div><aside class="bk-side"></aside></div>`;
  document.body.appendChild(box);
  const body = $('.bk-body', box), nav = $('.bk-nav', box), side = $('.bk-side', box), stepsEl = $('.bk-steps', box);

  function open(k, tr){ reset(P[k] ? k : null); if (TRi[tr]) S.pending = tr; if (S.p) syncAdds(); box.classList.add('on'); document.body.classList.add('bk-open'); draw(); $('.bk-x', box).focus(); }
  function close(){ box.classList.remove('on'); document.body.classList.remove('bk-open'); }
  $('.bk-x', box).onclick = close;
  box.addEventListener('click', e => { if (e.target === box) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-book]'); if (!a) return;
    e.preventDefault(); document.body.classList.remove('open'); open(a.dataset.book, a.dataset.tr);
  });

  // ---------- steps ----------
  function draw(){
    const st = steps();
    stepsEl.innerHTML = S.ref ? '' : st.map((t, i) => `<li class="${i === S.step ? 'now' : i < S.step ? 'done' : ''}"><i>${i < S.step ? '✓' : i + 1}</i><b>${t}</b></li>`).join('');
    body.innerHTML = S.ref ? doneView() : [chooseView, dateView, guestView, treatView, detailView, payView][S.step]();
    navView(); sideView(); wire();
    $('.bk-main', box).scrollTop = 0; box.scrollTop = 0;
  }

  function chooseView(){
    const grp = g => Object.entries(P).filter(([, p]) => p.group === g).map(([k, p]) => `<button class="bk-opt ${S.p === k ? 'sel' : ''}" data-p="${k}"><small>${p.rule === 'mid' ? 'Sun – Thu' : p.rule === 'wkd' ? 'Fri – Sun & bank hols' : p.only ? 'No spa session' : 'Day visit'}</small><b>${p.name}</b><span>${p.blurb}</span><em>${p.only ? 'From £50' : p.price ? gbp(p.price) + ' ' + p.per : 'Price on request'}</em></button>`).join('');
    const pend = S.pending ? `<div class="notice"><b>${TRi[S.pending].name}</b> is ready to add. Book it on its own, or add it to a spa day or a stay (Japanese head spa is 10% off with a spa session or stay).</div>` : '';
    const TABS = [['Spa', 'Spa day', 'Day Spa, Spa Access or the Private Spa'], ['Stay', 'Overnight stay', 'Ensuite rooms, Sunday to Thursday'], ['House', 'Exclusive use', 'The whole house & spa at weekends'], ['Treat', 'Treatments only', 'Massage, facials & head spa']];
    if (!S.cat) S.cat = S.p ? P[S.p].group : S.pending ? 'Treat' : 'Spa';
    const tabs = `<div class="bk-tabs" role="tablist">${TABS.map(([g, t, d]) => `<button role="tab" aria-selected="${S.cat === g}" class="bk-tab ${S.cat === g ? 'sel' : ''}" data-cat="${g}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
    return `<h2>What would you like to <em>book</em>?</h2><p class="bk-sub">Pick a type, then an option. You can add treatments to any booking.</p>${pend}${tabs}
      <div class="bk-opts ${S.cat === 'House' || S.cat === 'Treat' ? 'one' : ''}">${grp(S.cat)}</div>`;
  }

  function dateView(){
    const p = P[S.p];
    const m = S.month || (S.date ? new Date(S.date.getFullYear(), S.date.getMonth(), 1) : new Date(first.getFullYear(), first.getMonth(), 1));
    S.month = m;
    const startW = (m.getDay() + 6) % 7, dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const endSel = S.date && p.rule ? add(S.date, S.nights) : null;
    let cells = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<span class="dw">${d}</span>`).join('') + '<span></span>'.repeat(startW);
    for (let i = 1; i <= dim; i++){
      const d = new Date(m.getFullYear(), m.getMonth(), i), ok = dateOK(S.p, d);
      let c = BH.has(iso(d)) ? 'bh' : '';
      if (S.date && +d === +S.date) c += ' sel';
      else if (endSel && d > S.date && d < endSel) c += ' in';
      else if (endSel && +d === +endSel) c += ' end';
      cells += `<button data-d="${iso(d)}" class="${c}" ${ok ? '' : 'disabled'} aria-label="${nice(d, { year:'numeric' })}">${i}</button>`;
    }
    const prevOK = new Date(m.getFullYear(), m.getMonth(), 0) >= first, nextOK = new Date(m.getFullYear(), m.getMonth() + 1, 1) <= last;
    let right = '';
    if (p.sessions) right = `<div class="bk-group">Session</div><div class="pills">${p.sessions.map(s => `<button class="pill ${S.session === s ? 'sel' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
      <p class="cal-note" style="margin-top:14px">We’ll send exact session times with your confirmation.</p>`;
    else if (p.nights && p.nights.length > 1) right = `<div class="bk-group">How many nights?</div><div class="pills">${p.nights.map(n => `<button class="pill ${S.nights === n ? 'sel' : ''}" data-n="${n}">${n} night${n > 1 ? 's' : ''}</button>`).join('')}</div>`;
    if (p.rule){
      right += `<div class="bk-group">Your stay</div>` + (S.date
        ? `<p style="font-size:15.5px"><b>Arrive</b> ${nice(S.date)} from 4pm<br><b>Leave</b> ${nice(add(S.date, S.nights))} by 11am<br><span style="color:var(--muted)">${S.nights} night${S.nights > 1 ? 's' : ''}</span></p>`
        : `<p class="cal-note">${p.rule === 'mid' ? 'Breaks run Sunday to Thursday nights.' : 'Whole-house stays run Friday to Sunday, with an extra night when there’s a bank holiday.'} Pick your arrival day.</p>`);
    }
    return `<h2>Choose your <em>${p.rule ? 'dates' : 'day'}</em></h2><p class="bk-sub">${p.name}${p.rule === 'mid' ? ' · Sunday to Thursday' : p.rule === 'wkd' ? ' · weekends & bank holidays' : ''}</p>
      <div class="bk-row"><div class="cal"><div class="cal-h"><button data-m="-1" ${prevOK ? '' : 'disabled'} aria-label="Previous month">‹</button><b>${m.toLocaleDateString('en-GB', { month:'long', year:'numeric' })}</b><button data-m="1" ${nextOK ? '' : 'disabled'} aria-label="Next month">›</button></div>
      <div class="cal-g">${cells}</div><div class="cal-note"><span><i></i>Bank holiday</span></div></div><div>${right}</div></div>`;
  }

  function guestView(){
    const p = P[S.p];
    while (S.picks.length < S.guests) S.picks.push({ treat:'Aromatherapy massage', food:'Afternoon tea' });
    S.picks.length = S.guests; syncAdds();
    let h = `<h2>Who’s <em>coming</em>?</h2><p class="bk-sub">${p.name} · ${p.min === p.max ? p.min : p.min + '–' + p.max} guests${S.p === 'break' ? ' · ensuite rooms sleep 2' : ''}</p>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"><div class="stepper"><button data-g="-1" ${S.guests <= p.min ? 'disabled' : ''} aria-label="Fewer guests">−</button><output>${S.guests}</output><button data-g="1" ${S.guests >= p.max ? 'disabled' : ''} aria-label="More guests">+</button></div>
      <span style="color:var(--muted)">guest${S.guests > 1 ? 's' : ''}${S.p === 'break' ? ' · ' + Math.ceil(S.guests / 2) + ' room' + (S.guests > 2 ? 's' : '') : ''}${S.p === 'group' ? ' · for 6 or fewer, choose an Overnight Spa Break' : ''}</span></div>`;
    if (p.treat || p.food){
      h += `<div class="bk-group" style="margin-top:30px">Included for each guest</div>`;
      h += S.picks.map((g, i) => `<div class="guest"><b>Guest ${i + 1}</b>
        ${p.treat ? `<div class="pills">${['Aromatherapy massage','Facial'].map(t => `<button class="pill ${g.treat === t ? 'sel' : ''}" data-pk="${i}" data-f="treat" data-v="${t}">${t}</button>`).join('')}</div>` : ''}
        ${p.food ? `<div class="pills">${['Afternoon tea','Grazing board'].map(t => `<button class="pill ${g.food === t ? 'sel' : ''}" data-pk="${i}" data-f="food" data-v="${t}">${t}</button>`).join('')}</div>` : ''}</div>`).join('');
    }
    return h;
  }

  function treatView(){
    const p = P[S.p]; syncAdds();
    const g = Math.min(S.tg || 0, S.guests - 1); S.tg = g;
    const tabs = S.guests > 1 ? `<div class="pills" style="margin-bottom:8px">${S.adds.map((a, i) => `<button class="pill ${i === g ? 'sel' : ''}" data-gt="${i}">Guest ${i + 1}${a.length ? ' · ' + a.length : ''}</button>`).join('')}</div>` : '';
    const cats = [...new Set(TR.map(t => t.cat))];
    const list = cats.map(c => `<div class="bk-group">${c}${c === 'Japanese Head Spa' && !p.only ? ' · 10% off with your booking' : ''}</div><div class="tr-list">` + TR.filter(t => t.cat === c).map(t => {
      const on = S.adds[g].includes(t.id), full = !on && S.adds[g].length >= 3;
      const pr = t.head && !p.only ? `<s>${gbp(t.price)}</s> ${gbp(t.price * (1 - HEAD_OFF))}` : gbp(t.price);
      return `<button class="tr-opt ${on ? 'sel' : ''}" data-add="${t.id}" data-gi="${g}" ${full ? 'disabled' : ''}><span class="tr-tick">${on ? '✓' : '+'}</span><span class="tr-txt"><b>${t.name}</b><span>${t.desc}</span></span><span class="tr-pr"><b>${pr}</b><small>${t.min} min</small></span></button>`;
    }).join('') + '</div>').join('');
    const when = p.rule ? 'We’ll schedule treatments during your stay and confirm the times by email.' : 'We’ll fit treatments around your visit and confirm the times by email.';
    return `<h2>${p.only ? 'Choose your <em>treatments</em>' : 'Add <em>treatments</em>'}</h2>
      <p class="bk-sub">${p.only ? 'Pick at least one treatment.' : (p.treat ? 'Your 20-minute treatment is already included. ' : '') + 'Add massages, facials or a Japanese head spa for anyone in your group. This step is optional.'} ${when}${S.guests > 1 ? ' Choose a guest, then their treatments.' : ''}</p>${tabs}${list}`;
  }

  function detailView(){
    const f = (id, label, type = 'text', ac = '', err = 'Please fill this in') => `<div class="bk-field" data-fd="${id}"><label for="bk_${id}">${label}</label><input id="bk_${id}" type="${type}" autocomplete="${ac}" value="${esc(S.d[id])}"><span class="err">${err}</span></div>`;
    const ageLine = (S.p === 'private' || S.p === 'house')
      ? 'The person booking is 18 or over. Under-16s may use the spa only during a Private Spa session or a whole-house booking.'
      : 'Everyone in my booking is 18 or over.';
    return `<h2>Your <em>details</em></h2><p class="bk-sub">We’ll send your confirmation here.</p>
      <div class="bk-2">${f('first', 'First name', 'text', 'given-name')}${f('last', 'Last name', 'text', 'family-name')}</div>
      <div class="bk-2">${f('email', 'Email', 'email', 'email', 'Please enter a valid email')}${f('phone', 'Phone', 'tel', 'tel', 'Please enter a phone number')}</div>
      <div class="bk-field"><label for="bk_notes">Anything we should know? <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea id="bk_notes" rows="3" placeholder="Dietary needs, celebrations, accessibility…">${esc(S.d.notes)}</textarea></div>
      <div class="notice"><b>Treatments:</b> each guest fills in a short consultation form before their treatment. Please tell us about any health conditions or pregnancy.</div>
      <label class="check" data-ck="adult"><input type="checkbox" id="bkAdult" ${S.adult ? 'checked' : ''}> ${ageLine}</label>
      <label class="check" data-ck="agree"><input type="checkbox" id="bkAgree" ${S.agree ? 'checked' : ''}> I agree to the <a href="https://www.yorkcottagespa.com/terms-conditions" target="_blank" rel="noopener">terms &amp; conditions</a> and the ${S.p === 'house' ? 'House Welcome Guide' : 'booking policy'} below.</label>
      <div class="notice">${POLICY[P[S.p].kind === 'ask' ? 'ask' : S.p === 'house' ? 'house' : P[S.p].rule ? 'stay' : 'spa']}${S.p === 'house' ? '<br><br>Up to 16 guests. No parties or events, no pets (working animals welcome), no smoking or vaping indoors and no candles in the house.' : ''}</div>
      <label class="check"><input type="checkbox" id="bkMkt" ${S.mkt ? 'checked' : ''}> Send me occasional news and offers from York Cottage (optional).</label>`;
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
      ${pr.bal ? `<div class="notice"><b>Paying ${gbp(pr.now)} today</b> (50% deposit). The balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}. A £500 damage deposit will be pre-authorised before arrival.</div>`
        : S.p === 'house' ? `<div class="notice"><b>Paying in full today</b> because your stay is within 6 weeks. A £500 damage deposit will be pre-authorised before arrival.</div>` : ''}`;
  }

  function reviewList(){
    const p = P[S.p], d = S.d;
    const when = p.rule ? `${nice(S.date)} – ${nice(add(S.date, S.nights), { year:'numeric' })} (${S.nights} night${S.nights > 1 ? 's' : ''})` : `${nice(S.date, { year:'numeric' })} · ${S.session}`;
    const picks = (p.treat || p.food) ? S.picks.map((g, i) => `Guest ${i + 1}: ${[p.treat && g.treat, p.food && g.food].filter(Boolean).join(', ')}`).join('<br>') : '';
    const rows = [['Booking', p.name], ['When', when], ['Guests', S.guests + (S.p === 'break' ? ` · ${Math.ceil(S.guests / 2)} room${S.guests > 2 ? 's' : ''}` : '')], picks && ['Included', picks], treatCost().n && ['Treatments', treatLines('<br>', true)],
      ['Name', esc(d.first + ' ' + d.last)], ['Contact', esc(d.email) + '<br>' + esc(d.phone)], d.notes && ['Notes', esc(d.notes)]].filter(Boolean);
    return `<div class="pay" style="margin-bottom:18px"><ul class="sum" style="color:var(--ink)">${rows.map(([a, b]) => `<li><span style="color:var(--muted)">${a}</span><b>${b}</b></li>`).join('')}</ul></div>`;
  }

  function doneView(){
    const p = P[S.p], ask = p.kind === 'ask', pr = price();
    const mail = ask ? 'mailto:info@yorkcottagespa.com?subject=' + encodeURIComponent('Private Spa request ' + S.ref) + '&body=' + encodeURIComponent(
      `Hello York Cottage,\n\nI'd like to book a Private Spa session.\n\nDate: ${nice(S.date, { year:'numeric' })}\nSession: ${S.session}\nGuests: ${S.guests}\n${treatCost().n ? 'Treatments: ' + treatLines('; ') + '\n' : ''}Name: ${S.d.first} ${S.d.last}\nPhone: ${S.d.phone}\n${S.d.notes ? 'Notes: ' + S.d.notes + '\n' : ''}\nThank you!`) : '';
    return `<div class="done-ico"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg></div>
      <h2>${ask ? 'Request <em>ready</em>' : 'You’re <em>booked</em>'}, ${esc(S.d.first)}</h2>
      <p class="bk-sub">${ask ? 'Your reference is below.' : `${S.paid ? (S.paid.method === 'klarna' ? `First Klarna payment of ${gbp(Math.floor(S.paid.amount / 3 * 100) / 100)} taken, 2 more to follow. ` : `${gbp(S.paid.amount)} paid by card. `) : ''}We’ve emailed your confirmation to ${esc(S.d.email)}.<br><span style="font-size:13px">Stripe test payment ${S.paid ? S.paid.id : ''} · no money was taken.</span>`}</p>
      <div class="ref">${S.ref}</div>
      <ol class="next">${ask
        ? `<li>Press “Email your request” to send it to us from your email.</li><li>We’ll check the date and reply with a price.</li><li>Confirm and pay, and the spa is yours.</li>`
        : `<li>Look out for your confirmation email with session times and directions.</li><li>${p.treat || treatCost().n ? 'Complete the short consultation form for each guest before your visit.' : 'Bring your swimwear; towels and robes are waiting for you.'}</li>${pr && pr.bal ? `<li>Your balance of ${gbp(pr.bal)} is due by ${nice(pr.balDue, { year:'numeric' })}.</li>` : ''}<li>${p.rule ? 'Check in from 4pm on ' + nice(S.date) + '.' : 'Arrive a few minutes before your session on ' + nice(S.date) + '.'}</li>`}</ol>
      <div class="hero-cta">${ask ? `<a class="btn btn-solid" href="${mail}">Email your request <span class="arrow">&rarr;</span></a>` : ''}<button class="btn btn-ghost" data-close>Back to the site</button></div>`;
  }

  // ---------- validation ----------
  function problem(){
    const p = P[S.p];
    if (S.step === 0) return S.p ? '' : 'Choose what you’d like to book';
    if (S.step === 1){ if (!S.date) return p.rule ? 'Choose your arrival day' : 'Choose a day'; if (p.sessions && !S.session) return 'Choose a session'; }
    if (S.step === 3 && P[S.p].only && !treatCost().n) return 'Choose at least one treatment';
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
    if (S.ref){ nav.innerHTML = ''; return; }
    const last = S.step === LAST, ask = S.p && P[S.p].kind === 'ask', pr = price();
    const label = last ? (ask ? 'Send request' : S.pm === 'klarna' ? 'Continue with Klarna' : `Pay ${gbp(pr.now)}`) : 'Continue';
    nav.innerHTML = `${S.step ? '<button class="back">← Back</button>' : '<span></span>'}<span class="bk-msg"></span><button class="btn btn-solid go">${S.paying ? '<span class="spin"></span> ' + (S.pm === 'klarna' && !ask ? 'Opening Klarna…' : 'Processing…') : label + ' <span class="arrow">→</span>'}</button>`;
  }

  function sideView(){
    const p = P[S.p], pr = price();
    if (!p){ side.innerHTML = `<div class="eyebrow">Your booking</div><h3>Nothing chosen yet</h3><p class="sum-empty">Pick a spa day or a stay to see your total here.</p><p class="foot-note">Questions? Call 01933 580 100 or message us on WhatsApp.</p>`; return; }
    const rows = [['Booking', p.name], S.date && ['Date', p.rule ? `${nice(S.date)} → ${nice(add(S.date, S.nights))}` : nice(S.date)], S.session && ['Session', S.session],
      ['Guests', S.guests], pr && !p.only && ['Price', `${gbp(p.price)} × ${S.guests}${pr.nights > 1 ? ' × ' + pr.nights + ' nights' : ''}`],
      pr && pr.tc.n && ['Treatments', `${pr.tc.n} · ${gbp(pr.tc.sub)}`], pr && pr.tc.off && ['Head spa 10% off', '−' + gbp(pr.tc.off)],
      !pr && treatCost().n && ['Treatments', treatCost().n + ' requested']].filter(Boolean);
    side.innerHTML = `<div class="eyebrow">Your booking</div><h3>${p.name}</h3><ul class="sum">${rows.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join('')}</ul>
      <div class="sum-tot">${pr ? `<div class="big"><span>Total</span><b>${gbp(pr.total)}</b></div>${pr.bal ? `<p>${gbp(pr.now)} deposit today, ${gbp(pr.bal)} by ${nice(pr.balDue)}.</p>` : '<p>Paid in full today. VAT included.</p>'}` : `<div class="big"><span>Price</span><b style="font-size:26px">On request</b></div><p>Nothing to pay now.</p>`}<button class="sum-toggle">Details</button></div>
      <p class="foot-note">Questions? Call 01933 580 100 or message us on WhatsApp.</p>`;
    const t = $('.sum-toggle', side); if (t) t.onclick = () => side.classList.toggle('full');
  }

  // ---------- events ----------
  function wire(){
    body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { S.cat = b.dataset.cat; draw(); });
    body.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; if (k !== S.p){ const pend = S.pending, cat = S.cat; reset(k); S.pending = pend; S.cat = cat; syncAdds(); } S.step = 1; draw(); });
    body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + +b.dataset.m, 1); draw(); });
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const [y, m, d] = b.dataset.d.split('-').map(Number); S.date = new Date(y, m - 1, d); if (S.p === 'house') S.nights = runFrom(S.date); draw(); });
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.session = b.dataset.s; draw(); });
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { S.nights = +b.dataset.n; if (S.date && !dateOK(S.p, S.date)) S.date = null; draw(); });
    body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const p = P[S.p]; S.guests = Math.min(p.max, Math.max(p.min, S.guests + +b.dataset.g)); draw(); });
    body.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { S.picks[+b.dataset.pk][b.dataset.f] = b.dataset.v; draw(); });
    body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const g = S.adds[+b.dataset.gi], id = b.dataset.add, i = g.indexOf(id); if (i >= 0) g.splice(i, 1); else if (g.length < 3) g.push(id); draw(); });
    body.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { S.pm = b.dataset.pm; draw(); });
    body.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { S.tg = +b.dataset.gt; draw(); });
    ['first','last','email','phone','notes'].forEach(k => { const el = $('#bk_' + k, body); if (el) el.oninput = () => { S.d[k] = el.value; el.closest('.bk-field').classList.remove('bad'); }; });
    [['#bkAdult','adult'],['#bkAgree','agree'],['#bkMkt','mkt']].forEach(([s, k]) => { const el = $(s, body); if (el) el.onchange = () => { S[k] = el.checked; el.closest('.check').classList.remove('bad'); }; });
    const c = body.querySelector('[data-close]'); if (c) c.onclick = close;
    const back = $('.back', nav); if (back) back.onclick = () => { S.step--; draw(); };
    const go = $('.go', nav); if (go) go.onclick = next;
  }

  function next(){
    if (S.paying) return;
    const pb = problem(), msg = $('.bk-msg', nav);
    if (pb){
      if (typeof pb === 'string'){ msg.textContent = pb; return; }
      if (pb.bad){ pb.bad.forEach(k => $(`[data-fd="${k}"]`, body).classList.add('bad')); msg.textContent = 'Please check the highlighted fields'; $(`#bk_${pb.bad[0]}`, body).focus(); return; }
      if (pb.ck){ $(`[data-ck="${pb.ck}"]`, body).classList.add('bad'); msg.textContent = pb.ck === 'adult' ? 'Please confirm the age requirement' : 'Please agree to the terms to continue'; return; }
    }
    if (S.step < LAST){ S.step++; draw(); return; }
    // CONNECT: create the booking (server) -> Stripe PaymentIntent -> stripe.confirmPayment(); show the confirmation on success.
    // Test mode: simulate a successful Stripe payment. No request is sent anywhere.
    { const pr = price(); S.paid = pr ? { method: S.pm, amount: pr.now, id: 'pi_test_' + Math.random().toString(36).slice(2, 14) } : null; }
    S.paying = true; navView();
    setTimeout(() => { S.paying = false; S.ref = 'YC-' + Math.random().toString(36).slice(2, 8).toUpperCase(); draw(); }, P[S.p].kind === 'ask' ? 400 : 1400);
  }
})();
