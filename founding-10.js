(function () {
  'use strict';
  var endpoint = 'https://baseplate-license.baseplate-app.workers.dev/support';
  var form = document.getElementById('f10-form');
  var button = document.getElementById('f10-send');
  var ok = document.getElementById('f10-ok');
  var error = document.getElementById('f10-error');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); ok.hidden = true; error.hidden = true;
    button.disabled = true; button.textContent = 'Sending…';
    var message = [
      '[FOUNDING 10 APPLICATION]',
      'Stage: ' + document.getElementById('f10-stage').value,
      'Public link: ' + (document.getElementById('f10-link').value.trim() || '(none)'),
      '', 'Current blocker:', document.getElementById('f10-blocker').value.trim(),
    ].join('\n');
    fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      email: document.getElementById('f10-email').value.trim(), message: message,
      company: document.getElementById('f10-company').value,
    }) })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function () { ok.hidden = false; form.reset(); if (window.baseplateTrack) window.baseplateTrack('founding_10_applied'); })
      .catch(function () { error.hidden = false; error.textContent = 'Could not send right now. Email contact@baseplatedev.com instead.'; })
      .finally(function () { button.disabled = false; button.textContent = 'Request a free session'; });
  });
}());
