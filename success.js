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
  var retry = document.getElementById('key-retry');
  var sid = new URLSearchParams(location.search).get('session_id');
  var busy = false;

  function fail(message) {
    loading.hidden = true; row.hidden = true; note.hidden = true;
    err.hidden = false; err.textContent = message;
    busy = false; retry.hidden = !sid;
  }
  function show(key) {
    loading.hidden = true; err.hidden = true;
    row.hidden = false; note.hidden = false; val.textContent = key;
    busy = false; retry.hidden = true;
  }

  if (!sid) {
    fail('This link has no payment confirmation. Reopen your Stripe confirmation page, or contact us with your purchase email to recover your key.');
    return;
  }

  function resolveKey() {
    if (busy) return;
    busy = true;
    var tries = 0;
    retry.hidden = true; err.hidden = true; loading.hidden = false;
    (function get() {
      tries++;
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 12000);
      fetch(VALIDATOR + '/key?session_id=' + encodeURIComponent(sid), { signal: controller.signal })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .finally(function () { clearTimeout(timeout); })
      .then(function (result) {
        if (result.ok && result.data.key) { show(result.data.key); return; }
        if (tries < 4) { setTimeout(get, 1500); return; }
        fail((result.data && result.data.error ? result.data.error + '. ' : '') + 'Use the contact link below with your purchase email and we’ll send your key.');
      })
      .catch(function () {
        if (tries < 4) { setTimeout(get, 1500); return; }
        fail('Couldn’t reach the license server. Try again, or contact us with your purchase email to recover your key.');
      });
    })();
  }
  retry.addEventListener('click', resolveKey);
  resolveKey();

  copy.addEventListener('click', function () {
    Promise.resolve().then(function () { return navigator.clipboard.writeText(val.textContent); }).then(function () {
      copy.textContent = 'Copied'; copy.classList.add('done');
      err.hidden = true;
      setTimeout(function () { copy.textContent = 'Copy'; copy.classList.remove('done'); }, 1800);
    }).catch(function () {
      err.hidden = false;
      err.textContent = 'Your browser could not copy the key. Select the key above and copy it manually; your license is still available.';
    });
  });
})();
