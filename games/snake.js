// Snake: steer the snake around a 20×20 board by swiping (or with the arrow keys).
// It moves one square every 120 ms. Eating the red dot scores a point and makes it one square
// longer. Running into a wall or into itself ends the game. Best = highest score.
(() => {
  const N = 20; // squares per side
  const TICK_MS = 120; // one step every 120 ms, as in the old stand-alone page
  const SWIPE_MIN = 20; // px a finger must travel to count as a swipe
  const SHOW_END_MS = 700; // let the crash be seen before the end panel appears
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  const startSnake = () => [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; // head first, heading right
  const same = (a, b) => a.x === b.x && a.y === b.y;

  // A random free square for the food, or null if the snake fills the board.
  function placeFood(snake, rand = Math.random) {
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    return free.length ? free[Math.floor(rand() * free.length)] : null;
  }

  // One step. Pure: returns { snake, ate, dead }. Hitting any part of the body (even the tail) is a crash.
  function step(snake, dir, food) {
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some((s) => same(s, head))) {
      return { snake, ate: false, dead: true };
    }
    const ate = !!food && same(head, food);
    const next = [head, ...snake];
    if (!ate) next.pop();
    return { snake: next, ate, dead: false };
  }

  (window.__games = window.__games || []).push({
    id: 'snake', category: 'Just for fun', name: 'Snake', skill: 'Reflexes', desc: 'swipe to eat and grow', icon: '🐍',
    gen: { N, TICK_MS, startSnake, placeFood, step }, // pure logic, for bulk tests
    start(el, api) {
      el.innerHTML =
        '<div class="hud snake-hud"><span>Score <b class="snake-score">0</b></span><span>Length <b class="snake-len">3</b></span></div>' +
        '<div class="snake-board"><canvas class="snake-canvas" role="img" aria-label="Snake board"></canvas></div>' +
        '<p class="snake-hint">Swipe or use the arrow keys to steer</p>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const scoreEl = el.querySelector('.snake-score');
      const lenEl = el.querySelector('.snake-len');
      const canvas = el.querySelector('.snake-canvas');
      const ctx = canvas.getContext('2d');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      const css = getComputedStyle(document.documentElement);
      const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
      const C = {
        bg: color('--panel', '#1f1f30'), bg2: '#252539', food: color('--bad', '#ff5d6c'),
        body: color('--good', '#3ddc97'), head: '#9ff5cf', eye: '#14141f', crash: color('--bad', '#ff5d6c'),
      };

      let snake = startSnake(), dir = DIRS.right, queue = [], food = null, score = 0;
      let running = false, crashed = false, tickId = null, endTimer = null, touch = null;

      // ---- drawing ----
      function fit() { // keep the canvas sharp at whatever size CSS gives it
        const px = Math.round((canvas.clientWidth || 360) * (window.devicePixelRatio || 1));
        if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
        return px / N;
      }
      function rounded(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
      }
      function draw() {
        const s = fit();
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = C.bg2; // faint checkerboard, so you can judge where you are
        for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * s, y * s, s, s);
        if (food) {
          ctx.fillStyle = C.food;
          ctx.beginPath();
          ctx.arc((food.x + 0.5) * s, (food.y + 0.5) * s, s * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
        const pad = Math.max(1, s * 0.06);
        snake.forEach((p, i) => {
          ctx.fillStyle = i === 0 ? (crashed ? C.crash : C.head) : C.body;
          rounded(p.x * s + pad, p.y * s + pad, s - 2 * pad, s - 2 * pad, s * 0.25);
        });
        // eyes on the head, looking the way it moves
        const h = snake[0], cx = (h.x + 0.5) * s, cy = (h.y + 0.5) * s, f = s * 0.2, side = s * 0.2;
        ctx.fillStyle = C.eye;
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + dir.x * f + dir.y * side * k, cy + dir.y * f + dir.x * side * k, s * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
        scoreEl.textContent = score;
        lenEl.textContent = snake.length;
      }

      // ---- playing ----
      function tick() {
        if (queue.length) dir = queue.shift();
        const res = step(snake, dir, food);
        if (res.dead) { gameOver(); return; }
        snake = res.snake;
        if (res.ate) {
          score++;
          food = placeFood(snake);
          if (!food) { draw(); gameOver(); return; } // the whole board is snake: nothing left to eat
        }
        draw();
      }

      // Up to two turns are remembered, so a quick swipe-swipe isn't lost between steps.
      // Turning straight back into yourself is ignored.
      function turn(d) {
        if (!running) return;
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (same(d, last) || (d.x === -last.x && d.y === -last.y)) return;
        if (queue.length < 2) queue.push(d);
      }

      function fillPanel(title, result, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
      }

      function begin() {
        panel.classList.add('hidden');
        clearTimeout(endTimer);
        snake = startSnake(); dir = DIRS.right; queue = []; score = 0; crashed = false;
        food = placeFood(snake);
        running = true;
        draw();
        clearInterval(tickId);
        tickId = setInterval(tick, TICK_MS);
      }

      function gameOver() {
        running = false;
        crashed = true;
        clearInterval(tickId);
        draw();
        // Fill the end panel now; it appears a moment later so the crash can be seen.
        fillPanel('Game over', 'Score ' + score + ' · length ' + snake.length, 'Play again');
        const isBest = api.finish(score, panel); // records the game and draws the chart into the end panel
        panel.querySelector('.new').textContent = isBest && score > 0 ? 'New best!' : '';
        endTimer = setTimeout(() => panel.classList.remove('hidden'), SHOW_END_MS);
      }

      // ---- input: swipes anywhere on the game screen, arrow keys anywhere ----
      const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const onKey = (e) => {
        const d = KEYS[e.key];
        if (!d || !running) return;
        e.preventDefault(); // no page scrolling with the arrow keys
        turn(DIRS[d]);
      };
      // A swipe turns as soon as the finger has moved far enough (no need to lift it),
      // and keeps working for a second turn in the same gesture.
      function swipe(t) {
        if (!touch) return;
        const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
        touch = { x: t.clientX, y: t.clientY };
      }
      const onTouchStart = (e) => {
        touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      };
      const onTouchMove = (e) => {
        if (!running) return; // the end panel may need to scroll
        e.preventDefault(); // keep the page still while steering
        if (e.touches.length > 1) { touch = null; return; }
        swipe(e.touches[0]);
      };
      const onTouchEnd = (e) => { if (running) swipe(e.changedTouches[0]); touch = null; };
      const onTouchCancel = () => { touch = null; };

      document.addEventListener('keydown', onKey);
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchCancel, { passive: true });
      btn.addEventListener('click', begin);

      draw(); // the snake waits behind the start panel
      fillPanel('Snake', 'Swipe to steer. Eat the red dots to grow. Don’t hit the walls or your own tail.', 'Start');
      panel.classList.remove('hidden');

      return () => {
        clearInterval(tickId);
        clearTimeout(endTimer);
        document.removeEventListener('keydown', onKey);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchCancel);
      };
    },
  });
})();
