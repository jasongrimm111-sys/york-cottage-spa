// York Cottage consultation forms: a tiny receiver. It only accepts forms that are ALREADY ENCRYPTED in the guest's
// browser (it can't read them), and files each one in the private data store (consult/inbox/), where the booking
// jobs match it to its booking. Secrets: GITHUB_TOKEN (fine-grained, york-cottage-spa-data only, Contents: read and write).
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST' || !allowed.includes(origin)) return Response.json({ error: 'Not allowed' }, { status: 403, headers: cors });
    const text = await request.text();
    if (text.length > 40000) return Response.json({ error: 'Too large' }, { status: 413, headers: cors });
    let body; try { body = JSON.parse(text); } catch { return Response.json({ error: 'Bad request' }, { status: 400, headers: cors }); }
    const { ref, t, g, sealed } = body || {};
    const ok = /^YC-[A-Z0-9]{4,8}$/.test(ref || '') && /^[a-z0-9]{8,32}$/.test(t || '') && Number.isInteger(g) && g >= 0 && g < 20
      && sealed && sealed.v === 1 && ['k', 'iv', 'ct'].every(k => typeof sealed[k] === 'string' && /^[A-Za-z0-9+/=]+$/.test(sealed[k]));
    if (!ok) return Response.json({ error: 'Bad request' }, { status: 400, headers: cors });
    const rec = { ref, t, g, via: 'online', at: new Date().toISOString(), sealed: { v: 1, alg: sealed.alg || 'RSA-OAEP-256+A256GCM', k: sealed.k, iv: sealed.iv, ct: sealed.ct } };
    const path = `consult/inbox/${ref}-g${g}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.json`;
    const r = await fetch(`https://api.github.com/repos/${env.DATA_REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'york-cottage-consult', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Consultation form for ${ref} (encrypted)`, content: btoa(JSON.stringify(rec)) })
    });
    if (!r.ok) return Response.json({ error: 'Could not save' }, { status: 502, headers: cors });
    return Response.json({ ok: true }, { headers: cors });
  }
};
