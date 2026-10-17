import {MAX_MOVES, simulate, moveLabel} from './model.js';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const publicUrl = 'https://baseplatedev.com/break-the-checkpoint.html';
let route = [], busy = false, guarded = false;
const touchButtons = [...document.querySelectorAll('[data-touch]')];
function paint(state) {
  $('world').dataset.position = String(state.position);
  $('furthest').textContent = state.furthest;
  $('respawn').textContent = state.lastRespawn === null ? '—' : state.lastRespawn;
}
function controls() {
  const original = simulate(route);
  for (const b of touchButtons) b.disabled = busy || guarded || route.length >= MAX_MOVES || original.lost > 0;
  $('reset-player').disabled = busy || guarded || route.length >= MAX_MOVES || original.lost > 0;
  $('undo').disabled = busy || guarded || !route.length;
  $('restart').disabled = busy;
  $('replay-guard').disabled = busy || guarded;
  $('replay-guard').textContent = busy ? 'Replaying your route…' : guarded ? 'Guard replay complete ✓' : 'Replay my route with the guard →';
  $('save-card').disabled = busy;
  $('copy-link').disabled = busy;
}
function render() {
  const state = simulate(route, guarded);
  paint(state);
  $('move-count').textContent = route.length + ' / ' + MAX_MOVES;
  $('mode-label').textContent = guarded ? 'Guard enabled · same route' : 'Original rule';
  $('mode-label').classList.toggle('fixed', guarded);
  $('route').replaceChildren(...Array.from({length: MAX_MOVES}, (_, i) => {
    const li = document.createElement('li');
    li.textContent = i < route.length ? moveLabel(route[i]) : ['First move', 'Second move', 'Third move'][i];
    li.classList.toggle('filled', i < route.length);
    return li;
  }));
  const original = simulate(route);
  $('outcome').hidden = original.lost === 0;
  $('guard-result').hidden = !guarded;
  $('arena').classList.toggle('solved', guarded);
  $('outcome-kicker').textContent = guarded ? 'GUARD REPLAY COMPLETE' : 'YOU FOUND A FAILURE PATH';
  $('outcome-title').textContent = guarded ? 'Same route. Progress kept.' : 'You broke it.';
  if (original.lost > 0) {
    const n = original.lost;
    $('outcome-message').textContent = guarded
      ? `Before the guard: reached ${original.furthest}, respawned at ${original.lastRespawn}. Below is your identical route with the guard enabled.`
      : `Your player reached ${original.furthest}, then respawned at ${original.lastRespawn}. ${n} stage${n === 1 ? '' : 's'} of progress lost in this simulation.`;
    $('status').textContent = guarded ? 'Guard replay complete. Your player kept their furthest checkpoint.' : 'You found it. An earlier touch overwrote the furthest checkpoint.';
    if (guarded) $('guard-message').textContent = `Same route → respawn at ${state.lastRespawn}. Progress kept.`;
  } else if (route.length === MAX_MOVES) {
    $('status').textContent = 'No progress loss reproduced. Undo a move or try a detour, then reset.';
  } else {
    $('status').textContent = route.length ? `${moveLabel(route.at(-1))}. ${MAX_MOVES - route.length} move${route.length === 2 ? '' : 's'} left.` : 'Start anywhere. Reset uses one move too.';
  }
  controls();
}
function add(action) {
  if (busy || guarded || route.length >= MAX_MOVES || simulate(route).lost > 0) return;
  route.push(action);
  render();
  if (simulate(route).lost > 0) {
    $('outcome-title').focus({preventScroll: true});
    $('outcome').scrollIntoView({behavior: reduced ? 'instant' : 'smooth', block: 'nearest'});
  }
}
for (const b of touchButtons) b.addEventListener('click', () => add(Number(b.dataset.touch)));
$('reset-player').addEventListener('click', () => add('reset'));
$('undo').addEventListener('click', () => { if (busy || guarded) return; route.pop(); $('share-notice').textContent = ''; render(); });
$('restart').addEventListener('click', () => {
  if (busy) return;
  route = []; guarded = false;
  $('hint-text').hidden = true;
  $('hint').textContent = 'A small hint?';
  $('share-notice').textContent = '';
  render();
  touchButtons[0].focus({preventScroll: true});
  document.querySelector('.arena').scrollIntoView({behavior: reduced ? 'instant' : 'smooth', block: 'start'});
});
$('hint').addEventListener('click', () => {
  $('hint-text').hidden = !$('hint-text').hidden;
  $('hint').textContent = $('hint-text').hidden ? 'A small hint?' : 'Hide hint';
});
$('replay-guard').addEventListener('click', async () => {
  if (busy || guarded || !simulate(route).lost) return;
  busy = true; controls();
  $('mode-label').textContent = 'Replaying your exact route with the guard…';
  paint(simulate([]));
  for (const step of simulate(route, true).steps) {
    if (!reduced) await new Promise(resolve => setTimeout(resolve, 550));
    paint(step);
    $('status').textContent = 'Guard replay: ' + moveLabel(step.action);
  }
  guarded = true; busy = false; render();
});
$('proof').addEventListener('toggle', () => {
  const video = $('proof-video');
  if ($('proof').open && !video.getAttribute('src')) video.src = 'https://baseplatedev.com/media/2026-10/baseplate-checkpoint023-20261016-9eeba114.mp4';
  if (!$('proof').open) video.pause();
});
function resultCard() {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#090d17'; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#253654'; ctx.lineWidth = 1;
  for (let x = 50; x < 1080; x += 40) for (let y = 50; y < 1350; y += 40) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#97b0ff'; ctx.font = 'bold 29px Arial'; ctx.fillText('BASEPLATE / BREAK THIS UPDATE', 72, 110);
  ctx.fillStyle = '#f0f4ff'; ctx.font = '900 92px Arial'; ctx.fillText('I BROKE THE', 68, 300); ctx.fillText('CHECKPOINT.', 68, 405);
  ctx.fillStyle = '#70e6b6'; ctx.font = 'bold 41px Arial'; ctx.fillText('One failure path. Three moves.', 72, 515);
  ctx.fillStyle = '#17243b';
  for (let i = 0; i < 3; i++) { ctx.fillRect(72 + i * 310, 640, 270, 190); ctx.fillStyle = '#97b0ff'; ctx.font = 'bold 85px Arial'; ctx.fillText('?', 178 + i * 310, 766); ctx.fillStyle = '#17243b'; }
  ctx.fillStyle = '#f0f4ff'; ctx.font = 'bold 49px Arial'; ctx.fillText('Can you find a losing route?', 72, 970);
  ctx.fillStyle = '#b0bdd4'; ctx.font = '29px Arial'; ctx.fillText('Free browser puzzle · no account or install', 72, 1040);
  ctx.fillStyle = '#97b0ff'; ctx.font = 'bold 31px Arial'; ctx.fillText('baseplatedev.com/', 72, 1165); ctx.fillText('break-the-checkpoint.html', 72, 1215);
  ctx.fillStyle = '#8090ae'; ctx.font = '23px Arial'; ctx.fillText('A browser simulation based on our own Studio example.', 72, 1290);
  return canvas;
}
$('save-card').addEventListener('click', () => {
  if (busy || !simulate(route).lost) return;
  resultCard().toBlob(blob => {
    if (!blob) { $('share-notice').textContent = 'Could not create the card. You can still copy the challenge link.'; return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'baseplate-i-broke-the-checkpoint.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('share-notice').textContent = 'Challenge card ready. It keeps your solution secret.';
  }, 'image/png');
});
$('copy-link').addEventListener('click', async () => {
  if (busy || !simulate(route).lost) return;
  try { await navigator.clipboard.writeText('Can you make this checkpoint lose progress in three moves? ' + publicUrl); $('share-notice').textContent = 'Challenge link copied. No spoilers. ' + publicUrl; }
  catch { $('share-notice').textContent = 'Copy this challenge link: ' + publicUrl; }
});
render();
