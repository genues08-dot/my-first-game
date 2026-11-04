// Card Match: flip two cards at a time and find all 8 pairs in as few moves as you can.
(window.__games = window.__games || []).push({
  id: 'card-match', category: 'Memory', name: 'Card Match', skill: 'Memory', desc: 'find all the pairs', icon: '🃏',
  start(el, api) {
    const SYMS = ['🍎', '🚀', '🎸', '🐙', '🌵', '⚡', '🎲', '🍕'];
    const PAIRS = SYMS.length;

    el.innerHTML =
      '<div class="hud"><span class="moves">Moves: 0</span><span class="pairs">Pairs: 0/' + PAIRS + '</span></div>' +
      '<div class="mgrid"></div>' +
      '<div class="panel hidden"><h3>All matched!</h3><p class="result"></p><p class="new"></p><button class="btn">Play again</button></div>';
    const movesEl = el.querySelector('.moves');
    const pairsEl = el.querySelector('.pairs');
    const grid = el.querySelector('.mgrid');
    const panel = el.querySelector('.panel');

    let deck, up, done, first, lock, moves, matched;
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const buttons = [];

    function shuffled() {
      const d = [...SYMS, ...SYMS];
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
      return d;
    }

    function paint(i) {
      const b = buttons[i];
      b.textContent = up[i] ? deck[i] : '?';
      b.classList.toggle('up', up[i]);
      b.classList.toggle('done', done[i]);
      b.setAttribute('aria-label', up[i] ? deck[i] : 'Hidden card');
    }

    function flip(i) {
      if (lock || up[i] || done[i]) return;
      up[i] = true;
      paint(i);
      if (first === null) { first = i; return; }
      const a = first;
      first = null;
      moves++;
      movesEl.textContent = 'Moves: ' + moves;
      if (deck[a] === deck[i]) {
        done[a] = done[i] = true;
        paint(a); paint(i);
        matched++;
        pairsEl.textContent = 'Pairs: ' + matched + '/' + PAIRS;
        if (matched === PAIRS) later(win, 500);
      } else {
        lock = true;
        later(() => { up[a] = up[i] = false; paint(a); paint(i); lock = false; }, 800);
      }
    }

    function win() {
      // 8 moves is a perfect game (100). Every extra move costs 5 points, minimum 10.
      const score = Math.max(10, 100 - (moves - PAIRS) * 5);
      const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
      panel.querySelector('.result').textContent = 'Solved in ' + moves + ' moves · score ' + score;
      panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
      panel.classList.remove('hidden');
    }

    for (let i = 0; i < PAIRS * 2; i++) {
      const b = document.createElement('button');
      b.className = 'mcard';
      b.addEventListener('click', () => flip(i));
      grid.append(b);
      buttons.push(b);
    }

    function newGame() {
      timers.forEach(clearTimeout);
      timers.length = 0;
      deck = shuffled();
      up = Array(deck.length).fill(false);
      done = Array(deck.length).fill(false);
      first = null; lock = false; moves = 0; matched = 0;
      movesEl.textContent = 'Moves: 0';
      pairsEl.textContent = 'Pairs: 0/' + PAIRS;
      panel.classList.add('hidden');
      for (let i = 0; i < deck.length; i++) paint(i);
    }

    panel.querySelector('.btn').addEventListener('click', newGame);
    newGame();

    return () => timers.forEach(clearTimeout);
  },
});
