// Searchable glossary. Rows are rendered once; filtering only toggles their hidden flag.
import { glossary } from '../data/glossary.js';
import { toc } from '../data/toc.js';
import { esc, onAct } from '../ui.js';

const lower = glossary.map(([term, def]) => (term + ' ' + def).toLowerCase());

export function mount(root) {
  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Glossary</p>
      <h1>${glossary.length} terms</h1>
      <p class="lead">Every term the guide defines. The part tag opens the part where the term is explained.</p>
    </header>
    <div class="stack">
      <label class="field"><span>Filter terms and definitions</span><input type="search" id="gloss-q" placeholder="e.g. key" autocomplete="off"></label>
      <div class="row" role="group" aria-label="Part">
        <button class="chip" data-act="part" data-n="0" aria-pressed="true">All parts</button>
        ${toc.slice(0, 6).map(p => `<button class="chip" data-act="part" data-n="${p.n}" aria-pressed="false" title="${esc(p.name)}">Part ${p.n}</button>`).join('')}
      </div>
      <p class="small muted" id="gloss-count" aria-live="polite"></p>
      <dl class="gloss">
        ${glossary.map(([term, def, part]) => `<div><dt>${esc(term)} <a class="tag" href="#guide-p${part}" data-go="guide-p${part}">Part ${part}</a></dt><dd>${esc(def)}</dd></div>`).join('')}
      </dl>
    </div>`;
  const rows = root.querySelectorAll('.gloss > div');
  const input = root.querySelector('#gloss-q');
  let part = 0;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row, i) => {
      const hide = (part && glossary[i][2] !== part) || (q && !lower[i].includes(q));
      row.hidden = hide;
      if (!hide) shown++;
    });
    root.querySelector('#gloss-count').textContent = `${shown} of ${glossary.length} shown`;
  };
  input.addEventListener('input', apply);
  apply();
  return onAct(root, {
    part: el => {
      part = Number(el.dataset.n);
      root.querySelectorAll('[data-act="part"]').forEach(b => b.setAttribute('aria-pressed', b === el));
      apply();
    },
  });
}
