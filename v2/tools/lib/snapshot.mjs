// Reads the Figma snapshots in v2/figma/ and resolves every variable to a value.
// The snapshots are text copies made by v2/tools/figma/export.figma.js and proved exact by v2/tools/figma-verify.mjs.
// Every other tool in v2/tools/ reads Figma through this file, so there is one parser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_DIR = join(here, '..', '..', 'figma');

// One snapshot line:  name [T] value | value ~ web code syntax ~ scopes ~ "description"
const LINE = /^(.*?) \[([CFSB])\] (.*) ~ (.*?) ~ (.*?) ~ (".*")$/;
const HEADER = /^## (.*?) \| modes: (.*?) \| vars: (\d+)/;

export function parseSnapshot(text, file) {
  const collections = [];
  let current = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || /^lines \d+ to \d+ of \d+$/.test(line)) return;
    const h = line.match(HEADER);
    if (h) {
      current = { file, name: h[1], modes: h[2].split(',').map((m) => m.trim()), declared: Number(h[3]), variables: [] };
      collections.push(current);
      return;
    }
    const m = line.match(LINE);
    if (!m || !current) throw new Error(`${file}: line ${i + 1} is not a variable line: ${line.slice(0, 80)}`);
    const values = m[3].split(' | ').map((v) => v.trim());
    if (values.length !== current.modes.length) throw new Error(`${file}: line ${i + 1}: ${values.length} values for ${current.modes.length} modes`);
    current.variables.push({
      file,
      collection: current.name,
      name: m[1],
      type: { C: 'color', F: 'number', S: 'string', B: 'boolean' }[m[2]],
      values,
      syntax: m[4] === '-' ? null : m[4],
      scopes: m[5] === '-' ? [] : m[5].split(','),
      description: JSON.parse(m[6]),
      line: i + 1,
    });
  });
  for (const c of collections) {
    if (c.variables.length !== c.declared) throw new Error(`${file}: collection ${c.name} declares ${c.declared} variables and the snapshot holds ${c.variables.length}`);
  }
  return collections;
}

// Loads both files. `semantic` and `primitives` are arrays of collections.
export function loadSnapshots(dir = SNAPSHOT_DIR) {
  const read = (n) => parseSnapshot(readFileSync(join(dir, `${n}.txt`), 'utf8'), n);
  return { semantic: read('semantic'), primitives: read('primitives') };
}

// A snapshot alias is written {name} with no collection. Names are unique inside a file except for
// bare numbers ("4", "8"), which exist in both the Space and the Radius primitives with the same value.
// A semantic Radius variable aliases the Radius primitives; every other number aliases Space.
export function makeResolver({ semantic, primitives }) {
  const index = new Map();
  const add = (v) => { const k = v.name; if (!index.has(k)) index.set(k, []); index.get(k).push(v); };
  for (const c of [...primitives, ...semantic]) c.variables.forEach(add);

  function target(name, from) {
    const hits = index.get(name) || [];
    if (hits.length === 0) return null;
    if (hits.length === 1) return hits[0];
    const wanted = from.collection === 'Radius' ? 'Radius' : 'Space';
    return hits.find((h) => h.file === 'primitives' && h.collection === wanted) || hits.find((h) => h.file === 'primitives') || hits[0];
  }

  // Returns { value, chain } where chain lists every variable passed through, first to last.
  function resolve(variable, modeIndex = 0, seen = []) {
    const raw = variable.values[Math.min(modeIndex, variable.values.length - 1)];
    const chain = [...seen, variable];
    const alias = raw.match(/^\{(.*)\}$/);
    if (!alias) return { value: raw.startsWith('"') ? JSON.parse(raw) : raw.startsWith('#') ? raw : Number(raw), chain };
    const next = target(alias[1], variable);
    if (!next) return { value: null, chain, missing: alias[1] };
    if (seen.includes(next)) return { value: null, chain, cycle: true };
    return resolve(next, 0, chain);
  }

  const find = (name, file = 'semantic') => (index.get(name) || []).find((v) => v.file === file) || null;
  return { resolve, find, target, index };
}

// Every semantic variable as a flat list, each with its resolved value per mode.
export function resolvedSemantic(snap = loadSnapshots()) {
  const r = makeResolver(snap);
  const out = [];
  for (const c of snap.semantic) {
    for (const v of c.variables) {
      const perMode = {};
      c.modes.forEach((mode, i) => {
        const res = r.resolve(v, i);
        perMode[mode] = { value: res.value, alias: v.values[i].startsWith('{') ? v.values[i].slice(1, -1) : null, missing: res.missing || null };
      });
      out.push({ ...v, modes: c.modes, perMode });
    }
  }
  return out;
}

// #rrggbb or #rrggbbaa to [r, g, b, a] with each in 0..1.
export function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
}

// The name a variable has in CSS, by the rule in the naming standard, to compare with the WEB code syntax in Figma.
// Rule as the file uses it today: prefix by collection, slashes become hyphens, and a trailing /default is dropped.
export const CSS_PREFIX = { Themes: 'color', Typography: '', Radius: 'radius', Density: 'spacing', 'Surface Gradients': 'gradient', Border: 'border' };
export function expectedSyntax(v) {
  const prefix = CSS_PREFIX[v.collection];
  const path = v.name.replace(/\/default$/, '').split('/').join('-');
  return `var(--${prefix ? prefix + '-' : ''}${path})`;
}
