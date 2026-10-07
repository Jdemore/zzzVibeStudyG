// The readable guide. Each part is its own module, fetched the first time it is opened.
import { toc } from '../data/toc.js';
import { progress, mark } from '../store.js';
import { esc, onAct, debounce } from '../ui.js';
import { drawCrowSpans } from '../erd.js';

const loaded = new Map();                       // part number -> { lead, secs }
const loadPart = n => {
  if (!loaded.has(n)) loaded.set(n, import(`../data/parts/p${n}.js`).then(m => m.default));
  return loaded.get(n);
};

let index = null;                               // built on first search: [{ n, id, title, text }]
async function buildIndex() {
  if (index) return index;
  const parts = await Promise.all(toc.map(p => loadPart(p.n)));
  const strip = document.createElement('div');
  index = [];
  parts.forEach((part, i) => part.secs.forEach(sec => {
    strip.innerHTML = sec.h;
    strip.querySelectorAll('svg').forEach(s => s.remove());
    index.push({ n: toc[i].n, id: sec.id, title: sec.t, text: strip.textContent.replace(/\s+/g, ' ') });
  }));
  return index;
}

function snippet(text, at, len) {
  const from = Math.max(0, at - 50), to = Math.min(text.length, at + len + 70);
  return (from ? '…' : '') + esc(text.slice(from, at)) + '<mark>' + esc(text.slice(at, at + len)) + '</mark>' + esc(text.slice(at + len, to)) + (to < text.length ? '…' : '');
}

export function mount(root, arg, go) {
  const partNo = /^p[1-7]/.test(arg) ? Number(arg[1]) : 1;
  const target = arg.length > 2 ? arg : '';
  const part = toc[partNo - 1];
  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Guide</p>
      <h1>Part ${part.n}: ${esc(part.name)}</h1>
    </header>
    <div class="stack">
      <div class="row" role="group" aria-label="Parts">
        ${toc.map(p => `<button class="chip" data-go="guide-p${p.n}" aria-pressed="${p.n === partNo}" title="${esc(p.name)}">Part ${p.n}</button>`).join('')}
      </div>
      <label class="field"><span>Search every part</span><input type="search" id="guide-search" placeholder="e.g. partial dependency" autocomplete="off"></label>
      <div class="hits" id="guide-hits" hidden></div>
      <div id="guide-body"><p class="muted">Loading part ${part.n}…</p></div>
    </div>`;
  const body = root.querySelector('#guide-body');
  const hits = root.querySelector('#guide-hits');
  let open = true;

  loadPart(partNo).then(data => {
    if (!open) return;
    const read = progress().read;
    body.innerHTML = `
      <div class="prose">${data.lead}</div>
      <details class="toc" style="margin-top:1rem"${matchMedia('(min-width: 821px)').matches ? ' open' : ''}>
        <summary>Sections in this part (${data.secs.length})</summary>
        <div class="row">${data.secs.map(s => `<button class="chip${read[s.id] ? ' done' : ''}" data-act="jump" data-id="${s.id}">${esc(s.t)}</button>`).join('')}</div>
      </details>
      ${data.secs.map(s => `
        <section class="sec${read[s.id] ? ' done' : ''}" id="sec-${s.id}">
          <h2>${esc(s.t)}</h2>
          ${s.h}
          <div><button class="btn" data-act="read" data-id="${s.id}" aria-pressed="${!!read[s.id]}">${read[s.id] ? 'Read. Mark as unread' : 'Mark as read'}</button></div>
        </section>`).join('')}
      <div class="row spread" style="margin-top:2rem">
        ${partNo > 1 ? `<a class="btn" href="#guide-p${partNo - 1}" data-go="guide-p${partNo - 1}">Part ${partNo - 1}</a>` : '<span></span>'}
        ${partNo < 7 ? `<a class="btn primary" href="#guide-p${partNo + 1}" data-go="guide-p${partNo + 1}">Next: Part ${partNo + 1}</a>` : '<a class="btn primary" href="#crow" data-go="crow">Practice Question 1</a>'}
      </div>`;
    drawCrowSpans(body);
    if (target) body.querySelector('#sec-' + CSS.escape(target))?.scrollIntoView();
  });

  const search = debounce(async () => {
    const q = root.querySelector('#guide-search').value.trim().toLowerCase();
    if (q.length < 2) { hits.hidden = true; return; }
    const all = await buildIndex();
    if (!open) return;
    const found = [];
    for (const s of all) {
      const at = s.text.toLowerCase().indexOf(q);
      if (at >= 0 || s.title.toLowerCase().includes(q)) found.push([s, at]);
      if (found.length === 12) break;
    }
    hits.hidden = false;
    hits.innerHTML = found.length
      ? found.map(([s, at]) => `<button data-go="guide-${s.id}"><strong>Part ${s.n}: ${esc(s.title)}</strong><span class="small muted">${at >= 0 ? snippet(s.text, at, q.length) : ''}</span></button>`).join('')
      : `<p class="small muted" style="padding:0.6rem 0.8rem">Nothing in the guide matches "${esc(q)}".</p>`;
  }, 200);
  root.querySelector('#guide-search').addEventListener('input', search);

  const off = onAct(root, {
    jump: el => root.querySelector('#sec-' + CSS.escape(el.dataset.id))?.scrollIntoView({ behavior: 'smooth' }),
    read: el => {
      const id = el.dataset.id, now = !progress().read[id];
      mark('read', id, now ? 1 : null);
      el.setAttribute('aria-pressed', now);
      el.textContent = now ? 'Read. Mark as unread' : 'Mark as read';
      el.closest('.sec').classList.toggle('done', now);
      root.querySelector(`.chip[data-id="${CSS.escape(id)}"]`)?.classList.toggle('done', now);
    },
  });
  return () => { open = false; off(); };
}
