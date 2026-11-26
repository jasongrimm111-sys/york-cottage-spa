# Consultation form receiver

Guests fill in their consultation form on the website (consult.html). Their browser encrypts it with York Cottage's
public key before sending, so this service only ever handles encrypted data that it can't read. It files each form in
the private data store (`consult/inbox/`); the booking jobs then match it to the booking and mark the form as done.

## Set up (once, about 10 minutes)
1. Create a free Cloudflare account, then in this folder run `npx wrangler login` and `npx wrangler deploy`.
2. On GitHub, create a fine-grained key with access to **york-cottage-spa-data** only, Contents: Read and write.
3. Run `npx wrangler secret put GITHUB_TOKEN` and paste the key.
4. Copy the address it prints (https://york-cottage-consult.<you>.workers.dev) into the admin portal:
   Settings → Consultation form → Receiving address.

Until then, guests fill in the form on a tablet when they arrive.
