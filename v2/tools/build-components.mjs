#!/usr/bin/env node
// Turns every component spec in ds-components/specs/*.spec.json into code and reference docs.
// Deterministic: no model, no clock, no network. Two runs on the same inputs give byte-identical files.
//
//   node v2/tools/build-components.mjs              build every spec
//   node v2/tools/build-components.mjs button tabs  write only the named components' own files; every spec is
//                                                   still built so the shared files below never lose a component
//   node v2/tools/build-components.mjs --self-test  plant known faults in copies of the Button spec,
//                                                   in memory, and confirm each one is caught
//
// For each spec it writes:
//   ds-components/src/<slug>/<slug>.css           the styles, inside @layer ds.components
//   ds-components/src/<slug>/<slug>.contract.ts   the typed surface: unions, props interfaces, constants
//   ds-components/docs/<slug>.md                  a complete reference page (not usage guidance)
// Across specs it writes:
//   ds-components/docs/state-map.md              every state of every component in one table
//   ds-components/src/styles.css                  layer order, then each component's stylesheet
//   ds-components/src/index.ts                    the public entry, from the folders that hold <slug>.tsx
//   ds-components/generated/tokens-used.json      tokens per component, and Figma colours nobody uses
//
// The stylesheet has flat specificity: every condition on a part (props, states, precedence exclusions) and
// every ancestor part sits inside :where(), so each rule weighs what [data-slot~="..."] alone weighs and the
// rules apply in spec order, like a stylesheet. A later rule wins where two set the same property.
// data-slot is a space-separated list of slot names, like a class list (an element can be two parts at once, such
// as a Button inside DropdownMenuTrigger asChild), so every part selector matches by the word: [data-slot~="x"].
// Outline: a block that sets outlineWidth also gets outline-style, written last: none for a width of none (a width of
// 0 alone leaves Chromium's automatic focus ring), solid for a width token.
//
// Contracts. A single-piece spec (no prop keyed part.prop) gives one interface, <Name>Props, with every prop.
// A compound spec gives <Name>Props for its plain keys and <Name><Part>Props for each part.prop prefix, the
// prop named after the dot (trigger.value -> value in TabsTriggerProps); an enum union is <Name><Part><Prop>.
// <NAME>_DEFAULTS and <NAME>_REFLECTS keep the spec's own (dotted) keys, grouped by exported component; a
// default of null is unset and is listed in a comment only. A part whose element is null renders nothing: it
// is in <NAME>_SLOTS with a comment, gets no CSS, and a style rule, state or condition naming it is an error.
//
// A spec that is not valid is reported with every problem found, by file and rule, and is not built;
// the others still build. The exit code is 1 when any spec could not be built.
//
// Tokens are named in a spec by their Figma path; the declaration decides the collection. A name is
// looked up as written, and if it is not found and starts with the collection's CSS prefix (size/ for
// Size) it is looked up again without that segment. The CSS name comes from ds-tokens/dist/tokens.json
// when the token is listed there, and otherwise from the naming rule in v2/tools/lib/snapshot.mjs.
// A token in the semantic Figma snapshot is "from Figma"; one only in ds-tokens/proposed/tokens.json
// (or only in tokens.json) is "proposed in the repo".
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { loadSnapshots, expectedSyntax, CSS_PREFIX } from './lib/snapshot.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const GENERATOR = 'v2/tools/build-components.mjs';
const SPEC_DIR = join(ROOT, 'ds-components', 'specs');
const SCHEMA_FILE = join(ROOT, 'ds-components', 'schema', 'component.schema.json');
const PROPOSED_FILE = join(ROOT, 'ds-tokens', 'proposed', 'tokens.json');
const TOKENS_JSON = join(ROOT, 'ds-tokens', 'dist', 'tokens.json');

// ---------- small guards, because half-written specs have wrong types ----------
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const obj = (x) => (isObj(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const str = (x) => (typeof x === 'string' ? x : '');
const q = (x) => (x === undefined ? '(missing)' : JSON.stringify(x));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ---------- the mapping from spec declarations to CSS ----------
// collection: where the token comes from (null: no collection exists, so only keywords are legal).
// css: the CSS properties the declaration writes, in order. keywords: the legal keywords and what each becomes.
// enum: the value is one of the schema's fixed words and is written as it is.
const COLOUR_KEYWORDS = { transparent: 'transparent', current: 'currentColor', inherit: 'inherit' };
const LENGTH_KEYWORDS = { full: '100%', inherit: 'inherit' };
const ZERO_KEYWORDS = { none: '0', inherit: 'inherit' };
const TRANSITION_PROPERTY = 'background-color, border-color, color, box-shadow, opacity';
export const DECLARATIONS = {
  background: { collection: 'Themes', css: ['background-color'], keywords: COLOUR_KEYWORDS },
  color: { collection: 'Themes', css: ['color'], keywords: COLOUR_KEYWORDS },
  borderColor: { collection: 'Themes', css: ['border-color'], keywords: COLOUR_KEYWORDS },
  borderWidth: { collection: 'Border', css: ['border-width'], keywords: ZERO_KEYWORDS },
  borderStyle: { enum: ['solid', 'dashed', 'none'], css: ['border-style'] },
  radius: { collection: 'Radius', css: ['border-radius'], keywords: ZERO_KEYWORDS },
  height: { collection: 'Size', css: ['block-size'], keywords: LENGTH_KEYWORDS },
  minHeight: { collection: 'Size', css: ['min-block-size'], keywords: LENGTH_KEYWORDS },
  width: { collection: 'Size', css: ['inline-size'], keywords: LENGTH_KEYWORDS },
  minWidth: { collection: 'Size', css: ['min-inline-size'], keywords: LENGTH_KEYWORDS },
  maxWidth: { collection: 'Size', css: ['max-inline-size'], keywords: { none: 'none', ...LENGTH_KEYWORDS } },
  paddingInline: { collection: 'Density', css: ['padding-inline'], keywords: ZERO_KEYWORDS },
  paddingBlock: { collection: 'Density', css: ['padding-block'], keywords: ZERO_KEYWORDS },
  gap: { collection: 'Density', css: ['gap'], keywords: ZERO_KEYWORDS },
  typography: { collection: 'Typography', css: ['font-size', 'line-height', 'font-weight'], keywords: { inherit: 'inherit' }, typeRole: true },
  fontWeight: { collection: 'Typography', css: ['font-weight'], keywords: { inherit: 'inherit' }, prefix: 'font-weight/' },
  iconSize: { collection: 'Size', css: ['inline-size', 'block-size'], keywords: LENGTH_KEYWORDS },
  shadow: { collection: 'Elevation', css: ['box-shadow'], keywords: { none: 'none', inherit: 'inherit' } },
  opacity: { collection: null, css: ['opacity'], keywords: { none: '0', full: '1', inherit: 'inherit' } },
  outlineColor: { collection: 'Themes', css: ['outline-color'], keywords: COLOUR_KEYWORDS, also: [['outline-style', 'solid']] },
  outlineWidth: { collection: 'Border', css: ['outline-width'], keywords: ZERO_KEYWORDS },
  outlineOffset: { collection: 'Border', css: ['outline-offset'], keywords: ZERO_KEYWORDS },
  duration: { collection: 'Motion', css: ['transition-duration'], keywords: { none: '0s', inherit: 'inherit' }, before: [['transition-property', TRANSITION_PROPERTY]] },
  easing: { collection: 'Motion', css: ['transition-timing-function'], keywords: { inherit: 'inherit' } },
  cursor: { enum: ['pointer', 'default', 'not-allowed', 'text', 'progress'], css: ['cursor'] },
  textDecoration: { enum: ['none', 'underline'], css: ['text-decoration-line'] },
  layer: { collection: null, css: ['z-index'], keywords: { inherit: 'inherit' } },
  // pseudo: written in a rule of its own on that pseudo-element of the part (the schema: a colour set on an
  // input does not reach its placeholder).
  placeholderColor: { collection: 'Themes', css: ['color'], keywords: COLOUR_KEYWORDS, pseudo: '::placeholder' },
};

// Which declarations each part kind may take. The same lists as v2/tools/check-specs.mjs:
// text takes colour and typography, a glyph takes colour and size, a slot takes none, and a
// container, control or layer takes every box property.
const KIND_ALLOWS = {
  text: ['color', 'typography', 'fontWeight', 'textDecoration'],
  glyph: ['color', 'iconSize', 'opacity'],
  slot: [],
  container: null, control: null, layer: null,
};

const MEDIA = {
  'coarse-pointer': '(pointer: coarse)',
  'reduced-motion': '(prefers-reduced-motion: reduce)',
  'forced-colors': '(forced-colors: active)',
};

// The weight token a type role takes.
function weightGroup(role) {
  if (role === 'section-label-base') return 'section-label-base';
  const m = role.match(/^(heading|label|body)-[a-z0-9-]+$/);
  return m ? m[1] : null;
}

// ---------- context: schema and the token index ----------
export function loadContext() {
  const Ajv2020 = require('ajv/dist/2020.js');
  const Ajv = Ajv2020.default ?? Ajv2020;
  const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false, logger: false });
  const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')));

  // tokens: Map collection -> Map name -> { name, collection, cssVar, origin, type }
  const tokens = new Map();
  const put = (collection, name, fields) => {
    if (!tokens.has(collection)) tokens.set(collection, new Map());
    const m = tokens.get(collection);
    if (!m.has(name)) m.set(name, { name, collection, cssVar: cssNameByRule(collection, name), ...fields });
    return m.get(name);
  };
  const figmaColours = [];
  const { semantic } = loadSnapshots();
  for (const c of semantic) {
    for (const v of c.variables) {
      put(c.name, v.name, { origin: 'figma', type: v.type });
      if (v.type === 'color') figmaColours.push({ collection: c.name, name: v.name });
    }
  }
  for (const t of arr(JSON.parse(readFileSync(PROPOSED_FILE, 'utf8')))) {
    if (isObj(t) && str(t.collection) && str(t.name)) put(t.collection, t.name, { origin: 'proposed', type: str(t.type) || null });
  }
  // tokens.json names the CSS variable that ds-tokens/dist/tokens.css actually defines.
  if (existsSync(TOKENS_JSON)) {
    for (const t of arr(JSON.parse(readFileSync(TOKENS_JSON, 'utf8')))) {
      if (!isObj(t) || !str(t.collection) || !str(t.name)) continue;
      const entry = put(t.collection, t.name, { origin: 'proposed', type: str(t.type) || null });
      if (str(t.cssVar).startsWith('--')) entry.cssVar = t.cssVar;
    }
  }
  for (const c of figmaColours) c.cssVar = tokens.get(c.collection).get(c.name).cssVar;
  return { validate, tokens, figmaColours };
}

