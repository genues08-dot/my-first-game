// Quick Math: 60 seconds, four answer choices. Questions get harder as your streak grows.
(window.__games = window.__games || []).push({
  id: 'quick-math', name: 'Quick Math', skill: 'Mental math', desc: '60 seconds, answer fast', icon: '➕',
  start(el, api) {
    const DURATION = 60000;
    const MAX_LEVEL = 6;

    el.innerHTML =
      '<div class="hud"><span class="time">60</span><span class="level">Level 1</span><span class="score">0</span></div>' +
      '<div class="qbar"><div class="qbar-fill"></div></div>' +
      '<div class="question">&nbsp;</div>' +
      '<div class="answers"></div>' +
      '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
    const timeEl = el.querySelector('.time');
    const levelEl = el.querySelector('.level');
    const scoreEl = el.querySelector('.score');
    const fillEl = el.querySelector('.qbar-fill');
    const questionEl = el.querySelector('.question');
    const answersEl = el.querySelector('.answers');
    const panel = el.querySelector('.panel');
    const btn = panel.querySelector('.btn');

    const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const add = (a1, a2, b1, b2) => { const a = r(a1, a2), b = r(b1, b2); return { text: a + ' + ' + b, answer: a + b }; };
    const sub = (a1, a2, b1, b2) => { const a = r(a1, a2), b = r(b1, Math.min(b2, a)); return { text: a + ' − ' + b, answer: a - b }; };
    const mul = (a1, a2, b1, b2) => { const a = r(a1, a2), b = r(b1, b2); return { text: a + ' × ' + b, answer: a * b }; };
    const mulAdd = () => {
      const a = r(3, 9), b = r(3, 9), c = r(5, 40);
      return Math.random() < 0.5
        ? { text: a + ' × ' + b + ' + ' + c, answer: a * b + c }
        : { text: a + ' × ' + b + ' − ' + Math.min(c, a * b), answer: a * b - Math.min(c, a * b) };
    };
    const LEVELS = [
      [() => add(1, 9, 1, 9)],
      [() => add(10, 40, 2, 19), () => sub(10, 40, 2, 9)],
      [() => mul(2, 5, 2, 9), () => sub(20, 99, 5, 30)],
      [() => mul(2, 9, 2, 9), () => add(30, 99, 20, 99)],
      [() => mul(6, 12, 3, 12), () => sub(100, 300, 20, 99), () => add(100, 500, 50, 300)],
      [mulAdd, () => mul(11, 15, 6, 9), () => sub(200, 900, 50, 400)],
    ];

    function choicesFor(answer) {
      const set = new Set([answer]);
      const span = answer > 20 ? 10 : 3;
      while (set.size < 4) {
        const c = answer + (Math.random() < 0.5 ? -1 : 1) * r(1, span);
        if (c >= 0) set.add(c);
      }
      return [...set].sort(() => Math.random() - 0.5);
    }

    let running = false, locked = false, score = 0, streak = 0, endAt = 0, current = null, tickId = null;
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
    const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / 5));

    function nextQuestion() {
      const lv = level();
      const pool = LEVELS[lv - 1];
      current = pool[Math.floor(Math.random() * pool.length)]();
      questionEl.textContent = current.text;
      levelEl.textContent = 'Level ' + lv;
      answersEl.innerHTML = '';
      for (const c of choicesFor(current.answer)) {
        const b = document.createElement('button');
        b.className = 'ans';
        b.textContent = c;
        b.dataset.v = c;
        b.addEventListener('click', () => pick(b, c));
        answersEl.append(b);
      }
    }

    function pick(b, value) {
      if (!running || locked) return;
      if (value === current.answer) {
        score++; streak++;
        scoreEl.textContent = score;
        nextQuestion();
      } else {
        streak = Math.floor(streak / 2);
        locked = true;
        b.classList.add('wrong');
        answersEl.querySelector('[data-v="' + current.answer + '"]').classList.add('right');
        later(() => { locked = false; if (running) nextQuestion(); }, 600);
      }
    }

    function tick() {
      const left = endAt - Date.now();
      if (left <= 0) { finish(); return; }
      timeEl.textContent = Math.ceil(left / 1000);
      fillEl.style.width = (left / DURATION) * 100 + '%';
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
      nextQuestion();
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
      showPanel("Time's up", 'Correct answers: ' + score, isBest && score > 0, 'Play again');
    }

    btn.addEventListener('click', begin);
    showPanel('Quick Math', 'Answer as many as you can in 60 seconds. Wrong answers cost you time.', false, 'Start');

    return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
  },
});
