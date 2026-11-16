// Proves that the generated token package and the Figma snapshot say the same thing, and names every difference.
//
// Usage:
//   node v2/tools/diff-figma.mjs [--tokens <tokens.json>] [--css <tokens.css>] [--overrides <overrides.json>]
//                                [--out <diff.json>] [--patch-list <figma-patch-list.md>] [--report-only] [--all]
//   node v2/tools/diff-figma.mjs --self-test
//
// Inputs (defaults are relative to the repository root, found from this file's location):
//   Figma      v2/figma/semantic.txt and primitives.txt, read only through v2/tools/lib/snapshot.mjs
//   --tokens    ds-tokens/dist/tokens.json   flat array, one object per semantic token
//   --css       ds-tokens/dist/tokens.css    custom properties: light on ":root, [data-theme="light"]",
//                                            dark on [data-theme="dark"], density on [data-density]
//   --overrides ds-tokens/overrides.json     array of { token, collection, mode, to, reason, rule }; may be absent
//
// The report has nine lists, each with a count:
//   1 in Figma, missing in code                 (fails)
//   2 in code, not in Figma                     (fails)            a code-only token NOT marked "proposed": true
//   3 value differs with no override: drift     (fails)            one item per token and mode
//   4 value differs because of an override      (intended)         one item per token and mode
//   5 override no longer needed                 (delete it)        one item per token and mode
//   6 CSS name differs from the Figma WEB code syntax   (fails)
//   7 tokens.css disagrees with tokens.json     (fails)            one item per property and mode
//   8 description differs                       (reported, does not fail)
//   9 proposed in the repo, not a Figma variable (reported, does not fail)  a code-only token marked "proposed": true in
//                                               tokens.json (from ds-tokens/proposed/tokens.json): name, collection, values, why.
//                                               The snapshot holds variables only, so a token Figma keeps as a style (for
//                                               example a shadow kept as an effect style) is still listed here.
// Values are compared after normalising: hex case, #rrggbb against #rrggbbff (any other alpha is kept),
// 16px against 1rem, font style names against numeric weights, the first family of a font stack, and, for a Motion
// duration only, a number against the same number in ms (Figma holds 100, tokens.json "100ms").
//
// "Agree" in the last line means: the token is in both Figma and code, every mode has the same value,
// the CSS name matches the Figma WEB code syntax, and tokens.css matches tokens.json for it.
// Descriptions are left out of agreement and reported in list 8. A token in list 5 still agrees.
// M is every token in Figma or in code (the union), not counting proposed tokens: they cannot agree with Figma by
// definition, so they are counted in list 9 and named separately in the last line.
//
// Writes ds-tokens/audit/diff.json and ds-tokens/audit/figma-patch-list.md: the changes to make by hand in Figma, in three
// sections: the alias changes from overrides (list 4), "Variables to add" (list 9), and "Descriptions to set" (the items of
// list 8 whose Figma description is empty, with the repo's text to paste, grouped by collection).
// Exit 0 when lists 1, 2, 3, 6 and 7 are empty, or always with --report-only. Exit 1 on any item in them.
// Exit 2 when an input cannot be read.
// --self-test builds fixtures from the real Figma snapshot in a temporary folder, proves the clean set gives
// empty lists, plants one item of each of the nine kinds and checks each lands in its own list.
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSnapshots, makeResolver, resolvedSemantic, SNAPSHOT_DIR } from './lib/snapshot.mjs';
import { parseCssColor } from '../../scripts/lib/color.mjs';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const LISTS = [
  { key: 'missingInCode', label: 'In Figma, missing in code', fails: true },
  { key: 'notInFigma', label: 'In code, not in Figma', fails: true },
  { key: 'drift', label: 'Value differs with no override (drift)', fails: true },
  { key: 'intendedOverrides', label: 'Value differs because of an override (intended: the repo is ahead of Figma)', fails: false },
  { key: 'overridesToRemove', label: 'Override no longer needed (Figma now holds its value: delete the override)', fails: false },
  { key: 'cssNameDiffers', label: 'CSS name differs from the Figma WEB code syntax', fails: true },
  { key: 'cssFileMismatch', label: 'tokens.css disagrees with tokens.json', fails: true },
  { key: 'descriptionDiffers', label: 'Description differs', fails: false },
  { key: 'proposedNotInFigma', label: 'Proposed in the repo, not in Figma (not a Figma variable: the snapshot reads variables only, so a token Figma keeps as a style, such as a shadow kept as an effect style, is still listed here)', fails: false },
];

// ---------- names ----------

// Code may name a collection by its Figma name or by its category; both map to the Figma name.
const COLLECTION_ALIASES = {
  themes: 'Themes', color: 'Themes', colors: 'Themes', colour: 'Themes',
  typography: 'Typography', radius: 'Radius',
  density: 'Density', space: 'Density', spacing: 'Density',
  'surface gradients': 'Surface Gradients', gradient: 'Surface Gradients', gradients: 'Surface Gradients',
  border: 'Border',
};
const canonCollection = (c) => (c == null ? '' : COLLECTION_ALIASES[String(c).trim().toLowerCase()] || String(c).trim());
const keyOf = (collection, name) => `${canonCollection(collection)}|${name}`;
const normMode = (m) => String(m).trim().toLowerCase();
const cssName = (s) => (s == null ? null : String(s).trim().replace(/^var\(\s*/, '').replace(/\s*\)$/, '').trim());

// ---------- values ----------

const WEIGHT_NAMES = { thin: 100, extralight: 200, light: 300, regular: 400, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };

function kindOf(figVar, codeTok) {
  if (figVar) {
    if (figVar.type === 'color') return 'color';
    if (figVar.collection === 'Motion' && figVar.type === 'number') return 'duration';
    if (/(^|\/)font-weight(\/|$)/.test(figVar.name)) return 'weight';
    if (/(^|\/)font-family(\/|$)/.test(figVar.name)) return 'family';
    if (figVar.type === 'number') return 'number';
    return 'string';
  }
  const t = String(codeTok?.type || '').toLowerCase();
  if (t === 'color') return 'color';
  if (t === 'fontweight') return 'weight';
  if (t === 'fontfamily') return 'family';
  if (t === 'duration') return 'duration';
  if (t === 'dimension' || t === 'number') return 'number';
  return 'string';
}

