// 2048: slide every tile on a 4×4 board by swiping (or with the arrow keys).
// Two equal tiles that run into each other merge into one tile worth their sum, and that sum
// is added to your score. A tile merges at most once per move. Every move that changes the
// board adds a new tile (a 2, or now and then a 4). Make a 2048 tile, then keep going until
// no move is left. An unfinished game is saved, so you can continue it later.
(() => {
  const N = 4;
  const GOAL = 2048;
  const SAVE_KEY = 'save:2048';
  const SWIPE_MIN = 25; // px a finger must travel to count as a swipe
  const SLIDE_MS = 110; // length of the slide animation
  const DIRS = ['left', 'right', 'up', 'down'];

  // Slide one line of tiles towards index 0, merging equal neighbours once.
  // Returns the new line, the points scored, and dest[i] = where input tile i ended up (-1 if empty).
  function slideRow(row) {
    const out = [], usedUp = [], dest = row.map(() => -1);
    let score = 0;
    row.forEach((v, i) => {
      if (!v) return;
      const k = out.length - 1;
      if (k >= 0 && out[k] === v && !usedUp[k]) {
        out[k] *= 2; usedUp[k] = true; score += out[k]; dest[i] = k;
      } else {
        out.push(v); usedUp.push(false); dest[i] = out.length - 1;
      }
    });
    while (out.length < row.length) out.push(0);
    return { row: out, score, dest };
  }

  // The k-th line of cells for a move, listed from the wall the tiles slide towards.
  function lineCells(dir, k) {
    return Array.from({ length: N }, (_, i) =>
      dir === 'left' ? [k, i] : dir === 'right' ? [k, N - 1 - i] : dir === 'up' ? [i, k] : [N - 1 - i, k]);
  }

  // Move the whole board (grid[row][col], 0 = empty). Pure: returns a new grid.
  // paths lists every tile's journey so the UI can animate it.
  function move(grid, dir) {
    const next = grid.map((r) => r.slice());
    const paths = [];
    let score = 0, moved = false;
    for (let k = 0; k < N; k++) {
      const cells = lineCells(dir, k);
      const res = slideRow(cells.map(([r, c]) => grid[r][c]));
      score += res.score;
      cells.forEach(([r, c], i) => {
        next[r][c] = res.row[i];
        if (res.dest[i] < 0) return;
        const to = cells[res.dest[i]];
        paths.push({ from: [r, c], to });
        if (to[0] !== r || to[1] !== c) moved = true;
      });
    }
    return { grid: next, score, moved, paths };
  }

  const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(0));
  const maxTile = (grid) => Math.max(...grid.flat());
  const emptyCells = (grid) => {
    const out = [];
    grid.forEach((row, r) => row.forEach((v, c) => { if (!v) out.push([r, c]); }));
    return out;
  };

  // Put a new tile (2 at 90%, 4 at 10%) on a random empty cell. Changes grid; returns the cell or null.
  function addTile(grid, rand = Math.random) {
    const cells = emptyCells(grid);
    if (!cells.length) return null;
    const [r, c] = cells[Math.floor(rand() * cells.length)];
    grid[r][c] = rand() < 0.9 ? 2 : 4;
    return [r, c];
  }

  function canMove(grid) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (!v) return true;
        if (c + 1 < N && grid[r][c + 1] === v) return true;
        if (r + 1 < N && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  const isTileValue = (v) => v === 0 || (Number.isInteger(v) && v >= 2 && (v & (v - 1)) === 0);
  const validGrid = (g) => Array.isArray(g) && g.length === N && g.every((row) => Array.isArray(row) && row.length === N && row.every(isTileValue));

  (window.__games = window.__games || []).push({
    id: '2048', category: 'Planning', name: '2048', skill: 'Planning', desc: 'swipe to merge tiles', icon: '🟧',
    gen: { slideRow, move, canMove, addTile, emptyGrid, maxTile, DIRS }, // pure logic, for bulk tests
    start(el, api) {
      el.innerHTML =
        '<div class="hud g2048-hud"><span>Score <b class="g2048-score">0</b></span><span class="g2048-top">Top tile <b>–</b></span></div>' +
        '<div class="g2048-board"><div class="g2048-tiles"></div></div>' +
        '<button class="btn g2048-restart">New game</button>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const scoreEl = el.querySelector('.g2048-score');
      const topEl = el.querySelector('.g2048-top b');
      const board = el.querySelector('.g2048-board');
      const tilesEl = el.querySelector('.g2048-tiles');
      const restartBtn = el.querySelector('.g2048-restart');
      const panel = el.querySelector('.panel');
      const panelBtn = panel.querySelector('.btn');

      let grid = emptyGrid(), score = 0, won = false, playing = false;
      let nodes = {}, pending = null, animTimer = null, confirmTimer = null, panelAction = null, touch = null;

      const place = (node, r, c) => { node.style.setProperty('--r', r); node.style.setProperty('--c', c); };
      for (let i = 0; i < N * N; i++) {
        const cell = document.createElement('div');
        cell.className = 'g2048-cell';
        place(cell, Math.floor(i / N), i % N);
        board.insertBefore(cell, tilesEl);
      }

      // ---- saving an unfinished game ----
      const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, score, won })); } catch (e) { /* storage blocked */ } };
      const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ } };
      function loadSave() {
        try {
          const s = JSON.parse(localStorage.getItem(SAVE_KEY));
          if (s && validGrid(s.grid) && maxTile(s.grid) > 0 && canMove(s.grid) && Number.isFinite(s.score) && s.score >= 0) return s;
        } catch (e) { /* missing or broken save */ }
        return null;
      }

      // ---- drawing ----
      function tileNode(v, r, c, extra) {
        const t = document.createElement('div');
        t.className = 'g2048-tile';
        place(t, r, c);
        const face = document.createElement('span');
        const digits = String(v).length;
        face.className = 'g2048-face g2048-v' + (v <= 16384 ? v : 'big') + (digits >= 3 ? ' g2048-d' + Math.min(digits, 5) : '') + (extra ? ' ' + extra : '');
        face.textContent = v;
        t.append(face);
        return t;
      }

      function render(born, merged) {
        tilesEl.innerHTML = '';
        nodes = {};
        grid.forEach((row, r) => row.forEach((v, c) => {
          if (!v) return;
          const k = r + ',' + c;
          const n = tileNode(v, r, c, k === born ? 'g2048-born' : merged && merged.has(k) ? 'g2048-merged' : '');
          nodes[k] = n;
          tilesEl.append(n);
        }));
        scoreEl.textContent = score;
        topEl.textContent = maxTile(grid) || '–';
      }

      function showPanel(title, result, note, label, action) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = note;
        panelBtn.textContent = label;
        panelAction = action;
        panel.classList.remove('hidden');
      }

      // ---- playing ----
      function doMove(dir) {
        if (!playing) return;
        flush();
        if (!playing) return; // the previous move may have ended the game
        const res = move(grid, dir);
        if (!res.moved) return;
        const seen = new Set(), merged = new Set();
        for (const p of res.paths) {
          const to = p.to.join();
          if (seen.has(to)) merged.add(to);
          seen.add(to);
          const n = nodes[p.from.join()];
          if (n) place(n, p.to[0], p.to[1]);
        }
        grid = res.grid;
        score += res.score;
        const born = addTile(grid);
        scoreEl.textContent = score;
        save();
        pending = { born: born && born.join(), merged };
        animTimer = setTimeout(flush, SLIDE_MS);
      }

      // Finish the running slide animation: draw the settled board and check for the end.
      function flush() {
        if (!pending) return;
        clearTimeout(animTimer);
        const { born, merged } = pending;
        pending = null;
        render(born, merged);
        if (!won && maxTile(grid) >= GOAL) {
          won = true;
          save();
          playing = false;
          showPanel('You made 2048!', 'Score ' + score + '. Keep merging for an even bigger score.', '', 'Keep going', resume);
        } else if (!canMove(grid)) {
          gameOver();
        }
      }

      function gameOver() {
        playing = false;
        clearSave();
        const isBest = api.submit(score);
        showPanel('No moves left', 'Score ' + score + ' · top tile ' + maxTile(grid), isBest && score > 0 ? 'New best!' : '', 'Play again', newGame);
      }

      function resume() {
        panel.classList.add('hidden');
        playing = true;
        if (!canMove(grid)) gameOver();
      }

      function newGame() {
        clearTimeout(animTimer);
        pending = null;
        grid = emptyGrid();
        score = 0; won = false;
        addTile(grid); addTile(grid);
        render();
        save();
        resetRestart();
        resume();
      }

      // "New game" mid-game asks for a second tap so a stray tap can't wipe a long game.
      function resetRestart() { clearTimeout(confirmTimer); restartBtn.textContent = 'New game'; restartBtn.classList.remove('g2048-confirm'); }
      restartBtn.addEventListener('click', () => {
        if (!playing) return;
        if (score > 0 && !restartBtn.classList.contains('g2048-confirm')) {
          restartBtn.textContent = 'Tap again to start over';
          restartBtn.classList.add('g2048-confirm');
          confirmTimer = setTimeout(resetRestart, 2500);
          return;
        }
        if (score > 0) api.submit(score);
        newGame();
      });

      // ---- input: swipes on the board, arrow keys anywhere ----
      board.addEventListener('touchstart', (e) => {
        touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }, { passive: true });
      board.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) touch = null;
        e.preventDefault(); // keep the page still while swiping
      }, { passive: false });
      board.addEventListener('touchend', (e) => {
        if (!touch || e.touches.length) { touch = null; return; } // multi-touch: ignore
        const t = e.changedTouches[0];
        const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
        touch = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
        doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      });
      board.addEventListener('touchcancel', () => { touch = null; });

      const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      const onKey = (e) => {
        const dir = KEYS[e.key];
        if (!dir) return;
        e.preventDefault();
        doMove(dir);
      };
      document.addEventListener('keydown', onKey);

      panelBtn.addEventListener('click', () => { if (panelAction) panelAction(); });

      const saved = loadSave();
      if (saved) { grid = saved.grid; score = saved.score; won = !!saved.won; render(); }
      showPanel('2048', 'Swipe to slide all the tiles. Two equal tiles merge into one. Can you make 2048?', '',
        saved ? 'Continue' : 'Start', saved ? resume : newGame);

      return () => {
        document.removeEventListener('keydown', onKey);
        clearTimeout(animTimer);
        clearTimeout(confirmTimer);
      };
    },
  });
})();
