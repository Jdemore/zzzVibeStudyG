// Flashcards on a Leitner schedule: five boxes, a right answer moves a card up and delays its return.
import { glossary } from '../data/glossary.js';
import { cheat } from '../data/sheet.js';
import { toc } from '../data/toc.js';
import { progress, mark } from '../store.js';
import { esc, shuffle, today, meter, onAct } from '../ui.js';

const WAIT = [0, 0, 1, 3, 7, 14];   // days until a card in box n comes back
const ROUND = 15;

// part 0 holds the cheat-sheet rules
const deck = [
  ...glossary.map(([term, def, part]) => ({ id: 'g:' + term, front: term, back: def, part })),
  ...cheat.map(([topic, text]) => ({ id: 's:' + topic, front: topic, back: text, part: 0 })),
];

function pickRound(cards) {
  const saved = progress().cards, now = today();
  const due = cards.filter(c => saved[c.id] && saved[c.id][1] <= now).sort((a, b) => saved[a.id][0] - saved[b.id][0]);
  const fresh = shuffle(cards.filter(c => !saved[c.id]));
  return [...due, ...fresh].slice(0, ROUND);
}

export function mount(root) {
  let part = -1;          // -1 all, 0 rules, 1..6 guide parts
  let flipFirst = false;  // true: show the definition first
  let queue = [], seen = 0, total = 0, right = 0, again = 0, flipped = false;

  const inDeck = () => (part < 0 ? deck : deck.filter(c => c.part === part));

  function stats(cards) {
    const saved = progress().cards;
    const box = cards.map(c => (saved[c.id] ? saved[c.id][0] : 0));
    return `<div class="stats"><span><b>${box.filter(b => b === 0).length}</b> new</span><span><b>${box.filter(b => b > 0 && b < 3).length}</b> learning</span><span><b>${box.filter(b => b >= 3).length}</b> known</span><span><b>${cards.length}</b> in this deck</span></div>`;
  }

  function start(force) {
    const cards = inDeck();
    queue = pickRound(cards);
    if (!queue.length && force) {
      const saved = progress().cards;
      queue = cards.slice().sort((a, b) => saved[a.id][0] - saved[b.id][0]).slice(0, ROUND);
    }
    seen = 0; right = 0; again = 0; total = queue.length; flipped = false;
    draw();
  }

  function draw() {
    const cards = inDeck();
    const filters = [[-1, 'All'], ...toc.slice(0, 6).map(p => [p.n, 'Part ' + p.n]), [0, 'Rules']]
      .map(([n, label]) => `<button class="chip" data-act="deck" data-n="${n}" aria-pressed="${n === part}">${label}</button>`).join('');
    let body;
    if (!total) {
      body = `<div class="sheet"><p>Nothing is due in this deck right now. Cards you got right are scheduled to come back later.</p>
        <div class="row"><button class="btn primary" data-act="force">Review anyway</button></div></div>`;
    } else if (!queue.length) {
      body = `<div class="sheet"><h2>Round finished</h2>
        <p>${right} marked "Got it", ${again} sent back as "Still learning".</p>
        <div class="row"><button class="btn primary" data-act="restart">Next round</button><a class="btn" href="#quiz" data-go="quiz">Take a quiz</a></div></div>`;
    } else {
      const card = queue[0];
      const front = flipFirst ? card.back : card.front, back = flipFirst ? card.front : card.back;
      body = `
        <div class="row spread small muted"><span>Card ${Math.min(seen + 1, total)} of ${total}</span><span style="width:10rem">${meter(seen, total, 'Round progress')}</span></div>
        <button class="card" data-act="flip" aria-live="polite" aria-label="${flipped ? 'Card, answer shown' : 'Card. Press to show the answer'}">
          <span class="face${front.length > 60 ? ' long' : ''}">${esc(front)}</span>
          ${flipped ? `<span class="back">${esc(back)}</span>` : '<span class="small muted">Press to flip (Space)</span>'}
          <span><span class="tag">${card.part ? 'Part ' + card.part : 'Rule'}</span></span>
        </button>
        <div class="row">
          <button class="btn" data-act="again" ${flipped ? '' : 'disabled'}>Still learning (1)</button>
          <button class="btn primary" data-act="got" ${flipped ? '' : 'disabled'}>Got it (2)</button>
        </div>`;
    }
    root.innerHTML = `
      <header class="page-head">
        <p class="eyebrow">Flashcards</p>
        <h1>Terms and rules</h1>
        <p class="lead">Flip the card, then be honest. "Got it" moves a card up a box so it returns in 1, 3, 7, then 14 days. "Still learning" sends it back to the start.</p>
      </header>
      <div class="stack">
        <div class="row" role="group" aria-label="Deck">${filters}</div>
        <div class="row"><span class="small muted">Show first</span>
          <span class="seg"><button data-act="side" data-v="0" aria-pressed="${!flipFirst}">Term</button><button data-act="side" data-v="1" aria-pressed="${flipFirst}">Definition</button></span></div>
        ${stats(cards)}
        ${body}
      </div>`;
  }

  function grade(ok) {
    if (!flipped || !queue.length) return;
    const card = queue.shift();
    const box = ok ? Math.min(5, (progress().cards[card.id]?.[0] || 1) + 1) : 1;
    mark('cards', card.id, [box, today() + WAIT[box]]);
    if (ok) { right++; seen++; } else { again++; queue.push(card); }
    flipped = false;
    draw();
    root.querySelector('.card')?.focus();
  }

  const flip = () => { if (queue.length) { flipped = !flipped; draw(); root.querySelector('.card')?.focus(); } };
  const keys = event => {
    if (event.target.matches('input, select, textarea')) return;
    if (event.key === ' ' && !event.target.closest('button:not(.card)')) { event.preventDefault(); flip(); }
    else if (event.key === '1') grade(false);
    else if (event.key === '2') grade(true);
  };
  document.addEventListener('keydown', keys);
  const off = onAct(root, {
    flip, again: () => grade(false), got: () => grade(true),
    deck: el => { part = Number(el.dataset.n); start(false); },
    side: el => { flipFirst = el.dataset.v === '1'; flipped = false; draw(); },
    restart: () => start(false), force: () => start(true),
  });
  start(false);
  return () => { document.removeEventListener('keydown', keys); off(); };
}
