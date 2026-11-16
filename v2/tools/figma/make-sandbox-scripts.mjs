// Generates the plain-JavaScript files that put the merged Souvenir token set into the Figma SANDBOX file "Souvenir-test"
// (file key 3WGIouA6dby5LNzVkdaA48) as new collections, effect styles and one page. Nothing here is typed by hand per token:
// every value, alias, scope, code syntax and description comes from the repo.
//
// Usage (from the repository root):
//   node v2/tools/figma/make-sandbox-scripts.mjs              write v2/figma/sandbox/scripts/NN-*.figma.js
//   node v2/tools/figma/make-sandbox-scripts.mjs --self-test  generate twice in memory and check: every file parses as an async
//                                                              function body, stays under 45,000 characters, starts with the
//                                                              generated/sandbox comment, calls createVariableCollection only with
//                                                              literal sandbox-safe names, never calls remove() outside its own page,
//                                                              and the two runs (and the files on disk) are byte-identical.
// Inputs:
//   ds-tokens/dist/tokens.json      the built semantic and proposed tokens (values, aliases, CSS names, scopes)
//   v2/figma/primitives.txt         the owner's primitives (always this file, whatever SOUVENIR_SNAPSHOT_DIR says)
//   ds-tokens/descriptions.json     one description per token
//   v2/tools/contrast-pairs.json    which surface each text role is meant to sit on (for the "Aa" samples on the page)
// Run the files in order with use_figma on the sandbox only. Each is idempotent: it finds a collection, variable, style or page by
// name before creating it and updates it otherwise, and it refuses to run in any other file.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSnapshot } from '../lib/snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT_DIR = join(ROOT, 'v2', 'figma', 'sandbox', 'scripts');
const SANDBOX_KEY = '3WGIouA6dby5LNzVkdaA48';
const LIMIT = 45000;
const BUDGET = 40000; // pack rows until a file reaches this, leaving room for the preamble's growth
const PAGE_NAME = 'DS V2 · Tokens (added by Claude)';
const PAGE_DATE = '16 November 2026';

const PRIM = { Colors: 'Colors (DS V2 primitives)', Typography: 'Typography (DS V2 primitives)', Space: 'Space (DS V2 primitives)', Radius: 'Radius (DS V2 primitives)' };
const SEM_ORDER = ['Themes', 'Typography', 'Radius', 'Density', 'Surface Gradients', 'Border', 'Size', 'Motion'];
const SEM_MODES = { Themes: ['light', 'dark'], Typography: ['default'], Radius: ['default'], Density: ['standard', 'compact'], 'Surface Gradients': ['light', 'dark'], Border: ['default'], Size: ['default'], Motion: ['default'] };
const semName = (c) => `${c} (DS V2)`;
const SAFE_COLLECTIONS = new Set([...Object.values(PRIM), ...SEM_ORDER.map(semName)]);

// ---------- inputs ----------
function load() {
  const tokens = JSON.parse(readFileSync(join(ROOT, 'ds-tokens/dist/tokens.json'), 'utf8'));
  const prims = parseSnapshot(readFileSync(join(ROOT, 'v2/figma/primitives.txt'), 'utf8'), 'primitives');
  const descriptions = JSON.parse(readFileSync(join(ROOT, 'ds-tokens/descriptions.json'), 'utf8'));
  const pairs = JSON.parse(readFileSync(join(ROOT, 'v2/tools/contrast-pairs.json'), 'utf8'));
  return { tokens, prims, descriptions, pairs };
}

// ---------- conversions ----------
const FIGMA_TYPE = { color: 'COLOR', dimension: 'FLOAT', duration: 'FLOAT', number: 'FLOAT', fontWeight: 'STRING', fontFamily: 'STRING', cubicBezier: 'STRING' };
const PRIM_TYPE = { color: 'COLOR', number: 'FLOAT', string: 'STRING' };

