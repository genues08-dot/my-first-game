// Stop the Clock: tap Start and a timer counts up from 0.00. After 1.5 s the digits hide ("?.??")
// and you tap Stop when you think exactly 5.00 s have passed. 5 rounds.
// Score = average distance from 5.00 s in whole milliseconds (lower is better).
// Timing: performance.now(); the clock starts in the frame that paints 0.00, Start/Stop count on
// pointerdown (no click delay), only the first finger counts.
(() => {
  const ROUNDS = 5, GOAL = 5000, VISIBLE = 1500, LOCK = 600, END_DELAY = 1000;
  const secs = (ms) => (ms / 1000).toFixed(2);
  // One round's result from the elapsed time: whole-ms error (negative = early) and the
  // centisecond figures that are shown, so "5.23 s" and "0.23 s late" always agree.
  function roundResult(elapsed) {
    const ms = Math.round(elapsed);
    const cs = Math.round(ms / 10);
    return { err: ms - GOAL, shown: (cs / 100).toFixed(2), offCs: cs - GOAL / 10 };
  }
  const verdict = (offCs) => (offCs === 0 ? 'Spot on!' : (Math.abs(offCs) / 100).toFixed(2) + ' s ' + (offCs > 0 ? 'late' : 'early'));
  const signed = (offCs) => (offCs > 0 ? '+' : offCs < 0 ? '−' : '±') + (Math.abs(offCs) / 100).toFixed(2);
  const score = (errs) => Math.max(1, Math.round(errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length));
  const off = (v) => v + ' ms off';

  (window.__games = window.__games || []).push({
    id: 'stop-clock', category: 'Reaction', name: 'Stop the Clock', skill: 'Timing', desc: 'stop the timer at exactly 5.00 s', icon: '⏱️',
    gen: { roundResult, verdict, score }, // pure helpers, exposed for bulk checks
    lowerIsBetter: true,
    formatBest: off,
    start(el, api) {
      el.innerHTML =
        '<div class="hud sc-hud"><span class="sc-round"></span><span class="sc-avg"></span></div>' +
        '<p class="sc-goal">Stop the clock at exactly <b>5.00 s</b></p>' +
        '<div class="sc-face"><span class="sc-time">0.00</span><span class="sc-unit">s</span></div>' +
        '<p class="sc-msg"></p>' +
        '<button class="sc-btn" type="button"></button>' +
        '<div class="panel sc-panel"><h3></h3><p class="result"></p><p class="sc-detail"></p><p class="new"></p><button class="btn"></button></div>';
      const roundEl = el.querySelector('.sc-round');
      const avgEl = el.querySelector('.sc-avg');
      const face = el.querySelector('.sc-face');
      const timeEl = el.querySelector('.sc-time');
      const msgEl = el.querySelector('.sc-msg');
      const go = el.querySelector('.sc-btn');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      // state: idle (panel) | ready | counting (digits visible) | blind (digits hidden) | shown | done
      let state = 'idle', t0 = 0, frame = 0, errs = [], offs = [], armed = true;
      const timers = new Set();
      const later = (fn, delay) => { const id = setTimeout(() => { timers.delete(id); fn(); }, delay); timers.add(id); };
      const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(frame); frame = 0; };

      function showHud() {
        roundEl.textContent = 'Round ' + Math.min(ROUNDS, errs.length + (state === 'shown' || state === 'done' ? 0 : 1)) + ' of ' + ROUNDS;
        avgEl.textContent = errs.length ? 'Avg off ' + secs(score(errs)) + ' s' : 'Avg off –';
      }
      function setButton(label, cls) { go.textContent = label; go.className = 'sc-btn' + (cls ? ' ' + cls : ''); }
      function setFace(text, cls) { timeEl.textContent = text; face.className = 'sc-face' + (cls ? ' ' + cls : ''); }

      function ready() {
        state = 'ready';
        showHud();
        setButton(errs.length ? 'Start round ' + (errs.length + 1) : 'Start', 'sc-start');
        if (!errs.length) { setFace('0.00'); msgEl.textContent = 'The digits hide after 1.5 s — keep counting in your head.'; }
      }

      function startRound() {
        state = 'counting';
        t0 = 0;
        showHud();
        setFace('0.00');
        msgEl.textContent = 'Watch…';
        setButton('Stop', 'sc-stop sc-wait');
        // the clock starts in the frame that paints 0.00
        frame = requestAnimationFrame(() => {
          t0 = performance.now();
          later(blind, VISIBLE);
          frame = requestAnimationFrame(tick);
        });
      }

      function tick() {
        timeEl.textContent = secs(Math.min(VISIBLE, performance.now() - t0));
        frame = requestAnimationFrame(tick);
      }

      function blind() {
        cancelAnimationFrame(frame); frame = 0;
        state = 'blind';
        setFace('?.??', 'sc-hidden');
        msgEl.textContent = 'Tap Stop at 5.00 s';
        setButton('Stop', 'sc-stop');
      }

      function stop(now) {
        const r = roundResult(now - t0);
        errs.push(r.err);
        offs.push(r.offCs);
        state = 'shown';
        setFace(r.shown, r.offCs === 0 ? 'sc-good' : 'sc-result');
        msgEl.textContent = r.shown + ' s — ' + verdict(r.offCs);
        setButton(errs.length < ROUNDS ? 'Start round ' + (errs.length + 1) : 'Done', 'sc-start sc-wait');
        showHud();
        if (errs.length === ROUNDS) later(end, END_DELAY);
        else later(ready, LOCK); // brief lock so a double tap can't start the next round
      }

      function onDown(e) {
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return; // first finger only
        const now = performance.now();
        if (state === 'ready') startRound();
        else if (state === 'blind') stop(now);
        // counting (digits still showing) and shown (locked): ignored
      }

      function showPanel(title, result, detail, label, over) {
        panel.classList.toggle('sc-over', !!over);
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.sc-detail').textContent = detail;
        panel.querySelector('.new').textContent = '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        if (!armed) return;
        panel.classList.add('hidden');
        stopAll();
        errs = []; offs = [];
        ready();
      }

      function end() {
        stopAll();
        state = 'done';
        setFace('');
        msgEl.textContent = '';
        const s = score(errs);
        showPanel('Stop the Clock', 'Average: ' + off(s),
          'Rounds: ' + offs.map(signed).join(' · ') + ' s (+ late, − early)', 'Play again', true);
        const isBest = api.finish(s, panel);
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        armed = false;
        later(() => { armed = true; }, 600);
      }

      go.addEventListener('pointerdown', onDown);
      btn.addEventListener('click', begin);
      setButton('Start', 'sc-start');
      showHud();
      showPanel('Stop the Clock', 'Stop the timer at exactly 5.00 seconds.',
        'You see it count for 1.5 s, then the digits hide. 5 rounds.', 'Start');

      return stopAll;
    },
  });
})();
