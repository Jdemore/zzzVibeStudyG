// Progress overview: every study mode with its meter, then the guide part by part.
import { toc } from '../data/toc.js';
import { totals } from '../data/meta.js';
import { sources } from '../data/sheet.js';
import { progress, reset } from '../store.js';
import { esc, meter, onAct } from '../ui.js';

const count = (group, test = v => v) => Object.values(progress()[group]).filter(test).length;

function modes() {
  const p = progress();
  const known = count('cards', v => v[0] >= 3);
  const right = Object.keys(p.quiz).filter(id => !id.startsWith('t:') && p.quiz[id][1] > 0).length;
  return {
    standard: [
      ['guide', 'Guide', 'Seven parts, from first principles to the practicum playbook, with the drawn diagrams.', 'All questions', count('read'), totals.sections, 'sections read'],
      ['glossary', 'Glossary', `${totals.terms} terms with one-line definitions. Filter by part or search.`, 'Concept questions', null],
      ['sheet', 'Cheat sheet', 'The whole guide on one page, plus a checklist of what to be able to do from memory.', 'Night before', count('check'), totals.checklist, 'checked off'],
    ],
    practice: [
      ['cards', 'Flashcards', 'Glossary terms and cheat-sheet rules on a spaced schedule: cards you know come back less often.', 'Terms', known, totals.cards, 'known'],
      ['quiz', 'Quiz', 'Multiple choice with explanations: concepts by part, spot the ER pattern, name the normal form.', 'Concepts, Q3 patterns', right, totals.questions, 'answered right'],
      ['crow', 'Cardinality trainer', "Read a scenario, set the minimum and maximum at each end, and see the crow's foot line drawn.", 'Question 1', count('crow'), totals.scenarios, 'solved'],
      ['fd', 'Dependency lab', 'Test any dependency against the practicum sample tables, then find them all.', 'Question 2a to 2c', count('fd', v => v === 100), totals.tables, 'tables cleared'],
      ['norm', 'Normalization workshop', 'Classify each dependency, name the normal form, and decompose to 2NF, 3NF and BCNF.', 'Question 2d', count('norm'), totals.relations, 'relations done'],
    ],
  };
}

const row = ([route, name, text, tag, done, total, unit]) => `
  <div class="mode">
    <div>
      <h3><a href="#${route}" data-go="${route}">${name}</a> <span class="tag">${tag}</span></h3>
      <p class="muted small">${text}</p>
    </div>
    ${done === null ? '<span></span>' : `<div class="count">${meter(done, total, name)}<span>${done} / ${total} ${unit}</span></div>`}
  </div>`;

function partRow(part) {
  const read = progress().read;
  const done = part.secs.filter(([id]) => read[id]).length;
  return `
  <div class="mode">
    <div>
      <h3><a href="#guide-p${part.n}" data-go="guide-p${part.n}">Part ${part.n}: ${esc(part.name)}</a></h3>
      <p class="muted small">${esc(part.lead)}</p>
    </div>
    <div class="count">${meter(done, part.secs.length, 'Part ' + part.n)}<span>${done} / ${part.secs.length} sections</span></div>
  </div>`;
}

export function mount(root) {
  const m = modes();
  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Progress</p>
      <h1>Relational Database Study Lab</h1>
      <p class="lead">ER diagrams, the relational model and normalization, built from your class material and aimed at the Design Practicum. Read it the standard way, or drill the three practicum question types.</p>
    </header>
    <div class="stack-lg">
      <section class="stack">
        <h2>Standard study</h2>
        <div class="modes">${m.standard.map(row).join('')}</div>
      </section>
      <section class="stack">
        <h2>Interactive practice</h2>
        <div class="modes">${m.practice.map(row).join('')}</div>
      </section>
      <section class="stack">
        <h2>The guide, part by part</h2>
        <div class="modes">${toc.map(partRow).join('')}</div>
      </section>
      <section class="stack">
        <h2>About this lab</h2>
        <p class="small muted">Built only from the attached class files: ${sources.map(esc).join('; ')}. Two items are not from those files and are marked where they appear: the 4NF employee illustration and the mention of DKNF.</p>
        <p class="small muted">Progress is saved in this browser on this device.</p>
        <div id="reset-zone"><button class="btn" data-act="ask-reset">Reset all progress</button></div>
      </section>
    </div>`;
  return onAct(root, {
    'ask-reset': () => {
      root.querySelector('#reset-zone').innerHTML = `<span class="confirm">Erase all saved progress?
        <button class="btn" data-act="do-reset">Erase</button><button class="btn quiet" data-act="keep">Keep it</button></span>`;
    },
    'do-reset': () => { reset(); mount(root); },
    keep: () => { root.querySelector('#reset-zone').innerHTML = '<button class="btn" data-act="ask-reset">Reset all progress</button>'; },
  });
}
