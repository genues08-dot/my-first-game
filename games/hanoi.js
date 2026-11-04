// Tower of Hanoi: move the whole tower from the left peg to the goal peg on the right.
// Tap a peg to lift its top disc, then tap another peg to put it there (tap the same peg to
// put it back). A disc may never go on top of a smaller disc. One run has four levels:
// 3, 4, 5 and 6 discs. A level with n discs takes at least 2^n − 1 moves and scores
// max(10, 100 − 5 × extra moves), so a perfect run scores 400.
(() => {
  const LEVELS = [3, 4, 5, 6];
  const MAX_DISCS = 6;
  const COLORS = ['#ff5d6c', '#ffa94d', '#ffd166', '#3ddc97', '#4dabf7', '#b197fc']; // smallest .. largest
  const LOCK_MS = 700;

  const optimal = (n) => 2 ** n - 1;
  const levelPoints = (n, moves) => Math.max(10, 100 - 5 * (moves - optimal(n)));
  const tower = (n) => [Array.from({ length: n }, (_, i) => n - i), [], []]; // each peg lists discs bottom -> top
  const topOf = (peg) => peg[peg.length - 1];
  const canMove = (pegs, from, to) =>
    from !== to && pegs[from].length > 0 && (pegs[to].length === 0 || topOf(pegs[to]) > topOf(pegs[from]));
  // Pure: returns the new pegs, or null if the move is not allowed.
  function moveDisc(pegs, from, to) {
    if (!canMove(pegs, from, to)) return null;
    const next = pegs.map((p) => p.slice());
    next[to].push(next[from].pop());
    return next;
  }
  const isDone = (pegs, n) => pegs[2].length === n;

  (window.__games = window.__games || []).push({
    id: 'hanoi', category: 'Planning', name: 'Tower of Hanoi', skill: 'Planning', desc: 'move the tower in the fewest moves', icon: '🗼',
    gen: { LEVELS, optimal, levelPoints, tower, canMove, moveDisc, isDone }, // pure logic, for bulk tests
    start(el, api) {
      el.innerHTML =
        '<div class="hud hanoi-hud"><span class="hanoi-level">Level 1 · 3 discs</span><span class="hanoi-total">Score <b>0</b></span></div>' +
        '<p class="hanoi-info">Moves <b class="hanoi-moves">0</b> · fewest possible <b class="hanoi-opt">7</b></p>' +
        '<div class="hanoi-board"></div>' +
        '<p class="hanoi-msg"></p>' +
        '<button class="btn hanoi-restart">Restart level</button>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="hanoi-sub"></p><p class="new"></p><button class="btn"></button></div>';
      const levelEl = el.querySelector('.hanoi-level');
      const totalEl = el.querySelector('.hanoi-total b');
      const movesEl = el.querySelector('.hanoi-moves');
      const optEl = el.querySelector('.hanoi-opt');
      const boardEl = el.querySelector('.hanoi-board');
      const msgEl = el.querySelector('.hanoi-msg');
      const restartBtn = el.querySelector('.hanoi-restart');
      const panel = el.querySelector('.panel');
      const panelBtn = panel.querySelector('.btn');

      let level = 0, pegs = tower(LEVELS[0]), selected = null, moves = 0, total = 0, results = [];
      let playing = false, locked = false, panelAction = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };
      const discs = () => LEVELS[level];

      const pegEls = ['Left', 'Middle', 'Right'].map((name, p) => {
        const b = document.createElement('button');
        b.className = 'hanoi-peg';
        b.setAttribute('aria-label', name + ' peg');
        b.innerHTML = '<span class="hanoi-hand"></span><span class="hanoi-pole"></span><span class="hanoi-base"></span>' +
          '<span class="hanoi-tag">' + ['Start', '', 'Goal'][p] + '</span>';
        b.addEventListener('click', () => tapPeg(p));
        boardEl.append(b);
        return b;
      });

      function discNode(size, lifted) {
        const d = document.createElement('span');
        const n = discs();
        d.className = 'hanoi-disc' + (lifted ? ' hanoi-lifted' : '');
        d.dataset.size = size;
        d.textContent = size;
        d.style.width = (n === 1 ? 96 : 30 + ((size - 1) * 66) / (n - 1)) + '%';
        d.style.background = COLORS[Math.round(((size - 1) * (MAX_DISCS - 1)) / Math.max(1, n - 1))];
        return d;
      }

      function draw() {
        pegEls.forEach((b, p) => {
          const hand = b.querySelector('.hanoi-hand'), pole = b.querySelector('.hanoi-pole');
          hand.innerHTML = '';
          pole.innerHTML = '';
          const stack = pegs[p].slice();
          const lifted = selected === p ? stack.pop() : 0;
          for (const s of stack) pole.append(discNode(s, false));
          if (lifted) hand.append(discNode(lifted, true));
          b.classList.toggle('hanoi-sel', selected === p);
        });
        levelEl.textContent = 'Level ' + (level + 1) + ' · ' + discs() + ' discs';
        movesEl.textContent = moves;
        optEl.textContent = optimal(discs());
        totalEl.textContent = total;
        restartBtn.disabled = !playing;
      }

      function tapPeg(p) {
        if (!playing || locked) return;
        if (selected === null) {
          if (pegs[p].length) { selected = p; draw(); }
          return;
        }
        if (selected === p) { selected = null; draw(); return; }
        const next = moveDisc(pegs, selected, p);
        if (!next) { refuse(p); return; }
        pegs = next;
        selected = null;
        moves++;
        draw();
        if (isDone(pegs, discs())) levelDone();
      }

      // Bigger disc on a smaller one: flash red, then put the lifted disc back.
      function refuse(p) {
        locked = true;
        pegEls[p].classList.add('hanoi-bad');
        const lifted = pegEls[selected].querySelector('.hanoi-lifted');
        if (lifted) lifted.classList.add('hanoi-bad');
        msgEl.textContent = 'A bigger disc can’t go on a smaller one';
        later(() => {
          pegEls[p].classList.remove('hanoi-bad');
          msgEl.textContent = '';
          selected = null;
          locked = false;
          draw();
        }, LOCK_MS);
      }

      function levelDone() {
        playing = false;
        const n = discs(), pts = levelPoints(n, moves);
        total += pts;
        results.push(pts);
        draw();
        later(() => {
          if (level < LEVELS.length - 1) {
            const chart = panel.querySelector('.rc'); // only the end-of-run panel shows the results chart
            if (chart) chart.remove();
            showPanel('Level ' + (level + 1) + ' done!', moves + ' moves · fewest possible ' + optimal(n),
              '+' + pts + ' points · score ' + total, '', 'Next: ' + LEVELS[level + 1] + ' discs', nextLevel);
          } else {
            const isBest = api.finish(total, panel); // records the run and draws the chart into the end panel
            showPanel('All towers moved!', 'Final score ' + total + ' / ' + 100 * LEVELS.length,
              'Levels: ' + results.join(' · '), isBest ? 'New best!' : '', 'Play again', newRun);
          }
        }, 500);
      }

      function showPanel(title, result, sub, note, label, action) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.hanoi-sub').textContent = sub;
        panel.querySelector('.new').textContent = note;
        panelBtn.textContent = label;
        panelAction = action;
        panel.classList.remove('hidden');
      }

      function startLevel() {
        clearTimers();
        pegs = tower(discs());
        selected = null; moves = 0; locked = false; playing = true;
        msgEl.textContent = '';
        pegEls.forEach((b) => b.classList.remove('hanoi-bad'));
        panel.classList.add('hidden');
        draw();
      }
      function nextLevel() { level++; startLevel(); }
      function newRun() { level = 0; total = 0; results = []; startLevel(); }

      restartBtn.addEventListener('click', () => { if (playing) startLevel(); });
      panelBtn.addEventListener('click', () => { if (panelAction) panelAction(); });

      draw();
      showPanel('Tower of Hanoi', 'Move the tower to the goal peg. Tap a peg to lift its top disc, then tap where it goes. Never put a disc on a smaller one.',
        '3 to 6 discs. Fewer moves, more points.', '', 'Start', newRun);

      return clearTimers;
    },
  });
})();
