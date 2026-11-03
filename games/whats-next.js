// What's Next?: work out the pattern and pick the next number. Three lives.
(() => {
  const LIVES = 3;
  const MAX_LEVEL = 6;

  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = r(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const six = (f) => Array.from({ length: 6 }, (_, i) => f(i));
  const diffs = (t) => t.slice(1).map((v, i) => v - t[i]);
  const allSame = (a) => a.every((v) => v === a[0]);

  // Each generator returns 6 numbers: 5 are shown, the 6th is the answer.
  const arith = (s1, s2, d1, d2) => { const s = r(s1, s2), d = r(d1, d2); return six((i) => s + i * d); };
  const geo = (s1, s2, k) => { const s = r(s1, s2); return six((i) => s * k ** i); };
  const squares = () => { const k = r(1, 6); return six((i) => (k + i) ** 2); };
  const cubes = () => { const k = r(1, 3); return six((i) => (k + i) ** 3); };
  const tri = (s1, s2, c1, c2) => { // growing steps: +c, +c+1, +c+2 ...
    let t = r(s1, s2), inc = r(c1, c2); const out = [t];
    for (let i = 0; i < 5; i++) { t += inc; inc++; out.push(t); }
    return out;
  };
  const altadd = (lo, hi) => { // +a, +b, +a, +b ...
    const a = r(lo, hi); let b = r(lo, hi); while (b === a) b = r(lo, hi);
    let t = r(1, 10); const out = [t];
    for (let i = 0; i < 5; i++) { t += i % 2 === 0 ? a : b; out.push(t); }
    return out;
  };
  const fib = (lo, hi) => { const out = [r(lo, hi), r(lo, hi)]; while (out.length < 6) out.push(out[out.length - 1] + out[out.length - 2]); return out; };
  const dbl = (s1, s2, cs) => { // double and add c
    const c = pick(cs); let t = r(s1, s2); const out = [t];
    for (let i = 0; i < 5; i++) { t = 2 * t + c; out.push(t); }
    return out;
  };
  // Two interleaved counting patterns. Rejected if the shown numbers also fit a simpler
  // pattern (steady steps, growing steps, steps that grow by a steady amount, Fibonacci),
  // because then there would be two defensible answers.
  const looksSimple = (t) => {
    const d1 = diffs(t.slice(0, 5)), d2 = diffs(d1), d3 = diffs(d2);
    return allSame(d1) || allSame(d2) || allSame(d3) || [2, 3, 4].every((i) => t[i] === t[i - 1] + t[i - 2]);
  };
  const inter = (lo, hi, d1, d2) => {
    for (let tries = 0; tries < 200; tries++) {
      const s1 = r(lo, hi), s2 = r(lo, hi), a = r(d1, d2); let b = r(d1, d2); while (b === a) b = r(d1, d2);
      const t = six((i) => (i % 2 ? s2 + ((i - 1) / 2) * b : s1 + (i / 2) * a));
      if (!looksSimple(t)) return t;
    }
    return [1, 2, 6, 7, 11, 12]; // safety net, practically never reached
  };

  const LEVELS = [
    [() => arith(1, 10, 1, 4)],
    [() => arith(3, 30, 3, 9), () => arith(50, 90, -9, -3)],
    [() => geo(1, 4, 2), () => geo(1, 3, 3), squares],
    [() => altadd(1, 9), () => tri(1, 10, 1, 4), () => fib(1, 4)],
    [() => dbl(3, 6, [1, -1, 2]), cubes, () => inter(1, 20, 2, 6)],
    [() => fib(2, 9), () => dbl(2, 5, [3, -1, 1]), () => inter(2, 30, 3, 9), () => tri(5, 30, 2, 6), () => geo(1, 3, 3), () => geo(5, 9, 2)],
  ];
  const makeSeq = (level) => pick(LEVELS[level - 1])();

  function choicesFor(t) {
    const ans = t[5];
    const set = new Set([ans]);
    const naive = t[4] + (t[4] - t[3]); // the tempting "same step again" mistake
    if (naive > 0) set.add(naive);
    const span = Math.max(2, Math.round(ans * 0.1));
    for (let guard = 0; set.size < 4 && guard < 300; guard++) {
      const c = ans + (Math.random() < 0.5 ? -1 : 1) * r(1, span);
      if (c > 0) set.add(c);
    }
    return shuffle([...set]);
  }

  (window.__games = window.__games || []).push({
    id: 'whats-next', category: 'Numbers', name: "What's Next?", skill: 'Pattern spotting', desc: 'find the next number', icon: '🔢',
    gen: makeSeq, // exposed so the puzzles can be checked in bulk
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="lives"></span><span class="level">Level 1</span><span class="score">0</span></div>' +
        '<div class="seq"></div>' +
        '<div class="answers"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const livesEl = el.querySelector('.lives');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const seqEl = el.querySelector('.seq');
      const answersEl = el.querySelector('.answers');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, locked = false, score = 0, streak = 0, lives = LIVES, current = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / 3));
      const showLives = () => { livesEl.textContent = '♥'.repeat(lives) + '♡'.repeat(LIVES - lives); };

      function nextQuestion() {
        const lv = level();
        const t = makeSeq(lv);
        current = { answer: t[5] };
        levelEl.textContent = 'Level ' + lv;
        seqEl.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const s = document.createElement('span');
          s.className = 'num';
          s.textContent = t[i];
          seqEl.append(s);
        }
        const q = document.createElement('span');
        q.className = 'num q';
        q.textContent = '?';
        seqEl.append(q);
        answersEl.innerHTML = '';
        for (const c of choicesFor(t)) {
          const b = document.createElement('button');
          b.className = 'ans';
          b.textContent = c;
          b.dataset.v = c;
          b.addEventListener('click', () => choose(b, c));
          answersEl.append(b);
        }
      }

      function choose(b, value) {
        if (!running || locked) return;
        if (value === current.answer) {
          score++; streak++;
          scoreEl.textContent = score;
          nextQuestion();
        } else {
          lives--; streak = Math.floor(streak / 2);
          showLives();
          locked = true;
          b.classList.add('wrong');
          answersEl.querySelector('[data-v="' + current.answer + '"]').classList.add('right');
          later(() => { locked = false; if (lives <= 0) finish(); else nextQuestion(); }, 900);
        }
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
        score = 0; streak = 0; lives = LIVES; locked = false; running = true;
        scoreEl.textContent = '0';
        showLives();
        nextQuestion();
      }

      function finish() {
        running = false;
        const isBest = api.submit(score);
        showPanel('Game over', 'Patterns solved: ' + score, isBest && score > 0, 'Play again');
      }

      btn.addEventListener('click', begin);
      showLives();
      showPanel("What's Next?", 'Find the number that continues the pattern. You have 3 lives.', false, 'Start');

      return () => timers.forEach(clearTimeout);
    },
  });
})();
