// Cheat sheet and the "can you do these cold" checklist.
import { cheat, checklist } from '../data/sheet.js';
import { progress, mark } from '../store.js';
import { esc } from '../ui.js';

export function mount(root) {
  const done = progress().check;
  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Cheat sheet</p>
      <h1>The short version</h1>
      <p class="lead">Everything in the guide compressed to what you should be able to write from memory.</p>
    </header>
    <div class="stack-lg">
      <div class="scroll"><table>
        <thead><tr><th>Topic</th><th>The short version</th></tr></thead>
        <tbody>${cheat.map(([topic, text]) => `<tr><th scope="row">${esc(topic)}</th><td>${esc(text)}</td></tr>`).join('')}</tbody>
      </table></div>
      <section class="stack">
        <h2>Can you do these cold?</h2>
        <p class="muted small">Tick each one only when you can do it without looking anything up.</p>
        <ul class="checks">
          ${checklist.map((text, i) => `<li><label for="chk-${i}"><input type="checkbox" id="chk-${i}" data-i="${i}"${done[i] ? ' checked' : ''}><span>${esc(text)}</span></label></li>`).join('')}
        </ul>
      </section>
    </div>`;
  const change = event => {
    const box = event.target.closest('input[data-i]');
    if (box) mark('check', box.dataset.i, box.checked ? 1 : null);
  };
  root.addEventListener('change', change);
  return () => root.removeEventListener('change', change);
}
