// Shared token loading and resolution. No dependencies.
// Reads tokens/ds.resolver.json (DTCG 2025.10 resolver shape) and the token files it points at.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const PREFIX = 'ds';
const TOKENS_DIR = join(ROOT, 'tokens');
const ALIAS = /^\{([^{}]+)\}$/;

const readJson = (file) => JSON.parse(readFileSync(join(TOKENS_DIR, file), 'utf8'));

/** Flatten a DTCG group tree into Map<"a.b.c", {type, value, description}>. */
function flatten(node, path, inheritedType, out) {
  const type = node.$type ?? inheritedType;
  if ('$value' in node) {
    out.set(path.join('.'), { type, value: node.$value, description: node.$description ?? '' });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (/[{}.]/.test(key)) throw new Error(`Invalid token name "${key}" at ${path.join('.')}`);
    if (child && typeof child === 'object') flatten(child, [...path, key], type, out);
  }
}

function loadSources(sources) {
  const out = new Map();
  for (const source of sources) flatten(readJson(source.$ref), [], undefined, out);
  return out;
}

/** Returns { base: Map, themes: { light: Map, dark: Map }, defaultTheme }. */
export function loadTokens() {
  const resolver = readJson('ds.resolver.json');
  const base = loadSources(resolver.sets.base.sources);
  const modifier = resolver.modifiers.theme;
  const themes = {};
  for (const [name, sources] of Object.entries(modifier.contexts)) themes[name] = loadSources(sources);
  return { base, themes, defaultTheme: modifier.default };
}

export const cssVar = (name) => `--${PREFIX}-${name.replaceAll('.', '-')}`;
export const aliasTarget = (value) => (typeof value === 'string' ? value.match(ALIAS)?.[1] : undefined);

/** Follow aliases until a real value is reached. Throws on a missing reference or a loop. */
export function deref(name, tokens, seen = []) {
  const token = tokens.get(name);
  if (!token) throw new Error(`Unknown token "${name}"${seen.length ? ` (referenced from ${seen.at(-1)})` : ''}`);
  if (seen.includes(name)) throw new Error(`Circular alias: ${[...seen, name].join(' -> ')}`);
  const target = aliasTarget(token.value);
  if (!target) return token;
  const end = deref(target, tokens, [...seen, name]);
  return { ...end, description: token.description || end.description };
}

const dim = (v) => (v.value === 0 ? '0' : `${v.value}${v.unit}`);

function color(v) {
  if (v.alpha === undefined || v.alpha === 1) return v.hex;
  const [r, g, b] = v.components.map((n) => Math.round(n * 255));
  return `rgb(${r} ${g} ${b} / ${v.alpha})`;
}

/**
 * Turn a token value into CSS. With keepAliases, "{a.b}" becomes var(--ds-a-b)
 * so the primitive -> semantic chain stays visible in the browser.
 */
export function toCss(value, type, tokens, keepAliases) {
  const target = aliasTarget(value);
  if (target) {
    if (keepAliases) return `var(${cssVar(target)})`;
    const end = deref(target, tokens);
    return toCss(end.value, end.type, tokens, false);
  }
  switch (type) {
    case 'color': return color(value);
    case 'dimension':
    case 'duration': return dim(value);
    case 'cubicBezier': return `cubic-bezier(${value.join(', ')})`;
    case 'fontFamily': return [].concat(value).map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
    case 'fontWeight':
    case 'number': return String(value);
    case 'shadow':
      return [].concat(value)
        .map((s) => [s.offsetX, s.offsetY, s.blur, s.spread].map(dim).join(' ') + ' ' + toCss(s.color, 'color', tokens, keepAliases))
        .join(', ');
    default: throw new Error(`No CSS output for token type "${type}"`);
  }
}

/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours. */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
