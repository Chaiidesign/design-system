// READ-ONLY use_figma script for the sandbox file "Souvenir-test" (3WGIouA6dby5LNzVkdaA48). It changes nothing.
// Walks every variant of every component set (and every standalone component except Icon/*) on the page
// "DS V2 · Components (added by Claude)" and returns, per variant and node path, the name of the variable bound to each of:
//   f fill, s stroke, sw stroke weight, r corner radius, pl pr pt pb paddings, g gap, mh min height, h height, w width,
//   nw min width, xw max width, e effect style, and on text c fill, fs font size, lh line height, ff font family, fw font style,
//   and on icon instances zw zh size and c stroke colour.
// A field that holds a raw value (a paint, a non-zero number) with no variable bound is listed after "~R:".
// Instances of other components (a Button inside a dialog) are not entered: their own variants are read on their own.
// Output is compact: dict holds "Collection|name" (or "style|name"), nodes holds "path~f=0,s=3~R:pl" strings, and each variant
// is [owner, variant name, [node indices]]. v2/tools/figma-readback-check.mjs compares it with what the generator computed.
// To keep a return under use_figma's limit, set ONLY to a list of owner names and run it more than once.
const ONLY = null;
const SANDBOX = '3WGIouA6dby5LNzVkdaA48';
if (figma.fileKey !== SANDBOX) throw new Error('Refusing to run: this is not the sandbox file (' + figma.fileKey + ')');
// Hidden icons (iconEnd, the spinner) are bound too; without this their vector children are skipped.
figma.skipInvisibleInstanceChildren = false;
const page = figma.root.children.find((p) => p.name === 'DS V2 · Components (added by Claude)');
if (!page) throw new Error('No components page');
await figma.setCurrentPageAsync(page);
const owners = page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] })
  .filter((n) => n.type === 'COMPONENT_SET' || (n.parent.type !== 'COMPONENT_SET' && !n.name.startsWith('Icon/')))
  .filter((n) => !ONLY || ONLY.includes(n.name));
const dict = [], dix = new Map();
const di = (k) => { if (!dix.has(k)) { dix.set(k, dict.length); dict.push(k); } return dix.get(k); };
const vcache = new Map();
async function vkey(id) {
  if (vcache.has(id)) return vcache.get(id);
  const v = await figma.variables.getVariableByIdAsync(id);
  let k = 'missing|' + id;
  if (v) { const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId); k = (c ? c.name : '?') + '|' + v.name; }
  vcache.set(id, k); return k;
}
const one = (b) => (Array.isArray(b) ? b[0] : b);
async function paintField(paints, rec, raw, f) {
  if (!Array.isArray(paints) || !paints.length) return;
  const p = paints.find((x) => x.visible !== false); if (!p) return;
  const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id;
  if (id) rec[f] = di(await vkey(id)); else raw.push(f);
}
async function numField(node, prop, rec, raw, f, isRaw) {
  const b = one(node.boundVariables && node.boundVariables[prop]);
  if (b && b.id) rec[f] = di(await vkey(b.id)); else if (isRaw) raw.push(f);
}
const nodes = [], nix = new Map();
const put = (s) => { if (!nix.has(s)) { nix.set(s, nodes.length); nodes.push(s); } return nix.get(s); };
async function walk(node, path, out) {
  const rec = {}, raw = [];
  if (node.type === 'TEXT') {
    await paintField(node.fills, rec, raw, 'c');
    await numField(node, 'fontSize', rec, raw, 'fs', true);
    await numField(node, 'lineHeight', rec, raw, 'lh', node.lineHeight && node.lineHeight.unit !== 'AUTO');
    await numField(node, 'fontFamily', rec, raw, 'ff', false);
    await numField(node, 'fontStyle', rec, raw, 'fw', false);
  } else if (node.type === 'INSTANCE') {
    const main = await node.getMainComponentAsync();
    if (!main || !main.name.startsWith('Icon/')) { out.push(put(path + '~' + '~I:' + (main ? (main.parent.type === 'COMPONENT_SET' ? main.parent.name : main.name) : '?'))); return; }
    await numField(node, 'width', rec, raw, 'zw', false);
    await numField(node, 'height', rec, raw, 'zh', false);
    const g = node.findOne((n) => n.type !== 'INSTANCE' && 'strokes' in n && n.strokes.length);
    if (g) await paintField(g.strokes, rec, raw, 'c');
  } else if ('layoutMode' in node) {
    await paintField(node.fills, rec, raw, 'f');
    await paintField(node.strokes, rec, raw, 's');
    const hasStroke = Array.isArray(node.strokes) && node.strokes.length > 0;
    const bv = node.boundVariables || {};
    const swProp = ['strokeWeight', 'strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight'].find((p) => bv[p]);
    if (swProp) rec.sw = di(await vkey(one(bv[swProp]).id)); else if (hasStroke && node.strokeWeight !== 0) raw.push('sw');
    const cr = node.cornerRadius;
    await numField(node, 'topLeftRadius', rec, raw, 'r', cr === figma.mixed || cr > 0);
    if (rec.r !== undefined) for (const k of ['topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) { const b = one(bv[k]); if (!b || dict[rec.r] !== await vkey(b.id)) raw.push('r:' + k); }
    const auto = node.layoutMode !== 'NONE';
    for (const [prop, f] of [['paddingLeft', 'pl'], ['paddingRight', 'pr'], ['paddingTop', 'pt'], ['paddingBottom', 'pb']]) await numField(node, prop, rec, raw, f, auto && node[prop] > 0);
    await numField(node, 'itemSpacing', rec, raw, 'g', auto && node.itemSpacing > 0 && node.children.length > 1);
    await numField(node, 'minHeight', rec, raw, 'mh', node.minHeight != null);
    await numField(node, 'height', rec, raw, 'h', false);
    await numField(node, 'width', rec, raw, 'w', false);
    await numField(node, 'minWidth', rec, raw, 'nw', node.minWidth != null);
    await numField(node, 'maxWidth', rec, raw, 'xw', node.maxWidth != null);
    if (node.effectStyleId) { const st = await figma.getStyleByIdAsync(node.effectStyleId); rec.e = di('style|' + (st ? st.name : '?')); }
    else if (node.effects && node.effects.length) raw.push('e');
  }
  const fields = Object.entries(rec).map(([f, i]) => f + '=' + i).join(',');
  out.push(put(path + '~' + fields + (raw.length ? '~R:' + raw.join('.') : '')));
  if (node.type !== 'TEXT' && node.type !== 'INSTANCE' && 'children' in node) {
    const seen = {};
    for (const c of node.children) {
      seen[c.name] = (seen[c.name] || 0) + 1;
      const name = seen[c.name] > 1 ? c.name + '#' + seen[c.name] : c.name;
      await walk(c, path === '.' ? name : path + '/' + name, out);
    }
  }
}
const variants = [];
for (const o of owners) {
  for (const v of (o.type === 'COMPONENT_SET' ? o.children : [o])) {
    const out = [];
    await walk(v, '.', out);
    variants.push([o.name, v.name, out]);
  }
}
const result = { file: figma.fileKey, page: page.id, readAt: new Date().toISOString(), owners: owners.map((o) => o.name), dict, nodes, variants };
const size = JSON.stringify(result).length;
if (size > 47000) throw new Error('Result is ' + size + ' bytes; set ONLY to fewer owners and run in parts. Owners: ' + owners.map((o) => o.name).join(', '));
return result;
