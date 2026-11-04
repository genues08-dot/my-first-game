// Lights Out: tapping a light flips it and its up/down/left/right neighbours.
// Turn every light off. Boards grow 3×3 → 4×4 → 5×5 and need more taps as you go.
// Each puzzle is made by tapping k different cells of a dark board, so it is always solvable.
// "Par" is the true fewest taps, found by solving the board as linear equations over GF(2).
(() => {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const popcount = (x) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };

  const sizeFor = (level) => (level <= 2 ? 3 : level <= 4 ? 4 : 5);
  // taps used to build the puzzle: 2,3 on 3×3 · 4,5 on 4×4 · then 5,6,7… up to 12 on 5×5
  const tapsFor = (level) => (level <= 4 ? level + 1 : Math.min(12, level));

  // Bitmask of the cells that tapping cell i flips (itself + orthogonal neighbours).
  function pressMask(n, i) {
    const row = Math.floor(i / n), col = i % n;
    let m = 1 << i;
    if (row > 0) m |= 1 << (i - n);
    if (row < n - 1) m |= 1 << (i + n);
    if (col > 0) m |= 1 << (i - 1);
    if (col < n - 1) m |= 1 << (i + 1);
    return m;
  }

  // Lights as a bitmask (bit i = cell i lit) after tapping every cell in `taps`.
  function applyTaps(n, board, taps) {
    for (const i of taps) board ^= pressMask(n, i);
    return board;
  }

  // Fewest-taps solution for `board` on an n×n grid, as a bitmask of cells to tap, or -1 if unsolvable.
  // Gaussian elimination over GF(2), then try every combination of the null space (≤ 2^4 of them).
  function solve(n, board) {
    const N = n * n;
    const rows = []; // each: { m: coefficient mask over tap variables, b: target bit }
    for (let j = 0; j < N; j++) rows.push({ m: pressMask(n, j), b: (board >> j) & 1 }); // the press matrix is symmetric
    const pivotOf = []; // pivotOf[col] = row index, for pivot columns
    let rank = 0;
    for (let col = 0; col < N; col++) {
      let p = -1;
      for (let k = rank; k < N; k++) if ((rows[k].m >> col) & 1) { p = k; break; }
      if (p < 0) continue;
      [rows[rank], rows[p]] = [rows[p], rows[rank]];
      for (let k = 0; k < N; k++) {
        if (k !== rank && (rows[k].m >> col) & 1) { rows[k].m ^= rows[rank].m; rows[k].b ^= rows[rank].b; }
      }
      pivotOf[col] = rank++;
    }
    for (let k = rank; k < N; k++) if (rows[k].b) return -1; // 0 = 1: no solution
    let particular = 0;
    const free = [];
    for (let col = 0; col < N; col++) {
      if (pivotOf[col] === undefined) free.push(col);
      else if (rows[pivotOf[col]].b) particular |= 1 << col;
    }
    const basis = free.map((f) => {
      let v = 1 << f;
      for (let col = 0; col < N; col++) {
        if (pivotOf[col] !== undefined && (rows[pivotOf[col]].m >> f) & 1) v |= 1 << col;
      }
      return v;
    });
    let best = particular;
    for (let s = 1; s < 1 << basis.length; s++) {
      let x = particular;
      basis.forEach((v, i) => { if ((s >> i) & 1) x ^= v; });
      if (popcount(x) < popcount(best)) best = x;
    }
    return best;
  }

  // A puzzle for `level`: { n, k, taps, board, par }. Never already solved, par is the true minimum.
  // Retries a few times so par usually equals k (keeps each level's difficulty steady).
  function genPuzzle(level) {
    const n = sizeFor(level), k = tapsFor(level);
    let fallback = null;
    for (let tries = 0; tries < 40; tries++) {
      const cells = [...Array(n * n).keys()];
      for (let i = cells.length - 1; i > 0; i--) { const j = r(0, i); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      const taps = cells.slice(0, k);
      const board = applyTaps(n, 0, taps);
      if (board === 0) continue;
      const par = popcount(solve(n, board));
      const p = { n, k, taps, board, par };
      if (par === k) return p;
      if (!fallback || par > fallback.par) fallback = p;
    }
    return fallback;
  }

  (window.__games = window.__games || []).push({
    id: 'lights-out', category: 'Logic', name: 'Lights Out', skill: 'Logic', desc: 'turn every light off', icon: '💡',
    gen: { genPuzzle, solve, applyTaps, pressMask, sizeFor, tapsFor }, // exposed for bulk checks
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="level">Level 1</span><span class="lo-par">Par: –</span><span class="lo-taps">Taps: 0</span></div>' +
        '<div class="lo-board"></div>' +
        '<div class="status lo-status"></div>' +
        '<div class="lo-actions"><button class="btn lo-reset">Reset</button><button class="btn lo-give">Give up</button></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn lo-go"></button></div>';
      const levelEl = el.querySelector('.level');
      const parEl = el.querySelector('.lo-par');
      const tapsEl = el.querySelector('.lo-taps');
      const boardEl = el.querySelector('.lo-board');
      const statusEl = el.querySelector('.lo-status');
      const resetBtn = el.querySelector('.lo-reset');
      const giveBtn = el.querySelector('.lo-give');
      const panel = el.querySelector('.panel');
      const goBtn = panel.querySelector('.lo-go');

      let running = false, locked = false, cleared = 0, puzzle = null, board = 0, taps = 0, confirmGive = false;
      let cells = [];
      const timers = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
      let giveTimer = null;

      function paint() {
        cells.forEach((b, i) => {
          const on = ((board >> i) & 1) === 1;
          b.classList.toggle('on', on);
          b.setAttribute('aria-label', 'Light ' + (i + 1) + (on ? ' on' : ' off'));
        });
        tapsEl.textContent = 'Taps: ' + taps;
      }

      function buildBoard(n) {
        boardEl.style.setProperty('--n', n);
        boardEl.innerHTML = '';
        cells = [];
        for (let i = 0; i < n * n; i++) {
          const b = document.createElement('button');
          b.className = 'lo-cell';
          b.addEventListener('click', () => tap(i));
          boardEl.append(b);
          cells.push(b);
        }
      }

      function startLevel() {
        const level = cleared + 1;
        puzzle = genPuzzle(level);
        board = puzzle.board; taps = 0; locked = false;
        levelEl.textContent = 'Level ' + level;
        parEl.textContent = 'Par: ' + puzzle.par;
        statusEl.textContent = 'Turn every light off';
        statusEl.className = 'status lo-status';
        buildBoard(puzzle.n);
        paint();
      }

      function tap(i) {
        if (!running || locked) return;
        board ^= pressMask(puzzle.n, i);
        taps++;
        paint();
        if (board === 0) levelDone();
      }

      function levelDone() {
        locked = true;
        cleared++;
        resetGive();
        statusEl.textContent = 'Level cleared!' + (taps <= puzzle.par ? ' On par.' : '');
        statusEl.className = 'status go lo-status';
        later(() => { if (running) startLevel(); }, 1100);
      }

      function resetGive() {
        confirmGive = false;
        giveBtn.textContent = 'Give up';
        giveBtn.classList.remove('lo-sure');
        clearTimeout(giveTimer);
      }

      resetBtn.addEventListener('click', () => {
        if (!running || locked) return;
        board = puzzle.board; taps = 0;
        paint();
      });

      // Two taps to give up, so a stray thumb doesn't end the run.
      giveBtn.addEventListener('click', () => {
        if (!running || locked) return;
        if (!confirmGive) {
          confirmGive = true;
          giveBtn.textContent = 'Tap to confirm';
          giveBtn.classList.add('lo-sure');
          giveTimer = later(resetGive, 2500);
          return;
        }
        resetGive();
        finish();
      });

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        goBtn.textContent = label;
        panel.classList.remove('hidden');
        boardEl.classList.add('lo-idle'); // no glow spilling out from under the panel
      }

      function begin() {
        panel.classList.add('hidden');
        boardEl.classList.remove('lo-idle');
        cleared = 0; running = true;
        resetGive();
        startLevel();
      }

      function finish() {
        running = false;
        const isBest = api.finish(cleared, panel); // giving up with 0 cleared records 0 (never a best)
        showPanel('Run over', 'Levels cleared: ' + cleared, isBest, 'Play again');
      }

      goBtn.addEventListener('click', begin);
      buildBoard(3); // a dark board behind the start panel
      paint();
      showPanel('Lights Out', 'Tapping a light flips it and its neighbours. Turn every light off. Par is the fewest taps possible.', false, 'Start');

      return () => { timers.forEach(clearTimeout); };
    },
  });
})();
