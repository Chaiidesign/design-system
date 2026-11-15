// Builds dist/tokens.css from tokens/souvenir.tokens.json.
// Run: node scripts/build-tokens.mjs        (writes dist/tokens.css; importing this module writes nothing)
//
// Exports:
//   TOKENS_PATH, CSS_PATH                    absolute paths of the source and the output
//   loadTokens(path?)                        -> the parsed token document
//   walkTokens(doc)                          -> [{ path: string[], token, type }] for every token, in file order
//   getNode(doc, path)                       -> the object at path (string[]), or undefined
//   isAlias(value)                           -> true for "{group.name}"
//   aliasPath(value)                         -> string[] the alias points at
//   cssName(path)                            -> "--sv-..." custom property name for a token path
//   resolve(doc, path, { theme })            -> { ok: true, value, type, path: final string[], chain: string[][] }
//                                               or { ok: false, code: "alias-resolves" | "no-cycles", message, chain }
//                                               Any reference to semantic.<theme>.color.<key> follows the theme given:
//                                               with theme "dark", a component alias to semantic.light.color.<key>
//                                               resolves through semantic.dark.color.<key>. With accent "teal",
//                                               semantic.*.color.accent resolves to primitive.accent.teal.
//   formatValue(type, value)                 -> CSS text for a raw value (colours as oklch())
//   resolveTokens(doc?, { theme, accent })   -> flat map { "--sv-...": { path, type, value, css } } of every token,
//                                               resolved for theme "light" | "dark" and accent (a key of primitive.accent;
//                                               default: whatever the semantic accent aliases). `css` is the resolved CSS text.
//   buildCss(doc?)                           -> the full text of dist/tokens.css
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS_PATH = resolvePath(ROOT, 'tokens/souvenir.tokens.json');
export const CSS_PATH = resolvePath(ROOT, 'dist/tokens.css');
const THEMES = ['light', 'dark'];

