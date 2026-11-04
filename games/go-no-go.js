// Go / No-Go: 40 trials. A big circle shows for 0.6 s: green (go, 30 of them) — tap anywhere on the
// play area; red with a white bar (no-go, 10 of them) — don't tap. The first 3 are always green,
// then the order is random; 0.7–1.2 s between circles. A tap counts until 0.2 s after the circle hides.
// Score (higher is better): each green you tap earns up to 10 points — 10 for a tap under 0.3 s,
// one point less for every 50 ms slower (at least 1). Tapping a red costs 20 points. A missed
// green earns nothing. The total can't go below 0 (max 300). Speed matters, so going fast and
// still holding back on red is the challenge — a plain hit count would be easy to max out by
// tapping slowly. Timing: performance.now(), clock starts in the frame that paints the circle,
// taps count on pointerdown, only the first finger counts.
(() => {
  const TRIALS = 40, GOS = 30, FIRST_GO = 3, SHOW = 600, GRACE = 200, GAP_MIN = 700, GAP_MAX = 1200;
  const RED_COST = 20, LEAD_IN = 1000;

  const shuffle = (a, rnd) => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // true = go (green), false = no-go (red). Exactly 30 go / 10 no-go, the first 3 are go,
  // and never more than 2 reds in a row (long red runs would let the urge to tap fade).
  const MAX_RED_RUN = 2;
  const longestRedRun = (seq) => { let run = 0, max = 0; for (const go of seq) { run = go ? 0 : run + 1; max = Math.max(max, run); } return max; };
  function makeSequence(rnd = Math.random) {
    for (let tries = 0; ; tries++) {
      const rest = [...Array(GOS - FIRST_GO).fill(true), ...Array(TRIALS - GOS).fill(false)];
      const seq = [...Array(FIRST_GO).fill(true), ...shuffle(rest, rnd)];
      if (longestRedRun(seq) <= MAX_RED_RUN || tries > 500) return seq;
    }
  }
  const gapMs = (rnd = Math.random) => Math.round(GAP_MIN + rnd() * (GAP_MAX - GAP_MIN));
  const hitPoints = (rt) => Math.max(1, Math.min(10, 10 - Math.floor((rt - 250) / 50)));
  const finalScore = (points) => Math.max(0, points);
  const pts = (v) => v + ' pts';

  (window.__games = window.__games || []).push({
    id: 'go-no-go', category: 'Reaction', name: 'Go / No-Go', skill: 'Self-control', desc: 'tap on green, hold back on red', icon: '🚦',
    gen: { makeSequence, gapMs, hitPoints, finalScore }, // pure helpers, exposed for bulk checks
    formatBest: pts,
    start(el, api) {
      el.innerHTML =
        '<div class="hud gng-hud"><span class="gng-trial"></span><span class="gng-points"></span></div>' +
        '<button class="gng-area" type="button"><span class="gng-dot"></span></button>' +
        '<div class="status gng-status"></div>' +
        '<div class="panel gng-panel"><h3></h3><p class="result"></p><p class="gng-detail"></p><p class="new"></p><button class="btn"></button></div>';
      const trialEl = el.querySelector('.gng-trial');
      const pointsEl = el.querySelector('.gng-points');
      const area = el.querySelector('.gng-area');
      const dot = el.querySelector('.gng-dot');
      const statusEl = el.querySelector('.gng-status');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let seq = [], trial = 0, shownAt = 0, open = false, responded = false, playing = false, armed = true;
      let points = 0, hits = 0, misses = 0, reds = 0, rts = [];
      const timers = new Set();
      let frame = 0;
      const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); };
      const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(frame); frame = 0; };

      function status(text, cls) { statusEl.textContent = text; statusEl.className = 'status gng-status' + (cls ? ' ' + cls : ''); }
      function showHud() {
        trialEl.textContent = 'Trial ' + Math.min(TRIALS, trial + 1) + ' / ' + TRIALS;
        pointsEl.textContent = 'Points ' + points;
      }

      function show() {
        const go = seq[trial];
        responded = false;
        shownAt = 0;
        status('');
        dot.className = 'gng-dot ' + (go ? 'gng-go' : 'gng-stop');
        // the response window opens in the frame that paints the circle
        frame = requestAnimationFrame(() => {
          frame = 0;
          shownAt = performance.now();
          open = true;
          later(hide, SHOW);
          later(closeWindow, SHOW + GRACE);
        });
      }

      function hide() { dot.className = 'gng-dot'; }

      function closeWindow() {
        open = false;
        if (seq[trial] && !responded) { misses++; status('Missed! Tap faster on green', 'gng-bad'); }
        trial++;
        if (trial >= TRIALS) { later(end, 500); return; }
        showHud();
        later(show, gapMs() - GRACE);
      }

      function onDown(e) {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return; // first finger only
        if (!playing || !open || responded) return; // between circles, or already answered
        responded = true;
        const rt = Math.max(1, Math.round(performance.now() - shownAt));
        if (seq[trial]) {
          const p = hitPoints(rt);
          hits++; rts.push(rt); points += p;
          dot.classList.add('gng-hit');
          status('+' + p + ' · ' + rt + ' ms', 'gng-good');
        } else {
          reds++; points -= RED_COST;
          area.classList.remove('gng-oops');
          void area.offsetWidth; // restart the flash
          area.classList.add('gng-oops');
          later(() => area.classList.remove('gng-oops'), 450);
          status("Don't tap on red! −" + RED_COST, 'gng-bad');
        }
        showHud();
      }

      function showPanel(title, result, detail, label, over) {
        panel.classList.toggle('gng-over', !!over);
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.gng-detail').textContent = detail;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        if (!armed) return;
        panel.classList.add('hidden');
        stopAll();
        seq = makeSequence();
        trial = 0; points = 0; hits = 0; misses = 0; reds = 0; rts = [];
        open = false; playing = true;
        dot.className = 'gng-dot';
        area.classList.remove('gng-oops');
        showHud();
        status('Get ready…');
        later(show, LEAD_IN);
      }

      function end() {
        stopAll();
        playing = false;
        const score = finalScore(points);
        const avg = rts.length ? Math.round(rts.reduce((s, x) => s + x, 0) / rts.length) + ' ms' : '–';
        status('');
        showPanel('Go / No-Go', 'Score: ' + score + ' points',
          'Avg tap ' + avg + ' · missed ' + misses + ' · red taps ' + reds, 'Play again', true);
        const isBest = api.finish(score, panel);
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        armed = false;
        later(() => { armed = true; }, 600);
      }

      area.addEventListener('pointerdown', onDown);
      btn.addEventListener('click', begin);
      showHud();
      showPanel('Go / No-Go', 'Tap fast when the circle is green. Don’t tap when it’s red.',
        'Faster taps score more (up to 10). A red tap costs 20.', 'Start');

      return stopAll;
    },
  });
})();
