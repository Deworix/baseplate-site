(() => {
  'use strict';
  if (!document.body.classList.contains('home-polish')) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.billing-toggle');
  const periods = [...document.querySelectorAll('.bt-opt')];
  function syncPeriod() {
    periods.forEach(button => { button.tabIndex = button.getAttribute('aria-checked') === 'true' ? 0 : -1; });
    const active = periods.find(button => button.getAttribute('aria-checked') === 'true');
    if (!active || !toggle) return;
    toggle.style.setProperty('--period-x', `${active.offsetLeft}px`);
    toggle.style.setProperty('--period-width', `${active.offsetWidth}px`);
    toggle.dataset.enhanced = '';
  }
  periods.forEach((button, index) => {
    button.addEventListener('click', syncPeriod);
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? periods.length - 1 : (index + 1) % periods.length;
      periods[next].click(); periods[next].focus();
    });
  });
  syncPeriod(); window.addEventListener('resize', syncPeriod);
  document.fonts?.ready.then(syncPeriod);

  // Animate actual disclosure height so neighbouring questions move smoothly.
  // Native details still work without JS and when motion is reduced.
  const settleFaq = [];
  document.querySelectorAll('.faq details').forEach(details => {
    const summary = details.querySelector('summary');
    const answer = document.createElement('div'); answer.className = 'faq-answer';
    while (summary.nextSibling) answer.appendChild(summary.nextSibling);
    details.appendChild(answer);
    let animation = null; let desired = details.open;
    function settle() {
      animation?.cancel(); animation = null;
      details.open = desired; details.style.height = ''; answer.inert = !desired;
    }
    settleFaq.push(settle);
    summary.addEventListener('click', event => {
      if (motion.matches || typeof details.animate !== 'function') return;
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      desired = animation ? !desired : !details.open;
      animation?.cancel(); details.style.height = ''; details.open = true; answer.inert = !desired;
      const style = getComputedStyle(details);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const target = desired ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
      animation = details.animate([{height:`${start}px`},{height:`${target}px`}], {duration:320,easing:'cubic-bezier(.2,.65,.3,1)',fill:'both'});
      animation.onfinish = settle;
    });
    details.addEventListener('toggle', () => { if (!animation) { desired = details.open; answer.inert = !details.open; } });
  });
  window.addEventListener('resize', () => settleFaq.forEach(settle => settle()));
  motion.addEventListener('change', () => {
    settleFaq.forEach(settle => settle());
    if (motion.matches) document.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
  });
  if (!motion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); observer.unobserve(entry.target); }
    }), {threshold:0.05});
    document.querySelectorAll('.section-head,.demo-head,.live-demo-head,.card,.plan,.loop-step').forEach(element => {
      element.setAttribute('data-reveal', '');
      const siblings = [...element.parentElement.children];
      if (element.matches('.card,.plan,.loop-step')) element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element), 3) * 60}ms`);
      if (element.getBoundingClientRect().top > innerHeight) { element.classList.add('reveal-pending'); observer.observe(element); }
    });
    document.addEventListener('focusin', event => event.target.closest('.reveal-pending')?.classList.remove('reveal-pending'));
    document.addEventListener('beforematch', event => event.target.closest('.reveal-pending')?.classList.remove('reveal-pending'));
  }
  const proDeck = document.querySelector('.license-pro');
  if (proDeck && !motion.matches && 'IntersectionObserver' in window) {
    const deckObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        proDeck.classList.add('deck-arrived'); deckObserver.disconnect();
      }
    }, {threshold:0.15});
    deckObserver.observe(proDeck);
  }
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.card,.plan').forEach(card => {
      let frame = null; let x = 0; let y = 0;
      card.addEventListener('pointermove', event => {
        if (motion.matches) return;
        const rect = card.getBoundingClientRect(); x = event.clientX - rect.left; y = event.clientY - rect.top;
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          card.style.setProperty('--light-x', `${x}px`); card.style.setProperty('--light-y', `${y}px`);
          card.style.setProperty('--light-opacity', '1'); frame = null;
        });
      });
      card.addEventListener('pointerleave', () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; card.style.setProperty('--light-opacity', '0');
      });
    });
  }
})();
