// Choice Reaction: four boxes. After a random 1–2.5 s wait one of them lights up — tap that box
// as fast as you can. 20 trials. Tapping another box, or tapping before any box lights, is an
// error (shown in red, no time recorded). Score = mean reaction time of the correct trials, in whole
// ms (lower is better). A run with fewer than 10 correct gets no score: it is not recorded and
// cannot be a best — a "Too many errors" panel says why (api.finish is only called for valid runs).
// Timing: performance.now(); the clock starts in the animation frame that paints the lit box;
// taps count on pointerdown; only the first finger counts.
(() => {
  const TRIALS = 20, MIN_CORRECT = 10, BOXES = 4, MIN_WAIT = 1000, MAX_WAIT = 2500, FEEDBACK = 700;
  const waitMs = (rnd = Math.random) => Math.round(MIN_WAIT + rnd() * (MAX_WAIT - MIN_WAIT));
  const pickBox = (rnd = Math.random) => Math.floor(rnd() * BOXES);
  const mean = (a) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  // Final result: score (mean ms of correct trials) or null when there are too few correct trials.
  const result = (times, trials = TRIALS) => ({
    correct: times.length,
    accuracy: Math.round((times.length / trials) * 100),
    score: times.length >= MIN_CORRECT ? mean(times) : null,
  });
  const ms = (v) => v + ' ms';

  (window.__games = window.__games || []).push({
    id: 'choice-reaction', category: 'Reaction', name: 'Choice Reaction', skill: 'Reaction', desc: 'tap the box that lights up', icon: '🔀',
    gen: { waitMs, pickBox, result }, // pure helpers, exposed for bulk checks
    lowerIsBetter: true,
    formatBest: ms,
    start(el, api) {
      el.innerHTML =
        '<div class="hud cr-hud"><span class="cr-trial"></span><span class="cr-avg"></span><span class="cr-err"></span></div>' +
        '<div class="cr-grid"></div>' +
        '<div class="status cr-status"></div>' +
        '<div class="panel cr-panel"><h3></h3><p class="result"></p><p class="cr-detail"></p><p class="new"></p><button class="btn"></button></div>';
      const trialEl = el.querySelector('.cr-trial');
      const avgEl = el.querySelector('.cr-avg');
      const errEl = el.querySelector('.cr-err');
      const grid = el.querySelector('.cr-grid');
      const statusEl = el.querySelector('.cr-status');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');
      const boxes = Array.from({ length: BOXES }, (_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cr-box';
        b.addEventListener('pointerdown', (e) => onDown(e, i));
        grid.append(b);
        return b;
      });

      // state: idle (panel) | wait (nothing lit yet) | lit | feedback (locked) | done
      let state = 'idle', trial = 0, lit = -1, litAt = 0, frame = 0, armed = true;
      let times = [], errors = 0;
      const timers = new Set();
      const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); };
      const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(frame); frame = 0; };

      function status(text, cls) { statusEl.textContent = text; statusEl.className = 'status cr-status' + (cls ? ' ' + cls : ''); }
      function showBox(i, cls, label) { boxes[i].className = 'cr-box' + (cls ? ' ' + cls : ''); boxes[i].textContent = label || ''; }
      function clearBoxes() { boxes.forEach((_, i) => showBox(i)); }
      function showHud() {
        trialEl.textContent = 'Trial ' + Math.min(TRIALS, trial + 1) + ' / ' + TRIALS;
        avgEl.textContent = times.length ? 'Avg ' + ms(mean(times)) : 'Avg –';
        errEl.textContent = 'Errors ' + errors;
      }

      function nextTrial() {
        if (trial >= TRIALS) { end(); return; }
        state = 'wait';
        lit = -1;
        clearBoxes();
        showHud();
        status('Get ready…');
        later(lightUp, waitMs());
      }

      function lightUp() {
        state = 'lit';
        lit = pickBox();
        litAt = 0;
        showBox(lit, 'cr-lit', 'TAP');
        status('');
        // the clock starts in the frame that paints the lit box
        frame = requestAnimationFrame(() => { frame = 0; litAt = performance.now(); });
      }

      function onDown(e, i) {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return; // first finger only
        const now = performance.now();
        if (state === 'wait' || (state === 'lit' && !litAt)) { stopAll(); clearBoxes(); error(i, 'Too soon! Wait for a box to light up'); }
        else if (state === 'lit' && i !== lit) error(i, 'Wrong box!');
        else if (state === 'lit') hit(Math.max(1, Math.round(now - litAt)));
      }

      function hit(rt) {
        times.push(rt);
        showBox(lit, 'cr-right', String(rt));
        status(ms(rt), 'cr-good');
        settle();
      }

      function error(i, message) {
        errors++;
        showBox(i, 'cr-wrong', '✗');
        status(message, 'cr-bad');
        settle();
      }

      // brief lock showing the feedback, then the next trial
      function settle() {
        state = 'feedback';
        trial++;
        showHud();
        later(nextTrial, FEEDBACK);
      }

      function showPanel(title, result, detail, label, over) {
        panel.classList.toggle('cr-over', !!over);
        panel.querySelector('.rc')?.remove();
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.cr-detail').textContent = detail;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        if (!armed) return;
        panel.classList.add('hidden');
        stopAll();
        trial = 0; times = []; errors = 0;
        nextTrial();
      }

      function end() {
        stopAll();
        state = 'done';
        clearBoxes();
        status('');
        const r = result(times);
        const correct = 'Correct ' + r.correct + ' of ' + TRIALS + ' (' + r.accuracy + '%)';
        if (r.score === null) {
          // too few correct trials: no score, nothing recorded, no chart
          showPanel('Too many errors', correct,
            'You need at least ' + MIN_CORRECT + ' correct for a score. Wait for a box to light up, then tap that box.', 'Try again', true);
        } else {
          showPanel('Choice reaction', 'Average: ' + ms(r.score), correct, 'Play again', true);
          const isBest = api.finish(r.score, panel);
          panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        }
        // the finger that made the last tap may still be down: don't let its click hit the button
        armed = false;
        later(() => { armed = true; }, 600);
      }

      btn.addEventListener('click', begin);
      showHud();
      showPanel('Choice Reaction', 'One of the four boxes will light up. Tap that box as fast as you can.',
        '20 trials · wrong box or too soon = error', 'Start');

      return stopAll;
    },
  });
})();
