// Writes the use_figma scripts that draw the five components (and the two screens) in the sandbox file
// "Souvenir-test" (3WGIouA6dby5LNzVkdaA48), from the specs in ds-components/specs/ and ds-tokens/dist/tokens.json.
// Deterministic: no model runs at run time. For every combination it draws, it applies the spec's "styles" rules in order
// (a rule applies when all its props and states hold; media rules are skipped) and turns the declarations in force into
// variable bindings. The same computation is exported for v2/tools/figma-readback-check.mjs, so the check compares Figma
// with exactly what the generator computed.
//
//   node v2/tools/figma/make-component-scripts.mjs            writes the scripts and component-scripts/expected.json
//   node v2/tools/figma/make-component-scripts.mjs --self-test checks the rule engine on hand-worked cases
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..', '..');
const OUT = join(ROOT, 'v2', 'figma', 'sandbox', 'component-scripts');
const OUT_SCREENS = join(ROOT, 'v2', 'figma', 'sandbox', 'screen-scripts');
export const SANDBOX = '3WGIouA6dby5LNzVkdaA48';
export const PAGE_NAME = 'DS V2 · Components (added by Claude)';
export const SCREENS_PAGE = 'DS V2 · Screens (added by Claude)';
const DATE = '16 November 2026';
const LIMIT = 45000;

// ---------- tokens ----------
const TOKENS = JSON.parse(readFileSync(join(ROOT, 'ds-tokens', 'dist', 'tokens.json'), 'utf8'));
const byName = new Map();
for (const t of TOKENS) { if (!byName.has(t.name)) byName.set(t.name, []); byName.get(t.name).push(t); }
// The key a token has in Figma: "<collection> (DS V2)|<name>", or "style|<name> (DS V2)" for an Elevation shadow.
export function tokenKey(name) {
  const hits = byName.get(name) || [];
  if (hits.length !== 1) throw new Error(`token ${name}: ${hits.length} matches in tokens.json`);
  const t = hits[0];
  if (t.collection === 'Elevation') return `style|${name} (DS V2)`;
  return `${t.collection} (DS V2)|${name}`;
}
const px = (name) => { const v = Object.values(byName.get(name)[0].values)[0]; return v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v); };
const WEIGHT_STYLE = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
// The weight token a type role takes (the same rule as v2/tools/build-components.mjs).
function weightGroup(role) {
  if (role === 'section-label-base') return 'section-label-base';
  const m = role.match(/^(heading|label|body)-[a-z0-9-]+$/);
  if (!m) throw new Error('unknown type role ' + role);
  return m[1];
}
export function typography(role) {
  const fw = `font-weight/${weightGroup(role)}`;
  const style = WEIGHT_STYLE[Object.values(byName.get(fw)[0].values)[0]];
  if (!style) throw new Error('no Geist style for ' + fw);
  return { fs: tokenKey(`font-size/${role}`), lh: tokenKey(`line-height/${role}`), ff: tokenKey('font-family/sans'), fw: tokenKey(fw), style };
}

// ---------- specs and the rule engine ----------
export function loadSpec(slug) { return JSON.parse(readFileSync(join(ROOT, 'ds-components', 'specs', `${slug}.spec.json`), 'utf8')); }
// The declarations in force for one configuration: { part: { property: value } }.
export function declarationsFor(spec, ctx) {
  const props = {};
  for (const [k, p] of Object.entries(spec.props)) if ((p.type === 'enum' || p.type === 'boolean') && p.default !== null && p.default !== undefined) props[k] = p.default;
  Object.assign(props, ctx.props || {});
  const states = new Set(ctx.states || []);
  for (const s of states) if (!spec.states[s]) throw new Error(`${spec.name}: no state ${s}`);
  const out = {};
  spec.styles.forEach((rule) => {
    const w = rule.when || {};
    if (w.media) return;
    for (const [k, v] of Object.entries(w.props || {})) if (props[k] !== v) return;
    for (const s of w.states || []) if (!states.has(s)) return;
    for (const [part, decl] of Object.entries(rule.parts)) out[part] = { ...(out[part] || {}), ...decl };
  });
  return out;
}

// ---------- turning declarations into bindings on a drawn tree ----------
// Template nodes: k F frame (a part), T text, I icon instance, C instance of another component.
// A T or I node takes colour and typography from its own part, or, when its part says current or inherit or says nothing,
// from the nearest enclosing part that does (the CSS cascade for color and font).
const INHERIT = new Set([undefined, 'current', 'inherit']);
function inherited(decls, chain, prop) {
  for (let i = chain.length - 1; i >= 0; i--) {
    const p = chain[i];
    const v = p && decls[p] ? decls[p][prop] : undefined;
    if (!INHERIT.has(v)) return v;
  }
  return undefined;
}
// Resolves a template tree against the declarations. Returns the node to emit; b holds token keys (or '-' for no paint).
export function resolveTree(t, decls, chain = [], where = '') {
  const own = t.part ? (decls[t.part] || {}) : {};
  const at = `${where}/${t.n}`;
  const node = { n: t.n, k: t.k };
  const b = {};
  const l = { ...(t.l || {}) };
  const tk = (v, what) => { if (v === undefined) return undefined; return tokenKey(v); };
  if (t.k === 'F') {
    const d = own;
    if (d.background !== undefined) b.f = d.background === 'transparent' ? '-' : tk(d.background);
    if (d.borderColor !== undefined) b.s = d.borderColor === 'transparent' ? '-' : tk(d.borderColor);
    if (d.borderWidth !== undefined && d.borderWidth !== 'none') b.sw = tk(d.borderWidth);
    if (d.radius !== undefined && d.radius !== 'none') b.r = tk(d.radius);
    if (d.minHeight !== undefined) b.mh = tk(d.minHeight);
    if (d.height !== undefined) b.h = tk(d.height);
    // width: full fills the parent; a component drawn on its own (a template number) is shown at that width instead.
    if (d.width !== undefined) { if (d.width === 'full') { if (typeof l.sh !== 'number') l.sh = 'FILL'; } else b.w = tk(d.width); }
    if (d.minWidth !== undefined) b.nw = tk(d.minWidth);
    if (d.maxWidth !== undefined) b.xw = tk(d.maxWidth);
    if (d.paddingInline !== undefined) { b.pl = tk(d.paddingInline); b.pr = b.pl; }
    if (d.paddingBlock !== undefined) { b.pt = tk(d.paddingBlock); b.pb = b.pt; }
    if (d.gap !== undefined) b.g = tk(d.gap);
    if (d.shadow !== undefined && d.shadow !== 'none') b.e = tk(d.shadow);
    // Template-only tokens (screens, and the tab indicator's thickness from the extensions stylesheet).
    for (const [f, v] of Object.entries(t.tb || {})) b[f] = v === '-' ? '-' : tokenKey(v);
  } else if (t.k === 'T') {
    const c = t.ph ? own.placeholderColor : inherited(decls, [...chain, t.part], 'color');
    const role = inherited(decls, [...chain, t.part], 'typography');
    const tc = t.tc || c; const tr = t.tr || role;
    if (!tc) throw new Error(`${at}: no colour in force`);
    if (!tr) throw new Error(`${at}: no typography in force`);
    b.c = tokenKey(tc);
    const ty = typography(tr);
    Object.assign(b, { fs: ty.fs, lh: ty.lh, ff: ty.ff, fw: ty.fw });
    node.st = ty.style;
    node.x = t.x;
  } else if (t.k === 'I') {
    const size = own.iconSize || t.size;
    const c = inherited(decls, [...chain, t.part], 'color') || t.tc;
    if (!size) throw new Error(`${at}: no icon size`);
    if (!c) throw new Error(`${at}: no icon colour`);
    b.zw = tokenKey(size); b.zh = b.zw; b.c = tokenKey(c);
    node.i = t.icon;
  } else if (t.k === 'C') {
    for (const key of ['set', 'vp', 'props', 'swap', 'tx', 'hide', 'nested']) if (t[key] !== undefined) node[key] = t[key];
  }
  if (t.v === false) node.v = 0;
  if (t.ref) node.ref = t.ref;
  if (Object.keys(b).length) node.b = b;
  if (Object.keys(l).length) node.l = l;
  const kids = [];
  // The focus ring: drawn when the part's outline width is not none, as an absolute child just outside the part.
  if (t.k === 'F' && own.outlineWidth && own.outlineWidth !== 'none') {
    if (!own.outlineColor || !own.outlineOffset) throw new Error(`${at}: outline without colour or offset`);
    const rb = { s: tokenKey(own.outlineColor), sw: tokenKey(own.outlineWidth) };
    if (b.r) rb.r = b.r;
    kids.push({ n: 'focusRing', k: 'F', b: rb, l: { abs: 'ring', off: px(own.outlineOffset) } });
  }
  for (const c of t.ch || []) kids.push(resolveTree(c, decls, t.part ? [...chain, t.part] : chain, at));
  if (kids.length) node.ch = kids;
  return node;
}

