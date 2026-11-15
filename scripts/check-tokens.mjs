// Checks tokens/souvenir.tokens.json against section 2 of briefs/v0.2-build-spec.md.
// Run: node scripts/check-tokens.mjs              check the real file; exit 1 on any failure
//      node scripts/check-tokens.mjs --self-test  check the real file passes, then that every fixture in
//                                                 scripts/fixtures/tokens/ fails on the rule it names
//
// Exports:
//   runChecks(doc) -> { failures: [{ rule, token, message }], groups: [{ rule, label, checked, lines: string[] }] }
//   applyPatch(doc, patch) -> a patched deep copy (the fixture format is described above applyPatch below)
//
// Every colour rule runs for each theme (light, dark) and each accent (every key of primitive.accent).
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, resolve as resolvePath, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTokens, walkTokens, getNode, isAlias, aliasPath, cssName, resolve } from './build-tokens.mjs';
import { inGamut, toHex, hexDistance, contrastOklch, hueDistance } from './lib/color.mjs';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = resolvePath(ROOT, 'scripts/fixtures/tokens');
const THEMES = ['light', 'dark'];
const TOP = new Set(['primitive', 'semantic', 'component']);
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TYPES = new Set(['color', 'dimension', 'duration', 'fontFamily', 'fontWeight', 'number']);
const COLOR_KEYS = ['ground', 'panel', 'well', 'text', 'text-soft', 'edge', 'divider', 'accent', 'on-solid', 'focus',
  'inverse', 'on-inverse', 'danger', 'warning', 'success', 'neutral-solid'];
