// Renders the foundations tables from the generated token list (docs/tokens.js),
// so nothing on this page is typed by hand and it cannot drift from the tokens.
const tokens = window.DS_TOKENS;
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) k === 'style' ? (node.style.cssText = v) : node.setAttribute(k, v);
  node.append(...children);
  return node;
};
const table = (headers, rows) =>
  el('div', { class: 'table-wrap' },
    el('table', {},
      el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col' }, h)))),
      el('tbody', {}, ...rows.map((cells) => el('tr', {}, ...cells.map((c) => (c instanceof Node && c.tagName === 'TD' ? c : el('td', {}, c))))))));
const code = (text) => el('code', {}, text);
const num = (text) => el('td', { class: 'num' }, text);
const swatch = (value, label) => el('span', { class: 'swatch', style: `background:${value}`, role: 'img', 'aria-label': label });
const by = (prefix) => tokens.filter((t) => t.name.startsWith(prefix));
const mount = (id, node) => document.getElementById(id).replaceChildren(node);

// Semantic colour: purpose, then what it resolves to in each theme.
mount('color-semantic', table(
  ['Token', 'Use for', 'Light', 'Dark'],
  by('color.').map((t) => [
    code(t.name), t.description || '',
    el('span', {}, swatch(t.light, `${t.name} light`), ' ', code(t.alias.light.replace('palette.', ''))),
    el('span', {}, swatch(t.dark, `${t.name} dark`), ' ', code(t.alias.dark.replace('palette.', ''))),
  ])));

// Palette ramps.
const ramps = {};
for (const t of by('palette.')) (ramps[t.name.split('.')[1]] ??= []).push(t);
mount('color-palette', el('div', { class: 'ramps' }, ...Object.entries(ramps).map(([name, steps]) =>
  el('div', { class: 'ramp' }, el('span', { class: 'ramp__name' }, name),
    ...steps.map((t) => el('span', { class: 'swatch', style: `background:${t.light}`, title: `${t.name} ${t.light}`, role: 'img', 'aria-label': `${t.name} ${t.light}` }))))));

mount('type-scale', table(
  ['Token', 'Size', 'Sample'],
  by('font.size.').reverse().map((t) => [code(t.name), num(`${t.light} · ${Math.round(parseFloat(t.light) * 16 * 10) / 10}px`),
    el('span', { style: `font-size:var(${t.cssVar});line-height:var(--ds-font-line-height-tight)` }, 'Clear by default')])));

mount('space-scale', table(
  ['Token', 'Value', ''],
  by('space.').map((t) => [code(t.name), num(t.light), el('span', { class: 'bar', style: `width:var(${t.cssVar})` })])));

mount('shape-scale', table(
  ['Token', 'Value', ''],
  [...by('radius.'), ...by('shape.')].map((t) => [code(t.name), num(t.alias ? `${t.light} · ${t.alias.light}` : t.light), el('span', { class: 'shape', style: `border-radius:var(${t.cssVar})` })])));

mount('other-tokens', table(
  ['Token', 'Value', 'Use for'],
  [...by('size.'), ...by('border.'), ...by('motion.'), ...by('measure.'), ...by('elevation.')].map((t) => [code(t.name), num(t.light), t.description || ''])));

document.getElementById('token-count').textContent = tokens.length;

// Theme switch: system (no attribute) -> light -> dark.
const order = ['system', 'light', 'dark'];
const button = document.getElementById('theme');
let current = 'system';
try { current = localStorage.getItem('ds-theme') || 'system'; } catch {}
const apply = () => {
  current === 'system' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', current);
  button.textContent = `Theme: ${current}`;
};
button.addEventListener('click', () => {
  current = order[(order.indexOf(current) + 1) % order.length];
  try { localStorage.setItem('ds-theme', current); } catch {}
  apply();
});
apply();

// Demo of the field error pattern.
const demoInput = document.getElementById('demo-email');
const demoError = document.getElementById('demo-email-error');
demoInput.addEventListener('blur', () => {
  const bad = demoInput.value !== '' && !demoInput.validity.valid;
  demoInput.setAttribute('aria-invalid', String(bad));
  demoError.hidden = !bad;
});
