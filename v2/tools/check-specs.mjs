#!/usr/bin/env node
// Proves that every component spec in ds-components/specs/*.spec.json is valid and internally consistent.
//
//   node v2/tools/check-specs.mjs                 check every spec, write the generated index files
//   node v2/tools/check-specs.mjs --report-only   the same, but exit 0 even when an error is found
//   node v2/tools/check-specs.mjs --self-test     plant one fault per check in a copy of Button and
//                                                 confirm that check, and only that check, reports it
//
// Fourteen checks run on each readable spec. A file that cannot be read or parsed is one finding
// under the id "read", and the run carries on. "C checks run" in the last line counts each check
// run on each spec (14 per readable spec, 1 per unreadable file).
//
// Token names come from the semantic Figma snapshot (through v2/tools/lib/snapshot.mjs) and from
// ds-tokens/proposed/tokens.json. Only the semantic file is used: components never name primitives.
// A name present in both counts as from Figma.
//
// data-slot is a space-separated list of slot names, like a class list: one element can be two parts at once (a
// Button inside DropdownMenuTrigger asChild carries data-slot="button dropdown-menu-trigger"). A slot name is one
// word (the schema's pattern), and a state selector that finds a part must do it by the word, [data-slot~="x"];
// [data-slot="x"] matches the whole attribute and misses an element that carries a second name, so state-target
// reports it.
//
// opacity has no token collection yet. A value for it that is not a keyword is reported as a warning, never passed
// silently and never an error.
//
// layer (the stacking level, written as z-index) takes a token of the Layer collection and nothing else: no keyword,
// because "none", "inherit" and the rest would leave the part's level to chance, which is the fault the property
// exists to fix.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { loadSnapshots } from './lib/snapshot.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const SPEC_DIR = join(ROOT, 'ds-components', 'specs');
const SCHEMA_FILE = join(ROOT, 'ds-components', 'schema', 'component.schema.json');
const ROLES_FILE = join(ROOT, 'ds-components', 'schema', 'roles.json');
const PROPOSED_FILE = join(ROOT, 'ds-tokens', 'proposed', 'tokens.json');
const OUT_DIR = join(ROOT, 'ds-components', 'generated');

export const CHECKS = [
  'schema', 'slug', 'role', 'slot-unique', 'prop-target', 'state-target', 'rule-refs',
  'part-kind', 'token', 'first-rule-base', 'requirement-ids', 'dependencies', 'example-props',
  'dark-label-on-brand',
];

const KEYWORDS = new Set(['none', 'transparent', 'current', 'inherit', 'full']);

// Which collection a property takes its tokens from. `prefix` is put in front of the value to make
// the token name (a type role "label-base" is the variable font-size/label-base).
const PROPERTY_COLLECTION = {
  background: { collection: 'Themes' }, color: { collection: 'Themes' },
  borderColor: { collection: 'Themes' }, outlineColor: { collection: 'Themes' }, placeholderColor: { collection: 'Themes' },
  paddingInline: { collection: 'Density' }, paddingBlock: { collection: 'Density' }, gap: { collection: 'Density' },
  radius: { collection: 'Radius' },
  typography: { collection: 'Typography', prefix: 'font-size/' },
  fontWeight: { collection: 'Typography', prefix: 'font-weight/' },
  height: { collection: 'Size' }, width: { collection: 'Size' }, minHeight: { collection: 'Size' },
  minWidth: { collection: 'Size' }, maxWidth: { collection: 'Size' }, iconSize: { collection: 'Size' },
  borderWidth: { collection: 'Border' }, outlineWidth: { collection: 'Border' }, outlineOffset: { collection: 'Border' },
  duration: { collection: 'Motion' }, easing: { collection: 'Motion' },
  shadow: { collection: 'Elevation' },
  layer: { collection: 'Layer' },
};
// Properties that take a token and never a keyword.
const TOKEN_ONLY_PROPERTIES = new Set(['layer']);
// Restricted to fixed words by the schema itself, so they name no token.
const SCHEMA_ENUM_PROPERTIES = new Set(['borderStyle', 'cursor', 'textDecoration']);
// No collection exists for these yet.
const UNCOLLECTED_PROPERTIES = new Set(['opacity']);

