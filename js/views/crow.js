// Cardinality trainer (practicum Question 1): set min and max at each end, see the line drawn, check it.
import { scenarios } from '../data/scenarios.js';
import { progress, mark } from '../store.js';
import { esc, onAct } from '../ui.js';
import { relation, loop } from '../erd.js';

const NAME = { '0,1': 'zero or one', '1,1': 'one and only one', '0,M': 'zero or many', '1,M': 'one or many' };
const nice = name => name.replace(/_/g, ' ');

export function mount(root) {
  const firstOpen = scenarios.findIndex(s => !progress().crow[s.id]);
  let at = firstOpen < 0 ? 0 : firstOpen;
  let pick, checked, shown;

  const fresh = () => { pick = { a: [null, null], b: [null, null] }; checked = false; shown = false; };
  const ready = end => (pick[end][0] !== null && pick[end][1] !== null ? pick[end] : null);
  const same = (x, y) => x && x[0] === y[0] && x[1] === y[1];

  function diagram(s) {
    const tone = end => (checked || shown ? (same(ready(end), s[end + 'End']) ? 'var(--good)' : 'var(--bad)') : undefined);
    const args = { a: s.a, aEnd: ready('a'), bEnd: ready('b'), aTone: tone('a'), bTone: tone('b') };
    return s.b ? relation({ ...args, b: s.b, gap: 150, h: 44 }) : loop({ ...args, aRole: s.aRole, bRole: s.bRole });
  }

  function endBox(s, end) {
    const other = end === 'a' ? 'b' : 'a';
    const title = s.b ? `At the ${nice(s[end])} end` : `At the "${s[end + 'Role']}" end`;
    const hint = s.b
      ? `Take one instance of ${nice(s[other])}. How many ${nice(s[end])} can it have?`
      : `For one ${nice(s.a)}: how many in the "${s[end + 'Role']}" role?`;
    const seg = (k, options) => `<span class="seg">${options.map(([v, label]) =>
      `<button data-act="set" data-end="${end}" data-k="${k}" data-v="${v}" aria-pressed="${String(pick[end][k]) === String(v)}">${label}</button>`).join('')}</span>`;
    const state = checked || shown ? (same(ready(end), s[end + 'End']) ? ' ok' : ' no') : '';
    return `<fieldset class="end${state}"><legend>${esc(title)}</legend>
      <p class="small muted" style="clear:both">${esc(hint)}</p>
      <div class="pair"><span>Minimum</span>${seg(0, [[0, 'zero'], [1, 'one']])}</div>
      <div class="pair"><span>Maximum</span>${seg(1, [['1', 'one'], ['M', 'many']])}</div>
    </fieldset>`;
  }

  function verdict(s) {
    if (!checked && !shown) return '';
    const line = end => {
      const want = s[end + 'End'], label = s.b ? nice(s[end]) : `"${s[end + 'Role']}"`;
      const ok = same(ready(end), want);
      return `<span>${ok && !shown ? 'Right' : 'Answer'} at the ${esc(label)} end: <strong>${NAME[want.join(',')]}</strong> (min ${want[0] ? 'one' : 'zero'}, max ${want[1] === 'M' ? 'many' : 'one'}).</span>`;
    };
    const all = same(ready('a'), s.aEnd) && same(ready('b'), s.bEnd);
    return `<div class="feedback ${shown ? '' : all ? 'ok' : 'no'}" aria-live="polite">
      <strong>${shown ? 'Keyed answer' : all ? 'Both ends correct.' : 'Not yet. Reread each sentence from the opposite entity.'}</strong>
      ${shown || all ? line('a') + line('b') : ''}
      ${(shown || all) && s.note ? `<span>${esc(s.note)}</span>` : ''}
    </div>`;
  }

  function draw() {
    const s = scenarios[at], solved = Object.keys(progress().crow).length;
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Cardinality trainer · practicum Question 1</p>
        <h1>Put the right symbols at each end</h1>
        <p class="lead">The symbols next to an entity say how many of that entity one instance of the other entity can have. The symbol nearest the entity is the maximum; the next one out is the minimum.</p>
      </header>
      <div class="stack">
        <div class="row spread small muted"><span>Scenario ${at + 1} of ${scenarios.length} · ${esc(s.src)}${progress().crow[s.id] ? ' · solved' : ''}</span><span>${solved} of ${scenarios.length} solved</span></div>
        <div class="sheet">
          <p class="scenario">${esc(s.text)}</p>
          ${s.b ? '' : '<p class="small muted">One entity related to itself: a recursive relationship. Each end of the loop is labelled with a role.</p>'}
          <div class="scroll" id="crow-dia">${diagram(s)}</div>
          <div class="ends">${endBox(s, 'a')}${endBox(s, 'b')}</div>
          <div class="row">
            <button class="btn primary" data-act="check">Check</button>
            <button class="btn" data-act="show">Show the answer</button>
            <span style="flex:1"></span>
            <button class="btn quiet" data-act="prev" ${at ? '' : 'disabled'}>Previous</button>
            <button class="btn" data-act="next">${at + 1 === scenarios.length ? 'Back to the first' : 'Next scenario'}</button>
          </div>
          <div id="crow-out">${verdict(s)}</div>
        </div>
      </div>`;
  }

  fresh();
  draw();
  return onAct(root, {
    set: el => {
      const v = el.dataset.k === '0' ? Number(el.dataset.v) : el.dataset.v;
      pick[el.dataset.end][Number(el.dataset.k)] = v;
      checked = false; shown = false;
      draw();
    },
    check: () => {
      const s = scenarios[at];
      if (!ready('a') || !ready('b')) {
        root.querySelector('#crow-out').innerHTML = '<div class="feedback" aria-live="polite">Choose a minimum and a maximum at both ends first.</div>';
        return;
      }
      checked = true;
      if (same(ready('a'), s.aEnd) && same(ready('b'), s.bEnd)) mark('crow', s.id, 1);
      draw();
    },
    show: () => { const s = scenarios[at]; pick = { a: s.aEnd.slice(), b: s.bEnd.slice() }; shown = true; checked = false; draw(); },
    next: () => { at = (at + 1) % scenarios.length; fresh(); draw(); },
    prev: () => { at = Math.max(0, at - 1); fresh(); draw(); },
  });
}