// The bindings a resolved tree should show in Figma, by node path: { '.': {f: key}, 'label': {...} }.
// Paths are the node names from the component down; a repeated sibling name gets #2, #3. Instances of other
// components are not entered; only their own bindings would be checked (they have none).
export function expectedBindings(tree) {
  const out = {};
  const walk = (n, path) => {
    if (n.b) out[path] = { ...n.b };
    const seen = {};
    for (const c of n.ch || []) {
      seen[c.n] = (seen[c.n] || 0) + 1;
      const name = seen[c.n] > 1 ? `${c.n}#${seen[c.n]}` : c.n;
      walk(c, path === '.' ? name : `${path}/${name}`);
    }
  };
  walk(tree, '.');
  return out;
}

// ---------- templates (layout the spec does not carry) ----------
const TEXT_FILL = { sh: 'FILL' };
const buttonTree = (o) => ({
  n: 'root', part: 'root', k: 'F', l: { d: 'H', pa: 'CENTER', ca: 'CENTER' }, ch: [
    { n: 'iconStart', part: 'iconStart', k: 'I', icon: o.iconOnly ? 'arrow-up' : 'plus', v: o.iconOnly && o.state !== 'loading', ref: o.iconOnly ? undefined : { visible: 'iconStart' } },
    { n: 'spinner', part: 'spinner', k: 'I', icon: 'loader', v: o.state === 'loading' },
    ...(o.iconOnly ? [] : [{ n: 'label', part: 'label', k: 'T', x: o.state === 'loading' ? 'Saving…' : 'Button', ref: { characters: 'children' } }]),
    ...(o.iconOnly ? [] : [{ n: 'iconEnd', part: 'iconEnd', k: 'I', icon: 'chevron-down', v: false, ref: { visible: 'iconEnd' } }]),
  ],
});
const inputTree = (o) => {
  const ph = ['default', 'hover', 'focus'].includes(o.state);
  return {
    n: 'root', part: 'root', k: 'F', l: { d: 'V', sh: 320 }, ch: [
      { n: 'label', part: 'label', k: 'T', x: 'Email address', l: TEXT_FILL },
      { n: 'control', part: 'control', k: 'F', l: { d: 'H', ca: 'CENTER', sh: 'FILL' }, ch: [
        { n: 'input', part: 'input', k: 'F', l: { d: 'H', ca: 'CENTER' }, ch: [
          { n: 'value', part: 'input', k: 'T', ph, x: ph ? 'name@example.com' : (o.state === 'invalid' ? 'priya@example' : 'priya@example.com'), l: TEXT_FILL },
        ] },
      ] },
      { n: 'description', part: 'description', k: 'T', x: 'We send the receipt to this address.', l: TEXT_FILL },
      ...(o.state === 'invalid' ? [{ n: 'errorMessage', part: 'errorMessage', k: 'F', l: { d: 'H', ca: 'MIN', sh: 'FILL' }, ch: [
        { n: 'errorIcon', part: 'errorIcon', k: 'I', icon: 'alert-circle' },
        { n: 'errorText', part: 'errorText', k: 'T', x: 'Enter an email address, such as name@example.com.', l: TEXT_FILL },
      ] }] : []),
    ],
  };
};
const triggerTree = (label = 'Overview') => ({
  n: 'trigger', part: 'trigger', k: 'F', l: { d: 'H', pa: 'CENTER', ca: 'CENTER' }, ch: [
    { n: 'label', part: 'label', k: 'T', x: label, ref: { characters: 'children' } },
    // The indicator's edge and its width/md thickness come from the extensions stylesheet (tabs.css styles[0] note).
    { n: 'indicator', part: 'indicator', k: 'F', tb: { sw: 'width/md' }, l: { abs: 'bottom' } },
  ],
});
const itemTree = (kind, label, checked) => ({
  n: kind, part: kind, k: 'F', l: { d: 'H', ca: 'CENTER', sh: 200 }, ch: [
    ...(kind === 'item' ? [] : [{ n: 'indicatorBox', part: 'indicatorBox', k: 'F', tb: { w: 'icon/sm', h: 'icon/sm' }, l: { d: 'H', pa: 'CENTER', ca: 'CENTER' }, ch: [
      { n: 'itemIndicator', part: 'itemIndicator', k: 'I', icon: kind === 'radioItem' ? 'dot' : 'check', v: !!checked },
    ] }]),
    { n: 'itemLabel', part: 'itemLabel', k: 'T', x: label, l: TEXT_FILL },
  ],
});

// ---------- the components ----------
const desc = (spec) => `${spec.summary}\nGenerated from ds-components/specs/${spec.slug}.spec.json on ${DATE}`;
const vname = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(', ');

