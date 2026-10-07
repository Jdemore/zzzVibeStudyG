// Normalization workshop (practicum Question 2d): classify each dependency, name the normal form, decompose.
import { relations } from '../data/relations.js';
import { progress, mark } from '../store.js';
import { esc, onAct, schema } from '../ui.js';
import { dependency } from '../erd.js';

const KIND = { key: 'Candidate key', pd: 'Partial dependency', td: 'Transitive dependency', nsk: 'Non-superkey dependency' };
const FORMS = ['1NF', '2NF', '3NF', 'BCNF'];
const REMOVES = { '2NF': 'pd', '3NF': 'td', 'BCNF': 'nsk' };
const set = list => '{' + list.join(', ') + '}';

function whyKind(rel, [lhs, , type]) {
  if (type === 'key') return `${set(lhs)} determines every other attribute and no part of it does so alone: a candidate key${lhs.join() === rel.pk.join() ? ', chosen as the primary key' : ''}.`;
  if (type === 'pd') return `${set(lhs)} is only part of the primary key ${set(rel.pk)}, and what it determines is non-key: a partial dependency.`;
  if (type === 'td') return 'Neither side contains an attribute from any candidate key: a non-key attribute determines another non-key attribute.';
  return `${set(lhs)} is not a superkey, but what it determines is a prime attribute, so 3NF allows it. Only BCNF forbids it.`;
}

const whyForm = {
  '1NF': 'It has a partial dependency, so it is in 1NF but not 2NF.',
  '2NF': 'No partial dependency (or a single-attribute key), but a transitive dependency remains: 2NF, not 3NF.',
  '3NF': 'No partial or transitive dependency, but one determinant is not a superkey: 3NF, not BCNF.',
};

