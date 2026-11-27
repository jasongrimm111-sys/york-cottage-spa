# Search engine set-up for every page (2026-11-27). Safe to run again: it rewrites the same tags each time.
#  - titles and descriptions written for Google (place names people search for), kept to Google's lengths
#  - canonical address on www.yorkcottagespa.com, Open Graph / Twitter tags with each page's own picture
#  - breadcrumbs (and FAQ answers on faqs.html) as structured data
#  - pinch-zoom allowed on phones (Google and accessibility checks flag pages that block it)
#  - sitemap.xml with today's date
# The test address stays hidden from Google (robots.txt + noindex) until the move: run _tools/go-live.py then.
# Folders starting with _ are not published by GitHub Pages.
import re, json, os, html, datetime
W = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = 'https://www.yorkcottagespa.com/'
P = {  # page: (title, description, breadcrumb parent)
 'index': ('York Cottage Spa | Day Spa & Spa Breaks, Northamptonshire', 'An award-winning boutique spa with rooms in Bozeat, Northamptonshire, near Wellingborough and Northampton. Day spas, spa breaks and whole-house stays.', None),
 'spa': ('Spa Days in Northamptonshire | York Cottage Spa, Bozeat', 'Spa days at York Cottage in Bozeat: Day Spa with treatments and food, Spa Access to the pool, hot tub and sauna, or a Private Spa just for your group.', 'index'),
 'day-spa': ('Day Spa with Treatment & Afternoon Tea | York Cottage Spa', 'A 4-hour Day Spa at York Cottage, Bozeat: indoor pool, hot tub, sauna and lounge, a treatment and afternoon tea or a grazing board. £100 per person.', 'spa'),
 'spa-access': ('Spa Access: Pool, Hot Tub & Sauna | York Cottage Spa, Bozeat', 'Four relaxing hours in the indoor pool, hot tub, sauna and lounge at York Cottage Spa in Bozeat, Northamptonshire, for £50 per person.', 'spa'),
 'private-spa': ('Private Spa Hire for Groups | York Cottage Spa, Bozeat', 'Have the whole spa to yourselves: private sessions for groups of 4 or more at York Cottage, Bozeat, from £100 per person. Ideal for birthdays and hen parties.', 'spa'),
 'treatments': ('Massages, Facials & Head Spa | York Cottage Spa, Bozeat', 'Aromatherapy massages, facials and Japanese head spa at York Cottage Spa in Bozeat. Book a treatment on its own, or add one to a spa day or a stay.', 'spa'),
 'stay': ('Spa Breaks & Stays in Northamptonshire | York Cottage Spa', 'Overnight spa breaks, two-night breaks, group breaks and whole-house stays at York Cottage Spa in Bozeat, Northamptonshire, with the spa included.', 'index'),
 'spa-breaks': ('Overnight Spa Break in Northamptonshire | York Cottage Spa', 'An overnight spa break at York Cottage: an ensuite room, time in the pool, hot tub and sauna, and breakfast. From £145 per person, Sunday to Thursday.', 'stay'),
 'two-night-break': ('Two-Night Spa Break | York Cottage Spa, Northamptonshire', 'Two nights to slow right down at York Cottage Spa in Bozeat: ensuite rooms and the spa, from £220 per person, arriving Sunday to Wednesday.', 'stay'),
 'group-breaks': ('Group Spa Breaks for 7+ Guests | York Cottage Spa', 'Group spa breaks at York Cottage for 7 or more friends or family: rooms, the spa and food, from £145 per person, Sunday to Thursday. Perfect for celebrations.', 'stay'),
 'whole-house': ('Exclusive-Use House with Private Spa, Sleeps 16 | York Cottage', 'Hire the whole of York Cottage and its private spa for up to 16 guests in Bozeat, Northamptonshire. From £1,840 per night, 2-night minimum.', 'stay'),
 'events': ('Hen Parties & Celebrations | York Cottage Spa, Bozeat', 'Hen parties, birthdays, weddings and special occasions at York Cottage Spa in Northamptonshire, with a private spa, food and rooms for your group.', 'index'),
 'corporate': ('Corporate Retreats & Away Days | York Cottage Spa', 'Corporate retreats, team away days, meetings and product launches at York Cottage, Bozeat: a country house with a private spa, an hour from London.', 'events'),
 'afternoon-tea': ('Afternoon Tea & Grazing Boards | York Cottage Spa, Bozeat', 'Freshly made afternoon tea and grazing boards from Desired Desserts at York Cottage Spa, included with Day Spa sessions and available for groups.', 'events'),
 'private-chef': ('Private Chef for Your Stay | York Cottage Spa, Bozeat', 'Book a private chef to cook a relaxed dinner for your group in the house during your stay at York Cottage Spa in Bozeat, Northamptonshire.', 'recommendations'),
 'yoga': ('Private Yoga Sessions | York Cottage Spa, Bozeat', 'Private yoga sessions for your group at York Cottage Spa in Bozeat, from £15 per person. Add one to a spa day, a break or a whole-house stay.', 'recommendations'),
 'recommendations': ('Extras & Things to Do near Bozeat | York Cottage Spa', 'Extras to make your stay at York Cottage Spa special, from a private chef and yoga to afternoon tea, plus things to do near Bozeat, Northamptonshire.', 'index'),
 'local-dining': ('Pubs & Restaurants near Bozeat | York Cottage Spa', 'Our favourite pubs, restaurants and takeaways near York Cottage Spa in Bozeat, Northamptonshire, for dinner during your stay.', 'recommendations'),
 'gift-vouchers': ('Spa Gift Vouchers, Northamptonshire | York Cottage Spa', 'Spa gift vouchers from York Cottage Spa: Day Spa, Day Spa for Two and spa breaks. Sent by email in minutes, valid for 12 months. The perfect present.', 'index'),
 'gallery': ('Photo Gallery: the Spa, Rooms & House | York Cottage Spa', 'Photos of York Cottage Spa in Bozeat: the indoor pool and spa, ensuite bedrooms, the house and gardens, and the food.', 'index'),
 'faqs': ('FAQs: Spa Days, Stays & Vouchers | York Cottage Spa', 'Answers to common questions about York Cottage Spa: spa days, treatments, stays, the whole house, gift vouchers, what to bring and how to find us.', 'index'),
 'contact': ('Contact & Directions | York Cottage Spa, Bozeat NN29 7NN', 'How to find York Cottage Spa on Easton Lane, Bozeat, Northamptonshire NN29 7NN, near Wellingborough. Call 01933 580100 or send us a message.', 'index'),
 'book': ('Book a Spa Day, Treatment or Stay | York Cottage Spa', 'Book online at York Cottage Spa: spa days, treatments, overnight spa breaks and whole-house stays, with real-time availability.', 'index'),
 'privacy': ('Privacy Policy | York Cottage Spa', 'How York Cottage Spa collects, uses and looks after your personal information when you book, buy a voucher or get in touch.', 'index'),
 'terms': ('Booking Terms & Conditions | York Cottage Spa', 'The terms and conditions for booking spa days, treatments, stays and gift vouchers with York Cottage Spa, including payments and cancellations.', 'index'),
}
NAMES = {'index': 'Home', 'spa': 'Spa days', 'stay': 'Stays', 'events': 'Events', 'recommendations': 'Recommendations'}
KEEP_NOINDEX = ['404', 'manage', 'consult', 'pay', 'ticket', 'unsubscribe']   # never in Google, even after the move
url = lambda p: SITE if p == 'index' else SITE + p + '.html'
A = lambda s: html.escape(s, quote=True)