export function components() {
  const button = loadSpec('button'), input = loadSpec('input'), tabs = loadSpec('tabs'), menu = loadSpec('dropdown-menu'), dialog = loadSpec('dialog');
  const sets = [];

  // Button
  {
    const STATES = ['default', 'hover', 'active', 'focus', 'disabled', 'loading'];
    const variants = [];
    const add = (variant, size, iconOnly) => {
      for (const state of STATES) {
        const o = { variant, state, size, iconOnly };
        const ctx = { props: { variant, size, iconOnly, loading: state === 'loading', disabled: state === 'disabled' }, states: state === 'default' ? [] : [state] };
        variants.push({ name: vname(o), row: `${variant} ${size} ${iconOnly ? 'icon' : ''}`, col: state, tree: resolveTree(buttonTree(o), declarationsFor(button, ctx)) });
      }
    };
    for (const v of button.props.variant.values) for (const size of (['primary', 'secondary'].includes(v) ? ['sm', 'md', 'lg'] : ['md'])) add(v, size, false);
    const withLabel = variants.splice(0);
    for (const v of ['primary', 'ghost']) for (const size of ['sm', 'md', 'lg']) add(v, size, true);
    // Two scripts, because one would pass the 45,000-character limit: the second adds the iconOnly variants to the same set.
    const props = [['children', 'TEXT', 'Button'], ['iconStart', 'BOOLEAN', false], ['iconEnd', 'BOOLEAN', false]];
    sets.push({ script: '01a-button', section: 'Button', slug: 'button', items: [{ type: 'set', name: 'Button', colProp: 'state', desc: desc(button), variants: withLabel, props }] });
    sets.push({ script: '01b-button-icon-only', section: 'Button', slug: 'button', items: [{ type: 'set', name: 'Button', colProp: 'state', desc: desc(button), variants, props }] });
  }

  // Input
  {
    const MAP = { default: ['placeholderShown'], hover: ['hover', 'placeholderShown'], focus: ['focus', 'placeholderShown'], filled: ['filled'], invalid: ['invalid', 'filled'], disabled: ['disabled', 'filled'], readOnly: ['readOnly', 'filled'] };
    const variants = [];
    for (const size of input.props.size.values) for (const state of Object.keys(MAP)) {
      const ctx = { props: { size, invalid: state === 'invalid', disabled: state === 'disabled', readOnly: state === 'readOnly' }, states: MAP[state] };
      variants.push({ name: vname({ state, size }), row: size, col: state, tree: resolveTree(inputTree({ state, size }), declarationsFor(input, ctx)) });
    }
    sets.push({ script: '02-input', section: 'Input', slug: 'input', items: [{ type: 'set', name: 'Input', colProp: 'state', desc: desc(input), variants, props: [] }] });
  }

  // Tabs
  {
    const MAP = { default: ['unselected'], hover: ['unselected', 'hover'], selected: ['selected'], focus: ['selected', 'focus'], disabled: ['unselected', 'disabled'] };
    const variants = [];
    for (const variant of tabs.props.variant.values) for (const size of tabs.props.size.values) for (const state of Object.keys(MAP)) {
      const ctx = { props: { variant, size, 'trigger.disabled': state === 'disabled' }, states: MAP[state] };
      variants.push({ name: vname({ state, variant, size }), row: `${variant} ${size}`, col: state, tree: resolveTree(triggerTree(), declarationsFor(tabs, ctx)) });
    }
    const example = (orientation) => {
      const d = declarationsFor(tabs, { props: { orientation }, states: [] });
      const vert = orientation === 'vertical';
      const trig = (label, state) => ({ n: 'trigger', k: 'C', set: 'TabsTrigger', vp: { state, variant: 'line', size: 'md' }, props: { children: label } });
      return resolveTree({ n: `Tabs · ${orientation}`, part: 'root', k: 'F', l: { d: vert ? 'H' : 'V', sh: 560 }, ch: [
        { n: 'list', part: 'list', k: 'F', l: { d: vert ? 'V' : 'H', ca: vert ? 'MIN' : 'CENTER' }, ch: [trig('Overview', 'selected'), trig('Activity', 'default'), trig('Settings', 'default'), trig('Archive', 'disabled')] },
        { n: 'content', part: 'content', k: 'F', l: { d: 'V', sh: 'FILL' }, ch: [
          { n: 'panel', part: 'content', k: 'T', x: 'Your project at a glance: 12 chats, 4 files and 3 people.', l: TEXT_FILL },
        ] },
      ] }, d);
    };
    sets.push({ script: '03-tabs', section: 'Tabs', slug: 'tabs', items: [
      { type: 'set', name: 'TabsTrigger', colProp: 'state', desc: desc(tabs), variants, props: [['children', 'TEXT', 'Overview']] },
      { type: 'example', tree: example('horizontal') },
      { type: 'example', tree: example('vertical') },
    ] });
  }

  // DropdownMenu
  {
    const variants = [];
    const LABEL = { item: 'Rename chat', checkboxItem: 'Extended thinking', radioItem: 'Standard' };
    for (const kind of ['item', 'checkboxItem', 'radioItem']) {
      const stateList = kind === 'item' ? ['default', 'highlighted', 'disabled'] : ['default', 'highlighted', 'checked', 'disabled'];
      for (const variant of (kind === 'item' ? ['initial', 'danger'] : ['initial'])) for (const state of stateList) {
        const states = [];
        if (state === 'highlighted') states.push(`${kind}Highlighted`);
        if (state === 'disabled') states.push(`${kind}Disabled`);
        if (kind !== 'item') states.push(state === 'checked' ? `${kind}Checked` : `${kind}Unchecked`);
        const props = kind === 'item' ? { 'item.variant': variant, 'item.disabled': state === 'disabled' } : { [`${kind}.disabled`]: state === 'disabled' };
        const label = kind === 'item' && variant === 'danger' ? 'Delete chat' : LABEL[kind];
        variants.push({ name: vname({ kind, state, variant }), row: `${kind} ${variant}`, col: state, tree: resolveTree(itemTree(kind, label, state === 'checked'), declarationsFor(menu, { props, states })) });
      }
    }
    const d0 = declarationsFor(menu, { props: {}, states: [] });
    const labelTree = resolveTree({ n: 'label', part: 'label', k: 'F', l: { d: 'H', sh: 200 }, ch: [{ n: 'text', part: 'label', k: 'T', x: 'Models', l: TEXT_FILL }] }, d0);
    const sepTree = resolveTree({ n: 'separator', part: 'separator', k: 'F', l: { sh: 200, sv: 1 } }, d0);
    const mi = (kind, state, label, n) => ({ n, k: 'C', set: 'DropdownMenuItem', vp: { kind, state, variant: 'initial' }, tx: { itemLabel: label }, l: { sh: 'FILL' } });
    const contentTree = resolveTree({ n: 'content', part: 'content', k: 'F', l: { d: 'V', sh: 240 }, ch: [
      { n: 'label', k: 'C', set: 'DropdownMenuLabel', l: { sh: 'FILL' } },
      { n: 'radioGroup', k: 'F', l: { d: 'V', sh: 'FILL' }, ch: [mi('radioItem', 'default', 'Pro', 'radioItem'), mi('radioItem', 'checked', 'Standard', 'radioItem'), mi('radioItem', 'default', 'Fast', 'radioItem')] },
      { n: 'separator', k: 'C', set: 'DropdownMenuSeparator', l: { sh: 'FILL' } },
      mi('checkboxItem', 'checked', 'Extended thinking', 'checkboxItem'),
    ] }, d0);
    sets.push({ script: '04-dropdown-menu', section: 'DropdownMenu', slug: 'dropdown-menu', items: [
      { type: 'set', name: 'DropdownMenuItem', colProp: 'state', desc: desc(menu), variants, props: [] },
      { type: 'component', name: 'DropdownMenuLabel', desc: desc(menu), tree: labelTree },
      { type: 'component', name: 'DropdownMenuSeparator', desc: desc(menu), tree: sepTree },
      { type: 'component', name: 'DropdownMenuContent', desc: `${desc(menu)}\nThe model selector example: a group label, three radio items, a separator and a checkbox item.`, tree: contentTree },
    ] });
  }

  // Dialog
  {
    const variants = [];
    for (const size of dialog.props['content.size'].values) {
      const d = declarationsFor(dialog, { props: { 'content.size': size }, states: ['open'] });
      const tree = resolveTree({ n: 'content', part: 'content', k: 'F', l: { d: 'V', sh: px(size === 'sm' ? 'dialog/sm' : 'dialog/md') }, ch: [
        { n: 'header', part: 'header', k: 'F', l: { d: 'V', sh: 'FILL' }, ch: [
          { n: 'title', part: 'title', k: 'T', x: 'Change delivery address', l: TEXT_FILL },
          { n: 'description', part: 'description', k: 'T', x: 'Your order will go to the new address.', l: TEXT_FILL },
        ] },
        { n: 'body', part: 'body', k: 'F', l: { d: 'V', sh: 'FILL' }, ch: [
          { n: 'bodyText', part: 'body', k: 'T', x: '12 Harbour Street, Leith, Edinburgh EH6 6QW', l: TEXT_FILL },
        ] },
        { n: 'footer', part: 'footer', k: 'F', l: { d: 'H', pa: 'MAX', ca: 'CENTER', sh: 'FILL' }, ch: [
          { n: 'close', k: 'C', set: 'Button', vp: { variant: 'secondary', state: 'default', size: 'md', iconOnly: 'false' }, props: { children: 'Cancel' } },
          { n: 'action', k: 'C', set: 'Button', vp: { variant: 'primary', state: 'default', size: 'md', iconOnly: 'false' }, props: { children: 'Use this address' } },
        ] },
        { n: 'dismiss', k: 'C', set: 'Button', vp: { variant: 'ghost', state: 'default', size: 'sm', iconOnly: 'true' }, swap: { iconStart: 'x' }, l: { abs: 'topright', inset: 16 } },
      ] }, d);
      variants.push({ name: vname({ size }), row: 'all', col: size, tree });
    }
    const dOver = declarationsFor(dialog, { props: {}, states: ['overlayOpen'] });
    const overlay = resolveTree({ n: 'Dialog · example', part: 'overlay', k: 'F', l: { d: 'V', pa: 'CENTER', ca: 'CENTER', sh: 800, sv: 520 }, ch: [
      { n: 'content', k: 'C', set: 'DialogContent', vp: { size: 'md' } },
    ] }, dOver);
    sets.push({ script: '05-dialog', section: 'Dialog', slug: 'dialog', items: [
      { type: 'set', name: 'DialogContent', colProp: 'size', desc: desc(dialog), variants, props: [] },
      { type: 'example', tree: overlay },
    ] });
  }
  return sets;
}

