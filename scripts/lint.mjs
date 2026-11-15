#!/usr/bin/env node
// Souvenir lint: enforces sections 3 and 5 of briefs/v0.2-build-spec.md.
//   node scripts/lint.mjs              lint src/**/*.css, screens/**/*.html, and the ```html fences of
//                                      docs/components/*.md, docs/layout.md, docs/patterns.md and AGENTS.md
//   node scripts/lint.mjs --self-test  every fixture in scripts/fixtures/lint must fail on exactly its named rule
// Page rules (screens and fences): html-many-primary (more than one data-variant="primary"; demo-* files exempt),
// html-form-no-action, html-button-no-type, html-control-no-label, html-heading-order (one h1, no level skipped
// going deeper, a page starts with h1; fragments exempt from the last), html-placeholder-label.
// Output: one line per finding, "file:line rule-name message", then a count. Exit 1 on any finding.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, basename, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------- helpers

function walk(dir, test) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, test));
    else if (test(p)) out.push(p);
  }
  return out;
}

function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}

// Replace comments with spaces, keeping newlines so line numbers survive.
function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function toPosix(p) { return p.split(sep).join("/"); }

// ---------------------------------------------------------------- CSS parsing

// Parse CSS into a tree of { type: "at"|"rule"|"decl", ... } nodes with line numbers.
function parseCss(text) {
  const src = blankComments(text);
  const lineAt = lineIndex(src);
  const errors = [];
  let pos = 0;

  function firstNonSpace(a, b) {
    let i = a;
    while (i < b && /\s/.test(src[i])) i++;
    return i;
  }

  function statement(a, b) {
    const raw = src.slice(a, b);
    if (!raw.trim()) return null;
    const line = lineAt(firstNonSpace(a, b));
    const t = raw.trim();
    if (t.startsWith("@")) {
      const m = /^@([\w-]+)\s*([\s\S]*)$/.exec(t);
      return { type: "at", name: m ? m[1].toLowerCase() : "", prelude: m ? m[2].trim() : "", line, children: null };
    }
    const colon = t.indexOf(":");
    if (colon < 0) return { type: "junk", text: t, line };
    return { type: "decl", prop: t.slice(0, colon).trim().toLowerCase(), value: t.slice(colon + 1).trim(), line };
  }

  function items(inBlock) {
    const out = [];
    let start = pos, depth = 0;
    while (pos < src.length) {
      const c = src[pos];
      if (c === '"' || c === "'") {
        const q = c; pos++;
        while (pos < src.length && src[pos] !== q) { if (src[pos] === "\\") pos++; pos++; }
        pos++; continue;
      }
      if (c === "(") depth++;
      else if (c === ")") depth = Math.max(0, depth - 1);
      else if (depth === 0 && c === ";") {
        const s = statement(start, pos); if (s) out.push(s);
        pos++; start = pos; continue;
      } else if (depth === 0 && c === "{") {
        const preludeStart = firstNonSpace(start, pos);
        const prelude = src.slice(start, pos).trim();
        const line = lineAt(preludeStart);
        pos++;
        const children = items(true);
        if (prelude.startsWith("@")) {
          const m = /^@([\w-]+)\s*([\s\S]*)$/.exec(prelude);
          out.push({ type: "at", name: m ? m[1].toLowerCase() : "", prelude: m ? m[2].trim() : "", line, children });
        } else {
          out.push({ type: "rule", selector: prelude, line, children });
        }
        start = pos; continue;
      } else if (depth === 0 && c === "}") {
        if (inBlock) {
          const s = statement(start, pos); if (s) out.push(s);
          pos++; return out;
        }
        errors.push({ line: lineAt(pos), message: "a closing brace with no opening brace" });
        pos++; start = pos; continue;
      }
      pos++;
    }
    if (inBlock) errors.push({ line: lineAt(src.length - 1), message: "a block is never closed" });
    const s = statement(start, src.length); if (s) out.push(s);
    return out;
  }

  const tree = items(false);
  return { tree, errors };
}

// Split at top-level commas (outside parentheses, brackets and quotes).
function splitTop(text, ch = ",") {
  const out = []; let depth = 0, q = null, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === ch && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

// The first compound selector of a complex selector (up to the first combinator).
function firstCompound(sel) {
  let depth = 0, q = null;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && (/\s/.test(c) || c === ">" || c === "+" || c === "~")) return sel.slice(0, i);
  }
  return sel;
}

