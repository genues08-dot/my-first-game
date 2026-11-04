// Sliding Puzzle: put the tiles 1–8 back in order, with the gap in the bottom-right corner.
// Tap any tile in the same row or column as the gap: it slides towards the gap and pushes the
// tiles in between along. Every tile that moves counts as one move. Fewest moves is best.
// Puzzles are made by sliding tiles at random from the solved board, so they are always solvable.
(() => {
  const SIDE = 3, CELLS = SIDE * SIDE;
  const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = the gap
  const SHUFFLE_MOVES = 80;
  const MIN_DISTANCE = 10; // shuffled tiles must be at least this many steps from home in total

  const isSolved = (b) => b.every((v, i) => v === SOLVED[i]);
  const rowOf = (i) => Math.floor(i / SIDE), colOf = (i) => i % SIDE;
  const neighbours = (i) => [i - SIDE, i + SIDE, colOf(i) > 0 ? i - 1 : -1, colOf(i) < SIDE - 1 ? i + 1 : -1]
    .filter((j) => j >= 0 && j < CELLS);

  // Tap the tile at index i. Returns { board, moved } (moved = tiles that slid) or null if it can't move.
  function slide(board, i) {
    const gap = board.indexOf(0);
    if (i === gap || (rowOf(i) !== rowOf(gap) && colOf(i) !== colOf(gap))) return null;
    const step = rowOf(i) === rowOf(gap) ? Math.sign(i - gap) : Math.sign(i - gap) * SIDE; // from gap towards tile
    const next = board.slice();
    let pos = gap;
    while (pos !== i) { next[pos] = next[pos + step]; pos += step; }
    next[i] = 0;
    return { board: next, moved: Math.abs(i - gap) / Math.abs(step) };
  }

  // A 3×3 board is solvable when the number of inversions among the tiles is even.
  function isSolvable(b) {
    const t = b.filter((v) => v);
    let inv = 0;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
    return inv % 2 === 0;
  }

  // Total steps every tile is away from its home square: a lower bound on the moves needed.
  const distance = (b) => b.reduce((sum, v, i) => sum + (v
    ? Math.abs(rowOf(i) - rowOf(v - 1)) + Math.abs(colOf(i) - colOf(v - 1)) : 0), 0);

  // At least 80 random single-tile slides from the solved board (never straight back), continued
  // until the board is far enough from solved that it can't be done in a handful of moves.
  function scramble(rand = Math.random) {
    let b = SOLVED.slice(), back = -1;
    for (let k = 0; k < SHUFFLE_MOVES || distance(b) < MIN_DISTANCE; k++) {
      const gap = b.indexOf(0);
      const options = neighbours(gap).filter((j) => j !== back);
      b = slide(b, options[Math.floor(rand() * options.length)]).board;
      back = gap; // the tile that just moved now sits here; moving it again would undo the slide
    }
    return b;
  }

  const clock = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const movesText = (n) => n + (n === 1 ? ' move' : ' moves');

  (window.__games = window.__games || []).push({
    id: 'sliding-puzzle', category: 'Planning', name: 'Sliding Puzzle', skill: 'Planning', desc: 'slide the tiles into order', icon: '🧩',
    gen: { scramble, slide, isSolved, isSolvable, distance, SOLVED }, // pure logic, for bulk tests
    lowerIsBetter: true,
    formatBest: movesText,
    start(el, api) {
      el.innerHTML =
        '<div class="hud slide-hud"><span class="slide-moves">Moves <b>0</b></span><span class="slide-time">0:00</span></div>' +
        '<div class="slide-board"></div>' +
        '<p class="slide-note">Tiles in their right place get a green edge</p>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const movesEl = el.querySelector('.slide-moves b');
      const timeEl = el.querySelector('.slide-time');
      const boardEl = el.querySelector('.slide-board');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let board = SOLVED.slice(), moves = 0, playing = false, startAt = 0, tickId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

      const tiles = {}; // value -> button (the buttons stay; only their position changes)
      for (let v = 1; v < CELLS; v++) {
        const b = document.createElement('button');
        b.className = 'slide-tile';
        b.textContent = v;
        b.addEventListener('click', () => tap(v));
        boardEl.append(b);
        tiles[v] = b;
      }

      function draw() {
        board.forEach((v, i) => {
          if (!v) return;
          const b = tiles[v];
          b.style.setProperty('--r', rowOf(i));
          b.style.setProperty('--c', colOf(i));
          const home = SOLVED[i] === v;
          b.classList.toggle('slide-home', home);
          b.setAttribute('aria-label', 'Tile ' + v + (home ? ', in place' : ''));
        });
        movesEl.textContent = moves;
      }

      function tap(v) {
        if (!playing) return;
        const res = slide(board, board.indexOf(v));
        if (!res) { nudge(tiles[v]); return; }
        board = res.board;
        moves += res.moved;
        draw();
        if (isSolved(board)) finish();
      }

      // A tile that can't move gives a little shake so the tap isn't silently ignored.
      function nudge(b) {
        b.classList.remove('slide-nope');
        void b.offsetWidth; // restart the animation
        b.classList.add('slide-nope');
      }

      function tick() { timeEl.textContent = clock(Date.now() - startAt); }

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        panel.classList.add('hidden');
        timers.forEach(clearTimeout);
        timers.length = 0;
        board = scramble();
        moves = 0;
        draw();
        startAt = Date.now();
        tick();
        clearInterval(tickId);
        tickId = setInterval(tick, 250);
        playing = true;
      }

      function finish() {
        playing = false;
        clearInterval(tickId);
        const time = clock(Date.now() - startAt);
        timeEl.textContent = time;
        const isBest = api.finish(moves, panel); // records the result and draws the chart into the end panel
        later(() => showPanel('Solved!', 'Solved in ' + movesText(moves) + ' · ' + time, isBest, 'Play again'), 700);
      }

      btn.addEventListener('click', begin);
      draw();
      showPanel('Sliding Puzzle', 'Put the tiles in order 1–8. Tap a tile in the same row or column as the gap to slide it there.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