function literal(t, v) {
  const type = FIGMA_TYPE[t.type];
  if (type === 'COLOR') { if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) throw new Error(`${t.name}: colour ${v} is not #rrggbb(aa)`); return v.toLowerCase(); }
  if (type === 'FLOAT') {
    const m = String(v).trim().match(/^(-?\d*\.?\d+)(px|rem|ms)?$/);
    if (!m) throw new Error(`${t.name}: cannot read ${v} as a number`);
    return +(Number(m[1]) * (m[2] === 'rem' ? 16 : 1)).toFixed(4);
  }
  if (t.type === 'fontFamily') return String(v).split(',')[0].trim().replace(/^["']|["']$/g, '');
  if (t.type === 'cubicBezier') return String(v);
  throw new Error(`${t.name}: no literal rule for type ${t.type}`);
}

function scopesFor(t) {
  const s = t.name.split('/');
  const c = t.collection;
  const owner = (t.scopes || []).filter((x) => x !== 'ALL_SCOPES');
  let out;
  if (c === 'Typography') out = { 'font-size': ['FONT_SIZE'], 'line-height': ['LINE_HEIGHT'], 'font-weight': ['FONT_STYLE'], 'font-family': ['FONT_FAMILY'] }[s[0]];
  else if (c === 'Radius') out = ['CORNER_RADIUS'];
  else if (c === 'Density') out = owner.length ? owner : ['WIDTH_HEIGHT', 'GAP'];
  else if (c === 'Border') out = t.name === 'focus/offset' ? ['GAP'] : ['STROKE_FLOAT'];
  else if (c === 'Size') out = ['WIDTH_HEIGHT'];
  else if (c === 'Motion') out = []; // no Figma scope fits a duration or an easing
  else if (c === 'Themes') {
    if (s[0] === 'icon') out = ['SHAPE_FILL', 'STROKE_COLOR'];
    else if (s[0] === 'text') out = ['TEXT_FILL'];
    else if (s[0] === 'border') out = ['STROKE_COLOR'];
    else out = owner.length ? owner : ['FRAME_FILL', 'SHAPE_FILL'];
  } else if (c === 'Surface Gradients') out = owner.length ? owner : ['FRAME_FILL', 'SHAPE_FILL'];
  if (!out) throw new Error(`no scope rule for ${c} ${t.name}`);
  if (out.includes('ALL_SCOPES')) throw new Error(`${c} ${t.name}: ALL_SCOPES is never allowed`);
  return out;
}

// ---------- rows ----------
function primitiveRows(prims) {
  const rows = [];
  for (const c of prims) {
    if (!PRIM[c.name]) throw new Error(`unknown primitive collection ${c.name}`);
    for (const v of c.variables) {
      if (v.name.startsWith('not-used/')) continue;
      const raw = v.values[0];
      const value = v.type === 'color' ? raw.toLowerCase() : v.type === 'number' ? Number(raw) : JSON.parse(raw);
      rows.push({ c: PRIM[c.name], n: v.name, t: PRIM_TYPE[v.type], v: value });
    }
  }
  return rows;
}

function semanticRows({ tokens, prims, descriptions }) {
  const primIndex = new Map(); // name -> [{collection, type}]
  for (const c of prims) for (const v of c.variables) {
    if (v.name.startsWith('not-used/')) continue;
    if (!primIndex.has(v.name)) primIndex.set(v.name, []);
    primIndex.get(v.name).push({ collection: c.name, type: PRIM_TYPE[v.type] });
  }
  const desc = new Map(descriptions.map((d) => [`${d.collection}|${d.name}`, d.description]));
  const rows = [];
  const elevation = [];
  for (const coll of [...SEM_ORDER, 'Elevation']) {
    for (const t of tokens.filter((x) => x.collection === coll)) {
      const d = desc.get(`${t.collection}|${t.name}`);
      if (!d) throw new Error(`no description for ${t.collection} ${t.name}`);
      if (coll === 'Elevation') { elevation.push({ name: t.name, light: t.values.light, description: d }); continue; }
      const modes = SEM_MODES[coll];
      if (Object.keys(t.values).join() !== modes.join()) throw new Error(`${coll} ${t.name}: modes ${Object.keys(t.values)} are not ${modes}`);
      const type = FIGMA_TYPE[t.type];
      if (!type) throw new Error(`${coll} ${t.name}: no Figma type for ${t.type}`);
      const values = modes.map((m) => {
        const a = t.alias?.[m];
        if (!a) return { v: literal(t, t.values[m]) };
        const hits = primIndex.get(a) || [];
        const hit = hits.length === 1 ? hits[0] : hits.find((h) => h.collection === (coll === 'Radius' ? 'Radius' : 'Space'));
        if (!hit) throw new Error(`${coll} ${t.name} ${m}: alias ${a} names no usable primitive`);
        if (hit.type !== type) throw new Error(`${coll} ${t.name}: alias ${a} is ${hit.type}, the token is ${type}`);
        return { a: [PRIM[hit.collection], a] };
      });
      rows.push({ c: semName(coll), n: t.name, t: type, m: modes, vals: values, s: scopesFor(t), x: `var(${t.cssVar})`, d });
    }
  }
  return { rows, elevation };
}

// ---------- script text ----------
const HEADER = (title) => `// GENERATED by v2/tools/figma/make-sandbox-scripts.mjs from the repo (ds-tokens/dist/tokens.json, v2/figma/primitives.txt,
// ds-tokens/descriptions.json). Do not edit by hand: change the generator and regenerate.
// SANDBOX ONLY: it writes only to the Figma file "Souvenir-test" (key ${SANDBOX_KEY}), only to collections whose names end in
// "(DS V2)" or "(DS V2 primitives)", to effect styles ending in "(DS V2)" and to the page "${PAGE_NAME}". It refuses any other file.
// ${title}
`;

const PREAMBLE = `const SANDBOX = '${SANDBOX_KEY}';
if (figma.fileKey !== SANDBOX) throw new Error('Refusing to run: this is not the sandbox file (' + figma.fileKey + ')');
const SAFE = (n) => n.endsWith(' (DS V2)') || n.endsWith(' (DS V2 primitives)');
const allCols = await figma.variables.getLocalVariableCollectionsAsync();
const allVars = await figma.variables.getLocalVariablesAsync();
const findCol = (name) => { if (!SAFE(name)) throw new Error('Not a sandbox collection name: ' + name); return allCols.find((c) => c.name === name) || null; };
const varsIn = (col) => { const m = new Map(); if (col) for (const v of allVars) if (v.variableCollectionId === col.id) m.set(v.name, v); return m; };
const rgba = (h) => { const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255; return { r: n(1), g: n(3), b: n(5), a: h.length === 9 ? n(7) : 1 }; };
const result = { created: 0, updated: 0, collections: {}, ids: {} };
function ensureModes(col, wanted, isNew) {
  if (!SAFE(col.name)) throw new Error('Not a sandbox collection: ' + col.name);
  if (isNew) col.renameMode(col.modes[0].modeId, wanted[0]);
  for (const w of wanted) if (!col.modes.some((m) => m.name === w)) col.addMode(w);
  return Object.fromEntries(wanted.map((w) => [w, col.modes.find((m) => m.name === w).modeId]));
}
function upsert(col, map, row, modeIds, valueOf) {
  if (!SAFE(col.name)) throw new Error('Not a sandbox collection: ' + col.name);
  let v = map.get(row.n);
  if (v && v.resolvedType !== row.t) throw new Error(row.n + ' exists with type ' + v.resolvedType + ', wanted ' + row.t);
  if (v) result.updated++; else { v = figma.variables.createVariable(row.n, col, row.t); map.set(row.n, v); result.created++; }
  for (const [mode, val] of valueOf(row)) v.setValueForMode(modeIds[mode], val);
  v.scopes = row.s;
  if (row.x) v.setVariableCodeSyntax('WEB', row.x);
  v.description = row.d || '';
  result.ids[col.name.replace(/ \\(DS V2( primitives)?\\)$/, '') + ' ' + row.n] = v.id;
  return v;
}
`;

function collectionOpen(name, modes, k) {
  // The collection name is written as a literal in createVariableCollection so the self-test can prove it is sandbox-safe.
  return `let col${k} = findCol(${JSON.stringify(name)}); const new${k} = !col${k};
if (!col${k}) col${k} = figma.variables.createVariableCollection(${JSON.stringify(name)});
const modes${k} = ensureModes(col${k}, ${JSON.stringify(modes)}, new${k});
const vars${k} = varsIn(col${k});
result.collections[col${k}.name] = col${k}.id;
`;
}

function primitiveScript(rows) {
  const byCol = Object.values(PRIM).map((c) => [c, rows.filter((r) => r.c === c)]);
  let body = `${PREAMBLE}let hiddenApplied = 0, hiddenFailed = 0;\n`;
  byCol.forEach(([name, list], k) => {
    body += collectionOpen(name, ['default'], k);
    body += `for (const [n, t, v] of ${JSON.stringify(list.map((r) => [r.n, r.t, r.v]))}) {
  const pv = upsert(col${k}, vars${k}, { n, t, s: [], x: null, d: '' }, modes${k}, () => [['default', t === 'COLOR' ? rgba(v) : v]]);
  try { pv.hiddenFromPublishing = true; hiddenApplied++; } catch (e) { hiddenFailed++; }
}
`;
  });
  body += `result.hiddenFromPublishing = { applied: hiddenApplied, failed: hiddenFailed };\nreturn result;\n`;
  return body;
}

function semanticBody(chunk) {
  // chunk: rows of possibly several collections, in order.
  const needPrims = [...new Set(chunk.flatMap((r) => r.vals.filter((x) => x.a).map((x) => x.a[0])))].sort();
  let body = PREAMBLE;
  body += `// Primitive targets, found by name in the DS V2 primitive collections. Every alias is checked before anything is written.
const prim = {};
for (const pn of ${JSON.stringify(needPrims)}) { const pc = findCol(pn); if (!pc) throw new Error('Run 01-primitives first: ' + pn + ' is missing'); prim[pn] = varsIn(pc); }
const ROWS = ${JSON.stringify(chunk.map((r) => ({ c: r.c, n: r.n, t: r.t, m: r.m, vals: r.vals, s: r.s, x: r.x, d: r.d })))};
const missing = [];
for (const r of ROWS) for (const x of r.vals) if (x.a && !prim[x.a[0]].get(x.a[1])) missing.push(r.n + ' -> ' + x.a.join(' '));
if (missing.length) throw new Error('Alias targets missing: ' + missing.join('; '));
const valueOf = (r) => r.vals.map((x, i) => [r.m[i], x.a ? { type: 'VARIABLE_ALIAS', id: prim[x.a[0]].get(x.a[1]).id } : r.t === 'COLOR' ? rgba(x.v) : x.v]);
`;
  const colls = [...new Set(chunk.map((r) => r.c))];
  colls.forEach((name, k) => {
    const modes = chunk.find((r) => r.c === name).m;
    body += collectionOpen(name, modes, k);
    body += `for (const r of ROWS.filter((r) => r.c === ${JSON.stringify(name)})) upsert(col${k}, vars${k}, r, modes${k}, valueOf);\n`;
  });
  body += 'return result;\n';
  return body;
}

function packSemantic(rows) {
  const chunks = [];
  let cur = [];
  for (const r of rows) {
    const trial = [...cur, r];
    if (cur.length && semanticBody(trial).length > BUDGET) { chunks.push(cur); cur = [r]; } else cur = trial;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

function parseShadow(css) {
  return css.split(/,(?![^(]*\))/).map((part) => {
    const m = part.trim().match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/);
    if (!m) throw new Error(`cannot read shadow "${part}"`);
    return { x: +m[1], y: +m[2], blur: +m[3], spread: m[4] ? +m[4] : 0, r: +m[5] / 255, g: +m[6] / 255, b: +m[7] / 255, a: +m[8] };
  });
}

function effectScript(elevation) {
  const styles = elevation.map((e) => ({ name: `${e.name} (DS V2)`, description: `${e.description} Light-mode value only: an effect style holds one value, so the dark value is not carried.`, layers: parseShadow(e.light) }));
  return `${PREAMBLE}const STYLES = ${JSON.stringify(styles)};
const existing = await figma.getLocalEffectStylesAsync();
const out = { created: 0, updated: 0, ids: {} };
for (const s of STYLES) {
  if (!s.name.endsWith(' (DS V2)')) throw new Error('Not a sandbox style name: ' + s.name);
  let st = existing.find((x) => x.name === s.name);
  if (st) out.updated++; else { st = figma.createEffectStyle(); st.name = s.name; out.created++; }
  st.effects = s.layers.map((l) => ({ type: 'DROP_SHADOW', color: { r: l.r, g: l.g, b: l.b, a: l.a }, offset: { x: l.x, y: l.y }, radius: l.blur, spread: l.spread, visible: true, blendMode: 'NORMAL' }));
  st.description = s.description;
  out.ids[s.name] = st.id;
}
return out;
`;
}

// The surface each text role is meant for: the first background its first contrast rule names.
function textSurfaces(tokens, pairs) {
  const expand = (bg) => bg.flatMap((b) => (b === '<base>' ? pairs.base : b === '<baseDefault>' ? pairs.baseDefault : b === '<fills>' ? pairs.fills : [b]));
  const out = {};
  for (const r of [...pairs.rules, ...(pairs.exempt || [])]) {
    for (const fgRaw of r.fg || []) {
      for (const hue of fgRaw.includes('<hue>') ? pairs.hues : [null]) {
        const fg = hue ? fgRaw.replace('<hue>', hue) : fgRaw;
        if (out[fg]) continue;
        const bg = expand(r.bg || []).map((b) => (hue ? b.replace('<hue>', hue) : b)).find((b) => !b.includes('<'));
        if (bg) out[fg] = bg;
      }
    }
  }
  const names = new Set(tokens.filter((t) => t.collection === 'Themes').map((t) => t.name));
  const res = {};
  for (const t of tokens.filter((x) => x.collection === 'Themes' && x.name.startsWith('text/'))) res[t.name] = names.has(out[t.name]) ? out[t.name] : 'surface/primary/default';
  return res;
}

function pageScript({ tokens, pairs }) {
  const themes = tokens.filter((t) => t.collection === 'Themes');
  const groups = ['text', 'icon', 'surface', 'interactive', 'border'].map((g) => [g, themes.filter((t) => t.name.split('/')[0] === g).map((t) => t.name)]);
  const leftover = themes.filter((t) => !groups.some(([g]) => t.name.split('/')[0] === g));
  if (leftover.length) throw new Error(`colour roles outside the five groups: ${leftover.map((t) => t.name)}`);
  const onSurface = textSurfaces(tokens, pairs);
  const typeRoles = tokens.filter((t) => t.collection === 'Typography' && t.name.startsWith('font-size/')).map((t) => t.name.slice('font-size/'.length));
  const weightFor = (role) => (role.startsWith('heading') ? 'heading' : role === 'section-label-base' ? 'section-label-base' : role.startsWith('label') ? 'label' : 'body');
  const typeRows = typeRoles.map((r) => [r, weightFor(r)]);
  const radius = tokens.filter((t) => t.collection === 'Radius').map((t) => t.name);
  const spacing = tokens.filter((t) => t.collection === 'Density' && parseFloat(t.values.standard) !== 0).map((t) => t.name);
  return `${PREAMBLE}const PAGE_NAME = ${JSON.stringify(PAGE_NAME)};
const ROOT_NAME = 'DS V2 tokens (generated)';
const GROUPS = ${JSON.stringify(groups)};
const ON_SURFACE = ${JSON.stringify(onSurface)};
const TYPE_ROWS = ${JSON.stringify(typeRows)};
const RADIUS = ${JSON.stringify(radius)};
const SPACING = ${JSON.stringify(spacing)};
const V = {};
for (const cn of ['Themes (DS V2)', 'Typography (DS V2)', 'Radius (DS V2)', 'Density (DS V2)']) { const c = findCol(cn); if (!c) throw new Error('Run the variable scripts first: ' + cn + ' is missing'); V[cn] = { col: c, vars: varsIn(c) }; }
const v = (cn, n) => { const x = V[cn].vars.get(n); if (!x) throw new Error('Missing variable ' + cn + ' ' + n); return x; };
const C = (n) => v('Themes (DS V2)', n);
const T = (n) => v('Typography (DS V2)', n);
for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold']) await figma.loadFontAsync({ family: 'Geist', style });
const paint = (variable) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'color', variable);
const text = (chars, size, colorName, style) => { const t = figma.createText(); t.fontName = { family: 'Geist', style: style || 'Regular' }; t.characters = chars; t.fontSize = size; t.fills = [paint(C(colorName))]; return t; };
const wrapText = (t, w) => { t.resize(w, t.height); t.textAutoResize = 'HEIGHT'; return t; };

let page = figma.root.children.find((p) => p.name === PAGE_NAME);
const pageCreated = !page;
if (!page) { page = figma.createPage(); page.name = PAGE_NAME; }
await figma.setCurrentPageAsync(page);
// Rebuild: remove only the root frame this script made earlier, and only on its own page.
for (const n of page.children.filter((n) => n.name === ROOT_NAME)) n.remove();

const root = figma.createAutoLayout('VERTICAL', { name: ROOT_NAME, itemSpacing: 32, paddingTop: 48, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 });
root.fills = [paint(C('surface/secondary/default'))];
page.appendChild(root);
const title = text('Souvenir DS V2 tokens', 32, 'text/primary', 'Bold');
title.setBoundVariable('fontSize', T('font-size/heading-2')); title.setBoundVariable('lineHeight', T('line-height/heading-2'));
root.appendChild(title);
const intro = wrapText(text('Every colour role, the type scale, the radius scale and the spacing scale of the merged DS V2 token set, drawn with the "(DS V2)" variables in this file. Generated on ${PAGE_DATE} from the repo by v2/tools/figma/make-sandbox-scripts.mjs; the left frame uses the light mode of Themes (DS V2), the right frame the dark mode.', 14, 'text/secondary'), 1200);
intro.setBoundVariable('fontSize', T('font-size/body-base')); intro.setBoundVariable('lineHeight', T('line-height/body-base'));
root.appendChild(intro);
const row = figma.createAutoLayout('HORIZONTAL', { name: 'Modes', itemSpacing: 48 });
row.fills = [];
root.appendChild(row);

const frame = figma.createAutoLayout('VERTICAL', { name: 'Light mode', itemSpacing: 40, paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32 });
row.appendChild(frame);
frame.resize(1280, 100); frame.primaryAxisSizingMode = 'AUTO'; frame.counterAxisSizingMode = 'FIXED';
frame.fills = [paint(C('surface/primary/default'))];
frame.strokes = [paint(C('border/primary/default'))]; frame.strokeWeight = 1;
frame.cornerRadius = 16; frame.setBoundVariable('topLeftRadius', v('Radius (DS V2)', 'container/large')); frame.setBoundVariable('topRightRadius', v('Radius (DS V2)', 'container/large')); frame.setBoundVariable('bottomLeftRadius', v('Radius (DS V2)', 'container/large')); frame.setBoundVariable('bottomRightRadius', v('Radius (DS V2)', 'container/large'));
const modeTitle = text('Light mode', 24, 'text/primary', 'Bold'); modeTitle.name = 'Mode title';
modeTitle.setBoundVariable('fontSize', T('font-size/heading-4')); modeTitle.setBoundVariable('lineHeight', T('line-height/heading-4'));
frame.appendChild(modeTitle);

const section = (label) => {
  const s = figma.createAutoLayout('VERTICAL', { name: label, itemSpacing: 12 }); s.fills = [];
  frame.appendChild(s); s.layoutSizingHorizontal = 'FILL';
  const h = text(label, 16, 'text/primary', 'SemiBold'); h.setBoundVariable('fontSize', T('font-size/label-large')); h.setBoundVariable('lineHeight', T('line-height/label-large'));
  s.appendChild(h);
  return s;
};
const grid = (parent) => { const g = figma.createAutoLayout('HORIZONTAL', { name: 'grid', itemSpacing: 12, counterAxisSpacing: 16 }); g.fills = []; parent.appendChild(g); g.layoutWrap = 'WRAP'; g.layoutSizingHorizontal = 'FILL'; return g; };
let swatches = 0;
for (const [group, names] of GROUPS) {
  const g = grid(section(group + ' (' + names.length + ')'));
  for (const n of names) {
    const sw = figma.createAutoLayout('VERTICAL', { name: n, itemSpacing: 6 }); sw.fills = [];
    g.appendChild(sw);
    const chip = figma.createAutoLayout('HORIZONTAL', { name: 'chip', primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
    sw.appendChild(chip);
    chip.resize(160, 56); chip.primaryAxisSizingMode = 'FIXED'; chip.counterAxisSizingMode = 'FIXED';
    chip.cornerRadius = 8;
    if (group === 'text') {
      chip.fills = [paint(C(ON_SURFACE[n]))];
      chip.strokes = [paint(C('border/primary/default'))]; chip.strokeWeight = 1;
      chip.appendChild(text('Aa', 24, n, 'SemiBold'));
    } else if (group === 'border') {
      chip.fills = [paint(C('surface/primary/default'))];
      chip.strokes = [paint(C(n))]; chip.strokeWeight = 2;
    } else {
      chip.fills = [paint(C(n))];
      chip.strokes = [paint(C('border/primary/default'))]; chip.strokeWeight = 1;
    }
    sw.appendChild(wrapText(text(n, 11, 'text/primary', 'Medium'), 160));
    if (group === 'text') sw.appendChild(wrapText(text('on ' + ON_SURFACE[n], 10, 'text/secondary'), 160));
    swatches++;
  }
}

const typeSec = section('type scale (Geist)');
for (const [role, weight] of TYPE_ROWS) {
  const r = figma.createAutoLayout('HORIZONTAL', { name: role, itemSpacing: 16, counterAxisAlignItems: 'CENTER' }); r.fills = [];
  typeSec.appendChild(r);
  const lab = wrapText(text(role, 11, 'text/secondary'), 160); r.appendChild(lab);
  const sample = text('Pay for your order', 16, 'text/primary');
  sample.setBoundVariable('fontFamily', T('font-family/sans'));
  sample.setBoundVariable('fontStyle', T('font-weight/' + weight));
  sample.setBoundVariable('fontSize', T('font-size/' + role));
  sample.setBoundVariable('lineHeight', T('line-height/' + role));
  r.appendChild(sample);
}

const radSec = section('radius');
const rg = grid(radSec);
for (const n of RADIUS) {
  const it = figma.createAutoLayout('VERTICAL', { name: n, itemSpacing: 6 }); it.fills = [];
  rg.appendChild(it);
  const sq = figma.createRectangle(); sq.resize(64, 64);
  sq.fills = [paint(C('surface/brand/subtle'))]; sq.strokes = [paint(C('border/brand'))]; sq.strokeWeight = 1;
  for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) sq.setBoundVariable(k, v('Radius (DS V2)', n));
  it.appendChild(sq);
  it.appendChild(wrapText(text(n, 11, 'text/primary', 'Medium'), 96));
}

const spSec = section('spacing (density standard)');
for (const n of SPACING) {
  const r = figma.createAutoLayout('HORIZONTAL', { name: n, itemSpacing: 16, counterAxisAlignItems: 'CENTER' }); r.fills = [];
  spSec.appendChild(r);
  r.appendChild(wrapText(text(n, 11, 'text/secondary'), 160));
  const bar = figma.createRectangle(); bar.resize(10, 12);
  bar.fills = [paint(C('interactive/primary/default'))];
  bar.setBoundVariable('width', v('Density (DS V2)', n));
  r.appendChild(bar);
}

const themes = V['Themes (DS V2)'].col;
const dens = V['Density (DS V2)'].col;
frame.setExplicitVariableModeForCollection(themes, themes.modes.find((m) => m.name === 'light').modeId);
frame.setExplicitVariableModeForCollection(dens, dens.modes.find((m) => m.name === 'standard').modeId);
const dark = frame.clone(); dark.name = 'Dark mode';
row.appendChild(dark);
dark.setExplicitVariableModeForCollection(themes, themes.modes.find((m) => m.name === 'dark').modeId);
const dt = dark.findOne((n) => n.type === 'TEXT' && n.name === 'Mode title'); if (dt) dt.characters = 'Dark mode';
root.setExplicitVariableModeForCollection(themes, themes.modes.find((m) => m.name === 'light').modeId);
return { pageId: page.id, pageCreated, rootId: root.id, lightId: frame.id, darkId: dark.id, swatches, typeRows: TYPE_ROWS.length, radius: RADIUS.length, spacing: SPACING.length, rootSize: [root.width, root.height] };
`;
}

// ---------- assemble ----------
export function generate() {
  const inputs = load();
  const files = [];
  files.push(['01-primitives.figma.js', HEADER('Step 1: the four primitive collections, mode "default", scopes [] (hidden from pickers).') + primitiveScript(primitiveRows(inputs.prims))]);
  const { rows, elevation } = semanticRows(inputs);
  const chunks = packSemantic(rows);
  chunks.forEach((chunk, i) => {
    const cols = [...new Set(chunk.map((r) => r.c))];
    const slug = cols.map((c) => c.replace(' (DS V2)', '').toLowerCase().replace(/\s+/g, '-')).join('+');
    files.push([`${String(i + 2).padStart(2, '0')}-${slug}.figma.js`, HEADER(`Step ${i + 2}: ${chunk.length} semantic variables in ${cols.join(', ')}.`) + semanticBody(chunk)]);
  });
  let n = chunks.length + 2;
  files.push([`${String(n).padStart(2, '0')}-elevation-styles.figma.js`, HEADER(`Step ${n}: effect styles for the proposed Elevation tokens (light values only).`) + effectScript(elevation)]);
  n++;
  files.push([`${String(n).padStart(2, '0')}-page.figma.js`, HEADER(`Step ${n}: the page "${PAGE_NAME}", every value bound to the DS V2 variables.`) + pageScript(inputs)]);
  return { files, counts: { primitives: primitiveRows(inputs.prims).length, semantic: rows.length, elevation: elevation.length, bySemCollection: Object.fromEntries(SEM_ORDER.map((c) => [c, rows.filter((r) => r.c === semName(c)).length])) } };
}

function selfTest() {
  const a = generate(), b = generate();
  const problems = [];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  if (JSON.stringify(a.files) !== JSON.stringify(b.files)) problems.push('two runs differ');
  for (const [name, code] of a.files) {
    if (code.length >= LIMIT) problems.push(`${name}: ${code.length} characters, limit ${LIMIT}`);
    if (!code.startsWith('// GENERATED') || !code.includes('SANDBOX ONLY')) problems.push(`${name}: missing the generated/sandbox header`);
    if (!code.includes(`if (figma.fileKey !== SANDBOX) throw`)) problems.push(`${name}: missing the file-key guard`);
    try { new AsyncFunction('figma', code); } catch (e) { problems.push(`${name}: does not parse: ${e.message}`); }
    for (const m of code.matchAll(/createVariableCollection\(([^)]*)\)/g)) {
      let arg;
      try { arg = JSON.parse(m[1]); } catch { problems.push(`${name}: createVariableCollection(${m[1]}) is not a literal name`); continue; }
      if (!SAFE_COLLECTIONS.has(arg)) problems.push(`${name}: createVariableCollection("${arg}") is not a sandbox-safe name`);
    }
    if (/\.remove\(\)/.test(code) && !(name.endsWith('-page.figma.js') && code.includes("page.children.filter((n) => n.name === ROOT_NAME)) n.remove()"))) problems.push(`${name}: calls remove()`);
    if (/deleteMode|removeMode|\.remove\(\)/.test(code.replace("for (const n of page.children.filter((n) => n.name === ROOT_NAME)) n.remove();", ''))) problems.push(`${name}: deletes something`);
    const pages = [...code.matchAll(/createPage\(/g)].length;
    if (pages && !name.endsWith('-page.figma.js')) problems.push(`${name}: creates a page`);
  }
  if (existsSync(OUT_DIR)) {
    const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith('.figma.js')).sort();
    const want = a.files.map(([n]) => n);
    if (onDisk.join() !== want.join()) problems.push(`files on disk (${onDisk.join(', ')}) are not the generated set (${want.join(', ')})`);
    else for (const [n, code] of a.files) if (readFileSync(join(OUT_DIR, n), 'utf8') !== code) problems.push(`${n} on disk differs from a fresh generation`);
  }
  for (const [n, code] of a.files) console.log(`  ${n}: ${code.length} characters`);
  console.log(problems.length ? `self-test FAILED:\n- ${problems.join('\n- ')}` : `self-test passed: ${a.files.length} files parse, are under ${LIMIT} characters, name only sandbox-safe collections, and two runs are byte-identical`);
  process.exit(problems.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const { files, counts } = generate();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('.figma.js') && !files.some(([n]) => n === f)) throw new Error(`stale file ${f} in ${OUT_DIR}: remove it by hand`);
  for (const [n, code] of files) writeFileSync(join(OUT_DIR, n), code);
  console.log(`wrote ${files.length} files to v2/figma/sandbox/scripts/: ${files.map(([n, c]) => `${n} (${c.length})`).join(', ')}`);
  console.log(`primitives ${counts.primitives}, semantic ${counts.semantic} ${JSON.stringify(counts.bySemCollection)}, elevation styles ${counts.elevation}`);
}