function cssNameByRule(collection, name) {
  if (!has(CSS_PREFIX, collection)) return `--${name.replace(/\/default$/, '').split('/').join('-')}`;
  return expectedSyntax({ collection, name }).replace(/^var\(/, '').replace(/\)$/, '');
}

// Finds a token: as written, then without a leading segment equal to the collection's CSS prefix.
function findToken(ctx, collection, name) {
  const m = ctx.tokens.get(collection);
  if (!m) return null;
  if (m.has(name)) return m.get(name);
  const prefix = CSS_PREFIX[collection];
  if (prefix && name.startsWith(prefix + '/')) return m.get(name.slice(prefix.length + 1)) || null;
  return null;
}

// ---------- naming helpers ----------
const pascal = (s) => s.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const screaming = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const tsKey = (k) => (IDENT.test(k) ? k : `'${k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
const tsString = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const code = (x) => (x === '' || x === null || x === undefined ? '' : '`' + String(x).replace(/\|/g, '\\|') + '`');
const doc = (s) => str(s).replace(/\*\//g, '* /');

// ---------- compound components ----------
// A part whose element is null (a Radix Root or Portal) renders no element of its own: it has a data-slot name in
// the contract but nothing carries it, so it takes no style and no state.
export const rendersNothing = (part) => isObj(part) && part.element === null;
// A spec is compound when any prop is keyed part.prop. Such a prop belongs to the exported component of that part
// (<Name><Part>), under the name after the dot; a plain key belongs to the root component <Name>. A spec with no
// dotted key is single-piece: one component, and every prop is in <Name>Props whatever part it lands on.
export const isCompound = (spec) => Object.keys(obj(spec.props)).some((k) => k.includes('.'));
export const splitKey = (key) => { const i = key.indexOf('.'); return i < 0 ? { part: null, name: key } : { part: key.slice(0, i), name: key.slice(i + 1) }; };
// The exported component that takes a prop: the root component for a plain key.
const componentOf = (spec, key) => { const { part } = splitKey(key); return part ? `${spec.name}${pascal(part)}` : spec.name; };

// ---------- one spec: validation and the stylesheet ----------
// Returns { errors, rules: [{ index, part, media, selector, decls: [[prop, value]] }], usage }.
export function compileStyles(spec, file, ctx) {
  const errors = [];
  const fail = (where, msg) => errors.push(`${file}: ${where}: ${msg}`);
  const parts = obj(spec.anatomy);
  const partNames = Object.keys(parts);
  const rootPart = partNames[0];
  const props = obj(spec.props);
  const states = obj(spec.states);
  const precedence = arr(spec.precedence).filter((s) => typeof s === 'string');
  const usage = new Map(); // collection:name -> { token, collection, cssVar, origin, rules: Set }
  const out = [];

  for (const [pname, part] of Object.entries(parts)) {
    if (!has(KIND_ALLOWS, obj(part).kind)) fail(`anatomy.${pname}`, `the part kind ${q(obj(part).kind)} is not one of ${Object.keys(KIND_ALLOWS).join(', ')}.`);
    if (!/^[a-z][a-z-]*$/.test(str(obj(part).slot))) fail(`anatomy.${pname}.slot`, `the data-slot ${q(obj(part).slot)} is not kebab-case.`);
  }
  // A part whose element is null renders nothing, so nothing can match it: no state may sit on it.
  const nothing = (p) => has(parts, p) && rendersNothing(parts[p]);
  for (const [sname, state] of Object.entries(states)) {
    const s = obj(state);
    if (!has(parts, s.on)) fail(`states.${sname}.on`, `the state is on ${q(s.on)}, which is not a part.`);
    else if (nothing(s.on)) fail(`states.${sname}.on`, `the state is on ${s.on}, whose element is null: that part renders no element, so no selector can match it.`);
    if (!/^[:[]/.test(str(s.selector))) fail(`states.${sname}.selector`, `the selector ${q(s.selector)} must start with a pseudo-class (:) or an attribute ([).`);
  }
  precedence.forEach((s, i) => { if (!has(states, s)) fail(`precedence[${i}]`, `${q(s)} is not a state.`); });

  // data-slot is a space-separated list of slot names, like a class list: one element can be two parts at once (a
  // Button inside DropdownMenuTrigger asChild carries data-slot="button dropdown-menu-trigger"). Every part is
  // therefore found by the word, never by the whole attribute.
  const slotSel = (p) => `[data-slot~="${str(obj(parts[p]).slot)}"]`;

  arr(spec.styles).forEach((rule, i) => {
    const at = `styles[${i}]`;
    const when = obj(obj(rule).when);
    const ruleParts = obj(obj(rule).parts);
    // Pieces of the compound selector on each part that the condition touches.
    const pieces = new Map();
    const add = (p, piece) => { if (!pieces.has(p)) pieces.set(p, []); if (!pieces.get(p).includes(piece)) pieces.get(p).push(piece); };
    let condOk = true;

    for (const [pname, value] of Object.entries(obj(when.props))) {
      const p = props[pname];
      if (!isObj(p)) { fail(`${at}.when.props.${pname}`, `the rule names the prop ${pname}, which the spec does not have.`); condOk = false; continue; }
      if (!has(parts, p.on)) { fail(`${at}.when.props.${pname}`, `the prop ${pname} is on ${q(p.on)}, which is not a part.`); condOk = false; continue; }
      if (nothing(p.on)) { fail(`${at}.when.props.${pname}`, `the prop ${pname} is on ${p.on}, whose element is null: that part renders no element, so no attribute on it can be seen.`); condOk = false; continue; }
      if (typeof p.reflects !== 'string' || !/^[a-z][a-z0-9-]*$/.test(p.reflects)) {
        fail(`${at}.when.props.${pname}`, `the rule depends on ${pname}, but the prop does not reflect an attribute (reflects is ${q(p.reflects)}), so styles cannot see it.`); condOk = false; continue;
      }
      const attr = p.reflects;
      if (p.type === 'boolean') {
        if (typeof value !== 'boolean') { fail(`${at}.when.props.${pname}`, `${q(value)} is not a boolean.`); condOk = false; continue; }
        add(p.on, value ? `[${attr}]` : `:not([${attr}])`);
      } else if (p.type === 'enum') {
        if (!arr(p.values).includes(value)) { fail(`${at}.when.props.${pname}`, `${q(value)} is not one of ${q(arr(p.values))}.`); condOk = false; continue; }
        add(p.on, `[${attr}="${value}"]`);
      } else if (p.type === 'string' || p.type === 'number') {
        add(p.on, `[${attr}="${String(value).replace(/"/g, '\\"')}"]`);
      } else {
        fail(`${at}.when.props.${pname}`, `${pname} is a ${q(p.type)} prop, which styles cannot see.`); condOk = false;
      }
    }

    const ruleStates = arr(when.states);
    for (const sname of ruleStates) {
      const s = states[sname];
      if (!isObj(s) || !has(parts, s.on)) { fail(`${at}.when.states`, `the rule names the state ${q(sname)}, which the spec does not have or which is on no part.`); condOk = false; continue; }
      add(s.on, s.selector);
    }
    // Precedence: a state rule never shows while a stronger state on the same part holds.
    for (const sname of ruleStates) {
      const s = obj(states[sname]);
      const idx = precedence.indexOf(sname);
      if (idx < 0) continue;
      for (const stronger of precedence.slice(0, idx)) {
        const t = obj(states[stronger]);
        if (t.on === s.on && !ruleStates.includes(stronger) && str(t.selector)) add(s.on, `:not(${t.selector})`);
      }
    }

    let media = null;
    if (when.media !== undefined) {
      media = MEDIA[when.media] || null;
      if (!media) { fail(`${at}.when.media`, `${q(when.media)} is not one of ${Object.keys(MEDIA).join(', ')}.`); condOk = false; }
    }
    if (!Object.keys(ruleParts).length) fail(`${at}.parts`, 'the rule styles no part.');

    for (const [styled, declsRaw] of Object.entries(ruleParts)) {
      const where = `${at} (${styled})`;
      if (!has(parts, styled)) { fail(where, `${q(styled)} is not a part.`); continue; }
      if (nothing(styled)) { fail(where, `${styled} has element null: it renders no element, so it takes no style. Style the part it wraps.`); continue; }
      const kind = obj(parts[styled]).kind;
      const allowed = KIND_ALLOWS[kind];
      const mainDecls = [];
      const pseudoDecls = {}; // pseudo-element -> declarations, for declarations such as placeholderColor
      for (const [property, value] of Object.entries(obj(declsRaw))) {
        const w = `${at} (${styled}.${property})`;
        const def = DECLARATIONS[property];
        if (!def) { fail(w, `${property} is not a declaration the schema allows.`); continue; }
        const decls = def.pseudo ? (pseudoDecls[def.pseudo] ??= []) : mainDecls;
        if (allowed && !allowed.includes(property)) {
          fail(w, kind === 'slot' ? `${styled} is a slot part and takes no declarations.` : `${styled} is a ${kind} part and takes only ${allowed.join(', ')}; it may not take ${property}.`);
          continue;
        }
        if (typeof value !== 'string' || !value) { fail(w, `the value ${q(value)} is not a token name or keyword.`); continue; }
        if (def.enum) {
          if (!def.enum.includes(value)) { fail(w, `${q(value)} is not one of ${def.enum.join(', ')}.`); continue; }
          decls.push([def.css[0], value]);
          continue;
        }
        if (['none', 'transparent', 'current', 'inherit', 'full'].includes(value)) {
          if (!has(def.keywords, value)) { fail(w, `the keyword ${q(value)} makes no sense for ${property}; it takes ${Object.keys(def.keywords).join(', ')} or a token.`); continue; }
          for (const [p, v] of def.before || []) decls.push([p, v]);
          for (const p of def.css) decls.push([p, def.keywords[value]]);
          for (const [p, v] of def.also || []) decls.push([p, v]);
          continue;
        }
        if (!def.collection) { fail(w, `${property} has no token collection yet, so ${q(value)} is not a token; use one of ${Object.keys(def.keywords).join(', ')}.`); continue; }
        // Resolve the token or tokens.
        let names;
        if (def.typeRole) {
          const g = weightGroup(value);
          if (!g) { fail(w, `${q(value)} is not a type role (heading-*, label-*, body-* or section-label-base).`); continue; }
          names = [`font-size/${value}`, `line-height/${value}`, `font-weight/${g}`];
        } else names = def.css.map(() => (def.prefix || '') + value);
        const found = names.map((n) => findToken(ctx, def.collection, n));
        const missing = names.filter((n, k) => !found[k]);
        if (missing.length) { fail(w, `${[...new Set(missing)].map(q).join(', ')} is not a token in the ${def.collection} collection (looked in the Figma snapshot, ds-tokens/proposed/tokens.json and ds-tokens/dist/tokens.json).`); continue; }
        for (const [p, v] of def.before || []) decls.push([p, v]);
        def.css.forEach((p, k) => decls.push([p, `var(${found[k].cssVar})`]));
        for (const [p, v] of def.also || []) decls.push([p, v]);
        for (const t of found) {
          const key = `${t.collection}:${t.name}`;
          if (!usage.has(key)) usage.set(key, { token: t.name, collection: t.collection, cssVar: t.cssVar, origin: t.origin, rules: new Set() });
          usage.get(key).rules.add(i);
        }
      }
      // outline-style follows outlineWidth, written last so it wins over the solid that outlineColor adds: none for a
      // width of none (a width of 0 alone leaves Chromium's automatic focus ring, outline-style auto, painted), solid
      // for a width token, inherit for inherit.
      const ow = obj(declsRaw).outlineWidth;
      if (typeof ow === 'string' && mainDecls.some(([p]) => p === 'outline-width')) {
        const style = ow === 'none' ? 'none' : ow === 'inherit' ? 'inherit' : 'solid';
        for (let k = mainDecls.length - 1; k >= 0; k--) if (mainDecls[k][0] === 'outline-style') mainDecls.splice(k, 1);
        mainDecls.push(['outline-style', style]);
      }
      if (!condOk) continue;
      // The selector: other parts' compounds as ancestors, then the styled part's compound.
      const others = partNames.filter((p) => p !== styled && pieces.has(p));
      if (others.length && styled === rootPart) {
        fail(where, `the rule styles the root but depends on ${others.join(', ')}, a part inside it; a descendant selector cannot express that.`);
        continue;
      }
      // Flat specificity: every condition, exclusion and ancestor sits inside :where(), so each rule for a part
      // weighs exactly what the part selector alone weighs (0,1,0) and the rules are read in spec order, like a
      // stylesheet. A later rule wins where two set the same property; nothing wins by being more specific.
      const own = (p) => (pieces.get(p) || []).join('');
      const compound = (p) => slotSel(p) + (own(p) ? `:where(${own(p)})` : '');
      const ancestor = (p) => `:where(${slotSel(p)}${own(p)})`;
      const selector = [...others.map(ancestor), compound(styled)].join(' ');
      if (mainDecls.length) out.push({ index: i, part: styled, media, selector, decls: mainDecls, why: str(obj(rule).why) });
      for (const pseudo of Object.keys(pseudoDecls).sort()) {
        out.push({ index: i, part: styled, media, selector: selector + pseudo, decls: pseudoDecls[pseudo], why: str(obj(rule).why) });
      }
    }
  });
  if (!arr(spec.styles).length) fail('styles', 'the spec has no style rules.');
  return { errors, rules: out, usage };
}

