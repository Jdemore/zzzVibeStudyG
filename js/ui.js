// Small shared helpers. No framework: views render HTML strings and use one delegated listener each.

const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = text => String(text).replace(/[&<>"']/g, c => escMap[c]);

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const today = () => Math.floor(Date.now() / 864e5);

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// A thin progress meter. label is read by screen readers.
export const meter = (part, whole, label) =>
  `<span class="meter" role="img" aria-label="${esc(label)}: ${part} of ${whole}"><span style="width:${percent(part, whole)}%"></span></span>`;

// Relation schema with key marks. marks: '' | 'p' | 'f' | 'pf'.
export const schema = ([name, attrs]) =>
  `<code class="rel">${esc(name)}(${attrs.map(([a, m]) => {
    const cls = [m.includes('p') && 'pk', m.includes('f') && 'fk'].filter(Boolean).join(' ');
    return cls ? `<span class="${cls}">${esc(a)}</span>` : esc(a);
  }).join(', ')})</code>`;

// One delegated click handler per view root: data-act names the action.
export function onAct(root, handlers) {
  const listen = event => {
    const el = event.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const run = handlers[el.dataset.act];
    if (run) run(el, event);
  };
  root.addEventListener('click', listen);
  return () => root.removeEventListener('click', listen);
}

export const debounce = (run, wait) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(run, wait, ...args);
  };
};
