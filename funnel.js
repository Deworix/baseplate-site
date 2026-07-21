// Privacy-preserving aggregate funnel. No cookies, localStorage, fingerprint, user ID,
// session ID, project data or free-form text. GPC / Do Not Track is respected.
(function () {
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
  const endpoint = 'https://baseplate-license.baseplate-app.workers.dev/event';
  const allowed = /^[a-z0-9._/-]{1,80}$/;
  const clean = (value) => {
    const text = String(value || '').trim().toLowerCase().slice(0, 80);
    return allowed.test(text) ? text : undefined;
  };
  const query = new URLSearchParams(location.search);
  const attribution = {
    source: clean(query.get('utm_source')),
    medium: clean(query.get('utm_medium')),
    campaign: clean(query.get('utm_campaign')),
  };

  function track(event, details = {}) {
    const body = JSON.stringify({
      event, surface: 'site', path: clean(location.pathname), ...attribution,
      platform: clean(details.platform), plan: clean(details.plan), status: clean(details.status),
    });
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
  window.baseplateTrack = track;
  track('landing_view');

  document.addEventListener('submit', (event) => {
    if (event.target.matches('.pd-global-prompt, .pd-prompt')) track('live_demo_started');
  }, true);
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a,button');
    if (!target) return;
    if (target.matches('[data-funnel="verify"]')) track('verify_cta_clicked');
    if (target.matches('.dl-btn')) track('download_clicked', { platform: target.dataset.os });
    if (target.matches('.buy') && target.dataset.fallback !== '1') track('checkout_clicked', { plan: target.dataset.plan });
  }, true);
}());