export function renderCss(spec, file, rules) {
  const lines = [`/* Generated by ${GENERATOR} from ds-components/specs/${file}. Do not edit; change the spec and rebuild. */`, '', '@layer ds.components {'];
  let last = -1;
  for (const r of rules) {
    if (r.index !== last) {
      lines.push('', `  /* styles[${r.index}]${r.why ? ': ' + r.why.replace(/\*\//g, '* /') : ''} */`);
      last = r.index;
    }
    const pad = r.media ? '    ' : '  ';
    if (r.media) lines.push(`  @media ${r.media} {`);
    lines.push(`${pad}${r.selector} {`);
    for (const [p, v] of r.decls) lines.push(`${pad}  ${p}: ${v};`);
    lines.push(`${pad}}`);
    if (r.media) lines.push('  }');
  }
  lines.push('}', '');
  return lines.join('\n');
}

// ---------- one spec: the typed contract ----------
export function renderContract(spec, file) {
  const name = spec.name;
  const NAME = screaming(name);
  const parts = obj(spec.anatomy);
  const partNames = Object.keys(parts);
  const props = Object.entries(obj(spec.props));
  const lines = [`// Generated by ${GENERATOR} from ds-components/specs/${file}. Do not edit; change the spec and rebuild.`];
  lines.push(`// The typed surface of ${name}. Every renderer imports these names; none defines its own.`);
  const needsReact = props.some(([, p]) => p.type === 'node');
  if (needsReact) lines.push("import type * as React from 'react';");
  lines.push('');
  const compound = isCompound(spec);
  // A dotted key's union is named after its exported part and prop: list.behavior -> TabsListBehavior.
  const unionName = (pname) => name + pascal(pname);
  for (const [pname, p] of props) {
    if (p.type !== 'enum') continue;
    lines.push(`/** ${doc(p.description)} */`);
    lines.push(`export type ${unionName(pname)} = ${arr(p.values).map(tsString).join(' | ')};`);
  }
  const tsType = (pname, p) => ({ enum: unionName(pname), boolean: 'boolean', string: 'string', number: 'number', node: 'React.ReactNode', handler: '(...args: never[]) => void' }[p.type] || 'unknown');

  // The split: one group per exported component. Single-piece: one group, <Name>Props, holding every prop.
  // Compound: <Name>Props for the plain keys, then <Name><Part>Props per dotted prefix, in anatomy order.
  const groups = new Map(); // exported part key ('' for the root component) -> [[key, prop]]
  const groupOf = (key) => (compound ? splitKey(key).part ?? '' : '');
  for (const [pname, p] of props) { const g = groupOf(pname); if (!groups.has(g)) groups.set(g, []); groups.get(g).push([pname, p]); }
  const order = ['', ...partNames].filter((g) => groups.has(g));
  const component = (g) => (g ? `${name}${pascal(g)}` : name);
  for (const g of order) {
    const head = !compound
      ? `/** Props of ${name}: every prop, whichever part it lands on (named in each comment). */`
      : g ? `/** Props of ${component(g)}, the ${g} part (data-slot="${str(obj(parts[g]).slot)}"). Keyed ${g}.<prop> in the spec. */`
        : `/** Props of ${name}, the root part${partNames[0] ? ` (${partNames[0]})` : ''}: the plain keys of the spec. */`;
    lines.push('', head, `export interface ${component(g)}Props {`);
    for (const [pname, p] of groups.get(g)) {
      const local = compound ? splitKey(pname).name : pname;
      const lands = !compound && p.on !== partNames[0] ? ` On the ${p.on} part.` : '';
      lines.push(`  /** ${doc(p.description)}${lands}${p.default === null ? ' Unset unless given.' : ''} */`);
      lines.push(`  ${tsKey(local)}${p.required === true ? '' : '?'}: ${tsType(pname, p)};`);
    }
    lines.push('}');
  }
  // DEFAULTS and REFLECTS follow the same split: grouped by exported component, looked up by the spec's own key
  // (dotted in a compound spec). A default of null means unset unless given, so it is listed in a comment only.
  const lit = (v) => (typeof v === 'string' ? tsString(v) : JSON.stringify(v));
  const grouped = (pick) => {
    const out = [];
    for (const g of order) {
      const rows = groups.get(g).filter(([, p]) => pick(p));
      if (!rows.length) continue;
      if (compound) out.push(`  // ${component(g)}`);
      out.push(...rows.map((r) => r));
    }
    return out;
  };
  lines.push('', `/** Every prop that has a default, with that default. Keyed as in the spec. */`, `export const ${NAME}_DEFAULTS = {`);
  for (const r of grouped((p) => has(p, 'default') && p.default !== null)) lines.push(typeof r === 'string' ? r : `  ${tsKey(r[0])}: ${lit(r[1].default)},`);
  const unset = props.filter(([, p]) => p.default === null).map(([k]) => k);
  if (unset.length) lines.push(`  // Unset unless given (default null): ${unset.join(', ')}.`);
  lines.push('} as const;');
  lines.push('', `/** Each part's data-slot value. A part that renders nothing has a name here but no element carries it. */`, `export const ${NAME}_SLOTS = {`);
  for (const part of partNames) lines.push(`  ${tsKey(part)}: ${tsString(str(obj(parts[part]).slot))},${rendersNothing(parts[part]) ? ' // renders nothing: element is null, so set no data-slot for it' : ''}`);
  lines.push('} as const;');
  lines.push('', `/** Each state: the part it is on and the selector that matches it there. */`, `export const ${NAME}_STATES = {`);
  for (const [sname, s] of Object.entries(obj(spec.states))) lines.push(`  ${tsKey(sname)}: { on: ${tsString(str(s.on))}, selector: ${tsString(str(s.selector))} },`);
  lines.push('} as const;');
  lines.push('', `/** Each prop that styles can see, and the attribute it sets on its part. Keyed as in the spec. */`, `export const ${NAME}_REFLECTS = {`);
  for (const r of grouped((p) => typeof p.reflects === 'string' && p.reflects)) lines.push(typeof r === 'string' ? r : `  ${tsKey(r[0])}: ${tsString(r[1].reflects)},`);
  lines.push('} as const;', '');
  return lines.join('\n');
}