const SAME_IN_BOTH = ['accent', 'danger', 'warning', 'success'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (r) => r.toFixed(2);

function shapeError(type, v) {
  switch (type) {
    case 'color': {
      if (!isObj(v)) return 'a colour must be an object';
      if (v.colorSpace !== 'oklch') return 'colorSpace must be "oklch"';
      const c = v.components;
      if (!Array.isArray(c) || c.length !== 3 || !c.every(isNum)) return 'components must be three numbers';
      if (c[0] < 0 || c[0] > 1) return 'L must be 0 to 1';
      if (c[1] < 0) return 'C must not be negative';
      if (c[2] < 0 || c[2] >= 360) return 'H must be 0 to below 360';
      if (!isNum(v.alpha) || v.alpha < 0 || v.alpha > 1) return 'alpha must be a number 0 to 1';
      if (typeof v.hex !== 'string' || !/^#[0-9a-f]{6}$/.test(v.hex)) return 'hex must be "#rrggbb" in lower case';
      return null;
    }
    case 'dimension':
      if (!isObj(v) || !isNum(v.value) || !['px', 'rem'].includes(v.unit)) return 'a dimension must be { value: number, unit: "px" | "rem" }';
      return null;
    case 'duration':
      if (!isObj(v) || !isNum(v.value) || v.value < 0 || v.unit !== 'ms') return 'a duration must be { value: number, unit: "ms" }';
      return null;
    case 'fontFamily':
      if (typeof v === 'string' && v) return null;
      if (Array.isArray(v) && v.length && v.every((s) => typeof s === 'string' && s)) return null;
      return 'a fontFamily must be a string or a list of strings';
    case 'fontWeight':
      if (isNum(v) && v >= 1 && v <= 1000) return null;
      return 'a fontWeight must be a number 1 to 1000';
    case 'number':
      return isNum(v) ? null : 'a number must be a number';
    default:
      return `unknown type ${type}`;
  }
}

export function runChecks(doc) {
  const failures = [];
  const groups = new Map();
  const group = (rule, label) => {
    if (!groups.has(rule)) groups.set(rule, { rule, label, checked: 0, lines: [] });
    return groups.get(rule);
  };
  const fail = (rule, token, message) => failures.push({ rule, token, message });
  const check = (rule, label, ok, token, message) => {
    group(rule, label).checked++;
    if (!ok) fail(rule, token, message);
    return ok;
  };

  if (!isObj(doc)) {
    fail('structure', '(file)', 'the token file is not a JSON object');
    return { failures, groups: [...groups.values()] };
  }

  // Structure: the three layers and the two theme groups.
  for (const key of Object.keys(doc)) {
    check('structure', 'three layers; light and dark colour groups', key.startsWith('$') || TOP.has(key), key, `unexpected top-level group "${key}"`);
  }
  for (const key of TOP) check('structure', '', isObj(doc[key]), key, `missing top-level group "${key}"`);
  for (const t of THEMES) check('structure', '', isObj(getNode(doc, ['semantic', t, 'color'])), `semantic.${t}.color`, `missing group semantic.${t}.color`);

  // Naming: every key in every path.
  const visitNames = (node, path) => {
    if (!isObj(node)) return;
    for (const key of Object.keys(node)) {
      if (key.startsWith('$')) continue;
      const p = [...path, key];
      check('naming', 'lower case, hyphens inside a name, dots between groups', NAME.test(key), p.join('.'), `"${key}" in ${p.join('.')} is not lower case words joined by hyphens`);
      if (isObj(node[key]) && !('$value' in node[key])) visitNames(node[key], p);
    }
  };
  visitNames(doc, []);

  const tokens = walkTokens(doc);

  // Types, shapes and descriptions.
  for (const { path, token, type } of tokens) {
    const id = path.join('.');
    check('description', 'every token states its purpose', typeof token.$description === 'string' && token.$description.trim().length > 0, id, `${id} has no $description`);
    if (!check('type', 'every token has a known $type, own or inherited, matching its alias target', TYPES.has(type), id, `${id} has ${type ? `unknown type "${type}"` : 'no $type'}`)) continue;
    if (!isAlias(token.$value)) {
      const err = shapeError(type, token.$value);
      check('shape', 'raw values have the shape of their type', !err, id, `${id}: ${err}`);
    } else {
      group('shape', 'raw values have the shape of their type');
    }
  }

  // Aliases resolve, no cycles, and alias target types match.
  const resolvable = new Set();
  for (const { path, token, type } of tokens) {
    if (!isAlias(token.$value)) { resolvable.add(path.join('.')); continue; }
    const id = path.join('.');
    const themes = path[0] === 'component' ? THEMES : [path[0] === 'semantic' && THEMES.includes(path[1]) ? path[1] : 'light'];
    let ok = true;
    for (const theme of themes) {
      const r = resolve(doc, path, { theme });
      group('alias-resolves', 'every alias points at a token');
      group('no-cycles', 'no alias leads back to itself');
      if (!r.ok) {
        check(r.code, '', false, id, r.message.startsWith(id) ? r.message : `${id}: ${r.message}`);
        ok = false;
        break;
      }
      group('alias-resolves', '').checked++;
      group('no-cycles', '').checked++;
      if (type && r.type) check('type', '', r.type === type, id, `${id} is ${type} but resolves to a ${r.type}`);
    }
    if (ok) resolvable.add(id);
  }

  // Layering.
  for (const { path, token } of tokens) {
    const id = path.join('.');
    const v = token.$value;
    if (path[0] === 'primitive') {
      check('primitive-raw', 'primitives hold raw values, never aliases', !isAlias(v), id, `${id} is a primitive but aliases ${v}`);
    } else if (path[0] === 'semantic') {
      check('semantic-aliases-primitive', 'each semantic token aliases a primitive', isAlias(v) && aliasPath(v)[0] === 'primitive', id,
        `${id} must alias a primitive, found ${JSON.stringify(v)}`);
    } else if (path[0] === 'component') {
      const target = isAlias(v) ? aliasPath(v) : null;
      check('component-aliases-semantic', 'each component token aliases a semantic token, never a primitive', !!target && target[0] === 'semantic', id,
        `${id} must alias a semantic token, found ${JSON.stringify(v)}`);
      if (target && target[0] === 'semantic' && target.length > 2 && THEMES.includes(target[1])) {
        check('component-color-slot', 'a component colour aliases semantic.light.color.<key>, which follows the active theme',
          target[1] === 'light' && target[2] === 'color' && target.length === 4, id,
          `${id} must alias semantic.light.color.<key>, found ${v}`);
      }
    }
  }

  // Theme keys: the full set, the same in both themes.
  const lightKeys = Object.keys(getNode(doc, ['semantic', 'light', 'color']) || {}).filter((k) => !k.startsWith('$'));
  const darkKeys = Object.keys(getNode(doc, ['semantic', 'dark', 'color']) || {}).filter((k) => !k.startsWith('$'));
  for (const k of COLOR_KEYS) {
    for (const [t, keys] of [['light', lightKeys], ['dark', darkKeys]]) {
      check('theme-keys', 'every colour key exists in both themes', keys.includes(k), `semantic.${t}.color.${k}`, `semantic.${t}.color.${k} is missing`);
    }
  }
  for (const k of new Set([...lightKeys, ...darkKeys])) {
    check('theme-keys', '', lightKeys.includes(k) && darkKeys.includes(k), `semantic.*.color.${k}`, `colour key "${k}" is not in both themes`);
  }

  // Custom property names are unique.
  const names = new Map();
  for (const { path } of tokens) {
    if (path[0] === 'semantic' && path[1] === 'dark') continue;
    const n = cssName(path);
    check('unique-css-names', 'no two tokens build to the same custom property', !names.has(n), path.join('.'), `${path.join('.')} and ${names.get(n)} both build to ${n}`);
    if (!names.has(n)) names.set(n, path.join('.'));
  }

  // Gamut and hex, for every raw colour.
  for (const { path, token, type } of tokens) {
    if (type !== 'color' || isAlias(token.$value) || shapeError('color', token.$value)) continue;
    const id = path.join('.');
    const { components, hex } = token.$value;
    check('in-gamut', 'every colour is inside sRGB', inGamut(components), id, `${id} oklch(${components.join(' ')}) is outside the sRGB gamut`);
    const expected = toHex(components);
    const d = hexDistance(expected, hex);
    check('hex-matches', 'hex matches components within 1 per channel', d <= 1, id, `${id} hex ${hex} differs from ${expected} by ${d} in a channel`);
  }

  // Colour rules, per theme and accent.
  const accents = Object.keys(getNode(doc, ['primitive', 'accent']) || {}).filter((k) => !k.startsWith('$'));
  const colour = (theme, accent, key) => {
    const path = ['semantic', theme, 'color', key];
    if (!getNode(doc, path)) return null;
    const r = resolve(doc, path, { theme, accent });
    if (!r.ok || r.type !== 'color' || shapeError('color', r.value)) return null;
    return r.value.components;
  };
  const RULES = [
    { rule: 'text-contrast', label: 'text on ground, panel, well', min: 7, pairs: [['text', 'ground'], ['text', 'panel'], ['text', 'well']] },
    { rule: 'text-soft-contrast', label: 'text-soft on ground, panel, well', min: 4.5, pairs: [['text-soft', 'ground'], ['text-soft', 'panel'], ['text-soft', 'well']] },
    { rule: 'on-accent', label: 'on-solid on accent', min: 4.5, pairs: [['on-solid', 'accent']] },
    { rule: 'on-status', label: 'on-solid on each status fill and neutral-solid', min: 3,
      pairs: ['danger', 'warning', 'success', 'neutral-solid'].map((k) => ['on-solid', k]) },
    { rule: 'boundary-contrast', label: 'accent, edge, focus, status fills, neutral-solid against panel and ground; edge against well', min: 3,
      pairs: [...['accent', 'edge', 'focus', 'danger', 'warning', 'success', 'neutral-solid'].flatMap((k) => [[k, 'panel'], [k, 'ground']]), ['edge', 'well']] },
    { rule: 'inverse-contrast', label: 'on-inverse on inverse', min: 7, pairs: [['on-inverse', 'inverse']] },
    { rule: 'inverse-boundary', label: 'inverse against panel and ground', min: 3, pairs: [['inverse', 'panel'], ['inverse', 'ground']] },
  ];
  for (const { rule, label, min, pairs } of RULES) {
    const g = group(rule, `${label}, at least ${min} to 1`);
    for (const theme of THEMES) {
      // Pairs that do not involve the accent are the same for every accent: measure them once.
      const plain = [], perAccent = new Map();
      for (const accent of accents) {
        for (const [fg, bg] of pairs) {
          const usesAccent = fg === 'accent' || bg === 'accent';
          if (!usesAccent && accent !== accents[0]) continue;
          const a = colour(theme, accent, fg), b = colour(theme, accent, bg);
          const where = usesAccent ? `${theme}, accent ${accent}` : theme;
          if (!a || !b) {
            check(rule, '', false, `semantic.${theme}.color.${a ? bg : fg}`, `${fg} on ${bg} (${where}) cannot be measured: the colour does not resolve`);
            continue;
          }
          const ratio = contrastOklch(a, b);
          check(rule, '', ratio >= min, `semantic.${theme}.color.${fg}`, `${fg} on ${bg} (${where}) is ${fmt(ratio)} to 1, below ${min}`);
          const text = `${fg}/${bg} ${fmt(ratio)}${ratio >= min ? '' : ' FAIL'}`;
          if (usesAccent) {
            if (!perAccent.has(accent)) perAccent.set(accent, []);
            perAccent.get(accent).push(text);
          } else plain.push(text);
        }
      }
      if (plain.length) g.lines.push(`${theme}: ${plain.join(', ')}`);
      for (const [accent, list] of perAccent) g.lines.push(`${theme}, accent ${accent}: ${list.join(', ')}`);
    }
  }

  // Focus equals text; the solids are the same in both themes.
  {
    const g = group('focus-equals-text', 'focus resolves to the same colour as text');
    for (const theme of THEMES) {
      const f = colour(theme, accents[0], 'focus'), t = colour(theme, accents[0], 'text');
      const ok = !!f && !!t && f.join() === t.join();
      check('focus-equals-text', '', ok, `semantic.${theme}.color.focus`, `semantic.${theme}.color.focus does not equal text`);
      g.lines.push(`${theme}: ${ok ? 'equal' : 'DIFFERENT'}`);
    }
    const s = group('solids-same', 'accent and status fills are the same in both themes');
    for (const k of SAME_IN_BOTH) {
      const a = getNode(doc, ['semantic', 'light', 'color', k])?.$value;
      const b = getNode(doc, ['semantic', 'dark', 'color', k])?.$value;
      const ok = a !== undefined && JSON.stringify(a) === JSON.stringify(b);
      check('solids-same', '', ok, `semantic.dark.color.${k}`, `${k} differs between light (${JSON.stringify(a)}) and dark (${JSON.stringify(b)})`);
    }
    s.lines.push(SAME_IN_BOTH.join(', '));
  }

  // Status hues stay at least 30 degrees from every accent hue.
  {
    const g = group('status-hue', 'no status hue within 30 degrees of an accent hue');
    const statuses = Object.keys(getNode(doc, ['primitive', 'status']) || {}).filter((k) => !k.startsWith('$'));
    const hueOf = (path) => {
      const r = resolve(doc, path);
      return r.ok && r.type === 'color' && !shapeError('color', r.value) ? r.value.components[2] : null;
    };
    const parts = [];
    for (const s of statuses) {
      for (const a of accents) {
        const hs = hueOf(['primitive', 'status', s]), ha = hueOf(['primitive', 'accent', a]);
        if (hs === null || ha === null) {
          check('status-hue', '', false, `primitive.status.${s}`, `hue of ${s} or ${a} cannot be read`);
          continue;
        }
        const d = hueDistance(hs, ha);
        check('status-hue', '', d >= 30, `primitive.status.${s}`, `${s} (hue ${hs}) is ${fmt(d)} degrees from accent ${a} (hue ${ha}), below 30`);
        parts.push(`${s}/${a} ${Math.round(d * 10) / 10}°${d >= 30 ? '' : ' FAIL'}`);
      }
    }
    g.lines.push(parts.join(', '));
  }

  return { failures, groups: [...groups.values()] };
}

// Fixture format: { "expect": "<rule>", "about": "...", "patch": [op, ...] } where op is one of
//   { "set": [path...], "value": any }                 set the value at path (creating it if missing)
//   { "color": [path...], "components": [L, C, H] }    set a colour token's components and recompute its hex
//   { "delete": [path...] }                            remove the key at path
//   { "copy": [path...], "to": [path...] }             copy the value at one path to another
export function applyPatch(doc, patch) {
  const out = structuredClone(doc);
  const parentOf = (path) => {
    let node = out;
    for (const key of path.slice(0, -1)) {
      if (!isObj(node[key])) node[key] = {};
      node = node[key];
    }
    return node;
  };
  for (const op of patch) {
    if (op.set) parentOf(op.set)[op.set.at(-1)] = structuredClone(op.value);
    else if (op.color) {
      const token = getNode(out, op.color);
      if (!isObj(token) || !isObj(token.$value)) throw new Error(`fixture: ${op.color.join('.')} is not a colour token`);
      token.$value.components = [...op.components];
      token.$value.hex = toHex(op.components);
    } else if (op.delete) delete parentOf(op.delete)[op.delete.at(-1)];
    else if (op.copy) {
      const v = getNode(out, op.copy);
      if (v === undefined) throw new Error(`fixture: nothing at ${op.copy.join('.')}`);
      parentOf(op.to)[op.to.at(-1)] = structuredClone(v);
    } else throw new Error(`fixture: unknown op ${JSON.stringify(op)}`);
  }
  return out;
}

function report({ failures, groups }) {
  for (const g of groups) {
    const fails = failures.filter((f) => f.rule === g.rule);
    console.log(`${fails.length ? 'FAIL' : 'PASS'} ${g.rule}: ${g.label} (${g.checked} checked${fails.length ? `, ${fails.length} failed` : ''})`);
    for (const line of g.lines) console.log(`       ${line}`);
    for (const f of fails) console.log(`     x ${f.rule} at ${f.token}: ${f.message}`);
  }
}

function selfTest() {
  let bad = 0;
  const real = loadTokens();
  const base = runChecks(real);
  if (base.failures.length) {
    console.log(`FAIL the real token file has ${base.failures.length} failure(s); a self-test needs a passing file first`);
    for (const f of base.failures) console.log(`     x ${f.rule} at ${f.token}: ${f.message}`);
    return 1;
  }
  console.log('ok   the real token file passes every rule');
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) { console.log('FAIL no fixtures found'); return 1; }
  for (const file of files) {
    const name = basename(file, '.json');
    try {
      const fx = JSON.parse(readFileSync(resolvePath(FIXTURES, file), 'utf8'));
      if (!fx.expect || !Array.isArray(fx.patch)) throw new Error('fixture needs "expect" and "patch"');
      const { failures } = runChecks(applyPatch(real, fx.patch));
      const hit = failures.find((f) => f.rule === fx.expect);
      const others = [...new Set(failures.filter((f) => f.rule !== fx.expect).map((f) => f.rule))];
      if (hit) {
        console.log(`ok   ${name}: fails on ${fx.expect} at ${hit.token}: ${hit.message}${others.length ? ` (also: ${others.join(', ')})` : ''}`);
      } else {
        bad++;
        console.log(`FAIL ${name}: expected a failure on ${fx.expect}, got ${failures.length ? [...new Set(failures.map((f) => f.rule))].join(', ') : 'no failure'}`);
      }
    } catch (err) {
      bad++;
      console.log(`FAIL ${name}: the checker crashed: ${err.stack || err.message}`);
    }
  }
  console.log(`self-test: ${files.length - bad} of ${files.length} fixtures failed on their named rule`);
  return bad ? 1 : 0;
}

const isMain = (() => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
})();

if (isMain) {
  let code;
  try {
    if (process.argv.includes('--self-test')) code = selfTest();
    else {
      const result = runChecks(loadTokens());
      report(result);
      const n = result.failures.length;
      console.log(n ? `check-tokens: ${n} failure(s)` : 'check-tokens: every rule passes');
      code = n ? 1 : 0;
    }
  } catch (err) {
    console.error(`check-tokens: crashed: ${err.stack || err.message}`);
    code = 1;
  }
  process.exit(code);
}
