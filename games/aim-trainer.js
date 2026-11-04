// Aim Trainer (the Human Benchmark test): hit 30 targets as fast as you can. A round target sits in
// the play area; tap it and the next one appears straight away somewhere else (never right next to
// the last one, always fully inside the area). The first target only starts the run and isn't timed.
// Taps that miss the target are counted but don't stop anything.
// Score = average time per target over the 30 targets, whole ms (lower is better).
// Timing: performance.now(); each target's clock starts in the frame that paints it; taps count on
// pointerdown (no click delay); only the first finger counts.
(() => {
  const TARGETS = 30, SIZE = 64, EDGE = 6, SLOP = 6, MIN_JUMP = 110;
  const R = SIZE / 2;

  // A random target centre fully inside a w×h area (EDGE px clear of the border), at least
  // MIN_JUMP px (or 30% of the shorter side, if smaller) from the previous centre.
  function pickSpot(w, h, prev, rnd = Math.random) {
    const lo = R + EDGE, spanX = Math.max(0, w - 2 * lo), spanY = Math.max(0, h - 2 * lo);
    const minJump = Math.min(MIN_JUMP, 0.3 * Math.min(w, h));
    let best = null, bestD = -1;
    for (let i = 0; i < 60; i++) {
      const p = { x: lo + rnd() * spanX, y: lo + rnd() * spanY };
      const d = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : Infinity;
      if (d >= minJump) return p;
      if (d > bestD) { best = p; bestD = d; }
    }
    return best;
  }
  const average = (times) => Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const ms = (v) => v + ' ms';

  (window.__games = window.__games || []).push({
    id: 'aim-trainer', category: 'Reaction', name: 'Aim Trainer', skill: 'Reaction', desc: 'hit 30 targets as fast as you can', icon: '🔴',
    gen: { pickSpot, average, SIZE, EDGE, MIN_JUMP }, // pure helpers, exposed for bulk checks
    lowerIsBetter: true,
    formatBest: ms,
    start(el, api) {
      el.innerHTML =
        '<div class="hud aim-hud"><span class="aim-left"></span><span class="aim-missed"></span></div>' +
        '<div class="aim-area"><p class="aim-hint"></p><button class="aim-target" type="button" aria-label="Target"></button></div>' +
        '<div class="panel aim-panel"><h3></h3><p class="result"></p><p class="aim-detail"></p><p class="new"></p><button class="btn"></button></div>';
      const leftEl = el.querySelector('.aim-left');
      const missedEl = el.querySelector('.aim-missed');
      const area = el.querySelector('.aim-area');
      const hint = el.querySelector('.aim-hint');
      const target = el.querySelector('.aim-target');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      // state: idle (panel) | ready (start target shown) | run | done
      let state = 'idle', spot = null, shownAt = 0, times = [], misses = 0, frame = 0, armed = true;
      const timers = new Set();
      const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); };
      const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(frame); frame = 0; };

      function showHud() {
        leftEl.textContent = 'Remaining ' + (TARGETS - times.length);
        missedEl.textContent = 'Missed ' + misses;
      }

      function place(p) {
        spot = p;
        target.style.left = (p.x - R) + 'px';
        target.style.top = (p.y - R) + 'px';
        target.hidden = false;
      }

      function nextTarget() {
        place(pickSpot(area.clientWidth, area.clientHeight, spot));
        shownAt = 0;
        // this target's clock starts in the frame that paints it
        frame = requestAnimationFrame(() => { frame = 0; shownAt = performance.now(); });
      }

      function missMark(x, y) {
        const m = document.createElement('span');
        m.className = 'aim-miss';
        m.style.left = x + 'px';
        m.style.top = y + 'px';
        area.append(m);
        later(() => m.remove(), 400);
      }

      function onDown(e) {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return; // first finger only
        if (state !== 'ready' && state !== 'run') return;
        const now = performance.now();
        const r = area.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const onTarget = spot && Math.hypot(x - spot.x, y - spot.y) <= R + SLOP;
        if (state === 'ready') {
          if (!onTarget) return; // stray taps before the start don't count
          state = 'run';
          hint.textContent = '';
          nextTarget();
        } else if (!shownAt) {
          // this target isn't on screen yet: the tap was aimed at the old one, ignore it
        } else if (onTarget) {
          times.push(now - shownAt);
          showHud();
          if (times.length === TARGETS) end(); else nextTarget();
        } else {
          misses++;
          showHud();
          missMark(x, y);
        }
      }

      function showPanel(title, result, detail, label, over) {
        panel.classList.toggle('aim-over', !!over);
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.aim-detail').textContent = detail;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        if (!armed) return;
        panel.classList.add('hidden');
        stopAll();
        area.querySelectorAll('.aim-miss').forEach((m) => m.remove());
        times = []; misses = 0; spot = null;
        state = 'ready';
        showHud();
        hint.textContent = 'Tap the target to start';
        place({ x: area.clientWidth / 2, y: area.clientHeight / 2 });
      }

      function end() {
        stopAll();
        state = 'done';
        target.hidden = true;
        const score = average(times);
        const total = times.reduce((s, t) => s + t, 0);
        showPanel('Aim Trainer', 'Average: ' + ms(score) + ' per target',
          TARGETS + ' targets in ' + (total / 1000).toFixed(1) + ' s · missed taps ' + misses, 'Play again', true);
        const isBest = api.finish(score, panel);
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        // the finger that hit the last target is still down: don't let its click hit "Play again"
        armed = false;
        later(() => { armed = true; }, 600);
      }

      area.addEventListener('pointerdown', onDown);
      btn.addEventListener('click', begin);
      target.hidden = true;
      showHud();
      showPanel('Aim Trainer', 'Hit 30 targets as fast as you can.',
        'Each new target appears as soon as you hit the last one. The first tap starts the clock.', 'Start');

      return stopAll;
    },
  });
})();
