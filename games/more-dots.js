// More Dots: two boxes, each with a cloud of dots. Tap the box with more dots.
// There is no time to count, so you have to estimate. 60 seconds; a wrong tap costs 3 seconds.
// As your streak grows the two counts get closer (from about 2:1 down to about 1.15:1).
// Dot sizes vary so that "more ink" is not a reliable clue: sometimes the side with
// fewer dots uses bigger dots and covers more area.
(() => {
  const DURATION = 60000, PENALTY = 3000, MAX_LEVEL = 6, PER_LEVEL = 4;
  const MIN_N = 8, MAX_N = 40;
  // Box geometry in box-width units: the box is 1 wide and H tall. Dots keep PAD from the edge
  // (clear of the rounded corners) and GAP from each other.
  const H = 1.4, PAD = 0.04, GAP = 0.014, R_MAX = 0.12;
  // Allowed ratio (more / fewer) per level.
  const LEVELS = [[1.9, 2.2], [1.6, 1.8], [1.45, 1.55], [1.3, 1.4], [1.2, 1.27], [1.13, 1.18]];
  // How dot sizes relate across the two boxes (weights add to 1):
  //   sameArea    – both boxes cover the same total area (fewer side has bigger dots)
  //   fewerBigger – the side with fewer dots covers MORE area
  //   sameSize    – dots are the same size on average (more dots = more area)
  //   moreBigger  – the side with more dots also has slightly bigger dots
  const MODES = [['sameArea', 0.25], ['fewerBigger', 0.3], ['sameSize', 0.2], ['moreBigger', 0.25]];

  const rand = (a, b) => a + Math.random() * (b - a);
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickWeighted = (list) => { let x = Math.random(); for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[list.length - 1][0]; };

  // Every (fewer, more) count pair allowed at each level.
  const PAIRS = LEVELS.map(([lo, hi]) => {
    const byFewer = new Map();
    for (let a = MIN_N; a < MAX_N; a++) {
      for (let b = a + 1; b <= MAX_N; b++) {
        if (b / a >= lo && b / a <= hi) { if (!byFewer.has(a)) byFewer.set(a, []); byFewer.get(a).push(b); }
      }
    }
    return [...byFewer.entries()];
  });

  function pickCounts(level) {
    const pairs = PAIRS[level - 1];
    const [a, bs] = pairs[Math.floor(Math.random() * pairs.length)];
    return [a, bs[Math.floor(Math.random() * bs.length)]];
  }

  // Radius scale factors for the fewer (a) and more (b) side, given each side's jittered sizes.
  function sideScales(mode, sumA, sumB) {
    // total area of a side = scale² × Σ jitter²
    if (mode === 'sameSize') return [1, 1];
    if (mode === 'moreBigger') return [1, rand(1.08, 1.2)];
    const areaRatio = mode === 'sameArea' ? 1 : rand(1.15, 1.35); // fewer-side area / more-side area
    return [Math.sqrt((areaRatio * sumB) / sumA), 1];
  }

  // Place circles (largest first) at random spots where they fit; null if the box is too crowded.
  function place(radii) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const dots = [];
      for (const rad of radii) {
        let spot = null;
        for (let t = 0; t < 500 && !spot; t++) {
          const x = rand(rad + PAD, 1 - rad - PAD), y = rand(rad + PAD, H - rad - PAD);
          if (dots.every((d) => (d.x - x) ** 2 + (d.y - y) ** 2 >= (d.r + rad + GAP) ** 2)) spot = { x, y, r: rad };
        }
        if (!spot) break;
        dots.push(spot);
      }
      if (dots.length === radii.length) return dots;
    }
    return null;
  }

  // A round: { H, pad, gap, level, mode, ratio, more (0 = left, 1 = right), sides: [{ n, dots: [{x,y,r}] }, …] }
  function genRound(level) {
    const [a, b] = pickCounts(level);
    const mode = pickWeighted(MODES);
    const jitA = Array.from({ length: a }, () => rand(0.75, 1.25));
    const jitB = Array.from({ length: b }, () => rand(0.75, 1.25));
    const sumA = jitA.reduce((s, j) => s + j * j, 0), sumB = jitB.reduce((s, j) => s + j * j, 0);
    const [sA, sB] = sideScales(mode, sumA, sumB);
    // Scale both sides together so the fuller box covers a random 12–19% of its area.
    const fullest = Math.max(sA * sA * sumA, sB * sB * sumB) * Math.PI;
    let k = Math.sqrt((rand(0.12, 0.19) * H) / fullest);
    k = Math.min(k, R_MAX / (1.25 * Math.max(sA, sB)));
    for (let tries = 0; tries < 30; tries++, k *= 0.93) {
      const rA = jitA.map((j) => j * sA * k).sort((x, y) => y - x);
      const rB = jitB.map((j) => j * sB * k).sort((x, y) => y - x);
      const dotsA = place(rA), dotsB = dotsA && place(rB);
      if (!dotsB) continue; // too crowded: shrink everything a little (keeps the size relation)
      const more = Math.random() < 0.5 ? 0 : 1;
      const fewerSide = { n: a, dots: dotsA }, moreSide = { n: b, dots: dotsB };
      return { H, pad: PAD, gap: GAP, level, mode, ratio: b / a, more, sides: more === 0 ? [moreSide, fewerSide] : [fewerSide, moreSide] };
    }
    return genRound(level); // practically never reached
  }
  genRound.levels = LEVELS;
  genRound.range = [MIN_N, MAX_N];

  const SVG = 'http://www.w3.org/2000/svg';

  (window.__games = window.__games || []).push({
    id: 'more-dots', category: 'Numbers', name: 'More Dots', skill: 'Number sense', desc: 'which side has more dots?', icon: '⚫',
    gen: genRound, // exposed so counts, ratios and dot placement can be checked in bulk
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">60</span><span class="level">Level 1</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="md-ask">Which box has more dots?</div>' +
        '<div class="md-pair"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const timeEl = el.querySelector('.time');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const pairEl = el.querySelector('.md-pair');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, locked = false, score = 0, streak = 0, endAt = 0, round = null, tickId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / PER_LEVEL));

      const boxes = ['Left', 'Right'].map((label, i) => {
        const b = document.createElement('button');
        b.className = 'md-box';
        b.dataset.side = i;
        b.setAttribute('aria-label', label + ' box');
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 100 ' + H * 100);
        const tag = document.createElement('span');
        tag.className = 'md-tag';
        b.append(svg, tag);
        b.addEventListener('click', () => choose(i));
        pairEl.append(b);
        return { b, svg, tag };
      });

      function draw(box, side) {
        box.svg.textContent = '';
        for (const d of side.dots) {
          const c = document.createElementNS(SVG, 'circle');
          c.setAttribute('cx', (d.x * 100).toFixed(2));
          c.setAttribute('cy', (d.y * 100).toFixed(2));
          c.setAttribute('r', (d.r * 100).toFixed(2));
          box.svg.append(c);
        }
        box.b.classList.remove('wrong', 'right');
        box.tag.textContent = '';
      }

      function nextRound() {
        const lv = level();
        round = genRound(lv);
        levelEl.textContent = 'Level ' + lv;
        boxes.forEach((box, i) => draw(box, round.sides[i]));
      }

      function choose(i) {
        if (!running || locked) return;
        if (i === round.more) {
          score++; streak++;
          scoreEl.textContent = score;
          nextRound();
        } else {
          streak = Math.floor(streak / 2);
          endAt -= PENALTY;
          locked = true;
          const wrong = boxes[i], right = boxes[round.more];
          wrong.b.classList.add('wrong');
          right.b.classList.add('right');
          wrong.tag.textContent = '✗ ' + round.sides[i].n;
          right.tag.textContent = '✓ ' + round.sides[round.more].n;
          later(() => { locked = false; if (running) nextRound(); }, 900);
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
        const isBest = api.finish(score, panel); // records the result and draws the chart into the end panel
        showPanel("Time's up", 'Correct answers: ' + score, isBest && score > 0, 'Play again');
      }

      btn.addEventListener('click', begin);
      showPanel('More Dots', "Tap the box with more dots. Don't count – estimate! 60 seconds; wrong taps cost 3 seconds.", false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
