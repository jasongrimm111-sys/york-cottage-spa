// York Cottage receiver for the website (one small service, three jobs):
//  POST /            consultation forms, ALREADY ENCRYPTED in the guest's browser (it can't read them) -> consult/inbox/
//  POST /contact     a new message from the contact form (a support ticket)                            -> support/inbox/
//  POST /reply       a guest adding to their ticket (needs the ticket's private key)                    -> support/inbox/
//  GET  /ticket      the conversation for one ticket (needs its private key), for ticket.html
//  POST /hold        just before paying: re-checks the chosen times against every booking and live hold, then holds
//                    them for rules.holdMinutes (30). Saved with GitHub's version check, so two guests paying for the
//                    same time at the same moment can't both get it: the second is told it's gone (user 2026-11-27)
//  POST /release     lets a hold go (the guest started again)
//  GET  /holds       the live holds (times only, no names), so the website counts them as taken
//  POST /voucher     checks a gift voucher code privately and returns only its balance and expiry (user 2026-11-27).
//                    Codes and balances never go in the public data. Tries are limited per visitor.
//                    /hold then reserves the amount used for 30 minutes, and
//  GET  /booking     "Manage my booking": one booking, by its private link (ref + month + token from the emails) (user 2026-11-27)
//  POST /booking-request   a guest asking to move, cancel or change it: becomes a support ticket linked to the booking
//  POST /redeem      after payment, takes it off the voucher (vouchers.json, GitHub version check), keeping what's left.
// Everything is filed in the private data store, where the booking jobs pick it up.
// Secrets: GITHUB_TOKEN (fine-grained, york-cottage-spa-data only, Contents: read and write).
const GH = env => ({ Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'york-cottage-receiver', 'Content-Type': 'application/json' });
const rid = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('');
const key = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const b64 = s => btoa(unescape(encodeURIComponent(s)));
import E from '../engine.js';

