// Dependency lab (practicum Question 2a to 2c): test dependencies against sample data, then find them all.
import { tables } from '../data/tables.js';
import { progress, mark } from '../store.js';
import { esc, onAct, percent } from '../ui.js';

// Does lhs (column indexes) determine rhs (one column index) in these rows? Returns the first clashing row pair if not.
function holds(rows, lhs, rhs) {
  const seen = new Map();
  for (let r = 0; r < rows.length; r++) {
    const key = lhs.map(c => rows[r][c]).join('\u0001');
    if (seen.has(key) && rows[seen.get(key)][rhs] !== rows[r][rhs]) return { ok: false, clash: [seen.get(key), r] };
    if (!seen.has(key)) seen.set(key, r);
  }
  return { ok: true };
}
const unique = (rows, cols) => new Set(rows.map(r => cols.map(c => r[c]).join('\u0001'))).size === rows.length;

// Everything Question 2a asks for: single-column dependencies, then minimal unique pairs.
function solve(table) {
  const n = table.cols.length, single = [], soloKey = [];
  for (let x = 0; x < n; x++) {
    single[x] = [];
    for (let y = 0; y < n; y++) single[x][y] = x !== y && holds(table.rows, [x], y).ok;
    soloKey[x] = unique(table.rows, [x]);
  }
  const pairs = [];
  for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
    if (!soloKey[x] && !soloKey[y]) pairs.push([x, y, unique(table.rows, [x, y])]);
  }
  return { single, soloKey, pairs };
}