def meta(h, sel, val, attr='content'):
    # replace (or add before </head>) a <meta name|property=...> tag
    k, n = sel
    r = re.compile(r'<meta %s="%s" content="[^"]*">' % (k, re.escape(n)))
    tag = '<meta %s="%s" content="%s">' % (k, n, A(val))
    return r.sub(lambda m: tag, h, 1) if r.search(h) else h.replace('</head>', tag + '\n</head>', 1)

def first_image(h):
    m = re.search(r'class="page-hero[^"]*"[^>]*>[\s\S]{0,800}?<img[^>]+src="([^"]+)"', h) or re.search(r'<img[^>]+src="(https://static\.wixstatic[^"]+)"', h)
    if m: return re.sub(r'/v1/[^/]+/[^/]+/', '/v1/fill/w_1200,h_630,q_80,enc_auto/', m.group(1)) if 'wixstatic' in m.group(1) else m.group(1)
    m = re.search(r'background-image:\s*url\(["\']?(https://static\.wixstatic[^"\')]+)', h)
    return m.group(1) if m else 'https://static.wixstatic.com/media/7a9273_3128e98839d246529de17f99846a2b2a~mv2.jpg/v1/fill/w_1200,h_630,q_80,enc_auto/x.jpg'

def chain(p):
    out = []
    while p: out.insert(0, p); p = P[p][2]
    return out

