// Stripe redirects here with ?session_id=cs_… . Resolve the paid session without
// embedding executable code in the page, so CSP can keep script-src strict.
(function () {
  'use strict';
  var VALIDATOR = 'https://baseplate-license.baseplate-app.workers.dev';
  var loading = document.getElementById('key-loading');
  var row = document.getElementById('key-row');
  var val = document.getElementById('key-value');
  var copy = document.getElementById('key-copy');
  var err = document.getElementById('key-error');
  var note = document.getElementById('key-note');
  var sid = new URLSearchParams(location.search).get('session_id');

  function fail(message) {
    loading.hidden = true; row.hidden = true; note.hidden = true;
    err.hidden = false; err.textContent = message;
  }
  function show(key) {
    loading.hidden = true; err.hidden = true;
    row.hidden = false; note.hidden = false; val.textContent = key;
  }

  if (!sid) {
    fail('Your key was emailed to you. If it didn’t arrive, use the contact link below.');
    return;
  }

  var tries = 0;
  (function get() {
    tries++;
    fetch(VALIDATOR + '/key?session_id=' + encodeURIComponent(sid))
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data.key) { show(result.data.key); return; }
        if (tries < 4) { setTimeout(get, 1500); return; }
        fail((result.data && result.data.error ? result.data.error + '. ' : '') + 'Use the contact link below with your purchase email and we’ll send your key.');
      })
      .catch(function () {
        if (tries < 4) { setTimeout(get, 1500); return; }
        fail('Couldn’t reach the license server. Use the contact link below and we’ll send your key.');
      });
  })();

  copy.addEventListener('click', function () {
    navigator.clipboard.writeText(val.textContent).then(function () {
      copy.textContent = 'Copied'; copy.classList.add('done');
      setTimeout(function () { copy.textContent = 'Copy'; copy.classList.remove('done'); }, 1800);
    });
  });
})();
