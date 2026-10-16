(function () {
  'use strict';
  var endpoint = 'https://baseplate-license.baseplate-app.workers.dev/support';
  var form = document.getElementById('f10-form');
  var button = document.getElementById('f10-send');
  var ok = document.getElementById('f10-ok');
  var error = document.getElementById('f10-error');
  var goal = document.getElementById('f10-goal');
  var requirements = document.getElementById('f10-requirements');
  var goals = {
    map: { label: 'Understand my scripts and their connections', setup: 'Bring a local scripts folder or a saved game in Studio. A Map read needs no AI account or Open Cloud.' },
    verify: { label: 'Find what to check before my next update', setup: 'Bring your local scripts or a saved Studio game. Verify is a local scan; no AI account or Open Cloud is required. Live tests are a separate next step.' },
    playtest: { label: 'Reproduce one gameplay bug', setup: 'Bring a saved copy of your game and describe the player action that fails. We will help connect Studio, the Bridge and Studio MCP. An agent-powered fix uses your own supported AI CLI.' },
  };
  goal.addEventListener('change', function () {
    requirements.textContent = goals[goal.value] ? goals[goal.value].setup : 'Choose one result. We will guide you through the setup it needs.';
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); ok.hidden = true; error.hidden = true;
    if (!goals[goal.value]) { goal.reportValidity(); return; }
    button.disabled = true; button.textContent = 'Sending…';
    var message = [
      '[FOUNDING 10 APPLICATION]',
      'Stage: ' + document.getElementById('f10-stage').value,
      'First outcome: ' + goals[goal.value].label,
      'Public link: ' + (document.getElementById('f10-link').value.trim() || '(none)'),
      '', 'Current blocker:', document.getElementById('f10-blocker').value.trim(),
    ].join('\n');
    fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email: document.getElementById('f10-email').value.trim(), message: message,
      company: document.getElementById('f10-company').value,
    }) })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function () { ok.hidden = false; form.reset(); requirements.textContent = 'Choose one result. We will guide you through the setup it needs.'; if (window.baseplateTrack) window.baseplateTrack('founding_10_applied'); })
      .catch(function () { error.hidden = false; error.classList.add('is-error'); error.textContent = 'Could not send right now. Email contact@baseplatedev.com instead.'; })
      .finally(function () { button.disabled = false; button.textContent = 'Request a free session'; });
  });
}());