// ---------- one spec: the reference page ----------
export function renderDoc(spec, file, compiled) {
  const parts = obj(spec.anatomy);
  const states = obj(spec.states);
  const L = [];
  L.push(`<!-- Generated by ${GENERATOR} from ds-components/specs/${file}. Do not edit; change the spec and rebuild. -->`);
  L.push(`# ${spec.name}`, '');
  L.push(`Generated from the spec. This page is a reference to the contract, not usage guidance.`, '');
  L.push(`${str(spec.summary)}`, '');
  const fig = obj(spec.figma);
  L.push(`Stage: **${spec.stage}**. Figma: ${fig.component ? code(fig.component) : 'none'}${fig.confirmed === false ? ' (mapping not yet confirmed against the Components file)' : ''}. Behaviour: ${obj(spec.primitive).package ? code(obj(spec.primitive).package) : 'plain HTML'}.`, '');
  const compound = isCompound(spec);
  L.push(compound
    ? `A compound component: each part with an element is exported as its own component (${spec.name}${'<Part>'}), and a prop keyed \`part.prop\` is a prop of that part's component. Parts whose element is null render nothing of their own.`
    : `A single-piece component: one exported component, ${spec.name}, takes every prop.`, '');
  L.push('## Anatomy', '', '| Part | data-slot | Element | Kind | Role | Wraps | Description |', '|---|---|---|---|---|---|---|');
  for (const [p, d] of Object.entries(parts)) {
    const el = rendersNothing(d) ? 'none (renders nothing)' : code(d.element);
    L.push(`| ${p}${d.required === false ? ' (optional)' : ''} | ${code(d.slot)} | ${el} | ${cell(d.kind)} | ${d.role ?? ''} | ${d.primitivePart ? code(d.primitivePart) : ''} | ${cell(d.description)} |`);
  }
  L.push('', '## Props', '', '| Prop | Taken by | Lands on part | Type or values | Default | Reflects | In Figma | Description |', '|---|---|---|---|---|---|---|---|');
  for (const [n, p] of Object.entries(obj(spec.props))) {
    const type = p.type === 'enum' ? arr(p.values).map(code).join(' ') : p.type;
    const def = p.default === null ? 'unset unless given' : has(p, 'default') ? code(JSON.stringify(p.default)) : p.required ? 'required' : '';
    const taker = compound ? `${componentOf(spec, n)} ${code(splitKey(n).name)}` : spec.name;
    L.push(`| ${code(n)} | ${taker} | ${p.on} | ${type} | ${def} | ${p.reflects ? code(p.reflects) : ''} | ${p.figmaProperty ? code(p.figmaProperty) : 'code only'} | ${cell(p.description)} |`);
  }
  L.push('', '## State map', '', `Strongest first: ${arr(spec.precedence).join(', ') || 'no precedence given'}.`, '', '| State | Part | Selector | Set by | Figma | Test reaches it by | Description |', '|---|---|---|---|---|---|---|');
  for (const [n, s] of Object.entries(states)) L.push(`| ${n} | ${s.on} | ${code(s.selector)} | ${s.source} | ${s.figma ? code(`${s.figma.property}=${s.figma.value}`) : ''} | ${cell(s.reach)} | ${cell(s.description)} |`);
  const used = [...compiled.usage.values()];
  for (const [origin, title] of [['figma', 'Tokens from Figma'], ['proposed', 'Tokens proposed in the repo']]) {
    const list = used.filter((u) => u.origin === origin);
    L.push('', `## ${title}`, '');
    if (!list.length) { L.push('None.'); continue; }
    // One row per token: its collection, its CSS name and the style entries that use it.
    L.push('| Collection | Token | CSS name | Style entries using it |', '|---|---|---|---|');
    const sorted = list.slice().sort((x, y) => (x.collection < y.collection ? -1 : x.collection > y.collection ? 1 : x.token < y.token ? -1 : x.token > y.token ? 1 : 0));
    for (const u of sorted) L.push(`| ${u.collection} | ${code(u.token)} | ${code(u.cssVar)} | ${[...u.rules].sort((a, b) => a - b).map((i) => `styles[${i}]`).join(', ')} |`);
  }
  const a11y = obj(spec.accessibility);
  L.push('', '## Keyboard', '', `Pattern: ${a11y.reference ? `[${a11y.pattern}](${a11y.reference})` : str(a11y.pattern)}. Name: ${cell(obj(a11y.name).from)}`, '');
  const keys = arr(a11y.keyboard);
  if (keys.length) {
    L.push('| Key | Part | Does | Test |', '|---|---|---|---|');
    for (const k of keys) L.push(`| ${cell(k.key)} | ${k.on} | ${cell(k.does)} | ${k.test ? code(k.test) : 'browser'} |`);
  } else L.push('No keys.');
  L.push('', '## Requirements', '', 'Grouped MUST, then SHOULD, then COULD. A check starting manual: is not proven by a machine.', '', '| Level | Id | Requirement | Checked by | WCAG |', '|---|---|---|---|---|');
  for (const level of ['MUST', 'SHOULD', 'COULD']) {
    for (const r of arr(spec.requirements).filter((x) => x.level === level)) {
      L.push(`| ${level} | ${code(r.id)} | ${cell(r.text)}${r.label ? ` (${r.label})` : ''} | ${code(r.check)} | ${r.wcag ?? ''} |`);
    }
  }
  L.push('', '## Content rules', '');
  const content = arr(spec.content);
  if (content.length) for (const c of content) L.push(`- ${c}`); else L.push('None given.');
  L.push('', '## Examples', '', '| Id | Title | Props | Content | Note |', '|---|---|---|---|---|');
  for (const e of arr(spec.examples)) {
    const content = e.content === undefined || e.content === null ? '' : typeof e.content === 'string' ? cell(e.content) : code(JSON.stringify(e.content));
    L.push(`| ${code(e.id)} | ${cell(e.title)} | ${Object.keys(obj(e.props)).length ? code(JSON.stringify(e.props)) : ''} | ${content} | ${cell(e.note)} |`);
  }
  L.push('', '## Style rules', '', 'Every rule of the spec, in order. The generated stylesheet keeps this order and gives every rule for a part the same specificity, so a later rule wins where two set the same property.', '', '| Rule | When | Parts and declarations | Why |', '|---|---|---|---|');
  arr(spec.styles).forEach((r, i) => {
    const w = obj(r.when);
    const when = [Object.keys(obj(w.props)).length ? `props ${JSON.stringify(w.props)}` : '', arr(w.states).length ? `states ${arr(w.states).join(', ')}` : '', w.media ? `media ${w.media}` : ''].filter(Boolean).join('; ') || 'always';
    const decls = Object.entries(obj(r.parts)).map(([p, d]) => `${p}: ${Object.entries(obj(d)).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('<br>');
    L.push(`| styles[${i}] | ${cell(when)} | ${cell(decls)} | ${cell(r.why)} |`);
  });
  L.push('', '## What the spec does not carry', '');
  for (const n of arr(spec.notCarried)) L.push(`- ${n}`);
  L.push('');
  return L.join('\n');
}

// ---------- the whole build, pure: returns every file as path -> content ----------
export function buildAll(entries, ctx) {
  const files = new Map();
  const results = [];
  for (const e of entries) {
    const res = { file: e.file, slug: null, ok: false, errors: [], stats: null };
    results.push(res);
    try {
      if (e.spec === undefined) { res.errors.push(`${e.file}: ${e.error}`); continue; }
      const spec = e.spec;
      if (!isObj(spec)) { res.errors.push(`${e.file}: the file does not hold a JSON object.`); continue; }
      if (!ctx.validate(spec)) {
        for (const err of ctx.validate.errors) {
          const extra = err.params?.additionalProperty ? ` (${q(err.params.additionalProperty)})` : err.params?.allowedValues ? ` (${err.params.allowedValues.join(', ')})` : '';
          res.errors.push(`${e.file}: ${err.instancePath || '(root)'}: does not match the schema: ${err.message}${extra}.`);
        }
        continue; // nothing below is safe on a spec the schema rejects
      }
      if (`${spec.slug}.spec.json` !== e.file) res.errors.push(`${e.file}: slug: the slug ${q(spec.slug)} does not match the file name.`);
      for (const [n, p] of Object.entries(spec.props)) {
        if (!has(spec.anatomy, p.on)) res.errors.push(`${e.file}: props.${n}.on: ${q(p.on)} is not a part.`);
        const { part, name: local } = splitKey(n);
        if (part !== null) {
          if (!has(spec.anatomy, part)) res.errors.push(`${e.file}: props.${n}: the key names the part ${q(part)} before the dot, which is not a part; a key part.prop belongs to that part's exported component.`);
          else if (part === Object.keys(spec.anatomy)[0]) res.errors.push(`${e.file}: props.${n}: ${part} is the root part, whose props are plain keys; write ${q(local)}.`);
          if (!IDENT.test(local)) res.errors.push(`${e.file}: props.${n}: ${q(local)}, the name after the dot, is not a valid prop name.`);
        }
      }
      const compiled = compileStyles(spec, e.file, ctx);
      res.errors.push(...compiled.errors);
      if (res.errors.length) continue;
      const slug = spec.slug;
      res.slug = slug;
      files.set(`ds-components/src/${slug}/${slug}.css`, renderCss(spec, e.file, compiled.rules));
      files.set(`ds-components/src/${slug}/${slug}.contract.ts`, renderContract(spec, e.file));
      files.set(`ds-components/docs/${slug}.md`, renderDoc(spec, e.file, compiled));
      res.ok = true;
      res.spec = spec;
      res.usage = compiled.usage;
      res.stats = { styles: spec.styles.length, cssRules: compiled.rules.length, props: Object.keys(spec.props).length, parts: Object.keys(spec.anatomy).length, states: Object.keys(spec.states).length };
    } catch (err) {
      res.ok = false;
      res.errors.push(`${e.file}: the generator could not read this spec (${err.message}).`);
    }
  }
  const built = results.filter((r) => r.ok);
  files.set('ds-components/docs/state-map.md', renderStateMap(built));
  files.set('ds-components/src/styles.css', renderStylesIndex(built, ctx.extensionExists || ((slug) => existsSync(join(ROOT, 'ds-components', 'src', slug, `${slug}.extensions.css`)))));
  files.set('ds-components/generated/tokens-used.json', renderTokensUsed(built, ctx));
  files.set('ds-components/src/index.ts', renderIndex((ctx.componentSources || readComponentSources)(), files));
  return { files, results };
}

