// York Cottage support messages (user, 2026-11-26): the contact form opens a ticket that staff answer in the admin portal.
// The form sends to the receiver (the same one as consultation forms, its address is in the live settings); the guest gets a
// private link (ticket.html?t=…&k=…) to read the conversation and add to it. No email addresses: everything goes through here.
(function () {
  const LIVE = 'https://raw.githubusercontent.com/jasongrimm111-sys/york-cottage-spa-live/main/config.json';
  const PHONE = '01933 580 100';
  let ep = null;
  const endpoint = async () => { if (ep !== null) return ep; try { const c = await (await fetch(LIVE + '?v=' + Date.now(), { cache: 'no-store' })).json(); ep = ((c.consult || {}).endpoint || '').replace(/\/$/, ''); } catch (e) { ep = ''; } return ep; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const off = `Our message form isn’t switched on yet. Please call us on <a href="tel:+441933580100">${PHONE}</a> or use the chat.`;

  // used by the booking page for enquiries
  window.YCSupport = { send: async body => { const url = await endpoint(); if (!url) throw new Error('our message form isn’t switched on yet'); const r = await fetch(url + '/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send'); return { id: j.id, k: j.k }; } };

  // ---- the contact form ----
  const f = document.getElementById('cform');
  if (f) {
    const ref = new URLSearchParams(location.search).get('ref'); if (ref && f.querySelector('#cf_r')) f.querySelector('#cf_r').value = ref;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = id => (f.querySelector('#' + id) || {}).value || '', st = f.querySelector('.cf-status'), btn = f.querySelector('button[type=submit], button:not([type])');
      const body = { name: v('cf_n'), email: v('cf_e'), phone: v('cf_p'), topic: v('cf_t'), ref: v('cf_r'), message: v('cf_m'), website: v('cf_w') };
      const url = await endpoint(); if (!url) { st.innerHTML = off; st.className = 'cf-status bad'; return; }
      btn.disabled = true; st.className = 'cf-status'; st.textContent = 'Sending…';
      try {
        const r = await fetch(url + '/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send');
        const link = `ticket.html?t=${j.id}&k=${j.k}`;
        f.innerHTML = `<div class="cf-done"><h3>Thank you, we’ve got your message</h3><p>Your reference is <b>${esc(j.id)}</b>. We’ll reply as soon as we can, usually within a day, and email you when we do.</p><p><a class="btn btn-clay" href="${link}">See your conversation</a></p><p class="cal-note">We’ve also emailed you this link, so you can come back to it any time.</p></div>`;
      } catch (err) { st.className = 'cf-status bad'; st.innerHTML = esc(err.message) + `. You can also call us on <a href="tel:+441933580100">${PHONE}</a>.`; btn.disabled = false; }
    });
  }

  // ---- the guest's conversation (ticket.html) ----
  const box = document.getElementById('ticket');
  if (box) {
    const q = new URLSearchParams(location.search), t = q.get('t'), k = q.get('k');
    const fmt = at => new Date(at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const show = async () => {
      const url = await endpoint(); if (!url) { box.innerHTML = `<p>${off}</p>`; return; }
      if (!/^T-[A-Z0-9]{6}$/.test(t || '') || !/^[a-f0-9]{32}$/.test(k || '')) { box.innerHTML = '<p>This link isn’t complete. Please use the link from your email, or <a href="contact.html#cform">send us a new message</a>.</p>'; return; }
      let d; try { d = await (await fetch(`${url}/ticket?t=${t}&k=${k}`)).json(); } catch (e) { box.innerHTML = `<p>We couldn’t load your conversation just now. Please try again in a minute, or call ${PHONE}.</p>`; return; }
      if (d.pending) { box.innerHTML = `<p>We’re just filing your message (it takes a minute or two). This page will update by itself.</p>`; setTimeout(show, 30000); return; }
      if (d.error) { box.innerHTML = '<p>We couldn’t find that conversation. Please use the link from your email.</p>'; return; }
      box.innerHTML = `<div class="tk-head"><span class="tk-ref">${esc(d.id)}</span><span class="tk-st ${d.status === 'closed' ? 'closed' : ''}">${d.status === 'closed' ? 'Closed' : 'Open'}</span><span>${esc(d.topic || '')}</span></div>
        <div class="tk-thread">${d.messages.map(m => `<div class="tk-msg ${m.from === 'staff' ? 'staff' : 'guest'}"><div class="tk-who">${m.from === 'staff' ? esc(m.by || 'York Cottage') : 'You'} · ${fmt(m.at)}</div><div class="tk-text">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`).join('')}</div>
        <form class="cform tk-reply"><div class="bk-field"><label for="tk_m">${d.status === 'closed' ? 'Need anything else? Writing here reopens the conversation' : 'Add a message'}</label><textarea id="tk_m" rows="4" required></textarea></div><button class="btn btn-clay" type="submit">Send</button><p class="cf-status"></p></form>`;
      const rf = box.querySelector('.tk-reply');
      rf.onsubmit = async e => { e.preventDefault(); const st = rf.querySelector('.cf-status'), m = rf.querySelector('#tk_m').value.trim(); if (!m) return; rf.querySelector('button').disabled = true; st.textContent = 'Sending…';
        try { const r = await fetch(url + '/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t, k, message: m }) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send');
          st.textContent = 'Sent. It appears here in a minute or two, and we’ll email you when we reply.'; rf.querySelector('#tk_m').value = ''; setTimeout(show, 60000); }
        catch (err) { st.textContent = err.message; } rf.querySelector('button').disabled = false; };
    };
    show();
  }
})();