export function mount(root) {
  const firstOpen = relations.findIndex(r => !progress().norm[r.id]);
  let rel = relations[firstOpen < 0 ? 0 : firstOpen];
  let kinds, form, stepAt, stepKind, stepFk, miss;

  const fresh = () => { kinds = rel.fds.map(() => null); form = null; stepAt = 0; stepKind = false; stepFk = false; miss = ''; };
  const classified = () => kinds.every((k, i) => k === rel.fds[i][2]);

  function fdText([lhs, rhs]) {
    return `${set(lhs)} → ${rhs === 'ALL' ? 'every other attribute' : set(rhs)}`;
  }

  function stepBlock(step, i) {
    if (i > stepAt) return '';
    const fd = rel.fds[step.fd], done = i < stepAt, kind = REMOVES[step.nf];
    const kindDone = done || stepKind, fkDone = done || stepFk;
    const fkChoices = [...new Set([...fd[0], ...(fd[1] === 'ALL' ? [] : fd[1])])];
    return `<div class="step">
      <h2>Reach ${step.nf}</h2>
      <p>Which kind of dependency do you remove to get from ${FORMS[FORMS.indexOf(step.nf) - 1]} to ${step.nf}?</p>
      <div class="row">${['pd', 'td', 'nsk'].map(k => `<button class="pick${kindDone && k === kind ? ' ok' : ''}" data-act="kind" data-k="${k}" ${kindDone ? 'disabled' : ''}>${KIND[k]}</button>`).join('')}</div>
      ${kindDone ? `<p class="fd">Remove: ${esc(fdText(fd))}${step.also ? ' and ' + esc(fdText(rel.fds[step.also])) : ''}</p>
        <p>Which attribute stays behind in the original relation as the foreign key${step.also ? ' for the first of these' : ''}?</p>
        <div class="row">${fkChoices.map(a => `<button class="pick${fkDone && a === step.fk ? ' ok' : ''}" data-act="fk" data-a="${esc(a)}" ${fkDone ? 'disabled' : ''}>${esc(a)}</button>`).join('')}</div>` : ''}
      ${fkDone ? `<div class="out">${step.out.map(schema).join('')}</div>
        <p class="keymark"><span><code class="rel"><span class="pk">solid</span></code> primary key</span><span><code class="rel"><span class="fk">dashed</span></code> foreign key</span></p>
        <div class="feedback ok"><span>${esc(step.note)}</span><span class="small">On paper, draw an arrow from each foreign key to the primary key it references.</span></div>` : ''}
    </div>`;
  }

  function draw() {
    const shown = rel.fds.map((f, i) => (kinds[i] === f[2] ? f[2] : 'none'));
    const allKinds = classified(), formDone = form === rel.nf, finished = formDone && stepAt >= rel.steps.length;
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Normalization workshop · practicum Question 2d</p>
        <h1>From dependency diagram to 3NF</h1>
        <p class="lead">Work each relation the way the practicum asks: read the diagram, name each dependency, then remove one kind of problem per normal form.</p>
      </header>
      <div class="stack">
        <div class="row" role="group" aria-label="Relation">${relations.map(r => `<button class="chip${progress().norm[r.id] ? ' done' : ''}" data-act="rel" data-id="${r.id}" aria-pressed="${r === rel}">${esc(r.name)}</button>`).join('')}</div>
        <div class="sheet">
          <p class="small muted">${esc(rel.src)}</p>
          <p>${schema([rel.name, rel.attrs.map(a => [a, rel.pk.includes(a) ? 'p' : ''])])}</p>
          <div class="scroll">${dependency(rel, shown)}</div>
          <p class="legend"><span><i style="border-color:var(--line-strong)"></i>not classified yet, or a key</span><span><i style="border-color:var(--accent)"></i>partial</span><span><i style="border-color:var(--key)"></i>transitive</span><span><i style="border-color:var(--bad)"></i>non-superkey</span></p>
          <div class="step">
            <h2>Name each dependency</h2>
            <ol class="fds">${rel.fds.map((f, i) => `<li>
              <span class="fd">${i === 0 ? 'Above the row' : 'Line ' + i}: ${esc(fdText(f))}</span>
              <div class="row">${Object.keys(KIND).map(k => `<button class="pick${kinds[i] === k ? (k === f[2] ? ' ok' : ' no') : ''}" data-act="name" data-i="${i}" data-k="${k}" ${kinds[i] === f[2] ? 'disabled' : ''}>${KIND[k]}</button>`).join('')}</div>
              ${kinds[i] === f[2] ? `<span class="small muted">${esc(whyKind(rel, f))}</span>` : kinds[i] ? '<span class="small" style="color:var(--bad)">Not that one. Look at where the line starts and where it points.</span>' : ''}
            </li>`).join('')}</ol>
          </div>
          <div class="step" ${allKinds ? '' : 'hidden'}>
            <h2>Highest normal form as given</h2>
            <p class="small muted">The table is in at least 1NF. Stop at the first form that is violated.</p>
            <div class="row">${FORMS.map(f => `<button class="pick${form === f ? (f === rel.nf ? ' ok' : ' no') : ''}" data-act="form" data-f="${f}" ${formDone ? 'disabled' : ''}>${f}</button>`).join('')}</div>
            ${formDone ? `<span class="small muted">${whyForm[rel.nf]}</span>` : form ? '<span class="small" style="color:var(--bad)">Check which kind of problem dependency is present.</span>' : ''}
          </div>
          ${formDone ? rel.steps.map(stepBlock).join('') : ''}
          ${miss ? `<div class="feedback no" aria-live="polite">${esc(miss)}</div>` : ''}
          ${finished ? `<div class="row"><span class="tag">Done</span><button class="btn primary" data-act="nextrel">Next relation</button><button class="btn" data-act="again">Work it again</button></div>` : ''}
        </div>
      </div>`;
  }

  fresh();
  draw();
  return onAct(root, {
    rel: el => { rel = relations.find(r => r.id === el.dataset.id); fresh(); draw(); },
    name: el => { kinds[Number(el.dataset.i)] = el.dataset.k; miss = ''; draw(); },
    form: el => { form = el.dataset.f; miss = ''; draw(); },
    kind: el => {
      const step = rel.steps[stepAt];
      if (el.dataset.k === REMOVES[step.nf]) { stepKind = true; miss = ''; }
      else miss = `${step.nf} removes ${KIND[REMOVES[step.nf]].toLowerCase()} only. ${KIND[el.dataset.k]} belongs to a different step.`;
      draw();
    },
    fk: el => {
      const step = rel.steps[stepAt];
      if (el.dataset.a === step.fk) {
        stepAt++; stepKind = false; stepFk = false; miss = '';
        if (stepAt >= rel.steps.length) mark('norm', rel.id, 1);
      } else miss = 'The determinant stays behind, not what it determines. It becomes the primary key of the new relation and the foreign key in the original.';
      draw();
    },
    nextrel: () => { rel = relations[(relations.indexOf(rel) + 1) % relations.length]; fresh(); draw(); window.scrollTo(0, 0); },
    again: () => { fresh(); draw(); },
  });
}
