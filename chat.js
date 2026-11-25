/* York Cottage AI chat - on every page.
   Answers from the spa's own facts. If YC_CHAT.endpoint is set (see chat-worker/), questions go to Claude
   through that small server; otherwise the built-in answers below are used. Email is always the last resort. */
window.YC_CHAT = Object.assign({ endpoint: '', email: 'info@yorkcottagespa.com', phone: '01933 580 100' }, window.YC_CHAT || {});

(() => {
  const C = window.YC_CHAT;
  // Every answer below comes from the York Cottage Spa website (pages, FAQs and terms).
  const KB = [
    { k: ['day spa time', 'session time', 'what time', 'when are', 'sessions', 'opening', 'open'], a: 'Day Spa sessions are 4 hours: morning 09:30–13:30 or afternoon 13:00–17:00. Spa Access sessions start at 09:30 or 14:00, with evening sessions on some days. On spa breaks, spa time is usually 14:00–18:00 (Monday to Thursday) and 18:00–22:30 on Sundays.', book: 'day' },
    { k: ['day spa', 'spa day', 'package'], a: 'The Day Spa is £100 per person for a 4-hour session. It includes a 20-minute aromatherapy massage or facial, afternoon tea or a sweet & savoury grazing board, hot and cold drinks, and the spa pool, sauna and lounge with towel and robe.', book: 'day' },
    { k: ['spa access', 'access only', 'just the spa', 'spa only', 'hot tub only'], a: 'Spa Access is £50 per person for a 4-hour session: the spa pool, sauna and lounge, with hot and cold drinks, towel and robe.', book: 'access' },
    { k: ['private spa', 'just us', 'exclusive spa', 'private session'], a: 'The Private Spa is from £100 per person, for a minimum of 4 guests (6 on Sundays, from 11:30). You get the spa to yourselves for the session, with food, drinks and a 20-minute massage or luxury facial each.', book: 'private' },
    { k: ['how many people', 'busy', 'capacity', 'other guests', 'share the spa'], a: 'On Day Spa sessions we aim for a maximum of 6 people in the spa. Capacity is 12, but we limit shared sessions so you have plenty of space.' },
    { k: ['overnight', 'spa break', 'stay the night', 'room', 'one night', '2 night', 'two night', 'accommodation'], a: 'Overnight Spa Breaks are £145 per person for 1 night (Sunday to Thursday) or £220 per person for 2 nights (arriving Sunday to Wednesday), based on 2 sharing a king ensuite room. They include a grazing board, a 20-minute aromatherapy massage each, drinks and spa time. Check-out is 11:00.', book: 'break' },
    { k: ['check-in', 'check in', 'check-out', 'check out', 'arrive', 'arrival'], a: 'On spa breaks, check-in is from 13:30 Monday to Thursday, and check-out is 11:00. Whole-house stays check in from 16:00 and check out by 11:00. You’re welcome to enjoy the house and gardens after checking out of a spa break.' },
    { k: ['group', '7 ', 'seven', 'friends', 'team'], a: 'Group Spa Breaks are for 7 to 16 guests, Sunday to Thursday, from £145 per person. You get up to 8 rooms, the spa just for your group, a grazing board or afternoon tea and a 20-minute massage each.', book: 'group' },
    { k: ['whole house', 'exclusive use', 'the house', 'weekend', '16 guests', 'hire'], a: 'The whole house and spa is from £1,840 per night for up to 16 guests, with a 2-night minimum on Friday and Saturday. It has 8 bedrooms, a full kitchen, 2 living rooms and exclusive use of the spa pool, hot tub and sauna. A 50% deposit is taken, with the balance due 6 weeks before.', book: 'house' },
    { k: ['1 night', 'one night house', 'midweek', 'mid-week'], a: 'The whole house has a 2-night minimum on Fridays and Saturdays. Midweek (Sunday to Thursday) stays may be possible; please email the team.', human: true },
    { k: ['damage deposit', 'deposit'], a: 'For whole-house stays, a £500 card pre-authorisation is taken via a link sent within 48 hours of check-in, and released within 48 hours of check-out after the property check.' },
    { k: ['treatment', 'massage', 'facial', 'menu'], a: 'Treatments: Back to Basics Facial (30 min, £50), Recipe for Radiance Facial (45 min, £70), Tension Melt or Scalp, Neck & Shoulder massage (30 min, £50 each), Recipe for Relaxation Massage (45 min, £70) and Relax & Unwind Full Body Massage (60 min, £80). Add them to any booking or book them on their own.', link: ['See the treatments', 'treatments.html'] },
    { k: ['head spa', 'japanese', 'scalp', 'zen', 'ritual', 'renewal'], a: 'Japanese Head Spa: The Classic Renewal (60 min, £90), The Radiance Ritual (70 min, £115) and The Ultimate Zen Experience (80 min, £145). They’re 10% off when booked with a spa session or stay.', link: ['See the head spa', 'treatments.html#head-spa'] },
    { k: ['pregnan'], a: 'Yes. Our therapists are trained in pregnancy massage. Just tell us you’re pregnant at your consultation on arrival.' },
    { k: ['blue light', 'nhs', 'discount'], a: 'Blue Light Card holders get their included treatments upgraded to 30 minutes.' },
    { k: ['parking', 'park', 'car park'], a: 'Yes, there’s plenty of free parking.' },
    { k: ['charger', 'electric car', 'ev '], a: 'We have one electric car charger, available on a first come, first served basis.' },
    { k: ['wifi', 'wi-fi', 'internet'], a: 'Yes, free Wi-Fi is available throughout the property.' },
    { k: ['vat', 'receipt', 'invoice'], a: 'Yes. Send us a message and we’ll arrange a VAT receipt.', human: true },
    { k: ['luggage', 'bags', 'suitcase'], a: 'Yes, we’re happy to store your luggage before or after your check-in.' },
    { k: ['kitchen', 'cook', 'cooking'], a: 'Spa break guests can use the communal guest kitchen, with an oven and cooking equipment. Whole-house stays have a full kitchen.' },
    { k: ['takeaway', 'take away', 'deliver'], a: 'Yes, many guests order a takeaway. Indian, Chinese, Italian and Turkish takeaways deliver to us, and the menus are in the house guide.' },
    { k: ['own food', 'own drink', 'bring food', 'bring drink', 'alcohol', 'wine'], a: 'You’re welcome to bring your own snacks and drinks. We can supply bowls, cutlery and glassware.' },
    { k: ['food', 'eat', 'afternoon tea', 'grazing', 'vegan', 'veggie', 'vegetarian', 'allerg', 'gluten', 'nut'], a: 'Day spa guests choose afternoon tea or a sweet & savoury grazing board, made by Desired Desserts. We cater for all dietary needs, including vegan, vegetarian and allergies. Just tell us when you book.' },
    { k: ['breakfast'], a: 'Continental breakfast is £10 per person and needs to be pre-ordered with your stay.' },
    { k: ['age', 'child', 'kid', 'teen', 'under 18', '16', 'baby'], a: '16 and 17-year-olds are welcome at Day Spa sessions with an adult. Under-16s can use the spa only during a Private Spa session or a whole-house booking. Under-18s can’t join spa breaks, and the person booking must be 18 or over.' },
    { k: ['dog', 'dogs', 'my dog', 'bring my dog', 'pet', 'pets', 'animal'], a: 'Pets aren’t allowed, but working animals are welcome.' },
    { k: ['cancel', 'refund', 'reschedule', 'change my', 'move my'], a: 'Spa days are non-refundable, but you can move your visit (subject to availability) by emailing at least 30 days before. Spa breaks are refundable with 30+ days’ notice. Whole house: 6+ months’ notice and you can move your dates; 6+ weeks, the deposit is kept; under 6 weeks, the full cost is kept.' },
    { k: ['expire', 'expiry', 'valid', 'vouchers expire', 'voucher expire', 'voucher last'], a: 'Gift vouchers must be used within 12 months of issue.' },
    { k: ['redeem', 'voucher code', 'use my voucher', 'use a voucher'], a: 'Enter the code on your voucher in the gift voucher box when you pay, and bring the voucher with you on arrival.' },
    { k: ['voucher', 'gift'], a: 'Gift vouchers: Day Spa £90 (usually £100), Day Spa for Two £181 (usually £200) and an Ensuite Spa Break for 2 with grazing platter and massages, £290. They’re valid for 12 months.', link: ['Gift vouchers', 'gift-vouchers.html'] },
    { k: ['yoga'], a: 'Private yoga sessions are from £15 per person for 45 minutes, for groups of 6 or more, in the gardens or the yoga space.', link: ['Yoga', 'yoga.html'] },
    { k: ['chef'], a: 'We can put you in touch with a private chef, from relaxed family meals to tasting menus, for one night or a whole weekend. Please email the team.', human: true },
    { k: ['wedding', 'marquee', 'tipi'], a: 'For weddings and special occasions there’s room for a marquee or tipi for up to 60, accommodation for 16 (including a bridal suite), exclusive spa use and free parking for 20 cars. Please email the team to plan.', human: true, link: ['Parties & events', 'events.html'] },
    { k: ['hen', 'party', 'birthday', 'celebrat'], a: 'For hen parties and celebrations, the whole house sleeps 16 with exclusive spa use, plus options like yoga, BBQs, a private chef and cocktail making. External catering is allowed.', link: ['Parties & events', 'events.html'], book: 'house' },
    { k: ['corporate', 'meeting', 'business', 'retreat', 'work'], a: 'For corporate retreats and meetings there’s a boardroom seating 16, marquee space for up to 100, free parking and wellness sessions. Please email the team for day delegate rates.', human: true, link: ['Corporate', 'corporate.html'] },
    { k: ['things to do', 'activities', 'vineyard', 'horse', 'riding', 'watersport', 'wakeboard'], a: 'Nearby: wine tasting at a vineyard about 10 minutes away, horse riding a 10-minute walk away, and wakeboarding and paddleboarding at Xtreme Wake, Grendon Lakes (about 3 miles).', link: ['Recommendations', 'recommendations.html'] },
    { k: ['pub', 'restaurant', 'dinner', 'eat out'], a: 'The Red Lion is a walk away in Bozeat. About 10 minutes’ drive in Olney are The Bull, Capadocia (Turkish) and Gabriella’s (Italian).', link: ['Local pubs & restaurants', 'local-dining.html'] },
    { k: ['taxi', 'cab'], a: 'Lee Cabs of Wellingborough is our recommended taxi firm, with an app for booking and paying.' },
    { k: ['bring', 'wear', 'swim', 'towel', 'robe', 'pack'], a: 'Just bring swimwear. Towels and robes are provided.' },
    { k: ['where', 'address', 'find you', 'direction', 'location', 'postcode'], a: 'We’re on Easton Lane, Bozeat, NN29 7NN, just after the national speed limit signs as you leave Bozeat towards Easton Maudit. what3words: ///names.answers.fulfilled', link: ['Find us', 'contact.html'] },
    { k: ['pay', 'klarna', 'card', 'instal'], a: 'You can pay by card or with Klarna in 3 interest-free instalments.' },
    { k: ['contact', 'phone', 'call', 'email', 'human', 'person', 'someone', 'speak', 'talk'], a: `You can call ${C.phone}, message us on WhatsApp, or email ${C.email}. Use “Email the team” below and I’ll include our chat.`, human: true }
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const log = [];  // {role:'user'|'assistant', content}

  function local(q){
    const t = ' ' + q.toLowerCase() + ' ';
    let best = null, score = 0;
    KB.forEach(e => { const s = e.k.reduce((n, k) => n + (t.includes(k) ? k.length + 4 : 0), 0); if (s > score){ score = s; best = e; } });
    return best || { a: 'I’m not sure about that one. The team will know: tap “Email the team” below and I’ll send them our chat, or call ' + C.phone + '.', human: true, unsure: true };
  }

  // ---------- UI ----------
  const root = document.createElement('div');
  root.className = 'yc-chat';
  root.innerHTML = `
    <button class="ycc-fab" aria-label="Chat with us"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg><span>Ask us</span></button>
    <div class="ycc-panel" role="dialog" aria-label="York Cottage chat" hidden>
      <div class="ycc-head"><div><b>York Cottage</b><small><i></i>Instant answers, 24/7</small></div><button class="ycc-x" aria-label="Close chat">&times;</button></div>
      <div class="ycc-log" aria-live="polite"></div>
      <div class="ycc-sugg"></div>
      <form class="ycc-form"><input type="text" placeholder="Ask about times, prices, stays…" aria-label="Your question" maxlength="500"><button aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button></form>
      <div class="ycc-foot"><span>Need a person?</span><a class="ycc-mail" href="#">Email the team</a></div>
    </div>`;
  document.body.appendChild(root);
  const fab = root.querySelector('.ycc-fab'), panel = root.querySelector('.ycc-panel'), logEl = root.querySelector('.ycc-log'),
        form = root.querySelector('.ycc-form'), input = form.querySelector('input'), sugg = root.querySelector('.ycc-sugg'), mail = root.querySelector('.ycc-mail');

  const SUGG = ['What time are Day Spa sessions?', 'How much is the whole house?', 'Is there free parking?', 'Do gift vouchers expire?'];
  function say(role, html, extra){
    const m = document.createElement('div'); m.className = 'ycc-msg ' + role; m.innerHTML = html;
    if (extra) m.appendChild(extra);
    logEl.appendChild(m); logEl.scrollTop = logEl.scrollHeight;
  }
  function actions(e){
    const box = document.createElement('div'); box.className = 'ycc-acts';
    if (e.book){ const b = document.createElement('a'); b.href = '#book'; b.dataset.book = e.book; b.textContent = 'Book now'; b.className = 'ycc-act'; box.appendChild(b); }
    if (e.link){ const l = document.createElement('a'); l.href = e.link[1]; l.textContent = e.link[0]; l.className = 'ycc-act ghost'; if (/^https?:/.test(e.link[1])){ l.target = '_blank'; l.rel = 'noopener'; } box.appendChild(l); }
    if (e.human){ const h = document.createElement('a'); h.href = mailHref(); h.textContent = 'Email the team'; h.className = 'ycc-act ghost'; box.appendChild(h); }
    return box.children.length ? box : null;
  }
  function mailHref(){
    const body = 'Hello York Cottage,\n\n[Your question]\n\n--- Chat so far ---\n' + log.map(m => (m.role === 'user' ? 'Me: ' : 'Assistant: ') + m.content).join('\n') + '\n';
    return 'mailto:' + C.email + '?subject=' + encodeURIComponent('Question from the website') + '&body=' + encodeURIComponent(body.slice(0, 1800));
  }
  function showSugg(){ sugg.innerHTML = '<small>Popular questions</small>' + SUGG.map(s => `<button type="button">${esc(s)}</button>`).join(''); sugg.querySelectorAll('button').forEach(b => b.onclick = () => ask(b.textContent)); }

  async function ask(q){
    q = q.trim(); if (!q) return;
    sugg.innerHTML = ''; sugg.remove(); say('user', esc(q)); log.push({ role: 'user', content: q });
    const typing = document.createElement('div'); typing.className = 'ycc-msg assistant typing'; typing.innerHTML = '<i></i><i></i><i></i>'; logEl.appendChild(typing); logEl.scrollTop = logEl.scrollHeight;
    let e = null;
    if (C.endpoint){
      try {
        const r = await fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: log.slice(-12) }) });
        const j = await r.json();
        if (r.ok && j.reply) e = { a: j.reply, human: !!j.needsHuman, book: j.book || null };
      } catch (err) { /* fall back to built-in answers */ }
    }
    if (!e){ await new Promise(r => setTimeout(r, 450)); e = local(q); }
    typing.remove();
    say('assistant', esc(e.a).replace(/\n/g, '<br>'), actions(e)); log.push({ role: 'assistant', content: e.a });
    mail.href = mailHref();
  }

  function open(){
    panel.hidden = false; root.classList.add('on'); input.focus();
    if (!logEl.children.length){ const w = document.createElement('div'); w.className = 'ycc-welcome'; w.innerHTML = '<b>Hi, how can we help?</b><span>Ask about times, prices, stays, treatments or booking.</span>'; logEl.appendChild(w); logEl.appendChild(sugg); showSugg(); }
  }
  function close(){ panel.hidden = true; root.classList.remove('on'); fab.focus(); }
  fab.onclick = () => panel.hidden ? open() : close();
  root.querySelector('.ycc-x').onclick = close;
  form.onsubmit = ev => { ev.preventDefault(); const q = input.value; input.value = ''; ask(q); };
  mail.onclick = () => { mail.href = mailHref(); };
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel.hidden) close(); });
  document.addEventListener('click', ev => { const a = ev.target.closest('[data-chat]'); if (a){ ev.preventDefault(); open(); if (a.dataset.chat) ask(a.dataset.chat); } });
  window.YCChat = { open, ask };
})();
