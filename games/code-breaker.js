// Code Breaker: crack a hidden code of 4 different colours in 10 guesses.
// After each guess: a solid dot = right colour in the right spot,
// a ring = right colour in the wrong spot.
(window.__games = window.__games || []).push({
  id: 'code-breaker', category: 'Logic', name: 'Code Breaker', skill: 'Logic', desc: 'crack the hidden colour code', icon: '🔐',
  start(el, api) {
    const COLORS = [
      { name: 'Red', color: '#ff5d6c', sym: '●' },
      { name: 'Yellow', color: '#ffd166', sym: '▲' },
      { name: 'Green', color: '#3ddc97', sym: '■' },
      { name: 'Blue', color: '#4dabf7', sym: '◆' },
      { name: 'Purple', color: '#b197fc', sym: '★' },
      { name: 'Orange', color: '#ffa94d', sym: '♥' },
    ];
    const LEN = 4, MAX = 10;

    el.innerHTML =
      '<div class="cb">' +
      '<div class="cb-legend"><span class="peg black"></span> right spot · <span class="peg white"></span> wrong spot · each colour used once</div>' +
      '<div class="cb-board"></div>' +
      '<div class="cb-palette"></div>' +
      '<button class="btn cb-check" disabled>Check</button>' +
      '</div>' +
      '<div class="panel hidden"><h3></h3><p class="result"></p><div class="cb-answer"></div><p class="new"></p><button class="btn again">Play again</button></div>';
    const boardEl = el.querySelector('.cb-board');
    const paletteEl = el.querySelector('.cb-palette');
    const checkBtn = el.querySelector('.cb-check');
    const panel = el.querySelector('.panel');

    let secret, guesses, current, over, endTimer;

    function newSecret() {
      const idx = COLORS.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx.slice(0, LEN);
    }

    function feedback(guess, code) {
      let black = 0;
      const g = Array(COLORS.length).fill(0), s = Array(COLORS.length).fill(0);
      for (let i = 0; i < LEN; i++) {
        if (guess[i] === code[i]) black++;
        else { g[guess[i]]++; s[code[i]]++; }
      }
      let white = 0;
      for (let c = 0; c < COLORS.length; c++) white += Math.min(g[c], s[c]);
      return { black, white };
    }

    function dot(value, cls) {
      const d = document.createElement(cls === 'cb-slot' ? 'button' : 'span');
      d.className = cls + (value === null ? '' : ' filled');
      if (value !== null) {
        d.style.background = COLORS[value].color;
        d.textContent = COLORS[value].sym;
        d.setAttribute('aria-label', COLORS[value].name);
      } else {
        d.setAttribute('aria-label', 'Empty');
      }
      return d;
    }

    function render() {
      boardEl.innerHTML = '';
      for (let r = 0; r < MAX; r++) {
        const row = document.createElement('div');
        row.className = 'cb-row';
        const slots = document.createElement('div');
        slots.className = 'cb-slots';
        const pegs = document.createElement('div');
        pegs.className = 'cb-pegs';
        if (r < guesses.length) {
          for (const v of guesses[r].code) { const b = dot(v, 'cb-slot'); b.disabled = true; slots.append(b); }
          const { black, white } = guesses[r];
          for (let p = 0; p < LEN; p++) {
            const peg = document.createElement('span');
            peg.className = 'peg' + (p < black ? ' black' : p < black + white ? ' white' : '');
            pegs.append(peg);
          }
        } else if (r === guesses.length && !over) {
          row.classList.add('current');
          current.forEach((v, i) => {
            const b = dot(v, 'cb-slot');
            b.addEventListener('click', () => { current[i] = null; render(); });
            slots.append(b);
          });
          for (let p = 0; p < LEN; p++) pegs.append(Object.assign(document.createElement('span'), { className: 'peg' }));
        } else {
          for (let i = 0; i < LEN; i++) { const b = dot(null, 'cb-slot'); b.disabled = true; slots.append(b); }
          for (let p = 0; p < LEN; p++) pegs.append(Object.assign(document.createElement('span'), { className: 'peg' }));
        }
        row.append(slots, pegs);
        boardEl.append(row);
      }
      checkBtn.disabled = over || current.includes(null);
    }

    COLORS.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'cb-pick';
      b.style.background = c.color;
      b.textContent = c.sym;
      b.setAttribute('aria-label', c.name);
      b.addEventListener('click', () => {
        if (over) return;
        const slot = current.indexOf(null);
        if (slot === -1) return;
        current[slot] = i;
        render();
      });
      paletteEl.append(b);
    });

    function showEnd(won) {
      const answer = panel.querySelector('.cb-answer');
      answer.innerHTML = '';
      for (const v of secret) answer.append(dot(v, 'cb-slot'));
      panel.querySelector('h3').textContent = won ? 'Cracked it!' : 'Out of guesses';
      let isBest = false;
      if (won) {
        const score = (MAX - guesses.length + 1) * 10;
        isBest = api.submit(score);
        panel.querySelector('.result').textContent = 'Solved in ' + guesses.length + ' guess' + (guesses.length === 1 ? '' : 'es') + ' · score ' + score;
      } else {
        panel.querySelector('.result').textContent = 'The code was:';
      }
      panel.querySelector('.new').textContent = isBest ? 'New best!' : '';
      panel.classList.remove('hidden');
    }

    checkBtn.addEventListener('click', () => {
      if (over || current.includes(null)) return;
      const code = current.slice();
      const fb = feedback(code, secret);
      guesses.push({ code, black: fb.black, white: fb.white });
      current = Array(LEN).fill(null);
      const won = fb.black === LEN;
      if (won || guesses.length === MAX) over = true;
      render();
      if (over) endTimer = setTimeout(() => showEnd(won), 700);
    });

    function newGame() {
      secret = newSecret();
      guesses = [];
      current = Array(LEN).fill(null);
      over = false;
      panel.classList.add('hidden');
      render();
    }

    panel.querySelector('.again').addEventListener('click', newGame);
    newGame();

    return () => clearTimeout(endTimer);
  },
});