// ---------- screens (composed only from instances, plus frames and text bound to tokens) ----------
export function screens() {
  const T = (n, x, c, r, l) => ({ n, k: 'T', x, tc: c, tr: r, l });
  const btn = (n, vp, props, more = {}) => ({ n, k: 'C', set: 'Button', vp: { state: 'default', size: 'md', iconOnly: 'false', ...vp }, props, ...more });
  const field = (n, label, value, description) => ({ n, k: 'C', set: 'Input', vp: { state: 'filled', size: 'md' }, tx: { label, value, description }, l: { sh: 'FILL' } });
  const tab = (label, state) => ({ n: 'trigger', k: 'C', set: 'TabsTrigger', vp: { state, variant: 'line', size: 'md' }, props: { children: label } });
  const desktop = resolveTree({ n: 'Assistant · desktop', k: 'F', tb: { f: 'surface/primary/default' }, l: { d: 'V', sh: 1280, sv: 800, clip: true }, ch: [
    { n: 'topBar', k: 'F', tb: { pl: 'static/240', pr: 'static/240', pt: 'static/80', pb: 'static/80', g: 'static/320', s: 'border/primary/default', sw: 'width/sm' }, l: { d: 'H', ca: 'CENTER', sh: 'FILL', side: 'bottom' }, ch: [
      T('productName', 'Souvenir', 'text/primary', 'label-large'),
      { n: 'list', k: 'F', tb: { g: 'static/40', pl: 'static/40', pr: 'static/40', pt: 'static/40', pb: 'static/40' }, l: { d: 'H', ca: 'CENTER' }, ch: [tab('Chat', 'selected'), tab('Files', 'default'), tab('Settings', 'default')] },
    ] },
    { n: 'conversation', k: 'F', tb: { pl: 'static/240', pr: 'static/240', pt: 'static/320', pb: 'static/240', g: 'static/240' }, l: { d: 'V', ca: 'CENTER', sh: 'FILL', sv: 'FILL' }, ch: [
      { n: 'messages', k: 'F', tb: { g: 'static/240' }, l: { d: 'V', sh: 720, sv: 'FILL' }, ch: [
        { n: 'userMessage', k: 'F', l: { d: 'H', pa: 'MAX', sh: 'FILL' }, ch: [
          { n: 'bubble', k: 'F', tb: { f: 'surface/secondary/default', r: 'container/medium', pl: 'static/160', pr: 'static/160', pt: 'static/120', pb: 'static/120' }, l: { d: 'V', sh: 440 }, ch: [
            T('text', 'Can you summarise the launch notes from Tuesday’s meeting?', 'text/primary', 'body-base', TEXT_FILL)] },
        ] },
        { n: 'assistantMessage', k: 'F', tb: { g: 'static/80' }, l: { d: 'V', sh: 'FILL' }, ch: [
          T('author', 'Souvenir', 'text/secondary', 'label-base'),
          T('text', 'Here is the short version. The launch moves to 4 December. Priya owns the checklist, and the pricing page needs a final review by Friday. Two questions are still open: who signs off the press note, and whether the beta users get early access.', 'text/primary', 'body-base', TEXT_FILL),
        ] },
      ] },
      { n: 'composer', k: 'F', tb: { f: 'surface/primary/default', s: 'border/strong/default', sw: 'width/sm', r: 'container/large', pl: 'static/120', pr: 'static/120', pt: 'static/120', pb: 'static/120', g: 'static/80' }, l: { d: 'V', sh: 720 }, ch: [
        { n: 'message', k: 'C', set: 'Input', vp: { state: 'default', size: 'md' }, tx: { value: 'Ask a follow-up question' }, hide: ['label', 'description'], l: { sh: 'FILL' } },
        { n: 'actions', k: 'F', tb: { g: 'static/80' }, l: { d: 'H', pa: 'MAX', ca: 'CENTER', sh: 'FILL' }, ch: [
          btn('modelTrigger', { variant: 'ghost' }, { children: 'Standard', iconEnd: true }, { swap: { iconEnd: 'chevron-up' } }),
          btn('send', { variant: 'primary', iconOnly: 'true' }, undefined),
        ] },
      ] },
    ] },
    { n: 'modelMenu', k: 'C', set: 'DropdownMenuContent', l: { abs: 'above', anchor: 'modelTrigger', gap: 4 } },
  ] }, {});
  const mobile = resolveTree({ n: 'Delete project · mobile', k: 'F', tb: { f: 'surface/primary/default' }, l: { d: 'V', sh: 375, sv: 812, clip: true }, ch: [
    { n: 'settings', k: 'F', tb: { pl: 'static/160', pr: 'static/160', pt: 'static/400', pb: 'static/240', g: 'static/240' }, l: { d: 'V', sh: 'FILL', sv: 'FILL' }, ch: [
      T('heading', 'Project settings', 'text/primary', 'heading-4', TEXT_FILL),
      field('projectName', 'Project name', 'Q3 launch plan', 'Everyone in the project sees this name.'),
      field('ownerEmail', 'Owner email', 'priya@example.com', 'Requests to join go to this address.'),
      { n: 'actions', k: 'F', tb: { g: 'static/80' }, l: { d: 'H', sh: 'FILL' }, ch: [
        btn('export', { variant: 'secondary' }, { children: 'Export project' }),
        btn('delete', { variant: 'danger' }, { children: 'Delete project' }),
      ] },
    ] },
    // The dialog sits at the bottom on a phone, so the dimmed settings page and its two buttons stay visible above it.
    { n: 'overlay', k: 'F', tb: { f: 'surface/overlay', pl: 'static/160', pr: 'static/160', pt: 'static/160', pb: 'static/160' }, l: { d: 'V', pa: 'MAX', ca: 'CENTER', abs: 'cover', sh: 375, sv: 812 }, ch: [
      { n: 'dialog', k: 'C', set: 'DialogContent', vp: { size: 'sm' }, l: { sh: 'FILL' },
        tx: { title: 'Delete project?', description: 'Q3 launch plan and its 24 chats will be deleted for everyone in the project.', bodyText: 'You can’t undo this. Export the project first if you want to keep a copy.' },
        nested: [{ n: 'close', props: { children: 'Cancel' } }, { n: 'action', props: { variant: 'danger', children: 'Delete project' } }] },
    ] },
  ] }, {});
  return [
    { script: '01-desktop-assistant', tree: desktop },
    { script: '02-mobile-delete-project', tree: mobile },
  ];
}