const KIND_ALLOWS = {
  text: new Set(['color', 'typography', 'fontWeight', 'textDecoration']),
  glyph: new Set(['color', 'iconSize', 'opacity']),
  slot: new Set(),
};

const CHECK_KINDS = ['test', 'axe', 'lint', 'type', 'manual'];

// ---------- small guards, because half-written specs have wrong types ----------
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const obj = (x) => (isObj(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const str = (x) => (typeof x === 'string' ? x : null);
const q = (x) => (x === undefined ? "(missing)" : JSON.stringify(x));

// ---------- context: schema, roles, token names ----------
export function loadContext() {
  const Ajv2020 = require('ajv/dist/2020.js');
  const Ajv = Ajv2020.default ?? Ajv2020;
  const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false, logger: false });
  const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA_FILE, 'utf8')));
  const roles = obj(JSON.parse(readFileSync(ROLES_FILE, 'utf8')).roles);

  // tokens: Map collection -> Map name -> 'figma' | 'proposed'
  const tokens = new Map();
  const add = (collection, name, source) => {
    if (!tokens.has(collection)) tokens.set(collection, new Map());
    const m = tokens.get(collection);
    if (!m.has(name)) m.set(name, source);
  };
  const { semantic } = loadSnapshots();
  for (const c of semantic) for (const v of c.variables) add(c.name, v.name, 'figma');
  for (const t of arr(JSON.parse(readFileSync(PROPOSED_FILE, 'utf8')))) {
    if (isObj(t) && str(t.collection) && str(t.name)) add(t.collection, t.name, 'proposed');
  }
  return { validate, roles, tokens };
}

// ---------- reading specs ----------
export function readSpecFiles(files) {
  return files.map((file) => {
    const entry = { file: basename(file), path: file };
    try {
      entry.spec = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      entry.error = e.code === 'ENOENT' ? 'the file is missing' : `the file is not readable JSON: ${e.message}`;
    }
    return entry;
  });
}

function listSpecFiles() {
  if (!existsSync(SPEC_DIR)) return [];
  return readdirSync(SPEC_DIR).filter((f) => f.endsWith('.spec.json')).sort().map((f) => join(SPEC_DIR, f));
}

// The prop an example or a rule can name. Returns null when the name is not a prop.
const propsOf = (spec) => obj(spec.props);
const partsOf = (spec) => obj(spec.anatomy);
const statesOf = (spec) => obj(spec.states);
const rulesOf = (spec) => arr(spec.styles);

function legalValue(prop, value) {
  // Returns null when the value is legal for the prop, or a reason when it is not.
  if (!isObj(prop)) return 'the prop is malformed';
  if (prop.type === 'enum') {
    const values = arr(prop.values);
    return values.includes(value) ? null : `${q(value)} is not one of its values ${q(values)}`;
  }
  if (prop.type === 'boolean') return typeof value === 'boolean' ? null : `${q(value)} is not a boolean`;
  if (prop.type === 'string') return typeof value === 'string' ? null : `${q(value)} is not a string`;
  if (prop.type === 'number') return typeof value === 'number' ? null : `${q(value)} is not a number`;
  return null;
}

function nearMatches(tokens, collection, name) {
  // A name written with an extra leading segment, such as size/control/md for control/md.
  const m = tokens.get(collection);
  if (!m) return [];
  const tail = name.split('/').slice(1).join('/');
  return [...m.keys()].filter((k) => k === tail || (tail && k.endsWith('/' + tail))).slice(0, 3);
}

