// App shell: menu, navigation, saved best scores.
// A game registers itself by pushing onto window.__games:
//   { id, name, category, skill, desc, icon, start(el, api), lowerIsBetter?, formatBest? }
// start() draws into `el` and may return a cleanup function.
// api.best() -> saved best (0 = none yet), api.submit(score) -> true if it is a new best.
// api.finish(score, panelEl) -> call once at game end: submit + history + results chart.
// Bests are higher-is-better unless the game sets lowerIsBetter (e.g. fastest time).
// formatBest(value) turns a stored best into display text (e.g. "42.1s").
// A game with an `href` instead of start() is just a link to another page.
(() => {
  const games = window.__games || [];
  const root = document.getElementById('app');
  const CATEGORIES = ['Reaction', 'Memory', 'Logic', 'Planning', 'Attention', 'Numbers', 'Spatial', 'Words', 'Just for fun'];
  let cleanup = null;

  const store = {
    get(id) { try { return Number(localStorage.getItem('best:' + id)) || 0; } catch (e) { return 0; } },
    set(id, v) { try { localStorage.setItem('best:' + id, String(v)); } catch (e) { /* storage blocked */ } },
  };

  function bestText(g) {
    const v = store.get(g.id);
    if (!v) return g.lowerIsBetter ? 'Best: –' : 'Best: 0';
    return 'Best: ' + (g.formatBest ? g.formatBest(v) : v);
  }

  function showMenu() {
    document.title = 'Brain Games';
    root.innerHTML =
      '<header class="top"><h1>Brain Games</h1><p>Pick a game</p></header><main class="menu"></main>';
    const menu = root.querySelector('.menu');
    const cats = [...CATEGORIES, ...new Set(games.map((g) => g.category).filter((c) => !CATEGORIES.includes(c)))];
    for (const cat of cats) {
      const list = games.filter((g) => (g.category || 'Just for fun') === cat);
      if (!list.length) continue;
      const h = document.createElement('h2');
      h.className = 'cat';
      h.textContent = cat;
      menu.append(h);
      for (const g of list) {
        const card = document.createElement('a');
        card.className = 'card';
        card.href = g.href || '#' + g.id;
        card.innerHTML =
          '<span class="ico"></span><span class="txt"><b></b><small></small></span><span class="best"></span>';
        card.querySelector('.ico').textContent = g.icon;
        card.querySelector('b').textContent = g.name;
        card.querySelector('small').textContent = g.skill + ' · ' + g.desc;
        card.querySelector('.best').textContent = g.href ? '' : bestText(g);
        menu.append(card);
      }
    }
  }

  function openGame(g) {
    document.title = g.name + ' – Brain Games';
    root.innerHTML =
      '<header class="bar"><a class="back" href="#">‹ Menu</a><h2></h2><span class="best"></span></header><main class="stage"></main>';
    root.querySelector('h2').textContent = g.name;
    const bestEl = root.querySelector('.bar .best');
    const showBest = () => { bestEl.textContent = bestText(g); };
    showBest();
    const api = {
      best: () => store.get(g.id),
      submit(score) {
        const cur = store.get(g.id);
        const isBest = g.lowerIsBetter ? score > 0 && (cur === 0 || score < cur) : score > cur;
        if (isBest) store.set(g.id, score);
        showBest();
        return isBest;
      },
      // Call once when a game ends: saves the best, records the result in this phone's
      // history, and draws the results chart into the end panel (before its first button).
      finish(score, panel) {
        const isBest = api.submit(score);
        const hist = window.Results ? window.Results.record(g.id, score) : [];
        if (window.Results && panel) window.Results.render(panel, g, score, hist);
        return isBest;
      },
    };
    cleanup = g.start(root.querySelector('.stage'), api) || null;
  }

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const id = location.hash.slice(1);
    const g = games.find((x) => x.id === id && x.start);
    if (g) openGame(g); else showMenu();
  }

  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    });
  }
})();
