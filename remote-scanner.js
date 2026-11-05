/* Baseplate RemoteEvent scanner — runs entirely in the page.
 *
 * This is deliberately a heuristic, not a parser. It reads Luau as text, finds
 * server-side remote handlers, and asks whether the obvious server-authority
 * guards appear anywhere inside each one. That catches the handler that trusts
 * a client-supplied price; it cannot reason about what a helper function does.
 * Everything user-facing about this tool says so — an over-confident security
 * tool is worse than none, because people stop looking.
 *
 * The page CSP is connect-src 'none': pasted source cannot leave the browser
 * even if this file wanted it to. That is the point of shipping it this way.
 */
(function () {
  'use strict';

  var CHECKLIST = 'roblox-remoteevent-security-checklist.html';

  // Strip comments and string bodies so keyword scanning doesn't trip over prose.
  // Keeps length so indices stay meaningful for the block matcher.
  function blank(src) {
    var out = '';
    var i = 0;
    var n = src.length;
    while (i < n) {
      var two = src.substr(i, 2);
      if (two === '--') {
        var longOpen = /^--\[(=*)\[/.exec(src.slice(i));
        if (longOpen) {
          var close = ']' + longOpen[1] + ']';
          var endIdx = src.indexOf(close, i);
          endIdx = endIdx === -1 ? n : endIdx + close.length;
          out += src.slice(i, endIdx).replace(/[^\n]/g, ' ');
          i = endIdx;
          continue;
        }
        var nl = src.indexOf('\n', i);
        nl = nl === -1 ? n : nl;
        out += src.slice(i, nl).replace(/[^\n]/g, ' ');
        i = nl;
        continue;
      }
      var ch = src[i];
      if (ch === '"' || ch === "'") {
        var j = i + 1;
        while (j < n && src[j] !== ch) {
          if (src[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, n);
        out += src.slice(i, j).replace(/[^\n]/g, ' ');
        i = j;
        continue;
      }
      var longStr = /^\[(=*)\[/.exec(src.slice(i));
      if (longStr) {
        var lclose = ']' + longStr[1] + ']';
        var lend = src.indexOf(lclose, i);
        lend = lend === -1 ? n : lend + lclose.length;
        out += src.slice(i, lend).replace(/[^\n]/g, ' ');
        i = lend;
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }

  // Start inside the handler's function block. Count ordinary statement blocks.
  // Stop at another recognised handler rather than borrow its checks.
  function blockEnd(clean, startIdx, limit) {
    var re = /\b(function|do|if|repeat|end|until)\b/g;
    // Common expression prefixes, as in `local x = if condition then a else b`.
    var expressionPrefix = /(?:[=,(\[{+*/%^<>~#-]|\b(?:return|and|or|not))\s*$/;
    re.lastIndex = startIdx;
    var depth = 1;
    var m;
    while ((m = re.exec(clean)) && m.index < limit) {
      var word = m[1];
      if (word === 'end' || word === 'until') {
        depth--;
        if (depth === 0) return m.index + word.length;
      } else if (word !== 'if' || !expressionPrefix.test(clean.slice(startIdx, m.index))) {
        depth++;
      }
    }
    return null;
  }

  function lineOf(src, idx) {
    return src.slice(0, idx).split('\n').length;
  }

  function findHandlers(src, clean) {
    var patterns = [
      { re: /([\w.:\[\]"']+?)\s*\.\s*OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(([^)]*)\)/g, kind: 'OnServerEvent' },
      { re: /([\w.:\[\]"']+?)\s*\.\s*OnServerInvoke\s*=\s*function\s*\(([^)]*)\)/g, kind: 'OnServerInvoke' }
    ];
    var found = [];
    patterns.forEach(function (p) {
      var m;
      p.re.lastIndex = 0;
      while ((m = p.re.exec(clean))) {
        var params = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        found.push({
          name: m[1].trim(),
          kind: p.kind,
          params: params,
          line: lineOf(src, m.index),
          start: m.index,
          bodyStart: p.re.lastIndex
        });
      }
    });
    found.sort(function (a, b) { return a.start - b.start; });
    return found.map(function (h, index) {
      var limit = index + 1 < found.length ? found[index + 1].start : clean.length;
      var end = blockEnd(clean, h.bodyStart, limit);
      h.body = end === null ? null : clean.slice(h.bodyStart, end);
      return h;
    });
  }

  var VALUE_WORDS = /(price|cost|amount|coins|cash|money|gold|gems|value|damage|quantity|qty|count|level|xp|reward|balance)/i;

  // A guard can legitimately live in a helper the handler calls. When the machinery
  // exists in the file but not inside the handler, that is worth flagging as
  // "verify" rather than "missing" — calling real rate limiting a failure is the
  // fastest way to teach someone to ignore the tool.
  function analyse(h, fileClean) {
    var body = h.body;
    var elsewhere = fileClean || '';
    // The first parameter of a server handler is always the Player; the rest is client input.
    var clientParams = h.params.slice(1).map(function (p) { return p.split(':', 1)[0].trim(); })
      .filter(function (p) { return /^[a-zA-Z_]\w*$/.test(p); });
    var results = [];

    function check(id, label, ok, detail) {
      results.push({ id: id, label: label, status: ok, detail: detail });
    }

    var hasTypeGuard = /\btypeof\s*\(|\btype\s*\(/.test(body);
    check('type', 'Type validation', hasTypeGuard ? 'pass' : 'fail',
      hasTypeGuard
        ? 'Calls typeof()/type() inside the handler.'
        : 'No typeof() or type() check. A client can send a table, an Instance, NaN or nothing at all.');

    var hasSize = /#\s*[\w.]+|:len\s*\(|\bmath\.(clamp|min|max)\b|[<>]=?\s*-?\d/.test(body);
    check('shape', 'Shape and size limits', hasSize ? 'pass' : 'warn',
      hasSize
        ? 'Some length, range or clamp check is present.'
        : 'No length, range or clamp check found. Cap string length, table size and numeric range before doing work.');

    var trusted = clientParams.filter(function (p) { return VALUE_WORDS.test(p); });
    check('authority', 'Server-derived values', trusted.length ? 'fail' : 'pass',
      trusted.length
        ? 'Parameter(s) named ' + trusted.map(function (p) { return '“' + p + '”' ; }).join(', ') +
          ' look like values the client should never supply. Derive price, damage and rewards from server state.'
        : 'No obviously value-shaped parameters coming from the client.');

    var RATE = /\bos\.(clock|time)\b|\btick\s*\(|debounce|cooldown|lastRequest|rateLimit|throttle|\ballowed\s*\(|\bcanRequest\b|budget/i;
    var rateHere = RATE.test(body);
    var rateInFile = RATE.test(elsewhere);
    check('rate', 'Rate limiting', rateHere ? 'pass' : (rateInFile ? 'warn' : 'fail'),
      rateHere
        ? 'Timing, debounce or allow-check state is referenced in the handler.'
        : rateInFile
          ? 'Rate-limiting code exists elsewhere in this file but not inside this handler — check that it is actually applied to this remote.'
          : 'No server-side rate limit found. A client cooldown is only interface feedback.');

    var hasContext = /\bMagnitude\b|\bHealth\b|FindFirstChild|\bAlive\b|\bDistance\b|:IsDescendantOf\s*\(|\bCharacter\b/i.test(body);
    check('context', 'Context checks', hasContext ? 'pass' : 'warn',
      hasContext
        ? 'References position, health, character or ownership state.'
        : 'No distance, alive-state or ownership check found. Verify the action is possible for that player right now.');

    // Using a client value as a key into a server-owned table (Catalog[itemId]) is the
    // recommended pattern, so only arithmetic on it — or storing it directly — counts.
    var paramAlt = clientParams.map(function (p) {
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|');
    var mutatesOnClientValue = clientParams.length > 0 && (
      new RegExp('(?:\\+=|-=|\\*=|/=)\\s*[^\\n\\[]*\\b(?:' + paramAlt + ')\\b').test(body) ||
      new RegExp('[-+*/]\\s*(?:' + paramAlt + ')\\b|\\b(?:' + paramAlt + ')\\s*[-+*/]\\s*\\w').test(body) ||
      new RegExp('=\\s*(?:' + paramAlt + ')\\s*(?:$|\\n|;)', 'm').test(body)
    );
    check('effect', 'Effects computed on the server', mutatesOnClientValue ? 'warn' : 'pass',
      mutatesOnClientValue
        ? 'A client parameter is used in arithmetic or stored directly. Make sure the result comes from server state, not from what was sent.'
        : 'No client parameter used as an amount or written straight into state.');

    var hasEarlyReturn = /\breturn\b/.test(body);
    check('failure', 'Rejects invalid input', hasEarlyReturn ? 'pass' : 'warn',
      hasEarlyReturn
        ? 'Has at least one early return path.'
        : 'No early return. Invalid requests should be rejected cheaply before any work happens.');

    return results;
  }

  function verdictFor(all) {
    if (all.every(function (h) { return h.body === null; })) {
      return { level: 'warn', text: 'No complete handler body was isolated.' };
    }
    var fails = 0, warns = 0;
    all.forEach(function (h) {
      h.results.forEach(function (r) {
        if (r.status === 'fail') fails++;
        else if (r.status === 'warn') warns++;
      });
    });
    if (fails) return { level: 'bad', text: fails + ' likely gap' + (fails === 1 ? '' : 's') + ' to review' };
    if (warns) return { level: 'warn', text: warns + ' thing' + (warns === 1 ? '' : 's') + ' to double-check' };
    return { level: 'neutral', text: 'No obvious gaps in these text checks. Review the behavior in Studio.' };
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(handlers, host) {
    host.textContent = '';
    if (!handlers.length) {
      var none = el('div', 'scan-empty');
      none.appendChild(el('p', null, 'No supported inline remote handlers detected.'));
      var hint = el('p', 'scan-hint', 'Paste the server-side registration and its inline handler. Named callbacks, wrappers and complex signatures can be missed. Review those separately.');
      none.appendChild(hint);
      host.appendChild(none);
      return;
    }

    var v = verdictFor(handlers);
    var summary = el('div', 'scan-verdict scan-' + v.level);
    summary.appendChild(el('strong', null, handlers.length + ' remote handler' + (handlers.length === 1 ? '' : 's') + ' found'));
    summary.appendChild(el('span', null, v.text));
    var incomplete = handlers.filter(function (h) { return h.body === null; }).length;
    if (incomplete) summary.appendChild(el('span', null, incomplete + ' handler(s) require manual review.'));
    host.appendChild(summary);

    handlers.forEach(function (h) {
      var card = el('div', 'scan-card');
      var head = el('div', 'scan-card-head');
      head.appendChild(el('code', null, h.name + '.' + h.kind));
      head.appendChild(el('span', 'scan-line', 'line ' + h.line));
      card.appendChild(head);

      if (h.params.length) {
        var pl = el('p', 'scan-params');
        pl.appendChild(el('span', null, 'Client sends: '));
        var rest = h.params.slice(1);
        pl.appendChild(el('code', null, rest.length ? rest.join(', ') : '(nothing)'));
        card.appendChild(pl);
      }

      var list = el('ul', 'scan-checks');
      h.results.forEach(function (r) {
        var li = el('li', 'scan-' + r.status);
        li.appendChild(el('b', null, r.label));
        li.appendChild(el('span', null, r.detail));
        list.appendChild(li);
      });
      if (h.body === null) {
        card.appendChild(el('p', 'scan-hint', 'Could not isolate the handler body. Check that the complete callback was pasted, then review its guards manually.'));
      } else {
        card.appendChild(list);
      }
      host.appendChild(card);
    });

    var foot = el('p', 'scan-hint');
    foot.appendChild(document.createTextNode('These are text-level heuristics: a guard inside a helper function will read as missing, and a check that exists can still be wrong. Use the '));
    var a = el('a', null, 'full checklist');
    a.href = CHECKLIST;
    foot.appendChild(a);
    foot.appendChild(document.createTextNode(' for what each item actually requires.'));
    host.appendChild(foot);
  }

  var CLIENT_PRICE_SAMPLE = [
    'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
    'local BuyItem = ReplicatedStorage:WaitForChild("BuyItem")',
    '',
    '-- trusts the buyer for both the item and what it costs',
    'BuyItem.OnServerEvent:Connect(function(player, itemName, price)',
    '    local profile = Profiles[player]',
    '    profile.Coins = profile.Coins - price',
    '    profile.Inventory[itemName] = true',
    '    giveItem(player, itemName)',
    'end)'
  ].join('\n');

  var SERVER_PRICE_SAMPLE = [
    'local ReplicatedStorage = game:GetService("ReplicatedStorage")',
    'local BuyItem = ReplicatedStorage:WaitForChild("BuyItem")',
    '',
    '-- excerpt: Catalog and Profiles belong to the server',
    'BuyItem.OnServerEvent:Connect(function(player, itemName)',
    '    if typeof(itemName) ~= "string" or #itemName > 48 then return end',
    '    local item = Catalog[itemName]',
    '    local profile = Profiles[player]',
    '    if not item or not profile then return end',
    '    if profile.Coins < item.Price or profile.Inventory[itemName] then return end',
    '    profile.Coins -= item.Price',
    '    profile.Inventory[itemName] = true',
    'end)'
  ].join('\n');

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('scan-input');
    var out = document.getElementById('scan-output');
    var demoOut = document.getElementById('scan-demo-output');
    var run = document.getElementById('scan-run');
    var clientDemo = document.getElementById('scan-demo');
    var serverDemo = document.getElementById('scan-demo-server');
    var clear = document.getElementById('scan-clear');
    if (!input || !out || !run) return;

    function scan(src, host, note) {
      if (!src.trim()) {
        host.textContent = '';
        host.appendChild(el('p', 'scan-hint', 'Paste some Luau above and press Scan.'));
        return;
      }
      try {
        var fileClean = blank(src);
        render(findHandlers(src, fileClean).map(function (h) {
          h.results = h.body === null ? [] : analyse(h, fileClean);
          return h;
        }), host);
        if (note) {
          host.prepend(el('p', 'scan-example-result', note));
          var details = el('details', 'scan-example-code');
          details.appendChild(el('summary', null, 'Read the example Luau'));
          var code = el('pre', null);
          code.appendChild(el('code', null, src));
          details.appendChild(code);
          host.appendChild(details);
        }
      } catch (e) {
        host.textContent = '';
        host.appendChild(el('p', 'scan-hint', 'The scanner could not read that source. It expects plain Luau text.'));
      }
    }

    function bindExample(button, other, source, note) {
      if (!button || !demoOut) return;
      button.addEventListener('click', function () {
        button.setAttribute('aria-pressed', 'true');
        if (other) other.setAttribute('aria-pressed', 'false');
        scan(source, demoOut, note);
      });
    }
    bindExample(clientDemo, serverDemo, CLIENT_PRICE_SAMPLE, 'Example 1. The buyer supplies price. Try the second version and compare Server-derived values.');
    bindExample(serverDemo, clientDemo, SERVER_PRICE_SAMPLE, 'Example 2. The server looks up price. Rate limiting and shop access still need checks.');
    run.addEventListener('click', function () { scan(input.value, out); });
    if (clear) clear.addEventListener('click', function () { input.value = ''; out.textContent = ''; input.focus(); });
    input.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') scan(input.value, out);
    });
  });
})();
