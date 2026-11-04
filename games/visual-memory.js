// Visual Memory (Human Benchmark rules). Level L shows a grid of side floor(sqrt(9 + 3L))
// (3×3 at level 1, growing to 10×10 by level 31) and L + 2 target tiles. Each round: 0.5 s blank,
// the targets light up for 1.2 s, then hide. Tap the tiles that were lit, in any order, with no
// time limit. Finding all targets moves you to the next level. A 3rd wrong tile in a level costs
// one of your 3 lives (never restored) and the same level is replayed with a new pattern.
// Tapping a tile that is already revealed or marked does nothing.
// Score = the level on which the last life was lost (HB's "level reached").
(() => {
  const LIVES = 3, MAX_WRONG = 3;
  const BLANK_MS = 500, SHOW_MS = 1200, RECAP_MS = 500, POST_MS = 500;

  const sideFor = (level) => Math.floor(Math.sqrt(9 + 3 * level));
  const tilesFor = (level) => level + 2;

  // Random pattern for a level: { side, targets: sorted cell indices }.
  function pattern(level, rnd = Math.random) {
    const side = sideFor(level), n = tilesFor(level);
    const cells = [...Array(side * side).keys()];
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return { side, targets: cells.slice(0, n).sort((a, b) => a - b) };
  }

  // ---- pure game state (exposed as gen for bulk tests) ----
  function newGame(rnd = Math.random) {
    const s = { level: 1, lives: LIVES, over: false, score: 0 };
    newRound(s, rnd);
    return s;
  }
  function newRound(s, rnd = Math.random) {
    const p = pattern(s.level, rnd);
    s.side = p.side; s.targets = new Set(p.targets); s.found = new Set(); s.wrong = new Set(); s.done = false;
  }
  // Tap a cell during the input phase: 'ignore' | 'right' | 'wrong' | 'win' (all found) | 'fail' (3rd wrong tile).
  function tap(s, cell) {
    if (s.done || s.over || s.found.has(cell) || s.wrong.has(cell)) return 'ignore';
    if (s.targets.has(cell)) {
      s.found.add(cell);
      if (s.found.size === s.targets.size) { s.done = true; return 'win'; }
      return 'right';
    }
    s.wrong.add(cell);
    if (s.wrong.size >= MAX_WRONG) { s.done = true; s.lives--; return 'fail'; }
    return 'wrong';
  }
  // After a round ends: next level on a win; on a fail, game over when no lives are left.
  function settle(s, won, rnd = Math.random) {
    if (won) s.level++;
    else if (s.lives <= 0) { s.over = true; s.score = s.level; return; }
    newRound(s, rnd);
  }

  (window.__games = window.__games || []).push({
    id: 'visual-memory', category: 'Memory', name: 'Visual Memory', skill: 'Visual memory', desc: 'remember which squares lit up', icon: '👁️',
    gen: { sideFor, tilesFor, pattern, newGame, tap, settle, LIVES, MAX_WRONG, BLANK_MS, SHOW_MS },
    start(el, api) {
      el.innerHTML =
        '<div class="hud vm-hud"><span class="level vm-level">Level 1</span><span class="vm-lives"></span></div>' +
        '<div class="status vm-status">&nbsp;</div>' +
        '<div class="vm-board"></div>' +
        '<div class="panel vm-panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const levelEl = el.querySelector('.vm-level');
      const livesEl = el.querySelector('.vm-lives');
      const statusEl = el.querySelector('.vm-status');
      const boardEl = el.querySelector('.vm-board');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      // phase: 'idle' | 'blank' | 'show' | 'input' | 'recap' | 'over'
      let s = null, phase = 'idle', tiles = [];
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const setStatus = (text, cls) => { statusEl.textContent = text; statusEl.className = 'status vm-status' + (cls ? ' ' + cls : ''); };

      function hud() {
        levelEl.textContent = 'Level ' + s.level;
        livesEl.textContent = '♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(LIVES - Math.max(0, s.lives));
        livesEl.setAttribute('aria-label', s.lives + ' lives');
      }

      function buildBoard() {
        boardEl.innerHTML = '';
        boardEl.style.setProperty('--n', s.side);
        boardEl.className = 'vm-board vm-n' + Math.min(s.side, 8);
        tiles = Array.from({ length: s.side * s.side }, (_, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'vm-tile';
          b.dataset.i = i;
          b.addEventListener('click', () => onTap(i));
          boardEl.append(b);
          return b;
        });
      }

      function paint(i, cls) { tiles[i].className = 'vm-tile' + (cls ? ' ' + cls : ''); tiles[i].textContent = cls === 'vm-x' ? '✕' : ''; }

      function startRound() {
        phase = 'blank';
        hud();
        buildBoard();
        setStatus('Watch the squares…');
        later(() => {
          phase = 'show';
          s.targets.forEach((i) => paint(i, 'vm-lit'));
          later(() => {
            phase = 'input';
            s.targets.forEach((i) => paint(i, ''));
            setStatus('Tap the squares that lit up', 'go');
          }, SHOW_MS);
        }, BLANK_MS);
      }

      function onTap(i) {
        if (phase !== 'input') return;
        const r = tap(s, i);
        if (r === 'ignore') return;
        if (r === 'right' || r === 'win') paint(i, 'vm-on');
        else paint(i, 'vm-x');
        if (r === 'win' || r === 'fail') endRound(r === 'win');
      }

      function endRound(won) {
        phase = 'recap';
        hud();
        if (won) setStatus('Level ' + s.level + ' cleared!', 'go');
        else {
          setStatus(s.lives > 0 ? '3 wrong squares – you lost a life' : '3 wrong squares – no lives left', 'vm-bad');
          s.targets.forEach((i) => { if (!s.found.has(i)) paint(i, 'vm-missed'); });
        }
        later(() => {
          tiles.forEach((t) => { t.className = 'vm-tile'; t.textContent = ''; });
          later(() => {
            settle(s, won);
            if (s.over) end(); else startRound();
          }, POST_MS);
        }, RECAP_MS);
      }

      function end() {
        phase = 'over';
        setStatus('\u00a0'); // quiet background behind the end panel
        const isBest = api.finish(s.score, panel); // records the result and draws the chart into the end panel
        panel.querySelector('h3').textContent = 'Game over';
        panel.querySelector('.result').textContent = 'You reached level ' + s.score;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        btn.textContent = 'Play again';
        panel.classList.remove('hidden');
      }

      function begin() {
        timers.forEach(clearTimeout); timers.length = 0;
        panel.classList.add('hidden');
        s = newGame();
        startRound();
      }

      btn.addEventListener('click', begin);
      s = newGame(); hud(); buildBoard();
      panel.querySelector('h3').textContent = 'Visual Memory';
      panel.querySelector('.result').textContent =
        'Some squares light up for a moment. Tap the ones that lit up. 3 wrong squares cost a life; you have 3 lives.';
      btn.textContent = 'Start';

      return () => { timers.forEach(clearTimeout); };
    },
  });
})();