// ---------- the use_figma runtime shared by every script (plain JavaScript, run inside Figma) ----------
const RUNTIME = String.raw`
const SANDBOX = '3WGIouA6dby5LNzVkdaA48';
if (figma.fileKey !== SANDBOX) throw new Error('Refusing to run: this is not the sandbox file (' + figma.fileKey + ')');
const PAGE_NAME = 'DS V2 · Components (added by Claude)';
const ROOT_NAME = 'DS V2 components (generated)';
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const colById = new Map(cols.map((c) => [c.id, c]));
const VMAP = new Map();
for (const v of await figma.variables.getLocalVariablesAsync()) { const c = colById.get(v.variableCollectionId); if (c && c.name.endsWith(' (DS V2)')) VMAP.set(c.name + '|' + v.name, v); }
const effects = await figma.getLocalEffectStylesAsync();
const V = (key) => { const v = VMAP.get(key); if (!v) throw new Error('Missing variable ' + key); return v; };
const TK = (i) => DATA.tokens[i];
// A bound paint also stores a plain colour, which Figma shows until it recomputes. Re-binding a node to the same variable
// does not recompute it, so the stored colour is the variable's value as this node resolves it, never a placeholder.
const paint = (node, v) => { const r = v.resolveForConsumer(node).value; return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: r.r, g: r.g, b: r.b } }, 'color', v); };
const themes = cols.find((c) => c.name === 'Themes (DS V2)');
if (!themes) throw new Error('Missing collection Themes (DS V2)');
const modeId = (m) => { const x = themes.modes.find((y) => y.name === m); if (!x) throw new Error('Missing mode ' + m); return x.modeId; };
for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync({ family: 'Geist', style });
const result = { script: DATA.script, created: [], rebuilt: [], counts: {} };
const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
const FIELD = { pl: 'paddingLeft', pr: 'paddingRight', pt: 'paddingTop', pb: 'paddingBottom', g: 'itemSpacing', mh: 'minHeight', nw: 'minWidth', xw: 'maxWidth' };
const post = [];
const refs = [];
let iconCache = null;
function iconComp(name) {
  if (!iconCache) { iconCache = new Map(); const page = figma.root.children.find((p) => p.name === PAGE_NAME); for (const n of page.findAllWithCriteria({ types: ['COMPONENT'] })) if (n.name.startsWith('Icon/')) iconCache.set(n.name, n); }
  const c = iconCache.get('Icon/' + name); if (!c) throw new Error('Missing icon component Icon/' + name); return c;
}
const compCache = new Map();
function findComp(name) {
  if (compCache.has(name)) return compCache.get(name);
  const page = figma.root.children.find((p) => p.name === PAGE_NAME);
  const c = page.findOne((n) => (n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && n.parent.type !== 'COMPONENT_SET')) && n.name === name);
  if (!c) throw new Error('Missing component ' + name + ': run the components scripts first'); compCache.set(name, c); return c;
}
const propKey = (owner, name) => { const k = Object.keys(owner.componentPropertyDefinitions).find((d) => d.split('#')[0] === name); if (!k) throw new Error('No property ' + name + ' on ' + owner.name); return k; };
async function bindBox(node, s) {
  const b = s.b || {};
  const L = s.l || {};
  node.fills = []; node.strokes = []; node.clipsContent = !!L.clip;
  if (L.abs !== 'ring' && L.abs !== 'bottom') {
    node.layoutMode = L.d === 'V' ? 'VERTICAL' : 'HORIZONTAL';
    node.primaryAxisAlignItems = L.pa || 'MIN'; node.counterAxisAlignItems = L.ca || 'MIN';
    node.primaryAxisSizingMode = 'AUTO'; node.counterAxisSizingMode = 'AUTO';
    node.paddingLeft = node.paddingRight = node.paddingTop = node.paddingBottom = 0; node.itemSpacing = 0;
  }
  if (b.f !== undefined && b.f !== '-') node.fills = [paint(node, V(TK(b.f)))];
  if (b.s !== undefined && b.s !== '-') node.strokes = [paint(node, V(TK(b.s)))];
  node.strokeAlign = L.abs === 'ring' ? 'OUTSIDE' : 'INSIDE';
  if (b.sw !== undefined) {
    if (L.abs === 'bottom' || L.side === 'bottom') { node.strokeTopWeight = 0; node.strokeLeftWeight = 0; node.strokeRightWeight = 0; node.setBoundVariable('strokeBottomWeight', V(TK(b.sw))); }
    else node.setBoundVariable('strokeWeight', V(TK(b.sw)));
  }
  if (b.r !== undefined) for (const k of CORNERS) node.setBoundVariable(k, V(TK(b.r)));
  for (const [f, prop] of Object.entries(FIELD)) if (b[f] !== undefined) node.setBoundVariable(prop, V(TK(b[f])));
  if (b.h !== undefined) { if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'FIXED'; else if (node.layoutMode === 'HORIZONTAL') node.counterAxisSizingMode = 'FIXED'; node.setBoundVariable('height', V(TK(b.h))); }
  if (b.w !== undefined) { if (node.layoutMode === 'HORIZONTAL') node.primaryAxisSizingMode = 'FIXED'; else if (node.layoutMode === 'VERTICAL') node.counterAxisSizingMode = 'FIXED'; node.setBoundVariable('width', V(TK(b.w))); }
  if (b.e !== undefined) { const name = TK(b.e).slice(6); const st = effects.find((e) => e.name === name); if (!st) throw new Error('Missing effect style ' + name); await node.setEffectStyleIdAsync(st.id); }
}
function sizeIt(node, L, parentAuto) {
  if (!L) return;
  if (typeof L.sh === 'number') { if (parentAuto) node.layoutSizingHorizontal = 'FIXED'; node.resize(L.sh, node.height); if (node.layoutMode === 'HORIZONTAL') node.primaryAxisSizingMode = 'FIXED'; else if (node.layoutMode === 'VERTICAL') node.counterAxisSizingMode = 'FIXED'; }
  if (typeof L.sv === 'number') { if (parentAuto) node.layoutSizingVertical = 'FIXED'; node.resize(node.width, L.sv); if (node.layoutMode === 'VERTICAL') node.primaryAxisSizingMode = 'FIXED'; else if (node.layoutMode === 'HORIZONTAL') node.counterAxisSizingMode = 'FIXED'; }
  if (L.sh === 'FILL' && parentAuto) { node.layoutSizingHorizontal = 'FILL'; if (node.type === 'TEXT') node.textAutoResize = 'HEIGHT'; }
  if (L.sv === 'FILL' && parentAuto) node.layoutSizingVertical = 'FILL';
}
async function build(s, parent, target) {
  const parentAuto = parent && parent.layoutMode && parent.layoutMode !== 'NONE';
  let node;
  if (s.k === 'F') {
    node = target || figma.createFrame();
    if (!target) { parent.appendChild(node); node.name = s.n; }
    await bindBox(node, s);
    const L = s.l || {};
    if (L.abs) { node.layoutPositioning = 'ABSOLUTE'; sizeIt(node, { sh: typeof L.sh === 'number' ? L.sh : undefined, sv: typeof L.sv === 'number' ? L.sv : undefined }, false); post.push([node, L]); }
    else if (!target) sizeIt(node, L, parentAuto);
    else sizeIt(node, { sh: typeof L.sh === 'number' ? L.sh : undefined, sv: typeof L.sv === 'number' ? L.sv : undefined }, false);
    for (const c of s.ch || []) await build(c, node);
  } else if (s.k === 'T') {
    node = figma.createText(); parent.appendChild(node); node.name = s.n;
    node.fontName = { family: 'Geist', style: s.st }; node.characters = s.x;
    const b = s.b;
    node.fills = [paint(node, V(TK(b.c)))];
    node.setBoundVariable('fontFamily', V(TK(b.ff))); node.setBoundVariable('fontStyle', V(TK(b.fw)));
    node.setBoundVariable('fontSize', V(TK(b.fs))); node.setBoundVariable('lineHeight', V(TK(b.lh)));
    sizeIt(node, s.l, parentAuto);
  } else if (s.k === 'I') {
    node = iconComp(s.i).createInstance(); parent.appendChild(node); node.name = s.n;
    node.setBoundVariable('width', V(TK(s.b.zw))); node.setBoundVariable('height', V(TK(s.b.zh)));
    for (const g of node.findAll((n) => n.type !== 'INSTANCE' && 'strokes' in n && n.strokes.length)) g.strokes = [paint(g, V(TK(s.b.c)))];
  } else if (s.k === 'C') {
    const owner = findComp(s.set);
    let main = owner;
    if (owner.type === 'COMPONENT_SET') { main = owner.children.find((c) => Object.entries(s.vp || {}).every(([k, v]) => c.variantProperties[k] === String(v))); if (!main) throw new Error('No variant of ' + s.set + ' with ' + JSON.stringify(s.vp)); }
    node = main.createInstance(); parent.appendChild(node); node.name = s.n;
    await overrides(node, owner, s);
    const L = s.l || {};
    if (L.abs) { node.layoutPositioning = 'ABSOLUTE'; post.push([node, L]); } else sizeIt(node, L, parentAuto);
  }
  if (s.v === 0) node.visible = false;
  if (s.ref) refs.push([node, s.ref]);
  return node;
}
async function overrides(inst, owner, s) {
  if (s.props) { const p = {}; for (const [k, v] of Object.entries(s.props)) p[owner.type === 'COMPONENT_SET' && k === 'variant' ? 'variant' : propKey(owner, k)] = v; inst.setProperties(p); }
  for (const [name, icon] of Object.entries(s.swap || {})) {
    const nested = inst.findOne((n) => n.type === 'INSTANCE' && n.name === name); if (!nested) throw new Error('No nested ' + name);
    const keep = nested.findAll((n) => n.type !== 'INSTANCE' && 'strokes' in n && n.strokes.length).map((g) => g.strokes[0].boundVariables && g.strokes[0].boundVariables.color && g.strokes[0].boundVariables.color.id).find(Boolean);
    nested.swapComponent(iconComp(icon));
    if (keep) { const v = await figma.variables.getVariableByIdAsync(keep); for (const g of nested.findAll((n) => n.type !== 'INSTANCE' && 'strokes' in n && n.strokes.length)) g.strokes = [paint(g, v)]; }
  }
  for (const [name, text] of Object.entries(s.tx || {})) { const t = inst.findOne((n) => n.type === 'TEXT' && n.name === name); if (!t) throw new Error('No text ' + name + ' in ' + s.n); t.characters = text; }
  for (const name of s.hide || []) { const h = inst.findOne((n) => n.name === name); if (!h) throw new Error('No node ' + name + ' to hide'); h.visible = false; }
  for (const nd of s.nested || []) {
    const ni = inst.findOne((n) => n.type === 'INSTANCE' && n.name === nd.n); if (!ni) throw new Error('No nested instance ' + nd.n);
    const mc = await ni.getMainComponentAsync(); const no = mc.parent.type === 'COMPONENT_SET' ? mc.parent : mc;
    const p = {}; for (const [k, v] of Object.entries(nd.props)) p[k === 'variant' ? 'variant' : propKey(no, k)] = v; ni.setProperties(p);
  }
}
function finish() {
  for (const [node, L] of post) {
    const p = node.parent;
    if (L.abs === 'ring') { const o = L.off; node.x = -o; node.y = -o; node.resize(p.width + 2 * o, p.height + 2 * o); node.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; }
    else if (L.abs === 'bottom') { node.resize(p.width, 2); node.x = 0; node.y = p.height - 2; node.constraints = { horizontal: 'STRETCH', vertical: 'MAX' }; }
    else if (L.abs === 'topright') { node.x = p.width - node.width - L.inset; node.y = L.inset; node.constraints = { horizontal: 'MAX', vertical: 'MIN' }; }
    else if (L.abs === 'cover') { node.x = 0; node.y = 0; node.resize(p.width, p.height); node.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; }
    else if (L.abs === 'above') {
      const a = p.findOne((n) => n.name === L.anchor); if (!a) throw new Error('No anchor ' + L.anchor);
      const pa = p.absoluteTransform, aa = a.absoluteTransform;
      node.x = Math.round(aa[0][2] - pa[0][2] + a.width - node.width); node.y = Math.round(aa[1][2] - pa[1][2] - node.height - L.gap);
    }
  }
  post.length = 0;
}
function findOrMake(parent, name, make) { let n = parent.children.find((c) => c.name === name); if (!n) { n = make(); parent.appendChild(n); n.name = name; result.created.push(n.id); } return n; }
function textNode(parent, name, chars, color, role, style) {
  let t = parent.children.find((c) => c.name === name && c.type === 'TEXT');
  if (!t) { t = figma.createText(); parent.appendChild(t); t.name = name; }
  t.fontName = { family: 'Geist', style }; t.characters = chars; t.fills = [paint(t, V('Themes (DS V2)|' + color))];
  t.setBoundVariable('fontSize', V('Typography (DS V2)|font-size/' + role)); t.setBoundVariable('lineHeight', V('Typography (DS V2)|line-height/' + role));
  t.setBoundVariable('fontFamily', V('Typography (DS V2)|font-family/sans'));
  return t;
}
async function getPage(name, create) {
  let page = figma.root.children.find((p) => p.name === name);
  if (!page) { if (!create) throw new Error('Missing page ' + name + ': run 00 first'); page = figma.createPage(); page.name = name; result.created.push(page.id); }
  await figma.setCurrentPageAsync(page);
  return page;
}
function styleFrame(f, mode) {
  f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  f.itemSpacing = 32; f.paddingLeft = f.paddingRight = f.paddingTop = f.paddingBottom = 48;
  f.setExplicitVariableModeForCollection(themes, modeId(mode));
  f.fills = [paint(f, V('Themes (DS V2)|surface/primary/default'))];
  f.strokes = [paint(f, V('Themes (DS V2)|border/primary/default'))]; f.setBoundVariable('strokeWeight', V('Border (DS V2)|width/sm'));
  for (const k of CORNERS) f.setBoundVariable(k, V('Radius (DS V2)|container/large'));
}
function rootFrame(page, name) {
  return findOrMake(page, name, () => { const f = figma.createFrame(); f.layoutMode = 'VERTICAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.itemSpacing = 80; f.paddingLeft = f.paddingRight = f.paddingTop = f.paddingBottom = 80; f.fills = []; return f; });
}
function section(root, key, title, sub) {
  const row = findOrMake(root, 'Section · ' + key, () => { const f = figma.createFrame(); f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.itemSpacing = 64; f.fills = []; return f; });
  const out = {};
  for (const mode of ['light', 'dark']) {
    const f = findOrMake(row, key + ' · ' + mode, () => figma.createFrame());
    styleFrame(f, mode);
    const t = textNode(f, 'title', title + (mode === 'dark' ? ' · dark' : ' · light'), 'text/primary', 'heading-4', 'Bold');
    const s = textNode(f, 'subtitle', sub, 'text/secondary', 'body-base', 'Medium');
    f.insertChild(0, t); f.insertChild(1, s);
    out[mode] = f;
  }
  return out;
}
`;

