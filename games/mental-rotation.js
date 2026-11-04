// Mental Rotation: two block shapes. Is the right one the left one turned around (Same),
// or its mirror image turned around (Mirror)? 60 seconds; a wrong answer costs 3 seconds.
// Shapes grow from 4 to 7 squares as your streak grows. Only chiral shapes are used
// (the mirror image can't be made by turning), so every question has exactly one answer.
(() => {
  const DURATION = 60000, PENALTY = 3000, MAX_LEVEL = 4;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // A shape is a list of [row, col] cells, shifted so the top-left is 0,0 and sorted.
  function normalize(cells) {
    const r0 = Math.min(...cells.map((c) => c[0])), c0 = Math.min(...cells.map((c) => c[1]));
    return cells.map(([y, x]) => [y - r0, x - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
  const key = (shape) => shape.map((c) => c.join(',')).join(' ');
  const rotate = (shape) => normalize(shape.map(([y, x]) => [x, -y])); // 90° clockwise
  const rotateN = (shape, n) => { let s = shape; for (let i = 0; i < n; i++) s = rotate(s); return s; };
  const mirror = (shape) => normalize(shape.map(([y, x]) => [y, -x])); // left-right flip
  const rotations = (shape) => [0, 1, 2, 3].map((n) => key(rotateN(shape, n)));
  const isChiral = (shape) => !rotations(shape).includes(key(mirror(shape)));

  // Random connected shape of n squares, grown one neighbour at a time.
  function randomShape(n) {
    const cells = [[0, 0]], seen = new Set(['0,0']);
    while (cells.length < n) {
      const [y, x] = pick(cells), [dy, dx] = pick(DIRS);
      const k = (y + dy) + ',' + (x + dx);
      if (!seen.has(k)) { seen.add(k); cells.push([y + dy, x + dx]); }
    }
    return normalize(cells);
  }

  const sizeFor = (level) => 3 + level; // 4, 5, 6, 7 squares

  // { left, right, mirror, turns, size }: right = left (mirrored if `mirror`) turned `turns` × 90°.
  function genRound(level) {
    const size = sizeFor(level);
    let base;
    do base = randomShape(size); while (!isChiral(base));
    const left = rotateN(base, r(0, 3)); // random starting orientation
    const isMirror = Math.random() < 0.5;
    for (;;) {
      const turns = level === 1 ? r(0, 3) : r(1, 3);
      const right = rotateN(isMirror ? mirror(left) : left, turns);
      // after level 1, never show two identical-looking shapes (e.g. an S turned 180°)
      if (level > 1 && key(right) === key(left)) continue;
      return { left, right, mirror: isMirror, turns, size };
    }
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  // Draw a shape centred in an m×m square viewBox (same m for both shapes = same square size).
  function drawShape(svg, shape, m) {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + m + ' ' + m);
    const h = Math.max(...shape.map((c) => c[0])) + 1, w = Math.max(...shape.map((c) => c[1])) + 1;
    const oy = (m - h) / 2, ox = (m - w) / 2, inset = 0.05;
    for (const [y, x] of shape) {
      const rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('class', 'mr-sq');
      rect.setAttribute('x', ox + x + inset);
      rect.setAttribute('y', oy + y + inset);
      rect.setAttribute('width', 1 - 2 * inset);
      rect.setAttribute('height', 1 - 2 * inset);
      rect.setAttribute('rx', 0.14);
      svg.append(rect);
    }
  }

  (window.__games = window.__games || []).push({
    id: 'mental-rotation', category: 'Spatial', name: 'Mental Rotation', skill: 'Spatial', desc: 'same shape or mirror image?', icon: '🔄',
    gen: { genRound, isChiral, rotate, rotateN, mirror, normalize, key, sizeFor }, // exposed for bulk checks
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">60</span><span class="level">Level 1</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="mr-pair"><div class="mr-box"><svg class="mr-shape mr-left"></svg></div>' +
        '<div class="mr-box"><svg class="mr-shape mr-right"></svg></div></div>' +
        '<div class="status mr-status"></div>' +
        '<div class="answers"><button class="ans mr-ans" data-v="same">↻ Same</button><button class="ans mr-ans" data-v="mirror">⇋ Mirror</button></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn mr-go"></button></div>';
      const timeEl = el.querySelector('.time');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const leftSvg = el.querySelector('.mr-left');
      const rightSvg = el.querySelector('.mr-right');
      const statusEl = el.querySelector('.mr-status');
      const buttons = [...el.querySelectorAll('.mr-ans')];
      const panel = el.querySelector('.panel');
      const goBtn = panel.querySelector('.mr-go');

      let running = false, locked = false, score = 0, streak = 0, endAt = 0, round = null, tickId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / 4));

      function nextRound() {
        const lv = level();
        round = genRound(lv);
        levelEl.textContent = 'Level ' + lv;
        const span = Math.max(...round.left.flat()) + 1; // longest side, same for both shapes
        const m = Math.max(span, 3) + 1.2;
        drawShape(leftSvg, round.left, m);
        drawShape(rightSvg, round.right, m);
        statusEl.textContent = '';
        statusEl.className = 'status mr-status';
        buttons.forEach((b) => b.classList.remove('wrong', 'right'));
      }

      function answer(b) {
        if (!running || locked) return;
        const correct = (b.dataset.v === 'mirror') === round.mirror;
        if (correct) {
          score++; streak++;
          scoreEl.textContent = score;
          nextRound();
          return;
        }
        streak = Math.floor(streak / 2);
        endAt -= PENALTY;
        locked = true;
        b.classList.add('wrong');
        buttons.find((x) => x !== b).classList.add('right');
        statusEl.textContent = round.mirror ? 'It was a mirror image'
          : ['Same shape, not turned', 'Same shape, turned 90° ↻', 'Same shape, turned 180°', 'Same shape, turned 90° ↺'][round.turns];
        statusEl.className = 'status mr-status mr-miss';
        later(() => { locked = false; if (running) nextRound(); }, 900);
        tick();
      }

      function tick() {
        const left = endAt - Date.now();
        if (left <= 0) { finish(); return; }
        timeEl.textContent = Math.ceil(left / 1000);
        fillEl.style.width = Math.min(100, (left / DURATION) * 100) + '%';
      }

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        goBtn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        panel.classList.add('hidden');
        score = 0; streak = 0; locked = false; running = true;
        scoreEl.textContent = '0';
        endAt = Date.now() + DURATION;
        nextRound();
        tick();
        clearInterval(tickId);
        tickId = setInterval(tick, 100);
      }

      function finish() {
        running = false;
        clearInterval(tickId);
        timeEl.textContent = '0';
        fillEl.style.width = '0%';
        const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
        showPanel("Time's up", 'Correct answers: ' + score, isBest && score > 0, 'Play again');
      }

      buttons.forEach((b) => b.addEventListener('click', () => answer(b)));
      goBtn.addEventListener('click', begin);
      showPanel('Mental Rotation', 'Is the right shape the left one turned around (Same), or its mirror image (Mirror)? 60 seconds. Wrong answers cost 3 seconds.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
