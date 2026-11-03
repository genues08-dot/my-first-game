// Odd One Out: every shape follows one rule except a single one. Find it. 60 seconds.
// Early levels are plain. Later levels add noise (other things that vary) so you have to
// work out which property is the rule before you can spot the one that breaks it.
(() => {
  const DURATION = 60000, PENALTY = 3000, MAX_LEVEL = 6;
  const GLYPHS = ['■', '▲', '●', '◆', '★', '♥'];
  const HUES = [0, 45, 90, 150, 200, 260, 310];
  const ROTS = [0, 90, 180, 270];

  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = r(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  const twoOf = (pool) => { const v = pick(pool); let o = pick(pool); while (o === v) o = pick(pool); return [v, o]; };

  // Returns { side, cells, odd, rule }. Every cell has the same value for `rule` except cells[odd].
  function genRound(lv) {
    const side = lv <= 2 ? 3 : lv <= 4 ? 4 : 5;
    const rules = lv === 1 ? ['hue', 'glyph']
      : lv === 2 ? ['hue', 'glyph', 'scale']
      : lv === 3 ? ['hue', 'glyph', 'scale', 'count']
      : ['hue', 'glyph', 'scale', 'count', 'rot'];
    const rule = pick(rules);

    const base = { glyph: rule === 'rot' ? '▲' : '■', hue: 200, scale: 1, rot: 0, count: 1 };
    const noisePool = { glyph: GLYPHS, hue: HUES, scale: [0.85, 1, 1.15], rot: ROTS };
    // Only things that can't hide or mimic the rule may vary at random.
    const noiseAllowed = {
      glyph: ['hue', 'scale', 'rot'], hue: ['glyph', 'scale', 'rot'], scale: ['hue', 'glyph'],
      count: ['hue', 'glyph', 'scale'], rot: ['hue', 'scale'],
    }[rule];
    const noiseCount = lv <= 2 ? 0 : lv === 3 ? 1 : lv === 4 ? 2 : 3;
    const noise = shuffle(noiseAllowed.slice()).slice(0, noiseCount);

    let v, o;
    if (rule === 'glyph') [v, o] = twoOf(GLYPHS);
    else if (rule === 'hue') {
      const minD = lv <= 2 ? 100 : lv <= 4 ? 60 : 45;
      do { [v, o] = twoOf(HUES); } while (hueDist(v, o) < minD);
    } else if (rule === 'scale') {
      const small = lv <= 3 ? 0.6 : lv <= 5 ? 0.75 : 0.85;
      [v, o] = Math.random() < 0.5 ? [1, small] : [small, 1];
    } else if (rule === 'count') {
      v = r(2, 4); o = v + (Math.random() < 0.5 ? -1 : 1);
    } else { [v, o] = twoOf(ROTS); }

    const odd = r(0, side * side - 1);
    const cells = [];
    for (let i = 0; i < side * side; i++) {
      const c = { ...base };
      for (const n of noise) c[n] = pick(noisePool[n]);
      c[rule] = i === odd ? o : v;
      cells.push(c);
    }
    return { side, cells, odd, rule };
  }

  (window.__games = window.__games || []).push({
    id: 'odd-one-out', category: 'Logic', name: 'Odd One Out', skill: 'Logic', desc: 'spot the shape that breaks the rule', icon: '🔍',
    gen: genRound, // exposed so the rounds can be checked in bulk
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">60</span><span class="level">Level 1</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="ngrid"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const timeEl = el.querySelector('.time');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const gridEl = el.querySelector('.ngrid');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, locked = false, score = 0, streak = 0, endAt = 0, round = null, tickId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / 3));

      function nextRound() {
        const lv = level();
        round = genRound(lv);
        levelEl.textContent = 'Level ' + lv;
        gridEl.style.setProperty('--n', round.side);
        gridEl.innerHTML = '';
        round.cells.forEach((c, i) => {
          const b = document.createElement('button');
          b.className = 'oo-cell';
          const shape = document.createElement('span'); // only the shape is rotated/scaled, not the tile
          shape.className = 'oo-shape';
          shape.textContent = c.glyph.repeat(c.count);
          shape.style.color = 'hsl(' + c.hue + ' 85% 62%)';
          shape.style.transform = 'rotate(' + c.rot + 'deg) scale(' + c.scale + ')';
          if (c.count > 1) shape.style.fontSize = c.count > 3 ? '0.55em' : '0.7em';
          b.append(shape);
          b.setAttribute('aria-label', 'Shape ' + (i + 1));
          b.addEventListener('click', () => tap(b, i));
          gridEl.append(b);
        });
      }

      function tap(b, i) {
        if (!running || locked) return;
        if (i === round.odd) {
          score++; streak++;
          scoreEl.textContent = score;
          nextRound();
        } else {
          streak = Math.floor(streak / 2);
          endAt -= PENALTY;
          locked = true;
          b.classList.add('wrong');
          gridEl.children[round.odd].classList.add('right');
          later(() => { locked = false; if (running) nextRound(); }, 700);
          tick();
        }
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
        btn.textContent = label;
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
        const isBest = api.submit(score);
        showPanel("Time's up", 'Odd ones found: ' + score, isBest && score > 0, 'Play again');
      }

      btn.addEventListener('click', begin);
      showPanel('Odd One Out', 'All the shapes follow one rule except one. Tap it. Wrong taps cost 3 seconds.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