// The part of the runtime that builds component sets, components, examples and their dark copies.
const COMPONENTS_MAIN = String.raw`
const page = await getPage(PAGE_NAME, false);
const root = rootFrame(page, ROOT_NAME);
const sec = section(root, DATA.section, DATA.section, 'Generated from ds-components/specs/' + DATA.slug + '.spec.json on 16 November 2026. Light on the left, dark on the right (Themes (DS V2) set to dark on the frame).');
const NODES = DATA.nodes;
const expand = (i) => { const n = { ...NODES[i] }; if (n.ch) n.ch = n.ch.map(expand); return n; };
async function buildComponent(existing, name, tree) {
  let comp = existing;
  if (comp) { for (const c of [...comp.children]) c.remove(); result.rebuilt.push(comp.id); }
  else { comp = figma.createComponent(); result.created.push(comp.id); }
  comp.name = name;
  await build(tree, null, comp);
  finish();
  return comp;
}
function grid(set, colProp) {
  const rows = [], cols = [], cell = [];
  for (const c of set.children) { const vp = c.variantProperties; const col = vp[colProp]; const row = Object.entries(vp).filter(([k]) => k !== colProp).map(([k, v]) => k + '=' + v).join(', '); if (!rows.includes(row)) rows.push(row); if (!cols.includes(col)) cols.push(col); cell.push([c, cols.indexOf(col), rows.indexOf(row)]); }
  const cw = cols.map(() => 0), rh = rows.map(() => 0);
  for (const [c, i, j] of cell) { cw[i] = Math.max(cw[i], c.width); rh[j] = Math.max(rh[j], c.height); }
  const G = 24, P = 32;
  const xs = cols.map((_, i) => P + cw.slice(0, i).reduce((a, b) => a + b + G, 0));
  const ys = rows.map((_, j) => P + rh.slice(0, j).reduce((a, b) => a + b + G, 0));
  for (const [c, i, j] of cell) { c.x = xs[i]; c.y = ys[j]; }
  set.resize(xs[xs.length - 1] + cw[cw.length - 1] + P, ys[ys.length - 1] + rh[rh.length - 1] + P);
}
const counts = {};
for (const it of DATA.items) {
  if (it.type === 'set') {
    let set = sec.light.children.find((c) => c.type === 'COMPONENT_SET' && c.name === it.name);
    const built = [];
    for (const v of it.variants) {
      const existing = set ? set.children.find((c) => c.name === v.name) : null;
      built.push(await buildComponent(existing, v.name, expand(v.tree)));
    }
    if (!set) { set = figma.combineAsVariants(built, sec.light); set.name = it.name; result.created.push(set.id); }
    else { for (const c of built) if (c.parent !== set) set.appendChild(c); }
    set.description = it.desc;
    for (const [pname, type, def] of it.props) if (!Object.keys(set.componentPropertyDefinitions).some((k) => k.split('#')[0] === pname)) set.addComponentProperty(pname, type, def);
    for (const [node, ref] of refs) { const r = {}; for (const [field, pname] of Object.entries(ref)) r[field] = propKey(set, pname); node.componentPropertyReferences = r; }
    refs.length = 0;
    grid(set, it.colProp);
    const dark = findOrMake(sec.dark, it.name + ' · instances', () => { const f = figma.createFrame(); f.fills = []; return f; });
    for (const c of [...dark.children]) c.remove();
    dark.resize(set.width, set.height);
    for (const c of set.children) { const i = c.createInstance(); dark.appendChild(i); i.x = c.x; i.y = c.y; }
    counts[it.name] = set.children.length;
    result[it.name] = { set: set.id, dark: dark.id };
  } else if (it.type === 'component') {
    const existing = sec.light.children.find((c) => c.type === 'COMPONENT' && c.name === it.name);
    const comp = await buildComponent(existing, it.name, expand(it.tree));
    if (!existing) sec.light.appendChild(comp);
    comp.description = it.desc;
    refs.length = 0;
    const dname = it.name + ' · instance';
    for (const c of sec.dark.children.filter((c) => c.name === dname)) c.remove();
    const inst = comp.createInstance(); sec.dark.appendChild(inst); inst.name = dname;
    counts[it.name] = 1;
    result[it.name] = { component: comp.id, dark: inst.id };
  } else if (it.type === 'example') {
    const tree = expand(it.tree);
    for (const f of [sec.light, sec.dark]) for (const c of f.children.filter((c) => c.name === tree.n)) c.remove();
    const ex = await build(tree, sec.light); finish();
    const copy = ex.clone(); sec.dark.appendChild(copy);
    result[tree.n] = { light: ex.id, dark: copy.id };
  }
}
result.counts = counts;
result.section = { light: sec.light.id, dark: sec.dark.id };
return result;
`;

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  'arrow-up': '<path d="m5 12 7-7 7 7M12 19V5"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
  dot: '<circle cx="12" cy="12" r="2" stroke-width="4"/>',
};
const ICONS_MAIN = String.raw`
const page = await getPage(PAGE_NAME, true);
const root = rootFrame(page, ROOT_NAME);
const sec = section(root, 'Icons', 'Icons', 'Simple stroke icons drawn once as components. Each stroke is bound to text/primary here; every part that uses an icon rebinds it to its own text colour.');
const made = {};
const mkRow = () => { const f = figma.createFrame(); f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.itemSpacing = 16; f.fills = []; return f; };
const lightRow = findOrMake(sec.light, 'icons', mkRow);
for (const [name, body] of Object.entries(DATA.icons)) {
  const full = 'Icon/' + name;
  let comp = lightRow.children.find((c) => c.type === 'COMPONENT' && c.name === full);
  if (!comp) {
    const svg = figma.createNodeFromSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>');
    comp = figma.createComponent(); comp.resize(24, 24); comp.fills = []; comp.clipsContent = false;
    for (const c of [...svg.children]) comp.appendChild(c);
    svg.remove();
    const vec = comp.children.length > 1 ? figma.flatten([...comp.children], comp) : comp.children[0];
    vec.name = 'vector'; vec.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    lightRow.appendChild(comp); comp.name = full;
    comp.description = 'Icon ' + name + ', drawn for the DS V2 components. The stroke is bound to text/primary; parts rebind it to their own text colour.';
    result.created.push(comp.id);
  }
  for (const g of comp.findAll((n) => 'strokes' in n && n.strokes.length)) g.strokes = [paint(g, V('Themes (DS V2)|text/primary'))];
  made[full] = comp.id;
}
const row = findOrMake(sec.dark, 'icons', mkRow);
for (const c of [...row.children]) c.remove();
for (const id of Object.values(made)) { const c = await figma.getNodeByIdAsync(id); row.appendChild(c.createInstance()); }
result.icons = made; result.page = page.id; result.root = root.id;
return result;
`;

