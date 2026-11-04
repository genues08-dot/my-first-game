// End-of-game results chart, shared by every game.
//
// "You vs people": when window.NORMS has real, published data for a game, the chart shows
//   how people score (a curve, or bars for whole-number scores) with your result marked.
// "You vs your past games": otherwise, your last 20 results on this phone, with your average.
//
// Games call api.finish(score, panelEl) when a game ends; app.js forwards to Results.
(() => {
  const MAX_HISTORY = 50, SHOW = 20;
  const W = 320, H = 136;
  const PLOT = { l: 10, r: 10, t: 26, b: 24 };
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- history (kept on this phone) ----------
  const key = (id) => 'hist:' + id;
  function load(id) {
    try {
      const a = JSON.parse(localStorage.getItem(key(id)) || '[]');
      return Array.isArray(a) ? a.filter((v) => typeof v === 'number' && isFinite(v)) : [];
    } catch (e) { return []; }
  }
  function record(id, v) {
    const a = load(id);
    if (typeof v === 'number' && isFinite(v)) a.push(v);
    while (a.length > MAX_HISTORY) a.shift();
    try { localStorage.setItem(key(id), JSON.stringify(a)); } catch (e) { /* storage blocked */ }
    return a;
  }

  // ---------- maths ----------
  // Monotone cubic (Fritsch–Carlson) through CDF points: smooth, never decreasing.
  function monotone(xs, ys) {
    const n = xs.length, d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    const seg = (x) => { let i = 0; while (i < n - 2 && x > xs[i + 1]) i++; return i; };
    return {
      value(x) {
        if (x <= xs[0]) return ys[0];
        if (x >= xs[n - 1]) return ys[n - 1];
        const i = seg(x), h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
      },
      slope(x) {
        if (x < xs[0] || x > xs[n - 1]) return 0;
        const i = seg(x), h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t;
        return ((6 * t2 - 6 * t) * ys[i] + (3 * t2 - 4 * t + 1) * h * m[i] + (-6 * t2 + 6 * t) * ys[i + 1] + (3 * t2 - 2 * t) * h * m[i + 1]) / h;
      },
    };
  }

  // Share of people you did better than (0..1), from a norm and your value in the norm's units.
  function beatShare(norm, v) {
    const lower = norm.better === 'lower';
    if (norm.kind === 'discrete') {
      let below = 0, above = 0;
      for (const [k, p] of Object.entries(norm.pmf)) {
        if (+k < v) below += p; else if (+k > v) above += p;
      }
      const total = Object.values(norm.pmf).reduce((s, p) => s + p, 0) || 1;
      return (lower ? above : below) / total;
    }
    const xs = norm.cdf.map((p) => p[0]), ys = norm.cdf.map((p) => p[1]);
    const at = Math.min(1, Math.max(0, monotone(xs, ys).value(v)));
    return lower ? 1 - at : at;
  }

  function pctText(share) {
    const p = share * 100;
    if (p > 99.5) return 'more than 99%';
    if (p < 0.5) return 'less than 1%';
    return Math.round(p) + '%';
  }

  function niceTicks(min, max, count) {
    const span = max - min, raw = span / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => span / s <= count) || 10 * mag;
    const out = [];
    for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(6));
    return out;
  }

  // ---------- drawing helpers ----------
  function svgEl(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  }
  function makeSvg(label) {
    return svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, class: 'rc-svg' });
  }
  // Rounded-top column (4px data-end, square at the baseline).
  function column(x, y, w, h, cls) {
    const r = Math.min(4, w / 2, h);
    const d = `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
    return svgEl('path', { d, class: cls });
  }
  function label(svg, x, y, text, cls, anchor) {
    const a = anchor || (x < 40 ? 'start' : x > W - 40 ? 'end' : 'middle');
    svg.append(svgEl('text', { x, y, class: cls, 'text-anchor': a }, text));
  }
  function textLine(cls, text) {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    return p;
  }

  // ---------- "You vs people" ----------
  function renderPeople(box, norm, v) {
    const lower = norm.better === 'lower';
    const share = beatShare(norm, v);
    const fmt = norm.format || ((x) => String(Math.round(x)));
    const verb = norm.verb || (lower ? 'Faster' : 'Better');
    box.append(textLine('rc-head', `${verb} than ${pctText(share)} of people`));
    box.append(textLine('rc-sub', `You: ${fmt(v)} · Average: ${fmt(norm.average)}`));

    const svg = makeSvg(`${norm.title}: your result ${fmt(v)}, people average ${fmt(norm.average)}. ${verb} than ${pctText(share)} of people.`);
    const plotW = W - PLOT.l - PLOT.r, plotH = H - PLOT.t - PLOT.b, base = H - PLOT.b;
    svg.append(svgEl('line', { x1: PLOT.l, x2: W - PLOT.r, y1: base, y2: base, class: 'rc-axis' }));

    let xOf;
    if (norm.kind === 'discrete') {
      const keys = Object.keys(norm.pmf).map(Number).sort((a, b) => a - b);
      const lo = keys[0], hi = keys[keys.length - 1];
      const slot = plotW / (hi - lo + 1);
      const bw = Math.min(24, slot - 2);
      const maxP = Math.max(...keys.map((k) => norm.pmf[k]));
      xOf = (k) => PLOT.l + (Math.min(hi, Math.max(lo, k)) - lo + 0.5) * slot;
      const youKey = Math.min(hi, Math.max(lo, Math.round(v)));
      for (const k of keys) {
        const h = Math.max(1, (norm.pmf[k] / maxP) * plotH);
        svg.append(column(xOf(k) - bw / 2, base - h, bw, h, k === youKey ? 'rc-col rc-col-you' : 'rc-col'));
      }
      const every = keys.length <= 12 ? 1 : keys.length <= 24 ? 2 : 5;
      for (const k of keys) if ((k - lo) % every === 0) label(svg, xOf(k), H - 8, String(k), 'rc-tick', 'middle');
    } else {
      const xs = norm.cdf.map((p) => p[0]), ys = norm.cdf.map((p) => p[1]);
      const f = monotone(xs, ys), lo = xs[0], hi = xs[xs.length - 1];
      xOf = (x) => PLOT.l + ((Math.min(hi, Math.max(lo, x)) - lo) / (hi - lo)) * plotW;
      const N = 96, pts = [];
      for (let i = 0; i <= N; i++) { const x = lo + ((hi - lo) * i) / N; pts.push([x, Math.max(0, f.slope(x))]); }
      // light smoothing so the curve reads as a distribution, not as interpolation wiggles
      const K = [1, 4, 6, 4, 1];
      for (let pass = 0; pass < 2; pass++) {
        const sm = pts.map((p, i) => {
          let s = 0, w = 0;
          K.forEach((k, j) => { const q = pts[i + j - 2]; if (q) { s += q[1] * k; w += k; } });
          return [p[0], s / w];
        });
        sm.forEach((p, i) => { pts[i] = p; });
      }
      const maxD = Math.max(...pts.map((p) => p[1])) || 1;
      const yOf = (d) => base - (d / maxD) * plotH;
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`).join('');
      svg.append(svgEl('path', { d: `${line}L${xOf(hi)},${base}L${xOf(lo)},${base}Z`, class: 'rc-area' }));
      svg.append(svgEl('path', { d: line, class: 'rc-curve' }));
      for (const t of niceTicks(lo, hi, 4)) label(svg, xOf(t), H - 8, fmt(t), 'rc-tick');
    }

    // average: solid hairline; you: accent line + ringed dot. Both labelled on the top row.
    const ax = xOf(norm.average), yx = xOf(v);
    const offChart = norm.kind !== 'discrete' && (v < norm.cdf[0][0] || v > norm.cdf[norm.cdf.length - 1][0]);
    svg.append(svgEl('line', { x1: ax, x2: ax, y1: PLOT.t - 6, y2: base, class: 'rc-avg' }));
    svg.append(svgEl('line', { x1: yx, x2: yx, y1: PLOT.t - 6, y2: base, class: 'rc-you' }));
    svg.append(svgEl('circle', { cx: yx, cy: PLOT.t - 6, r: 5, class: 'rc-you-dot' }));
    const youText = offChart ? (yx < W / 2 ? '◀ You' : 'You ▶') : 'You';
    const YOU_W = 30, AVG_W = 48, GAP = 8, need = (YOU_W + AVG_W) / 2 + GAP;
    let avgX = ax;
    if (Math.abs(ax - yx) < need) avgX = ax <= yx ? yx - need : yx + need;
    if (avgX - AVG_W / 2 < 0 || avgX + AVG_W / 2 > W) avgX = ax <= yx ? yx + need : yx - need; // no room: other side
    label(svg, yx, 12, youText, 'rc-you-label', 'middle');
    label(svg, Math.min(W - AVG_W / 2, Math.max(AVG_W / 2, avgX)), 12, 'Average', 'rc-note', 'middle');

    box.append(svg);
    box.append(textLine('rc-src', `Data: ${norm.source}${norm.note ? ' · ' + norm.note : ''}`));
  }

  // ---------- "You vs your past games" ----------
  function renderHistory(box, game, hist) {
    const fmt = game.formatBest || ((x) => String(Math.round(x * 10) / 10));
    const lower = !!game.lowerIsBetter;
    const vals = hist.slice(-SHOW);
    const n = vals.length;
    if (n < 2) {
      box.append(textLine('rc-head', 'First game recorded'));
      box.append(textLine('rc-sub', 'Play again to see how you improve.'));
      return;
    }
    const cur = vals[n - 1];
    const avg = vals.reduce((s, x) => s + x, 0) / n;
    const best = lower ? Math.min(...vals.filter((x) => x > 0)) : Math.max(...vals);
    const better = lower ? cur < avg : cur > avg;
    const same = Math.abs(cur - avg) < 1e-9;
    box.append(textLine('rc-head', same ? 'Right on your average' : better ? 'Better than your average' : 'Below your average'));
    box.append(textLine('rc-sub', `Your last ${n} games · average ${fmt(Math.round(avg * 10) / 10)} · best ${fmt(best)}${lower ? ' (lower is better)' : ''}`));

    const svg = makeSvg(`Your last ${n} results, oldest to newest: ${vals.map(fmt).join(', ')}. Average ${fmt(Math.round(avg * 10) / 10)}.`);
    const L = 30; // left margin holds the "avg" label
    const plotW = W - L - PLOT.r, plotH = H - PLOT.t - PLOT.b, base = H - PLOT.b;
    const maxV = Math.max(...vals, 1e-9);
    const slot = plotW / n, bw = Math.min(24, slot - 2);
    const yOf = (x) => base - (x / maxV) * plotH;
    svg.append(svgEl('line', { x1: L, x2: W - PLOT.r, y1: base, y2: base, class: 'rc-axis' }));
    const tip = svgEl('text', { class: 'rc-tip', 'text-anchor': 'middle', x: 0, y: 0 });
    vals.forEach((x, i) => {
      const cx = L + (i + 0.5) * slot;
      const h = Math.max(2, base - yOf(x));
      const col = column(cx - bw / 2, base - h, bw, h, i === n - 1 ? 'rc-col rc-col-you' : 'rc-col');
      col.append(svgEl('title', {}, fmt(x)));
      // tap a column to read its value
      const hit = svgEl('rect', { x: cx - slot / 2, y: PLOT.t - 10, width: slot, height: plotH + 10, class: 'rc-hit' });
      hit.addEventListener('click', () => {
        tip.textContent = fmt(x);
        tip.setAttribute('x', Math.min(W - 24, Math.max(24, cx)));
        tip.setAttribute('y', Math.max(12, base - h - 6));
      });
      svg.append(col, hit);
    });
    const ay = yOf(avg);
    svg.append(svgEl('line', { x1: L, x2: W - PLOT.r, y1: ay, y2: ay, class: 'rc-avg' }));
    label(svg, L - 4, ay + 4, 'avg', 'rc-note', 'end');
    label(svg, L + (n - 0.5) * slot, H - 8, 'now', 'rc-tick', 'middle');
    label(svg, L + 0.5 * slot, H - 8, n >= SHOW ? 'older' : 'first', 'rc-tick', 'middle');
    svg.append(tip);
    box.append(svg);
    box.append(textLine('rc-src', 'Saved on this phone · tap a bar to see its score'));
  }

  // ---------- entry point ----------
  function render(panel, game, score, hist) {
    if (!panel) return null;
    let box = panel.querySelector('.rc');
    if (!box) {
      box = document.createElement('div');
      box.className = 'rc';
      const btn = panel.querySelector('button');
      if (btn) panel.insertBefore(box, btn); else panel.append(box);
    }
    box.innerHTML = '';
    const norm = (window.NORMS || {})[game.id];
    if (norm) renderPeople(box, norm, norm.toValue ? norm.toValue(score) : score);
    else renderHistory(box, game, hist || load(game.id));
    return box;
  }

  window.Results = { load, record, render, beatShare, monotone };
})();
