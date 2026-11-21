/* Swiss Democracy Lab: where would I fit? A commune finder from official statistics.
   One question at a time, then all answers as sliders (with stars for what matters most), then every commune of
   Switzerland coloured by how well it fits the answers. Every value comes from data/*.json, built by the pipeline
   (pipeline/run.py FIT_EXPORTS) from the MotherDuck database; nothing is typed into the text.
   Embed: <div id="commune-finder" data-base="https://thomassie.me/<repo>/"></div> plus d3 v7 and this script.
   No cookies, no storage: the answers live in the page address (#a=...), so a link opens the same answers. */
(function () {
  'use strict';

  const root = document.getElementById('commune-finder');
  if (!root || typeof d3 === 'undefined') return;
  const BASE = root.dataset.base ? root.dataset.base.replace(/\/?$/, '/') : '';
  root.classList.add('fit');
  if (root.dataset.layout === 'standalone') root.classList.add('fit--standalone');

  const DOT = '<svg class="title-dot" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><circle cx="5" cy="5" r="5"/></svg>';
  const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.2l2.35 4.9 5.35.72-3.9 3.73.95 5.33L10 14.3l-4.75 2.58.95-5.33-3.9-3.73 5.35-.72z"/></svg>';
  root.innerHTML = `<svg class="fit-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <pattern id="fit-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect class="fit-hatch-bg" width="5" height="5"/><line class="fit-hatch-line" x1="0" y1="0" x2="0" y2="5"/></pattern>
</defs></svg>
<div class="masthead wrap">
  <div class="masthead__text">
    <p class="eyebrow">Swiss Democracy Lab</p>
    <h1>Where Would I Fit?${DOT}</h1>
    <p class="lede">Up in a mountain village, or close to a city but not in it? Answer up to 21 questions about what matters to you, and every commune in Switzerland gets a score for how well it fits, from official statistics.</p>
  </div>
</div>
<div class="wrap">
  <section class="block" id="fit-ask" aria-labelledby="fit-h-ask">
    <div class="block__rail">
      <h2 id="fit-h-ask">The questions${DOT}</h2>
      <p>One question at a time. Answer only what matters to you: a question you skip doesn&rsquo;t count, and the score works with a single answer too.</p>
      <p>Each answer is a direction (fewer or more, closer or farther) and how much it matters. You can change every answer afterwards and star the ones that matter most.</p>
    </div>
    <div class="block__body">
      <div class="fit-q" id="fit-q" tabindex="-1" aria-live="polite"></div>
    </div>
  </section>

  <section class="block" id="fit-answers-block" aria-labelledby="fit-h-answers" hidden>
    <div class="block__rail">
      <h2 id="fit-h-answers">Your answers${DOT}</h2>
      <p>Move a slider to change an answer: towards one end for fewer or more, further out when it matters a lot, the middle when it doesn&rsquo;t matter. A star counts an answer double.</p>
      <p class="note" id="fit-answers-note"></p>
      <div class="fit-act"><button type="button" class="fit-link" id="fit-again">Answer the questions again</button>
        <button type="button" class="fit-link" id="fit-clear">Clear all answers</button></div>
    </div>
    <div class="block__body">
      <div class="fit-answers" id="fit-answers"></div>
    </div>
  </section>

  <section class="block" id="fit-map-block" aria-labelledby="fit-h-map" hidden>
    <div class="block__rail">
      <h2 id="fit-h-map">Where you would fit${DOT}</h2>
      <p>Every commune, coloured by its score for your answers: the stronger the shade, the better it fits. Each shade holds a tenth of the communes shown, so the strongest marks the tenth that fit best. The score compares communes with each other: it says which fit better, not that any is a perfect place.</p>
      <p id="fit-map-text"></p>
      <p class="note">Values describe a commune as a whole, mostly as averages over the people who live there. They say nothing about a particular street, and nothing about any one person.</p>
    </div>
    <div class="block__body">
      <div class="fit-filters">
        <div class="seg" id="fit-langs" role="group" aria-label="Language regions"></div>
        <label class="fit-pick" for="fit-canton"><span>Canton</span><select id="fit-canton"></select></label>
        <label class="fit-pick" for="fit-min"><span>Minimum score</span><select id="fit-min"></select></label>
      </div>
      <div class="fit-key" id="fit-key"></div>
      <div class="fit-tools">
        <label class="fit-find" for="fit-search"><svg class="fit-mag" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.75"/><line x1="10" y1="10" x2="14.5" y2="14.5"/></svg><span>Find a commune</span>
          <input id="fit-search" type="search" list="fit-names" autocomplete="off" placeholder="e.g. Andermatt"></label>
        <datalist id="fit-names"></datalist>
        <div class="fit-zoom" role="group" aria-label="Zoom">
          <button type="button" id="fit-zin" aria-label="Zoom in">+</button>
          <button type="button" id="fit-zout" aria-label="Zoom out">&minus;</button>
          <span class="fit-zsep" aria-hidden="true"></span>
          <button type="button" id="fit-zreset">Reset</button>
        </div>
      </div>
      <div class="chart fit-map" id="fit-map"></div>
      <p class="note" id="fit-map-note"></p>
      <div class="fit-tophead"><h3 class="fit-grp" id="fit-h-top">Best fits</h3>
        <label class="fit-topn" for="fit-topn"><span>Show the top</span><input id="fit-topn" type="number" inputmode="numeric" min="1" max="200" step="1" value="10"></label></div>
      <div class="fit-topbox" id="fit-topbox"><ol class="fit-top" id="fit-top" aria-labelledby="fit-h-top"></ol></div>
    </div>
  </section>
</div>
<footer class="wrap foot">
  <h2>How the score works</h2>
  <div>
    <ul id="fit-method"></ul>
    <p class="credit" id="fit-credit"></p>
  </div>
</footer>`;
  if (root.dataset.header === 'false') root.querySelector('.masthead').remove();

  // ---------- helpers ----------
  const $ = (sel) => root.querySelector(sel.replace(/#([\w-]+)/g, '#fit-$1'));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = d3.format(',');
  const CANTONS = ['', 'Zürich', 'Bern', 'Luzern', 'Uri', 'Schwyz', 'Obwalden', 'Nidwalden', 'Glarus', 'Zug', 'Fribourg', 'Solothurn',
    'Basel-Stadt', 'Basel-Landschaft', 'Schaffhausen', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'St. Gallen', 'Graubünden',
    'Aargau', 'Thurgau', 'Ticino', 'Vaud', 'Valais', 'Neuchâtel', 'Genève', 'Jura'];
  const ABBR = ['', 'ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI',
    'VD', 'VS', 'NE', 'GE', 'JU'];
  const LANGS = [[1, 'German'], [2, 'French'], [3, 'Italian'], [4, 'Romansh']];
  const HOUSEHOLDS = [['Single person', 'a single person'], ['Couple without children', 'a married couple with one income, no children'],
    ['Family, one income', 'a married couple with one income and two children'], ['Family, two incomes', 'a married couple with two incomes and two children']];
  const LEVEL_WORD = { 1: 'a little', 2: 'matters a lot' };

  async function getJSON(path) {
    const r = await fetch(BASE + path + '?m=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' });
    if (!r.ok) throw new Error('Could not load ' + BASE + path + ' (' + r.status + ').');
    return r.json();
  }
  function onWidth(el, draw) {
    let last = -1;
    const run = () => { const w = Math.round(el.clientWidth); if (w && w !== last) { last = w; draw(); } };
    if ('ResizeObserver' in window) new ResizeObserver(() => requestAnimationFrame(run)).observe(el);
    else window.addEventListener('resize', run);
    run();
    return () => { last = -1; run(); };
  }
  function tooltip(container) {
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.hidden = true;
    tip.setAttribute('role', 'status');
    container.appendChild(tip);
    return {
      show(html, x, y) {
        tip.innerHTML = html;
        tip.hidden = false;
        const cw = container.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = x + 14;
        if (left + tw > cw) left = Math.max(0, x - tw - 14);
        let top = y - th - 12;
        if (top < 0) top = y + 16;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      },
      hide() { tip.hidden = true; },
    };
  }
  function topoReader(topo) {
    const t = topo.transform;
    const arcs = topo.arcs.map((a) => {
      if (!t) return a;
      let x = 0, y = 0;
      return a.map(([dx, dy]) => { x += dx; y += dy; return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]; });
    });
    const arc = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
    const ring = (ids) => { const pts = []; ids.forEach((i, k) => { const a = arc(i); pts.push(...(k ? a.slice(1) : a)); }); return pts; };
    const polys = (g) => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []);
    return {
      features(obj) {
        return obj.geometries.filter((g) => g.arcs).map((g) => ({
          type: 'Feature', id: g.id, properties: g.properties || {},
          geometry: { type: 'MultiPolygon', coordinates: polys(g).map((p) => p.map(ring)) },
        }));
      },
      mesh(obj, keep) {
        const owners = new Map();
        obj.geometries.forEach((g) => polys(g).forEach((p) => p.forEach((r) => r.forEach((i) => {
          const k = i < 0 ? ~i : i;
          if (!owners.has(k)) owners.set(k, []);
          owners.get(k).push(g);
        }))));
        const lines = [];
        owners.forEach((gs, k) => { if (keep(gs[0], gs[1] || gs[0])) lines.push(arcs[k]); });
        return { type: 'MultiLineString', coordinates: lines };
      },
    };
  }

  // ---------- data ----------
  let F = [], C = [], SOURCES = [], SUMMARY = {}, GEO = null, BYID = new Map(), TAX = -1, EDU = -1;
  const PCT = [];       // PCT[i][commune index]: rank of the commune on feature i, 0 (lowest) to 1 (highest); tax: per household
  const TAXPCT = [];

  function ranks(values) {        // mid-ranks of the non-missing values, scaled to (0, 1)
    const idx = values.map((v, i) => [v, i]).filter(([v]) => v != null && Number.isFinite(v)).sort((a, b) => a[0] - b[0]);
    const out = new Array(values.length).fill(null), n = idx.length;
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const r = ((i + j) / 2 + 0.5) / n;
      for (let k = i; k <= j; k++) out[idx[k][1]] = r;
      i = j + 1;
    }
    return out;
  }

  // ---------- state: the answers ----------
  // a[i]: -2 .. 2 (0 = doesn't matter), star[i], the language regions shown, the canton (0 = all), the household
  const S = { a: [], star: [], langs: new Set([1, 2, 3, 4]), canton: 0, household: 2, min: 0, top: 10, step: -1, started: false, pinned: null };
  const TOPMAX = 200;   // the longest list of best fits
  const MINS = [0, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];   // the minimum score: 0 = none
  const CODES = 'abcde';      // the address: one letter per question, -2 .. 2; upper case = starred
  function writeHash() {
    if (!F.length) return;
    const a = S.a.map((v, i) => (S.star[i] ? CODES[v + 2].toUpperCase() : CODES[v + 2])).join('');
    const parts = ['a=' + a];
    if (S.langs.size < 4) parts.push('l=' + [...S.langs].sort().join(''));
    if (S.canton) parts.push('k=' + ABBR[S.canton]);
    if (S.household !== 2) parts.push('h=' + S.household);
    if (S.min) parts.push('m=' + S.min);
    if (S.top !== 10) parts.push('n=' + S.top);
    const h = '#' + parts.join('&');
    if (location.hash !== h) try { history.replaceState(null, '', h); } catch (e) { /* a sandboxed frame may refuse; the page works without it */ }
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const a = p.get('a');
    if (!a || a.length !== F.length || !/^[a-eA-E]+$/.test(a)) return false;
    S.a = [...a].map((c) => CODES.indexOf(c.toLowerCase()) - 2);
    S.star = [...a].map((c, i) => c !== c.toLowerCase() && S.a[i] !== 0);
    const l = p.get('l');
    if (l && /^[1-4]+$/.test(l)) S.langs = new Set([...l].map(Number));
    const k = ABBR.indexOf((p.get('k') || '').toUpperCase());
    S.canton = k > 0 ? k : 0;
    const hh = Number(p.get('h'));
    if ([0, 1, 2, 3].includes(hh) && p.get('h') !== null) S.household = hh;
    const m = Number(p.get('m'));
    if (MINS.includes(m)) S.min = m;
    const n = Number(p.get('n'));
    if (Number.isInteger(n) && n >= 1 && n <= TOPMAX) S.top = n;
    return true;
  }
  const answered = () => S.a.some((v) => v !== 0);
  const weight = (i) => Math.abs(S.a[i]) * (S.star[i] ? 2 : 1);

  // ---------- values ----------
  const UNIT = {
    density: (v) => num(Math.round(v)) + ' per km²', elevation: (v) => num(Math.round(v)) + ' m', city: (v) => Math.round(v) + ' min',
    income: (v) => 'CHF ' + num(Math.round(v / 100) * 100), growth: (v) => (v > 0 ? '+' : '') + v.toFixed(1) + '%',
  };
  const DIST = new Set(['forest', 'school', 'doctor', 'grocery']);
  function fmt(i, v) {
    if (v == null || !Number.isFinite(v)) return '–';
    const f = F[i];
    if (UNIT[f.code]) return UNIT[f.code](v);
    if (DIST.has(f.code)) return v < 1000 ? Math.round(v / 10) * 10 + ' m' : (v / 1000).toFixed(1) + ' km';
    if (f.code === 'sunshine') return v.toFixed(0) + '%';
    return v.toFixed(f.decimals) + '%';
  }
  const valueOf = (c, i) => (i === TAX ? c.t[S.household] : c.v[i]);
  const pctOf = (ci, i) => (i === TAX ? TAXPCT[S.household][ci] : PCT[i][ci]);

  // ---------- the score ----------
  function scores() {
    const w = F.map((_, i) => weight(i)), total = w.reduce((a, b) => a + b, 0);
    return C.map((c, ci) => {
      if (!total) return null;
      let s = 0, ws = 0;
      w.forEach((wi, i) => {
        if (!wi) return;
        const p = pctOf(ci, i);
        if (p == null) return;
        s += wi * (S.a[i] > 0 ? p : 1 - p);
        ws += wi;
      });
      return ws >= total / 2 ? (100 * s) / ws : null;   // a commune missing half of what matters gets no score
    });
  }
  const shown = (c) => S.langs.has(c.l) && (!S.canton || ABBR.indexOf(c.k) === S.canton);
  let SC = [], RANK = new Map(), CLS = new Map(), NSHOWN = 0;
  function rescore() {
    SC = scores();
    const order = C.map((c, ci) => ci).filter((ci) => SC[ci] != null && shown(C[ci]))
      .sort((a, b) => SC[b] - SC[a] || C[b].r - C[a].r);
    RANK = new Map(order.map((ci, k) => [ci, k + 1]));
    // map shades: tenths of the communes shown, by how many score lower (equal scores share a shade)
    const asc = order.map((ci) => SC[ci]).reverse(), n = asc.length;
    CLS = new Map(order.map((ci) => [ci, Math.min(9, Math.floor((10 * d3.bisectLeft(asc, SC[ci])) / n))]));
    NSHOWN = C.filter(shown).length;
    return order;
  }

  // ---------- what an answer means (the "i" on each question) ----------
  function quantile(i, q) {
    const vals = C.map((c) => valueOf(c, i)).filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
    return vals.length ? d3.quantileSorted(vals, q) : null;
  }
  function infoHtml(i) {
    const f = F[i];
    const p10 = quantile(i, 0.1), p50 = quantile(i, 0.5), p90 = quantile(i, 0.9);
    const hh = i === TAX ? ' (' + HOUSEHOLDS[S.household][1] + ')' : '';
    return '<p><b>' + esc(f.less_word) + '</b> puts the communes with the lowest values first, <b>' + esc(f.more_word) + '</b> those with the highest. ' +
      'The value: ' + esc(f.definition.replace(/\.$/, '')) + hh + '.</p>' +
      '<p>How the communes compare: a tenth are below ' + fmt(i, p10) + ', half below ' + fmt(i, p50) + ', and a tenth above ' + fmt(i, p90) + '.</p>' +
      '<p>There is no fixed limit: the score uses each commune&rsquo;s rank among all ' + num(C.length) + ' communes. &ldquo;Matters a lot&rdquo; counts twice as much as &ldquo;a little&rdquo;; &ldquo;Doesn&rsquo;t matter&rdquo; leaves the question out.</p>';
  }
  const INFO_BTN = '<button type="button" class="fit-info" aria-expanded="false" aria-controls="fit-info-pop" aria-label="What the answers mean">i</button>';

  // ---------- the questions ----------
  const STEPS = () => 1 + F.length;        // step 0: language regions; then one per feature
  function optLabel(f, v) {
    if (v === 0) return '<span>Doesn&rsquo;t matter</span>';
    return '<span>' + esc(v < 0 ? f.less_word : f.more_word) + '</span><small>' + LEVEL_WORD[Math.abs(v)] + '</small>';
  }
  function renderQuestion(focus) {
    const el = $('#q');
    const n = STEPS();
    if (S.step < 0) {
      el.innerHTML = '<p class="fit-q__text">' + F.length + ' questions about the place you would like to live in: the surroundings, getting around, everyday life, the people, politics, housing and money.</p>' +
        '<div class="fit-act"><button type="button" class="fit-btn fit-btn--main" data-go="0">Start the questions</button>' +
        '<button type="button" class="fit-link" data-go="end">Skip to the map</button></div>';
    } else if (S.step >= n) {
      el.innerHTML = '<p class="fit-q__text">' + (answered() ? 'Done. Change any answer below, star what matters most, and see where you would fit on the map.'
        : 'You skipped every question, so the map shows no scores yet. Move any slider below to start.') + '</p>' +
        '<div class="fit-act"><button type="button" class="fit-btn" data-go="0">Answer the questions again</button>' +
        '<button type="button" class="fit-link" data-go="map">Go to the map</button></div>';
    } else {
      const bar = '<div class="fit-progress"><span>Question ' + (S.step + 1) + ' of ' + n + '</span><span class="fit-progress__bar" aria-hidden="true"><i style="width:' +
        ((100 * S.step) / n).toFixed(1) + '%"></i></span></div>';
      const nav = '<div class="fit-act">' + (S.step > 0 ? '<button type="button" class="fit-btn" data-go="back">Back</button>' : '') +
        '<button type="button" class="fit-btn' + (S.step === 0 ? ' fit-btn--main' : '') + '" data-go="next">' + (S.step === 0 ? 'Next' : 'Skip') + '</button>' +
        '<button type="button" class="fit-link" data-go="end">Show the map now</button></div>';
      if (S.step === 0) {
        el.innerHTML = bar + '<p class="eyebrow">Where</p><h2 id="fit-qh">Language regions</h2><p class="fit-q__text">Which language regions would you consider? The map greys out the others.</p>' +
          '<div class="fit-langs">' + LANGS.map(([l, name]) => '<label class="fit-check"><input type="checkbox" value="' + l + '"' + (S.langs.has(l) ? ' checked' : '') + '>' +
          name + '</label>').join('') + '</div>' + nav;
      } else {
        const i = S.step - 1, f = F[i];
        el.innerHTML = bar + '<p class="eyebrow">' + esc(f.grp) + '</p><h2 id="fit-qh">' + esc(f.label) + '</h2><p class="fit-q__text">' + esc(f.question) + ' ' + INFO_BTN + '</p>' +
          '<div class="fit-info__pop" id="fit-info-pop" role="tooltip" hidden>' + infoHtml(i) + '</div>' +
          (i === TAX ? '<div class="fit-household"><label class="fit-pick" for="fit-hh"><span>Household</span><select id="fit-hh">' +
            HOUSEHOLDS.map(([h], k) => '<option value="' + k + '"' + (k === S.household ? ' selected' : '') + '>' + h + '</option>').join('') + '</select></label></div>' : '') +
          '<div class="fit-opts" role="group" aria-labelledby="fit-qh">' + [-2, -1, 0, 1, 2].map((v) => '<button type="button" class="fit-opt" data-v="' + v + '" aria-pressed="' +
          (S.a[i] === v && S.started) + '">' + optLabel(f, v) + '</button>').join('') + '</div>' +
          '<p class="fit-q__def">' + esc(f.definition) + ' Source: ' + esc(f.source) + '.</p>' + nav;
      }
    }
    if (focus) el.focus({ preventScroll: true });
  }
  function go(to) {
    const n = STEPS();
    if (to === 'next') S.step = Math.min(n, S.step + 1);
    else if (to === 'back') S.step = Math.max(0, S.step - 1);
    else if (to === 'end' || to === 'map') S.step = n;
    else S.step = Number(to);
    S.started = true;
    renderQuestion(true);
    if (S.step >= n) { reveal(); if (to === 'map' || to === 'end') $('#map-block').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    writeHash();
  }
  function bindQuestions() {
    const el = $('#q');
    // the "i": shows on hover and on keyboard focus, a click or tap keeps it open until the next click or Escape
    let kept = false;
    const pop = () => el.querySelector('.fit-info__pop'), btn = () => el.querySelector('.fit-info');
    const openInfo = (open) => {
      const p = pop(), b = btn();
      if (!p || !b) return;
      p.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (!open) return;
      const box = el.getBoundingClientRect(), r = b.getBoundingClientRect();
      p.style.top = Math.round(r.bottom - box.top + 8) + 'px';
      p.style.left = Math.round(Math.max(0, Math.min(r.left - box.left - 16, box.width - p.offsetWidth))) + 'px';
    };
    el.addEventListener('pointerover', (ev) => { if (ev.pointerType === 'mouse' && ev.target.closest('.fit-info')) openInfo(true); });
    el.addEventListener('pointerout', (ev) => { if (ev.pointerType === 'mouse' && ev.target.closest('.fit-info') && !kept) openInfo(false); });
    el.addEventListener('focusin', (ev) => { if (ev.target.closest('.fit-info')) openInfo(true); });
    el.addEventListener('focusout', (ev) => { if (ev.target.closest('.fit-info') && !kept) openInfo(false); });
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && pop() && !pop().hidden) { kept = false; openInfo(false); } });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (b && b.classList.contains('fit-info')) { kept = !kept || pop().hidden; openInfo(kept); return; }
      if (kept && !ev.target.closest('.fit-info__pop')) { kept = false; openInfo(false); }
      if (!b) return;
      if (b.dataset.go != null) { go(b.dataset.go); return; }
      if (b.dataset.v != null) {
        const i = S.step - 1;
        S.a[i] = Number(b.dataset.v);
        if (!S.a[i]) S.star[i] = false;
        S.started = true;
        refresh();
        go('next');
      }
    });
    el.addEventListener('change', (ev) => {
      if (ev.target.type === 'checkbox') {
        const boxes = [...el.querySelectorAll('input[type="checkbox"]')];
        const on = boxes.filter((b) => b.checked).map((b) => Number(b.value));
        if (!on.length) { ev.target.checked = true; return; }   // at least one region
        S.langs = new Set(on);
        refresh();
      }
      if (ev.target.id === 'fit-hh') {
        S.household = Number(ev.target.value); refresh();
        const p = el.querySelector('.fit-info__pop');
        if (p && S.step - 1 === TAX) p.innerHTML = infoHtml(TAX);
      }
    });
  }

  // ---------- your answers ----------
  function renderAnswers() {
    const el = $('#answers');
    let grp = null, html = '';
    F.forEach((f, i) => {
      if (f.grp !== grp) { grp = f.grp; html += '<p class="fit-grp">' + esc(grp) + '</p>'; }
      html += '<div class="fit-row" data-i="' + i + '"><div class="fit-row__label" id="fit-rl' + i + '">' + esc(f.label) + '<small></small></div>' +
        '<div class="fit-slider"><input type="range" min="-2" max="2" step="1" value="' + S.a[i] + '" aria-labelledby="fit-rl' + i + '">' +
        '<div class="fit-slider__ticks" aria-hidden="true">' + [0, 25, 50, 75, 100].map((x) => '<i style="left:' + x + '%"></i>').join('') + '</div>' +
        '<div class="fit-slider__ends" aria-hidden="true"><span>' + esc(f.less_word) + '</span><span>doesn&rsquo;t matter</span><span>' + esc(f.more_word) + '</span></div></div>' +
        '<button type="button" class="fit-star" aria-label="Counts double: ' + esc(f.label) + '" aria-pressed="false">' + STAR + '</button>' +
        (i === TAX ? '<div class="fit-row__extra"><label class="fit-pick" for="fit-hh2"><span>Household</span><select id="fit-hh2">' +
          HOUSEHOLDS.map(([h], k) => '<option value="' + k + '">' + h + '</option>').join('') + '</select></label></div>' : '') + '</div>';
    });
    el.innerHTML = html;
    el.addEventListener('input', (ev) => {
      const row = ev.target.closest('.fit-row');
      if (!row || ev.target.type !== 'range') return;
      const i = Number(row.dataset.i);
      S.a[i] = Number(ev.target.value);
      if (!S.a[i]) S.star[i] = false;
      refresh();
    });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('.fit-star');
      if (!b || b.disabled) return;
      const i = Number(b.closest('.fit-row').dataset.i);
      S.star[i] = !S.star[i];
      refresh();
    });
    el.addEventListener('change', (ev) => { if (ev.target.id === 'fit-hh2') { S.household = Number(ev.target.value); refresh(); } });
  }
  function syncAnswers() {
    root.querySelectorAll('.fit-row').forEach((row) => {
      const i = Number(row.dataset.i), f = F[i], v = S.a[i];
      const input = row.querySelector('input');
      if (Number(input.value) !== v) input.value = v;
      input.setAttribute('aria-valuetext', v === 0 ? 'Doesn’t matter' : (v < 0 ? f.less_word : f.more_word) + ', ' + LEVEL_WORD[Math.abs(v)]);
      row.classList.toggle('is-off', v === 0);
      const ends = row.querySelectorAll('.fit-slider__ends span');
      ends[0].classList.toggle('is-on', v < 0); ends[1].classList.toggle('is-on', v === 0); ends[2].classList.toggle('is-on', v > 0);
      row.querySelector('small').textContent = v === 0 ? 'doesn’t count' : LEVEL_WORD[Math.abs(v)] + (S.star[i] ? ', counts double' : '');
      const star = row.querySelector('.fit-star');
      star.disabled = v === 0;
      star.setAttribute('aria-pressed', String(!!S.star[i]));
      const hh = row.querySelector('#fit-hh2');
      if (hh) hh.value = String(S.household);
    });
    const n = S.a.filter((v) => v).length, st = S.star.filter(Boolean).length;
    $('#answers-note').textContent = n ? n + ' of ' + F.length + ' answers count' + (st ? ', ' + st + ' with a star' : '') + '.' : 'No answer counts yet.';
  }

  // ---------- the map ----------
  function mapHeight(W, feats) {
    const all = { type: 'FeatureCollection', features: feats };
    const probe = d3.geoIdentity().reflectY(true).fitWidth(W, all);
    const b = d3.geoPath(probe).bounds(all);
    return Math.round(Math.min(b[1][1] - b[0][1], Math.max(320, W * 0.75)));
  }
  const M = { view: null, shapes: null, redraw: null };
  const scoreClass = (ci) => (CLS.has(ci) ? 'fit-s' + CLS.get(ci) : 'fit-sx');
  function tipHtml(ci) {
    const c = C[ci];
    const head = '<p class="tt__meta">' + esc(CANTONS[ABBR.indexOf(c.k)] || c.k) + ' · ' + (LANGS.find(([l]) => l === c.l) || [0, ''])[1] + '-speaking · ' + num(c.r) + ' residents</p>' +
      '<p class="tt__title">' + esc(c.n) + '</p>';
    if (!shown(c)) return head + '<p class="tt__note">Outside the regions and cantons you chose.</p>';
    // most important answers first; among equally weighted ones, where this commune fits best first
    const fitOf = (i) => { const p = pctOf(ci, i); return p == null ? -1 : S.a[i] > 0 ? p : 1 - p; };
    const on = F.map((_, i) => i).filter((i) => weight(i)).sort((a, b) => weight(b) - weight(a) || fitOf(b) - fitOf(a) || a - b);
    const score = SC[ci] == null ? '<p class="tt__note">No score: values are missing for half or more of what you weighted.</p>'
      : '<div class="tt__score"><b>' + Math.round(SC[ci]) + '</b><span>of 100 · ' + num(RANK.get(ci)) + ' of ' + num(RANK.size) + ' communes shown</span></div>';
    const list = (on.length ? on : [0, 1, 5, 12, 15, 16]).slice(0, 12);
    const rows = list.map((i) => {
      const p = pctOf(ci, i);
      const fit = weight(i) && p != null ? (S.a[i] > 0 ? p : 1 - p) : null;
      const dot = fit == null ? '' : '<i class="fit-s' + Math.min(9, Math.floor(fit * 10)) + '"></i>';
      const v = valueOf(c, i);   // education of the smallest communes: published as a 20-point class only
      const shownValue = i === EDU && c.ec && v != null ? Math.max(0, Math.round(v - 10)) + '–' + Math.min(100, Math.round(v + 10)) + '%' : fmt(i, v);
      return '<div><dt>' + dot + esc(F[i].label) + (S.star[i] ? '<span class="tt__star" aria-label="starred">★</span>' : '') + '</dt><dd>' + shownValue + '</dd></div>';
    }).join('');
    const notes = [];
    if (list.includes(EDU) && c.ec) notes.push('Higher education: fewer than 100 residents aged 25 to 64, so the FSO publishes only a range; the score uses its middle.');
    if (on.includes(TAX) && c.tm) notes.push('Tax: this commune was formed by a merger after 2018; the figure averages the communes it was made of.');
    if (on.length > 12) notes.push(on.length - 12 + ' more answers count in the score.');
    if (!on.length) notes.push('Answer a question to see a score.');
    return head + (on.length ? score : '') + '<dl class="tt__rows">' + rows + '</dl>' + (notes.length ? '<p class="tt__note">' + notes.join(' ') + '</p>' : '');
  }
  function drawMap(el) {
    const W = Math.round(el.clientWidth);
    if (!W || !GEO) return;
    el.querySelectorAll('svg, .fit-map__msg').forEach((n) => n.remove());
    const tip = el._tip || (el._tip = tooltip(el));
    tip.hide();
    const H = mapHeight(W, GEO.communes);
    const proj = d3.geoIdentity().reflectY(true).fitExtent([[2, 2], [W - 2, H - 2]], { type: 'FeatureCollection', features: GEO.communes });
    const path = d3.geoPath(proj);
    const svg = d3.select(el).insert('svg', ':first-child').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
    const g = svg.append('g');
    const shapes = g.append('g').selectAll('path').data(GEO.communes).join('path').attr('d', path);
    g.append('g').selectAll('path').data(GEO.lakes).join('path').attr('class', 'fit-lake').attr('d', path);
    g.append('path').attr('class', 'fit-cantonlines').attr('d', path(GEO.cantonLines));
    g.append('path').attr('class', 'fit-outline').attr('d', path(GEO.outline));
    const hl = g.append('path').attr('class', 'focus-ring');
    const pin = g.append('path').attr('class', 'fit-pin');
    // line widths in map units, so that they grow more slowly than the zoom: commune borders, canton lines, the border of
    // Switzerland, and the outline of the hovered or kept commune (red), which stays a little wider than all of them
    const outline = (k) => {
      const node = svg.node();
      node.style.setProperty('--fit-bw', Math.max(0.3 / k, 0.15) + 'px');
      node.style.setProperty('--fit-cw', Math.max(0.7 / k, 0.22) + 'px');
      node.style.setProperty('--fit-ow', Math.max(0.9 / k, 0.28) + 'px');
      node.style.setProperty('--fit-pw', Math.max(1.5 / k, 0.3) + 'px');
    };
    outline(1);
    M.shapes = shapes;
    const show = (ev, f) => {
      const ci = BYID.get(f.id);
      if (ci == null) return;
      hl.attr('d', path(f)).attr('visibility', 'visible');
      const [px, py] = d3.pointer(ev, el);
      tip.show(tipHtml(ci), px, py);
    };
    const hide = () => { tip.hide(); hl.attr('visibility', 'hidden'); };
    let pinned = null;
    shapes.on('pointermove', (ev, f) => { if (!pinned && ev.pointerType === 'mouse') show(ev, f); })
      .on('click', (ev, f) => { if (pinned === f) { pinned = null; hide(); pin.attr('d', null); } else { pinned = f; show(ev, f); pin.attr('d', path(f)); } });
    svg.on('pointerleave', () => { if (!pinned) hide(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) { pinned = null; hide(); pin.attr('d', null); } });
    const zoom = d3.zoom().scaleExtent([1, 32]).translateExtent([[0, 0], [W, H]])
      .filter((ev) => (ev.type === 'wheel' ? ev.ctrlKey || ev.metaKey : ev.type === 'touchstart' ? ev.touches.length > 1 : !ev.button))
      .on('zoom', (ev) => { g.attr('transform', ev.transform); outline(ev.transform.k); tip.hide(); });
    svg.call(zoom).on('dblclick.zoom', null);
    const zoomTo = (f) => {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      const k = Math.max(1, Math.min(8, 0.25 / Math.max((x1 - x0) / W, (y1 - y0) / H)));
      const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      svg.transition().duration(600).call(zoom.transform, t).on('end', () => {
        pinned = f;
        pin.attr('d', path(f));
        hl.attr('d', path(f)).attr('visibility', 'visible');
        const p = t.apply(path.centroid(f));
        tip.show(tipHtml(BYID.get(f.id)), p[0], p[1]);
      });
    };
    M.view = { zoom, svg, zoomTo, refreshTip: () => { if (pinned) { const ci = BYID.get(pinned.id); tip.show(tipHtml(ci), parseFloat(el._tip && el.querySelector('.tooltip').style.left) || 0, 0); } } };
    paintMap();
  }
  function paintMap() {
    if (!M.shapes) return;
    M.shapes.attr('class', (f) => {
      const ci = BYID.get(f.id);
      if (ci == null) return 'fit-town fit-sx';
      if (!shown(C[ci])) return 'fit-town fit-sx is-out';
      if (S.min && SC[ci] != null && SC[ci] < S.min) return 'fit-town fit-sx is-below';
      return 'fit-town ' + scoreClass(ci);
    });
    const el = $('#map');
    el.querySelectorAll('.fit-map__msg').forEach((n) => n.remove());
    if (!answered()) {
      const m = document.createElement('p');
      m.className = 'fit-map__msg';
      m.textContent = 'Answer at least one question, or move a slider above, to colour the map.';
      el.appendChild(m);
    }
    const svg = el.querySelector('svg');
    if (svg) svg.setAttribute('aria-label', 'Map of Switzerland’s communes coloured by their score for your answers.' + (TOP.length ? ' Best fit: ' + C[TOP[0]].n + '.' : ''));
  }
  function renderKey() {
    const ramp = '<span class="fit-ramp"><span class="fit-ramp__end">Fits less</span>' + d3.range(10).map((k) => '<i class="fit-s' + k + '"></i>').join('') +
      '<span class="fit-ramp__end">Fits better</span></span>';
    $('#key').innerHTML = ramp + (S.min ? '<span><i class="fit-sw fit-sw--below"></i>Below ' + S.min + '</span>' : '') +
      '<span><i class="fit-sw fit-sw--out"></i>Outside your choice</span><span><i class="fit-sw fit-sw--none"></i>No score</span>';
  }
  let TOP = [];
  function renderTop(order) {
    const reach = S.min ? order.filter((ci) => SC[ci] >= S.min) : order;
    TOP = reach.slice(0, S.top);
    $('#top').innerHTML = TOP.length ? TOP.map((ci) => '<li><button type="button" data-id="' + C[ci].id + '"><span class="fit-top__name">' + esc(C[ci].n) + '<small>' + C[ci].k +
      '</small></span><span class="fit-top__score">' + Math.round(SC[ci]) + '</span></button></li>').join('')
      : '<li class="note">' + (S.min && order.length ? 'No commune reaches ' + S.min + '. Lower the minimum score to see the best fits.' : 'No scores yet.') + '</li>';
    const sel = [...S.langs].length < 4 || S.canton ? ' among the communes you chose' : '';
    const w = F.map((_, i) => i).filter((i) => weight(i));
    $('#map-text').textContent = (TOP.length ? 'Best fit' + sel + ': ' + C[TOP[0]].n + ' (' + C[TOP[0]].k + '), with ' + Math.round(SC[TOP[0]]) + ' of 100, from ' +
      w.length + (w.length === 1 ? ' answer.' : ' answers.') : '') +
      (S.min && order.length ? ' ' + (reach.length === 1 ? 'One commune scores ' : num(reach.length) + ' communes score ') + S.min + ' or more.' : '');
    $('#map-note').textContent = num(NSHOWN) + ' of ' + num(C.length) + ' communes in your choice of regions and cantons. Zoom with the buttons, by pinching, or with Ctrl or ⌘ and the scroll wheel; tap or click a commune to keep its values.';
  }

  // ---------- everything after a change ----------
  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    $('#answers-block').hidden = false;
    $('#map-block').hidden = false;
    if (!M.redraw) M.redraw = onWidth($('#map'), () => drawMap($('#map')));
  }
  function refresh() {
    const order = rescore();
    syncAnswers();
    renderKey();
    renderTop(order);
    paintMap();
    root.querySelectorAll('#fit-langs button').forEach((b) => b.setAttribute('aria-pressed', String(S.langs.has(Number(b.dataset.l)))));
    $('#canton').value = String(S.canton);
    $('#min').value = String(S.min);
    if (document.activeElement !== $('#topn')) $('#topn').value = String(S.top);
    writeHash();
  }
  function bindMap() {
    $('#langs').innerHTML = LANGS.map(([l, name]) => '<button type="button" data-l="' + l + '" aria-pressed="true">' + name + '</button>').join('');
    $('#langs').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      const l = Number(b.dataset.l);
      if (S.langs.has(l) && S.langs.size === 1) return;
      if (S.langs.has(l)) S.langs.delete(l); else S.langs.add(l);
      refresh();
    });
    $('#canton').innerHTML = '<option value="0">All cantons</option>' + CANTONS.map((n, k) => (k ? [n, k] : null)).filter(Boolean)
      .sort((a, b) => a[0].localeCompare(b[0], 'de')).map(([n, k]) => '<option value="' + k + '">' + n + '</option>').join('');
    $('#canton').addEventListener('change', (ev) => { S.canton = Number(ev.target.value); refresh(); });
    $('#min').innerHTML = MINS.map((m) => '<option value="' + m + '">' + (m ? m + ' or more' : 'None') + '</option>').join('');
    $('#min').addEventListener('change', (ev) => { S.min = Number(ev.target.value); refresh(); });
    // how many best fits: any whole number from 1 to 200; the list follows as you type, a wrong entry falls back on leaving
    const topn = $('#topn');
    const setTop = (final) => {
      const n = Math.round(Number(topn.value));
      if (Number.isFinite(n) && n >= 1) { S.top = Math.min(TOPMAX, n); refresh(); }
      if (final) topn.value = String(S.top);
    };
    topn.addEventListener('input', () => setTop(false));
    topn.addEventListener('change', () => setTop(true));
    topn.addEventListener('blur', () => setTop(true));
    const names = new Map(C.map((c) => [c.n, c.id]));
    $('#names').innerHTML = [...names.keys()].sort((a, b) => a.localeCompare(b, 'de')).map((n) => '<option value="' + esc(n) + '">').join('');
    const find = $('#search');
    const zoomToId = (id) => { const f = GEO.communes.find((x) => x.id === id); if (f && M.view) M.view.zoomTo(f); };
    const reset = () => M.view && M.view.svg.transition().duration(400).call(M.view.zoom.transform, d3.zoomIdentity);
    find.addEventListener('change', () => { const id = names.get(find.value); if (id) zoomToId(id); });
    find.addEventListener('search', () => { if (!find.value) reset(); });
    find.addEventListener('keydown', (e) => { if (e.key === 'Escape') { find.value = ''; reset(); } });
    $('#zin').addEventListener('click', () => M.view && M.view.svg.transition().duration(300).call(M.view.zoom.scaleBy, 2));
    $('#zout').addEventListener('click', () => M.view && M.view.svg.transition().duration(300).call(M.view.zoom.scaleBy, 0.5));
    $('#zreset').addEventListener('click', reset);
    const box = $('#topbox'), ttop = tooltip(box);
    const showTop = (b) => {
      const ci = BYID.get(Number(b.dataset.id));
      if (ci == null) return;
      ttop.show(tipHtml(ci), 0, 0);
      const t = box.querySelector('.tooltip'), r = b.getBoundingClientRect(), bx = box.getBoundingClientRect();
      const name = b.querySelector('.fit-top__name').getBoundingClientRect();
      const left = Math.min(name.right - bx.left + 24, bx.width - t.offsetWidth);
      const top = Math.max(0, Math.min(r.top - bx.top + r.height / 2 - t.offsetHeight / 2, box.offsetHeight - t.offsetHeight));
      t.style.left = Math.max(0, left) + 'px';
      t.style.top = top + 'px';
    };
    $('#top').addEventListener('pointerover', (ev) => { const b = ev.target.closest('button'); if (b && ev.pointerType === 'mouse') showTop(b); });
    box.addEventListener('pointerleave', () => ttop.hide());
    // keyboard focus only: a tap focuses the button too, and then zooms the map instead
    $('#top').addEventListener('focusin', (ev) => { const b = ev.target.closest('button'); if (b && b.matches(':focus-visible')) showTop(b); });
    $('#top').addEventListener('focusout', () => ttop.hide());
    $('#top').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      ttop.hide();
      $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      zoomToId(Number(b.dataset.id));
    });
    $('#again').addEventListener('click', () => { $('#ask').scrollIntoView({ behavior: 'smooth', block: 'start' }); go(0); });
    $('#clear').addEventListener('click', () => { S.a = S.a.map(() => 0); S.star = S.star.map(() => false); refresh(); });
  }

  // ---------- method ----------
  function renderMethod() {
    const src = new Map(SOURCES.map((s) => [s.source, s]));
    const y = (k) => (src.get(k) ? src.get(k).reference : '');
    const li = [
      'For each answer, every commune is ranked on that feature, from the lowest value (0) to the highest (1); a commune in the middle of all communes gets 0.5. If you want fewer or less of something, the ranking is turned round. The score is the average of these ranks over your answers, weighted: &ldquo;a little&rdquo; counts once, &ldquo;matters a lot&rdquo; twice, and a star doubles either. It is shown from 0 to 100.',
      'So the score compares communes with each other, not with what you wished for: 100 would mean a commune ranks first on every one of your answers, and a commune in the middle on all of them gets 50. With a single answer, the score is the commune&rsquo;s rank on that one feature.',
      'The map shows the scores in ten shades, each holding a tenth of the communes shown (communes with the same score share a shade). So the map always runs through all ten shades, whether your answers leave a few communes clearly ahead or many close together; the score in the tooltip tells which.',
      'A minimum score leaves the communes below it pale on the map and out of the best fits; their scores stay in the tooltip. The list of best fits shows the top 10 unless you ask for more (up to 200).',
      'Every commune counts once, whatever its size. A commune with no value for half or more of what you weighted gets no score; the very smallest communes can have extreme values because a few people decide them.',
      'Values describe a commune as a whole. Distances, elevation, sunshine, noise and public transport are averages over the commune&rsquo;s residents: each inhabited hectare counts with the people who live there. They say nothing about a particular street, and nothing about any one person.',
      'Communes are today&rsquo;s (' + esc(SUMMARY.boundaries_state || '') + '). Figures from earlier commune states are added up onto today&rsquo;s communes. Tax burdens come from 2018, the latest year the Federal Tax Administration published for every commune; communes merged since then get the average of the communes they were made of, weighted by residents.',
      'Higher education: for communes with fewer than 100 residents aged 25 to 64, the Federal Statistical Office publishes the share only as a range of 20 points (for example 20 to 40%). The score uses the middle of the range, and the tooltip shows the range.',
      'The years differ by source: elections 2023; income ' + esc(SUMMARY.income_year || '') + '; residents and citizenships ' + esc(SUMMARY.citizenship_year || '') + '; education ' + esc(y('edu')) +
        '; distances to services ' + esc(y('spop')) + '; travel times ' + esc(y('npvm')) + '; public transport ' + esc(y('oev')) + '; second homes ' + esc(y('zwg')) + '; vacant dwellings ' + esc(y('lwz')) + '; sunshine ' + esc(y('sun')) + '. Turnout: all federal votes from January 2022 to ' + esc(SUMMARY.turnout_until || '') + ' (' + esc(SUMMARY.turnout_vote_days || '') + ' vote days).',
      'Far right: the parties counted as far right on The Far Right in Switzerland (the SVP, EDU, Lega, MCG and SD, after the PopuList). Left: the SP, the Greens, the PdA, solidaritéS and the feminist and green-alternative lists, after the party families of ParlGov; the Green Liberals, whom ParlGov also files as green, are not counted, as they form their own parliamentary group.',
      'Not included: rents and property prices. There are no official figures for every commune: the Federal Statistical Office publishes rents by canton, type of commune and the largest cities, and commune prices come only from private firms.',
      'The page recommends nothing. It shows how communes compare on official statistics for the answers you give.',
    ];
    $('#method').innerHTML = li.map((t) => '<li>' + t + '</li>').join('');
    const fixed = 'Elections: Swiss Federal Statistical Office (BFS), STAT-TAB, National Council elections 2023 by commune. Votes: BFS, results of federal votes by commune (opendata.swiss). ' +
      'Income: Federal Tax Administration (ESTV), <a href="https://www.estv.admin.ch/de/statistiken-natuerliche-personen-gemeinden-1983-bis-heute">Direkte Bundessteuer, nat&uuml;rliche Personen, Gemeinden</a> (own estimate from its income classes). ' +
      'Language regions: BFS commune register. Classification: <a href="https://popu-list.org">The PopuList 4.0</a> (Rooduijn et al. 2024); <a href="https://www.parlgov.org">ParlGov</a> party families (D&ouml;ring, Huber and Manow). ';
    const rest = SOURCES.filter((s) => s.source !== 'areal' && s.source !== 'statpop_ha').map((s) => esc(s.publisher) + ', <a href="' + esc(s.url) + '">' + esc(s.title) + '</a> (' + esc(s.reference) + ')').join('; ');
    $('#credit').innerHTML = fixed + 'Features: ' + rest + '. Inhabited hectares and their communes: BFS, STATPOP and the land use statistics. Boundaries: BFS generalised boundaries (K4). ' +
      'Travel times: Nationales Personenverkehrsmodell (NPVM) des UVEK. Own calculations; the publishers are not responsible for them.';
  }

  // ---------- start ----------
  async function boot() {
    try {
      const [feats, communes, sources, summary, topo] = await Promise.all([getJSON('data/features.json'), getJSON('data/communes.json'),
        getJSON('data/sources.json'), getJSON('data/summary.json'), getJSON('data/communes.topo.json')]);
      F = feats; C = communes; SOURCES = sources; SUMMARY = summary[0] || {};
      TAX = F.findIndex((f) => f.code === 'tax');
      EDU = F.findIndex((f) => f.code === 'education');
      C.forEach((c, ci) => BYID.set(c.id, ci));
      F.forEach((_, i) => PCT.push(ranks(C.map((c) => c.v[i]))));
      [0, 1, 2, 3].forEach((h) => TAXPCT.push(ranks(C.map((c) => c.t[h]))));
      const reader = topoReader(topo), o = topo.objects;
      GEO = { communes: reader.features(o.communes), lakes: reader.features(o.lakes),
        cantonLines: reader.mesh(o.communes, (a, b) => a !== b && a.properties.kt !== b.properties.kt),
        outline: reader.mesh(o.communes, (a, b) => a === b) };
      S.a = F.map(() => 0); S.star = F.map(() => false);
      const fromLink = readHash();
      renderAnswers();
      bindQuestions();
      bindMap();
      renderKey();
      renderMethod();
      if (fromLink) { S.step = STEPS(); S.started = true; reveal(); }
      renderQuestion(false);
      refresh();
    } catch (e) {
      $('#q').innerHTML = '<p class="error">' + esc(e.message || e) + '</p>';
      console.error(e);
    }
  }
  boot();
})();