// Re-applies the section frames' own paints (title, subtitle, fill, stroke) on the components page without rebuilding any
// component. Written after a rerun left two sections showing a stale placeholder colour (see the note on paint above).
const REFRESH_MAIN = String.raw`
const page = await getPage(PAGE_NAME, false);
const root = rootFrame(page, ROOT_NAME);
for (const [key, sub] of DATA.sections) section(root, key, key, sub);
result.sections = DATA.sections.map((s) => s[0]);
return result;
`;

const SCREENS_MAIN = String.raw`
const page = await getPage(${JSON.stringify(SCREENS_PAGE)}, true);
const root = rootFrame(page, 'DS V2 screens (generated)');
// The components live on another page: load it (read only) so instances can be made from them.
const compPage = figma.root.children.find((p) => p.name === PAGE_NAME); if (!compPage) throw new Error('Missing page ' + PAGE_NAME);
await compPage.loadAsync();
const NODES = DATA.nodes;
const expand = (i) => { const n = { ...NODES[i] }; if (n.ch) n.ch = n.ch.map(expand); return n; };
const tree = expand(DATA.tree);
const row = findOrMake(root, 'Row · ' + tree.n, () => { const f = figma.createFrame(); f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.itemSpacing = 80; f.fills = []; return f; });
for (const c of [...row.children]) c.remove();
const light = await build(tree, row); finish();
light.name = tree.n + ' · light';
light.setExplicitVariableModeForCollection(themes, modeId('light'));
const dark = light.clone(); row.appendChild(dark); dark.name = tree.n + ' · dark';
dark.setExplicitVariableModeForCollection(themes, modeId('dark'));
result.page = page.id; result.light = light.id; result.dark = dark.id; result.size = [light.width, light.height];
return result;
`;

