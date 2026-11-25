/* York Cottage AI chat - on every page.
   Answers from the spa's own facts. If YC_CHAT.endpoint is set (see chat-worker/), questions go to Claude
   through that small server; otherwise the built-in answers below are used. Email is always the last resort. */
window.YC_CHAT = Object.assign({ endpoint: '', email: 'info@yorkcottagespa.com', phone: '01933 580 100' }, window.YC_CHAT || {});

(() => {
  const C = window.YC_CHAT;
  const KB = [
    { k: ['time', 'session', 'when', 'open', 'hours', 'start', 'morning', 'afternoon', 'evening'], a: 'Day Spa sessions are 4 hours: morning 09:30–13:30 or afternoon 13:00–17:00. Spa Access sessions start at 09:30 or 14:00, with evening sessions on some days. On spa breaks, check-in is from 13:30 with the spa 14:00–18:00 (Monday to Thursday), or from 14:00 with the spa 18:00–22:30 on Sundays. Check-out is 11:00.' },
    { k: ['day spa', 'spa day', 'package'], a: 'The Day Spa is £100 per person for a 4-hour session. It includes a 20-minute aromatherapy massage or facial, afternoon tea or a sweet & savoury grazing board, hot and cold drinks, and the spa pool, sauna and lounge with a towel and robe.', book: 'day' },
    { k: ['access', 'hot tub only', 'just the spa', 'spa only'], a: 'Spa Access is £50 per person for a 4-hour session: the spa pool, sauna and lounge, with hot and cold drinks, towel and robe.', book: 'access' },
    { k: ['private', 'exclusive spa', 'just us', 'party', 'hen', 'birthday', 'celebration'], a: 'The Private Spa is from £100 per person (the rate depends on group size), with a minimum of 4 guests, or 6 on Sundays (from 11:30). It includes the spa just for your group, food, drinks and a 20-minute massage or luxury facial each. For the whole house with overnight stays, ask me about exclusive use.', book: 'private' },
    { k: ['overnight', 'stay', 'room', 'night', 'break', 'sleep', 'accommodation', 'bedroom'], a: 'Overnight Spa Breaks are £145 per person for 1 night or £220 per person for 2 nights, based on 2 sharing a king ensuite room. They run Sunday to Thursday (2-night stays arrive Sunday to Wednesday) and include a grazing board, a 20-minute aromatherapy massage each, drinks and spa time. Continental breakfast is £10 per person.', book: 'break' },
    { k: ['group', '7', 'eight', 'friends', 'team'], a: 'Group Spa Breaks are for 7 or more guests, Sunday to Thursday, from £145 per person. You get up to 8 rooms, the spa just for your group, a grazing board or afternoon tea and a 20-minute massage each. Group breaks are booked by enquiry.', book: 'group' },
    { k: ['whole house', 'exclusive', 'house', 'weekend', '16', 'everyone'], a: 'The whole house and spa is from £1,840 per night for up to 16 guests, with a 2-night minimum (up to 30 nights). That includes 8 bedrooms, a full kitchen, 2 living rooms, outdoor space and exclusive use of the spa pool, hot tub and sauna. Check-in is from 16:00 and check-out is 11:00. A 50% deposit is taken, with the balance due 6 weeks before arrival.', book: 'house' },
    { k: ['treatment', 'massage', 'facial', 'menu'], a: 'Treatments start at £50: Back to Basics Facial (30 min, £50), Recipe for Radiance Facial (45 min, £70), Tension Melt or Scalp, Neck & Shoulder massage (30 min, £50), Recipe for Relaxation Massage (45 min, £70) and a Full Body Massage (60 min, £80). You can add them to any booking or book them on their own.', link: ['See the treatment menu', 'treatments.html'] },
    { k: ['head spa', 'japanese', 'scalp', 'zen', 'radiance ritual', 'classic renewal'], a: 'Our Japanese Head Spa rituals are The Classic Renewal (60 min, £90), The Radiance Ritual (70 min, £115) and The Ultimate Zen Experience (80 min, £145). They’re 10% off when booked with a spa session or stay.', link: ['See the head spa', 'treatments.html#head-spa'] },
    { k: ['cancel', 'refund', 'reschedule', 'change', 'move my'], a: 'Spa days are non-refundable, but you can move your visit (subject to availability) by emailing at least 30 days before. Spa breaks can be refunded with at least 30 days’ notice. Whole-house bookings: 6+ months’ notice and you can move your dates; 6+ weeks, the deposit is kept; under 6 weeks, the full cost is kept.' },
    { k: ['age', 'child', 'kid', 'under 18', 'teen', 'baby'], a: 'Guests need to be 18 or over to book. Under-16s can use the spa only during a Private Spa session or a whole-house booking, and under-18s can’t join spa breaks.' },
    { k: ['dog', 'pet', 'animal'], a: 'We can only welcome working animals, so pets can’t come along.' },
    { k: ['voucher', 'gift'], a: 'Gift vouchers include a Day Spa (£90, usually £100), Day Spa for Two (£181, usually £200) and an Ensuite Spa Break for 2 (£290). Vouchers can’t be refunded or exchanged for cash, and please bring yours on arrival.', link: ['See gift vouchers', 'index.html#gifts'] },
    { k: ['bring', 'wear', 'swim', 'towel', 'robe', 'pack'], a: 'Just bring swimwear. Towels and robes are provided. Each guest having a treatment fills in a short consultation form first.' },
    { k: ['food', 'eat', 'tea', 'grazing', 'breakfast', 'diet', 'vegan', 'gluten', 'allerg'], a: 'Day spa guests choose afternoon tea or a sweet & savoury grazing board. Stays include a grazing board, and continental breakfast is £10 per person. Let us know any dietary needs in the notes when you book.' },
    { k: ['where', 'address', 'find', 'direction', 'location', 'park'], a: 'We’re on Easton Lane, Bozeat, NN29 7NN, just after the national speed limit signs as you leave Bozeat towards Easton Maudit. what3words: ///names.answers.fulfilled', link: ['Get directions', 'https://g.page/YorkCottageSpa?share'] },
    { k: ['pay', 'klarna', 'deposit', 'card', 'instal'], a: 'You can pay by card or with Klarna in 3 interest-free instalments. Spa days and breaks are paid in full; the whole house takes a 50% deposit if you book more than 6 weeks ahead.' },
    { k: ['contact', 'phone', 'call', 'email', 'human', 'person', 'someone', 'speak', 'talk'], a: `You can call us on ${C.phone}, message us on WhatsApp, or email ${C.email}. Use the email button below and I’ll include our chat so the team has the details.`, human: true }
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

  const SUGG = ['What are the session times?', 'How much is the whole house?', 'Do you do overnight stays?', 'Can I bring my dog?'];
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
  function showSugg(){ sugg.innerHTML = SUGG.map(s => `<button type="button">${esc(s)}</button>`).join(''); sugg.querySelectorAll('button').forEach(b => b.onclick = () => ask(b.textContent)); }

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
    if (!logEl.children.length){ say('assistant', 'Hi! Ask me about times, prices, stays, treatments or booking.'); logEl.appendChild(sugg); showSugg(); }
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
