(function () {
  'use strict';
  var endpoint = 'https://baseplate-license.baseplate-app.workers.dev/support';
  var form = document.getElementById('f10-form');
  var button = document.getElementById('f10-send');
  var ok = document.getElementById('f10-ok');
  var error = document.getElementById('f10-error');
  var goal = document.getElementById('f10-goal');
  var blocker = document.getElementById('f10-blocker');
  var requirements = document.getElementById('f10-requirements');
  var defaultRequirements = requirements.textContent;
  var defaultExample = blocker.placeholder;
  var goals = {
    map: { label: 'Understand my scripts and their connections', setup: 'Bring a local scripts folder or a saved game in Studio. A Map read needs no AI account or Open Cloud.' },
    verify: { label: 'Find what to check before my next update', setup: 'Bring your local scripts or a saved Studio game. Verify is a local scan; no AI account or Open Cloud is required. Live tests are a separate next step.' },
    playtest: { label: 'Reproduce one gameplay bug', setup: 'Start with the player action, the expected behavior and what actually happened. You can test the issue in a saved copy of your game. An agent-powered fix uses your own supported AI CLI.', example: 'For example, I reach checkpoint 3, cross checkpoint 1 again and reset. I expect to respawn at 3. I respawn at 1.' },
    datastore: { label: 'Diagnose a DataStore save or load problem', setup: 'Tell us when the value changes or goes missing and include the first relevant error if you have one. For a live save check, use a separate test experience with test data.', example: 'For example: I earn 100 coins and leave. On rejoin the balance is 0. Output shows a load error before the balance appears.' },
    studio: { label: 'Get Roblox Studio connected in Baseplate', setup: 'Tell us your operating system, which AI CLI you use (if any), and the first Studio setup check that fails. A short error message is enough. Leave out tokens and private files.' },
  };
  function updateRequirements() {
    var selected = goals[goal.value];
    requirements.textContent = selected ? selected.setup : defaultRequirements;
    blocker.placeholder = selected && selected.example ? selected.example : defaultExample;
  }
  var topic = new URLSearchParams(window.location.search).get('topic');
  if (topic === 'datastore' || topic === 'playtest') {
    goal.value = topic;
  }
  updateRequirements();
  goal.addEventListener('change', updateRequirements);
  form.addEventListener('submit', function (event) {
    event.preventDefault(); ok.hidden = true; error.hidden = true;
    if (!goals[goal.value]) { goal.reportValidity(); return; }
    button.disabled = true; button.textContent = 'Sending…';
    var message = [
      '[FOUNDING 10 APPLICATION]',
      'Contact preference: written help by email first; no call booked',
      'Stage: ' + (document.getElementById('f10-stage').value || '(not specified)'),
      'First outcome: ' + goals[goal.value].label,
      'Public link: ' + (document.getElementById('f10-link').value.trim() || '(none)'),
      '', 'Current blocker:', blocker.value.trim(),
    ].join('\n');
    fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email: document.getElementById('f10-email').value.trim(), message: message,
      company: document.getElementById('f10-company').value,
    }) })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function () { ok.hidden = false; form.reset(); updateRequirements(); if (window.baseplateTrack) window.baseplateTrack('founding_10_applied'); })
      .catch(function () { error.hidden = false; })
      .finally(function () { button.disabled = false; button.textContent = 'Ask for free help'; });
  });
  button.disabled = false;
}());
