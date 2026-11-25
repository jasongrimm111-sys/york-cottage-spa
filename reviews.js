/* Live Google rating and reviews (Google Maps Places API, official).
   Setup: create a browser API key in Google Cloud with "Maps JavaScript API" and "Places API (New)" enabled,
   restrict it to this site's web address (HTTP referrers), then paste it into apiKey below.
   Until a key is added, the page shows the fallback numbers. */
window.YC_GOOGLE = Object.assign({
  apiKey: '',                       // <- paste the Google Maps browser API key here
  placeId: '',                      // optional: York Cottage Spa's Place ID (found automatically if empty)
  query: 'York Cottage Spa, Easton Lane, Bozeat NN29 7NN',
  fallback: { rating: 4.6, count: 266, url: 'https://www.google.com/search?q=York+Cottage+Spa+Bozeat+reviews' }
}, window.YC_GOOGLE || {});

(() => {
  const C = window.YC_GOOGLE;
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stars = r => `<span class="stars" role="img" aria-label="${r} out of 5 stars">${[0,1,2,3,4].map(i => {
    const f = Math.max(0, Math.min(1, r - i)); return `<span class="st"><span class="st-bg">${STAR}</span><span class="st-fg" style="width:${f * 100}%">${STAR}</span></span>`; }).join('')}</span>`;

  function paint(d){
    const r = Math.round(d.rating * 10) / 10;
    document.querySelectorAll('[data-g-rating]').forEach(e => e.textContent = r.toFixed(1));
    document.querySelectorAll('[data-g-count]').forEach(e => e.textContent = d.count.toLocaleString('en-GB'));
    document.querySelectorAll('[data-g-stars]').forEach(e => e.innerHTML = stars(r));
    document.querySelectorAll('[data-g-link]').forEach(e => e.href = d.url);
    const box = document.getElementById('gReviews');
    if (box && d.reviews && d.reviews.length){
      box.innerHTML = d.reviews.slice(0, 6).map(v => `<article class="g-rev">
        <div class="g-rev-h">${v.photo ? `<img src="${esc(v.photo)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<i>${esc((v.name || '?')[0])}</i>`}
          <div><b>${v.link ? `<a href="${esc(v.link)}" target="_blank" rel="noopener">${esc(v.name)}</a>` : esc(v.name)}</b><small>${esc(v.when)}</small></div></div>
        ${stars(v.rating)}
        <p>${esc(v.text)}</p>
      </article>`).join('') + `<p class="g-attr">Reviews from <b>Google</b>. <a data-g-link href="${esc(d.url)}" target="_blank" rel="noopener">See all ${d.count.toLocaleString('en-GB')} reviews</a></p>`;
      box.hidden = false;
    }
  }

  paint(C.fallback);
  if (!C.apiKey) return;

  // cache for this visitor for 6 hours, so each visit doesn't call the API again
  const KEY = 'yc-greviews-v1';
  try { const c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.t < 216e5){ paint(c.d); return; } } catch (e) {}

  (g => { var h, a, k, p = 'The Google Maps JavaScript API', c = 'google', l = 'importLibrary', q = '__ib__', m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement('script')); e.set('libraries', [...r] + ''); for (k in g) e.set(k.replace(/[A-Z]/g, t => '_' + t[0].toLowerCase()), g[k]); e.set('callback', c + '.maps.' + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + ' could not load.')); a.nonce = m.querySelector('script[nonce]')?.nonce || ''; m.head.append(a); })); d[l] ? console.warn(p + ' only loads once. Ignoring:', g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)); })({ key: C.apiKey, v: 'weekly' });

  (async () => {
    try {
      const { Place } = await google.maps.importLibrary('places');
      let id = C.placeId;
      if (!id){ const { places } = await Place.searchByText({ textQuery: C.query, fields: ['id'], maxResultCount: 1 }); id = places && places[0] && places[0].id; }
      if (!id) return;
      const place = new Place({ id });
      await place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'googleMapsURI'] });
      const d = {
        rating: place.rating || C.fallback.rating,
        count: place.userRatingCount || C.fallback.count,
        url: place.googleMapsURI || C.fallback.url,
        reviews: (place.reviews || []).filter(v => v.text && v.rating === 5).map(v => ({
          name: v.authorAttribution && v.authorAttribution.displayName, photo: v.authorAttribution && v.authorAttribution.photoURI,
          link: v.authorAttribution && v.authorAttribution.uri, rating: v.rating || 5, when: v.relativePublishTimeDescription || '', text: v.text
        }))
      };
      paint(d);
      try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
    } catch (e) { console.warn('Google reviews unavailable, showing saved rating.', e); }
  })();
})();
