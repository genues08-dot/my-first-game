// Memory Sequence: tiles flash in order, repeat them back. Each round adds one tile.
(window.__games = window.__games || []).push({
  id: 'memory-sequence', category: 'Memory', name: 'Memory Sequence', skill: 'Memory', desc: 'repeat the flashing pattern', icon: '🟪',
  start(el, api) {
    const TILES = 9;
    el.innerHTML =
      '<div class="status"></div><div class="grid3"></div>' +
      '<div class="panel hidden"><h3>Game over</h3><p class="result"></p><p class="new"></p><button class="btn">Play again</button></div>';
    const statusEl = el.querySelector('.status');
    const grid = el.querySelector('.grid3');
    const panel = el.querySelector('.panel');

    const tiles = [];
    for (let i = 0; i < TILES; i++) {
      const t = document.createElement('button');
      t.className = 'tile';
      t.dataset.i = i;
      t.style.setProperty('--h', Math.round((i * 360) / TILES));
      t.setAttribute('aria-label', 'Tile ' + (i + 1));
      t.addEventListener('click', () => tap(i));
      grid.append(t);
      tiles.push(t);
    }

    let seq = [], pos = 0, accepting = false, timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const setStatus = (text, go) => { statusEl.textContent = text; statusEl.classList.toggle('go', !!go); };
    const flash = (i, ms) => { tiles[i].classList.add('lit'); later(() => tiles[i].classList.remove('lit'), ms); };

    function newGame() {
      panel.classList.add('hidden');
      seq = [];
      nextRound();
    }

    function nextRound() {
      // Standard sequence-memory timing (the same as Human Benchmark's test, so the
      // "you vs people" chart is a fair comparison): a 1 s pause, then each tile lights
      // for 0.5 s back to back, and a new tile is never the same as the one before it.
      let next;
      do { next = Math.floor(Math.random() * TILES); } while (seq.length && next === seq[seq.length - 1]);
      seq.push(next);
      pos = 0;
      accepting = false;
      setStatus('Round ' + seq.length + ' · Watch');
      const STEP = 500;
      let t = 1000;
      for (const i of seq) {
        later(() => flash(i, STEP), t);
        t += STEP;
      }
      later(() => { accepting = true; setStatus('Your turn', true); }, t);
    }

    function tap(i) {
      if (!accepting) return;
      if (i !== seq[pos]) { gameOver(i); return; }
      flash(i, 140);
      pos++;
      if (pos === seq.length) {
        accepting = false;
        setStatus('Nice!');
        later(nextRound, 800);
      }
    }

    function gameOver(wrongTile) {
      accepting = false;
      tiles[wrongTile].classList.add('wrong');
      const score = seq.length - 1; // rounds fully completed
      const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
      setStatus('');
      later(() => {
        tiles[wrongTile].classList.remove('wrong');
        panel.querySelector('.result').textContent = 'Rounds completed: ' + score;
        panel.querySelector('.new').textContent = isBest && score > 0 ? 'New best!' : '';
        panel.classList.remove('hidden');
      }, 700);
    }

    el.querySelector('.btn').addEventListener('click', newGame);
    newGame();

    return () => { timers.forEach(clearTimeout); };
  },
});
