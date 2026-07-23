// Contact form → Baseplate's license/support Worker. Kept external so the page can
// enforce script-src 'self' without unsafe-inline.
(function () {
  'use strict';
  var WORKER = 'https://baseplate-license.baseplate-app.workers.dev';
  var form = document.getElementById('contact-form');
  var ok = document.getElementById('cf-ok');
  var err = document.getElementById('cf-err');
  var btn = document.getElementById('cf-send');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ok.hidden = true; err.hidden = true;
    var message = document.getElementById('cf-msg').value.trim();
    if (!message) return;
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(WORKER + '/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('cf-email').value.trim(),
        message: message,
        company: document.getElementById('cf-company').value,
      }),
    })
      .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
      .then(function () {
        ok.hidden = false; form.reset();
        btn.disabled = false; btn.textContent = 'Send message';
      })
      .catch(function () {
        err.hidden = false;
        err.textContent = "Couldn't send right now — please try again in a minute.";
        btn.disabled = false; btn.textContent = 'Send message';
      });
  });
})();
