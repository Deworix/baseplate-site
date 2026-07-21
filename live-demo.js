// Interactive Baseplate product simulation. It is intentionally deterministic and
// network-free: visitor prompts stay in this document and never consume AI credits.
(function () {
  const root = document.querySelector('[data-live-demo]');
  if (!root) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pane = (name) => root.querySelector(`[data-pane="${name}"] .pd-terminal`);
  const progress = root.querySelector('.pd-progress span');
  const progressDot = root.querySelector('.pd-progress i');
  const globalForm = root.querySelector('.pd-global-prompt');
  const globalInput = globalForm.querySelector('input');
  const builderForm = root.querySelector('.pd-prompt');
  const builderInput = builderForm.querySelector('input');
  const evidence = [...root.querySelectorAll('.pd-evidence span')];
  const timers = [];
  let generation = 0;

  const initial = Object.fromEntries(['builder', 'studio', 'regression', 'guard'].map((name) => [name, pane(name).innerHTML]));
  const presets = {
    payout: 'Fix the nil payout bug and prove it in Studio',
    sprint: 'Add sprint with a mobile-safe stamina bar',
    remote: 'Harden the BuyItem remote against fake prices and spam',
  };

  function classify(prompt) {
    if (/remote|exploit|hack|price|spam|secure|harden/i.test(prompt)) return 'remote';
    if (/sprint|mobile|stamina|ui|button|touch/i.test(prompt)) return 'sprint';
    return 'payout';
  }

  function scenario(kind, prompt) {
    if (kind === 'remote') return [
      ['builder', 'prompt', `› ${prompt}`], ['guard', 'sys', '◆ Contract scan · BuyItem(player, itemId, clientPrice)'],
      ['guard', 'err', '× HIGH · clientPrice is trusted · no rate limit'], ['builder', 'sys', '◆ Read · src/server/Shop.server.luau:41'],
      ['builder', 'add', '+ server-owned price lookup · type/range checks'], ['builder', 'add', '+ per-player token bucket · ownership validation'],
      ['guard', 'ok', '✓ validator compiled · 4 fuzz cases generated'], ['studio', 'sys', '▶ Play · fuzz harness in test universe'],
      ['regression', 'sys', '✓ Epoch  ✓ Play  ✓ State  ✓ Stop'], ['studio', 'ok', '✓ 25-call burst rate-limited · Output clean'],
      ['regression', 'pass', 'PASS · contract hardened · evidence saved'],
    ];
    if (kind === 'sprint') return [
      ['builder', 'prompt', `› ${prompt}`], ['builder', 'sys', '◆ Map input actions + current HUD'],
      ['builder', 'add', '+ SprintController.client.luau'], ['builder', 'add', '+ stamina bar uses Scale + safe insets'],
      ['studio', 'sys', '▶ Device preset · Phone · Portrait'], ['studio', 'ok', '✓ virtual Shift + touch button exercised'],
      ['regression', 'sys', '✓ Desktop/Landscape · 1 player'], ['regression', 'sys', '✓ Phone/Portrait · 1 player'],
      ['guard', 'ok', '✓ no new client-authoritative remotes'], ['studio', 'ok', '✓ Output clean · UI inside viewport'],
      ['regression', 'pass', 'PASS · 2/2 matrix variants · baseline saved'],
    ];
    return [
      ['builder', 'prompt', `› ${prompt}`], ['studio', 'sys', '▶ Play started · demo-tycoon'],
      ['regression', 'sys', '✓ Fresh evidence epoch'], ['studio', 'err', '× Tycoon.server.luau:46 · nil < number'],
      ['builder', 'sys', '◆ Root cause · Cash initializes after first payout tick'], ['builder', 'add', '+ initialize leaderstat before dropper loop'],
      ['guard', 'ok', '✓ payout remains server-authoritative'], ['studio', 'sys', '▶ Re-running real Play session'],
      ['regression', 'sys', '✓ Play  ✓ State  ✓ Stop'], ['studio', 'ok', '✓ Output clean · 0 runtime errors'],
      ['regression', 'pass', 'PASS · 6/6 steps · 2.8s faster than baseline'],
    ];
  }

  function append(target, cls, text) {
    const line = document.createElement('div');
    line.className = `pd-line ${cls}`; line.textContent = text; pane(target).appendChild(line);
    requestAnimationFrame(() => line.classList.add('show'));
    pane(target).scrollTop = pane(target).scrollHeight;
  }

  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); generation += 1; }

  function reset() {
    clearTimers();
    Object.entries(initial).forEach(([name, html]) => { pane(name).innerHTML = html; });
    evidence.forEach((item) => item.classList.remove('done'));
    root.classList.remove('running', 'complete'); progress.textContent = 'Ready for a mission'; progressDot.className = '';
  }

  function run(prompt) {
    prompt = String(prompt || '').trim().slice(0, 240);
    if (!prompt) { globalInput.focus(); return; }
    reset(); root.classList.add('running'); progressDot.className = 'running'; progress.textContent = 'Mission running · 0%';
    globalInput.value = prompt; builderInput.value = '';
    const steps = scenario(classify(prompt), prompt); const runId = generation;
    steps.forEach((step, index) => {
      const perform = () => {
        if (runId !== generation) return;
        append(step[0], step[1], step[2]);
        const proof = Math.min(evidence.length, Math.floor(((index + 1) / steps.length) * (evidence.length + 1)));
        evidence.forEach((item, itemIndex) => item.classList.toggle('done', itemIndex < proof));
        const pct = Math.round(((index + 1) / steps.length) * 100); progress.textContent = `Mission running · ${pct}%`;
        if (index === steps.length - 1) {
          root.classList.remove('running'); root.classList.add('complete'); progressDot.className = 'complete'; progress.textContent = 'PASS · evidence verified';
        }
      };
      if (reduced) perform(); else timers.push(setTimeout(perform, 180 + index * 440));
    });
  }

  globalForm.addEventListener('submit', (event) => { event.preventDefault(); run(globalInput.value); });
  builderForm.addEventListener('submit', (event) => { event.preventDefault(); run(builderInput.value); });
  root.querySelector('.pd-reset').addEventListener('click', reset);
  root.querySelectorAll('[data-demo-text]').forEach((button) => button.addEventListener('click', () => { globalInput.value = button.dataset.demoText; globalInput.focus(); }));
  root.querySelectorAll('[data-demo-preset]').forEach((button) => button.addEventListener('click', () => {
    root.querySelectorAll('[data-demo-preset]').forEach((item) => item.classList.toggle('active', item === button));
    globalInput.value = presets[button.dataset.demoPreset]; run(globalInput.value);
  }));
})();