function colorRgba(v) {
  if (v == null) return null;
  try {
    if (typeof v === 'object') {
      if (typeof v.hex === 'string') {
        const c = colorRgba(v.hex);
        if (c && typeof v.alpha === 'number') c.rgba[3] = Math.round(v.alpha * 255);
        return c;
      }
      if (Array.isArray(v.components)) {
        const rgba = [...v.components.map((x) => Math.round(x * 255)), Math.round((v.alpha ?? 1) * 255)];
        return { rgba, exact: false };
      }
      return null;
    }
    const s = String(v).trim();
    const p = parseCssColor(s);
    return { rgba: [...p.srgb.map((x) => Math.round(x * 255)), Math.round(p.alpha * 255)], exact: s.startsWith('#') };
  } catch { return null; }
}
const rgbaText = ({ rgba }) => '#' + rgba.slice(0, 3).map((x) => x.toString(16).padStart(2, '0')).join('') + (rgba[3] === 255 ? '' : rgba[3].toString(16).padStart(2, '0'));

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'value' in v) {
    const n = toNumber(v.value);
    return n == null ? null : n * (v.unit === 'rem' || v.unit === 'em' ? 16 : 1);
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(-?\d*\.?\d+)\s*(px|rem|em)?$/i);
    if (m) return Number(m[1]) * (m[2] && m[2].toLowerCase() !== 'px' ? 16 : 1);
  }
  return null;
}
// A Motion duration in ms: 100, "100", "100ms", "0.1s" or { value: 100, unit: "ms" }. Only the duration kind reads ms,
// so a length such as "100ms" in a Space token is still a difference.
function toDuration(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && 'value' in v) {
    const n = toDuration(v.value);
    return n == null ? null : n * (v.unit === 's' ? 1000 : 1);
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(-?\d*\.?\d+)\s*(ms|s)?$/i);
    if (m) return Number(m[1]) * (m[2] && m[2].toLowerCase() === 's' ? 1000 : 1);
  }
  return null;
}
function toWeight(v) {
  const n = toNumber(v);
  if (n != null) return n;
  if (typeof v === 'string') return WEIGHT_NAMES[v.toLowerCase().replace(/[\s_-]/g, '')] ?? null;
  return null;
}
const unquote = (s) => String(s).trim().replace(/^["']|["']$/g, '').trim();
function toFamily(v) {
  if (Array.isArray(v)) return v.length ? unquote(v[0]).toLowerCase() : '';
  if (v == null) return null;
  return unquote(String(v).split(',')[0]).toLowerCase();
}

// Returns { text, cmp } where text is shown to the reader and cmp is compared.
export function normalise(v, kind) {
  if (v === undefined) return { text: '(none)', cmp: undefined };
  if (v === null) return { text: '(none)', cmp: null };
  if (kind === 'color') {
    const c = colorRgba(v);
    if (c) return { text: rgbaText(c), cmp: c };
  }
  if (kind === 'number') { const n = toNumber(v); if (n != null) return { text: String(+n.toFixed(4)), cmp: +n.toFixed(4) }; }
  if (kind === 'duration') { const n = toDuration(v); if (n != null) return { text: `${+n.toFixed(4)}ms`, cmp: +n.toFixed(4) }; }
  if (kind === 'weight') { const n = toWeight(v); if (n != null) return { text: String(n), cmp: n }; }
  if (kind === 'family') { const f = toFamily(v); if (f != null) return { text: f, cmp: f }; }
  const s = typeof v === 'object' ? JSON.stringify(v) : unquote(v);
  return { text: s, cmp: s };
}
export function sameValue(a, b, kind) {
  const x = normalise(a, kind), y = normalise(b, kind);
  if (x.cmp == null || y.cmp == null) return x.cmp === y.cmp;
  if (typeof x.cmp === 'object' && typeof y.cmp === 'object') {
    const tol = x.cmp.exact && y.cmp.exact ? 0 : 1; // a colour written in a function rounds to 8 bits differently
    return x.cmp.rgba.every((c, i) => Math.abs(c - y.cmp.rgba[i]) <= tol);
  }
  return x.cmp === y.cmp;
}
const show = (v, kind) => normalise(v, kind).text;

// ---------- tokens.css ----------

// Returns { byMode: Map(modeKey -> Map(prop -> value)), all: Set(prop) }. ":root" is the mode key "root".
export function parseTokensCss(text) {
  const byMode = new Map();
  const all = new Set();
  const put = (mode, prop, value) => { if (!byMode.has(mode)) byMode.set(mode, new Map()); byMode.get(mode).set(prop, value); };
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  function walk(src, inAtRule) {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf('{', i);
      if (open < 0) break;
      const selector = src.slice(i, open).trim().split(/[;}]/).pop().trim();
      let depth = 1, j = open + 1;
      while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
      const body = src.slice(open + 1, j - 1);
      if (selector.startsWith('@')) walk(body, true);
      else {
        const modes = [];
        for (const part of selector.split(',').map((s) => s.trim())) {
          if (part === ':root' || part === 'html') modes.push('root');
          const m = part.match(/data-(?:theme|density|mode)\s*=\s*["']?([\w-]+)/);
          if (m) modes.push(normMode(m[1]));
        }
        for (const decl of body.split(';')) {
          const d = decl.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]*?)\s*$/);
          if (!d) continue;
          all.add(d[1]);
          if (!inAtRule) for (const mode of modes) put(mode, d[1], d[2]);
        }
      }
      i = j;
    }
  }
  walk(clean, false);
  return { byMode, all };
}

// The value of a property for one mode. The first mode of a collection (or "default") may also live on :root.
// var() references are followed inside tokens.css.
function cssLookup(css, prop, mode, isFirstMode, depth = 0) {
  let v = css.byMode.get(mode)?.get(prop);
  if (v === undefined && isFirstMode) v = css.byMode.get('root')?.get(prop);
  if (v === undefined || depth > 10) return v;
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/);
  if (!ref) return v;
  const inner = cssLookup(css, ref[1], mode, isFirstMode, depth + 1) ?? cssLookup(css, ref[1], 'root', true, depth + 1);
  return inner ?? (ref[2] !== undefined ? ref[2].trim() : v);
}

// ---------- the diff ----------