const NAMED_COLOURS = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood " +
  "cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey " +
  "darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey " +
  "darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
  "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon " +
  "lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue " +
  "lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid " +
  "mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin " +
  "navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff " +
  "peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver " +
  "skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow " +
  "yellowgreen " +
  // system colours are colour values too
  "accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas canvastext field fieldtext graytext highlight " +
  "highlighttext linktext mark marktext selecteditem selecteditemtext visitedtext").split(/\s+/));

// CSS system colours. They stay in NAMED_COLOURS (so they fail everywhere else) and are allowed only
// inside @media (forced-colors: active), where the user's palette replaces ours (spec, "Changes to this spec").
const SYSTEM_COLOURS = new Set(("accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas canvastext field " +
  "fieldtext graytext highlight highlighttext linktext mark marktext selecteditem selecteditemtext visitedtext").split(" "));

// True only when every comma-separated branch of the media query requires (forced-colors: active) and none is negated.
// The bare (forced-colors) form and any "not" are not accepted: the block must apply only in forced colours.
function forcedColoursOnly(prelude) {
  const branches = splitTop(prelude);
  return branches.length > 0 && branches.every((b) => /\(\s*forced-colors\s*:\s*active\s*\)/i.test(b) && !/(^|\s)not(\s|\()/i.test(b));
}

const COLOUR_FUNCS = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;

// Pull url(...) segments out of a value. Returns { rest, urls }.
function extractUrls(value) {
  const urls = []; let rest = ""; let i = 0;
  while (i < value.length) {
    const m = /url\(/i.exec(value.slice(i));
    if (!m) { rest += value.slice(i); break; }
    const s = i + m.index;
    rest += value.slice(i, s) + "url()";
    let j = s + 4, depth = 1, q = null;
    while (j < value.length && depth > 0) {
      const c = value[j];
      if (q) { if (c === "\\") j++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === "(") depth++;
      else if (c === ")") depth--;
      j++;
    }
    urls.push(value.slice(s + 4, j - 1).trim());
    i = j;
  }
  return { rest, urls };
}

function stripStrings(v) { return v.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""'); }
function unquote(u) { return u.replace(/^["']|["']$/g, ""); }

// Properties where a bare word can be a colour. Elsewhere a word such as "mark" or "field" is a name, not a colour.
const COLOUR_PROPS = /(^--|color|background|border|outline|shadow|fill|stroke|text-decoration|column-rule|caret|scrollbar)/;

function colourFindings(value, prop, forcedColours = false) {
  const found = [];
  const hex = /#[0-9a-f]{3,8}(?![\w-])/i.exec(value);
  if (hex) found.push(hex[0]);
  const fn = COLOUR_FUNCS.exec(value);
  if (fn) found.push(fn[1] + "()");
  if (!COLOUR_PROPS.test(prop)) return found;
  const noVars = value.replace(/var\(\s*--[\w-]+/g, "var(");
  for (const m of noVars.matchAll(/(?<![\w-])([a-zA-Z][\w-]*)(?![\w-]*\()/g)) {
    const word = m[1].toLowerCase();
    if (forcedColours && SYSTEM_COLOURS.has(word)) continue;
    if (NAMED_COLOURS.has(word)) found.push(m[1]);
  }
  return found;
}

const ALLOWED_UNIT_VALUES = new Set(["100%", "50%", "1fr"]);
// Inside @keyframes the one angle allowed is exactly 1turn, so a busy mark can turn (spec, "Changes to this spec").
function unitFindings(value, inKeyframes = false) {
  const found = [];
  for (const m of value.matchAll(/(?<![\w.#-])-?(\d*\.?\d+)([a-zA-Z%]+)/g)) {
    const num = parseFloat(m[1]);
    const unit = m[2];
    if (/^e\d/i.test(unit)) continue; // exponent, not a unit
    if (num === 0) continue;
    const tok = `${m[1]}${unit}`.toLowerCase();
    if (ALLOWED_UNIT_VALUES.has(tok) && !m[0].startsWith("-")) continue;
    if (inKeyframes && m[0] === "1turn") continue;
    found.push(m[0]);
  }
  return found;
}

const MEDIA_FEATURES = [
  /\(\s*(min|max)-width\s*:\s*48rem\s*\)/gi,
  /\(\s*width\s*(>=|<=|<|>)\s*48rem\s*\)/gi,
  /\(\s*48rem\s*(>=|<=|<|>)\s*width\s*\)/gi,
  /\(\s*prefers-reduced-motion(\s*:\s*(reduce|no-preference))?\s*\)/gi,
  /\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi,
  /\(\s*forced-colors(\s*:\s*(active|none))?\s*\)/gi,
];
function mediaAllowed(prelude) {
  let rest = prelude;
  for (const re of MEDIA_FEATURES) rest = rest.replace(re, " ");
  return rest.split(/[\s,]+/).filter(Boolean).every((w) => /^(and|or|not|only|screen|all)$/i.test(w));
}

const PHYSICAL_PROP = /^(left|right|top|bottom|(margin|padding|border|inset|scroll-margin|scroll-padding)-(left|right|top|bottom)(-[\w-]+)?|border-(top|bottom)-(left|right)-radius|overscroll-behavior-[xy]|overflow-[xy])$/;
const PHYSICAL_VALUE_PROPS = new Set(["float", "clear", "text-align", "caption-side"]);

// Lint one CSS file. relPath is posix, relative to the lint root (e.g. "src/components/button/button.css").
export function lintCss(text, relPath) {
  const findings = [];
  const add = (line, rule, message) => findings.push({ file: relPath, line, rule, message });
  const { tree, errors } = parseCss(text);
  for (const e of errors) add(e.line, "css-syntax", e.message);

  const isIcons = relPath === "src/base/icons.css";
  const compMatch = /^src\/components\/([^/]+)\//.exec(relPath);
  const compName = compMatch ? compMatch[1] : null;
  const isBase = relPath.startsWith("src/base/");

  // Layer wrapping: nothing at top level except @layer <name> { ... } blocks.
  const wantLayer = compName ? "sv.components" : isBase ? "sv.base" : null;
  if (wantLayer) {
    let ok = 0;
    for (const n of tree) {
      if (n.type === "at" && n.name === "layer" && n.children && n.prelude === wantLayer) { ok++; continue; }
      add(n.line, "css-layer", `everything in this file must sit inside @layer ${wantLayer} { … }`);
    }
  }

  const classRe = new RegExp(`^sv-${compName ? compName.replace(/[-]/g, "\\-") : ""}(__[\\w-]+)?$`);

  function checkSelector(sel, line, nested) {
    for (const complex of splitTop(sel)) {
      for (const m of complex.matchAll(/#(-?[_a-zA-Z][\w-]*)(?![^[]*\])/g)) {
        add(line, "css-selector-scope", `"${complex}" targets an id (#${m[1]}); use sv-${compName} classes`);
      }
      const classes = [...complex.matchAll(/\.(-?[_a-zA-Z][\w-]*)(?![^[]*\])/g)].map((m) => m[1]);
      for (const c of classes) {
        if (!classRe.test(c)) add(line, "css-selector-scope", `"${complex}" targets .${c}; a ${compName} file may only target sv-${compName} and sv-${compName}__<part>`);
      }
      if (nested && (complex.includes("&") || /^[>+~]/.test(complex))) continue;
      const first = firstCompound(complex);
      const firstClasses = [...first.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      if (!firstClasses.some((c) => classRe.test(c))) {
        add(line, "css-selector-scope", `"${complex}" must start from an sv-${compName} class; elements and attributes may only appear inside it`);
      }
    }
  }

  function visit(nodes, ctx) {
    for (const n of nodes) {
      if (n.type === "junk") { add(n.line, "css-syntax", `cannot read "${n.text.slice(0, 40)}"`); continue; }
      if (n.type === "at") {
        if (n.name === "media" && !mediaAllowed(n.prelude)) {
          add(n.line, "css-media", `@media ${n.prelude} — only 48rem, prefers-reduced-motion, prefers-color-scheme and forced-colors are allowed`);
        }
        if (n.children) visit(n.children, {
          ...ctx,
          keyframes: ctx.keyframes || /keyframes$/.test(n.name),
          forcedColours: ctx.forcedColours || (n.name === "media" && forcedColoursOnly(n.prelude)),
        });
        continue;
      }
      if (n.type === "rule") {
        if (compName && !ctx.keyframes) checkSelector(n.selector, n.line, ctx.inRule);
        visit(n.children, { ...ctx, inRule: true });
        continue;
      }
      // declaration
      const { prop, value, line } = n;
      if (PHYSICAL_PROP.test(prop)) add(line, "css-physical", `${prop} is a physical property; use the logical one (inline/block, start/end)`);
      if (PHYSICAL_VALUE_PROPS.has(prop) && /(?<![\w-])(left|right|top|bottom)(?![\w-])/i.test(value)) {
        add(line, "css-physical", `${prop}: ${value} is physical; use start/end`);
      }
      for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        const name = m[1];
        if (!name.startsWith("--sv-") || name.startsWith("--sv-p-")) {
          add(line, "css-var-prefix", `var(${name}) — only --sv- semantic or component tokens may be read, never --sv-p- primitives or foreign properties`);
        }
      }
      const { rest, urls } = extractUrls(value);
      const keptUrls = urls.filter((u) => !(isIcons && /^["']?data:/i.test(u)));
      const colourText = stripStrings(rest) + " " + keptUrls.map(unquote).join(" ");
      for (const c of colourFindings(colourText, prop, ctx.forcedColours)) add(line, "css-color", `${prop}: colour value ${c}; use a --sv-color-* token`);
      const unitText = stripStrings(rest).replace(/#[0-9a-f]{3,8}(?![\w-])/gi, " ");
      for (const u of unitFindings(unitText, ctx.keyframes)) add(line, "css-unit", `${prop}: ${u} — a number with a unit; every size comes from a token (only 0, 100%, 50%, 1fr)`);
    }
  }
  visit(tree, { keyframes: false, forcedColours: false, inRule: false });
  return findings;
}

// ---------------------------------------------------------------- HTML parsing

const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

// A flat list of elements in document order. Each element records the tags of its open ancestors
// (el.ancestors, outermost first), from a simple stack: void and self-closed elements are never pushed,
// and a closing tag pops back to its matching open element if there is one.
function parseHtml(text) {
  const lineAt = lineIndex(text);
  const elements = [];
  const stack = [];
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) break;
    if (text.startsWith("<!--", lt)) { const e = text.indexOf("-->", lt + 4); i = e < 0 ? text.length : e + 3; continue; }
    if (text[lt + 1] === "!" || text[lt + 1] === "?") { const e = text.indexOf(">", lt); i = e < 0 ? text.length : e + 1; continue; }
    if (text[lt + 1] === "/") {
      const e = text.indexOf(">", lt);
      const cm = /^<\/([a-zA-Z][\w:.-]*)/.exec(text.slice(lt, lt + 200));
      if (cm) {
        const t = cm[1].toLowerCase();
        const at = stack.map((x) => x.tag).lastIndexOf(t);
        if (at >= 0) stack.length = at;
      }
      i = e < 0 ? text.length : e + 1; continue;
    }
    const nm = /^<([a-zA-Z][\w:.-]*)/.exec(text.slice(lt, lt + 200));
    if (!nm) { i = lt + 1; continue; }
    let j = lt + nm[0].length, q = null;
    while (j < text.length) {
      const c = text[j];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === ">") break;
      j++;
    }
    const rawAttrs = text.slice(lt + nm[0].length, j);
    const selfClosed = /\/\s*$/.test(rawAttrs);
    const attrText = rawAttrs.replace(/\/\s*$/, "");
    const attrs = new Map();
    for (const m of attrText.matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const name = m[1].toLowerCase();
      if (!attrs.has(name)) attrs.set(name, m[2] ?? m[3] ?? m[4] ?? "");
    }
    const tag = nm[1].toLowerCase();
    const el = { tag, attrs, line: lineAt(lt), index: elements.length, content: null, ancestors: stack.map((x) => x.tag) };
    if (!VOID.has(tag) && !selfClosed) stack.push(el);
    i = j + 1;
    if (RAW_TEXT.has(tag)) {
      const close = text.toLowerCase().indexOf(`</${tag}`, i);
      const end = close < 0 ? text.length : close;
      el.content = text.slice(i, end);
      i = end;
    }
    elements.push(el);
  }
  return elements;
}

// Classes and data-attribute values that appear in the built CSS.
export function readBuiltCss(cssText) {
  const css = blankComments(cssText);
  const classes = new Set();
  const values = new Map();
  // only selectors: drop declaration blocks' contents roughly by scanning prelude text
  const { tree } = parseCss(css);
  const selectors = [];
  (function collect(nodes) {
    for (const n of nodes) {
      if (n.type === "rule") { selectors.push(n.selector); collect(n.children); }
      else if (n.type === "at" && n.children) collect(n.children);
    }
  })(tree);
  for (const sel of selectors) {
    for (const m of sel.matchAll(/\.(sv-[\w-]+)/g)) classes.add(m[1]);
    for (const m of sel.matchAll(/\[\s*(data-[\w-]+)\s*(~?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))\s*(?:[is]\s*)?\]/g)) {
      const v = m[3] ?? m[4] ?? m[5];
      if (!values.has(m[1])) values.set(m[1], new Set());
      values.get(m[1]).add(v);
    }
  }
  return { classes, values };
}

const CHECKED_DATA = ["data-variant", "data-tone", "data-width", "data-layout", "data-gap", "data-from", "data-row", "data-state", "data-surface", "data-align", "data-length"];

// Controls that need a label (html-control-no-label): input other than these types, select, textarea.
const UNLABELLED_INPUT_TYPES = new Set(["hidden", "submit", "button", "reset"]);

// Page-level rules (AGENTS.md rules 4, 6, 7 and 8). kind "snippet" is exempt from the first-heading part;
// a file whose name begins demo- is exempt from html-many-primary (a demo page shows every variant).
function pageRules(els, relPath, kind, add) {
  const demo = basename(relPath).startsWith("demo-");
  const primaries = els.filter((el) => el.attrs.get("data-variant") === "primary");
  if (!demo && primaries.length > 1) {
    for (const el of primaries.slice(1)) add(el.line, "html-many-primary", `${primaries.length} elements have data-variant="primary" (first at line ${primaries[0].line}); a page has at most one primary action`);
  }
  const labelFor = new Set(els.filter((el) => el.tag === "label" && el.attrs.get("for")).map((el) => el.attrs.get("for")));
  const named = (el, a) => (el.attrs.get(a) || "").trim() !== "";
  let prevLevel = 0, h1s = 0;
  for (const el of els) {
    const { tag, attrs, line } = el;
    if (tag === "form" && !(attrs.has("method") && attrs.has("action"))) {
      add(line, "html-form-no-action", `<form> needs both method and action so it works without script (has ${["method", "action"].filter((a) => attrs.has(a)).join(" and ") || "neither"})`);
    }
    if (tag === "button" && !attrs.has("type")) add(line, "html-button-no-type", `<button> has no type; say type="submit" or type="button"`);
    const isControl = (tag === "input" && !UNLABELLED_INPUT_TYPES.has((attrs.get("type") || "text").trim().toLowerCase())) || tag === "select" || tag === "textarea";
    if (isControl) {
      const id = attrs.get("id");
      const ok = (id && labelFor.has(id)) || el.ancestors.includes("label") || named(el, "aria-label") || named(el, "aria-labelledby");
      if (!ok) add(line, "html-control-no-label", `<${tag}${attrs.has("type") ? ` type="${attrs.get("type")}"` : ""}${id ? ` id="${id}"` : ""}> has no label: no <label for>, no wrapping <label>, no aria-label or aria-labelledby`);
    }
    if ((tag === "input" || tag === "textarea") && attrs.has("placeholder")) {
      add(line, "html-placeholder-label", `<${tag}> has a placeholder; the system does not use placeholders, put the words in the label or a hint`);
    }
    const h = /^h([1-6])$/.exec(tag);
    if (h) {
      const level = Number(h[1]);
      if (level === 1 && ++h1s > 1) add(line, "html-heading-order", "more than one h1 on the page");
      if (prevLevel === 0 && level !== 1 && kind !== "snippet") add(line, "html-heading-order", `the first heading is an h${level}; a page starts with its h1`);
      if (prevLevel > 0 && level > prevLevel + 1) add(line, "html-heading-order", `h${level} follows h${prevLevel}; a heading goes at most one level deeper than the one before it`);
      prevLevel = level;
    }
  }
}

const THEME_SCRIPT_WORDS = new Set(["var", "let", "const", "new", "URLSearchParams", "location", "search", "get", "has", "if", "else",
  "document", "documentElement", "dataset", "setAttribute", "theme", "accent", "null", "undefined", "true", "false", "typeof", "includes", "indexOf"]);
const THEME_SCRIPT_STRINGS = new Set(["theme", "accent", "light", "dark", "blue", "teal", "data-theme", "data-accent"]);
const THEME_SCRIPT_MAX = 400;

function themeScriptProblem(code) {
  if (code.length > THEME_SCRIPT_MAX) return `inline script is ${code.length} characters; the theme script may be at most ${THEME_SCRIPT_MAX}`;
  const strings = [...code.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  for (const s of strings) if (!THEME_SCRIPT_STRINGS.has(s)) return `inline script uses the string "${s}"; only theme and accent handling is allowed inline`;
  const bare = code.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g, '""');
  if (/[`<]|=>|\bfunction\b/.test(bare)) return "inline script may only read ?theme= and ?accent= and set data-theme and data-accent";
  // names the script itself assigns (var p=…, t=…) are its own locals
  const declared = new Set([...bare.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*=(?![=>])/g)].map((m) => m[1]));
  for (const m of bare.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (!THEME_SCRIPT_WORDS.has(m[0]) && !declared.has(m[0])) return `inline script uses "${m[0]}"; only theme and accent handling is allowed inline`;
  }
  return null;
}

function isRelative(url) { return !/^([a-z][\w+.-]*:|\/)/i.test(url); }

// Lint HTML. kind: "document" (a file in screens/) or "snippet" (a code fence in docs/components/*.md).
// fileAbs is used to resolve relative links for documents; rootAbs is the lint root.
export function lintHtml(text, relPath, { kind, fileAbs, rootAbs, built, lineOffset = 0 }) {
  const findings = [];
  const add = (line, rule, message) => findings.push({ file: relPath, line: line + lineOffset, rule, message });
  const els = parseHtml(text);

  let stylesheetIndex = -1, stylesheets = 0, moduleScripts = 0, inlineScripts = 0;
  const wantCss = rootAbs ? join(rootAbs, "dist", "souvenir.css") : null;
  const wantJs = rootAbs ? join(rootAbs, "dist", "souvenir.js") : null;
  const pointsTo = (url, want, suffix) => {
    if (!url || !isRelative(url)) return false;
    const clean = url.split(/[?#]/)[0];
    if (kind === "document" && fileAbs && want) return resolve(dirname(fileAbs), clean) === want;
    return clean.endsWith(suffix);
  };

  for (const el of els) {
    const { tag, attrs, line } = el;
    if (tag === "style") add(line, "html-style-element", "no <style> element; use system classes");
    if (attrs.has("style")) add(line, "html-style-attr", "no style attribute; use system classes");
    if (tag === "svg") add(line, "html-inline-svg", "no inline <svg>; marks come from src/base/icons.css");
    if (tag.includes("-") && !tag.startsWith("sv-")) add(line, "html-custom-element", `<${tag}> — custom elements must begin sv-`);
    for (const [name, val] of attrs) {
      if (/^on[a-z]+$/.test(name)) add(line, "html-inline-script", `${name}="…" — no inline event handlers`);
      if ((name === "href" || name === "src" || name === "action" || name === "formaction") && /^\s*javascript:/i.test(val)) {
        add(line, "html-inline-script", `${name}="javascript:…" — no inline script`);
      }
    }
    if (attrs.has("class")) {
      for (const c of attrs.get("class").split(/\s+/).filter(Boolean)) {
        if (!c.startsWith("sv-")) add(line, "html-class-prefix", `class "${c}" does not begin sv-`);
        else if (!built.classes.has(c)) add(line, "html-unknown-class", `class "${c}" is not in the built CSS (dist/souvenir.css)`);
      }
    }
    for (const a of CHECKED_DATA) {
      if (!attrs.has(a)) continue;
      const v = attrs.get(a);
      if (!(built.values.get(a)?.has(v))) add(line, "html-unknown-value", `${a}="${v}" does not appear in any selector of the built CSS`);
    }
    if (tag === "link" && /(^|\s)stylesheet(\s|$)/i.test(attrs.get("rel") || "")) {
      stylesheets++;
      if (stylesheetIndex < 0) stylesheetIndex = el.index;
      if (stylesheets > 1) add(line, "html-stylesheet", "only one stylesheet link is allowed");
      else if (!pointsTo(attrs.get("href"), wantCss, "dist/souvenir.css")) add(line, "html-stylesheet", `stylesheet must be a relative link to dist/souvenir.css, not "${attrs.get("href")}"`);
    }
    if (tag === "script") {
      if (attrs.has("src")) {
        moduleScripts++;
        if (moduleScripts > 1) add(line, "html-module-script", "at most one script file is allowed");
        else if ((attrs.get("type") || "").toLowerCase() !== "module" || !pointsTo(attrs.get("src"), wantJs, "dist/souvenir.js")) {
          add(line, "html-module-script", `the one script must be <script type="module" src="…/dist/souvenir.js">, not "${attrs.get("src")}"`);
        }
      } else {
        inlineScripts++;
        if (kind === "snippet") add(line, "html-inline-script", "no inline script in a component snippet");
        else if (inlineScripts > 1) add(line, "html-inline-script", "only one inline script (the theme script) is allowed");
        else {
          const p = themeScriptProblem((el.content || "").trim());
          if (p) add(line, "html-inline-script", p);
          else if (stylesheetIndex >= 0 && stylesheetIndex < el.index) add(line, "html-inline-script", "the theme script must come before the stylesheet link");
        }
      }
    }
  }
  if (kind === "document" && stylesheets === 0) add(1, "html-stylesheet", "a screen needs exactly one stylesheet link, to dist/souvenir.css");
  pageRules(els, relPath, kind, (line, rule, message) => add(line, rule, message));
  return findings;
}

// Every ```html fence is linted. A fence that begins <!doctype is a whole page and is linted as a document
// (the theme script is allowed, the stylesheet link is required), with its links resolved as if it sat in screens/,
// because the notes say paths are relative to screens/. Any other fence is a fragment ("snippet").
function lintMarkdown(text, relPath, ctx) {
  const lines = text.split("\n");
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*```\s*html\s*$/i.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++;
    const snippet = lines.slice(i + 1, j).join("\n");
    const whole = /^\s*<!doctype\s/i.test(snippet);
    const opts = whole && ctx.rootAbs
      ? { ...ctx, kind: "document", fileAbs: join(ctx.rootAbs, "screens", "_snippet.html"), lineOffset: i + 1 }
      : { ...ctx, kind: "snippet", lineOffset: i + 1 };
    findings.push(...lintHtml(snippet, relPath, opts));
    i = j;
  }
  return findings;
}

// ---------------------------------------------------------------- run

function loadBuilt(rootAbs) {
  const p = join(rootAbs, "dist", "souvenir.css");
  if (!existsSync(p)) return { built: { classes: new Set(), values: new Map() }, missing: true };
  return { built: readBuiltCss(readFileSync(p, "utf8")), missing: false };
}

export function lintFile(fileAbs, rootAbs, built) {
  const rel = toPosix(relative(rootAbs, fileAbs));
  const text = readFileSync(fileAbs, "utf8");
  const ext = extname(fileAbs).toLowerCase();
  if (ext === ".css") return lintCss(text, rel);
  if (ext === ".html") return lintHtml(text, rel, { kind: "document", fileAbs, rootAbs, built });
  if (ext === ".md") return lintMarkdown(text, rel, { fileAbs, rootAbs, built });
  return [];
}

export function lintFiles(rootAbs) {
  return [
    ...walk(join(rootAbs, "src"), (p) => p.endsWith(".css")),
    ...walk(join(rootAbs, "screens"), (p) => p.endsWith(".html")),
    ...walk(join(rootAbs, "docs", "components"), (p) => p.endsWith(".md")),
    ...DOC_FILES.map((p) => join(rootAbs, p)).filter((p) => existsSync(p)),
  ];
}

// Notes outside docs/components whose html fences are linted too (any of them may not exist yet).
const DOC_FILES = ["docs/layout.md", "docs/patterns.md", "AGENTS.md"];

function print(f) { console.log(`${f.file}:${f.line} ${f.rule} ${f.message}`); }

function runNormal() {
  const files = lintFiles(REPO);
  const { built, missing } = loadBuilt(REPO);
  const findings = [];
  const needsBuilt = files.some((f) => !f.endsWith(".css"));
  if (needsBuilt && !missing) {
    const builtAt = statSync(join(REPO, "dist", "souvenir.css")).mtimeMs;
    const newer = files.filter((f) => f.endsWith(".css") && statSync(f).mtimeMs > builtAt);
    if (newer.length) console.warn(`lint: warning: ${newer.length} file(s) in src/ are newer than dist/souvenir.css (${toPosix(relative(REPO, newer[0]))}…); class and option checks use the last build — run node scripts/build.mjs`);
  }
  if (needsBuilt && missing) findings.push({ file: "dist/souvenir.css", line: 1, rule: "html-unknown-class", message: "dist/souvenir.css is missing, so no class or option can be verified; run node scripts/build.mjs first" });
  for (const f of files) findings.push(...lintFile(f, REPO, built));
  findings.forEach(print);
  const counts = { css: files.filter((f) => f.endsWith(".css")).length, html: files.filter((f) => f.endsWith(".html")).length, md: files.filter((f) => f.endsWith(".md")).length };
  console.log(`lint: ${files.length} files (${counts.css} css, ${counts.html} html, ${counts.md} md), ${findings.length} finding${findings.length === 1 ? "" : "s"}`);
  return findings.length ? 1 : 0;
}

// Every rule the lint can report. The self-test fails unless each is seen failing on a fixture.
const REQUIRED_RULES = ["css-syntax", "css-layer", "css-selector-scope", "css-media", "css-physical", "css-var-prefix", "css-color", "css-unit",
  "html-style-element", "html-style-attr", "html-inline-svg", "html-custom-element", "html-inline-script", "html-class-prefix",
  "html-unknown-class", "html-unknown-value", "html-stylesheet", "html-module-script",
  "html-many-primary", "html-form-no-action", "html-button-no-type", "html-control-no-label", "html-heading-order", "html-placeholder-label"];

function runSelfTest() {
  const root = join(REPO, "scripts", "fixtures", "lint");
  const files = lintFiles(root);
  const { built, missing } = loadBuilt(root);
  if (missing) { console.log("self-test: scripts/fixtures/lint/dist/souvenir.css is missing"); return 1; }
  let failures = 0;
  const badRules = new Set();
  let cleanCss = 0, cleanHtml = 0;
  console.log("lint self-test: each bad fixture must produce exactly its named rule; clean fixtures nothing");
  for (const f of files) {
    const rel = toPosix(relative(root, f));
    // Files that must keep a fixed name (AGENTS.md, docs/layout.md, docs/patterns.md) state their expectation
    // in a comment: <!-- lint-expect: <rule> --> or <!-- lint-expect: nothing -->.
    const marker = /<!--\s*lint-expect:\s*([\w-]+)\s*-->/.exec(readFileSync(f, "utf8"));
    const stem = marker ? marker[1] : basename(f, extname(f)).split("--")[0];
    // src/base/icons.css must keep its real name for its data-URI exemption, so it is a clean fixture too.
    // A file named demo-… must produce nothing (it proves the demo exemption of html-many-primary).
    const clean = stem.startsWith("clean") || stem === "nothing" || stem.startsWith("demo-") || rel === "src/base/icons.css";
    const got = lintFile(f, root, built);
    const rules = [...new Set(got.map((x) => x.rule))].sort();
    let ok;
    if (clean) {
      ok = got.length === 0;
      if (ok && f.endsWith(".css")) cleanCss++;
      if (ok && (f.endsWith(".html") || f.endsWith(".md"))) cleanHtml++;
    } else {
      ok = rules.length === 1 && rules[0] === stem;
      if (ok) badRules.add(stem);
    }
    if (!ok) failures++;
    const shown = got.length ? got.map((x) => `${x.rule}@${x.line}`).join(", ") : "no findings";
    console.log(`${ok ? "PASS" : "FAIL"}  ${rel.padEnd(52)} expect ${clean ? "nothing" : stem}; got ${shown}`);
    if (!ok) got.forEach((x) => console.log("      " + `${x.file}:${x.line} ${x.rule} ${x.message}`));
  }
  if (badRules.size < 12) { console.log(`FAIL  only ${badRules.size} distinct rules proven failing; need at least 12`); failures++; }
  const never = REQUIRED_RULES.filter((r) => !badRules.has(r));
  if (never.length) { console.log(`FAIL  rules never seen failing: ${never.join(", ")}`); failures++; }
  if (!cleanCss || !cleanHtml) { console.log("FAIL  need at least one clean CSS and one clean HTML fixture passing"); failures++; }
  console.log(`lint self-test: ${files.length} fixtures, ${badRules.size} rules seen failing, ${failures} problem${failures === 1 ? "" : "s"}`);
  return failures ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  process.exitCode = process.argv.includes("--self-test") ? runSelfTest() : runNormal();
}
