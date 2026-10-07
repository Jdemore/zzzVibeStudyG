// Multiple-choice quiz with explanations. Sets: mixed, one guide part, glossary terms, ER patterns, normal forms, missed.
import { questions } from '../data/questions.js';
import { glossary } from '../data/glossary.js';
import { toc } from '../data/toc.js';
import { progress, mark } from '../store.js';
import { esc, shuffle, onAct, percent } from '../ui.js';

// A glossary term question: the definition is shown, four terms from the same part are offered.
function termQuestion([term, def, part]) {
  const others = shuffle(glossary.filter(g => g[2] === part && g[0] !== term)).slice(0, 3).map(g => g[0]);
  return ['t:' + term, 'term', part, `Which term fits this definition? "${def}"`, [term, ...others], `${term}: ${def}`];
}

const missed = () => questions.filter(q => { const s = progress().quiz[q[0]]; return s && s[0] - s[1] > s[1]; });

const SETS = [
  ['mixed', 'Mixed', () => questions],
  ...toc.map(p => ['p' + p.n, 'Part ' + p.n, () => questions.filter(q => q[1] === 'concept' && q[2] === p.n)]),
  ['pattern', 'Spot the pattern', () => questions.filter(q => q[1] === 'pattern')],
  ['nf', 'Name the normal form', () => questions.filter(q => q[1] === 'nf')],
  ['term', 'Glossary terms', () => glossary.map(termQuestion)],
  ['missed', 'Missed before', missed],
];

export function mount(root) {
  let set = 'mixed', size = 10;
  let list = [], at = 0, right = 0, wrong = [], opts = [], answered = false;

  function setup() {
    const hasMissed = missed().length > 0;
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Quiz</p>
        <h1>Check what you know</h1>
        <p class="lead">Every question explains its answer. Questions you miss more often than you get right collect under "Missed before".</p>
      </header>
      <div class="sheet">
        <fieldset class="stack"><legend class="small muted">Question set</legend>
          <div class="row">${SETS.filter(s => s[0] !== 'missed' || hasMissed).map(([id, label]) => `<button class="chip" data-act="set" data-id="${id}" aria-pressed="${id === set}">${label}</button>`).join('')}</div>
        </fieldset>
        <fieldset class="stack"><legend class="small muted">Length</legend>
          <span class="seg">${[5, 10, 20].map(n => `<button data-act="size" data-n="${n}" aria-pressed="${n === size}">${n}</button>`).join('')}</span>
        </fieldset>
        <div><button class="btn primary" data-act="start">Start quiz</button></div>
      </div>`;
  }

  function begin(custom) {
    const pool = custom || SETS.find(s => s[0] === set)[2]();
    list = shuffle(pool).slice(0, custom ? pool.length : size);
    at = 0; right = 0; wrong = [];
    ask();
  }

  function ask() {
    const q = list[at];
    opts = q[1] === 'nf' ? q[4].map((text, i) => [text, i === 0]).sort((a, b) => order(a[0]) - order(b[0])) : shuffle(q[4].map((text, i) => [text, i === 0]));
    answered = false;
    const label = q[1] === 'pattern' ? 'Which structure does this call for?' : '';
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Question ${at + 1} of ${list.length} · ${q[1] === 'pattern' ? 'Spot the pattern' : q[1] === 'nf' ? 'Normal form' : 'Part ' + q[2]}</p>
      </header>
      <div class="sheet">
        ${label ? `<p class="small muted">${label}</p>` : ''}
        <h1 class="q">${esc(q[3])}</h1>
        <div class="opts">${opts.map(([text], i) => `<button class="opt" data-act="pick" data-i="${i}"><span class="n">${i + 1}</span><span>${esc(text)}</span></button>`).join('')}</div>
        <div class="feedback" id="quiz-why" aria-live="polite"></div>
        <div class="row spread"><button class="btn quiet" data-act="quit">End quiz</button><button class="btn primary" data-act="next" hidden>${at + 1 === list.length ? 'See results' : 'Next question'}</button></div>
      </div>`;
  }

  // Normal-form options keep their natural order instead of being shuffled.
  const order = text => ['Not in 1NF', '1NF only', '2NF, not 3NF', '3NF, not BCNF', 'BCNF'].indexOf(text);

  function pick(i) {
    if (answered || !opts[i]) return;
    answered = true;
    const q = list[at], ok = opts[i][1];
    root.querySelectorAll('.opt').forEach((b, k) => {
      b.disabled = true;
      if (opts[k][1]) b.classList.add('ok');
      else if (k === i) b.classList.add('no');
    });
    const why = root.querySelector('#quiz-why');
    why.className = 'feedback ' + (ok ? 'ok' : 'no');
    why.innerHTML = `<strong>${ok ? 'Correct.' : 'Not quite.'}</strong><span>${esc(q[5])}</span>`;
    const stat = progress().quiz[q[0]] || [0, 0];
    mark('quiz', q[0], [stat[0] + 1, stat[1] + (ok ? 1 : 0)]);
    if (ok) right++; else wrong.push(q);
    const next = root.querySelector('[data-act="next"]');
    next.hidden = false;
    next.focus();
  }

  function results() {
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Quiz results</p>
        <h1>${right} of ${list.length} correct (${percent(right, list.length)}%)</h1>
      </header>
      <div class="stack">
        ${wrong.length ? `<h2>Review what you missed</h2>
          <ul class="review">${wrong.map(q => `<li><strong>${esc(q[3])}</strong><span>${esc(q[4][0])}</span><span class="small muted">${esc(q[5])}</span></li>`).join('')}</ul>` : '<p>Nothing missed.</p>'}
        <div class="row">
          ${wrong.length ? '<button class="btn primary" data-act="retry">Retry the missed ones</button>' : ''}
          <button class="btn${wrong.length ? '' : ' primary'}" data-act="new">New quiz</button>
        </div>
      </div>`;
  }

  const next = () => { if (!answered) return; at++; if (at < list.length) ask(); else results(); };
  const keys = event => {
    if (!list.length || at >= list.length) return;
    if (/^[1-5]$/.test(event.key)) pick(Number(event.key) - 1);
  };
  document.addEventListener('keydown', keys);
  const off = onAct(root, {
    set: el => { set = el.dataset.id; setup(); },
    size: el => { size = Number(el.dataset.n); setup(); },
    start: () => begin(),
    pick: el => pick(Number(el.dataset.i)),
    next,
    quit: () => { list = []; setup(); },
    retry: () => begin(wrong.slice()),
    new: () => { list = []; setup(); },
  });
  setup();
  return () => { document.removeEventListener('keydown', keys); off(); };
}
