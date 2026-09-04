// Contact form → Baseplate's license/support Worker. Kept external so the page can
// enforce script-src 'self' without unsafe-inline.
(function () {
  'use strict';
  var WORKER = 'https://baseplate-license.baseplate-app.workers.dev';
  var form = document.getElementById('contact-form');
  var ok = document.getElementById('cf-ok');
  var err = document.getElementById('cf-err');
  var btn = document.getElementById('cf-send');
  function refuse(field, text) {
    err.hidden = false;
    err.textContent = text;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ok.hidden = true; err.hidden = true;
    var emailField = document.getElementById('cf-email');
    var messageField = document.getElementById('cf-msg');
    emailField.removeAttribute('aria-invalid');
    messageField.removeAttribute('aria-invalid');
    var email = emailField.value.trim();
    var message = messageField.value.trim();
    // A whitespace-only message satisfies the browser's `required` check, and used to
    // return here in silence — the visitor pressed Send and nothing at all happened.
    if (!message) return refuse(messageField, 'Add a short description of the problem so we know what to look at.');
    // Support with no return address is a message we can never answer.
    if (!email) return refuse(emailField, 'Add your email — without it we have no way to reply.');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(WORKER + '/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email,
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
