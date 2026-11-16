#!/usr/bin/env node
// Turns every component spec in ds-components/specs/*.spec.json into code and reference docs.
// Deterministic: no model, no clock, no network. Two runs on the same inputs give byte-identical files.
//
//   node v2/tools/build-components.mjs              build every spec
//   node v2/tools/build-components.mjs button tabs  build only the named specs (by slug)
//   node v2/tools/build-components.mjs --self-test  plant known faults in copies of the Button spec,
//                                                   in memory, and confirm each one is caught
//
// For each spec it writes:
//   ds-components/src/<slug>/<slug>.css           the styles, inside @layer ds.components
//   ds-components/src/<slug>/<slug>.contract.ts   the typed surface: unions, props interfaces, constants
//   ds-components/docs/<slug>.md                  a reference page (not usage guidance)
// Across specs it writes:
//   ds-components/docs/state-map.md              every state of every component in one table
//   ds-components/src/styles.css                  layer order, then each component's stylesheet
//   ds-components/generated/tokens-used.json      tokens per component, and Figma colours nobody uses
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
  for (const [sname, state] of Object.entries(states)) {
    const s = obj(state);
    if (!has(parts, s.on)) fail(`states.${sname}.on`, `the state is on ${q(s.on)}, which is not a part.`);
    if (!/^[:[]/.test(str(s.selector))) fail(`states.${sname}.selector`, `the selector ${q(s.selector)} must start with a pseudo-class (:) or an attribute ([).`);
  }
  precedence.forEach((s, i) => { if (!has(states, s)) fail(`precedence[${i}]`, `${q(s)} is not a state.`); });

  const slotSel = (p) => `[data-slot="${str(obj(parts[p]).slot)}"]`;

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
      const kind = obj(parts[styled]).kind;
      const allowed = KIND_ALLOWS[kind];
      const decls = [];
      for (const [property, value] of Object.entries(obj(declsRaw))) {
        const w = `${at} (${styled}.${property})`;
        const def = DECLARATIONS[property];
        if (!def) { fail(w, `${property} is not a declaration the schema allows.`); continue; }
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
      if (!condOk) continue;
      // The selector: other parts' compounds as ancestors, then the styled part's compound.
      const others = partNames.filter((p) => p !== styled && pieces.has(p));
      if (others.length && styled === rootPart) {
        fail(where, `the rule styles the root but depends on ${others.join(', ')}, a part inside it; a descendant selector cannot express that.`);
        continue;
      }
      const compound = (p) => slotSel(p) + (pieces.get(p) || []).join('');
      const selector = [...others.map(compound), compound(styled)].join(' ');
      if (decls.length) out.push({ index: i, part: styled, media, selector, decls, why: str(obj(rule).why) });
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
  const unionName = (pname) => name + pascal(pname);
  for (const [pname, p] of props) {
    if (p.type !== 'enum') continue;
    lines.push(`/** ${str(p.description).replace(/\*\//g, '* /')} */`);
    lines.push(`export type ${unionName(pname)} = ${arr(p.values).map(tsString).join(' | ')};`);
  }
  const tsType = (pname, p) => ({ enum: unionName(pname), boolean: 'boolean', string: 'string', number: 'number', node: 'React.ReactNode', handler: '(...args: never[]) => void' }[p.type] || 'unknown');
  for (const part of partNames) {
    const own = props.filter(([, p]) => p.on === part);
    if (!own.length) continue;
    const iface = part === partNames[0] ? `${name}Props` : `${name}${pascal(part)}Props`;
    lines.push('', `/** Props of the ${part} part (data-slot="${str(obj(parts[part]).slot)}"). */`, `export interface ${iface} {`);
    for (const [pname, p] of own) {
      lines.push(`  /** ${str(p.description).replace(/\*\//g, '* /')} */`);
      lines.push(`  ${tsKey(pname)}${p.required === true ? '' : '?'}: ${tsType(pname, p)};`);
    }
    lines.push('}');
  }
  const lit = (v) => (typeof v === 'string' ? tsString(v) : JSON.stringify(v));
  lines.push('', `/** Every prop that has a default, with that default. */`, `export const ${NAME}_DEFAULTS = {`);
  for (const [pname, p] of props) if (has(p, 'default')) lines.push(`  ${tsKey(pname)}: ${lit(p.default)},`);
  lines.push('} as const;');
  lines.push('', `/** Each part's data-slot value. */`, `export const ${NAME}_SLOTS = {`);
  for (const part of partNames) lines.push(`  ${tsKey(part)}: ${tsString(str(obj(parts[part]).slot))},`);
  lines.push('} as const;');
  lines.push('', `/** Each state: the part it is on and the selector that matches it there. */`, `export const ${NAME}_STATES = {`);
  for (const [sname, s] of Object.entries(obj(spec.states))) lines.push(`  ${tsKey(sname)}: { on: ${tsString(str(s.on))}, selector: ${tsString(str(s.selector))} },`);
  lines.push('} as const;');
  lines.push('', `/** Each prop that styles can see, and the attribute it sets on its part. */`, `export const ${NAME}_REFLECTS = {`);
  for (const [pname, p] of props) if (typeof p.reflects === 'string' && p.reflects) lines.push(`  ${tsKey(pname)}: ${tsString(p.reflects)},`);
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
  L.push('## Anatomy', '', '| Part | data-slot | Element | Role | Wraps |', '|---|---|---|---|---|');
  for (const [p, d] of Object.entries(parts)) L.push(`| ${p}${d.required === false ? ' (optional)' : ''} | ${code(d.slot)} | ${code(d.element)} | ${d.role ?? ''} | ${d.primitivePart ? code(d.primitivePart) : ''} |`);
  L.push('', '## Props', '', '| Prop | Part | Type or values | Default | Reflects | In Figma |', '|---|---|---|---|---|---|');
  for (const [n, p] of Object.entries(obj(spec.props))) {
    const type = p.type === 'enum' ? arr(p.values).map(code).join(' ') : p.type;
    const def = has(p, 'default') ? code(JSON.stringify(p.default)) : p.required ? 'required' : '';
    L.push(`| ${code(n)} | ${p.on} | ${type} | ${def} | ${p.reflects ? code(p.reflects) : ''} | ${p.figmaProperty ? code(p.figmaProperty) : 'code only'} |`);
  }
  L.push('', '## State map', '', `Strongest first: ${arr(spec.precedence).join(', ') || 'no precedence given'}.`, '', '| State | Part | Selector | Set by | Figma | Test reaches it by |', '|---|---|---|---|---|---|');
  for (const [n, s] of Object.entries(states)) L.push(`| ${n} | ${s.on} | ${code(s.selector)} | ${s.source} | ${s.figma ? code(`${s.figma.property}=${s.figma.value}`) : ''} | ${cell(s.reach)} |`);
  const used = [...compiled.usage.values()];
  for (const [origin, title] of [['figma', 'Tokens from Figma'], ['proposed', 'Tokens proposed in the repo']]) {
    const list = used.filter((u) => u.origin === origin);
    L.push('', `## ${title}`, '');
    if (!list.length) { L.push('None.'); continue; }
    // One row per collection keeps the page short; each token shows its CSS name and how many style entries use it.
    L.push('| Collection | Token, CSS name, style entries using it |', '|---|---|');
    const byCollection = new Map();
    for (const u of list) { if (!byCollection.has(u.collection)) byCollection.set(u.collection, []); byCollection.get(u.collection).push(u); }
    for (const c of [...byCollection.keys()].sort()) {
      const items = byCollection.get(c).sort((x, y) => (x.token < y.token ? -1 : x.token > y.token ? 1 : 0));
      L.push(`| ${c} | ${items.map((u) => `${code(u.token)} ${code(u.cssVar)} ${u.rules.size}`).join('<br>')} |`);
    }
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
  L.push('', '## Examples', '', '| Id | Title | Props | Content |', '|---|---|---|---|');
  for (const e of arr(spec.examples)) {
    const content = e.content === undefined || e.content === null ? '' : typeof e.content === 'string' ? cell(e.content) : code(JSON.stringify(e.content));
    L.push(`| ${code(e.id)} | ${cell(e.title)} | ${Object.keys(obj(e.props)).length ? code(JSON.stringify(e.props)) : ''} | ${content} |`);
  }
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
  return { files, results };
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
  const entries = readEntries(slugs);
  const { files, results } = buildAll(entries, ctx);
  for (const [rel, content] of files) {
    mkdirSync(dirname(join(ROOT, rel)), { recursive: true });
    writeFileSync(join(ROOT, rel), content);
  }
  for (const r of results) {
    if (r.ok) console.log(`${r.file}: built. ${r.stats.styles} style entries written as ${r.stats.cssRules} CSS rules; ${r.stats.props} props, ${r.stats.parts} parts and ${r.stats.states} states in the contract and the docs page.`);
    else {
      console.log(`${r.file}: NOT built, ${r.errors.length} problem${r.errors.length === 1 ? '' : 's'}:`);
      for (const e of r.errors) console.log(`  ${e}`);
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length} specs read, ${results.length - failed} built, ${failed} not built; ${files.size} files written.`);
  return failed ? 1 : 0;
}

// ---------- self-test: plant known faults in copies of the Button spec ----------
function selfTest() {
  const ctx = { ...loadContext(), extensionExists: () => false };
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

  // 3. The hover rule excludes the stronger states on the same part, disabled first.
  const css = clean.files.get('ds-components/src/button/button.css') || '';
  const hoverSel = '[data-slot="button"]:hover:not(:is(:disabled, [aria-disabled="true"])):not([data-loading]):not(:active) {';
  const primaryHover = '[data-slot="button"][data-variant="primary"]:hover:not(:is(:disabled, [aria-disabled="true"])):not([data-loading]):not(:active) {\n    background-color: var(--color-interactive-primary-hover);';
  check('the hover rule excludes the disabled selector', css.includes(hoverSel) && css.includes(primaryHover), 'selector not found');

  // 4. A boolean condition of false gives :not().
  s = clone(); s.styles.push({ when: { props: { fullWidth: false } }, parts: { root: { width: 'size/control/md' } } });
  check('a boolean false condition produces :not()', cssOf(s).includes('[data-slot="button"]:not([data-full-width]) {\n    inline-size: var(--size-control-md);'), 'selector not found');

  // 5. Two runs are identical, every file included.
  const a = build(clone()).files; const b = build(clone()).files;
  const same = a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
  check('two runs are byte-identical', same, 'outputs differ');

  // Further faults the build must catch.
  s = clone(); s.styles[0].parts.root.background = 'full';
  errs = errorsOf(s);
  check('a keyword where it makes no sense fails', errs.some((e) => e.includes('styles[0] (root.background)') && e.includes('keyword "full"')), errs.join('; ') || 'no error');
  s = clone(); s.styles.push({ when: { props: { disabled: true } }, parts: { root: { cursor: 'default' } } });
  errs = errorsOf(s);
  check('a condition on a prop that reflects nothing fails', errs.some((e) => e.includes(`styles[${s.styles.length - 1}].when.props.disabled`)), errs.join('; ') || 'no error');
  s = clone(); s.styles[0].parts.spinner.opacity = 'disabled/40';
  errs = errorsOf(s);
  check('a token for a property with no collection fails', errs.some((e) => e.includes('styles[0] (spinner.opacity)')), errs.join('; ') || 'no error');
  s = clone(); delete s.anatomy;
  const r = buildAll([{ file: 'button.spec.json', spec: s }, { file: 'broken.spec.json', error: 'the file is not readable JSON: test' }], ctx).results;
  check('an invalid spec is reported, not thrown', !r[0].ok && r[0].errors.some((e) => e.includes('schema')) && !r[1].ok, r.map((x) => x.errors.join('; ')).join(' / '));
  check('a prefixed Size token gets its CSS name by rule', css.includes('block-size: var(--size-control-md);') && !css.includes('--size-size-'), 'wrong Size name');
  check('reduced motion writes 0s and the transition properties', css.includes('@media (prefers-reduced-motion: reduce) {\n    [data-slot="button"] {\n      transition-property: background-color, border-color, color, box-shadow, opacity;\n      transition-duration: 0s;'), 'block not found');

  const caught = checks.filter(Boolean).length;
  console.log(`Self-test: ${caught} of ${checks.length} planted checks passed${caught === checks.length ? '.' : '; the build tool is not safe to use.'}`);
  return caught === checks.length ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
