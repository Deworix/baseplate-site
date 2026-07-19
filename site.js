// Baseplate site behavior: hero demo loop, billing toggle, buy links, downloads.
(function () {
  const cfg = window.BASEPLATE_SITE || { stripe: {}, downloads: {} };

  /* ── Hero demo: the Playtest Copilot loop, replaying ─────────────── */
  const SCRIPT = [
    { cls: 'sys',  text: '▶ playtest started · demo-tycoon', status: 'playtesting…', delay: 400 },
    { cls: 'err',  text: 'ServerScriptService.Tycoon:46: attempt to compare nil < number', status: 'error caught', delay: 1500 },
    { cls: 'say',  text: 'Cash isn’t initialized before the dropper pays out — the leaderstat is created after the first payout tick. Fixing the order in Tycoon.server.luau.', status: 'diagnosing…', delay: 1400 },
    { cls: 'chip', text: '✎ Edit · src/server/Tycoon.server.luau', status: 'writing fix…', delay: 1600 },
    { cls: 'sys',  text: '▶ re-running playtest…', status: 'verifying…', delay: 1400 },
    { cls: 'ok',   text: '✓ console clean · 0 errors · PASS', status: 'PASS', delay: 1300 },
  ];
  const body = document.getElementById('demo-body');
  const status = document.getElementById('demo-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function playDemo() {
    if (!body) return;
    body.innerHTML = '';
    let t = 300;
    SCRIPT.forEach((step, i) => {
      t += step.delay;
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line ' + step.cls;
        div.textContent = step.text;
        body.appendChild(div);
        requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('show')));
        if (status) {
          status.textContent = step.status;
          status.style.color = step.status === 'PASS' ? 'var(--mint)' : '';
        }
        if (i === SCRIPT.length - 1) setTimeout(playDemo, 5200);
      }, t);
    });
  }
  if (body) {
    if (reduced) {
      // No animation: render the finished state once.
      SCRIPT.forEach((step) => {
        const div = document.createElement('div');
        div.className = 'line show ' + step.cls;
        div.textContent = step.text;
        body.appendChild(div);
      });
      if (status) { status.textContent = 'PASS'; status.style.color = 'var(--mint)'; }
    } else {
      playDemo();
    }
  }

  /* ── Billing toggle (monthly / yearly) ───────────────────────────── */
  let period = 'yearly';
  const opts = document.querySelectorAll('.bt-opt');
  function applyPeriod() {
    opts.forEach((b) => {
      const on = b.dataset.period === period;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
    document.querySelectorAll('[data-monthly]').forEach((el) => {
      el.textContent = period === 'yearly' ? el.dataset.yearly : el.dataset.monthly;
    });
    applyBuyLinks();
  }
  opts.forEach((b) => b.addEventListener('click', () => { period = b.dataset.period; applyPeriod(); }));

  /* ── Buy buttons → Stripe Payment Links ──────────────────────────── */
  function applyBuyLinks() {
    document.querySelectorAll('.buy').forEach((a) => {
      const url = cfg.stripe?.[a.dataset.plan]?.[period] || '';
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.removeAttribute('data-fallback');
      } else {
        // Checkout not wired yet → send visitors to the free download instead.
        a.href = '#download';
        a.removeAttribute('target');
        a.setAttribute('data-fallback', '1');
      }
    });
  }

  /* ── Download buttons ────────────────────────────────────────────── */
  document.querySelectorAll('.dl-btn').forEach((a) => {
    const url = cfg.downloads?.[a.dataset.os];
    if (url) { a.href = url; a.target = '_blank'; }
  });

  /* ── Subscription management (Stripe Customer Portal) ────────────────
     Point every "billing portal" link at the configured portal URL. Until it's set, hide
     the link and reveal the support fallback so the answer is never a dead link. */
  const portal = (cfg.manage || '').trim();
  document.querySelectorAll('.manage-portal').forEach((a) => {
    if (portal) { a.href = portal; a.target = '_blank'; a.rel = 'noopener'; }
    else { a.removeAttribute('href'); a.style.textDecoration = 'none'; a.style.color = 'inherit'; a.style.cursor = 'default'; }
  });
  if (!portal) document.querySelectorAll('.manage-fallback').forEach((el) => { el.hidden = false; });

  /* A <details> FAQ item doesn't auto-open when you link to its id, so a "Manage
     subscription" click would land on a collapsed accordion showing only the question.
     Open it (and scroll to it) whenever the hash points at it. */
  function openHashDetails() {
    if (location.hash !== '#manage') return;
    const d = document.getElementById('manage');
    if (d && d.tagName === 'DETAILS') { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  window.addEventListener('hashchange', openHashDetails);
  openHashDetails();

  applyPeriod();
})();
