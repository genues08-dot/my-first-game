// App shell: menu, navigation, saved best scores.
// A game registers itself with registerGame({ id, name, skill, desc, icon, start(el, api) }).
// start() draws into `el` and may return a cleanup function.
// api.best() -> saved best score, api.submit(score) -> true if it is a new best.
// A game with an `href` instead of start() is just a link (used for snake).
(() => {
  const games = window.__games || [];
  const root = document.getElementById('app');
  let cleanup = null;

  const store = {
    get(id) { try { return Number(localStorage.getItem('best:' + id)) || 0; } catch (e) { return 0; } },
    set(id, v) { try { localStorage.setItem('best:' + id, String(v)); } catch (e) { /* storage blocked */ } },
  };

  function showMenu() {
    document.title = 'Brain Games';
    root.innerHTML =
      '<header class="top"><h1>Brain Games</h1><p>Pick a game</p></header><main class="menu"></main>';
    const menu = root.querySelector('.menu');
    for (const g of games) {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = g.href || '#' + g.id;
      const best = g.href ? '' : 'Best: ' + store.get(g.id);
      card.innerHTML =
        '<span class="ico"></span><span class="txt"><b></b><small></small></span><span class="best"></span>';
      card.querySelector('.ico').textContent = g.icon;
      card.querySelector('b').textContent = g.name;
      card.querySelector('small').textContent = g.skill + ' · ' + g.desc;
      card.querySelector('.best').textContent = best;
      menu.append(card);
    }
  }

  function openGame(g) {
    document.title = g.name + ' – Brain Games';
    root.innerHTML =
      '<header class="bar"><a class="back" href="#">‹ Menu</a><h2></h2><span class="best"></span></header><main class="stage"></main>';
    root.querySelector('h2').textContent = g.name;
    const bestEl = root.querySelector('.bar .best');
    const showBest = () => { bestEl.textContent = 'Best: ' + store.get(g.id); };
    showBest();
    const api = {
      best: () => store.get(g.id),
      submit(score) {
        const isBest = score > store.get(g.id);
        if (isBest) store.set(g.id, score);
        showBest();
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
