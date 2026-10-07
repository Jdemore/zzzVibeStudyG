// Router and shell. Each view is a module loaded on first use; only the open view is rendered.

const views = {
  home: () => import('./views/home.js'),
  guide: () => import('./views/guide.js'),
  glossary: () => import('./views/glossary.js'),
  sheet: () => import('./views/sheet.js'),
  cards: () => import('./views/cards.js'),
  quiz: () => import('./views/quiz.js'),
  crow: () => import('./views/crow.js'),
  fd: () => import('./views/fd.js'),
  norm: () => import('./views/norm.js'),
};

const main = document.getElementById('view');
const nav = document.getElementById('nav');
let leave = null;     // cleanup returned by the open view
let ticket = 0;       // guards against a slow import finishing after a newer navigation

// route: "name" or "name-arg", e.g. "guide-p3" or "guide-p3-keys"
function parse(route) {
  const cut = route.indexOf('-');
  const name = cut < 0 ? route : route.slice(0, cut);
  return views[name] ? [name, cut < 0 ? '' : route.slice(cut + 1)] : ['home', ''];
}

export async function go(route, { keepScroll = false } = {}) {
  const [name, arg] = parse(route || 'home');
  const mine = ++ticket;
  const view = await views[name]();
  if (mine !== ticket) return;
  if (leave) leave();
  main.textContent = '';
  leave = view.mount(main, arg, go) || null;
  nav.querySelectorAll('a').forEach(a => {
    if (a.dataset.go === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const hash = '#' + (arg ? `${name}-${arg}` : name);
  if (location.hash !== hash) {
    try { history.replaceState(null, '', hash); } catch { /* sandboxed frame: routing still works in memory */ }
  }
  if (!keepScroll) window.scrollTo(0, 0);
}

// Any element with data-go navigates; this covers the rail and links inside views.
document.addEventListener('click', event => {
  const link = event.target.closest('[data-go]');
  if (!link) return;
  event.preventDefault();
  go(link.dataset.go);
});
window.addEventListener('hashchange', () => go(location.hash.slice(1)));

go(location.hash.slice(1));
