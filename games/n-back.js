// N-Back (position): one square of a 3×3 grid lights up every 2.5 seconds.
// Tap Match when it is in the same place as N steps ago. A round has 20 + N steps
// with exactly 6 matches. Accuracy = hits / (hits + misses + false alarms):
// 80% or more clears the level and N goes up, under 50% N goes down (min 1).
// A run is 5 rounds (or until Stop). Score = highest N cleared.
(() => {
  const STEP_MS = 2500, LIT_MS = 500, MISS_MS = 800, MATCHES = 6, BASE_STEPS = 20, ROUNDS = 5, CELLS = 9, MAX_N = 9;
  const UP = 0.8, DOWN = 0.5;

  const randInt = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Returns { n, seq, matches }: seq[i] is the lit square (0-8) at step i. seq[i] === seq[i - n]
  // exactly at the indexes in `matches` (MATCHES of them, never in the first n steps).
  function makeSequence(n) {
    const len = BASE_STEPS + n;
    const eligible = Array.from({ length: len - n }, (_, i) => i + n);
    const matches = shuffle(eligible).slice(0, MATCHES).sort((a, b) => a - b);
    const isMatch = new Set(matches);
    const seq = [];
    for (let i = 0; i < len; i++) {
      if (i < n) seq.push(randInt(CELLS));
      else if (isMatch.has(i)) seq.push(seq[i - n]);
      else { let v; do v = randInt(CELLS); while (v === seq[i - n]); seq.push(v); }
    }
    return { n, seq, matches };
  }
  const accuracy = (hits, misses, falseAlarms) => hits / (hits + misses + falseAlarms || 1);
  const nextN = (n, acc) => (acc >= UP ? n + 1 : acc < DOWN ? Math.max(1, n - 1) : n);
  const percent = (acc) => Math.floor(acc * 100) + '%'; // floor so 79.9% never reads as 80%
  const howTo = (n) => 'Tap Match when the square is in the same place as ' + n + (n === 1 ? ' step' : ' steps') + ' ago.';

  (window.__games = window.__games || []).push({
    id: 'n-back', category: 'Memory', name: 'N-Back', skill: 'Working memory', desc: 'does this match N steps back?', icon: '🔁',
    gen: { makeSequence, accuracy, nextN, STEP_MS, LIT_MS, MATCHES, BASE_STEPS, ROUNDS }, // exposed for bulk tests
    formatBest: (v) => 'N=' + v,
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="nb-n">N = 1</span><span class="level nb-step">Step 0/21</span><span class="score nb-round">Round 1/5</span></div>' +
        '<div class="nb-grid">' + Array.from({ length: CELLS }, (_, i) => '<div class="nb-cell" data-i="' + i + '"></div>').join('') + '</div>' +
        '<div class="status nb-status">&nbsp;</div>' +
        '<button class="btn nb-match" disabled>Match</button>' +
        '<button class="nb-stop">Stop</button>' +
        '<div class="panel"><h3></h3><div class="nb-text"></div><p class="new"></p><button class="btn nb-go"></button><button class="nb-stop nb-end">Stop here</button></div>';
      const nEl = el.querySelector('.nb-n');
      const stepEl = el.querySelector('.nb-step');
      const roundEl = el.querySelector('.nb-round');
      const cells = [...el.querySelectorAll('.nb-cell')];
      const statusEl = el.querySelector('.nb-status');
      const matchBtn = el.querySelector('.nb-match');
      const stopBtn = el.querySelector('.nb-stop');
      const panel = el.querySelector('.panel');
      const textEl = panel.querySelector('.nb-text');
      const goBtn = panel.querySelector('.nb-go');
      const endBtn = panel.querySelector('.nb-end');

      let n = 1, round = 0, best = 0, newBest = false, playing = false;
      let cur = -1, game = null, isMatch = null, responded = null, hits = 0, misses = 0, falseAlarms = 0;
      let onGo = null;
      let timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
      const setStatus = (text, cls) => { statusEl.textContent = text || ' '; statusEl.className = 'status nb-status' + (cls ? ' ' + cls : ''); };

      function hud() {
        nEl.textContent = 'N = ' + n;
        stepEl.textContent = 'Step ' + Math.max(0, cur + 1) + '/' + (BASE_STEPS + n);
        roundEl.textContent = 'Round ' + Math.max(1, round) + '/' + ROUNDS;
      }

      function showPanel(title, lines, label, action, canStop, isBest) {
        const chart = panel.querySelector('.rc'); // only the end-of-run panel shows the results chart
        if (chart) chart.remove();
        panel.querySelector('h3').textContent = title;
        textEl.innerHTML = '';
        for (const [text, cls] of lines) {
          const p = document.createElement('p');
          if (cls) p.className = cls;
          p.textContent = text;
          textEl.append(p);
        }
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        goBtn.textContent = label;
        onGo = action;
        // Taken out rather than hidden: a hidden last child would stop the panel from centring its content.
        if (canStop) panel.append(endBtn); else endBtn.remove();
        panel.classList.remove('hidden');
      }

      function startRound() {
        panel.classList.add('hidden');
        clearTimers();
        round++;
        game = makeSequence(n);
        isMatch = new Set(game.matches);
        responded = new Array(game.seq.length).fill(false);
        hits = 0; misses = 0; falseAlarms = 0; cur = -1;
        playing = true;
        cells.forEach((c) => c.classList.remove('lit', 'nb-miss'));
        hud();
        matchBtn.disabled = true;
        setStatus('Get ready… N = ' + n);
        later(() => step(0), 1200);
      }

      // Missed match at step i: outline that square briefly and say so. Returns true if missed.
      const MISSED = '✗ Missed a match';
      function settle(i) {
        if (i < 0 || !isMatch.has(i) || responded[i]) return false;
        misses++;
        const c = cells[game.seq[i]];
        c.classList.add('nb-miss');
        setStatus(MISSED, 'nb-bad');
        later(() => {
          c.classList.remove('nb-miss');
          if (statusEl.textContent === MISSED) setStatus('');
        }, MISS_MS);
        return true;
      }

      function step(i) {
        const missed = settle(i - 1);
        if (i >= game.seq.length) { endRound(); return; }
        if (!missed) setStatus('');
        cur = i;
        hud();
        matchBtn.disabled = i < n; // nothing to compare with yet
        const c = cells[game.seq[i]];
        c.classList.add('lit');
        later(() => c.classList.remove('lit'), LIT_MS);
        later(() => step(i + 1), STEP_MS);
      }

      function flash(cls, text) {
        matchBtn.classList.remove('hit', 'fa');
        void matchBtn.offsetWidth; // restart the flash if tapped again quickly
        matchBtn.classList.add(cls);
        setStatus(text, cls === 'hit' ? 'go' : 'nb-bad');
        later(() => matchBtn.classList.remove(cls), 450);
      }

      function tapMatch() {
        if (!playing || cur < n || responded[cur]) return;
        responded[cur] = true;
        if (isMatch.has(cur)) { hits++; flash('hit', '✓ Match!'); }
        else { falseAlarms++; flash('fa', '✗ Not a match'); }
      }

      function endRound() {
        playing = false;
        cur = -1;
        matchBtn.disabled = true;
        const acc = accuracy(hits, misses, falseAlarms);
        const cleared = acc >= UP;
        if (cleared) {
          if (n > best) best = n;
          if (api.submit(n)) newBest = true; // saved right away, so leaving mid-run keeps it
        }
        const lines = [
          ['Hits ' + hits + ' · Misses ' + misses + ' · False alarms ' + falseAlarms, 'nb-stats'],
          ['Accuracy ' + percent(acc), 'nb-acc'],
        ];
        const prevN = n;
        n = Math.min(MAX_N, nextN(n, acc));
        if (round >= ROUNDS) { finish('Run complete', lines); return; }
        lines.push([cleared ? '✓ Level cleared! Next: N = ' + n
          : n < prevN ? 'Under 50%. Next: N = ' + n
          : '80% clears a level. Next: N = ' + n, cleared ? 'nb-up' : '']);
        lines.push([howTo(n), 'nb-how']);
        hud();
        setStatus('');
        showPanel('Round ' + round + ' of ' + ROUNDS, lines, 'Next round', startRound, true, false);
      }

      function finish(title, lines) {
        playing = false;
        clearTimers();
        cells.forEach((c) => c.classList.remove('lit', 'nb-miss'));
        matchBtn.disabled = true;
        matchBtn.classList.remove('hit', 'fa');
        setStatus('');
        const summary = best ? 'Highest level cleared: N = ' + best : 'No level cleared yet. Score 80% to clear one.';
        showPanel(title, [...lines, [summary, 'nb-sum']], 'Play again', newRun, false, newBest && best > 0);
        api.finish(best, panel); // once per run (also after Stop): highest N cleared, 0 if none
      }

      function newRun() {
        n = 1; round = 0; best = 0; newBest = false;
        startRound();
      }

      matchBtn.addEventListener('click', tapMatch);
      stopBtn.addEventListener('click', () => { if (playing) finish('Stopped', []); });
      endBtn.addEventListener('click', () => finish('Stopped', []));
      goBtn.addEventListener('click', () => onGo && onGo());
      // Desktop convenience: Space or M also taps Match.
      const onKey = (e) => {
        if (!playing || (e.key !== ' ' && e.key.toLowerCase() !== 'm')) return;
        e.preventDefault();
        tapMatch();
      };
      document.addEventListener('keydown', onKey);

      hud();
      showPanel('N-Back', [
        ['A square lights up every few seconds.', ''],
        [howTo(1), 'nb-how'],
        ['Score 80% to move up a level. 5 rounds.', ''],
      ], 'Start', newRun, false, false);

      return () => { clearTimers(); document.removeEventListener('keydown', onKey); };
    },
  });
})();