// ---------- packing a script ----------
function pack(header, data, main) {
  const code = `${header}\nconst DATA = ${JSON.stringify(data)};\n${RUNTIME}\n${main}`;
  if (code.length > LIMIT) throw new Error(`${data.script}: ${code.length} characters, over ${LIMIT}`);
  return code;
}
// Replaces token keys by indices into a table and stores each node once.
function compress(trees) {
  const tokens = [], tix = new Map(), nodes = [], nix = new Map();
  const tok = (k) => { if (k === '-') return '-'; if (!tix.has(k)) { tix.set(k, tokens.length); tokens.push(k); } return tix.get(k); };
  const put = (n) => {
    const o = { ...n };
    if (o.b) o.b = Object.fromEntries(Object.entries(o.b).map(([f, k]) => [f, tok(k)]));
    if (o.ch) o.ch = o.ch.map(put);
    const s = JSON.stringify(o);
    if (!nix.has(s)) { nix.set(s, nodes.length); nodes.push(o); }
    return nix.get(s);
  };
  return { tokens, nodes, roots: trees.map(put) };
}
const HEADER = (what, src) => `// GENERATED by v2/tools/figma/make-component-scripts.mjs from ${src} and ds-tokens/dist/tokens.json.
// Do not edit by hand: change the generator and regenerate. Run the scripts in order through use_figma, exactly as written.
// SANDBOX ONLY: writes only to the Figma file "Souvenir-test" (3WGIouA6dby5LNzVkdaA48) and refuses any other file. It only adds to,
// or rebuilds, nodes on the pages "${PAGE_NAME}" and "${SCREENS_PAGE}"; it reads the "(DS V2)" variables and effect styles
// and never changes them. It is idempotent by name inside its page.
// ${what}`;

export function buildAll() {
  const out = [];
  const manifest = { generated: DATE, sets: {} };
  out.push({ dir: OUT, file: '00-page-and-icons.figma.js', code: pack(HEADER('Step 0: the page, its root frame and the Icon/* components.', 'the icon list in the generator'), { script: '00-page-and-icons', icons: ICONS, tokens: [] }, ICONS_MAIN) });
  const SUB = (slug) => `Generated from ds-components/specs/${slug}.spec.json on 16 November 2026. Light on the left, dark on the right (Themes (DS V2) set to dark on the frame).`;
  const sections = [['Icons', 'Simple stroke icons drawn once as components. Each stroke is bound to text/primary here; every part that uses an icon rebinds it to its own text colour.']];
  for (const s of components()) if (!sections.some((x) => x[0] === s.section)) sections.push([s.section, SUB(s.slug)]);
  out.push({ dir: OUT, file: '06-refresh-section-paints.figma.js', code: pack(HEADER('Step 6: re-applies the paints of the section frames and their titles; rebuilds nothing.', 'the section list in the generator'), { script: '06-refresh-section-paints', tokens: [], sections }, REFRESH_MAIN) });
  for (const s of components()) {
    const trees = [];
    for (const it of s.items) { if (it.type === 'set') for (const v of it.variants) trees.push(v.tree); else trees.push(it.tree); }
    const c = compress(trees);
    let i = 0;
    const items = s.items.map((it) => {
      if (it.type === 'set') {
        manifest.sets[it.name] = { ...(manifest.sets[it.name] || {}), ...Object.fromEntries(it.variants.map((v) => [v.name, expectedBindings(v.tree)])) };
        return { type: 'set', name: it.name, colProp: it.colProp, desc: it.desc, props: it.props, variants: it.variants.map((v) => ({ name: v.name, tree: c.roots[i++] })) };
      }
      if (it.type === 'component') manifest.sets[it.name] = { [it.name]: expectedBindings(it.tree) };
      return { type: it.type, name: it.name, desc: it.desc, tree: c.roots[i++] };
    });
    const data = { script: s.script, section: s.section, slug: s.slug, tokens: c.tokens, nodes: c.nodes, items };
    out.push({ dir: OUT, file: `${s.script}.figma.js`, code: pack(HEADER(`The ${s.section} section: component sets, components and examples, light and dark.`, `ds-components/specs/${s.slug}.spec.json`), data, COMPONENTS_MAIN) });
  }
  for (const s of screens()) {
    const c = compress([s.tree]);
    out.push({ dir: OUT_SCREENS, file: `${s.script}.figma.js`, code: pack(HEADER(`Screen ${s.tree.n}: instances of the DS V2 components only, plus frames and text bound to tokens; light and a dark copy.`, 'the screen templates in the generator'), { script: s.script, tokens: c.tokens, nodes: c.nodes, tree: c.roots[0] }, SCREENS_MAIN) });
  }
  return { out, manifest };
}

// ---------- self-test of the rule engine ----------
function selfTest() {
  const button = loadSpec('button');
  const fails = [];
  const eq = (what, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(`${what}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };
  const d1 = declarationsFor(button, { props: { variant: 'primary', size: 'md' }, states: ['hover'] });
  eq('primary hover background', d1.root.background, 'interactive/primary/hover');
  eq('primary hover colour', d1.root.color, 'text/on');
  const d2 = declarationsFor(button, { props: { variant: 'ghost' }, states: ['disabled'] });
  eq('ghost disabled background (a later rule wins)', d2.root.background, 'transparent');
  const d3 = declarationsFor(button, { props: { size: 'sm' }, states: [] });
  eq('sm min height (the coarse-pointer media rule is skipped)', d3.root.minHeight, 'control/sm');
  const t = resolveTree(buttonTree({ variant: 'primary', state: 'focus', size: 'md', iconOnly: false }), declarationsFor(button, { props: { variant: 'primary' }, states: ['focus'] }));
  const e = expectedBindings(t);
  eq('label inherits root colour', e.label.c, 'Themes (DS V2)|text/on');
  eq('focus ring stroke', e.focusRing.s, 'Themes (DS V2)|border/focus');
  eq('label weight token', e.label.fw, 'Typography (DS V2)|font-weight/label');
  eq('shadow maps to the effect style', tokenKey('shadow/md'), 'style|shadow/md (DS V2)');
  let threw = false; try { tokenKey('no/such/token'); } catch { threw = true; }
  eq('a missing token fails loudly', threw, true);
  if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
  console.log('self-test: 9 checks passed');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const { out, manifest } = buildAll();
    mkdirSync(OUT, { recursive: true }); mkdirSync(OUT_SCREENS, { recursive: true });
    for (const f of out) { writeFileSync(join(f.dir, f.file), f.code); console.log(`${f.file}: ${f.code.length} characters`); }
    writeFileSync(join(OUT, 'expected.json'), JSON.stringify(manifest, null, 1));
    const nv = Object.values(manifest.sets).reduce((a, s) => a + Object.keys(s).length, 0);
    console.log(`expected.json: ${Object.keys(manifest.sets).length} components or sets, ${nv} variants`);
  }
}