// Every component folder that holds its hand-written <slug>.tsx, sorted by slug, with that file's text and the
// contract on disk. Injected through ctx.componentSources by the self-test and by the component lint.
export function readComponentSources(srcDir = join(ROOT, 'ds-components', 'src')) {
  if (!existsSync(srcDir)) return [];
  const out = [];
  for (const slug of readdirSync(srcDir).sort()) {
    const tsx = join(srcDir, slug, `${slug}.tsx`);
    if (!existsSync(tsx)) continue;
    const contract = join(srcDir, slug, `${slug}.contract.ts`);
    out.push({ slug, tsx: readFileSync(tsx, 'utf8'), contract: existsSync(contract) ? readFileSync(contract, 'utf8') : null });
  }
  return out;
}

// The names a module exports at its top level, each marked as a type or a value. Parsed with the typescript package.
function exportedNames(text, fileName) {
  const ts = require('typescript');
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const names = new Map(); // name -> 'type' | 'value'
  const exported = (st) => (ts.getModifiers?.(st) ?? st.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) names.set(el.name.text, st.isTypeOnly || el.isTypeOnly ? 'type' : 'value');
      continue;
    }
    if (!exported(st)) continue;
    if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) names.set(st.name.text, 'type');
    else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) { if (st.name) names.set(st.name.text, 'value'); }
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.set(d.name.text, 'value');
  }
  return names;
}

