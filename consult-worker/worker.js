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
const monthsOf = (date, nights) => [...new Set([0, nights || 0, 31].map(n => E.addD(date, n).slice(0, 7)))];
const live = list => (list || []).filter(h => new Date(h.expires).getTime() > Date.now());
const holdView = h => ({ id: h.id, product: h.product, date: h.date, nights: h.nights || 0, sessionId: h.sessionId || null, guests: h.guests, rooms: h.rooms || [], items: (h.items || []).map(i => ({ key: i.key, date: i.date, start: i.start, min: i.min, buffer: i.buffer, staff: i.staff, troom: i.troom, tid: i.tid, guest: i.guest })), food: h.food || null, status: 'hold', expires: h.expires });
async function takeHold(env, b, release) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ data: cfg }, holds] = await Promise.all([raw(env, 'config.json'), raw(env, 'holds/active.json')]);
    let list = live(holds.data).filter(h => h.id !== release);
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
      var hold = holdView({ ...b, id: 'H-' + rid(8), items: plan.items, expires: new Date(Date.now() + mins * 60000).toISOString() });
      list = list.concat(hold);
    }
    const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/holds/active.json`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message: b ? 'Hold ' + hold.id : 'Release hold', content: b64(JSON.stringify(list)), ...(holds.sha ? { sha: holds.sha } : {}) }) });
    if (r.ok) return { ok: true, hold: hold ? hold.id : null, expires: hold ? hold.expires : null };
    if (r.status !== 409 && r.status !== 422) throw new Error('save hold ' + r.status);
    // someone else saved a hold at the same moment: read again and re-check against theirs
  }
  return { ok: false, why: 'Busy just now, please try again' };
}

async function file(env, path, rec, message) {
  const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/${path}`, { method: 'PUT', headers: GH(env), body: JSON.stringify({ message, content: b64(JSON.stringify(rec)) }) });
  return r.ok;
}

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
    if (request.method === 'GET' && url.pathname === '/holds') {
      const { data } = await raw(env, 'holds/active.json');
      return out({ holds: live(data).map(holdView) });
    }
    if (request.method !== 'POST') return out({ error: 'Not allowed' }, 405);
    const text = await request.text();
    if (text.length > 40000) return out({ error: 'Too large' }, 413);
    let body; try { body = JSON.parse(text); } catch { return out({ error: 'Bad request' }, 400); }

    if (url.pathname === '/hold' || url.pathname === '/release') {
      try {
        if (url.pathname === '/release') return out(await takeHold(env, null, clean(body.hold, 12)));
        const b = body.booking || {};
        if (!b.product || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !(b.guests >= 1 && b.guests <= 30)) return out({ error: 'Bad request' }, 400);
        // names and notes are never kept in a hold; only what's needed to keep the times
        const bk = { product: clean(b.product, 20), date: b.date, nights: +b.nights || 0, sessionId: b.sessionId ? clean(b.sessionId, 30) : null, guests: +b.guests, blueLight: !!b.blueLight, rooms: (b.rooms || []).map(r => clean(r, 20)).slice(0, 12), times: b.times || {}, pairs: Object.fromEntries(Object.entries(b.pairs || {}).slice(0, 30).map(([k, v]) => [clean(k, 20), clean(v, 20)])),
          guestList: (b.guestList || []).slice(0, 30).map(g => ({ included: g.included ? clean(g.included, 40) : null, food: g.food ? clean(g.food, 40) : null, extras: (g.extras || []).slice(0, 6).map(x => clean(x, 40)) })) };
        const r = await takeHold(env, bk, body.release ? clean(body.release, 12) : null);
        return out(r, r.ok ? 200 : 409);
      } catch (e) { return out({ error: 'Could not check availability just now' }, 502); }
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
    const rec = { ref, t, g, via: 'online', at: new Date().toISOString(), sealed: { v: 1, alg: sealed.alg || 'RSA-OAEP-256+A256GCM', k: sealed.k, iv: sealed.iv, ct: sealed.ct } };
    const path = `consult/inbox/${ref}-g${g}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.json`;
    if (!(await file(env, path, rec, `Consultation form for ${ref} (encrypted)`))) return out({ error: 'Could not save' }, 502);
    return out({ ok: true });
  }
};