export function loadTokens(path = TOKENS_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function walkTokens(doc) {
  const out = [];
  const visit = (node, path, inheritedType) => {
    if (!isObj(node)) return;
    const type = typeof node.$type === 'string' ? node.$type : inheritedType;
    if ('$value' in node) { out.push({ path, token: node, type }); return; }
    for (const key of Object.keys(node)) {
      if (key.startsWith('$')) continue;
      visit(node[key], [...path, key], type);
    }
  };
  for (const key of Object.keys(doc)) if (!key.startsWith('$')) visit(doc[key], [key], undefined);
  return out;
}

export function getNode(doc, path) {
  let node = doc;
  for (const key of path) {
    if (!isObj(node) || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

export const isAlias = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
export const aliasPath = (v) => v.slice(1, -1).split('.');

export function cssName(path) {
  const [layer, ...rest] = path;
  if (layer === 'primitive') return '--sv-p-' + rest.join('-');
  if (layer === 'semantic') {
    const parts = THEMES.includes(rest[0]) ? rest.slice(1) : rest;
    return '--sv-' + parts.join('-');
  }
  return '--sv-' + rest.join('-');
}

// Inherited $type for a path (own, or nearest group's).
function typeAt(doc, path) {
  let node = doc, type;
  for (const key of path) {
    if (!isObj(node)) return type;
    if (typeof node.$type === 'string') type = node.$type;
    node = node[key];
  }
  if (isObj(node) && typeof node.$type === 'string') type = node.$type;
  return type;
}

// The theme slot rule: a component colour that aliases semantic.light.color.<key>
// means "the <key> colour of the active theme".
function themed(path, theme) {
  if (theme && path[0] === 'semantic' && THEMES.includes(path[1]) && path[2] === 'color' && path[1] !== theme) {
    return ['semantic', theme, ...path.slice(2)];
  }
  return path;
}

export function resolve(doc, path, { theme = 'light', accent } = {}) {
  const chain = [];
  const seen = new Set();
  const adjust = (p) => {
    const q = themed(p, theme);
    return accent && q.length === 4 && q[0] === 'semantic' && q[2] === 'color' && q[3] === 'accent' ? ['primitive', 'accent', accent] : q;
  };
  let current = adjust(path);
  for (;;) {
    const key = current.join('.');
    if (seen.has(key)) {
      return { ok: false, code: 'no-cycles', message: `alias cycle: ${[...chain, current].map((p) => p.join('.')).join(' -> ')}`, chain };
    }
    seen.add(key);
    chain.push(current);
    const node = getNode(doc, current);
    if (!isObj(node) || !('$value' in node)) {
      return { ok: false, code: 'alias-resolves', message: `${chain.length > 1 ? chain[chain.length - 2].join('.') + ' points at ' : ''}${key}, which is not a token`, chain };
    }
    const v = node.$value;
    if (!isAlias(v)) return { ok: true, value: v, type: typeAt(doc, current), path: current, chain };
    current = adjust(aliasPath(v));
  }
}

const IDENT = /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/;
export function formatValue(type, value) {
  switch (type) {
    case 'color': {
      const [L, C, H] = value.components;
      const a = value.alpha ?? 1;
      return a === 1 ? `oklch(${L} ${C} ${H})` : `oklch(${L} ${C} ${H} / ${a})`;
    }
    case 'dimension':
    case 'duration':
      return value.value === 0 ? '0' : `${value.value}${value.unit}`;
    case 'fontFamily':
      return (Array.isArray(value) ? value : [value]).map((f) => (IDENT.test(f) ? f : JSON.stringify(f))).join(', ');
    case 'fontWeight':
    case 'number':
      return String(value);
    default:
      throw new Error(`no CSS form for type ${type}`);
  }
}

export function resolveTokens(doc = loadTokens(), { theme = 'light', accent } = {}) {
  const map = {};
  for (const { path } of walkTokens(doc)) {
    if (path[0] === 'semantic' && THEMES.includes(path[1]) && path[1] !== theme) continue;
    const r = resolve(doc, path, { theme, accent });
    if (!r.ok) throw new Error(r.message);
    map[cssName(path)] = { path: path.join('.'), type: r.type, value: r.value, css: formatValue(r.type, r.value) };
  }
  return map;
}

// The CSS value of a token: a literal for a primitive, var() of its alias target otherwise.
function cssValue(doc, path, type) {
  const v = getNode(doc, path).$value;
  if (!isAlias(v)) return formatValue(type, v);
  const target = aliasPath(v);
  const node = getNode(doc, target);
  if (!isObj(node) || !('$value' in node)) throw new Error(`${path.join('.')}: alias ${v} does not resolve`);
  return `var(${cssName(target)})`;
}

export function buildCss(doc = loadTokens()) {
  // Fail on anything unresolvable before writing a byte.
  for (const theme of THEMES) resolveTokens(doc, { theme });

  const tokens = walkTokens(doc);
  const root = [], dark = [];
  const names = new Map();
  const decl = (list, path, type) => {
    const name = cssName(path);
    list.push(`  ${name}: ${cssValue(doc, path, type)};`);
    return name;
  };
  for (const { path, type } of tokens) {
    const isThemeColour = path[0] === 'semantic' && THEMES.includes(path[1]);
    if (isThemeColour && path[1] === 'dark') continue;
    const name = decl(root, path, type);
    if (names.has(name)) throw new Error(`two tokens share ${name}: ${names.get(name)} and ${path.join('.')}`);
    names.set(name, path.join('.'));
    if (isThemeColour) {
      const darkPath = ['semantic', 'dark', ...path.slice(2)];
      const darkNode = getNode(doc, darkPath);
      if (!darkNode) throw new Error(`${darkPath.join('.')} is missing`);
      if (darkNode.$value !== getNode(doc, path).$value) decl(dark, darkPath, type);
    }
  }

  // One re-point per accent that is not the default.
  const accentNode = getNode(doc, ['semantic', 'light', 'color', 'accent']);
  const defaultAccent = aliasPath(accentNode.$value).join('.');
  const accents = Object.keys(getNode(doc, ['primitive', 'accent']) || {}).filter((k) => !k.startsWith('$'));
  const accentBlocks = accents
    .filter((k) => `primitive.accent.${k}` !== defaultAccent)
    .map((k) => `:root[data-accent="${k}"] {\n  --sv-color-accent: var(${cssName(['primitive', 'accent', k])});\n}`);

  const darkBody = ['  color-scheme: dark;', ...dark].join('\n');
  const out = [
    '/* Generated by scripts/build-tokens.mjs from tokens/souvenir.tokens.json. Do not edit by hand. */',
    '@layer sv.tokens, sv.base, sv.components;',
    '@layer sv.tokens {',
    ':root {',
    '  color-scheme: light;',
    ...root,
    '}',
    '@media (prefers-color-scheme: dark) {',
    ':root:not([data-theme="light"]) {',
    darkBody,
    '}',
    '}',
    ':root[data-theme="dark"] {',
    darkBody,
    '}',
    // Same specificity as the theme selectors above, so these must come last.
    ...accentBlocks,
    '}',
    '',
  ].join('\n');

  // Guard the cascade order the accent switch depends on.
  const lastDark = out.lastIndexOf(':root[data-theme="dark"]');
  for (const k of accents) {
    const at = out.indexOf(`:root[data-accent="${k}"]`);
    if (at !== -1 && at < lastDark) throw new Error(`accent block ${k} must follow the theme blocks`);
  }
  if (/--sv-color-accent:/.test(darkBody) && accentBlocks.length) {
    throw new Error('the dark theme redeclares the accent; the accent switch would not be the only re-point');
  }
  return out;
}

const isMain = (() => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
})();

if (isMain) {
  try {
    const css = buildCss();
    mkdirSync(dirname(CSS_PATH), { recursive: true });
    writeFileSync(CSS_PATH, css);
    console.log(`build-tokens: wrote dist/tokens.css (${Buffer.byteLength(css)} bytes)`);
  } catch (err) {
    console.error(`build-tokens: ${err.message}`);
    process.exit(1);
  }
}