export function diff({ snap, tokens, css, overrides }) {
  const lists = Object.fromEntries(LISTS.map((l) => [l.key, []]));
  const warnings = [];
  const resolver = makeResolver(snap);
  const figma = resolvedSemantic(snap);
  const figByKey = new Map(figma.map((v) => [keyOf(v.collection, v.name), v]));
  const figByName = new Map();
  for (const v of figma) { if (!figByName.has(v.name)) figByName.set(v.name, []); figByName.get(v.name).push(v); }
  const findFig = (name, collection) => {
    if (name == null) return null;
    const direct = figByKey.get(keyOf(collection, name));
    if (direct) return direct;
    // A token named by its JSON path, such as color.text.primary.
    if (!name.includes('/') && name.includes('.')) {
      const parts = name.split('.');
      const viaPath = figByKey.get(keyOf(collection || parts[0], parts.slice(1).join('/')));
      if (viaPath) return viaPath;
    }
    const byName = figByName.get(name) || [];
    return !collection && byName.length === 1 ? byName[0] : null;
  };

  // Code tokens matched to Figma.
  const codeByFigKey = new Map();
  const codeOnly = [];
  for (const t of tokens) {
    const f = findFig(t.name, t.collection);
    if (!f) { codeOnly.push(t); continue; }
    const k = keyOf(f.collection, f.name);
    if (codeByFigKey.has(k)) { warnings.push(`tokens.json lists ${f.collection} ${f.name} twice; the second copy was ignored.`); continue; }
    codeByFigKey.set(k, t);
  }

  // Overrides from overrides.json and from each token's "overridden" field, by token and mode.
  const overrideMap = new Map();
  const addOverride = (fig, mode, o, source) => {
    const k = `${keyOf(fig.collection, fig.name)}|${normMode(mode)}`;
    const prev = overrideMap.get(k);
    overrideMap.set(k, { to: o.to ?? prev?.to, from: o.from ?? prev?.from, reason: o.reason || prev?.reason || '', rule: o.rule ?? prev?.rule, sources: [...(prev?.sources || []), source] });
  };
  for (const o of overrides) {
    const f = findFig(o.token, o.collection);
    if (!f) { warnings.push(`overrides.json names ${o.collection || '?'} ${o.token}, which is not in Figma.`); continue; }
    addOverride(f, o.mode, o, 'overrides.json');
  }
  for (const [k, t] of codeByFigKey) {
    if (!t.overridden) continue;
    const f = figByKey.get(k);
    for (const [mode, o] of Object.entries(t.overridden)) if (o) addOverride(f, mode, o, 'tokens.json');
  }
  const stripAlias = (s) => String(s).trim().replace(/^\{|\}$/g, '');
  const resolveTo = (to, fig) => {
    if (to == null) return { value: null, alias: null };
    if (typeof to !== 'string') return { value: to, alias: null };
    const raw = stripAlias(to);
    const parts = raw.split('.');
    const candidates = [raw, raw.split('.').join('/'), parts.slice(1).join('/')].filter(Boolean);
    for (const c of candidates) {
      const target = resolver.target(c, fig);
      if (target) return { value: resolver.resolve(target).value, alias: target.name };
    }
    return { value: raw, alias: null };
  };

  const problemTokens = new Set();
  const cssVarsInJson = new Set();

  for (const fig of figma) {
    const k = keyOf(fig.collection, fig.name);
    const t = codeByFigKey.get(k);
    if (!t) { lists.missingInCode.push({ collection: fig.collection, token: fig.name, cssName: cssName(fig.syntax) }); continue; }
    const kind = kindOf(fig, t);
    const codeValues = Object.fromEntries(Object.entries(t.values || {}).map(([m, v]) => [normMode(m), v]));
    const modes = fig.modes.map(normMode);

    for (const mode of modes) {
      const figVal = fig.perMode[fig.modes[modes.indexOf(mode)]].value;
      const figAlias = fig.perMode[fig.modes[modes.indexOf(mode)]].alias;
      const repoVal = codeValues[mode];
      const ov = overrideMap.get(`${k}|${mode}`);
      const base = { collection: fig.collection, token: fig.name, mode, figmaValue: show(figVal, kind), repoValue: show(repoVal, kind), figmaAlias: figAlias };
      if (sameValue(figVal, repoVal, kind)) {
        if (!ov) continue;
        const target = resolveTo(ov.to, fig);
        if (sameValue(target.value, figVal, kind) || (target.alias && target.alias === figAlias)) {
          lists.overridesToRemove.push({ ...base, overrideTo: stripAlias(ov.to), reason: ov.reason, sources: ov.sources });
        } else {
          warnings.push(`${fig.collection} ${fig.name} ${mode}: an override sets it to ${stripAlias(ov.to)} (${show(target.value, kind)}), but the repo still holds Figma's value ${show(figVal, kind)}. The override was not applied.`);
        }
        continue;
      }
      problemTokens.add(k);
      if (ov) {
        const target = resolveTo(ov.to, fig);
        if (sameValue(target.value, repoVal, kind)) {
          lists.intendedOverrides.push({ ...base, overrideTo: stripAlias(ov.to), reason: ov.reason, rule: ov.rule ?? null, sources: ov.sources });
          continue;
        }
        lists.drift.push({ ...base, note: `an override sets ${stripAlias(ov.to)} (${show(target.value, kind)}), which is neither value` });
        continue;
      }
      lists.drift.push({ ...base, note: repoVal === undefined ? 'this mode is missing in code' : '' });
    }
    for (const mode of Object.keys(codeValues)) {
      if (!modes.includes(mode)) { problemTokens.add(k); lists.drift.push({ collection: fig.collection, token: fig.name, mode, figmaValue: '(no such mode in Figma)', repoValue: show(codeValues[mode], kind), figmaAlias: null, note: 'code has a mode Figma does not' }); }
    }

    // 6. CSS name against the Figma WEB code syntax.
    const figCss = cssName(fig.syntax);
    const codeCss = cssName(t.cssVar);
    if (!figCss || figCss !== codeCss) {
      problemTokens.add(k);
      lists.cssNameDiffers.push({ collection: fig.collection, token: fig.name, figmaSyntax: fig.syntax ?? '(none set in Figma)', repoCssVar: codeCss ?? '(none)' });
    }

    // 8. Description.
    const fd = (fig.description || '').trim(), cd = (t.description || '').trim();
    if (fd !== cd) lists.descriptionDiffers.push({ collection: fig.collection, token: fig.name, figma: fd, repo: cd, repoSource: t.descriptionSource ?? null });
  }

  // A code-only token is a failure unless tokens.json marks it proposed; a proposed one is listed with its values and reason.
  let proposedCount = 0;
  for (const t of codeOnly) {
    if (t.proposed !== true) { lists.notInFigma.push({ collection: t.collection ?? null, token: t.name, cssVar: cssName(t.cssVar) }); continue; }
    proposedCount++;
    const kind = kindOf(null, t);
    const values = Object.fromEntries(Object.entries(t.values || {}).map(([m, v]) => [normMode(m), show(v, kind)]));
    const alias = Object.fromEntries(Object.entries(t.alias || {}).map(([m, a]) => [normMode(m), a ?? null]));
    lists.proposedNotInFigma.push({ collection: t.collection ?? null, token: t.name, cssVar: cssName(t.cssVar), type: t.type ?? null, values, alias, why: t.why ?? '' });
  }

  // 7. tokens.css against tokens.json.
  for (const t of tokens) {
    const name = cssName(t.cssVar);
    if (!name) continue;
    cssVarsInJson.add(name);
    const fig = findFig(t.name, t.collection);
    const kind = kindOf(fig, t);
    const modes = Object.keys(t.values || {});
    const firstMode = fig ? normMode(fig.modes[0]) : normMode(modes[0] ?? 'default');
    for (const m of modes) {
      const mode = normMode(m);
      const inCss = cssLookup(css, name, mode, mode === firstMode || mode === 'default');
      if (inCss === undefined) {
        lists.cssFileMismatch.push({ cssVar: name, token: t.name, mode, problem: 'missing in tokens.css', json: show(t.values[m], kind), css: '(none)' });
      } else if (!sameValue(t.values[m], inCss, kind)) {
        lists.cssFileMismatch.push({ cssVar: name, token: t.name, mode, problem: 'value differs from tokens.json', json: show(t.values[m], kind), css: show(inCss, kind) });
      } else continue;
      if (fig) problemTokens.add(keyOf(fig.collection, fig.name));
    }
  }
  for (const prop of [...css.all].sort()) {
    if (!cssVarsInJson.has(prop)) lists.cssFileMismatch.push({ cssVar: prop, token: null, mode: null, problem: 'in tokens.css, not listed in tokens.json', json: '(none)', css: '' });
  }

  const inBoth = [...codeByFigKey.keys()];
  const agree = inBoth.filter((k) => !problemTokens.has(k)).length;
  const total = figma.length + codeOnly.length - proposedCount;
  const counts = Object.fromEntries(LISTS.map((l) => [l.key, lists[l.key].length]));
  const failed = LISTS.some((l) => l.fails && lists[l.key].length > 0);
  const summary = `Figma and code agree on ${agree} of ${total} tokens; ${counts.drift} drift, ${counts.intendedOverrides} intended overrides, ${counts.overridesToRemove} overrides to remove; ${counts.proposedNotInFigma} proposed in the repo, not in Figma`;
  return { lists, counts, warnings, agree, total, failed, summary };
}

