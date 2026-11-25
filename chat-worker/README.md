# York Cottage chat server (Cloudflare Worker)

The website chat (`chat.js`) answers from built-in facts on its own. To have Claude answer instead:

1. Create a Claude API key at https://platform.claude.com (in the spa's own account).
2. In this folder: `npm install`, then `npx wrangler login`.
3. `npx wrangler secret put ANTHROPIC_API_KEY` and paste the key. Cloudflare stores it; it never goes in the website.
4. `npm run deploy`. Copy the web address it prints (for example `https://york-cottage-chat.<name>.workers.dev`).
5. In `chat.js`, set `endpoint: 'https://york-cottage-chat.<name>.workers.dev'` and publish the site.
6. In `wrangler.toml`, keep `ALLOWED_ORIGINS` listing the site's web address(es).

Update the facts in `worker.js` (the SYSTEM text) whenever prices or times change.
If the server is ever unavailable, the chat falls back to its built-in answers, and "Email the team" is always there.