// ---------- the checks ----------
// Each finding: { spec, check, severity, path, message }
export function checkSpecs(entries, ctx, { specFilesOnDisk = null } = {}) {
  const findings = [];
  let checksRun = 0;
  const usage = new Map(); // file -> { figma: Map name->count, proposed: Map name->count }

  const readable = entries.filter((e) => e.spec !== undefined);
  for (const e of entries) {
    if (e.spec === undefined) {
      checksRun += 1;
      findings.push({ spec: e.file, check: 'read', severity: 'error', path: '', message: `${e.file}: ${e.error}.` });
    }
  }

  // Names that have a spec: from readable specs, plus any spec file on disk (even an invalid one).
  const known = new Set();
  for (const e of readable) {
    const s = obj(e.spec);
    if (str(s.name)) known.add(s.name);
    if (str(s.slug)) known.add(s.slug);
    known.add(e.file.replace(/\.spec\.json$/, ''));
  }
  for (const f of specFilesOnDisk || []) known.add(basename(f).replace(/\.spec\.json$/, ''));
  const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  // Cross-spec indexes.
  const slotOwners = new Map(); // slot -> [{file, path}]
  const reqOwners = new Map(); // requirement id -> [{file, path}]
  for (const e of readable) {
    for (const [pname, part] of Object.entries(partsOf(obj(e.spec)))) {
      const slot = str(obj(part).slot);
      if (!slot) continue;
      if (!slotOwners.has(slot)) slotOwners.set(slot, []);
      slotOwners.get(slot).push({ file: e.file, path: `anatomy.${pname}.slot` });
    }
    arr(obj(e.spec).requirements).forEach((r, i) => {
      const id = str(obj(r).id);
      if (!id) return;
      if (!reqOwners.has(id)) reqOwners.set(id, []);
      reqOwners.get(id).push({ file: e.file, path: `requirements[${i}].id` });
    });
  }

  for (const e of readable) {
    const spec = obj(e.spec);
    const file = e.file;
    const out = (check, path, message, severity = 'error') => findings.push({ spec: file, check, severity, path, message: `${file} at ${path || '(root)'}: ${message}` });
    const parts = partsOf(spec);
    const props = propsOf(spec);
    const states = statesOf(spec);
    const rules = rulesOf(spec);
    const use = { figma: new Map(), proposed: new Map() };
    usage.set(file, use);
    if (!isObj(e.spec)) {
      checksRun += 1;
      out('schema', '', 'the file holds JSON that is not an object, so no other check can run.');
      continue;
    }
    checksRun += CHECKS.length;

    // 1. schema
    if (!ctx.validate(spec)) {
      for (const err of ctx.validate.errors) {
        const path = err.instancePath.replace(/^\//, '').split('/').filter(Boolean).map((p) => (/^\d+$/.test(p) ? `[${p}]` : `.${p}`)).join('').replace(/^\./, '');
        const extra = err.params && err.params.additionalProperty ? ` (${q(err.params.additionalProperty)})`
          : err.params && err.params.allowedValues ? ` (${err.params.allowedValues.join(', ')})`
            : err.params && err.params.missingProperty ? '' : '';
        out('schema', path, `does not match the schema: ${err.message}${extra}.`);
      }
    }

    // 2. slug
    const slug = str(spec.slug);
    const fileSlug = file.replace(/\.spec\.json$/, '');
    if (slug !== fileSlug) out('slug', 'slug', `the file is named ${file} but the slug is ${q(spec.slug)}; the file must be <slug>.spec.json.`);
    const partNames = Object.keys(parts);
    if (partNames.length) {
      const rootSlot = obj(parts[partNames[0]]).slot;
      if (rootSlot !== slug) out('slug', `anatomy.${partNames[0]}.slot`, `the root part's slot is ${q(rootSlot)} and must equal the slug ${q(spec.slug)}.`);
    }

    // 3. role
    for (const [pname, part] of Object.entries(parts)) {
      const role = obj(part).role;
      if (role === undefined || role === null) continue;
      if (typeof role !== 'string' || !Object.prototype.hasOwnProperty.call(ctx.roles, role)) {
        out('role', `anatomy.${pname}.role`, `the role ${q(role)} is not in ds-components/schema/roles.json.`);
      }
    }

    // 4. slot-unique
    for (const [pname, part] of Object.entries(parts)) {
      const slot = str(obj(part).slot);
      if (!slot) continue;
      const owners = slotOwners.get(slot) || [];
      const others = owners.filter((o) => !(o.file === file && o.path === `anatomy.${pname}.slot`));
      if (others.length) out('slot-unique', `anatomy.${pname}.slot`, `the data-slot ${q(slot)} is also used at ${others.map((o) => `${o.file} ${o.path}`).join(', ')}.`);
    }

    // 5. prop-target (a default of null is allowed: the schema says it means the prop is unset unless given)
    for (const [name, prop] of Object.entries(props)) {
      const p = obj(prop);
      if (!Object.prototype.hasOwnProperty.call(parts, p.on)) out('prop-target', `props.${name}.on`, `the prop ${name} is on ${q(p.on)}, which is not a part.`);
      if (p.type === 'enum' && 'default' in p && p.default !== null && !arr(p.values).includes(p.default)) out('prop-target', `props.${name}.default`, `the default ${q(p.default)} is not one of the values ${q(arr(p.values))}.`);
      if (p.type === 'boolean' && 'default' in p && p.default !== null && typeof p.default !== 'boolean') out('prop-target', `props.${name}.default`, `the default ${q(p.default)} of a boolean prop is not a boolean.`);
    }

    // 6. state-target
    for (const [name, state] of Object.entries(states)) {
      const on = obj(state).on;
      if (!Object.prototype.hasOwnProperty.call(parts, on)) out('state-target', `states.${name}.on`, `the state ${name} is on ${q(on)}, which is not a part.`);
      const sel = str(obj(state).selector) || '';
      const whole = sel.match(/\[\s*data-slot\s*([|^$*]?=)/);
      if (whole) out('state-target', `states.${name}.selector`, `the selector ${q(sel)} finds a part with [data-slot${whole[1]}...], which compares the whole attribute; data-slot is a list of words, so write [data-slot~="<slot>"].`);
    }
    arr(spec.precedence).forEach((name, i) => {
      if (!Object.prototype.hasOwnProperty.call(states, name)) out('state-target', `precedence[${i}]`, `${q(name)} is listed in precedence but is not a state.`);
    });

    // 7. rule-refs
    rules.forEach((rule, i) => {
      const when = obj(obj(rule).when);
      for (const [pname, value] of Object.entries(obj(when.props))) {
        if (!Object.prototype.hasOwnProperty.call(props, pname)) { out('rule-refs', `styles[${i}].when.props.${pname}`, `the rule names the prop ${pname}, which the spec does not have.`); continue; }
        const p = obj(props[pname]);
        if (p.type === 'node' || p.type === 'handler') { out('rule-refs', `styles[${i}].when.props.${pname}`, `the rule depends on ${pname}, a ${p.type} prop, which styles cannot see.`); continue; }
        const why = legalValue(p, value);
        if (why) out('rule-refs', `styles[${i}].when.props.${pname}`, `the rule asks for ${pname} = ${q(value)}, but ${why}.`);
      }
      arr(when.states).forEach((s, j) => {
        if (!Object.prototype.hasOwnProperty.call(states, s)) out('rule-refs', `styles[${i}].when.states[${j}]`, `the rule names the state ${q(s)}, which the spec does not have.`);
      });
      for (const pname of Object.keys(obj(obj(rule).parts))) {
        if (!Object.prototype.hasOwnProperty.call(parts, pname)) out('rule-refs', `styles[${i}].parts.${pname}`, `the rule styles ${q(pname)}, which is not a part.`);
      }
    });

    // 8. part-kind, 9. token, 14. dark-label-on-brand
    rules.forEach((rule, i) => {
      for (const [pname, decls] of Object.entries(obj(obj(rule).parts))) {
        const kind = obj(parts[pname]).kind;
        for (const [property, value] of Object.entries(obj(decls))) {
          const path = `styles[${i}].parts.${pname}.${property}`;
          const allowed = KIND_ALLOWS[kind];
          if (allowed && !allowed.has(property)) {
            out('part-kind', path, kind === 'slot'
              ? `${pname} is a slot and takes no style declarations, but this rule sets ${property}.`
              : `${pname} is a ${kind} part and takes only ${[...allowed].join(', ')}; it may not take ${property}.`);
          }
          // token
          if (SCHEMA_ENUM_PROPERTIES.has(property)) continue;
          if (typeof value !== 'string') continue; // the schema check reports the type
          if (KEYWORDS.has(value)) {
            if (TOKEN_ONLY_PROPERTIES.has(property)) out('token', path, `${property} takes a token of the ${PROPERTY_COLLECTION[property].collection} collection only, never the keyword ${q(value)}.`);
            continue;
          }
          if (UNCOLLECTED_PROPERTIES.has(property)) {
            out('token', path, `${property} has no token collection yet, so ${q(value)} cannot be checked; use a keyword or add the collection.`, 'warn');
            continue;
          }
          const rule9 = PROPERTY_COLLECTION[property];
          if (!rule9) continue; // unknown property: the schema check reports it
          const name = (rule9.prefix || '') + value;
          const source = ctx.tokens.get(rule9.collection)?.get(name);
          if (!source) {
            const near = nearMatches(ctx.tokens, rule9.collection, name);
            const hint = near.length ? ` Did you mean ${near.map((n) => q(rule9.prefix && n.startsWith(rule9.prefix) ? n.slice(rule9.prefix.length) : n)).join(' or ')}?` : '';
            out('token', path, `${q(value)} is not a token in the ${rule9.collection} collection (looked for ${q(name)} in Figma and in ds-tokens/proposed/tokens.json).${hint}`);
          } else {
            const key = `${rule9.collection}:${name}`;
            use[source].set(key, (use[source].get(key) || 0) + 1);
          }
          // dark-label-on-brand
          if (property === 'color' && value === 'text/brand' && kind === 'text') {
            out('dark-label-on-brand', path, `the text part ${pname} is set to text/brand, which is 3.83 to 1 in the dark theme, below the 4.5 to 1 body text needs.`, 'warn');
          }
        }
      }
    });

    // 10. first-rule-base
    if (rules.length) {
      const when = obj(rules[0]).when;
      if (!isObj(when) || Object.keys(when).length !== 0) out('first-rule-base', 'styles[0].when', `the first style rule is the base and must have an empty "when", but it has ${q(when)}.`);
    }

    // 11. requirement-ids
    const testIds = new Set();
    arr(spec.requirements).forEach((r, i) => {
      const id = str(obj(r).id);
      if (id) {
        const owners = reqOwners.get(id) || [];
        const others = owners.filter((o) => !(o.file === file && o.path === `requirements[${i}].id`));
        if (others.length) out('requirement-ids', `requirements[${i}].id`, `the requirement id ${q(id)} is also used at ${others.map((o) => `${o.file} ${o.path}`).join(', ')}.`);
      }
      const m = str(obj(r).check)?.match(/^test:(.+)$/);
      if (m) testIds.add(m[1]);
    });
    arr(obj(spec.accessibility).keyboard).forEach((k, i) => {
      const t = obj(k).test;
      if (t === null || t === undefined) return;
      if (!testIds.has(t)) out('requirement-ids', `accessibility.keyboard[${i}].test`, `the key ${q(obj(k).key)} names the test ${q(t)}, but no requirement in this spec is checked by test:${t}.`);
    });

    // 12. dependencies
    arr(spec.dependencies).forEach((d, i) => {
      if (typeof d !== 'string' || !(known.has(d) || known.has(kebab(d)))) out('dependencies', `dependencies[${i}]`, `${q(d)} is listed as a dependency but has no spec in ds-components/specs/.`);
    });

    // 13. example-props
    arr(spec.examples).forEach((ex, i) => {
      for (const [pname, value] of Object.entries(obj(obj(ex).props))) {
        if (pname === 'children') continue;
        if (!Object.prototype.hasOwnProperty.call(props, pname)) { out('example-props', `examples[${i}].props.${pname}`, `the example ${q(obj(ex).id)} uses the prop ${pname}, which the spec does not list.`); continue; }
        const p = obj(props[pname]);
        if (p.type === 'enum') {
          const why = legalValue(p, value);
          if (why) out('example-props', `examples[${i}].props.${pname}`, `the example ${q(obj(ex).id)} sets ${pname} = ${q(value)}, but ${why}.`);
        }
      }
    });
  }

  return { findings, checksRun, usage };
}

// ---------- generated files ----------
function buildIndex(entries, usage, findings) {
  const specs = [];
  const tests = [];
  for (const e of entries) {
    if (e.spec === undefined || !isObj(e.spec)) { specs.push({ file: e.file, readable: false }); continue; }
    const s = e.spec;
    const use = usage.get(e.file) || { figma: new Map(), proposed: new Map() };
    const tokenList = (m) => [...m.entries()].map(([k, count]) => { const [collection, ...rest] = k.split(':'); return { collection, name: rest.join(':'), uses: count }; }).sort((a, b) => (a.collection + a.name).localeCompare(b.collection + b.name));
    const checkIds = Object.fromEntries(CHECK_KINDS.map((k) => [k, []]));
    for (const r of arr(s.requirements)) {
      const m = str(obj(r).check)?.match(/^(test|axe|lint|type|manual):(.+)$/);
      if (m) checkIds[m[1]].push(m[2]);
      if (m && m[1] === 'test') tests.push({ id: m[2], spec: e.file, component: s.name ?? null, requirement: obj(r).id ?? null, level: obj(r).level ?? null, text: obj(r).text ?? null });
    }
    const errors = findings.filter((f) => f.spec === e.file && f.severity === 'error').length;
    specs.push({
      file: e.file,
      readable: true,
      valid: errors === 0,
      errors,
      warnings: findings.filter((f) => f.spec === e.file && f.severity === 'warn').length,
      name: s.name ?? null,
      slug: s.slug ?? null,
      stage: s.stage ?? null,
      parts: Object.entries(partsOf(s)).map(([name, p]) => ({ name, slot: obj(p).slot ?? null, role: obj(p).role ?? null, element: obj(p).element ?? null, primitivePart: obj(p).primitivePart ?? null })),
      props: Object.entries(propsOf(s)).map(([name, p]) => ({ name, type: obj(p).type ?? null, values: obj(p).values ?? null, default: 'default' in obj(p) ? obj(p).default : null, reflects: obj(p).reflects ?? null })),
      states: Object.entries(statesOf(s)).map(([name, st]) => ({ name, on: obj(st).on ?? null, selector: obj(st).selector ?? null, source: obj(st).source ?? null, reach: obj(st).reach ?? null })),
      tokens: {
        fromFigma: { count: use.figma.size, uses: [...use.figma.values()].reduce((a, b) => a + b, 0), tokens: tokenList(use.figma) },
        proposed: { count: use.proposed.size, uses: [...use.proposed.values()].reduce((a, b) => a + b, 0), tokens: tokenList(use.proposed) },
      },
      checks: checkIds,
    });
  }
  return { specs, tests };
}

// ---------- console report ----------
function report(entries, result) {
  const lines = [];
  for (const e of entries) {
    const mine = result.findings.filter((f) => f.spec === e.file);
    const use = result.usage.get(e.file);
    const errors = mine.filter((f) => f.severity === 'error').length;
    const warns = mine.length - errors;
    lines.push(`${e.file}: ${errors} error${errors === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}`);
    if (use) {
      const names = (m) => [...m.keys()].map((k) => k.split(':').slice(1).join(':'));
      lines.push(`  tokens from Figma: ${use.figma.size}${use.figma.size ? ` (${names(use.figma).join(', ')})` : ''}`);
      lines.push(`  tokens proposed, not yet in Figma: ${use.proposed.size}${use.proposed.size ? ` (${names(use.proposed).join(', ')})` : ''}`);
    }
    for (const f of mine) lines.push(`  ${f.severity === 'error' ? 'ERROR' : 'WARN '} [${f.check}] ${f.message}`);
  }
  lines.push(`${entries.length} specs, ${result.checksRun} checks run, ${result.findings.length} findings`);
  return lines.join('\n');
}

// ---------- self-test ----------
const FAULTS = {
  schema: (s) => { s.unexpectedField = true; },
  slug: (s) => { s.anatomy.root.slot = 'button-root'; },
  role: (s) => { s.anatomy.label.role = 'heading'; },
  'slot-unique': (s) => { s.anatomy.iconEnd.slot = 'button-icon-start'; },
  'prop-target': (s) => { s.props.variant.default = 'tertiary'; },
  'state-target': (s) => { s.precedence.push('pressed'); },
  'rule-refs': (s) => { s.styles.push({ when: { props: { variant: 'tertiary' } }, parts: { root: { background: 'transparent' } } }); },
  'part-kind': (s) => { s.styles.push({ when: { props: { size: 'lg' } }, parts: { label: { paddingInline: 'static/80' } } }); },
  token: (s) => { s.styles.push({ when: { props: { variant: 'primary' }, states: ['focus'] }, parts: { root: { background: 'surface/primary/defualt' } } }); },
  'first-rule-base': (s) => { s.styles[0].when = { media: 'forced-colors' }; },
  'requirement-ids': (s) => { s.requirements.push({ ...s.requirements[0] }); },
  dependencies: (s) => { s.dependencies.push('Tooltip'); },
  'example-props': (s) => { s.examples.push({ id: 'loud', title: 'Loud', props: { tone: 'loud' }, content: 'Go' }); },
  'dark-label-on-brand': (s) => { s.styles.push({ when: { props: { variant: 'ghost' } }, parts: { label: { color: 'text/brand' } } }); },
};

// More planted faults for checks whose rule changed: each must fire its check, and only that check.
const MORE_FAULTS = [
  ['state-target', 'a state selector that finds a part by the whole data-slot attribute', (s) => { s.states.hover.selector = ':where([data-slot="button-label"]) :hover'; }],
  ['token', 'a stacking level that names no Layer token', (s) => { s.styles[0].parts.root.layer = 'modal'; }],
  ['token', 'a stacking level given as a keyword', (s) => { s.styles[0].parts.root.layer = 'inherit'; }],
];
// Planted values that must raise nothing new: each proves a check does not fire on a legal value.
const CLEAN_PLANTS = [
  ['a stacking level that names a Layer token', (s) => { s.styles[0].parts.root.layer = 'overlay'; }],
];

function selfTest(ctx) {
  const [base] = readSpecFiles([join(SPEC_DIR, 'button.spec.json')]);
  if (base.spec === undefined) { console.log(`self-test cannot run: button.spec.json: ${base.error}`); return 1; }
  const keyOf = (f) => `${f.check}|${f.path}|${f.message}`;
  const run = (spec) => checkSpecs([{ file: 'button.spec.json', spec }], ctx, { specFilesOnDisk: [] }).findings;
  const baseline = new Set(run(structuredClone(base.spec)).map(keyOf));
  let failed = 0;
  for (const [check, plant] of [...CHECKS.map((c) => [c, FAULTS[c]]), ...MORE_FAULTS.map(([c, , f]) => [c, f])]) {
    const copy = structuredClone(base.spec);
    let fresh;
    try {
      plant(copy);
      fresh = run(copy).filter((f) => !baseline.has(keyOf(f)));
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${check}: planting or checking the fault threw: ${e.message}`);
      continue;
    }
    const by = [...new Set(fresh.map((f) => f.check))];
    if (by.length === 1 && by[0] === check) {
      console.log(`ok   ${check}: fired alone (${fresh.length} finding${fresh.length === 1 ? '' : 's'}): ${fresh[0].message}`);
    } else {
      failed += 1;
      console.log(`FAIL ${check}: expected only ${check}, got ${by.length ? by.join(', ') : 'nothing'}`);
    }
  }
  for (const [what, plant] of CLEAN_PLANTS) {
    const copy = structuredClone(base.spec);
    plant(copy);
    const fresh = run(copy).filter((f) => !baseline.has(keyOf(f)));
    if (fresh.length === 0) console.log(`ok   clean: ${what}: no finding`);
    else { failed += 1; console.log(`FAIL clean: ${what}: ${fresh.map((f) => `[${f.check}] ${f.message}`).join('; ')}`); }
  }
  return failed === 0 ? 0 : 1;
}

// ---------- main ----------
function main(argv) {
  const ctx = loadContext();
  if (argv.includes('--self-test')) return selfTest(ctx);
  const reportOnly = argv.includes('--report-only');
  const named = argv.filter((a) => !a.startsWith('--'));
  const onDisk = listSpecFiles();
  const files = named.length ? named.map((f) => (f.includes('/') ? resolve(f) : join(SPEC_DIR, f))) : onDisk;
  const entries = readSpecFiles(files);
  const result = checkSpecs(entries, ctx, { specFilesOnDisk: onDisk });
  const { specs, tests } = buildIndex(entries, result.usage, result.findings);
  mkdirSync(OUT_DIR, { recursive: true });
  const source = 'Generated by v2/tools/check-specs.mjs from ds-components/specs/*.spec.json. Do not edit.';
  writeFileSync(join(OUT_DIR, 'spec-index.json'), JSON.stringify({ $comment: source, specs }, null, 2) + '\n');
  writeFileSync(join(OUT_DIR, 'test-ids.json'), JSON.stringify({ $comment: source + ' Every id here must have a test of the same name.', count: tests.length, tests }, null, 2) + '\n');
  console.log(report(entries, result));
  const errors = result.findings.filter((f) => f.severity === 'error').length;
  return errors && !reportOnly ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