for f in sorted(os.listdir(W)):
    if not f.endswith('.html'): continue
    p = f[:-5]; path = os.path.join(W, f); h = open(path, encoding='utf8').read(); o = h
    # zooming allowed on phones
    h = h.replace(', maximum-scale=1, user-scalable=no', '')
    if p in P:
        t, d, _ = P[p]
        h = re.sub(r'<title>[^<]*</title>', '<title>%s</title>' % A(t), h, 1)
        h = meta(h, ('name', 'description'), d)
        h = meta(h, ('property', 'og:title'), t); h = meta(h, ('property', 'og:description'), d)
        h = meta(h, ('property', 'og:url'), url(p)); h = meta(h, ('property', 'og:image'), first_image(h))
        h = meta(h, ('property', 'og:locale'), 'en_GB')
        h = meta(h, ('name', 'twitter:card'), 'summary_large_image')
        can = '<link rel="canonical" href="%s">' % url(p)
        h = re.sub(r'<link rel="canonical" href="[^"]*">', can, h) if 'rel="canonical"' in h else h.replace('<meta name="description"', can + '\n<meta name="description"', 1)
        # breadcrumbs (and FAQ answers) as structured data, in one block we own
        ld = []
        if p != 'index':
            c = chain(p)
            ld.append({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': NAMES.get(x, re.sub(r'\s*\|.*$', '', P[x][0]).split(':')[0].strip() if x != p else re.sub(r'\s*\|.*$', '', t)), 'item': url(x)} for i, x in enumerate(c)]})
        if p == 'faqs':
            qa = []
            for m in re.finditer(r'<details[^>]*>\s*<summary[^>]*>([\s\S]*?)</summary>([\s\S]*?)</details>', h):
                q = re.sub(r'<[^>]+>', '', m.group(1)).strip(); a = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', m.group(2))).strip()
                if q and a: qa.append({'@type': 'Question', 'name': html.unescape(q), 'acceptedAnswer': {'@type': 'Answer', 'text': html.unescape(a)}})
            if qa: ld.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': qa})
            print('faqs: %d questions' % len(qa))
        h = re.sub(r'\n?<script type="application/ld\+json" data-seo>[\s\S]*?</script>', '', h)
        if ld: h = h.replace('</head>', '<script type="application/ld+json" data-seo>%s</script>\n</head>' % json.dumps(ld if len(ld) > 1 else ld[0], ensure_ascii=False), 1)
    if p in KEEP_NOINDEX and 'name="robots"' not in h:
        h = h.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">', 1)
    if h != o: open(path, 'w', encoding='utf8', newline='').write(h); print('updated', f)

# sitemap
today = datetime.date.today().isoformat()
pri = lambda p: '1.0' if p == 'index' else '0.9' if p in ('spa', 'day-spa', 'stay', 'book', 'treatments', 'gift-vouchers') else '0.5' if p in ('privacy', 'terms') else '0.7'
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n' % (url(p), today, pri(p)) for p in P) + '</urlset>\n'
open(os.path.join(W, 'sitemap.xml'), 'w', encoding='utf8', newline='\n').write(sm)
print('sitemap', len(P), 'pages')
