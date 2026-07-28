/* Baseplate Luau error decoder — runs entirely in the page.
 *
 * Paste anything from the Studio Output window; this pulls out the script path, the
 * line, the side (client/server) and matches the message against a curated rule set.
 * Rules are ordered most-specific-first and the first match wins, so "attempt to
 * index nil with 'X'" never falls through to the generic nil rule.
 *
 * Every explanation here is something that would otherwise cost someone twenty minutes
 * of searching. Where we have a page that goes deeper, the rule links to it — that is
 * the whole distribution idea: be useful first, at the moment the person is stuck.
 */
(function () {
  'use strict';

  var RULES = [
    {
      id: 'index-nil',
      re: /attempt to index (?:nil|a nil value)(?: with(?: key)? ['"]?([\w.]+)['"]?)?/i,
      title: 'Something before the dot does not exist',
      why: function (m) {
        var member = m[1];
        return member
          ? 'The error names “' + member + '” because that is what you asked for. The thing that is nil is whatever stood immediately to the left of it.'
          : 'A value you indexed with a dot or bracket was nil. Read the line backwards: the nil is whatever came before the member you asked for.';
      },
      causes: [
        'The instance has not replicated to the client yet — use WaitForChild with a timeout.',
        'player.Character does not exist yet; use player.Character or player.CharacterAdded:Wait().',
        'The name or path is wrong — lookups are exact and case-sensitive.',
        'A function legitimately returned nil (FindFirstChild does this by design).',
        'The instance was destroyed and something still holds a reference.',
        'It only exists on the server (ServerStorage / ServerScriptService never replicates).'
      ],
      link: { href: 'roblox-attempt-to-index-nil.html', text: 'Full breakdown of all six causes' }
    },
    {
      id: 'infinite-yield',
      re: /infinite yield possible on ['"]?(.+?)['"]?\s*$/im,
      title: 'A WaitForChild will never return',
      why: function (m) {
        return 'This is a warning, not an error: the script is parked at that line forever and everything after it never runs.' +
          (m[1] ? ' It is waiting on ' + m[1].trim() + '.' : '');
      },
      causes: [
        'Name or case is wrong — WaitForChild("mainGui") never finds "MainGui".',
        'Wrong parent: the object was moved into a folder the script does not know about.',
        'It only exists on the server, so a LocalScript waits forever.',
        'The script that was supposed to create it errored first — read the FIRST error in Output.',
        'StreamingEnabled has not loaded that part of the world.',
        'You are waiting too deep: the parent has not arrived yet either.'
      ],
      fix: 'Pass a timeout and handle nil: local gui = playerGui:WaitForChild("MainGui", 10)',
      link: { href: 'roblox-infinite-yield-possible.html', text: 'A wait pattern that cannot hang' }
    },
    {
      id: 'not-valid-member',
      re: /(\S+) is not a valid member of (\S+)/i,
      title: 'That child is not there right now',
      why: function (m) {
        return '“' + m[1] + '” does not exist under ' + m[2] + ' at the moment the line ran. Unlike WaitForChild, a plain dot access does not wait.';
      },
      causes: [
        'Timing: the object exists eventually, but not yet — use WaitForChild with a timeout.',
        'A typo or wrong capitalisation in the name.',
        'The object lives somewhere else in the hierarchy than the script assumes.',
        'It is server-only and this is a LocalScript.'
      ],
      link: { href: 'roblox-attempt-to-index-nil.html', text: 'Same family of causes, explained' }
    },
    {
      id: 'call-nil',
      re: /attempt to call a (?:nil|table|string|number) value(?: \(([\w.]+) ['"]?([\w.]+)['"]?\))?/i,
      title: 'You called something that is not a function',
      why: function (m) {
        return m[2]
          ? '“' + m[2] + '” is not a function at that point — it is nil or a value of the wrong type.'
          : 'The thing being called is not a function. Usually it is nil, or a table you meant to index rather than call.';
      },
      causes: [
        'A method called with a dot instead of a colon, or the reverse: obj.Method() vs obj:Method().',
        'A misspelled function name — the lookup returns nil, then you call the nil.',
        'A module that returned nothing, so requiring it gives nil.',
        'The function is defined below the line that calls it, in a script that runs top to bottom.'
      ]
    },
    {
      id: 'arith-nil',
      re: /attempt to perform arithmetic \(([^)]+)\) on (?:a )?(nil|string|boolean|table)(?: value)?(?: \(([\w.]+) ['"]?([\w.]+)['"]?\))?/i,
      title: 'Doing maths on something that is not a number',
      why: function (m) {
        return 'The ' + m[1] + ' operation received a ' + m[2] + '.' + (m[4] ? ' The value involved is “' + m[4] + '”.' : '');
      },
      causes: [
        'A value read before it was initialised — a leaderstat or profile field that is still nil.',
        'A DataStore load that failed or returned nil for a new player, with no default applied.',
        'A number that arrived from a remote as a string, or as nothing at all.',
        'An attribute or config key that does not exist, silently returning nil.'
      ],
      fix: 'Default it at the point of use: local coins = profile.Coins or 0'
    },
    {
      id: 'compare-nil',
      re: /attempt to compare (?:(\w+) with (\w+)|(?:a )?nil)/i,
      title: 'Comparing a value that is not there',
      why: function (m) {
        return m[1] ? 'You compared a ' + m[1] + ' with a ' + m[2] + '. One side is not the type you expected.' : 'One side of the comparison is nil.';
      },
      causes: [
        'The same root cause as arithmetic on nil: uninitialised state, a failed load, or a missing default.',
        'A remote handler trusting that the client sent a number when it may send anything.'
      ],
      fix: 'Guard before comparing, and validate anything that came from a client.'
    },
    {
      id: 'module-error',
      re: /requested module experienced an error while loading/i,
      title: 'A ModuleScript failed while loading',
      why: function () {
        return 'The real problem is inside the module, not at your require() line. Every script requiring it will report this same unhelpful message.';
      },
      causes: [
        'An error at the top level of the module — look for the FIRST error in Output, above this one.',
        'The module depends on something that is not loaded yet at require time.',
        'A cyclic require: two modules requiring each other.'
      ],
      fix: 'Scroll up. The first error in Output is the cause; this line is the consequence.'
    },
    {
      id: 'timeout',
      re: /(?:script timeout|exhausted allowed execution time)/i,
      title: 'A script ran too long without yielding',
      why: function () {
        return 'A loop or long computation blocked the thread past the allowed budget without a yield.';
      },
      causes: [
        'A while loop with no task.wait() in it.',
        'A repeat ... until on a condition that never becomes true.',
        'Heavy work over a large table done in one frame instead of being chunked.'
      ],
      fix: 'Yield inside long loops with task.wait(), and split heavy passes across frames.'
    },
    {
      id: 'cast',
      re: /unable to cast (?:value to |)(.+)/i,
      title: 'Wrong type passed to a Roblox API',
      why: function (m) {
        return 'A Roblox property or function received a type it cannot convert' + (m[1] ? ' (' + m[1].trim() + ')' : '') + '.';
      },
      causes: [
        'Passing a number where a Vector3, UDim2 or Color3 is expected — or the reverse.',
        'Passing an Instance where a value type is expected.',
        'A value from a remote or DataStore that lost its type in the round trip (DataStores cannot store Vector3, CFrame or Color3).'
      ]
    },
    {
      id: 'http-disabled',
      re: /http requests are not enabled|http is not enabled/i,
      title: 'HttpService is off for this place',
      why: function () {
        return 'HTTP requests are disabled by default and must be enabled per place.';
      },
      causes: ['Game Settings → Security → Allow HTTP Requests is off.', 'Testing in an unpublished place.']
    },
    {
      id: 'datastore-queue',
      re: /request was added to (?:the )?queue|datastore request/i,
      title: 'DataStore throttling',
      why: function () {
        return 'You are over the request budget, so calls are being queued instead of executed. A queued save may not complete before a server shuts down.';
      },
      causes: [
        'Saving on every change instead of on a timer plus on leave.',
        'A burst of writes with no budget check.'
      ],
      fix: 'Coalesce changes in memory, save periodically, and check GetRequestBudgetForRequestType before bursts.',
      link: { href: 'roblox-datastore-not-saving.html', text: 'The seven causes of data not saving' }
    },
    {
      id: 'datastore-api',
      re: /datastore.*(?:not available|api services|studio access)|403.*datastore/i,
      title: 'DataStores are not available here',
      why: function () {
        return 'The place cannot reach DataStore services at all.';
      },
      causes: [
        'Studio access to API services is off: Game Settings → Security → Enable Studio Access to API Services.',
        'The place is unpublished, so there is no universe to store against.'
      ],
      link: { href: 'roblox-datastore-not-saving.html', text: 'DataStore troubleshooting' }
    },
    {
      id: 'remote-args',
      re: /(?:argument \d+ missing or nil|missing argument)/i,
      title: 'A required argument was not passed',
      why: function () {
        return 'A function or remote was called with fewer arguments than it needs — and if this is a server handler, a client can do that deliberately.';
      },
      causes: [
        'A caller that forgot a parameter.',
        'A remote handler assuming the client always sends well-formed arguments.'
      ],
      fix: 'Validate every argument that crosses a remote before using it.',
      link: { href: 'roblox-remoteevent-security-checklist.html', text: 'What to validate on every remote' }
    }
  ];

  function parseLocation(text) {
    var out = {};
    var m = /((?:ServerScriptService|ReplicatedStorage|ServerStorage|StarterPlayer|StarterGui|Workspace|Players)[\w.$\- ]*):(\d+)/i.exec(text);
    if (m) { out.path = m[1]; out.line = m[2]; }
    if (/^\s*\d+:\d+:\d+/.test(text)) out.hasTimestamp = true;
    if (/StarterPlayer|StarterGui|PlayerScripts|PlayerGui/i.test(text)) out.side = 'client';
    else if (/ServerScriptService|ServerStorage/i.test(text)) out.side = 'server';
    return out;
  }

  function decode(text) {
    for (var i = 0; i < RULES.length; i++) {
      var m = RULES[i].re.exec(text);
      if (m) return { rule: RULES[i], match: m };
    }
    return null;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(text, host) {
    host.textContent = '';
    var hit = decode(text);
    var loc = parseLocation(text);

    if (!hit) {
      var none = el('div', 'dec-empty');
      none.appendChild(el('p', null, 'No known pattern matched that message.'));
      none.appendChild(el('p', 'dec-hint', 'This decoder covers the errors AI-written Luau produces most often. If your message is a common one and it is missing here, tell us and we will add it — the contact link is in the footer.'));
      host.appendChild(none);
      return;
    }

    var r = hit.rule;
    var card = el('div', 'dec-card');
    card.appendChild(el('h2', 'dec-title', r.title));

    if (loc.path || loc.side) {
      var meta = el('p', 'dec-meta');
      if (loc.path) meta.appendChild(el('code', null, loc.path + (loc.line ? ':' + loc.line : '')));
      if (loc.side) meta.appendChild(el('span', 'dec-side', loc.side === 'client' ? 'client-side script' : 'server-side script'));
      card.appendChild(meta);
    }

    card.appendChild(el('p', 'dec-why', r.why(hit.match)));

    if (r.causes && r.causes.length) {
      card.appendChild(el('h3', null, 'Most likely causes'));
      var ul = el('ul', 'dec-causes');
      r.causes.forEach(function (c) { ul.appendChild(el('li', null, c)); });
      card.appendChild(ul);
    }
    if (r.fix) {
      var fix = el('p', 'dec-fix');
      fix.appendChild(el('b', null, 'Fix: '));
      fix.appendChild(document.createTextNode(r.fix));
      card.appendChild(fix);
    }
    if (r.link) {
      var a = el('a', 'dec-link', r.link.text + ' →');
      a.href = r.link.href;
      card.appendChild(a);
    }
    host.appendChild(card);
  }

  var SAMPLE = "15:04:22.317  ServerScriptService.Tycoon:46: attempt to index nil with 'Humanoid'  -  Server - Tycoon:46";

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('dec-input');
    var out = document.getElementById('dec-output');
    var run = document.getElementById('dec-run');
    var demo = document.getElementById('dec-demo');
    if (!input || !out || !run) return;

    function go() {
      var v = input.value.trim();
      if (!v) { out.textContent = ''; out.appendChild(el('p', 'dec-hint', 'Paste an error from the Output window above.')); return; }
      try { render(v, out); }
      catch (e) { out.textContent = ''; out.appendChild(el('p', 'dec-hint', 'Could not read that. Paste the raw line from Output.')); }
    }
    run.addEventListener('click', go);
    if (demo) demo.addEventListener('click', function () { input.value = SAMPLE; go(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); }
    });
  });
})();