// ---- holds: holds/active.json in the data store ----
const raw = async (env, path) => { const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/${path}`, { headers: GH(env) }); if (r.status === 404) return { data: null, sha: null }; if (!r.ok) throw new Error('read ' + path); const j = await r.json(); return { data: JSON.parse(decodeURIComponent(escape(atob(j.content.replace(/\s/g, ''))))), sha: j.sha }; };
// what the public /holds list shows: no id (the id is what lets a guest release or use their hold), just a tag
const publicHold = h => { const v = holdView(h); delete v.id; return v; };
const monthsOf = (date, nights) => [...new Set([0, nights || 0, 31].map(n => E.addD(date, n).slice(0, 7)))];
const live = list => (list || []).filter(h => new Date(h.expires).getTime() > Date.now());
const holdView = h => ({ id: h.id, pub: h.pub || null, product: h.product, date: h.date, nights: h.nights || 0, sessionId: h.sessionId || null, guests: h.guests, rooms: h.rooms || [], items: (h.items || []).map(i => ({ key: i.key, date: i.date, start: i.start, min: i.min, buffer: i.buffer, staff: i.staff, troom: i.troom, tid: i.tid, guest: i.guest })), food: h.food || null, status: 'hold', expires: h.expires });
// ---- gift vouchers: vouchers.json in the data store ----
const VCODE = /^[A-Z0-9][A-Z0-9-]{3,30}$/;
const todayUK = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
const reservedOn = (holds, code, except) => live(holds).filter(h => h.voucher && h.voucher.code === code && h.id !== except && !h.voucher.done).reduce((a, h) => a + h.voucher.amount, 0);
function voucherState(list, holds, code, except) {
  const v = (list || []).find(x => String(x.code).toUpperCase() === code);
  if (!v) return { why: 'We can’t find that code. Please check it and try again.' };
  if (v.status === 'used' || !(v.balance > 0)) return { why: 'That gift voucher has been fully used.' };
  if (v.status && v.status !== 'active') return { why: 'That gift voucher can’t be used. Please contact us.' };
  if (v.expires && v.expires < todayUK()) return { why: 'That gift voucher expired on ' + v.expires + '. Please contact us.' };
  const free = Math.round((v.balance - reservedOn(holds, String(v.code).toUpperCase(), except)) * 100) / 100;
  if (free <= 0) return { why: 'That gift voucher is being used in another booking right now.' };
  return { v, free };
}
// a few tries per visitor, so codes can't be guessed
const tries = new Map();
const tooMany = (ip, max = 8) => { const now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 10 * 60000); t.push(now); tries.set(ip, t); if (tries.size > 5000) tries.clear(); return t.length > max; };
async function redeem(env, holdId, ref) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [vs, hs] = await Promise.all([raw(env, 'vouchers.json'), raw(env, 'holds/active.json')]);
    const h = (hs.data || []).find(x => x.id === holdId);
    if (!h || !h.voucher) return { ok: false, why: 'Nothing to take off' };
    const list = vs.data || [], v = list.find(x => String(x.code).toUpperCase() === h.voucher.code);
    if (!v) return { ok: false, why: 'Voucher not found' };
    if ((v.uses || []).some(u => u.hold === h.id)) return { ok: true, balance: v.balance };   // already done
    const amount = Math.min(h.voucher.amount, v.balance);
    v.balance = Math.round((v.balance - amount) * 100) / 100;
    (v.uses = v.uses || []).push({ at: new Date().toISOString(), amount, ref: clean(ref, 12), hold: h.id, via: 'online' });
    if (!v.balance) v.status = 'used';
    const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/vouchers.json`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message: `Voucher ${v.code}: £${amount} used online on ${clean(ref, 12)}`, content: b64(JSON.stringify(list)), sha: vs.sha }) });
    if (r.ok) {
      // mark the hold's voucher as done (best effort: the voucher's own record already stops a second deduction)
      for (let k = 0; k < 3; k++) { const cur = await raw(env, 'holds/active.json'); const x = (cur.data || []).find(y => y.id === holdId); if (!x || !x.voucher) break; x.voucher.done = true;
        const w = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/holds/active.json`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message: 'Voucher used on ' + holdId, content: b64(JSON.stringify(cur.data)), sha: cur.sha }) }); if (w.ok) break; }
      return { ok: true, balance: v.balance };
    }
    if (r.status !== 409 && r.status !== 422) throw new Error('save voucher ' + r.status);
  }
  return { ok: false, why: 'Busy just now' };
}

// ---- manage my booking ----
async function findBooking(env, ref, m, k) {
  if (!/^YC-[A-Z0-9]{4,8}$/.test(ref) || !/^\d{4}-\d\d$/.test(m) || !/^[a-z0-9]{12,40}$/.test(k)) return null;
  const { data } = await raw(env, `bookings/${m}.json`);
  return (data || []).find(b => b.ref === ref && b.manageToken && b.manageToken === k) || null;
}
function bookingView(cfg, b, today) {
  const p = cfg.products[b.product] || {}, q = b.quote || E.quote(cfg, b), paid = E.paid(b), ses = E.session(cfg, b.sessionId);
  const tn = id => (E.tr(cfg, id) || {}).name || '';
  const fn = id => ((cfg.foods || []).find(f => f.id === id) || {}).name || '';
  const st = p.times ? E.stayTimes(cfg, b.product, b.date, b.nights) : null;
  const c = cfg.consult || {}, consult = c.endpoint && c.publicKey && b.consultToken ? `consult.html?ref=${encodeURIComponent(b.ref)}&t=${b.consultToken}` : '';
  const terms = E.live(b) ? E.cancelTerms(cfg, b, today) : null;
  const kind = p.kind === 'house' ? 'house' : p.kind === 'stay' ? 'stay' : 'spa';
  return {
    ref: b.ref, status: b.status, product: p.name || b.product, kind: p.kind, date: b.date, nights: b.nights || 0, end: b.nights ? E.addD(b.date, b.nights) : b.date,
    session: ses ? { name: ses.name, start: ses.start, end: ses.end, arrive: ses.arrive || ses.start } : null, stay: st, guests: b.guests,
    arrive: E.arriveAt ? E.arriveAt(cfg, b) : '', arriveMins: E.arriveBefore ? E.arriveBefore(cfg) : 15,
    lead: (b.customer || {}).first || '',
    guestList: (b.guestList || []).map((g, i) => ({ name: (g.name || (i ? '' : `${(b.customer || {}).first || ''} ${(b.customer || {}).last || ''}`)).trim() || `Guest ${i + 1}`,   // full names (2026-11-28): guests with the same first name are told apart
      food: g.food ? fn(g.food) : '', consult: g.consult === 'done',
      items: (b.items || []).filter(x => x.guest === i).sort((a, z) => ((a.date || b.date) + a.start).localeCompare((z.date || b.date) + z.start)).map(x => ({ name: E.itemName ? E.itemName(cfg, x) : tn(x.tid), date: x.date || b.date, start: x.start, min: x.min })) })),
    stayLines: E.stayLines ? E.stayLines(cfg, b, (b.guestList || []).map((g, i) => (g.name || (i ? '' : `${(b.customer || {}).first || ''} ${(b.customer || {}).last || ''}`)).trim() || `Guest ${i + 1}`)) : [],
    whenText: E.whenText ? E.whenText(cfg, b) : '', session2: ses ? ses.name : '',
    total: q.total, paid, due: Math.round((q.total - paid) * 100) / 100, balanceDue: q.balanceDue || null,
    policy: (cfg.policies || {})[kind] || '', terms: terms ? { text: terms.text, refund: terms.refund, canMove: terms.canMove, days: terms.days } : null,
    consult, business: { name: (cfg.business || {}).name, phone: (cfg.business || {}).phone, email: (cfg.business || {}).email, address: (cfg.business || {}).address }
  };
}

async function takeHold(env, b, release, voucher) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ data: cfg }, holds, vs] = await Promise.all([raw(env, 'config.json'), raw(env, 'holds/active.json'), voucher ? raw(env, 'vouchers.json') : Promise.resolve({ data: null })]);
    let list = live(holds.data).filter(h => h.id !== release);
    // the gift voucher must still have enough on it, counting other people paying with it right now
    if (voucher) { const st = voucherState(vs.data, list, voucher.code); if (st.why || st.free + 0.001 < voucher.amount) return { ok: false, voucher: { balance: st.free || 0 }, why: st.why || `That gift voucher now has £${st.free} on it. Please check the price and try again.` }; }
    if (b) {
      E.migrate(cfg);
      const books = (await Promise.all(monthsOf(b.date, b.nights).map(m => raw(env, `bookings/${m}.json`).then(r => r.data || [])))).flat();
      const ix = E.index(cfg, books.concat(list));
      const why = (E.dateCheck(cfg, ix, { product: b.product, date: b.date, nights: b.nights || 0, guests: b.guests }) || {}).why || '';
      const ses = b.sessionId ? (E.sessions(cfg, ix, b.product, b.date, b.guests).find(x => x.id === b.sessionId) || { ok: false, why: 'That session isn’t running' }) : { ok: true };
      const roomsTaken = (b.rooms || []).some(r => E.nightsOf(b).some(d => ((ix.rooms || {})[d] || []).includes(r)));
      const plan = E.plan(cfg, ix, b);
      const moved = plan.ok && plan.items.some(i => b.times && b.times[i.key] && (b.times[i.key].start !== i.start || (b.times[i.key].date || b.date) !== (i.date || b.date)));
      if (why || !ses.ok || roomsTaken || !plan.ok || moved) return { ok: false, gone: true, why: why || (!ses.ok ? ses.why : roomsTaken ? 'A room you chose has just been booked' : 'Someone has just booked one of your treatment times') };
      const mins = +((cfg.rules || {}).holdMinutes) || 30;
      var hold = holdView({ ...b, id: 'H-' + rid(8), pub: rid(10), items: plan.items, expires: new Date(Date.now() + mins * 60000).toISOString() });
      if (voucher) hold.voucher = { code: voucher.code, amount: voucher.amount };
      list = list.concat(hold);
    }
    const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/holds/active.json`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message: b ? 'Hold ' + hold.id : 'Release hold', content: b64(JSON.stringify(list)), ...(holds.sha ? { sha: holds.sha } : {}) }) });
    if (r.ok) return { ok: true, hold: hold ? hold.id : null, pub: hold ? hold.pub : null, expires: hold ? hold.expires : null };
    if (r.status !== 409 && r.status !== 422) throw new Error('save hold ' + r.status);
    // someone else saved a hold at the same moment: read again and re-check against theirs
  }
  return { ok: false, why: 'Busy just now, please try again' };
}