// ds-components/src/index.ts, generated from the folders: for each component with a <slug>.tsx, everything it
// exports and every type its contract exports. Where both export a name (Button's own ButtonProps and the
// contract's), the two star exports would be ambiguous and tsc fails (TS2308), so the component's export is
// named explicitly and wins. The contract's constants are exported as types only; import them from the contract.
function renderIndex(sources, files) {
  const L = [
    `// Generated by ${GENERATOR} from the folders in ds-components/src/. Do not edit; add ds-components/src/<slug>/<slug>.tsx and rebuild.`,
    '// The public entry of the Souvenir React components: per component, everything <slug>.tsx exports and every type',
    '// its generated contract exports. Styles are not imported here; a host loads ds-tokens/dist/tokens.css and',
    '// ds-components/src/styles.css once.',
  ];
  for (const s of sources) {
    const contract = files.get(`ds-components/src/${s.slug}/${s.slug}.contract.ts`) ?? s.contract;
    L.push('', `export * from './${s.slug}/${s.slug}';`, `export type * from './${s.slug}/${s.slug}.contract';`);
    if (!contract) continue;
    const own = exportedNames(s.tsx, `${s.slug}.tsx`);
    const theirs = exportedNames(contract, `${s.slug}.contract.ts`);
    const clash = [...own.keys()].filter((n) => theirs.has(n)).sort();
    const types = clash.filter((n) => own.get(n) === 'type');
    const values = clash.filter((n) => own.get(n) === 'value');
    if (types.length) L.push(`export type { ${types.join(', ')} } from './${s.slug}/${s.slug}'; // the component's own, over the contract's`);
    if (values.length) L.push(`export { ${values.join(', ')} } from './${s.slug}/${s.slug}'; // the component's own, over the contract's`);
  }
  L.push('');
  return L.join('\n');
}

function renderStateMap(built) {
  const L = [`<!-- Generated by ${GENERATOR} from ds-components/specs/*.spec.json. Do not edit; change the specs and rebuild. -->`, '# State map', ''];
  L.push('Every state of every built component: the part it is on, the selector that matches it in code, who sets it and the Figma value that draws it. Generated from the specs; a reference, not usage guidance.', '');
  L.push('| Component | State | Part | Selector | Set by | Figma value |', '|---|---|---|---|---|---|');
  for (const r of built) {
    for (const [n, s] of Object.entries(r.spec.states)) {
      L.push(`| ${r.spec.name} | ${n} | ${s.on} | ${code(s.selector)} | ${s.source} | ${s.figma ? code(`${s.figma.property}=${s.figma.value}`) : ''} |`);
    }
  }
  L.push('');
  return L.join('\n');
}

function renderStylesIndex(built, extensionExists) {
  const L = [`/* Generated by ${GENERATOR}. Do not edit. Component styles in layer order; each <slug>.extensions.css is hand-written layout the spec cannot carry. */`, '@layer ds.tokens, ds.components, ds.extensions;', ''];
  for (const r of built) {
    L.push(`@import "./${r.slug}/${r.slug}.css";`);
    if (extensionExists(r.slug)) L.push(`@import "./${r.slug}/${r.slug}.extensions.css";`);
  }
  L.push('');
  return L.join('\n');
}

function renderTokensUsed(built, ctx) {
  const components = {};
  const usedKeys = new Set();
  for (const r of built) {
    components[r.slug] = [...r.usage.values()].map((u) => {
      usedKeys.add(`${u.collection}:${u.token}`);
      return { token: u.token, collection: u.collection, cssVar: u.cssVar, origin: u.origin === 'figma' ? 'figma' : 'proposed', rules: u.rules.size };
    });
  }
  const unusedFigmaColours = ctx.figmaColours.filter((c) => !usedKeys.has(`${c.collection}:${c.name}`)).map((c) => ({ token: c.name, collection: c.collection, cssVar: c.cssVar }));
  return JSON.stringify({
    $comment: `Generated by ${GENERATOR} from ds-components/specs/*.spec.json. Do not edit. "rules" counts the style entries of a spec that use the token.`,
    components,
    unusedFigmaColours: { count: unusedFigmaColours.length, tokens: unusedFigmaColours },
  }, null, 2) + '\n';
}

