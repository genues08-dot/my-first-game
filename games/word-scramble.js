// Word Scramble: 60 seconds. Tap the shuffled letter tiles to spell the word.
// Tap a placed letter to send it back. A wrong word shakes and the letters return (no penalty).
// Skip costs 3 seconds and shows the word. Words grow from 4 to 7 letters as your streak grows.
// No two words in a list are anagrams of each other, and words with a common English anagram
// (listen/silent, heart/earth...) are left out, so every scramble has exactly one answer.
(() => {
  const DURATION = 60000, SKIP_PENALTY = 3000, PER_LEVEL = 3, MIN_LEN = 4, MAX_LEN = 7;
  const WORDS = {
    4: 'baby ball band bank bell cake camp card cart cave chip city clap club comb cook corn crib cube dark deck desk dish dock doll dove down drum duck echo farm fish flag foam food frog gift girl glad glow gold good hand harp hawk hill home hook hope horn jump kick lock long luck mask milk mind moth park pink pond pony quiz roof sock swim wave wind wing wish worm zero fork gown knot lava loud mint neck oven puff pump soft taxi tidy tiny walk warm yolk bump buzz chop chef fern wild word jazz',
    5: 'beach berry brick candy chair chalk cheer chess chick child clock clown couch crown drink fairy flute fruit ghost giant grass happy house jelly juice kayak knife koala laugh light lucky match money month music panda paper party penny piano pizza plant puppy queen river robot round salad scarf sheep shirt snack sunny tiger tooth truck uncle wheel world bunny cabin cocoa crumb curly fancy flock funny honey jolly lunch pilot pouch quilt sandy shiny think thumb windy young bloom blink brave brown chirp dizzy dough fluff gravy hello merry quack robin rainy snowy teddy trick vowel yummy bench bring bumpy cliff empty fresh fudge grill hippo hobby jumpy lilac muddy punch spicy swamp thick truth twirl youth',
    6: 'banana basket bottle bubble button cheese cherry cookie cotton donkey dragon guitar hammer helmet island jacket jungle kitten letter lizard meadow monkey muffin nature pencil pepper picnic pillow puzzle rabbit rocket shadow spring summer tomato turtle valley violin wallet window wizard yellow beaver bucket butter cactus camera canyon doctor family frozen gentle jigsaw kettle laptop magnet napkin noodle number paddle pirate pocket potato sailor salmon sketch sleepy squash teapot ticket tunnel velvet walrus zipper cousin hiccup puppet raisin wisdom autumn barrel beetle bonnet cuddle jersey jumble muscle nibble object pebble pickle pretty sneeze splash tickle trophy unlock waffle zigzag',
    7: 'balloon bicycle biscuit blanket cabbage captain chicken compass cupcake dolphin diamond factory fishing freedom giraffe journey ladybug lantern library morning octopus orchard pancake panther peacock penguin popcorn pumpkin pyramid rainbow science seaweed sparrow station thunder tractor trumpet unicorn village volcano whisper baggage battery buffalo ceiling cheetah chimney cottage country cushion curtain custard dancing fantasy fortune harmony history hamster iceberg jewelry kingdom lettuce luggage mailbox measure mermaid mixture musical mystery pudding quality raccoon sweater trapeze uniform vanilla warrior weekend whistle airport bandage bathtub blossom brother cabinet camping coconut concert cricket crystal eyebrow firefly gymnast haircut healthy helpful jackpot ketchup lullaby machine magical oatmeal pajamas popular sandbox shelter snowman spinach stomach surface swimmer trouble vehicle',
  };
  for (const k in WORDS) WORDS[k] = WORDS[k].split(' ');

  const randInt = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const keyOf = (w) => [...w].sort().join('');
  const lengthFor = (streak) => Math.min(MAX_LEN, MIN_LEN + Math.floor(streak / PER_LEVEL));
  // Shuffled letters of `word`, never in the word's own order (compares letters, so repeated letters are fine).
  function scramble(word) {
    const letters = [...word];
    if (new Set(letters).size < 2) return letters; // can't happen with our lists
    do shuffle(letters); while (letters.join('') === word);
    return letters;
  }
  // The intended word, or (safety net) any listed word made of exactly the same letters.
  const isAnswer = (target, attempt) =>
    attempt === target || (keyOf(attempt) === keyOf(target) && (WORDS[target.length] || []).includes(attempt));

  (window.__games = window.__games || []).push({
    id: 'word-scramble', category: 'Words', name: 'Word Scramble', skill: 'Words', desc: 'unscramble the letters', icon: '🔤',
    gen: { WORDS, scramble, isAnswer, lengthFor, keyOf, DURATION, SKIP_PENALTY }, // exposed for bulk tests
    start(el, api) {
      el.innerHTML =
        '<div class="hud"><span class="time">60</span><span class="level">4 letters</span><span class="score">0</span></div>' +
        '<div class="qbar"><div class="qbar-fill"></div></div>' +
        '<div class="ws-slots"></div>' +
        '<div class="ws-tiles"></div>' +
        '<div class="status ws-status">&nbsp;</div>' +
        '<div class="ws-actions"><button class="ws-act ws-shuffle">⇄ Shuffle</button><button class="ws-act ws-skip">Skip −3s</button></div>' +
        '<div class="panel"><h3></h3><p class="result"></p><p class="new"></p><button class="btn"></button></div>';
      const timeEl = el.querySelector('.time');
      const levelEl = el.querySelector('.level');
      const scoreEl = el.querySelector('.score');
      const fillEl = el.querySelector('.qbar-fill');
      const slotsEl = el.querySelector('.ws-slots');
      const tilesEl = el.querySelector('.ws-tiles');
      const statusEl = el.querySelector('.ws-status');
      const shuffleBtn = el.querySelector('.ws-shuffle');
      const skipBtn = el.querySelector('.ws-skip');
      const panel = el.querySelector('.panel');
      const btn = panel.querySelector('.btn');

      let running = false, locked = false, score = 0, streak = 0, endAt = 0, tickId = null;
      let word = '', tiles = [], slots = []; // tiles: [{ ch, used }] in display order; slots: tile or null
      const recent = { 4: [], 5: [], 6: [], 7: [] };
      let timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const setStatus = (text, cls) => { statusEl.textContent = text || ' '; statusEl.className = 'status ws-status' + (cls ? ' ' + cls : ''); };

      function pickWord(len) {
        const used = recent[len];
        if (used.length >= WORDS[len].length) used.length = 0;
        let w;
        do w = WORDS[len][randInt(WORDS[len].length)]; while (used.includes(w));
        used.push(w);
        return w;
      }

      function render(mark) {
        slotsEl.style.setProperty('--n', word.length);
        tilesEl.style.setProperty('--n', word.length);
        slotsEl.innerHTML = '';
        slots.forEach((t, i) => {
          const b = document.createElement('button');
          b.className = 'ws-slot' + (t ? ' filled' : '') + (mark ? ' ' + mark : '');
          b.textContent = t ? t.ch : '';
          b.setAttribute('aria-label', t ? 'Placed ' + t.ch : 'Empty slot ' + (i + 1));
          b.addEventListener('click', () => unplace(i));
          slotsEl.append(b);
        });
        tilesEl.innerHTML = '';
        tiles.forEach((t) => {
          const b = document.createElement('button');
          b.className = 'ws-tile' + (t.used ? ' used' : '');
          b.textContent = t.used ? '' : t.ch;
          b.disabled = t.used;
          b.addEventListener('click', () => place(t));
          tilesEl.append(b);
        });
      }

      function nextWord() {
        const len = lengthFor(streak);
        word = pickWord(len);
        tiles = scramble(word).map((ch) => ({ ch, used: false }));
        slots = new Array(len).fill(null);
        levelEl.textContent = len + ' letters';
        setStatus('');
        render();
      }

      function place(t) {
        if (!running || locked || t.used) return;
        const i = slots.indexOf(null);
        if (i < 0) return;
        slots[i] = t; t.used = true;
        render();
        if (!slots.includes(null)) check();
      }

      function unplace(i) {
        if (!running || locked || !slots[i]) return;
        slots[i].used = false; slots[i] = null;
        render();
      }

      function check() {
        const attempt = slots.map((t) => t.ch).join('');
        locked = true;
        if (isAnswer(word, attempt)) {
          score++; streak++;
          scoreEl.textContent = score;
          setStatus('✓ ' + word.toUpperCase(), 'go');
          render('right');
          later(() => { locked = false; if (running) nextWord(); }, 600);
        } else {
          setStatus('✗ Not the word, try again', 'ws-bad');
          render('wrong');
          slotsEl.classList.remove('ws-shake');
          void slotsEl.offsetWidth; // restart the shake animation
          slotsEl.classList.add('ws-shake');
          later(() => {
            locked = false;
            if (!running) return;
            tiles.forEach((t) => { t.used = false; });
            slots.fill(null);
            setStatus('');
            render();
          }, 700);
        }
      }

      // Reshuffle the letters still in the tray (placed letters stay put).
      function reshuffle() {
        if (!running || locked) return;
        const free = tiles.map((t, i) => (t.used ? -1 : i)).filter((i) => i >= 0);
        const before = free.map((i) => tiles[i].ch).join('');
        const allFree = free.length === tiles.length;
        for (let tries = 0; tries < 30 && free.length > 1; tries++) {
          const order = shuffle(free.map((i) => tiles[i]));
          const s = order.map((t) => t.ch).join('');
          if (s === before || (allFree && s === word)) continue; // must look different and never spell the word
          free.forEach((i, k) => { tiles[i] = order[k]; });
          break;
        }
        render();
      }

      function skip() {
        if (!running || locked) return;
        locked = true;
        endAt -= SKIP_PENALTY;
        streak = Math.floor(streak / 2);
        slots = [...word].map((ch) => ({ ch, used: true }));
        tiles.forEach((t) => { t.used = true; });
        setStatus('It was ' + word.toUpperCase() + ' (−3s)', 'ws-bad');
        render('reveal');
        tick();
        later(() => { locked = false; if (running) nextWord(); }, 1200);
      }

      function tick() {
        if (!running) return;
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
        timers.forEach(clearTimeout); timers = [];
        score = 0; streak = 0; locked = false; running = true;
        scoreEl.textContent = '0';
        timeEl.textContent = '60';
        endAt = Date.now() + DURATION;
        nextWord();
        tick();
        clearInterval(tickId);
        tickId = setInterval(tick, 100);
      }

      function finish() {
        running = false;
        clearInterval(tickId);
        timeEl.textContent = '0';
        fillEl.style.width = '0%';
        const isBest = score > 0 && api.submit(score);
        showPanel("Time's up", 'Words solved: ' + score, isBest, 'Play again');
      }

      shuffleBtn.addEventListener('click', reshuffle);
      skipBtn.addEventListener('click', skip);
      btn.addEventListener('click', begin);
      // Desktop convenience: type letters, Backspace removes the last placed letter.
      const onKey = (e) => {
        if (!running || locked) return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          for (let i = slots.length - 1; i >= 0; i--) if (slots[i]) { unplace(i); break; }
        } else if (/^[a-z]$/i.test(e.key)) {
          const t = tiles.find((x) => !x.used && x.ch === e.key.toLowerCase());
          if (t) place(t);
        }
      };
      document.addEventListener('keydown', onKey);

      showPanel('Word Scramble', 'Tap the letters to spell the word. Unscramble as many as you can in 60 seconds. Skip costs 3 seconds.', false, 'Start');

      return () => { clearInterval(tickId); timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); };
    },
  });
})();
