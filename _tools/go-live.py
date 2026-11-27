# Run ONCE when the site moves to www.yorkcottagespa.com (2026-11-27): lets Google in.
#  - removes the noindex tag from the public pages (booking links, payment, consultation, messages and 404 stay hidden)
#  - writes the real robots.txt with the sitemap
# Afterwards: add the site to Google Search Console, submit sitemap.xml, and set up 301 redirects from the old Wix
# addresses if any differ (Wix pages had no .html, e.g. /day-spa → /day-spa.html).
import os, re
W = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
KEEP = ['404', 'manage', 'consult', 'pay', 'ticket', 'unsubscribe']
for f in os.listdir(W):
    if not f.endswith('.html') or f[:-5] in KEEP: continue
    p = os.path.join(W, f); h = open(p, encoding='utf8').read()
    n = re.sub(r'\n?<meta name="robots" content="noindex, nofollow">', '', h)
    if n != h: open(p, 'w', encoding='utf8', newline='').write(n); print('now visible to Google:', f)
open(os.path.join(W, 'robots.txt'), 'w', encoding='utf8', newline='\n').write(
    'User-agent: *\n' + ''.join('Disallow: /%s.html\n' % k for k in KEEP if k != '404') + '\nSitemap: https://www.yorkcottagespa.com/sitemap.xml\n')
print('robots.txt written. Remember the CNAME file: it must say www.yorkcottagespa.com')
