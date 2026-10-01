/* One short, decorative signal on first view; the complete map needs no JS. */
(() => {
  const init = () => {
    if (!('IntersectionObserver' in window) || !window.matchMedia) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;

    document.querySelectorAll('[data-bp-bridge]').forEach(section => {
      let started = false;
      let finished = false;
      let timer = 0;
      let observer;

      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        section.classList.remove('bp-bridge-running');
        observer?.disconnect();
        if (motion.removeEventListener) motion.removeEventListener('change', onMotionChange);
        else motion.removeListener(onMotionChange);
        window.removeEventListener('pagehide', finish);
      };
      const onMotionChange = event => { if (event.matches) finish(); };

      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (finished) return;
          if (!started && entry.isIntersecting && entry.intersectionRatio >= .25) {
            started = true;
            section.classList.add('bp-bridge-running');
            timer = window.setTimeout(finish, 2200);
          } else if (started && !entry.isIntersecting) {
            finish();
          }
        });
      }, { threshold: [0, .25] });

      if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
      else motion.addListener(onMotionChange);
      window.addEventListener('pagehide', finish);
      observer.observe(section);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
