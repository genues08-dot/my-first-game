// Chimp Test (Human Benchmark rules). Numbers 1..N sit in random cells of a 40-cell grid
// (5 columns × 8 rows on the phone). Tap them in order, starting with 1. After your first tap
// the remaining numbers turn into blank tiles — except on the first level (4 numbers), where they
// stay visible. Empty cells do nothing. A wrong tile is a strike: the level ends and the same
// count is replayed with a new layout. A full correct run adds one number. Strikes are never
// reset: the 3rd ends the game, and so does completing all 40 numbers. No time limit.
// Score = the number count being attempted when the game ended (41 if all 40 are completed, as on HB).
(() => {
  const COLS = 5, ROWS = 8, CELLS = COLS * ROWS, START = 4, MAX_STRIKES = 3;
  const REVEAL_MS = 1000; // after a strike, all numbers are shown briefly

  // Random layout: board[cell] = number (1..count) or 0 for an empty cell.
  function layout(count, rnd = Math.random) {
    const cells = [...Array(CELLS).keys()];
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const board = Array(CELLS).fill(0);
    for (let n = 1; n <= count; n++) board[cells[n - 1]] = n;
    return board;
  }

  // ---- pure game state (exposed as gen for bulk tests) ----
  // phase: 'play' (tapping) | 'between' (level over, waiting for Continue) | 'over'
  function newGame(rnd = Math.random) {
    return { count: START, strikes: 0, board: layout(START, rnd), next: 1, hidden: false, phase: 'play', score: 0, wrongCell: -1 };
  }
  // Tap a cell. Returns 'ignore' | 'right' | 'level' (sequence done) | 'strike' | 'over' | 'done' (all 40 completed).
  function tap(s, cell) {
    if (s.phase !== 'play') return 'ignore';
    const n = s.board[cell];
    if (!n) return 'ignore'; // empty or already cleared
    if (n !== s.next) {
      s.strikes++;
      s.wrongCell = cell;
      if (s.strikes >= MAX_STRIKES) { s.phase = 'over'; s.score = s.count; return 'over'; }
      s.phase = 'between';
      return 'strike';
    }
    s.board[cell] = 0;
    s.next++;
    if (s.count > START) s.hidden = true; // the first level keeps its numbers visible
    if (s.next > s.count) {
      if (s.count >= CELLS) { s.phase = 'over'; s.score = CELLS + 1; return 'done'; } // HB scores a full board as 41
      s.count++;
      s.phase = 'between';
      return 'level';
    }
    return 'right';
  }
  // Continue after the interstitial: a fresh layout for the current count.
  function nextBoard(s, rnd = Math.random) {
    s.board = layout(s.count, rnd);
    s.next = 1; s.hidden = false; s.phase = 'play'; s.wrongCell = -1;
  }

  (window.__games = window.__games || []).push({
    id: 'chimp-test', category: 'Memory', name: 'Chimp Test', skill: 'Working memory', desc: 'remember where the numbers were', icon: '🐒',
    gen: { layout, newGame, tap, nextBoard, COLS, ROWS, CELLS, START, MAX_STRIKES },
    start(el, api) {
      el.innerHTML =
        '<div class="ct-wrap">' +
        '<div class="hud ct-hud"><span class="ct-count">Numbers 4</span><span class="ct-strikes">Strikes 0 of 3</span></div>' +
        '<div class="ct-board"></div>' +
        '</div>' +
        '<div class="panel hidden ct-mid"><h3></h3><p class="ct-mid-label">Numbers</p><p class="ct-mid-num"></p>' +
        '<p class="ct-mid-strikes"></p><button class="btn">Continue</button></div>' +
        '<div class="panel ct-panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn ct-go"></button></div>';
      const countEl = el.querySelector('.ct-count');
      const strikesEl = el.querySelector('.ct-strikes');
      const boardEl = el.querySelector('.ct-board');
      const mid = el.querySelector('.ct-mid');
      const panel = el.querySelector('.ct-panel');
      const goBtn = panel.querySelector('.ct-go');

      const cells = Array.from({ length: CELLS }, (_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.i = i;
        b.addEventListener('click', () => onTap(i));
        boardEl.append(b);
        return b;
      });

      let s = null, locked = false;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

      function hud() {
        countEl.textContent = 'Numbers ' + s.count;
        strikesEl.textContent = 'Strikes ' + s.strikes + ' of ' + MAX_STRIKES;
      }

      // reveal: show every remaining number (after a strike), marking the wrong and the right tile
      function render(reveal) {
        cells.forEach((b, i) => {
          const n = s.board[i];
          let cls = 'ct-cell', text = '';
          if (!n) cls += ' ct-empty';
          else if (reveal) {
            text = n;
            cls += ' ct-num';
            if (i === s.wrongCell) cls += ' ct-wrong';
            else if (n === s.next) cls += ' ct-right';
          } else if (s.hidden) cls += ' ct-cover';
          else { text = n; cls += ' ct-num'; }
          b.className = cls;
          b.textContent = text;
          b.tabIndex = n ? 0 : -1;
          b.setAttribute('aria-label', !n ? 'empty' : text === '' ? 'hidden number' : 'number ' + n);
        });
      }

      // empty grid behind the start, interstitial and end panels
      function renderBlank() {
        cells.forEach((b) => { b.className = 'ct-cell ct-empty'; b.textContent = ''; b.tabIndex = -1; b.setAttribute('aria-label', 'empty'); });
      }

      function onTap(i) {
        if (!s || locked) return;
        const r = tap(s, i);
        if (r === 'ignore') return;
        hud();
        if (r === 'right') { render(false); return; }
        if (r === 'level') { render(false); showMid(false); return; }
        if (r === 'done') { render(false); end(true); return; }
        // strike or game over: reveal the numbers for a moment
        locked = true;
        render(true);
        later(() => { locked = false; if (r === 'over') end(false); else showMid(true); }, REVEAL_MS);
      }

      function showMid(strike) {
        const h = mid.querySelector('h3');
        h.textContent = strike ? 'Strike!' : 'Well done';
        h.className = strike ? 'ct-bad' : 'ct-good';
        mid.querySelector('.ct-mid-num').textContent = s.count;
        mid.querySelector('.ct-mid-strikes').textContent = 'Strikes ' + s.strikes + ' of ' + MAX_STRIKES;
        renderBlank();
        mid.classList.remove('hidden');
      }

      mid.querySelector('.btn').addEventListener('click', () => {
        if (!s || s.phase !== 'between') return;
        mid.classList.add('hidden');
        nextBoard(s);
        hud();
        render(false);
      });

      function end(all) {
        const score = s.score;
        const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
        panel.querySelector('h3').textContent = all ? 'All 40 numbers!' : 'Game over';
        panel.querySelector('.result').textContent = 'Score: ' + score + ' numbers';
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        goBtn.textContent = 'Play again';
        renderBlank();
        panel.classList.remove('hidden');
      }

      function begin() {
        timers.forEach(clearTimeout); timers.length = 0;
        locked = false;
        s = newGame();
        hud();
        render(false);
        panel.classList.add('hidden');
        mid.classList.add('hidden');
      }

      goBtn.addEventListener('click', begin);
      // empty board behind the start panel
      s = newGame(); hud(); s = null;
      renderBlank();
      panel.querySelector('h3').textContent = 'Chimp Test';
      panel.querySelector('.result').textContent =
        'Tap the numbers in order, starting with 1. After your first tap the others are hidden. 3 strikes and you\'re out.';
      goBtn.textContent = 'Start';

      return () => { timers.forEach(clearTimeout); };
    },
  });
})();
