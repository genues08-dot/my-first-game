// Mini Sudoku: fill the 6×6 grid so every row, column and 2×3 box holds 1–6 exactly once.
// Bold digits are given. Tap a square, then a number (✕ erases). Clashing digits turn red.
// Every puzzle has exactly one solution and can be finished with plain "only place / only digit"
// reasoning — no guessing. Best = fastest time.
(() => {
  const N = 6, CELLS = 36;
  const MIN_GIVENS = 12, MAX_GIVENS = 16;

  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = r(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rowOf = (i) => Math.floor(i / N), colOf = (i) => i % N;
  const boxOf = (i) => Math.floor(rowOf(i) / 2) * 2 + Math.floor(colOf(i) / 3); // boxes are 2 rows × 3 columns

  // The 18 units (6 rows, 6 columns, 6 boxes) and each cell's 12 peers.
  const UNITS = [];
  for (let k = 0; k < N; k++) {
    UNITS.push([...Array(CELLS).keys()].filter((i) => rowOf(i) === k));
    UNITS.push([...Array(CELLS).keys()].filter((i) => colOf(i) === k));
    UNITS.push([...Array(CELLS).keys()].filter((i) => boxOf(i) === k));
  }
  const PEERS = [...Array(CELLS).keys()].map((i) =>
    [...Array(CELLS).keys()].filter((j) => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))));

  const ALL = 0b1111110; // bits 1..6
  const bitCount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  function candMask(g, i) {
    let m = ALL;
    for (const j of PEERS[i]) if (g[j]) m &= ~(1 << g[j]);
    return m;
  }

  // Random complete grid by backtracking with shuffled digit order.
  function fullGrid() {
    const g = Array(CELLS).fill(0);
    const fill = (i) => {
      if (i === CELLS) return true;
      const m = candMask(g, i);
      for (const d of shuffle([1, 2, 3, 4, 5, 6])) {
        if (!(m & (1 << d))) continue;
        g[i] = d;
        if (fill(i + 1)) return true;
      }
      g[i] = 0;
      return false;
    };
    fill(0);
    return g;
  }

  // Number of solutions, stopping once `limit` is reached (limit 2 = "is it unique?").
  function countSolutions(grid, limit = 2) {
    const g = grid.slice();
    let found = 0;
    const search = () => {
      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < CELLS; i++) {
        if (g[i]) continue;
        const m = candMask(g, i), c = bitCount(m);
        if (c === 0) return;
        if (c < bestCount) { best = i; bestMask = m; bestCount = c; }
      }
      if (best < 0) { found++; return; }
      for (let d = 1; d <= N && found < limit; d++) {
        if (bestMask & (1 << d)) { g[best] = d; search(); }
      }
      g[best] = 0;
    };
    search();
    return found;
  }

  // Fill in what plain reasoning gives: a square with only one possible digit, or a digit with
  // only one possible square in a row/column/box. Returns the finished grid, or null if it gets stuck.
  function solveBySingles(grid) {
    const g = grid.slice();
    for (let progress = true; progress;) {
      progress = false;
      for (let i = 0; i < CELLS; i++) {
        if (g[i]) continue;
        const m = candMask(g, i);
        if (m === 0) return null;
        if (bitCount(m) === 1) { g[i] = Math.log2(m); progress = true; }
      }
      for (const unit of UNITS) {
        for (let d = 1; d <= N; d++) {
          if (unit.some((i) => g[i] === d)) continue;
          const spots = unit.filter((i) => !g[i] && candMask(g, i) & (1 << d));
          if (spots.length === 0) return null;
          if (spots.length === 1) { g[spots[0]] = d; progress = true; }
        }
      }
    }
    return g.every(Boolean) ? g : null;
  }

  // { puzzle (0 = empty), solution, givens }: unique solution, 12–16 givens, solvable without guessing.
  function makePuzzle() {
    for (;;) {
      const solution = fullGrid();
      const puzzle = solution.slice();
      const target = r(MIN_GIVENS, MAX_GIVENS);
      let givens = CELLS;
      for (const i of shuffle([...Array(CELLS).keys()])) {
        if (givens <= target) break;
        puzzle[i] = 0;
        if (solveBySingles(puzzle) && countSolutions(puzzle, 2) === 1) givens--;
        else puzzle[i] = solution[i];
      }
      if (givens >= MIN_GIVENS && givens <= MAX_GIVENS) return { puzzle, solution, givens };
    }
  }

  // Cells whose digit clashes with an equal digit in the same row, column or box.
  function conflicts(g) {
    const bad = new Set();
    for (let i = 0; i < CELLS; i++) {
      if (!g[i]) continue;
      for (const j of PEERS[i]) if (g[j] === g[i]) { bad.add(i); bad.add(j); }
    }
    return bad;
  }

  const fmtTenths = (t) => { const s = Math.floor(t / 10); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  (window.__games = window.__games || []).push({
    id: 'mini-sudoku', category: 'Logic', name: 'Mini Sudoku', skill: 'Logic', desc: 'fill the 6×6 grid', icon: '🧮',
    gen: { makePuzzle, countSolutions, solveBySingles, fullGrid, conflicts, UNITS, MIN_GIVENS, MAX_GIVENS }, // for bulk checks
    lowerIsBetter: true,
    formatBest: fmtTenths, // stored as tenths of a second
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">0:00</span><span class="ms-left"></span></div>' +
        '<div class="ms-grid"></div>' +
        '<div class="ms-pad"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn ms-go"></button></div>';
      const timeEl = el.querySelector('.time');
      const leftEl = el.querySelector('.ms-left');
      const gridEl = el.querySelector('.ms-grid');
      const padEl = el.querySelector('.ms-pad');
      const panel = el.querySelector('.panel');
      const goBtn = panel.querySelector('.ms-go');

      let running = false, game = null, cur = Array(CELLS).fill(0), sel = -1, startAt = 0, tickId = null;
      const timers = [];

      // Grid built box by box so the 2×3 boxes can have wider gaps between them.
      const cells = [];
      for (let b = 0; b < N; b++) {
        const box = document.createElement('div');
        box.className = 'ms-box';
        for (let i = 0; i < CELLS; i++) {
          if (boxOf(i) !== b) continue;
          const c = document.createElement('button');
          c.className = 'ms-cell';
          c.dataset.i = i;
          c.addEventListener('click', () => select(i));
          box.append(c);
          cells[i] = c;
        }
        gridEl.append(box);
      }
      const padBtns = [];
      for (let d = 1; d <= N + 1; d++) {
        const b = document.createElement('button');
        b.className = 'ms-key' + (d > N ? ' ms-erase' : '');
        b.textContent = d > N ? '✕' : d;
        b.dataset.d = d > N ? 0 : d;
        b.setAttribute('aria-label', d > N ? 'Erase' : 'Digit ' + d);
        b.addEventListener('click', () => enter(d > N ? 0 : d));
        padEl.append(b);
        padBtns.push(b);
      }

      function paint() {
        const bad = conflicts(cur);
        const selVal = sel >= 0 ? cur[sel] : 0;
        for (let i = 0; i < CELLS; i++) {
          const c = cells[i];
          const given = !!(game && game.puzzle[i]);
          c.textContent = cur[i] || '';
          c.classList.toggle('given', given);
          c.classList.toggle('sel', i === sel);
          c.classList.toggle('peer', sel >= 0 && i !== sel &&
            (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel)));
          c.classList.toggle('same', !!selVal && i !== sel && cur[i] === selVal);
          c.classList.toggle('bad', bad.has(i));
          c.setAttribute('aria-label', 'Row ' + (rowOf(i) + 1) + ' column ' + (colOf(i) + 1) + ': ' +
            (cur[i] || 'empty') + (given ? ' (given)' : '') + (bad.has(i) ? ' (clash)' : ''));
        }
        const counts = Array(N + 1).fill(0);
        cur.forEach((v) => { counts[v]++; });
        padBtns.forEach((b, k) => b.classList.toggle('full', k < N && counts[k + 1] >= N));
        const left = cur.filter((v) => !v).length;
        leftEl.textContent = game ? left + ' to fill' : '';
      }

      function select(i) {
        if (!running) return;
        sel = i;
        paint();
      }

      function enter(d) {
        if (!running || sel < 0 || game.puzzle[sel]) return;
        cur[sel] = d;
        paint();
        if (cur.every(Boolean) && conflicts(cur).size === 0) win();
      }

      const elapsedTenths = () => Math.max(1, Math.round((Date.now() - startAt) / 100));
      function tick() { timeEl.textContent = fmtTenths(elapsedTenths()); }

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        goBtn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        panel.classList.add('hidden');
        game = makePuzzle();
        cur = game.puzzle.slice();
        sel = -1;
        gridEl.classList.remove('solved');
        running = true;
        startAt = Date.now();
        tick();
        clearInterval(tickId);
        tickId = setInterval(tick, 250);
        paint();
      }

      function win() {
        running = false;
        clearInterval(tickId);
        const t = elapsedTenths();
        timeEl.textContent = fmtTenths(t);
        sel = -1;
        paint();
        gridEl.classList.add('solved');
        const isBest = api.finish(t, panel); // records the time and draws the chart into the end panel
        timers.push(setTimeout(() => showPanel('Solved!', 'Solved in ' + fmtTenths(t), isBest, 'Play again'), 800));
      }

      goBtn.addEventListener('click', begin);
      paint();
      showPanel('Mini Sudoku', 'Fill the grid so each row, column and 2×3 box has 1–6 once. Tap a square, then a number.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
