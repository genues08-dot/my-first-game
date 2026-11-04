// Reaction Time (the Human Benchmark test): the box turns red for a random 2–5 s, then green —
// tap the moment it turns green. Tapping while it is still red is "Too soon!" and that try is redone.
// After 5 good tries the score is their average in whole milliseconds (lower is better).
// Timing: performance.now(); the clock starts in the animation frame that paints the green box,
// and taps count on pointerdown (no click delay). Only the first finger counts.
(() => {
  const TRIES = 5, MIN_WAIT = 2000, MAX_WAIT = 5000;
  const waitMs = (rnd = Math.random) => Math.round(MIN_WAIT + rnd() * (MAX_WAIT - MIN_WAIT));
  const average = (times) => Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const ms = (v) => v + ' ms';

  (window.__games = window.__games || []).push({
    id: 'reaction-time', category: 'Reaction', name: 'Reaction Time', skill: 'Reaction', desc: 'tap the moment it turns green', icon: '⚡',
    gen: { waitMs, average }, // pure helpers, exposed for bulk checks
    lowerIsBetter: true,
    formatBest: ms,
    start(el, api) {
      el.innerHTML =
        '<div class="hud rt-hud"><span class="rt-try"></span><span class="rt-avg"></span></div>' +
        '<button class="rt-box" type="button"><span class="rt-big"></span><span class="rt-small"></span></button>' +
        '<div class="rt-tries"></div>' +
        '<div class="panel rt-panel"><h3></h3><p class="result"></p><p class="rt-detail"></p><p class="new"></p><button class="btn"></button></div>';
      const tryEl = el.querySelector('.rt-try');
      const avgEl = el.querySelector('.rt-avg');
      const box = el.querySelector('.rt-box');
      const bigEl = box.querySelector('.rt-big');
      const smallEl = box.querySelector('.rt-small');
      const chipsEl = el.querySelector('.rt-tries');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');
      const chips = Array.from({ length: TRIES }, () => chipsEl.appendChild(document.createElement('span')));

      // state: idle (panel) | wait (red) | go (green) | result | early | done
      let state = 'idle', times = [], early = 0, shownAt = 0, frame = 0, armed = true;
      const timers = new Set();
      const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); };
      const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(frame); frame = 0; };

      function setBox(cls, big, small) {
        box.className = 'rt-box ' + cls;
        bigEl.textContent = big;
        smallEl.textContent = small;
      }

      function showProgress() {
        tryEl.textContent = 'Try ' + Math.min(TRIES, times.length + 1) + ' of ' + TRIES;
        avgEl.textContent = times.length ? 'Average ' + ms(average(times)) : 'Average –';
        chips.forEach((c, i) => {
          c.className = 'rt-chip' + (i === times.length ? ' rt-cur' : '') + (i < times.length ? ' rt-done' : '');
          c.textContent = i < times.length ? times[i] : '–';
        });
      }

      function startTry() {
        state = 'wait';
        setBox('rt-wait', 'Wait for green…', 'Tap when it turns green');
        later(showGreen, waitMs());
      }

      function showGreen() {
        state = 'go';
        shownAt = 0;
        setBox('rt-go', 'TAP!', '');
        // the clock starts in the frame that paints the green box
        frame = requestAnimationFrame(() => { frame = 0; shownAt = performance.now(); });
      }

      function tooSoon() {
        stopAll();
        early++;
        state = 'early';
        setBox('rt-early', 'Too soon!', 'Wait for green. Tap to try again');
      }

      function record(rt) {
        times.push(rt);
        showProgress();
        if (times.length === TRIES) { end(); return; }
        state = 'result';
        setBox('rt-result', ms(rt), 'Tap to continue');
      }

      function onDown(e) {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return; // first finger only
        const now = performance.now();
        if (state === 'wait' || (state === 'go' && !shownAt)) tooSoon(); // green not on screen yet
        else if (state === 'go') record(Math.max(1, Math.round(now - shownAt)));
        else if (state === 'result' || state === 'early') startTry();
      }

      function showPanel(title, result, detail, label, over) {
        panel.classList.toggle('rt-over', !!over);
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.rt-detail').textContent = detail;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        if (!armed) return;
        panel.classList.add('hidden');
        stopAll();
        times = []; early = 0;
        showProgress();
        startTry();
      }

      function end() {
        stopAll();
        state = 'done';
        const score = average(times);
        setBox('rt-idle', '', '');
        showPanel('Reaction time', 'Average: ' + ms(score),
          times.join(' · ') + ' ms' + (early ? ' · ' + early + ' too soon' : ''), 'Play again', true);
        const isBest = api.finish(score, panel);
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        // the finger that made the last tap is still down: don't let its click hit "Play again"
        armed = false;
        later(() => { armed = true; }, 600);
      }

      box.addEventListener('pointerdown', onDown);
      btn.addEventListener('click', begin);
      showProgress();
      setBox('rt-idle', '', '');
      showPanel('Reaction Time', 'When the red box turns green, tap it as fast as you can.',
        '5 tries · your score is the average', 'Start');

      return stopAll;
    },
  });
})();