// ---------- patch list for the owner ----------

export function patchList(result) {
  const rows = result.lists.intendedOverrides;
  const adds = result.lists.proposedNotInFigma || [];
  // A description to set: Figma's is empty and the repo has one. A Figma description that differs from the repo's is not
  // pasted over (Figma's wins in the build); it stays in list 8 only.
  const toSet = (result.lists.descriptionDiffers || []).filter((d) => !d.figma && d.repo);
  if (!rows.length && !adds.length && !toSet.length) return 'No overrides are ahead of Figma, no variables are proposed and no Figma description is empty, so there is nothing to change in Figma.\n';
  const lines = rows.map((r) => {
    const from = r.figmaAlias ?? r.figmaValue;
    const verb = r.figmaAlias ? 'change alias' : 'change value';
    const why = (r.reason || 'No reason given in the override.').trim();
    return `- ${r.collection}, ${r.token}, ${r.mode}: ${verb} from ${from} to ${r.overrideTo}. ${/[.!?]$/.test(why) ? why : why + '.'}`;
  });
  const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
  const valueText = (a) => Object.entries(a.values).map(([m, v]) => `${m}: ${a.alias?.[m] ? `${a.alias[m]} (${v})` : v}`).join('; ');
  const table = adds.map((a) => `| ${cell(a.collection)} | ${cell(a.token)} | ${cell(valueText(a))} | ${cell(a.why || 'No reason given.')} |`);
  return [
    '# Changes to make by hand in Figma',
    '',
    '## Alias changes from overrides',
    '',
    ...(lines.length ? lines : ['None: no override is ahead of Figma.']),
    '',
    '## Variables to add',
    '',
    ...(adds.length
      ? ['Tokens the repo proposes that Figma does not hold as variables. The snapshot reads variables only: a token Figma already keeps as a style (for example a shadow kept as an effect style) is listed here too; for those, check the style and add a variable only if one is wanted.', '',
        '| Collection | Name | Value per mode | Why |', '| --- | --- | --- | --- |', ...table]
      : ['None: no token is proposed in the repo.']),
    '',
    '## Descriptions to set',
    '',
    ...(toSet.length
      ? [`${toSet.length} Figma variable${toSet.length === 1 ? ' has' : 's have'} an empty description. Paste the text into each variable's description field. Source is where the text comes from (ds-tokens/descriptions.json): owner, drafted or proposed.`, '',
        ...[...new Set(toSet.map((d) => d.collection))].flatMap((c) => {
          const here = toSet.filter((d) => d.collection === c);
          return [`### ${c} (${here.length})`, '', '| Name | Description to paste | Source |', '| --- | --- | --- |', ...here.map((d) => `| ${cell(d.token)} | ${cell(d.repo)} | ${cell(d.repoSource ?? '')} |`), ''];
        })]
      : ['None: every Figma variable already has a description.', '']),
  ].join('\n');
}

// ---------- loading and printing ----------