export function mount(root) {
  let table = tables[0], mode = 'explore';
  let lhs = [], rhs = -1;                 // explore selection
  let ticks = new Set(), pairTicks = new Set(), graded = null;
  let reveal = false;

  const pickTable = id => { table = tables.find(t => t.id === id); lhs = []; rhs = -1; ticks = new Set(); pairTicks = new Set(); graded = null; reveal = false; };

  function dataTable(clash = []) {
    return `<div class="scroll"><table class="data">
      <thead><tr><th>#</th>${table.cols.map((c, i) => `<th class="${lhs.includes(i) ? 'lhs' : i === rhs ? 'rhs' : ''}">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${table.rows.map((row, r) => `<tr class="${clash.includes(r) ? 'clash' : ''}"><td>${r + 1}</td>${row.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function explore() {
    let result = '<div class="feedback">Pick one or two determinant columns and one dependent column.</div>', clash = [];
    if (lhs.length && rhs >= 0) {
      const names = lhs.map(i => table.cols[i]).join(', '), dep = table.cols[rhs];
      const test = holds(table.rows, lhs, rhs);
      if (test.ok) {
        const isKey = unique(table.rows, lhs);
        const spare = lhs.length === 2 && lhs.some(i => holds(table.rows, [i], rhs).ok);
        result = `<div class="feedback ok" aria-live="polite"><strong>${esc(names)} → ${esc(dep)} holds in this data.</strong>
          <span>${isKey ? `No value of ${esc(names)} repeats, so it determines every column: write ${esc(names)} → ALL.` : `Every repeated value of ${esc(names)} goes with a single ${esc(dep)}.`}</span>
          ${spare ? '<span>But one of the two columns already determines it alone, so this pair is not minimal and is not listed.</span>' : ''}
          <span class="small">Data can only suggest a dependency. Whether it is real is the logical test.</span></div>`;
      } else {
        clash = test.clash;
        const [r1, r2] = clash;
        result = `<div class="feedback no" aria-live="polite"><strong>${esc(names)} → ${esc(dep)} fails.</strong>
          <span>Rows ${r1 + 1} and ${r2 + 1} share ${esc(names)} = ${esc(lhs.map(i => table.rows[r1][i]).join(', '))} but have ${esc(dep)} = ${esc(table.rows[r1][rhs])} and ${esc(table.rows[r2][rhs])}. One disagreement is enough to rule it out.</span></div>`;
      }
    }
    const chips = (act, on) => table.cols.map((c, i) => `<button class="chip" data-act="${act}" data-i="${i}" aria-pressed="${on(i)}">${esc(c)}</button>`).join('');
    return `${dataTable(clash)}
      <div class="stack">
        <div><p class="small muted">Determinant (left side, up to two)</p><div class="row">${chips('lhs', i => lhs.includes(i))}</div></div>
        <div><p class="small muted">Dependent (right side)</p><div class="row">${chips('rhs', i => i === rhs)}</div></div>
        ${result}
      </div>`;
  }

  function findAll() {
    const sol = solve(table), n = table.cols.length;
    const cell = (x, y) => {
      if (x === y) return '<td class="self"></td>';
      const k = x + '-' + y, on = ticks.has(k);
      const cls = graded ? (sol.single[x][y] ? (on ? 'hit' : 'miss') : on ? 'wrong' : '') : '';
      return `<td class="${cls}"><input type="checkbox" data-k="${k}" aria-label="${esc(table.cols[x])} determines ${esc(table.cols[y])}"${on ? ' checked' : ''}></td>`;
    };
    const pairRow = ([x, y, isKey]) => {
      const k = x + '+' + y, on = pairTicks.has(k);
      const cls = graded ? (isKey ? (on ? 'hit' : 'miss') : on ? 'wrong' : '') : '';
      return `<li><label class="${cls}"><input type="checkbox" data-p="${k}"${on ? ' checked' : ''}>${esc(table.cols[x])}, ${esc(table.cols[y])} → ALL</label></li>`;
    };
    return `${dataTable()}
      <div class="stack">
        <h2>Step 1: single columns</h2>
        <p class="small muted">Tick a box when the row's column determines the column above it. Press a row name to tick the whole row (a unique column determines everything).</p>
        <div class="scroll"><table class="matrix">
          <thead><tr><th class="rowh">Determinant ↓ / dependent →</th>${table.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${table.cols.map((c, x) => `<tr><th class="rowh"><button data-act="row" data-x="${x}">${esc(c)}</button></th>${table.cols.map((_, y) => cell(x, y)).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <h2>Step 2: unique pairs</h2>
        <p class="small muted">Columns that are unique alone are left out, because adding to them is never minimal. Tick each pair whose combination never repeats. Pairs that determine only some columns (A, B \u2192 C) also count on the practicum; use Test one to check those.</p>
        <ul class="pairs">${sol.pairs.map(pairRow).join('')}</ul>
        <div class="row"><button class="btn primary" data-act="grade">Check my answer</button><button class="btn" data-act="clear">Clear</button></div>
        ${graded ? `<div class="feedback ${graded.score === 100 ? 'ok' : 'no'}" aria-live="polite"><strong>${graded.found} of ${graded.total} dependencies found, ${graded.extra} ticked that do not hold.</strong>
          <span>Green is right, amber is one you missed, red does not hold in the data. ${graded.score === 100 ? 'This matches the answer key.' : 'Fix the amber and red cells and check again.'}</span></div>` : ''}
      </div>`;
  }

  function logic() {
    return `${dataTable()}
      <div class="stack">
        ${table.formula ? `<p><span class="tag key">Given</span> ${esc(table.formula)}</p>` : ''}
        <div><h2>Question 2b</h2><p>Which data-suggested dependency would surprise you most if it survived a logical test, and why?</p></div>
        <div><h2>Question 2c</h2><p>Is there an attribute that could be eliminated without losing real content, because it is a kind of redundancy?</p></div>
        ${reveal ? `<div class="feedback"><strong>Keyed answer, 2b</strong><span>${esc(table.logic)}</span><strong>Keyed answer, 2c</strong><span>${esc(table.redundant)}</span></div>`
          : '<div><button class="btn primary" data-act="reveal">Decide, then show the keyed answers</button></div>'}
      </div>`;
  }

  function draw() {
    const best = progress().fd;
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Dependency lab · practicum Question 2a to 2c</p>
        <h1>What does the data suggest?</h1>
        <p class="lead">A → B holds in sample data when every repeated value of A always appears with the same B. These are the three tables from the past practicums.</p>
      </header>
      <div class="stack">
        <div class="row" role="group" aria-label="Table">${tables.map(t => `<button class="chip${best[t.id] === 100 ? ' done' : ''}" data-act="table" data-id="${t.id}" aria-pressed="${t === table}">${esc(t.name)} (${esc(t.src)})</button>`).join('')}</div>
        <span class="seg" role="group" aria-label="Mode">
          ${[['explore', 'Test one'], ['find', 'Find them all'], ['logic', 'Logical test']].map(([id, label]) => `<button data-act="mode" data-id="${id}" aria-pressed="${mode === id}">${label}</button>`).join('')}
        </span>
        <div class="sheet">${mode === 'explore' ? explore() : mode === 'find' ? findAll() : logic()}</div>
      </div>`;
  }

  const change = event => {
    const box = event.target;
    if (box.dataset.k) box.checked ? ticks.add(box.dataset.k) : ticks.delete(box.dataset.k);
    else if (box.dataset.p) box.checked ? pairTicks.add(box.dataset.p) : pairTicks.delete(box.dataset.p);
  };
  root.addEventListener('change', change);
  const off = onAct(root, {
    table: el => { pickTable(el.dataset.id); draw(); },
    mode: el => { mode = el.dataset.id; draw(); },
    lhs: el => {
      const i = Number(el.dataset.i);
      lhs = lhs.includes(i) ? lhs.filter(v => v !== i) : [...lhs, i].slice(-2);
      if (lhs.includes(rhs)) rhs = -1;
      draw();
    },
    rhs: el => { const i = Number(el.dataset.i); rhs = rhs === i ? -1 : i; lhs = lhs.filter(v => v !== i); draw(); },
    row: el => {
      const x = Number(el.dataset.x), keys = table.cols.map((_, y) => x + '-' + y).filter((_, y) => y !== x);
      const all = keys.every(k => ticks.has(k));
      keys.forEach(k => (all ? ticks.delete(k) : ticks.add(k)));
      graded = null; draw();
    },
    grade: () => {
      const sol = solve(table);
      let total = 0, found = 0, extra = 0;
      sol.single.forEach((row, x) => row.forEach((yes, y) => {
        if (x === y) return;
        const on = ticks.has(x + '-' + y);
        if (yes) { total++; if (on) found++; } else if (on) extra++;
      }));
      sol.pairs.forEach(([x, y, yes]) => {
        const on = pairTicks.has(x + '+' + y);
        if (yes) { total++; if (on) found++; } else if (on) extra++;
      });
      const score = extra ? Math.min(99, percent(found, total)) : percent(found, total);
      graded = { total, found, extra, score };
      if (score > (progress().fd[table.id] || 0)) mark('fd', table.id, score);
      draw();
    },
    clear: () => { ticks = new Set(); pairTicks = new Set(); graded = null; draw(); },
    reveal: () => { reveal = true; draw(); },
  });
  draw();
  return () => { root.removeEventListener('change', change); off(); };
}
