// Stroop Test: a colour word (RED, BLUE, GREEN, YELLOW) is printed in an ink colour.
// Tap the button for the INK colour, not the word. 60 seconds; a wrong tap costs 2 seconds.
// As your streak grows, more words clash with their ink. From level 4 a cue above the word
// says INK or WORD, and you must follow the cue (task switching).
(() => {
  const DURATION = 60000, PENALTY = 2000, MAX_LEVEL = 6, PER_LEVEL = 5, SWITCH_LEVEL = 4;
  // Inks chosen to be far apart on a dark background. The answer buttons use the same colours.
  const COLORS = [
    { name: 'RED', ink: '#ff4d4d' },
    { name: 'BLUE', ink: '#4c9dff' },
    { name: 'GREEN', ink: '#34d17a' },
    { name: 'YELLOW', ink: '#ffd43b' },
  ];
  const NAMES = COLORS.map((c) => c.name);
  // clash: share of items where word and ink differ. word: share of WORD cues (0 = no cue shown).
  const LEVELS = [
    { clash: 0.25, word: 0 },
    { clash: 0.5, word: 0 },
    { clash: 0.75, word: 0 },
    { clash: 0.8, word: 0.3 },
    { clash: 0.9, word: 0.4 },
    { clash: 1, word: 0.5 },
  ];

  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // One item for a level. Never repeats the previous item exactly, so every tap visibly moves on.
  function genItem(level, prev) {
    const L = LEVELS[level - 1];
    const clash = Math.random() < L.clash;
    const cue = L.word > 0 && Math.random() < L.word ? 'WORD' : 'INK';
    let w, k;
    do {
      w = r(0, 3);
      k = clash ? (w + r(1, 3)) % 4 : w;
    } while (prev && prev.word === NAMES[w] && prev.ink === NAMES[k] && prev.cue === cue);
    return { word: NAMES[w], ink: NAMES[k], cue, showCue: L.word > 0, clash, answer: cue === 'INK' ? NAMES[k] : NAMES[w] };
  }
  genItem.levels = LEVELS;
  genItem.colors = COLORS;
  genItem.switchLevel = SWITCH_LEVEL;

  (window.__games = window.__games || []).push({
    id: 'stroop', category: 'Attention', name: 'Stroop Test', skill: 'Attention', desc: 'tap the ink colour, not the word', icon: '🎨',
    gen: genItem, // exposed so the items can be checked in bulk
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">60</span><span class="level">Level 1</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="st-show"><div class="st-cue st-off">INK</div><div class="st-word">&nbsp;</div><div class="st-note"></div></div>' +
        '<div class="st-answers"></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const timeEl = el.querySelector('.time');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const cueEl = el.querySelector('.st-cue');
      const wordEl = el.querySelector('.st-word');
      const noteEl = el.querySelector('.st-note');
      const answersEl = el.querySelector('.st-answers');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, locked = false, score = 0, streak = 0, endAt = 0, item = null, tickId = null, noticed = false;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const level = () => Math.min(MAX_LEVEL, 1 + Math.floor(streak / PER_LEVEL));

      // Fixed button layout, so your thumb learns where each colour is.
      const buttons = COLORS.map((c) => {
        const b = document.createElement('button');
        b.className = 'st-ans';
        b.style.setProperty('--sw', c.ink);
        b.textContent = c.name;
        b.dataset.v = c.name;
        b.addEventListener('click', () => choose(b, c.name));
        answersEl.append(b);
        return b;
      });

      function restartAnim(node, cls) {
        node.classList.remove(cls);
        void node.offsetWidth; // reflow so the animation plays again
        node.classList.add(cls);
      }

      function showNote(text, ms) {
        noteEl.textContent = text;
        later(() => { if (noteEl.textContent === text) noteEl.textContent = ''; }, ms);
      }

      function nextItem() {
        const lv = level();
        item = genItem(lv, item);
        levelEl.textContent = 'Level ' + lv;
        wordEl.textContent = item.word;
        wordEl.style.color = COLORS[NAMES.indexOf(item.ink)].ink;
        cueEl.classList.toggle('st-off', !item.showCue);
        cueEl.classList.toggle('st-cue-word', item.cue === 'WORD');
        cueEl.textContent = item.cue;
        restartAnim(wordEl, 'st-pop');
        if (item.showCue && !noticed) {
          noticed = true;
          showNote('New rule: follow the cue – INK or WORD', 4000);
        }
        answersEl.classList.remove('st-reveal');
        buttons.forEach((b) => b.classList.remove('wrong', 'right'));
      }

      function choose(b, name) {
        if (!running || locked) return;
        if (name === item.answer) {
          score++; streak++;
          scoreEl.textContent = score;
          nextItem();
        } else {
          streak = Math.floor(streak / 2);
          endAt -= PENALTY;
          locked = true;
          b.classList.add('wrong');
          buttons[NAMES.indexOf(item.answer)].classList.add('right');
          answersEl.classList.add('st-reveal');
          restartAnim(wordEl, 'st-shake');
          later(() => { locked = false; if (running) nextItem(); }, 700);
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
        score = 0; streak = 0; locked = false; running = true; noticed = false; item = null;
        scoreEl.textContent = '0';
        noteEl.textContent = '';
        endAt = Date.now() + DURATION;
        nextItem();
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
      showPanel('Stroop Test', 'Tap the colour of the INK, not the word. 60 seconds; wrong taps cost 2 seconds.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); };
    },
  });
})();