export function loadInputs({ tokens, css, overrides }) {
  const problems = [];
  const warnings = [];
  let tok = null, cssText = null, ov = [];
  if (!existsSync(tokens)) problems.push(`tokens.json not found at ${tokens}`);
  else {
    try { tok = JSON.parse(readFileSync(tokens, 'utf8')); } catch (e) { problems.push(`tokens.json at ${tokens} is not valid JSON: ${e.message}`); }
    if (tok && !Array.isArray(tok)) problems.push(`tokens.json at ${tokens} is not a flat array of tokens`);
  }
  if (!existsSync(css)) problems.push(`tokens.css not found at ${css}`);
  else cssText = readFileSync(css, 'utf8');
  if (!existsSync(overrides)) warnings.push(`overrides.json not found at ${overrides}; treating it as having no overrides.`);
  else {
    try { ov = JSON.parse(readFileSync(overrides, 'utf8')); } catch (e) { problems.push(`overrides.json at ${overrides} is not valid JSON: ${e.message}`); }
    if (!Array.isArray(ov)) problems.push(`overrides.json at ${overrides} is not an array`);
  }
  return { problems, warnings, tokens: tok, css: cssText == null ? null : parseTokensCss(cssText), overrides: Array.isArray(ov) ? ov : [] };
}

function describe(listKey, item) {
  switch (listKey) {
    case 'missingInCode': return `${item.collection} ${item.token}`;
    case 'notInFigma': return `${item.collection ?? '(no collection)'} ${item.token}${item.cssVar ? ` (${item.cssVar})` : ''}`;
    case 'drift': return `${item.collection} ${item.token}, ${item.mode}: Figma ${item.figmaValue}${item.figmaAlias ? ` (${item.figmaAlias})` : ''}, repo ${item.repoValue}${item.note ? `; ${item.note}` : ''}`;
    case 'intendedOverrides': return `${item.collection} ${item.token}, ${item.mode}: Figma ${item.figmaValue}${item.figmaAlias ? ` (${item.figmaAlias})` : ''}, repo ${item.repoValue} (${item.overrideTo}). Reason: ${item.reason || 'none given'}`;
    case 'overridesToRemove': return `${item.collection} ${item.token}, ${item.mode}: Figma already holds ${item.figmaValue}${item.figmaAlias ? ` (${item.figmaAlias})` : ''}. Delete this override from ${item.sources.join(' and ')}.`;
    case 'cssNameDiffers': return `${item.collection} ${item.token}: Figma ${item.figmaSyntax}, repo ${item.repoCssVar}`;
    case 'cssFileMismatch': return item.token ? `${item.cssVar} (${item.token}), ${item.mode}: ${item.problem}; tokens.json ${item.json}, tokens.css ${item.css}` : `${item.cssVar}: ${item.problem}`;
    case 'descriptionDiffers': return `${item.collection} ${item.token}: Figma "${item.figma}", repo "${item.repo}"`;
    case 'proposedNotInFigma': return `${item.collection ?? '(no collection)'} ${item.token}${item.cssVar ? ` (${item.cssVar})` : ''}: ${Object.entries(item.values).map(([m, v]) => `${m} ${item.alias?.[m] ? `${item.alias[m]} ` : ''}${v}`).join(', ')}. Why: ${item.why || 'none given'}`;
    default: return JSON.stringify(item);
  }
}

function printReport(result, { all }) {
  const CAP = 40;
  LISTS.forEach((l, i) => {
    const items = result.lists[l.key];
    console.log(`${i + 1}. ${l.label}: ${items.length}${l.fails && items.length ? ' (fails)' : ''}`);
    const shown = all ? items : items.slice(0, CAP);
    for (const it of shown) console.log(`   - ${describe(l.key, it)}`);
    if (shown.length < items.length) console.log(`   ... and ${items.length - shown.length} more, all listed in diff.json (or run with --all).`);
  });
  for (const w of result.warnings) console.log(`Warning: ${w}`);
}

// ---------- self-test ----------

