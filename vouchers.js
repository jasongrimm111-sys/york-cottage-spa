/* Gift voucher checkout (test mode: no payment is taken).
   CONNECT: create the order on your server, confirm with Stripe, then email the voucher. */
(() => {
  const VO = {
    day1:   { name:'Day Spa gift voucher', who:'For one', desc:'A Day Spa session with afternoon tea and a massage.', price:90, was:100 },
    day2:   { name:'Day Spa for Two gift voucher', who:'For two', desc:'A Day Spa session for two, with afternoon tea and a massage each.', price:181, was:200 },
    break2: { name:'Ensuite Spa Break for 2 gift voucher', who:'For two', desc:'A night for two in an ensuite room, with a grazing platter and massages.', price:290 }
  };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gbp = n => '£' + n.toLocaleString('en-GB');
  const S = { k:null, step:0, d:{}, pm:'card', ref:null };

  const box = document.createElement('div');
  box.className = 'bk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Buy a gift voucher');
  box.innerHTML = `<div class="bk-box"><div class="bk-main"><div class="bk-head"><ol class="bk-steps"></ol></div><div class="bk-body"></div><div class="bk-nav"></div></div><aside class="bk-side"></aside></div>`;
  document.body.appendChild(box);
  const body = $('.bk-body', box), nav = $('.bk-nav', box), side = $('.bk-side', box), stepsEl = $('.bk-steps', box);
  const STEPS = ['Voucher', 'Details', 'Pay'];

  function open(k){ if (!S.ref && S.k === k && S.step) {} else Object.assign(S, { k, step:0, ref:null }); box.classList.add('on'); document.body.classList.add('bk-open'); draw(); }
  function close(){ box.classList.remove('on'); document.body.classList.remove('bk-open'); if (S.ref) Object.assign(S, { step:0, ref:null, d:{} }); }
  box.addEventListener('click', e => { if (e.target === box) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-voucher]'); if (b){ e.preventDefault(); open(b.dataset.voucher); } });

  const field = (id, label, type = 'text', opt = false, ph = '') => `<div class="bk-field" data-fd="${id}"><label for="v_${id}">${label}${opt ? ' <span class="opt">optional</span>' : ''}</label>${type === 'area' ? `<textarea id="v_${id}" rows="3" maxlength="300" placeholder="${ph}">${esc(S.d[id])}</textarea>` : `<input id="v_${id}" type="${type}" value="${esc(S.d[id])}" placeholder="${ph}">`}<span class="err">Please fill this in</span></div>`;

  let lastStep = -1;
  function draw(){
    stepsEl.innerHTML = S.ref ? '' : STEPS.map((t, i) => `<li class="${i === S.step ? 'now' : i < S.step ? 'done' : ''}"><span><i>${i < S.step ? '✓' : i + 1}</i><b>${t}</b></span></li>`).join('');
    const v = VO[S.k];
    if (S.ref){
      body.innerHTML = `<div class="done-ico"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 12 5 5L20 7"/></svg></div><h2>Thank you, <em>${esc(S.d.from)}</em></h2>
        <p class="bk-sub">Your ${esc(v.name)} is on its way to ${esc(S.d.send === 'them' ? S.d.toEmail : S.d.email)}. Stripe test payment · no money was taken.</p><div class="ref">${S.ref}</div>
        <ol class="next"><li>The voucher code is valid for 12 months.</li><li>To redeem, enter the code when booking and bring the voucher on arrival.</li></ol>`;
      nav.innerHTML = '<span></span><button class="btn btn-solid go">Done</button>'; $('.go', nav).onclick = close; sideView(); return;
    }
    if (S.step === 0) body.innerHTML = `<h2>Choose a <em>voucher</em></h2><div class="bk-opts">${Object.entries(VO).map(([k, o]) => `<button class="bk-opt ${S.k === k ? 'sel' : ''}" data-k="${k}"><small>${o.who}</small><b>${o.name.replace(' gift voucher', '')}</b><span>${o.desc}</span><em>${gbp(o.price)}${o.was ? ` <s style="color:var(--muted);font-weight:400">${gbp(o.was)}</s>` : ''}</em><span class="opt-cta">${S.k === k ? 'Selected' : 'Select'} <span class="arrow">→</span></span></button>`).join('')}</div>`;
    if (S.step === 1) body.innerHTML = `<h2>Who’s it <em>for</em>?</h2><div class="det-grid"><div class="det-card">
        <div class="bk-group" style="margin-top:0">The voucher</div>${field('to', 'Recipient’s name')}${field('from', 'From (your name)')}${field('msg', 'Personal message', 'area', true, 'Happy birthday! Enjoy some time to relax.')}</div>
        <div class="det-card soft"><div class="bk-group" style="margin-top:0">Delivery</div>
        <div class="choice" style="grid-template-columns:1fr">${[['me', 'Email it to me', 'So you can print it or forward it'], ['them', 'Email it to them', 'Sent straight to the recipient']].map(([k, t, sub]) => `<button class="ch ${ (S.d.send || 'me') === k ? 'sel' : ''}" data-send="${k}"><span class="ch-r"></span><b>${t}</b><small>${sub}</small></button>`).join('')}</div>
        ${(S.d.send || 'me') === 'them' ? field('toEmail', 'Recipient’s email', 'email') : ''}${field('email', 'Your email (for the receipt)', 'email')}</div></div>`;
    if (S.step === 2) body.innerHTML = `<h2>Review &amp; <em>pay</em></h2><div class="pay-grid"><div class="pay"><ul class="sum" style="color:var(--ink)">
        ${[['Voucher', esc(v.name)], ['For', esc(S.d.to)], ['From', esc(S.d.from)], S.d.msg && ['Message', esc(S.d.msg)], ['Send to', esc(S.d.send === 'them' ? S.d.toEmail : S.d.email)]].filter(Boolean).map(([a, b]) => `<li><span style="color:var(--muted)">${a}</span><b>${b}</b></li>`).join('')}</ul></div>
        <div class="stripe"><div class="stripe-top"><span class="stripe-test">Test mode</span><span>Powered by <b>stripe</b></span></div>
        <div class="pm-tabs"><button class="pm ${S.pm === 'card' ? 'sel' : ''}" data-pm="card">Card</button><button class="pm ${S.pm === 'klarna' ? 'sel' : ''}" data-pm="klarna"><span class="klarna-logo">Klarna.</span>Pay in 3</button></div>
        ${S.pm === 'card' ? `<div class="card-form"><label>Card number<input value="4242 4242 4242 4242" readonly tabindex="-1"></label><div class="cf-2"><label>Expiry<input value="12 / 34" readonly tabindex="-1"></label><label>CVC<input value="123" readonly tabindex="-1"></label></div><p class="k-small">Test mode: Stripe’s test card is used and nothing is charged.</p></div>`
          : `<div class="klarna-box"><p><b>3 interest-free payments of ${gbp(Math.round(v.price / 3 * 100) / 100)}</b></p><p class="k-small">You’ll confirm with Klarna. Subject to approval.</p></div>`}</div></div>`;
    const last = S.step === 2;
    nav.innerHTML = `${S.step ? '<button class="back">← Back</button>' : '<span></span>'}<span class="bk-msg"></span><button class="bk-close">Close</button><button class="btn btn-solid go">${last ? (S.pm === 'klarna' ? 'Continue with Klarna' : 'Pay ' + gbp(v.price)) : 'Continue'} <span class="arrow">→</span></button>`;
    sideView(); wire(); if (S.step !== lastStep){ body.scrollTop = 0; box.scrollTop = 0; lastStep = S.step; }
  }
  function sideView(){
    const v = VO[S.k];
    side.innerHTML = `<div class="side-top"><div class="eyebrow">Your gift</div><button class="side-x" aria-label="Close">&times;</button></div><h3>${v ? esc(v.name.replace(' gift voucher', '')) : 'Choose a voucher'}</h3>
      ${v ? `<ul class="sum"><li><span>Voucher</span><b>${esc(v.who)}</b></li>${S.d.to ? `<li><span>For</span><b>${esc(S.d.to)}</b></li>` : ''}</ul><div class="sum-tot"><div class="big"><span>Total</span><b>${gbp(v.price)}</b></div><p>Valid for 12 months. Non-refundable.</p></div>` : ''}
      <p class="foot-note">Questions? Call 01933 580 100.</p>`;
    $('.side-x', side).onclick = close;
  }
  function wire(){
    body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { S.k = b.dataset.k; draw(); });
    body.querySelectorAll('[data-send]').forEach(b => b.onclick = () => { S.d.send = b.dataset.send; draw(); });
    body.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { S.pm = b.dataset.pm; draw(); });
    ['to', 'from', 'msg', 'toEmail', 'email'].forEach(k => { const el = $('#v_' + k, body); if (el) el.oninput = () => { S.d[k] = el.value; el.closest('.bk-field').classList.remove('bad'); }; });
    const back = $('.back', nav); if (back) back.onclick = () => { S.step--; draw(); };
    $('.bk-close', nav).onclick = close;
    $('.go', nav).onclick = () => {
      const msg = $('.bk-msg', nav);
      if (S.step === 0 && !S.k){ msg.textContent = 'Choose a voucher'; return; }
      if (S.step === 1){
        const need = ['to', 'from', 'email'].concat(S.d.send === 'them' ? ['toEmail'] : []), bad = need.filter(k => k.toLowerCase().includes('email') ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.d[k] || '') : !(S.d[k] || '').trim());
        if (bad.length){ bad.forEach(k => $(`[data-fd="${k}"]`, body).classList.add('bad')); msg.textContent = 'Please check the highlighted fields'; return; }
      }
      if (S.step < 2){ S.step++; draw(); return; }
      $('.go', nav).innerHTML = '<span class="spin"></span> Processing…';
      setTimeout(() => { S.ref = 'YCV-' + Math.random().toString(36).slice(2, 8).toUpperCase(); draw(); }, 1200);
    };
  }
})();
