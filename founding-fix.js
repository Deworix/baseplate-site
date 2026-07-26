(function () {
  'use strict';
  var endpoint = 'https://baseplate-license.baseplate-app.workers.dev/support';
  var form = document.getElementById('fix-form');
  var button = document.getElementById('fix-send');
  var ok = document.getElementById('fix-ok');
  var error = document.getElementById('fix-error');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ok.hidden = true;
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Sending...';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('fix-email').value.trim(),
        company: document.getElementById('fix-company').value,
        message: '[FOUNDING FIX FIT CHECK]\n\nBug or blocker:\n' + document.getElementById('fix-bug').value.trim(),
      }),
    })
      .then(function (response) { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(function () { ok.hidden = false; form.reset(); })
      .catch(function () { error.hidden = false; error.textContent = 'Could not send right now. Email contact@baseplatedev.com instead.'; })
      .finally(function () { button.disabled = false; button.textContent = 'Check my bug first'; });
  });
}());
