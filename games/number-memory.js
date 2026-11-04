// Number Memory: a number is shown for a moment (1s + 0.6s per digit), then hidden.
// Type it back on the number pad. Each correct answer adds a digit (starting at 3).
// One mistake ends the game. Score = the longest number you recalled.
(() => {
  const START_LEN = 3;
  const BIG_FONT = 60, SMALL_FONT = 28; // px; long numbers shrink, then wrap

  // Same show time as Human Benchmark's number memory test (fair comparison on the chart).
  const showMs = (len) => 1000 + 800 * len;
  const digit = (min) => String(min + Math.floor(Math.random() * (10 - min)));
  // A random number with `len` digits as a string. Never starts with 0.
  const makeNumber = (len) => { let s = digit(1); while (s.length < len) s += digit(0); return s; };
  // Digit-by-digit comparison for the game-over panel ('' = digit not typed).
  const compare = (target, typed) =>
    [...target].map((want, i) => ({ want, got: typed[i] || '', ok: typed[i] === want }));

  (window.__games = window.__games || []).push({
    id: 'number-memory', category: 'Memory', name: 'Number Memory', skill: 'Memory', desc: 'remember a growing number', icon: '🧠',
    gen: { makeNumber, showMs, compare, START_LEN }, // exposed for bulk tests
    start(el, api) {
      const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
      el.innerHTML =
        '<div class="hud"><span class="level nm-round">Round 1</span><span class="nm-len">3 digits</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="status nm-status">&nbsp;</div>' +
        '<div class="nm-display"><div class="nm-num"></div></div>' +
        '<div class="nm-pad">' + KEYS.map((k) =>
          '<button class="nm-key' + (k === 'ok' ? ' nm-ok' : k === 'del' ? ' nm-del' : '') + '" data-k="' + k + '"' +
          (k === 'del' ? ' aria-label="Delete">⌫' : k === 'ok' ? '>OK' : '>' + k) + '</button>').join('') + '</div>' +
        '<div class="panel"><h3></h3><p class="result"></p><div class="nm-compare"></div><p class="new"></p><button class="btn"></button></div>';
      const roundEl = el.querySelector('.nm-round');
      const lenEl = el.querySelector('.nm-len');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const statusEl = el.querySelector('.nm-status');
      const display = el.querySelector('.nm-display');
      const numEl = display.querySelector('.nm-num');
      const padKeys = [...el.querySelectorAll('.nm-key')];
      const okBtn = el.querySelector('.nm-ok');
      const delBtn = el.querySelector('.nm-del');
      const panel = el.querySelector('.panel');
      const compareEl = panel.querySelector('.nm-compare');
      const btn = panel.querySelector('.btn');

      // phase: 'idle' (panel), 'show' (number visible), 'input' (typing), 'lock' (feedback)
      let phase = 'idle', len = START_LEN, target = '', typed = '', score = 0, round = 0, newBest = false;
      let barId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const setStatus = (text, cls) => { statusEl.textContent = text; statusEl.className = 'status nm-status' + (cls ? ' ' + cls : ''); };

      // Biggest font that fits the number on one line; very long numbers wrap into balanced lines.
      function fitFont() {
        const w = (display.clientWidth || 360) - 24;
        display.style.fontSize = Math.max(SMALL_FONT, Math.min(BIG_FONT, Math.floor(w / (len * 0.7)))) + 'px';
      }

      function renderTyped() {
        numEl.innerHTML = '';
        for (let i = 0; i < len; i++) {
          const s = document.createElement('span');
          s.className = i < typed.length ? 'nm-typed' : 'nm-blank';
          s.textContent = i < typed.length ? typed[i] : '•';
          numEl.append(s);
        }
        updateKeys();
      }

      function updateKeys() {
        const typing = phase === 'input';
        for (const b of padKeys) b.disabled = !typing;
        okBtn.disabled = !typing || typed.length === 0;
        delBtn.disabled = !typing || typed.length === 0;
        if (typing && typed.length >= len) padKeys.forEach((b) => { if (/\d/.test(b.dataset.k)) b.disabled = true; });
      }

      function nextRound() {
        round++;
        target = makeNumber(len);
        typed = '';
        phase = 'show';
        roundEl.textContent = 'Round ' + round;
        lenEl.textContent = len + ' digits';
        display.className = 'nm-display nm-shown';
        numEl.textContent = target;
        fitFont();
        setStatus('Remember this number');
        updateKeys();
        const total = showMs(len), endAt = Date.now() + total;
        const bar = () => {
          const left = Math.max(0, endAt - Date.now());
          fillEl.style.width = (left / total) * 100 + '%';
        };
        bar();
        clearInterval(barId);
        barId = setInterval(bar, 50);
        later(hideNumber, total);
      }

      function hideNumber() {
        clearInterval(barId);
        fillEl.style.width = '0%';
        phase = 'input';
        display.className = 'nm-display';
        setStatus('Type the number', 'go');
        renderTyped();
      }

      function press(k) {
        if (phase !== 'input') return;
        if (k === 'del') typed = typed.slice(0, -1);
        else if (k === 'ok') { if (typed) submitAnswer(); return; }
        else if (typed.length < len) typed += k;
        renderTyped();
      }

      function submitAnswer() {
        phase = 'lock';
        updateKeys();
        if (typed === target) {
          score = len;
          scoreEl.textContent = score;
          if (api.submit(score)) newBest = true; // saved right away, so leaving mid-run keeps it
          display.className = 'nm-display nm-right';
          setStatus('✓ Correct!', 'go');
          len++;
          later(nextRound, 800);
        } else {
          display.className = 'nm-display nm-wrong';
          setStatus('✗ Not quite', 'nm-bad');
          later(gameOver, 900);
        }
      }

      function showCompare() {
        compareEl.innerHTML = '';
        const row = (label, cells) => {
          const r = document.createElement('div');
          r.className = 'nm-row';
          if (tight) r.style.gap = '2px';
          const l = document.createElement('span');
          l.className = 'nm-label';
          l.textContent = label;
          const digits = document.createElement('span');
          digits.className = 'nm-digits';
          for (const [text, cls] of cells) {
            const d = document.createElement('span');
            d.className = 'nm-d' + (cls ? ' ' + cls : '');
            d.textContent = text;
            digits.append(d);
          }
          r.append(l, digits);
          compareEl.append(r);
        };
        const cmp = compare(target, typed);
        // Digit boxes shrink with the length so both rows line up; over 20 digits they wrap into even lines.
        const lines = Math.ceil(cmp.length / 20), perLine = Math.ceil(cmp.length / lines);
        // Wrapped rows (over 20 digits) get slightly smaller boxes and tighter spacing, so the end panel
        // with its results chart still fits on a phone screen without scrolling.
        const tight = lines > 1;
        const w = Math.max(15, Math.min(tight ? 20 : 26, Math.floor(340 / perLine) - 3));
        compareEl.style.setProperty('--w', w + 'px');
        compareEl.style.setProperty('--line', perLine * (w + 3) + 'px');
        compareEl.style.gap = tight ? '4px' : '';
        panel.style.gap = tight ? '8px' : '';
        row('Number', cmp.map((c) => [c.want, '']));
        row('You typed', cmp.map((c) => [c.got || '–', c.ok ? '' : 'nm-x']));
      }

      function gameOver() {
        phase = 'idle';
        updateKeys();
        showCompare();
        // The best was already saved after each correct round; this records the run once (0 = none recalled).
        api.finish(score, panel);
        showPanel('Game over', score ? 'Longest number: ' + score + ' digits' : 'No number recalled yet', newBest && score > 0, 'Play again');
      }

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        panel.classList.add('hidden');
        compareEl.innerHTML = '';
        len = START_LEN; score = 0; round = 0; newBest = false;
        scoreEl.textContent = '0';
        nextRound();
      }

      for (const b of padKeys) b.addEventListener('click', () => press(b.dataset.k));
      btn.addEventListener('click', begin);
      // Desktop convenience: digits, Backspace and Enter also work.
      const onKey = (e) => {
        if (phase !== 'input') return;
        const k = /^\d$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
        if (!k) return;
        e.preventDefault(); // stop Enter from also "clicking" a focused pad button
        press(k);
      };
      document.addEventListener('keydown', onKey);

      showPanel('Number Memory', 'A number appears for a few seconds. Type it back from memory. Each round adds a digit.', false, 'Start');
      updateKeys();

      return () => { clearInterval(barId); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); };
    },
  });
})();