function selfTest() {
  const snap = loadSnapshots();
  const figma = resolvedSemantic(snap);
  const firstMode = (v) => normMode(v.modes[0]);
  const blockFor = (v, mode) => (mode === firstMode(v) || mode === 'default') ? 'root' : mode;
  const COLL = { Themes: 'Color', Typography: 'Typography', Radius: 'Radius', Density: 'Space', 'Surface Gradients': 'Gradient', Border: 'Border' };
  let objectFormsUsed = 0;
  // Code-side formats are deliberately varied so that the clean baseline proves the normalising works.
  const codeValue = (v, mode, value, i) => {
    const kind = kindOf(v, null);
    if (kind === 'color') {
      if (i % 50 === 7 && value.length === 7) { objectFormsUsed++; const c = colorRgba(value); return { colorSpace: 'srgb', components: c.rgba.slice(0, 3).map((x) => x / 255), alpha: 1, hex: value }; }
      if (mode === 'dark' && value.length === 7) return value + 'FF';
      return value.toUpperCase();
    }
    if (kind === 'weight') return toWeight(value);
    if (kind === 'family') return `"${value}", system-ui, sans-serif`;
    if (kind === 'number') {
      if (v.collection === 'Typography') return `${value / 16}rem`;
      if (i % 40 === 3) { objectFormsUsed++; return { value, unit: 'px' }; }
      return value;
    }
    return value;
  };
  const cssValue = (v, value) => {
    const kind = kindOf(v, null);
    if (kind === 'color') return value.toLowerCase();
    if (kind === 'weight') return String(toWeight(value));
    if (kind === 'family') return `"${value}", sans-serif`;
    if (kind === 'number') return `${value}px`;
    return value;
  };
  function cleanFixture() {
    const tokens = figma.map((v, i) => ({
      name: v.name,
      collection: COLL[v.collection] ?? v.collection,
      category: COLL[v.collection] ?? v.collection,
      type: v.type,
      cssVar: cssName(v.syntax),
      description: v.description,
      values: Object.fromEntries(v.modes.map((m) => [normMode(m), codeValue(v, normMode(m), v.perMode[m].value, i)])),
      alias: Object.fromEntries(v.modes.map((m) => [normMode(m), v.perMode[m].alias])),
      scopes: v.scopes,
      overridden: null,
    }));
    const blocks = new Map(); // block -> Map(prop -> value)
    const put = (b, p, val) => { if (!blocks.has(b)) blocks.set(b, new Map()); blocks.get(b).set(p, val); };
    for (const v of figma) for (const m of v.modes) put(blockFor(v, normMode(m)), cssName(v.syntax), cssValue(v, v.perMode[m].value));
    return { tokens, blocks, overrides: [] };
  }
  const SELECTOR = { root: ':root, [data-theme="light"], [data-density="standard"]', dark: '[data-theme="dark"]', compact: '[data-density="compact"]' };
  const writeCss = ({ blocks }) => [...blocks].map(([b, props]) => `${SELECTOR[b] ?? `[data-theme="${b}"]`} {\n${[...props].map(([p, v]) => `  ${p}: ${v};`).join('\n')}\n}`).join('\n\n') + '\n';

  const dir = mkdtempSync(join(tmpdir(), 'diff-figma-self-test-'));
  const run = (fx, tag, snapshot = snap) => {
    const paths = { tokens: join(dir, `${tag}-tokens.json`), css: join(dir, `${tag}-tokens.css`), overrides: join(dir, `${tag}-overrides.json`) };
    writeFileSync(paths.tokens, JSON.stringify(fx.tokens, null, 2));
    writeFileSync(paths.css, writeCss(fx));
    writeFileSync(paths.overrides, JSON.stringify(fx.overrides, null, 2));
    const input = loadInputs(paths);
    if (input.problems.length) throw new Error(input.problems.join('; '));
    return diff({ snap: snapshot, tokens: input.tokens, css: input.css, overrides: input.overrides });
  };
  const errors = [];
  const expect = (cond, msg) => { if (!cond) errors.push(msg); };
  try {
    // Normalising rules, checked directly.
    expect(sameValue('#DB2777', '#db2777ff', 'color'), 'hex case and an ff alpha should be equal');
    expect(!sameValue('#fed7aa00', '#fed7aa', 'color'), 'a transparent stop must not equal the opaque colour');
    expect(sameValue(16, '1rem', 'number') && sameValue('16px', 16, 'number'), '16px, 16 and 1rem should be equal');
    expect(['Regular', 'Medium', 'SemiBold', 'Bold', 'Extra Bold'].every((n, i) => sameValue(n, 400 + 100 * i, 'weight')), 'style names should equal numeric weights');

    // Clean baseline: every list empty and every token agrees.
    const clean = run(cleanFixture(), 'clean');
    expect(objectFormsUsed > 0, 'the clean fixture should use the W3C object form somewhere');
    for (const l of LISTS) expect(clean.lists[l.key].length === 0, `clean fixture: list "${l.label}" should be empty, has ${clean.lists[l.key].length}: ${clean.lists[l.key].slice(0, 2).map((x) => describe(l.key, x)).join(' | ')}`);
    expect(clean.agree === figma.length && clean.total === figma.length, `clean fixture should agree on all ${figma.length}, got ${clean.agree} of ${clean.total}`);
    expect(!clean.failed, 'clean fixture should not fail');
    expect(patchList(clean).trim().split('\n').length === 1, 'an empty patch list should be one line');
    for (const w of clean.warnings) errors.push(`clean fixture warning: ${w}`);

    // Plant one fault of each kind.
    const fx = cleanFixture();
    const tok = (name) => fx.tokens.find((t) => t.name === name && t.collection === 'Color');
    const fig = (name) => figma.find((v) => v.name === name && v.collection === 'Themes');
    // 1. Removed from code (and from tokens.css, so only list 1 fires).
    fx.tokens = fx.tokens.filter((t) => !(t.name === 'text/secondary' && t.collection === 'Color'));
    for (const props of fx.blocks.values()) props.delete('--color-text-secondary');
    // 2. A token only in code, present in both files.
    fx.tokens.push({ name: 'text/ghost', collection: 'Color', type: 'color', cssVar: '--color-text-ghost', description: 'Planted.', values: { light: '#111111', dark: '#eeeeee' }, alias: { light: null, dark: null }, scopes: [], overridden: null });
    fx.blocks.get('root').set('--color-text-ghost', '#111111');
    fx.blocks.get('dark').set('--color-text-ghost', '#eeeeee');
    // 3. Drift: a changed value with no override, changed in both files.
    tok('text/placeholder').values.light = '#123456';
    fx.blocks.get('root').set('--color-text-placeholder', '#123456');
    // 4. Intended override: link colour moved from pink/600 to pink/700 in both files, with a reason.
    const pink700 = makeResolver(snap).resolve(makeResolver(snap).find('pink/700', 'primitives')).value;
    tok('text/link/default').values.light = pink700;
    tok('text/link/default').overridden = { light: { from: 'pink/600', to: 'pink/700', reason: 'Pink 600 is below 4.5 to 1 on surface/secondary' } };
    fx.blocks.get('root').set('--color-text-link', pink700);
    fx.overrides.push({ token: 'text/link/default', collection: 'Themes', mode: 'light', to: 'pink/700', reason: 'Pink 600 is below 4.5 to 1 on surface/secondary', rule: 'LOCK' });
    // 5. An override whose value Figma already holds.
    fx.overrides.push({ token: 'icon/brand', collection: 'Themes', mode: 'dark', to: fig('icon/brand').perMode.dark.alias, reason: 'Was ahead of Figma', rule: 'ADAPT' });
    // 6. CSS name renamed in both files.
    tok('icon/primary').cssVar = '--color-icon-main';
    for (const props of fx.blocks.values()) if (props.has('--color-icon-primary')) { props.set('--color-icon-main', props.get('--color-icon-primary')); props.delete('--color-icon-primary'); }
    // 7. tokens.css alone differs from tokens.json.
    fx.blocks.get('dark').set('--color-icon-secondary', '#ff00ff');
    // 8. Description.
    tok('surface/error').description = 'Background for error messages.';
    tok('surface/error').descriptionSource = 'drafted';
    // 9. A token only in code, marked proposed, present in both files. (text/ghost above is not marked, and must still fail.)
    const proposedTok = { name: 'border/planted', collection: 'Themes', category: 'color', type: 'color', cssVar: '--color-border-planted', description: 'Planted.', values: { light: '#8c8f97', dark: '#7e8188' }, alias: { light: 'neutral/light/500', dark: 'neutral/dark/500' }, scopes: [], overridden: null, proposed: true, why: 'Planted | proposed.' };
    fx.tokens.push(proposedTok);
    fx.blocks.get('root').set('--color-border-planted', '#8c8f97');
    fx.blocks.get('dark').set('--color-border-planted', '#7e8188');

    const r = run(fx, 'planted');
    const planted = {
      missingInCode: { token: 'text/secondary' },
      notInFigma: { token: 'text/ghost' },
      drift: { token: 'text/placeholder', mode: 'light' },
      intendedOverrides: { token: 'text/link/default', mode: 'light' },
      overridesToRemove: { token: 'icon/brand', mode: 'dark' },
      cssNameDiffers: { token: 'icon/primary' },
      cssFileMismatch: { token: 'icon/secondary', mode: 'dark' },
      descriptionDiffers: { token: 'surface/error' },
      proposedNotInFigma: { token: 'border/planted', collection: 'Themes', why: 'Planted | proposed.' },
    };
    const lines = [];
    LISTS.forEach((l, i) => {
      const want = planted[l.key];
      const got = r.lists[l.key];
      const ok = got.length === 1 && Object.entries(want).every(([k, v]) => got[0][k] === v);
      if (!ok) errors.push(`list ${i + 1} (${l.label}) should hold only ${JSON.stringify(want)}, holds ${got.length}: ${got.slice(0, 3).map((x) => describe(l.key, x)).join(' | ')}`);
      lines.push(`${ok ? 'Caught' : 'MISSED'} kind ${i + 1}, ${l.label.split(' (')[0]}: ${ok ? describe(l.key, got[0]) : 'not reported as the only item in its list'}`);
    });
    expect(r.failed, 'the planted set should fail');
    // Six tokens do not agree: one missing, one extra, and the four with a value, name or tokens.css fault.
    // The proposed token is not counted in the total (it is in list 9).
    expect(r.agree === figma.length + 1 - 6 && r.total === figma.length + 1, `planted set should agree on ${figma.length + 1 - 6} of ${figma.length + 1}, got ${r.agree} of ${r.total}`);
    const pi = r.lists.proposedNotInFigma[0];
    expect(pi && pi.values.light === '#8c8f97' && pi.values.dark === '#7e8188' && pi.alias.light === 'neutral/light/500', `proposed item should carry its values and aliases: ${JSON.stringify(pi)}`);
    const pl = patchList(r);
    const plLines = pl.split('\n');
    const wantPl = [
      '# Changes to make by hand in Figma', '', '## Alias changes from overrides', '',
      '- Themes, text/link/default, light: change alias from pink/600 to pink/700. Pink 600 is below 4.5 to 1 on surface/secondary.',
      '', '## Variables to add', '',
      'Tokens the repo proposes that Figma does not hold as variables. The snapshot reads variables only: a token Figma already keeps as a style (for example a shadow kept as an effect style) is listed here too; for those, check the style and add a variable only if one is wanted.', '',
      '| Collection | Name | Value per mode | Why |', '| --- | --- | --- | --- |',
      '| Themes | border/planted | light: neutral/light/500 (#8c8f97); dark: neutral/dark/500 (#7e8188) | Planted \\| proposed. |', '',
      '## Descriptions to set', '',
      '1 Figma variable has an empty description. Paste the text into each variable\'s description field. Source is where the text comes from (ds-tokens/descriptions.json): owner, drafted or proposed.', '',
      '### Themes (1)', '', '| Name | Description to paste | Source |', '| --- | --- | --- |', '| surface/error | Background for error messages. | drafted |', '',
    ];
    expect(plLines.length === wantPl.length && wantPl.every((l, i) => plLines[i] === l), `patch list should be exactly three sections, one alias row, one variable row and one description row; got:\n${pl}`);
    for (const w of r.warnings) errors.push(`planted fixture warning: ${w}`);

    // Proposed alone: listed, does not fail, and an unmarked copy of the same token does fail.
    const prop = cleanFixture();
    prop.tokens.push({ ...proposedTok });
    prop.blocks.get('root').set('--color-border-planted', '#8c8f97');
    prop.blocks.get('dark').set('--color-border-planted', '#7e8188');
    const pr = run(prop, 'proposed');
    expect(!pr.failed && pr.counts.proposedNotInFigma === 1 && pr.counts.notInFigma === 0 && pr.counts.cssFileMismatch === 0 && pr.agree === figma.length && pr.total === figma.length,
      `a proposed token alone should be listed and not fail (failed=${pr.failed}, counts ${JSON.stringify(pr.counts)}, agree ${pr.agree} of ${pr.total})`);
    expect(patchList(pr).includes('None: no override is ahead of Figma.') && patchList(pr).includes('| Themes | border/planted |'), `proposed-only patch list is wrong: ${patchList(pr)}`);
    const unmarked = cleanFixture();
    const { proposed: _p, why: _w, ...plain } = proposedTok;
    unmarked.tokens.push(plain);
    unmarked.blocks.get('root').set('--color-border-planted', '#8c8f97');
    unmarked.blocks.get('dark').set('--color-border-planted', '#7e8188');
    const ur = run(unmarked, 'unmarked');
    expect(ur.failed && ur.counts.notInFigma === 1 && ur.counts.proposedNotInFigma === 0, `the same token without "proposed": true should fail as in code, not in Figma (counts ${JSON.stringify(ur.counts)})`);

    // Only lists 4, 5 and 8 present: the run must not fail.
    const soft = cleanFixture();
    const st = (name) => soft.tokens.find((t) => t.name === name && t.collection === 'Color');
    st('text/link/default').values.light = pink700;
    soft.blocks.get('root').set('--color-text-link', pink700);
    soft.overrides.push({ token: 'text/link/default', collection: 'Themes', mode: 'light', to: 'pink/700', reason: 'Contrast', rule: 'LOCK' });
    soft.overrides.push({ token: 'icon/brand', collection: 'Themes', mode: 'dark', to: fig('icon/brand').perMode.dark.alias, reason: 'Old', rule: 'ADAPT' });
    st('surface/error').description = 'Planted.';
    const s = run(soft, 'soft');
    expect(!s.failed && s.counts.intendedOverrides === 1 && s.counts.overridesToRemove === 1 && s.counts.descriptionDiffers === 1, `lists 4, 5 and 8 alone should not fail (failed=${s.failed}, counts ${JSON.stringify(s.counts)})`);

    // Descriptions to set: one row per Figma variable with an empty description, grouped by collection in Figma's order;
    // a Figma description that differs from the repo's is reported in list 8 but not pasted over.
    const dfx = cleanFixture();
    const dt = (name, coll) => dfx.tokens.find((t) => t.name === name && t.collection === coll);
    const radiusName = figma.find((v) => v.collection === 'Radius' && !v.description).name;
    const fadeFig = figma.find((v) => v.collection === 'Surface Gradients' && v.description);
    dt(radiusName, 'Radius').description = 'Planted radius text.';
    dt(radiusName, 'Radius').descriptionSource = 'drafted';
    dt('surface/error', 'Color').description = 'Planted | colour text.';
    dt('surface/error', 'Color').descriptionSource = 'owner';
    dt(fadeFig.name, 'Gradient').description = 'Planted text that differs from Figma.';
    const dr = run(dfx, 'descriptions');
    const dpl = patchList(dr);
    const section = dpl.slice(dpl.indexOf('## Descriptions to set'));
    const themesAt = section.indexOf('### Themes (1)'), radiusAt = section.indexOf('### Radius (1)');
    expect(!dr.failed && dr.counts.descriptionDiffers === 3, `three description differences should be listed without failing (counts ${JSON.stringify(dr.counts)})`);
    expect(themesAt > 0 && radiusAt > themesAt && section.includes('| surface/error | Planted \\| colour text. | owner |') && section.includes(`| ${radiusName} | Planted radius text. | drafted |`) && section.startsWith('## Descriptions to set\n\n2 Figma variables have'),
      `descriptions to set should hold two rows grouped under Themes then Radius; got:\n${section}`);
    expect(!section.includes(fadeFig.name), `a Figma description that differs should not be listed to set: ${fadeFig.name}`);
    lines.push(`Caught descriptions to set: 2 rows in 2 collections (Themes, Radius); ${fadeFig.name}, whose Figma description differs, is not listed`);

    // Motion durations: Figma holds 100, tokens.json "100ms". Equal for a Motion duration only.
    expect(sameValue(100, '100ms', 'duration') && sameValue('160', { value: 160, unit: 'ms' }, 'duration') && sameValue(800, '0.8s', 'duration'), 'a duration number should equal the same number in ms');
    expect(!sameValue(100, '160ms', 'duration'), 'different durations must differ');
    expect(!sameValue(100, '100ms', 'number'), 'outside a Motion duration, 100 and 100ms must still differ');
    const msnap = structuredClone(snap);
    const mv = (name, n) => ({ file: 'semantic', collection: 'Motion', name, type: 'number', values: [String(n)], syntax: `var(--${name.replace('/', '-')})`, scopes: [], description: 'Planted.', line: 0 });
    msnap.semantic.push({ file: 'semantic', name: 'Motion', modes: ['default'], declared: 2, variables: [mv('duration/fast', 100), mv('duration/enter', 160)] });
    const mfx = cleanFixture();
    for (const [name, v] of [['duration/fast', '100ms'], ['duration/enter', '170ms']]) {
      mfx.tokens.push({ name, collection: 'Motion', category: 'motion', type: 'duration', cssVar: `--${name.replace('/', '-')}`, description: 'Planted.', values: { default: v }, alias: { default: null }, scopes: [], overridden: null });
      mfx.blocks.get('root').set(`--${name.replace('/', '-')}`, v);
    }
    const mr = run(mfx, 'motion', msnap);
    const md = mr.lists.drift;
    expect(md.length === 1 && md[0].token === 'duration/enter' && md[0].figmaValue === '160ms' && md[0].repoValue === '170ms' && mr.counts.cssFileMismatch === 0,
      `Motion: 100 against "100ms" should agree and 160 against "170ms" should be the only drift; drift ${JSON.stringify(md)}, counts ${JSON.stringify(mr.counts)}`);
    lines.push(`Caught Motion duration: Figma 100 = repo 100ms agrees; ${md[0] ? describe('drift', md[0]) : 'nothing'} is the only drift`);

    for (const line of lines) console.log(line);
  } catch (e) {
    errors.push(`self-test crashed: ${e.stack || e.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const e of errors) console.log(`Problem: ${e}`);
  console.log(errors.length ? `Self-test failed: ${errors.length} problem(s).` : 'Self-test passed: all 9 planted kinds were caught, each in its own list (a proposed token listed without failing, an unmarked one failing), descriptions to set were grouped by collection, a Motion duration in ms matched its Figma number, and the clean fixture gave empty lists.');
  process.exit(errors.length ? 1 : 0);
}

// ---------- main ----------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) return selfTest();
  const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? resolvePath(argv[i + 1]) : dflt; };
  const paths = {
    tokens: opt('--tokens', join(ROOT, 'ds-tokens', 'dist', 'tokens.json')),
    css: opt('--css', join(ROOT, 'ds-tokens', 'dist', 'tokens.css')),
    overrides: opt('--overrides', join(ROOT, 'ds-tokens', 'overrides.json')),
  };
  const out = opt('--out', join(ROOT, 'ds-tokens', 'audit', 'diff.json'));
  const patchOut = opt('--patch-list', join(ROOT, 'ds-tokens', 'audit', 'figma-patch-list.md'));
  const reportOnly = argv.includes('--report-only');

  const input = loadInputs(paths);
  for (const w of input.warnings) console.log(`Warning: ${w}`);
  if (input.problems.length) {
    for (const p of input.problems) console.log(`Cannot run: ${p}.`);
    console.log('Figma and code were not compared: an input is missing or unreadable.');
    process.exit(2);
  }
  let snap;
  try { snap = loadSnapshots(); } catch (e) { console.log(`Cannot read the Figma snapshot: ${e.message}`); console.log('Figma and code were not compared: the Figma snapshot is unreadable.'); process.exit(2); }

  const result = diff({ snap, tokens: input.tokens, css: input.css, overrides: input.overrides });
  printReport(result, { all: argv.includes('--all') });

  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(dirname(patchOut), { recursive: true });
  const agreement = 'Agree means: in both Figma and code, the same value in every mode, the CSS name matches the Figma WEB code syntax, and tokens.css matches tokens.json. Descriptions are not part of agreement. A token whose override is no longer needed still agrees. The total is every token in Figma or in code.';
  writeFileSync(out, JSON.stringify({
    tool: 'v2/tools/diff-figma.mjs',
    inputs: { figma: `${((d) => (d.startsWith(ROOT) ? d.slice(ROOT.length + 1) : d))(resolvePath(SNAPSHOT_DIR))}/semantic.txt + primitives.txt`, ...Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p])) },
    agreement, agree: result.agree, total: result.total, failed: result.failed,
    counts: result.counts, lists: result.lists, warnings: result.warnings, summary: result.summary,
  }, null, 2) + '\n');
  writeFileSync(patchOut, patchList(result));
  console.log(`Wrote ${out.slice(ROOT.length + 1) || out} and ${patchOut.slice(ROOT.length + 1) || patchOut}.`);
  console.log(result.summary);
  process.exit(result.failed && !reportOnly ? 1 : 0);
}

main();
