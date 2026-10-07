// SVG builders for crow's foot relationships and dependency diagrams.
// Everything returns an SVG string coloured from the page's CSS tokens.

const CHAR = 7.9;           // IBM Plex Mono advance at 13px
const boxWidth = name => Math.max(64, Math.round(name.length * CHAR) + 26);
const esc = text => String(text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// One line end at (x, y). (dx, dy) points away from the entity. end is [min, max] or null (not chosen yet).
function crowEnd(x, y, dx, dy, end, tone = 'var(--fg)') {
  const px = -dy, py = dx;
  const at = d => `${x + d * dx} ${y + d * dy}`;
  if (!end) {
    return `<g stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="3 3" fill="none"><path d="M${at(0)}L${at(28)}"/></g>`;
  }
  const [min, max] = end;
  const many = max === 'M', zero = min === 0, c = many ? 20 : 16;
  const hash = d => `<path d="M${x + d * dx + 7 * px} ${y + d * dy + 7 * py}L${x + d * dx - 7 * px} ${y + d * dy - 7 * py}"/>`;
  const foot = `<path d="M${x + 7 * px} ${y + 7 * py}L${at(13)}L${x - 7 * px} ${y - 7 * py}"/>`;
  const line = zero
    ? `<path d="M${at(0)}L${at(c - 5)}M${at(c + 5)}L${at(28)}"/><circle cx="${x + c * dx}" cy="${y + c * dy}" r="5"/>`
    : `<path d="M${at(0)}L${at(28)}"/>${hash(many ? 19 : 12)}`;
  return `<g stroke="${tone}" stroke-width="1.6" fill="none">${many ? foot : hash(6)}${line}</g>`;
}

const box = (x, y, w, h, name) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1.25"/>` +
  `<text x="${x + w / 2}" y="${y + h / 2 + 4.5}" text-anchor="middle" class="ent">${esc(name)}</text>`;

const wrap = (w, h, label, body, cls = 'erd') =>
  `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;

const words = end => (end ? `${end[0] ? 'one' : 'zero'} ${end[1] === 'M' ? 'or many' : end[0] ? 'and only one' : 'or one'}` : 'not set');

// Binary relationship. aEnd / bEnd: [min, max] | null. tones colour an end after checking.
export function relation({ a, b, aEnd, bEnd, aTone, bTone, gap = 96, h = 36 }) {
  const aw = boxWidth(a), bw = boxWidth(b), pad = 2, y = pad + h / 2;
  const ax = pad + aw, bx = ax + gap;
  const body =
    `<path d="M${ax + 28} ${y}H${bx - 28}" stroke="var(--line-strong)" stroke-width="1.5"/>` +
    crowEnd(ax, y, 1, 0, aEnd, aTone) + crowEnd(bx, y, -1, 0, bEnd, bTone) +
    box(pad, pad, aw, h, a) + box(bx, pad, bw, h, b);
  return wrap(bx + bw + pad, h + pad * 2, `${a}: ${words(aEnd)}. ${b}: ${words(bEnd)}.`, body);
}

// Recursive relationship: a loop from the right side to the bottom side of one box.
export function loop({ a, aEnd, bEnd, aRole, bRole, aTone, bTone }) {
  const w = boxWidth(a), h = 40, x = 2, y = 22;
  const rx = x + w, ry = y + h / 2, bxm = x + w / 2, by = y + h;
  const far = rx + 64, low = by + 52;
  const body =
    `<path d="M${rx + 28} ${ry}H${far}V${low}H${bxm}V${by + 28}" fill="none" stroke="var(--line-strong)" stroke-width="1.5"/>` +
    crowEnd(rx, ry, 1, 0, aEnd, aTone) + crowEnd(bxm, by, 0, 1, bEnd, bTone) + box(x, y, w, h, a) +
    `<text x="${rx + 6}" y="${ry - 12}" class="role">${esc(aRole || '')}</text>` +
    `<text x="${bxm + 12}" y="${by + 24}" class="role">${esc(bRole || '')}</text>`;
  const width = Math.max(far + 4, rx + 12 + (aRole || '').length * 6.6, bxm + 16 + (bRole || '').length * 6.6);
  return wrap(Math.round(width), low + 6, `${a}, recursive. ${aRole}: ${words(aEnd)}. ${bRole}: ${words(bEnd)}.`, body);
}

const TONE = { key: 'var(--line-strong)', pd: 'var(--accent)', td: 'var(--key)', nsk: 'var(--bad)', none: 'var(--line-strong)' };

// Dependency diagram. shown: per-dependency tone key ('pd', 'td', ...) or 'none' while unclassified.
export function dependency(rel, shown = rel.fds.map(f => f[2])) {
  const widths = rel.attrs.map(a => Math.round(a.length * CHAR) + 22);
  const xs = [];
  widths.reduce((x, w, i) => (xs[i] = x, x + w), 8);
  const mid = name => { const i = rel.attrs.indexOf(name); return xs[i] + widths[i] / 2; };
  const total = xs[xs.length - 1] + widths[widths.length - 1] + 8;
  const below = rel.fds.length - 1, rowY = 44, rowH = 34, baseY = rowY + rowH;
  let marks = '', body = '';
  rel.fds.forEach(([lhs, rhs, type], i) => {
    const tone = TONE[i === 0 ? 'key' : shown[i]] || TONE.none;
    const deps = rhs === 'ALL' ? rel.attrs.filter(a => !lhs.includes(a)) : rhs;
    const up = i === 0, busY = up ? 16 : baseY + 18 + (i - 1) * 20, edge = up ? rowY : baseY;
    const points = [...lhs, ...deps].map(mid);
    const id = `dep-${rel.id}-${i}`;
    marks += `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${tone}"/></marker>`;
    body += `<g fill="none" stroke="${tone}" stroke-width="${up ? 1.25 : 2}" data-fd="${i}">` +
      `<path d="M${Math.min(...points)} ${busY}H${Math.max(...points)}"/>` +
      lhs.map(a => `<path d="M${mid(a)} ${edge}V${busY}"/>`).join('') +
      deps.map(a => `<path d="M${mid(a)} ${busY}V${up ? edge - 1 : edge + 1}" marker-end="url(#${id})"/>`).join('') + '</g>';
    if (!up) body += `<text x="${Math.min(...points) - 6}" y="${busY + 4}" text-anchor="end" class="role">${i}</text>`;
  });
  rel.attrs.forEach((a, i) => {
    const key = rel.pk.includes(a);
    body += `<rect x="${xs[i]}" y="${rowY}" width="${widths[i]}" height="${rowH}" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1.25"/>` +
      `<text x="${xs[i] + widths[i] / 2}" y="${rowY + 21}" text-anchor="middle" class="ent">${esc(a)}</text>` +
      (key ? `<path d="M${xs[i] + 10} ${rowY + 25}H${xs[i] + widths[i] - 10}" stroke="var(--fg)" stroke-width="1.25"/>` : '');
  });
  const h = baseY + 18 + Math.max(below, 1) * 20 + 4;
  return wrap(total + 14, h, `Dependency diagram for ${rel.name}`, `<defs>${marks}</defs><g transform="translate(14 0)">${body}</g>`, 'erd dep');
}

// Turn every <span class="crow" data-...> placeholder inside root into a small drawn relationship.
export function drawCrowSpans(root) {
  const parse = text => (text ? [Number(text[0]), text[2]] : null);
  root.querySelectorAll('span.crow:empty').forEach(span => {
    const { a, b, ae, be } = span.dataset;
    span.innerHTML = relation({ a, b, aEnd: parse(ae), bEnd: parse(be), gap: 84, h: 30 });
  });
}
