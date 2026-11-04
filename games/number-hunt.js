// Number Hunt (a Schulte table): the numbers 1–25 are scattered over a 5×5 grid.
// Tap them in order, 1, 2, 3 … 25, as fast as you can. A wrong tap adds 1 second.
// The clock starts when you press Start (the numbers stay hidden until then).
// Best = fastest time, stored in tenths of a second.
(() => {
  const SIDE = 5, N = SIDE * SIDE, PENALTY = 1000;

  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // A fresh table: the numbers 1..25 in random grid order (index = cell, row by row).
  const makeTable = () => shuffle(Array.from({ length: N }, (_, i) => i + 1));
  const fmt = (tenths) => (tenths / 10).toFixed(1) + 's';

  (window.__games = window.__games || []).push({
    id: 'number-hunt', category: 'Attention', name: 'Number Hunt', skill: 'Attention', desc: 'tap 1 to 25 in order, fast', icon: '🎯',
    gen: makeTable, // exposed so the tables can be checked in bulk
    lowerIsBetter: true,
    formatBest: fmt,
    start(el, api) {
      el.innerHTML =
        '<div class="hud nh-hud"><span class="nh-find">Find: 1</span><span class="nh-time">0.0s</span></div>' +
        '<div class="nh-grid"></div>' +
        '<div class="nh-msg"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const findEl = el.querySelector('.nh-find');
      const timeEl = el.querySelector('.nh-time');
      const gridEl = el.querySelector('.nh-grid');
      const msgEl = el.querySelector('.nh-msg');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, next = 1, startAt = 0, penalty = 0, misses = 0, tickId = null;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const elapsed = () => Date.now() - startAt + penalty;
      const tenths = () => Math.max(1, Math.floor(elapsed() / 100));

      const cells = Array.from({ length: N }, () => {
        const b = document.createElement('button');
        b.className = 'nh-cell';
        b.disabled = true;
        b.addEventListener('click', () => tap(b));
        gridEl.append(b);
        return b;
      });

      function deal() {
        makeTable().forEach((n, i) => {
          const b = cells[i];
          b.textContent = n;
          b.dataset.n = n;
          b.disabled = false;
          b.classList.remove('done', 'wrong');
        });
      }

      function tap(b) {
        if (!running || b.classList.contains('done')) return;
        if (+b.dataset.n === next) {
          b.classList.add('done');
          b.disabled = true;
          next++;
          if (next > N) { finish(); return; }
          findEl.textContent = 'Find: ' + next;
        } else {
          penalty += PENALTY; misses++;
          b.classList.remove('wrong');
          void b.offsetWidth; // restart the flash if tapped again quickly
          b.classList.add('wrong');
          later(() => b.classList.remove('wrong'), 450);
          msgEl.textContent = 'Wrong taps: ' + misses + ' (+' + misses + 's)';
          tick();
        }
      }

      function tick() { timeEl.textContent = fmt(Math.floor(elapsed() / 100)); }

      function showPanel(title, result, isBest, label) {
        panel.querySelector('h3').textContent = title;
        panel.querySelector('.result').textContent = result;
        panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
        btn.textContent = label;
        panel.classList.remove('hidden');
      }

      function begin() {
        panel.classList.add('hidden');
        deal();
        next = 1; penalty = 0; misses = 0; running = true;
        findEl.textContent = 'Find: 1';
        msgEl.textContent = '';
        startAt = Date.now();
        tick();
        clearInterval(tickId);
        tickId = setInterval(tick, 100);
      }

      function finish() {
        running = false;
        clearInterval(tickId);
        const t = tenths();
        timeEl.textContent = fmt(t);
        findEl.textContent = 'All found';
        cells.forEach((b) => { b.disabled = true; });
        const isBest = api.finish(t, panel); // records the time and draws the chart into the end panel
        const result = misses ? 'Includes ' + misses + ' wrong tap' + (misses === 1 ? '' : 's') + ' (+' + misses + 's)' : 'No wrong taps';
        later(() => showPanel('Done in ' + fmt(t), result, isBest, 'Play again'), 350);
      }

      btn.addEventListener('click', begin);
      showPanel('Number Hunt', 'Tap 1 to 25 in order as fast as you can. The clock starts when you press Start. Wrong taps add 1 second.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
