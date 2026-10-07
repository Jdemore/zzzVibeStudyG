// Study progress. Kept in memory, mirrored to localStorage when the browser allows it.
// Writes are batched: one save shortly after the last change, and one when the page is hidden.

const KEY = 'rdb-study-v1';
const blank = () => ({ read: {}, cards: {}, quiz: {}, crow: {}, fd: {}, norm: {}, check: {} });

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') return { ...blank(), ...saved };
  } catch { /* storage blocked or empty: start fresh */ }
  return blank();
}

let state = load();
let timer = 0;
const listeners = new Set();

function save() {
  timer = 0;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep working in memory */ }
}

function changed() {
  if (!timer) timer = setTimeout(save, 400);
  listeners.forEach(run => run(state));
}

export const progress = () => state;

// group: 'read' | 'cards' | 'quiz' | 'crow' | 'fd' | 'norm' | 'check'
export function mark(group, key, value) {
  if (value === undefined || value === null) delete state[group][key];
  else state[group][key] = value;
  changed();
}

export function reset() {
  state = blank();
  changed();
}

export function watch(run) {
  listeners.add(run);
  return () => listeners.delete(run);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); save(); }
});