async function file(env, path, rec, message) {
  const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/${path}`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message, content: b64(JSON.stringify(rec)) }) });
  return r.ok;
}

export { bookingView };   // for previews of the manage page (2026-11-28)
export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const out = (o, status = 200) => Response.json(o, { status, headers: cors });
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!allowed.includes(origin)) return out({ error: 'Not allowed' }, 403);

    // the conversation for a ticket (ticket.html)
    if (request.method === 'GET' && url.pathname === '/ticket') {
      const id = url.searchParams.get('t') || '', k = url.searchParams.get('k') || '';
      if (!/^T-[A-Z0-9]{6}$/.test(id) || !/^[a-f0-9]{32}$/.test(k)) return out({ error: 'Bad request' }, 400);
      const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/support/tickets.json`, { headers: { ...GH(env), Accept: 'application/vnd.github.raw' } });
      const list = r.ok ? await r.json() : [];
      const t = list.find(x => x.id === id && x.key === k);
      if (!t) return out({ pending: true });   // just sent: not filed yet
      return out({ id: t.id, status: t.status, topic: t.topic, name: (t.name || '').split(' ')[0], messages: t.messages.map(m => ({ from: m.from, at: m.at, text: m.text, by: m.from === 'staff' ? (m.by || 'York Cottage') : undefined })) });
    }
    if (request.method === 'GET' && url.pathname === '/booking') {
      const ref = clean(url.searchParams.get('ref'), 12).toUpperCase(), m = clean(url.searchParams.get('m'), 7), k = clean(url.searchParams.get('k'), 40);
      if (tooMany('b' + (request.headers.get('CF-Connecting-IP') || 'x'))) return out({ error: 'Too many tries. Please wait 10 minutes.' }, 429);
      try {
        const b = await findBooking(env, ref, m, k);
        if (!b) return out({ error: 'We can’t find that booking. Please use the link in your email.' }, 404);
        const { data: cfg } = await raw(env, 'config.json'); E.migrate(cfg);
        return out({ ok: true, booking: bookingView(cfg, b, todayUK()) });
      } catch (e) { return out({ error: 'We couldn’t load your booking just now. Please try again.' }, 502); }
    }
    if (request.method === 'GET' && url.pathname === '/holds') {
      const { data } = await raw(env, 'holds/active.json');
      return out({ holds: live(data).map(publicHold) });
    }
    if (request.method !== 'POST') return out({ error: 'Not allowed' }, 405);
    // per-visitor limits, so a script can't flood the data store or hold every slot (pen test 2026-11-28)
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    const LIMIT = { '/hold': 20, '/release': 30, '/redeem': 10, '/contact': 6, '/booking-request': 6, '/reply': 15, '/unsubscribe': 10, '/': 40 };
    if (LIMIT[url.pathname] && tooMany(url.pathname + ip, LIMIT[url.pathname])) return out({ error: 'Too many tries. Please wait 10 minutes and try again.' }, 429);
    const text = await request.text();
    if (text.length > 40000) return out({ error: 'Too large' }, 413);
    let body; try { body = JSON.parse(text); } catch { return out({ error: 'Bad request' }, 400); }

    if (url.pathname === '/hold' || url.pathname === '/release') {
      try {
        if (url.pathname === '/release') return out(await takeHold(env, null, clean(body.hold, 12)));
        const b = body.booking || {};
        if (!b.product || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !(b.guests >= 1 && b.guests <= 30) || !((+b.nights || 0) >= 0 && (+b.nights || 0) <= 14)) return out({ error: 'Bad request' }, 400);
        // names and notes are never kept in a hold; only what's needed to keep the times
        const bk = { product: clean(b.product, 20), date: b.date, nights: +b.nights || 0, sessionId: b.sessionId ? clean(b.sessionId, 30) : null, guests: +b.guests, blueLight: !!b.blueLight, rooms: (b.rooms || []).map(r => clean(r, 20)).slice(0, 12), times: Object.fromEntries(Object.entries(b.times && typeof b.times === 'object' ? b.times : {}).slice(0, 80).filter(([, v]) => v && /^\d\d:\d\d$/.test(v.start || '') && (!v.date || /^\d{4}-\d\d-\d\d$/.test(v.date))).map(([k, v]) => [clean(k, 40), { start: v.start, ...(v.date ? { date: v.date } : {}) }])), pairs: Object.fromEntries(Object.entries(b.pairs || {}).slice(0, 30).map(([k, v]) => [clean(k, 20), clean(v, 20)])),
          guestList: (b.guestList || []).slice(0, 30).map(g => ({ included: g.included ? clean(g.included, 40) : null, food: g.food ? clean(g.food, 40) : null, extras: (g.extras || []).slice(0, 6).map(x => clean(x, 40)) })) };
        const vcode = body.voucher ? clean(body.voucher.code, 32).toUpperCase() : '';
        const vc = vcode && VCODE.test(vcode) && +body.voucher.amount > 0 ? { code: vcode, amount: Math.round(+body.voucher.amount * 100) / 100 } : null;
        const r = await takeHold(env, bk, body.release ? clean(body.release, 12) : null, vc);
        return out(r, r.ok ? 200 : 409);
      } catch (e) { return out({ error: 'Could not check availability just now' }, 502); }
    }
    // check a gift voucher: only its balance (less anything held for someone paying right now) and expiry come back
    if (url.pathname === '/voucher') {
      const code = clean(body.code, 32).toUpperCase().replace(/\s+/g, '');
      if (tooMany(request.headers.get('CF-Connecting-IP') || 'x')) return out({ ok: false, why: 'Too many tries. Please wait 10 minutes and try again.' }, 429);
      if (!VCODE.test(code)) return out({ ok: false, why: 'We can’t find that code. Please check it and try again.' });
      try {
        const [vs, hs] = await Promise.all([raw(env, 'vouchers.json'), raw(env, 'holds/active.json')]);
        const st = voucherState(vs.data, hs.data, code);
        if (st.why) return out({ ok: false, why: st.why });
        return out({ ok: true, code: String(st.v.code).toUpperCase(), balance: st.free, expires: st.v.expires || null });
      } catch (e) { return out({ error: 'We couldn’t check that code just now. Please try again.' }, 502); }
    }
    if (url.pathname === '/redeem') {
      const h = clean(body.hold, 12); if (!/^H-[A-Z0-9]{8}$/.test(h)) return out({ error: 'Bad request' }, 400);
      try { return out(await redeem(env, h, body.ref)); } catch (e) { return out({ error: 'Could not update the voucher' }, 502); }
    }
    // a guest asking to change their booking: checked against the private link, then filed as a support ticket
    if (url.pathname === '/booking-request') {
      const ref = clean(body.ref, 12).toUpperCase(), m = clean(body.m, 7), k = clean(body.k, 40);
      const KINDS = { move: 'Move my booking', cancel: 'Cancel my booking', add: 'Add to my booking', other: 'Question about my booking' };
      const kind = KINDS[body.kind] ? body.kind : 'other', message = clean(body.message, 3000);
      try {
        const b = await findBooking(env, ref, m, k);
        if (!b) return out({ error: 'We can’t find that booking. Please use the link in your email.' }, 404);
        const c = b.customer || {};
        const rec = { kind: 'new', id: 'T-' + rid(), k: key(), at: new Date().toISOString(), name: `${c.first || ''} ${c.last || ''}`.trim(), email: c.email || '', phone: c.phone || '', topic: KINDS[kind], ref: b.ref, request: kind,
          message: `${KINDS[kind]} (${b.ref})${message ? '\n\n' + message : ''}` };
        if (!(await file(env, `support/inbox/${Date.now()}-${rec.id}.json`, rec, `Booking request ${rec.id} for ${b.ref}`))) return out({ error: 'Could not save' }, 502);
        return out({ ok: true, id: rec.id, k: rec.k });
      } catch (e) { return out({ error: 'We couldn’t send that just now. Please try again.' }, 502); }
    }
    // unsubscribe from marketing emails (user 2026-11-27): checked against the guest's own key, then filed for the email job
    if (url.pathname === '/unsubscribe') {
      const e = clean(body.e, 200).toLowerCase(), k = clean(body.k, 40);
      if (!/^\S+@\S+\.\S+$/.test(e) || !/^[a-f0-9]{24}$/.test(k)) return out({ error: 'This unsubscribe link isn’t complete. Please reply to any of our emails and we’ll take you off the list.' }, 400);
      try {
        const { data } = await raw(env, 'customers.json'); const kk = Object.keys(data || {}).find(x => x.toLowerCase() === e);
        if (!kk || data[kk].unsubKey !== k) return out({ error: 'We couldn’t match this link. Please reply to any of our emails and we’ll take you off the list.' }, 404);
        if (data[kk].marketing === false && data[kk].unsubscribedAt) return out({ ok: true, already: true });
        if (!(await file(env, `marketing/unsub/${Date.now()}-${rid()}.json`, { e, k, at: new Date().toISOString() }, 'Unsubscribe from marketing'))) return out({ error: 'Could not save just now. Please try again.' }, 502);
        return out({ ok: true });
      } catch (x) { return out({ error: 'Something went wrong. Please try again in a minute.' }, 502); }
    }
    // a new message from the contact form
    if (url.pathname === '/contact') {
      if (body.website) return out({ ok: true });   // the hidden trap field: only robots fill it in
      const rec = { kind: 'new', id: 'T-' + rid(), k: key(), at: new Date().toISOString(), name: clean(body.name, 120), email: clean(body.email, 200), phone: clean(body.phone, 40), topic: clean(body.topic, 60), ref: clean(body.ref, 12), message: clean(body.message, 5000) };
      if (!rec.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rec.email) || rec.message.length < 2) return out({ error: 'Please add your name, email and message' }, 400);
      if (!(await file(env, `support/inbox/${Date.now()}-${rec.id}.json`, rec, `Support message ${rec.id}`))) return out({ error: 'Could not save' }, 502);
      return out({ ok: true, id: rec.id, k: rec.k });
    }
    // a guest adding to their ticket
    if (url.pathname === '/reply') {
      const rec = { kind: 'reply', id: clean(body.t, 12), k: clean(body.k, 40), at: new Date().toISOString(), message: clean(body.message, 5000) };
      if (!/^T-[A-Z0-9]{6}$/.test(rec.id) || !/^[a-f0-9]{32}$/.test(rec.k) || rec.message.length < 1) return out({ error: 'Bad request' }, 400);
      if (!(await file(env, `support/inbox/${Date.now()}-${rec.id}-r.json`, rec, `Support reply ${rec.id}`))) return out({ error: 'Could not save' }, 502);
      return out({ ok: true });
    }

    // consultation forms (the original job, at the root address)
    if (text.length > 40000) return out({ error: 'Too large' }, 413);
    const { ref, t, g, sealed } = body || {};
    const ok = /^YC-[A-Z0-9]{4,8}$/.test(ref || '') && /^[a-z0-9]{8,32}$/.test(t || '') && Number.isInteger(g) && g >= 0 && g < 20
      && sealed && sealed.v === 1 && ['k', 'iv', 'ct'].every(k => typeof sealed[k] === 'string' && /^[A-Za-z0-9+/=]+$/.test(sealed[k]));
    if (!ok) return out({ error: 'Bad request' }, 400);
    const oi = body.optin && typeof body.optin === 'object' && /^\S+@\S+\.\S+$/.test(String(body.optin.email || '')) ? { yes: !!body.optin.yes, email: String(body.optin.email).toLowerCase().slice(0, 200), name: String(body.optin.name || '').slice(0, 120) } : null;
    const rec = { ref, t, g, via: 'online', at: new Date().toISOString(), ...(oi ? { optin: oi } : {}), flags: Math.max(0, Math.min(99, parseInt(body.flags, 10) || 0)), sealed: { v: 1, alg: sealed.alg || 'RSA-OAEP-256+A256GCM', k: sealed.k, iv: sealed.iv, ct: sealed.ct } };
    const path = `consult/inbox/${ref}-g${g}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.json`;
    if (!(await file(env, path, rec, `Consultation form for ${ref} (encrypted)`))) return out({ error: 'Could not save' }, 502);
    return out({ ok: true });
  }
};