// ---------- reading and writing ----------
function readEntries(slugs) {
  const files = existsSync(SPEC_DIR) ? readdirSync(SPEC_DIR).filter((f) => f.endsWith('.spec.json')).sort() : [];
  const chosen = slugs.length ? files.filter((f) => slugs.includes(f.replace(/\.spec\.json$/, ''))) : files;
  for (const s of slugs) if (!files.includes(`${s}.spec.json`)) console.log(`No spec named ${s}.spec.json in ds-components/specs/.`);
  return chosen.map((f) => {
    const entry = { file: f };
    try { entry.spec = JSON.parse(readFileSync(join(SPEC_DIR, f), 'utf8')); } catch (err) { entry.error = `the file is not readable JSON: ${err.message}`; }
    return entry;
  });
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();
  const ctx = loadContext();
  const slugs = argv.filter((a) => !a.startsWith('--'));
  // Every spec is always built, so the shared files (styles.css, index.ts, state-map.md, tokens-used.json) never
  // lose another component; naming slugs only limits which component's own files are written and reported.
  readEntries(slugs); // reports a slug with no spec
  const { files, results: all } = buildAll(readEntries([]), ctx);
  const named = (slug) => !slugs.length || slugs.includes(slug);
  const own = (rel) => { const m = rel.match(/^ds-components\/(?:src\/([^/]+)\/\1\.(?:css|contract\.ts)|docs\/([^/]+)\.md)$/); return m && (m[1] ?? (m[2] === 'state-map' ? null : m[2])); };
  let written = 0;
  for (const [rel, content] of files) {
    const slug = own(rel);
    if (slug && !named(slug)) continue;
    mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
    writeFileSync(join(ROOT, rel), content);
    written++;
  }
  const results = all.filter((r) => named(r.file.replace(/\.spec\.json$/, '')));
  for (const r of all) if (!named(r.file.replace(/\.spec\.json$/, '')) && !r.ok) console.log(`${r.file}: not built (not named here), so the shared files leave it out.`);
  for (const r of results) {
    if (r.ok) console.log(`${r.file}: built. ${r.stats.styles} style entries written as ${r.stats.cssRules} CSS rules; ${r.stats.props} props, ${r.stats.parts} parts and ${r.stats.states} states in the contract and the docs page.`);
    else {
      console.log(`${r.file}: NOT built, ${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}:`);
      for (const e of r.errors) console.log(`  ${e}`);
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length} specs read, ${results.length - failed} built, ${failed} not built; ${written} files written.`);
  return failed ? 1 : 0;
}

// ---------- self-test: plant known faults in copies of the Button spec ----------
function selfTest() {
  const ctx = { ...loadContext(), extensionExists: () => false, componentSources: () => [] };
  const base = JSON.parse(readFileSync(join(SPEC_DIR, 'button.spec.json'), 'utf8'));
  const clone = () => JSON.parse(JSON.stringify(base));
  const build = (spec) => buildAll([{ file: 'button.spec.json', spec }], ctx);
  const checks = [];
  const check = (name, ok, detail) => { checks.push(ok); console.log(`${ok ? 'caught' : 'MISSED'}: ${name}${ok ? '' : ' (' + detail + ')'}`); };
  const errorsOf = (spec) => build(spec).results[0].errors;
  const cssOf = (spec) => build(spec).files.get('ds-components/src/button/button.css') || '';

  // 0. The real spec builds.
  const clean = build(clone());
  check('the unchanged Button spec builds', clean.results[0].ok, clean.results[0].errors.join('; '));

  // 1. A rule with an unknown token fails, naming the spec and the rule.
  let s = clone(); s.styles[1].parts.root.background = 'interactive/secondary/hoverr';
  let errs = errorsOf(s);
  check('an unknown token fails, naming spec and rule', errs.some((e) => e.startsWith('button.spec.json: styles[1] (root.background)') && e.includes('interactive/secondary/hoverr')), errs.join('; ') || 'no error');

  // 2. A text part given a background fails.
  s = clone(); s.styles[0].parts.label = { background: 'surface/primary/default' };
  errs = errorsOf(s);
  check('a text part given a background fails', errs.some((e) => e.startsWith('button.spec.json: styles[0] (label.background)') && e.includes('text part')), errs.join('; ') || 'no error');

  // 3. The hover rule excludes the stronger states on the same part, disabled first, inside :where().
  const css = clean.files.get('ds-components/src/button/button.css') || '';
  const hoverSel = '[data-slot~="button"]:where(:hover:not(:is(:disabled, [data-disabled])):not([data-loading]):not(:active)) {';
  const primaryHover = '[data-slot~="button"]:where([data-variant="primary"]:hover:not(:is(:disabled, [data-disabled])):not([data-loading]):not(:active)) {\n    background-color: var(--color-interactive-primary-hover);';
  check('the hover rule excludes the disabled selector', css.includes(hoverSel) && css.includes(primaryHover), 'selector not found');

  // 4. A boolean condition of false gives :not().
  s = clone(); s.styles.push({ when: { props: { fullWidth: false } }, parts: { root: { width: 'size/control/md' } } });
  check('a boolean false condition produces :not()', cssOf(s).includes('[data-slot~="button"]:where(:not([data-full-width])) {\n    inline-size: var(--size-control-md);'), 'selector not found');

  // Flat specificity: with every :where(...) group removed, each selector is the bare part selector (plus a
  // pseudo-element), so every rule for a part weighs (0,1,0) and source order alone decides.
  const selectorsOf = (text) => [...text.matchAll(/^[ \t]*([^\s{}@/][^\n{}]*?) \{$/gm)].map((m) => m[1]);
  const stripWhere = (sel) => {
    let out = '', i = 0;
    while (i < sel.length) {
      if (sel.startsWith(':where(', i)) { let depth = 0, j = i + 6; for (; j < sel.length; j++) { if (sel[j] === '(') depth++; else if (sel[j] === ')' && --depth === 0) break; } i = j + 1; continue; }
      out += sel[i++];
    }
    return out.trim();
  };
  const flat = (text) => selectorsOf(text).filter((sel) => !/^\[data-slot~="[a-z-]+"\](::[a-z-]+)?$/.test(stripWhere(sel)));
  const notFlat = flat(css);
  check('every Button selector has the specificity of its part selector alone', selectorsOf(css).length > 40 && notFlat.length === 0, `${selectorsOf(css).length} selectors; not flat: ${notFlat.slice(0, 3).join(' | ')}`);
  // Disabled beats hover (hover excludes it and comes first); ghost-disabled beats disabled (later, same weight).
  const at = (needle) => css.indexOf(needle);
  const disabledAt = at('[data-slot~="button"]:where(:is(:disabled, [data-disabled])) {');
  const ghostDisabledAt = at('[data-slot~="button"]:where([data-variant="ghost"]:is(:disabled, [data-disabled])) {');
  check('disabled comes after hover and ghost-disabled after disabled, at equal weight', at(hoverSel) > 0 && disabledAt > at(hoverSel) && ghostDisabledAt > disabledAt, `hover ${at(hoverSel)}, disabled ${disabledAt}, ghost disabled ${ghostDisabledAt}`);
  // A size rule after a variant rule that sets the same property wins by order alone: both selectors weigh the same.
  s = clone();
  s.styles.push({ when: { props: { variant: 'primary' } }, parts: { root: { minHeight: 'control/sm' } } });
  s.styles.push({ when: { props: { size: 'lg' } }, parts: { root: { minHeight: 'control/lg' } } });
  const orderCss = cssOf(s);
  const vAt = orderCss.indexOf(`/* styles[${s.styles.length - 2}] */\n  [data-slot~="button"]:where([data-variant="primary"]) {\n    min-block-size: var(--size-control-sm);`);
  const zAt = orderCss.indexOf(`/* styles[${s.styles.length - 1}] */\n  [data-slot~="button"]:where([data-size="lg"]) {\n    min-block-size: var(--size-control-lg);`);
  check('a size rule written after a variant rule on the same property comes later at the same weight', vAt > 0 && zAt > vAt && flat(orderCss).length === 0, `variant at ${vAt}, size at ${zAt}`);
  // An ancestor part's conditions are wrapped too: the descendant rule still weighs only its own part selector.
  s = clone(); s.styles.push({ when: { props: { variant: 'ghost' }, states: ['hover'] }, parts: { label: { color: 'text/primary' } } });
  const descCss = cssOf(s);
  check('an ancestor compound is wrapped in :where()', descCss.includes(':where([data-slot~="button"][data-variant="ghost"]:hover:not(:is(:disabled, [data-disabled])):not([data-loading]):not(:active)) [data-slot~="button-label"] {') && flat(descCss).length === 0, 'descendant selector not found');

  // 5. Two runs are identical, every file included.
  const a = build(clone()).files; const b = build(clone()).files;
  const same = a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
  check('two runs are byte-identical', same, 'outputs differ');

  // Further faults the build must catch.
  s = clone(); s.styles[0].parts.root.background = 'full';
  errs = errorsOf(s);
  check('a keyword where it makes no sense fails', errs.some((e) => e.includes('styles[0] (root.background)') && e.includes('keyword "full"')), errs.join('; ') || 'no error');
  s = clone(); s.styles.push({ when: { props: { asChild: true } }, parts: { root: { cursor: 'default' } } });
  errs = errorsOf(s);
  check('a condition on a prop that reflects nothing fails', errs.some((e) => e.includes(`styles[${s.styles.length - 1}].when.props.asChild`)), errs.join('; ') || 'no error');
  s = clone(); s.styles[0].parts.spinner.opacity = 'disabled/40';
  errs = errorsOf(s);
  check('a token for a property with no collection fails', errs.some((e) => e.includes('styles[0] (spinner.opacity)')), errs.join('; ') || 'no error');
  s = clone(); delete s.anatomy;
  const r = buildAll([{ file: 'button.spec.json', spec: s }, { file: 'broken.spec.json', error: 'the file is not readable JSON: test' }], ctx).results;
  check('an invalid spec is reported, not thrown', !r[0].ok && r[0].errors.some((e) => e.includes('schema')) && !r[1].ok, r.map((x) => x.errors.join('; ')).join(' / '));
  check('a prefixed Size token gets its CSS name by rule', css.includes('block-size: var(--size-control-md);') && !css.includes('--size-size-'), 'wrong Size name');
  check('reduced motion writes 0s and the transition properties', css.includes('@media (prefers-reduced-motion: reduce) {\n    [data-slot~="button"] {\n      transition-property: background-color, border-color, color, box-shadow, opacity;\n      transition-duration: 0s;'), 'block not found');
  s = clone(); s.styles[0].parts.root.placeholderColor = 'text/secondary';
  const placeholderCss = cssOf(s);
  check('placeholderColor is written on ::placeholder, not on the part', placeholderCss.includes('[data-slot~="button"]::placeholder {\n    color: var(--color-text-secondary);') && !/\[data-slot~="button"\] \{[^}]*--color-text-secondary/.test(placeholderCss), 'rule not found');

  // data-slot is a list of words: every part selector matches by the word ([data-slot~="..."]), none by the whole
  // attribute, so an element that is two parts at once ("button dropdown-menu-trigger") keeps both looks.
  const exactSlot = selectorsOf(css).filter((sel) => sel.includes('[data-slot="'));
  check('every part selector matches data-slot by the word, none by the whole attribute', selectorsOf(css).length > 40 && exactSlot.length === 0 && selectorsOf(css).every((sel) => sel.includes('[data-slot~="')), `exact: ${exactSlot.slice(0, 2).join(' | ')}`);

  // Outline: a width of none writes outline-style none (outline-width 0 alone leaves Chromium's automatic ring), a
  // width token writes outline-style solid, and outline-style comes last whatever order the spec lists the keys in.
  const outlineBlock = (text, needle) => { const at = text.indexOf(needle); if (at < 0) return ''; return text.slice(at, text.indexOf('}', at)); };
  const lastStyle = (block) => { const all = [...block.matchAll(/outline-style: ([a-z]+);/g)]; return all.length ? all[all.length - 1][1] : null; };
  const lastDecl = (block) => (block.trim().split('\n').filter((l) => l.includes(':')).pop() || '').trim();
  s = clone(); s.styles.push({ when: { props: { variant: 'ghost' } }, parts: { root: { outlineColor: 'border/focus', outlineWidth: 'none' } } });
  let ob = outlineBlock(cssOf(s), `/* styles[${s.styles.length - 1}] */`);
  check('outlineWidth none after outlineColor writes outline-style none last', lastStyle(ob) === 'none' && lastDecl(ob) === 'outline-style: none;' && ob.includes('outline-width: 0;'), ob || 'rule not found');
  s = clone(); s.styles.push({ when: { props: { variant: 'ghost' } }, parts: { root: { outlineWidth: 'none', outlineColor: 'border/focus' } } });
  ob = outlineBlock(cssOf(s), `/* styles[${s.styles.length - 1}] */`);
  check('outlineWidth none before outlineColor still ends with outline-style none', lastStyle(ob) === 'none' && lastDecl(ob) === 'outline-style: none;', ob || 'rule not found');
  s = clone(); s.styles.push({ when: { props: { variant: 'ghost' } }, parts: { root: { outlineWidth: 'focus/width' } } });
  ob = outlineBlock(cssOf(s), `/* styles[${s.styles.length - 1}] */`);
  check('an outlineWidth token writes outline-style solid', lastStyle(ob) === 'solid' && ob.includes('outline-width: var(--border-focus-width);'), ob || 'rule not found');
  s = clone(); s.styles.push({ when: { props: { variant: 'ghost' } }, parts: { root: { outlineOffset: 'focus/offset' } } });
  ob = outlineBlock(cssOf(s), `/* styles[${s.styles.length - 1}] */`);
  check('a rule with no outlineWidth writes no outline-style', ob.includes('outline-offset') && lastStyle(ob) === null, ob || 'rule not found');

  // Single-piece (no dotted key): every prop is in ButtonProps, whichever part it lands on.
  const contractOf = (spec) => build(spec).files.get('ds-components/src/button/button.contract.ts') || '';
  const single = clean.files.get('ds-components/src/button/button.contract.ts') || '';
  const buttonProps = (single.match(/export interface ButtonProps \{[\s\S]*?\n\}/) || [''])[0];
  check('a single-piece spec puts every prop in <Name>Props', /\n {2}iconStart\?: React\.ReactNode;/.test(buttonProps) && /\n {2}children\?: React\.ReactNode;/.test(buttonProps) && !/interface Button[A-Z]\w*Props/.test(single), 'per-part interfaces found or props missing');

  // Dotted keys: label.tone becomes tone in ButtonLabelProps, with the union ButtonLabelTone; plain keys stay in
  // ButtonProps; DEFAULTS and REFLECTS keep the dotted key.
  s = clone();
  s.props['label.tone'] = { on: 'label', type: 'enum', values: ['plain', 'muted'], default: 'plain', reflects: 'data-tone', figmaProperty: null, description: 'Planted.' };
  s.props['label.hint'] = { on: 'label', type: 'string', required: true, default: null, figmaProperty: null, description: 'Planted, unset unless given.' };
  let res = build(s).results[0];
  const dotted = contractOf(s);
  const labelIface = (dotted.match(/export interface ButtonLabelProps \{[\s\S]*?\n\}/) || [''])[0];
  const rootIface = (dotted.match(/export interface ButtonProps \{[\s\S]*?\n\}/) || [''])[0];
  check('a dotted prop goes to its part interface under the name after the dot', res.ok && /\n {2}tone\?: ButtonLabelTone;/.test(labelIface) && /\n {2}hint: string;/.test(labelIface) && /export type ButtonLabelTone = 'plain' \| 'muted';/.test(dotted) && /\n {2}variant\?: ButtonVariant;/.test(rootIface) && !/tone/.test(rootIface), res.errors.join('; ') || 'interfaces not as expected');
  check('DEFAULTS and REFLECTS keep the dotted key; a null default is left unset', /\n {2}'label\.tone': 'plain',/.test(dotted) && /\n {2}'label\.tone': 'data-tone',/.test(dotted) && !/'label\.hint': null/.test(dotted) && /Unset unless given \(default null\): label\.hint\./.test(dotted), 'keys not found');
  s = clone(); s.props['labl.tone'] = { on: 'label', type: 'string', figmaProperty: null, description: 'Planted typo.' };
  errs = errorsOf(s);
  check('a dotted key whose part is not a part fails', errs.some((e) => e.includes('props.labl.tone') && e.includes('"labl"')), errs.join('; ') || 'no error');

  // element null: no stylesheet entry, a renders-nothing note in SLOTS, and an error if a rule or state names it.
  s = clone(); s.anatomy.label.element = null;
  res = build(s).results[0];
  const nullContract = contractOf(s); const nullCss = cssOf(s);
  check('a part with element null is listed in SLOTS as rendering nothing and gets no CSS', res.ok && /\n {2}label: 'button-label', \/\/ renders nothing/.test(nullContract) && !nullCss.includes('button-label'), res.errors.join('; ') || 'not as expected');
  s = clone(); s.anatomy.spinner.element = null;
  errs = errorsOf(s);
  check('a style rule naming a part with element null fails', errs.some((e) => e.includes('styles[0] (spinner)') && e.includes('element null')), errs.join('; ') || 'no error');
  s = clone(); s.anatomy.label.element = null; s.states.labelled = { on: 'label', selector: '[data-x]', source: 'prop', figma: null, reach: 'prop:children=x', description: 'Planted.' };
  errs = errorsOf(s);
  check('a state on a part with element null fails', errs.some((e) => e.includes('states.labelled.on') && e.includes('element is null')), errs.join('; ') || 'no error');

  // index.ts from the folders: both export lines per component with a .tsx, and an explicit export for each name
  // both files export, so tsc does not reject the ambiguous star exports.
  const idxCtx = { ...ctx, componentSources: () => [{ slug: 'button', tsx: 'export type ButtonProps = { a?: string };\nexport function Button() { return null; }\nexport const BUTTON_SLOTS = 1;\n', contract: null }] };
  const idx = buildAll([{ file: 'button.spec.json', spec: clone() }], idxCtx).files.get('ds-components/src/index.ts') || '';
  check('index.ts is generated from the folders and resolves clashing names', /^\/\/ Generated by v2\/tools\/build-components\.mjs.*Do not edit/.test(idx) && idx.includes("export * from './button/button';\nexport type * from './button/button.contract';") && idx.includes("export type { ButtonProps } from './button/button';") && idx.includes("export { BUTTON_SLOTS } from './button/button';"), idx.slice(0, 400));
  const noneIdx = buildAll([{ file: 'button.spec.json', spec: clone() }], { ...ctx, componentSources: () => [] }).files.get('ds-components/src/index.ts') || '';
  check('a folder without <slug>.tsx is not exported', noneIdx.startsWith('// Generated') && !/^export /m.test(noneIdx), noneIdx);

  // Reference pages are complete: one row per token, every style rule listed, descriptions kept.
  const page = clean.files.get('ds-components/docs/button.md') || '';
  const usageCount = clean.results[0].usage.size;
  const tokenRows = page.split('\n').filter((l) => /^\| [A-Z][A-Za-z]+ \| `[^`]+` \| `--[^`]+` \| styles\[/.test(l)).length;
  const ruleRows = page.split('\n').filter((l) => /^\| styles\[\d+\] \|/.test(l)).length;
  check('the reference page has one row per token and per style rule', tokenRows === usageCount && ruleRows === base.styles.length && page.includes(base.anatomy.root.description), `${tokenRows} token rows for ${usageCount} tokens, ${ruleRows} rule rows for ${base.styles.length} rules`);

  const caught = checks.filter(Boolean).length;
  console.log(`Self-test: ${caught} of ${checks.length} planted checks passed${caught === checks.length ? '.' : '; the build tool is not safe to use.'}`);
  return caught === checks.length ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
