#!/usr/bin/env node
// Proves, in a real browser, that each component does what its spec says.
//
//   node v2/tools/test-components.mjs                      test every component that has a spec and an examples file
//   node v2/tools/test-components.mjs --component button   one component (--component fixture runs the test fixture)
//   node v2/tools/test-components.mjs --example primary    only that example of each component tested
//   node v2/tools/test-components.mjs --shots <dir>        also save full-page PNGs (every example at 375 and 1280
//                                                          wide in light and dark, each component page, the token page)
//   node v2/tools/test-components.mjs --gallery-shots      save the gallery index and token page to ds-components/gallery/dist/
//   node v2/tools/test-components.mjs --headed             show the browser
//   node v2/tools/test-components.mjs --dist <dir>         test the gallery bundle already in <dir> and build nothing
//                                                          (build it first: build-gallery.mjs --dist <dir> --component <slug>)
//   node v2/tools/test-components.mjs --report <file>      write the JSON report there, also on a filtered run
//                                                          (default ds-components/generated/test-report.json, full runs only)
//   node v2/tools/test-components.mjs --self-test          run against the fixture component, whose examples plant
//                                                          known faults, and confirm each is caught by the right check
//
// Without --dist it rebuilds the gallery (v2/tools/build-gallery.mjs) into ds-components/gallery/dist/; with --dist
// it builds nothing. It serves the bundle folder with scripts/serve.mjs and opens each example on its own page
// (index.html?component=<slug>&example=<id>) in headless Chromium. Per component:
//   a. Generic checks on every example in light and dark at 320 and 1280 wide, and once in compact density:
//      errors (no page or console error), axe (serious or critical violations fail; others are reported),
//      overflow (no horizontal scroll), contrast (every visible text node, computed in the page),
//      target-size (WCAG 2.5.8 as written: a target under 24 by 24 passes when a 24 px circle centred on its box
//      meets no other target and no other undersized target's circle, or when it is inline in a sentence; a
//      tabpanel, a dialog's own container, a scrollable region made focusable with tabindex and Radix's focus
//      guards take focus but are not pointer targets, and are not measured),
//      focus-visible (every control reached by real Tab presses shows an indicator: an outline at least 2 px wide
//      on itself or on its nearest ancestor whose data-slot names a part the spec's accessibility.focus.ring names,
//      as Input's control draws the ring through :focus-within; for a menuitem, menuitemcheckbox or menuitemradio
//      part, [data-highlighted] with a background at least 3 to 1 against the menu surface; Radix's focus guards
//      are skipped).
//   b. anatomy: every required part that has an element appears with its data-slot across the examples, found
//      document-wide (a portalled part sits outside its example's section); no unlisted data-slot. A part whose
//      element is null renders nothing and is not looked for. data-slot is a space-separated list of slot names,
//      so every part is found by the word ([data-slot~="x"]) and each word of every value is checked.
//   c. state:<name>: each state is driven as its "reach" says (the grammar is at parseReach below: steps joined by
//      " > ", such as "open > key:ArrowDown@item" or "prop:item.disabled=true"; a reach it cannot parse is "reach
//      not understood"), on an instance chosen as __ct.pick says (visible, not disabled unless the state is the
//      disabled one, able to take focus when the state needs keyboard focus, never in a stronger state, found
//      document-wide), and the part must match its selector. Colours named by the spec's rules for that state are
//      compared with tokens.json for the theme; an optional part the example does not render is "not present".
//   d. requirement: test:<id> runs <slug>.tests.mjs; axe:<rule> passes when no example breaks that rule;
//      type:<id> passes when "npx tsc -p ds-components/tsconfig.json" exits 0 (run once per run) and a line of the
//      component's hand-written source holds both "@ts-expect-error" and <id>, and is "not proven" otherwise;
//      lint: and manual: are listed as not run.
// Writes ds-components/generated/test-report.json (not in --self-test, or when filtered by --component or --example,
// unless --report names a file) and exits 1 on any failure. The last line counts components, examples, checks,
// passes, failures and checks not reached, not run or not proven.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir, tmpdir } from "node:os";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createServer } from "../../scripts/serve.mjs";
import { spawnSync } from "node:child_process";
import { buildGallery, discoverComponents, REPO, DEFAULT_DIST } from "./build-gallery.mjs";

const require = createRequire(import.meta.url);
const SPECS = join(REPO, "ds-components", "specs");
const SCHEMA_FILE = join(REPO, "ds-components", "schema", "component.schema.json");
const TOKENS_JSON = join(REPO, "ds-tokens", "dist", "tokens.json");
const PROPOSED_JSON = join(REPO, "ds-tokens", "proposed", "tokens.json");
const REPORT = join(REPO, "ds-components", "generated", "test-report.json");
const SRC = join(REPO, "ds-components", "src");
const AXE_SOURCE = readFileSync(join(REPO, "node_modules", "axe-core", "axe.min.js"), "utf8");
const GENERATOR = "v2/tools/test-components.mjs";

const GENERIC_CONFIGS = [
  { theme: "light", width: 320, density: "standard" },
  { theme: "light", width: 1280, density: "standard" },
  { theme: "dark", width: 320, density: "standard" },
  { theme: "dark", width: 1280, density: "standard" },
  { theme: "light", width: 320, density: "compact" },
];
const GENERIC_CHECKS = ["errors", "axe", "overflow", "contrast", "target-size", "focus-visible"];
const STATE_WIDTH = 1280;
const NO_MOTION = "*, *::before, *::after { transition: none !important; animation: none !important; }";
const KEYWORDS = new Set(["none", "transparent", "current", "inherit", "full"]);
const COLOUR_PROPS = { background: "background-color", color: "color", borderColor: "border-color" };

const rel = (p) => relative(REPO, p).split(sep).join("/");
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const obj = (x) => (isObj(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const cfgLabel = (c) => (c ? `${c.theme} ${c.width}${c.density === "compact" ? " compact" : ""}` : "");
// data-slot is a space-separated list of slot names, like a class list (a Button inside DropdownMenuTrigger asChild
// carries "button dropdown-menu-trigger"), so a part is found by the word, never by the whole attribute.
const slotSel = (slot) => `[data-slot~=${JSON.stringify(String(slot))}]`;
const MENU_ITEM_ROLES = new Set(["menuitem", "menuitemcheckbox", "menuitemradio"]);

// ---------------------------------------------------------------- Chromium (approach from scripts/check-screens.mjs, no download)

function cachedChromiums() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), "Library", "Caches", "ms-playwright"), join(homedir(), ".cache", "ms-playwright")].filter(Boolean);
  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const revs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const rev of revs) {
      const dir = join(root, rev);
      for (const sub of readdirSync(dir)) {
        const base = join(dir, sub);
        for (const c of [
          join(base, "Chromium.app", "Contents", "MacOS", "Chromium"),
          join(base, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
          join(base, "chrome"),
        ]) if (existsSync(c)) found.push(c);
      }
    }
  }
  return found;
}

export async function launchChromium({ headed = false } = {}) {
  const tried = [];
  let own = null;
  try { own = chromium.executablePath(); } catch { /* unknown */ }
  const candidates = [process.env.PLAYWRIGHT_CHROMIUM, own, ...cachedChromiums()].filter((p, i, all) => p && all.indexOf(p) === i);
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try { return { browser: await chromium.launch({ executablePath: path, headless: !headed }), path }; }
    catch (e) { tried.push(`${path}: ${e.message.split("\n")[0]}`); }
  }
  throw new Error(`could not launch Chromium (this tool does not download one). Tried:\n  ${tried.join("\n  ") || "(nothing found in the Playwright cache)"}`);
}

// ---------------------------------------------------------------- colours and tokens

function parseCssColour(s) {
  if (typeof s !== "string") return null;
  const t = s.trim().toLowerCase();
  if (t === "transparent") return [0, 0, 0, 0];
  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1];
  }
  m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  m = t.match(/^color\(srgb ([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
  return null;
}
const sameColour = (a, b) => a && b && Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1 && Math.abs(a[2] - b[2]) <= 1 && Math.abs(a[3] - b[3]) <= 0.01;
const showColour = (c) => (c ? (c[3] >= 1 ? `rgb(${c.slice(0, 3).map(Math.round).join(", ")})` : `rgba(${c.slice(0, 3).map(Math.round).join(", ")}, ${c[3]})`) : "unreadable");

// Colour tokens by Figma path, from tokens.json and then the proposed file.
function loadColourTokens() {
  const map = new Map();
  const add = (t, source) => {
    if (!isObj(t) || typeof t.name !== "string") return;
    if (t.collection !== "Themes") return;
    if (!map.has(t.name)) map.set(t.name, { values: isObj(t.values) ? t.values : null, source });
  };
  try { for (const t of arr(JSON.parse(readFileSync(TOKENS_JSON, "utf8")))) add(t, "ds-tokens/dist/tokens.json"); } catch { /* reported per lookup */ }
  try { for (const t of arr(JSON.parse(readFileSync(PROPOSED_JSON, "utf8")))) add(t, "ds-tokens/proposed/tokens.json"); } catch { /* reported per lookup */ }
  return map;
}

// Returns { rgba, raw, source } or { problem }.
function resolveColourToken(map, name, theme) {
  const entry = map.get(name) ?? map.get(`${name}/default`);
  if (!entry) return { problem: `"${name}" is not a colour token in ds-tokens/dist/tokens.json or ds-tokens/proposed/tokens.json` };
  const raw = entry.values ? entry.values[theme] ?? entry.values.default : undefined;
  if (raw === undefined || raw === null) return { problem: `"${name}" (${entry.source}) has no value for ${theme}` };
  const rgba = parseCssColour(String(raw));
  if (!rgba) return { problem: `"${name}" has the value ${JSON.stringify(raw)}, which is not a colour this tool reads` };
  return { rgba, raw: String(raw), source: entry.source };
}

// ---------------------------------------------------------------- spec reading

let schemaValidator = null;
function validateSpec(spec) {
  if (!schemaValidator) {
    const Ajv2020 = require("ajv/dist/2020.js");
    const Ajv = Ajv2020.default ?? Ajv2020;
    schemaValidator = new Ajv({ strict: false, allErrors: true, validateFormats: false, logger: false }).compile(JSON.parse(readFileSync(SCHEMA_FILE, "utf8")));
  }
  if (schemaValidator(spec)) return [];
  return (schemaValidator.errors || []).map((e) => `${e.instancePath || "(top)"} ${e.message}`);
}

// Reads a spec file. Returns { spec, problems: [] } or { spec: null, problems: [why] }.
function readSpec(file) {
  if (!existsSync(file)) return { spec: null, problems: [`no spec at ${rel(file)}`] };
  let spec;
  try { spec = JSON.parse(readFileSync(file, "utf8")); } catch (e) { return { spec: null, problems: [`${rel(file)} is not readable JSON: ${e.message}`] }; }
  if (!isObj(spec)) return { spec: null, problems: [`${rel(file)} is not a JSON object`] };
  return { spec, problems: validateSpec(spec) };
}

const parseReachValue = (v) => (v === "true" ? true : v === "false" ? false : v !== "" && !Number.isNaN(Number(v)) ? Number(v) : v);
const propEquals = (actual, wanted) => actual === wanted || (actual !== undefined && String(actual) === String(wanted));

// ---------------------------------------------------------------- reach grammar
// A state's "reach" says how a test puts the component into it. Steps are joined by " > " and run in order:
//   hover | press | focus-by-keyboard | click | key:<Key>   an action on a part; <Key> is a key name such as
//                                                          ArrowDown, Escape or Shift+Tab, nothing more
//   prop:<name>=<value>[&<name>=<value>...]               choose an example whose props say so; a name part.prop
//                                                          also matches a prop of that part anywhere inside the
//                                                          example's content structure
//   open                                                   click the component's trigger part, unless the example
//                                                          is already open
//   example:<id>                                           use exactly that example
// An action may end in "@<part>" (click@trigger, hover@item) to name the part it acts on; the state's own part is the
// default. A prop step takes no "@<part>", so a value may hold "@" (prop:placeholder=name@example.com).
// Returns { steps } or { error }; a reach that does not parse is "reach not understood", never guessed.
const REACH_ACTIONS = new Set(["hover", "press", "focus-by-keyboard", "click"]);
const KEY_NAME = /^[A-Za-z0-9]+(\+[A-Za-z0-9]+)*$/;
const PROP_NAME = /^[a-z][A-Za-z]*(\.[a-z][A-Za-z]*)?$/;
export function parseReach(reach, partKeys = []) {
  const text = typeof reach === "string" ? reach.trim() : "";
  if (!text) return { error: "the state has no reach" };
  const steps = [];
  for (const raw of text.split(" > ")) {
    let step = raw.trim();
    if (!step) return { error: `an empty step in "${text}"` };
    if (step.startsWith("prop:")) {
      const props = [];
      for (const pair of step.slice(5).split("&")) {
        const eq = pair.indexOf("=");
        const name = eq < 0 ? pair : pair.slice(0, eq);
        if (eq < 0 || !PROP_NAME.test(name)) return { error: `"${pair}" in "${step}" is not <name>=<value>` };
        props.push([name, parseReachValue(pair.slice(eq + 1))]);
      }
      steps.push({ kind: "prop", props });
      continue;
    }
    if (step.startsWith("example:")) {
      const id = step.slice(8);
      if (!/^[a-z][a-z0-9-]*$/.test(id)) return { error: `"${step}" does not name an example id` };
      steps.push({ kind: "example", id });
      continue;
    }
    let target = null;
    const at = step.lastIndexOf("@");
    if (at > 0) {
      target = step.slice(at + 1);
      if (!partKeys.includes(target)) return { error: `"@${target}" in "${step}" is not a part of the spec` };
      step = step.slice(0, at);
    }
    if (REACH_ACTIONS.has(step)) steps.push({ kind: step, target });
    else if (step === "open") steps.push({ kind: "open", target });
    else if (step.startsWith("key:") && KEY_NAME.test(step.slice(4))) steps.push({ kind: "key", key: step.slice(4), target });
    else return { error: `"${raw.trim()}" is not a step of the reach grammar (hover, press, focus-by-keyboard, click, key:<Key>, prop:<name>=<value>, open, example:<id>, each action optionally @<part>, joined by " > ")` };
  }
  return { steps };
}

// Whether an example has a prop at a value. A plain name is one of the example's own props (or the spec's default).
// A name part.prop may also sit on any object inside the example's content structure: under its full key
// ("item.disabled": true), or as the bare prop ("disabled": true) on an object that is that part's (its "part" field
// names it) or names no part at all (a list of tab descriptors), never on an object that names another part.
// Every value the content sets for the prop.
function inContent(node, full, part, bare, found = [], owner = null) {
  if (Array.isArray(node)) { for (const n of node) inContent(n, full, part, bare, found, owner); return found; }
  if (!isObj(node)) return found;
  const own = typeof node.part === "string" ? node.part : owner;
  for (const [k, v] of Object.entries(node)) {
    if (k === full || (k === bare && (own === null || own === part))) { if (!isObj(v) && !Array.isArray(v)) found.push(v); }
    else if (isObj(v) || Array.isArray(v)) inContent(v, full, part, bare, found, own);
  }
  return found;
}
// The example's own props decide first; then, for a part.prop name, any value the content sets (one instance with
// the value is enough); the spec's default only when neither sets the prop.
export function exampleHasProp(example, name, value, defaults = {}) {
  const props = obj(example.props);
  if (has(props, name)) return propEquals(props[name], value);
  const dot = name.indexOf(".");
  const found = dot > 0 ? inContent(example.content, name, name.slice(0, dot), name.slice(dot + 1)) : [];
  if (found.length) return found.some((v) => propEquals(v, value));
  return propEquals(defaults[name], value);
}

// The states that decide a part's look over this one, as the generator writes them: only a state listed in
// precedence excludes the stronger states before it on the same part; a state not listed excludes none.
export function strongerStates(name, states, precedence) {
  const i = precedence.indexOf(name);
  if (i < 0) return [];
  return precedence.slice(0, i).filter((s) => s !== name && isObj(states[s]) && states[s].on === obj(states[name]).on);
}

// What the generic focus check may accept: the slots of the parts accessibility.focus.ring names (matched as whole
// words against the anatomy keys), and the slots of menu item parts and of the menu surface.
export function focusInfoOf(spec) {
  const anatomy = obj(spec.anatomy);
  const ring = String(obj(obj(spec.accessibility).focus).ring ?? "");
  const words = new Set(ring.split(/[^A-Za-z0-9-]+/).filter(Boolean));
  const parts = Object.entries(anatomy).filter(([, p]) => isObj(p) && p.element !== null && typeof p.slot === "string");
  return {
    ringSlots: parts.filter(([k, p]) => words.has(k) || words.has(p.slot)).map(([, p]) => p.slot),
    menuItemSlots: parts.filter(([, p]) => MENU_ITEM_ROLES.has(p.role)).map(([, p]) => p.slot),
    menuSlots: parts.filter(([, p]) => p.role === "menu").map(([, p]) => p.slot),
  };
}

// Compares the colours the spec's rules give each part in a state with what the page shows. A part the rules colour
// but the page does not render is "not present" when the anatomy marks it optional (required: false), and a problem
// when it is required. Returns { problems, compared, notPresent }.
export function compareStateColours({ anatomy, applies, name, colours, theme, colourTokens }) {
  const problems = [], compared = [], notPresent = [];
  for (const partKey of Object.keys(anatomy)) {
    for (const [prop, cssName] of Object.entries(COLOUR_PROPS)) {
      let token = null, fromState = false;
      for (const r of applies) {
        const decl = obj(obj(r.parts)[partKey]);
        if (decl[prop] === undefined) continue;
        token = decl[prop];
        if (arr(obj(r.when).states).includes(name)) fromState = true;
      }
      if (!fromState || token === null || KEYWORDS.has(token)) continue;
      const actual = colours[partKey];
      if (!actual) {
        if (obj(anatomy[partKey]).required === false) { if (!notPresent.includes(partKey)) notPresent.push(partKey); continue; }
        problems.push(`${partKey} is not found next to the part, so its ${cssName} cannot be compared`);
        continue;
      }
      const want = resolveColourToken(colourTokens, String(token), theme);
      if (want.problem) { problems.push(`${partKey} ${cssName}: ${want.problem}`); continue; }
      const got = prop === "borderColor" ? actual.borderColor : [actual[prop]];
      const bad = got.map(parseCssColour).find((g) => !sameColour(g, want.rgba));
      compared.push(`${partKey} ${cssName}`);
      if (bad !== undefined) problems.push(`${partKey} ${cssName} is ${showColour(bad)}, but ${token} is ${want.raw} (${showColour(want.rgba)}) in ${theme}`);
    }
  }
  return { problems, compared, notPresent };
}

// ---------------------------------------------------------------- in-page library
// Evaluated in the page after each load. Adds window.__ct with the measurements; changes nothing else.
function pageLib() {
  if (window.__ct) return;
  const parse = (s) => {
    if (!s || s === "transparent") return [0, 0, 0, 0];
    let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;
  };
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    const ch = (i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
    return [ch(0), ch(1), ch(2), a];
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    const slot = el.getAttribute("data-slot");
    if (slot) s += `[data-slot="${slot}"]`;
    else if (el.id) s += `#${el.id}`;
    return s;
  };
  // The colour behind an element: walk up to the first opaque background, compositing every translucent one.
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  let keys = 0;
  window.__ct = {
    contrast() {
      const failures = [];
      let checked = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        const el = n.parentElement;
        if (!el || el.closest("script, style, noscript, template")) continue;
        if (el.closest(':disabled, [aria-disabled="true"]')) continue;
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        if (![...range.getClientRects()].some((r) => r.width > 1 && r.height > 1)) continue;
        const cs = getComputedStyle(el);
        const bg = backgroundOf(el);
        const fg = over(parse(cs.color) || [0, 0, 0, 1], bg);
        const r = ratio(fg, bg);
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const need = large ? 3 : 4.5;
        checked++;
        if (r < need) failures.push({ text: n.nodeValue.trim().slice(0, 40), where: describe(el), ratio: Math.floor(r * 100) / 100, need, fg: hex(fg), bg: hex(bg) });
      }
      return { checked, failures };
    },
    // WCAG 2.5.8 as written. A target under 24 by 24 passes when a 24 px circle centred on its box meets no other
    // target and no other undersized target's circle (the spacing exception), or when it is inline in a sentence.
    // Elements that take focus but are not pointer targets are not measured: role tabpanel, dialog or alertdialog,
    // a scrollable region made focusable with tabindex, and Radix's focus guards.
    targets() {
      const sel = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable="true"], [contenteditable=""]';
      const NATIVE = 'a[href], area[href], button, input, select, textarea, summary, iframe, [contenteditable="true"], [contenteditable=""]';
      const failures = [];
      const list = [];
      let notTargets = 0, spaced = 0, inline = 0;
      const scrollRegion = (el, cs) => !el.matches(NATIVE) && el.hasAttribute("tabindex") &&
        ((/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1));
      for (const el of document.querySelectorAll(sel)) {
        if (el.matches(":disabled") || el.tabIndex < 0) continue;
        if (el.hasAttribute("data-radix-focus-guard")) continue;
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const role = el.getAttribute("role");
        if (role === "tabpanel" || role === "dialog" || role === "alertdialog" || scrollRegion(el, getComputedStyle(el))) { notTargets++; continue; }
        list.push({ el, r });
      }
      const small = (t) => t.r.width < 23.99 || t.r.height < 23.99;
      const centre = (r) => [r.left + r.width / 2, r.top + r.height / 2];
      const toRect = ([x, y], r) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      const inSentence = (el) => getComputedStyle(el).display === "inline" && !!el.parentElement && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      for (const t of list) {
        if (!small(t)) continue;
        if (inSentence(t.el)) { inline++; continue; }
        const c = centre(t.r);
        const others = list.filter((o) => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el));
        const meetsTarget = others.find((o) => toRect(c, o.r) < 12 - 0.005);
        const meetsCircle = others.filter(small).find((o) => { const d = centre(o.r); return Math.hypot(c[0] - d[0], c[1] - d[1]) < 24 - 0.005; });
        if (!meetsTarget && !meetsCircle) { spaced++; continue; }
        const near = meetsTarget || meetsCircle;
        failures.push({ where: describe(t.el), width: Math.round(t.r.width * 10) / 10, height: Math.round(t.r.height * 10) / 10, near: `${describe(near.el)}${meetsTarget ? "" : "'s circle"}` });
      }
      return { checked: list.length, failures, notTargets, spaced, inline };
    },
    // The focused element and whether it shows a focus indicator: its own outline at least 2 px wide; or the outline
    // of its nearest ancestor whose data-slot names a part the spec's accessibility.focus.ring names (ringSlots), as
    // when Input's control draws the ring through :focus-within; or, for a menu item part (menuItemSlots), the
    // highlight: [data-highlighted] and a background at least 3 to 1 against the menu surface (menuSlots).
    focused(info = {}) {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.__ctKey) el.__ctKey = ++keys;
      if (el.hasAttribute("data-radix-focus-guard")) return { key: el.__ctKey, where: describe(el), guard: true };
      const words = (e) => (e.getAttribute("data-slot") || "").split(/\s+/).filter(Boolean);
      const drawn = (cs) => cs.outlineStyle !== "none" && cs.outlineStyle !== "hidden" && (parseFloat(cs.outlineWidth) || 0) >= 1.99;
      const cs = getComputedStyle(el);
      const res = { key: el.__ctKey, where: describe(el), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, ok: false, via: null, notes: [] };
      if (drawn(cs)) return { ...res, ok: true, via: "its own outline" };
      const ring = info.ringSlots || [];
      for (let a = el.parentElement; a; a = a.parentElement) {
        if (!words(a).some((w) => ring.includes(w))) continue;
        const acs = getComputedStyle(a);
        if (drawn(acs)) return { ...res, ok: true, via: `the outline of ${describe(a)}` };
        res.notes.push(`its ring part ${describe(a)} shows outline ${acs.outlineStyle} ${parseFloat(acs.outlineWidth) || 0} px`);
        break;
      }
      if (words(el).some((w) => (info.menuItemSlots || []).includes(w))) {
        let surface = el.parentElement;
        while (surface && !words(surface).some((w) => (info.menuSlots || []).includes(w))) surface = surface.parentElement;
        const sbg = backgroundOf(surface || el.parentElement || document.body);
        const ibg = backgroundOf(el);
        const r = ratio(ibg, sbg);
        const lit = el.matches("[data-highlighted]");
        if (lit && r >= 3) return { ...res, ok: true, via: `the highlight, ${Math.floor(r * 100) / 100} to 1 against the menu surface` };
        res.notes.push(`as a menu item it is ${lit ? "" : "not "}highlighted, ${Math.floor(r * 100) / 100} to 1 against the menu surface (${hex(ibg)} on ${hex(sbg)}); the highlight needs [data-highlighted] and 3 to 1`);
      }
      return res;
    },
    // Whether the component is open: its trigger says so (aria-expanded or data-state), or, when no trigger is on the
    // page (an example opened by its props, with no trigger), one of its parts carries data-state="open".
    openState({ triggerSel, partSels }) {
      const triggers = [...document.querySelectorAll(triggerSel)];
      if (triggers.some((e) => e.getAttribute("aria-expanded") === "true" || e.getAttribute("data-state") === "open")) return { open: true, trigger: true };
      if (triggers.length) return { open: false, trigger: true };
      return { open: partSels.some((sel) => [...document.querySelectorAll(sel)].some((e) => e.getAttribute("data-state") === "open")), trigger: false };
    },
    // Chooses the instance of a part a reach step acts on, document-wide (portalled parts included), and marks it
    // with data-ct-target (and the element to focus with data-ct-focus). Visible instances only; not disabled unless
    // allowDisabled; with focus, one that can take focus (tabindex not -1) or, for a part that cannot, one holding a
    // focusable descendant; never one already in a stronger state (strongerSels); prefer "unmatched" puts instances
    // not yet in the state first, "matched" those already in it.
    pick({ partSel, stateSel = "", strongerSels = [], allowDisabled = false, focus = false, prefer = null, own = false }) {
      for (const e of document.querySelectorAll("[data-ct-target], [data-ct-focus], [data-ct-eligible]")) { e.removeAttribute("data-ct-target"); e.removeAttribute("data-ct-focus"); e.removeAttribute("data-ct-eligible"); }
      const safe = (e, s) => { try { return e.matches(s); } catch { return null; } };
      const all = [...document.querySelectorAll(partSel)];
      if (!all.length) return { none: true };
      if (stateSel && safe(all[0], partSel + stateSel) === null) return { badSelector: true };
      const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility({ visibilityProperty: true }); };
      const disabled = (e) => !!e.matches(':disabled, [data-disabled], [aria-disabled="true"]');
      const focusable = (e) => e.tabIndex >= 0 && !e.matches(":disabled") && !e.hasAttribute("data-radix-focus-guard") && visible(e);
      let list = all.filter(visible);
      if (!list.length) return { hidden: all.length };
      if (!allowDisabled) { list = list.filter((e) => !disabled(e)); if (!list.length) return { allDisabled: true }; }
      const stronger = [];
      list = list.filter((e) => { const hit = strongerSels.filter(([, sel]) => safe(e, sel)).map(([n]) => n); stronger.push(...hit); return !hit.length; });
      if (!list.length) return { stronger: [...new Set(stronger)] };
      // Focus: a part in the Tab order (tabindex not -1) comes first; one Tab can still reach through a roving focus
      // group (Radix gives every tab tabindex -1 and its tablist forwards focus to the selected one), so any instance
      // that can hold focus, or holds a focusable descendant, is eligible (data-ct-eligible) and the runner takes the
      // first one real Tab presses land on. An instance whose only focusable element is disabled is not eligible.
      const NATIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"], [contenteditable=""]';
      const holdsFocus = (e) => e.matches(NATIVE) && !e.matches(":disabled") && !e.hasAttribute("data-radix-focus-guard") && visible(e);
      let pairs = list.map((e) => [e, focus ? (focusable(e) ? e : [...e.querySelectorAll("*")].find(focusable) || (holdsFocus(e) ? e : [...e.querySelectorAll("*")].find(holdsFocus)) || null) : null]);
      if (focus) {
        const can = pairs.filter(([, f]) => f);
        if (!can.length) return list.some((e) => e.matches(":disabled") || e.querySelector(":disabled")) ? { allDisabled: true } : { noFocusable: list.length };
        pairs = can.sort((a, b) => (b[1].tabIndex >= 0) - (a[1].tabIndex >= 0));
        for (const [e] of pairs) e.setAttribute("data-ct-eligible", "");
      }
      if (prefer && stateSel) {
        const m = (e) => !!safe(e, partSel + stateSel);
        pairs.sort((a, b) => (prefer === "matched" ? m(b[0]) - m(a[0]) : m(a[0]) - m(b[0])));
      }
      const [el, f] = pairs[0];
      el.setAttribute("data-ct-target", "");
      if (own) window.__ctOwn = el; // the instance the state is looked for on, kept across later steps
      if (f) f.setAttribute("data-ct-focus", "");
      return { index: all.indexOf(el), of: all.length, via: f && f !== el ? describe(f) : null, matched: stateSel ? !!safe(el, partSel + stateSel) : null };
    },
    overflow() {
      const de = document.documentElement;
      const cw = de.clientWidth, sw = de.scrollWidth;
      if (sw <= cw) return null;
      const outside = (r) => r.right > cw + 0.5 || r.left < -0.5;
      const offenders = [];
      for (const e of document.body.querySelectorAll("*")) {
        const r = e.getBoundingClientRect();
        if (!outside(r)) continue;
        const p = e.parentElement;
        if (p && p !== document.body && outside(p.getBoundingClientRect())) continue;
        offenders.push(`${describe(e)} (${Math.round(r.width)} px wide)`);
        if (offenders.length >= 3) break;
      }
      return { clientWidth: cw, scrollWidth: sw, offenders };
    },
    // Every slot name on the page: data-slot is a list of words.
    slots() {
      return [...new Set([...document.querySelectorAll("[data-slot]")].flatMap((e) => e.getAttribute("data-slot").split(/\s+/).filter(Boolean)))].sort();
    },
    focusables() {
      return document.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]').length;
    },
  };
}

// ---------------------------------------------------------------- the run

class Run {
  constructor({ base, page, headed, dist = DEFAULT_DIST }) {
    this.base = base;
    this.dist = dist;
    this.page = page;
    this.checks = [];
    this.errors = [];
    this.headed = headed;
    page.on("console", (m) => { if (m.type() === "error") this.errors.push(`console: ${m.text()}`); });
    page.on("pageerror", (e) => this.errors.push(`page error: ${e.message}`));
  }

  clean(s) { return String(s ?? "").split(this.base).join("http://gallery"); }

  typeCheck() { return (this.tsc ??= runTypeCheck()); }

  record(entry) {
    const c = { component: entry.component, check: entry.check, example: entry.example ?? null, config: entry.config ? cfgLabel(entry.config) : null, requirement: entry.requirement ?? null, status: entry.status, detail: this.clean(entry.detail ?? "") };
    this.checks.push(c);
    return c;
  }

  // The server's root is the bundle folder itself, so any --dist works, inside the repository or not.
  url(query) { return `${this.base}/index.html?${new URLSearchParams(query).toString()}`; }

  // Loads a gallery page and waits until it has rendered and its fonts are in.
  async load(page, query, { theme = "light", density = "standard", width = 1280, height = 800 } = {}) {
    if (page === this.page) this.errors = [];
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
    await page.goto(this.url({ ...query, theme, density }), { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.getAttribute("data-gallery-ready") === "true", null, { timeout: 15000 });
    await page.addStyleTag({ content: NO_MOTION });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(pageLib);
    await page.mouse.move(0, 0);
  }

  openExample(page, slug, id, opts) { return this.load(page, { component: slug, example: id }, opts); }
}

// One component, every check. `target` is { slug, specFile, testsFile, fixture }.
async function testComponent(run, target, { onlyExample = null, galleryInfo }) {
  const { slug } = target;
  const page = run.page;
  const rec = (e) => run.record({ component: slug, ...e });
  const { spec: rawSpec, problems } = readSpec(target.specFile);
  const out = { slug, name: slug, spec: rel(target.specFile), specValid: false, examples: [] };
  if (!rawSpec) { rec({ check: "spec", status: "fail", detail: problems.join("; ") }); return out; }
  const spec = rawSpec;
  out.name = typeof spec.name === "string" ? spec.name : slug;
  out.specValid = problems.length === 0;
  rec({ check: "spec", status: problems.length ? "fail" : "pass", detail: problems.length ? `the spec does not follow the schema: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? `; and ${problems.length - 5} more` : ""}. Checks below read what they can.` : "follows ds-components/schema/component.schema.json" });

  const anatomy = obj(spec.anatomy);
  const propsSpec = obj(spec.props);
  const states = obj(spec.states);
  const rules = arr(spec.styles).filter(isObj);
  const precedence = arr(spec.precedence).filter((s) => typeof s === "string");
  const specExamples = arr(spec.examples).filter((e) => isObj(e) && typeof e.id === "string");
  const defaults = {};
  for (const [k, p] of Object.entries(propsSpec)) if (isObj(p) && p.default !== undefined && p.default !== null) defaults[k] = p.default;

  // Which examples exist in the examples file.
  const info = galleryInfo.components.find((c) => c.slug === slug);
  const fileExamples = info && Array.isArray(info.fileExamples) ? info.fileExamples : null;
  if (!info) rec({ check: "example", status: "fail", detail: "the gallery has no entry for this component; is its examples file in ds-components/src/<slug>/?" });
  else if (!fileExamples) rec({ check: "example", status: "fail", detail: "the examples file has no \"examples\" export" });
  let examples = specExamples;
  if (onlyExample) examples = examples.filter((e) => e.id === onlyExample);
  const runnable = [];
  for (const ex of examples) {
    if (fileExamples && !fileExamples.includes(ex.id)) rec({ check: "example", example: ex.id, status: "fail", detail: `the spec lists example "${ex.id}" but the examples file has no entry for it` });
    else if (fileExamples) runnable.push(ex);
  }
  if (fileExamples && !onlyExample) {
    for (const id of fileExamples) if (!specExamples.some((e) => e.id === id)) rec({ check: "example", example: id, status: "fail", detail: `the examples file has "${id}", which the spec does not list` });
  }
  out.examples = runnable.map((e) => e.id);

  // ---- a. generic checks
  const focusInfo = focusInfoOf(spec);
  const slotsByExample = new Map();
  const axeByExample = new Map(); // example -> Set of rule ids with any violation
  let axeRules = null;
  for (const ex of runnable) {
    axeByExample.set(ex.id, new Set());
    for (const config of GENERIC_CONFIGS) {
      const base = { check: null, example: ex.id, config };
      try {
        await run.openExample(page, slug, ex.id, config);
      } catch (e) {
        rec({ ...base, check: "errors", status: "fail", detail: `the example did not load: ${e.message.split("\n")[0]}` });
        continue;
      }
      if (!(await page.locator(`section[data-example=${JSON.stringify(ex.id)}]`).count())) {
        rec({ ...base, check: "errors", status: "fail", detail: `no section[data-example="${ex.id}"] on the page` });
        continue;
      }
      if (config.theme === "light" && config.width === 1280) slotsByExample.set(ex.id, await page.evaluate(() => window.__ct.slots()));

      // axe
      await page.addScriptTag({ content: AXE_SOURCE });
      if (!axeRules) axeRules = new Set(await page.evaluate(() => window.axe.getRules().map((r) => r.ruleId)));
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ["violations"] });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target?.join(" ") ?? "" }));
      });
      for (const v of violations) axeByExample.get(ex.id).add(v.id);
      const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const minor = violations.filter((v) => !blocking.includes(v));
      const fmt = (v) => `${v.id} (${v.impact}, ${v.nodes} node${v.nodes === 1 ? "" : "s"}, first at ${v.target})`;
      rec({ ...base, check: "axe", status: blocking.length ? "fail" : "pass", detail: [blocking.length ? `violations: ${blocking.map(fmt).join("; ")}` : "", minor.length ? `reported, not failing: ${minor.map(fmt).join("; ")}` : ""].filter(Boolean).join(". ") || "no violations" });

      // overflow
      const ov = await page.evaluate(() => window.__ct.overflow());
      rec({ ...base, check: "overflow", status: ov ? "fail" : "pass", detail: ov ? `the page scrolls sideways: ${ov.scrollWidth} px of content in ${ov.clientWidth} px; widest: ${ov.offenders.join(", ") || "(not found)"}` : "" });

      // contrast
      const ct = await page.evaluate(() => window.__ct.contrast());
      if (ct.checked) rec({ ...base, check: "contrast", status: ct.failures.length ? "fail" : "pass", detail: ct.failures.length ? ct.failures.map((f) => `"${f.text}" in ${f.where}: ${f.ratio} to 1, needs ${f.need} (${f.fg} on ${f.bg})`).join("; ") : `${ct.checked} text runs` });

      // target size
      const tg = await page.evaluate(() => window.__ct.targets());
      const tgNotes = [tg.spaced ? `${tg.spaced} under 24 px passed by spacing` : "", tg.inline ? `${tg.inline} inline in a sentence` : "", tg.notTargets ? `${tg.notTargets} focusable but not pointer targets, not measured` : ""].filter(Boolean).join(", ");
      if (tg.checked) rec({ ...base, check: "target-size", status: tg.failures.length ? "fail" : "pass", detail: tg.failures.length ? tg.failures.map((f) => `${f.where} is ${f.width} by ${f.height} px and its 24 px circle meets ${f.near}; needs 24 by 24 or the spacing`).join("; ") : `${tg.checked} targets${tgNotes ? ` (${tgNotes})` : ""}` });

      // focus by real Tab presses
      const limit = (await page.evaluate(() => window.__ct.focusables())) + 3;
      await page.evaluate(() => document.activeElement?.blur?.());
      const seen = new Set();
      const reached = [];
      let guards = 0;
      for (let i = 0; i < limit; i++) {
        await page.keyboard.press("Tab");
        const f = await page.evaluate((info) => window.__ct.focused(info), focusInfo);
        if (!f) { if (reached.length) break; continue; }
        if (seen.has(f.key)) break;
        seen.add(f.key);
        if (f.guard) { guards++; continue; } // Radix's focus guards are not controls
        reached.push(f);
      }
      if (reached.length) {
        const bad = reached.filter((f) => !f.ok);
        const vias = [...new Set(reached.filter((f) => f.ok && f.via !== "its own outline").map((f) => f.via.replace(/ [\d.]+ to 1/, "")))];
        rec({ ...base, check: "focus-visible", status: bad.length ? "fail" : "pass", detail: bad.length ? bad.map((f) => `${f.where}: outline ${f.style} ${f.width} px${f.notes.length ? `; ${f.notes.join("; ")}` : ""}; needs an outline at least 2 px wide on it or on a ring part the spec names${focusInfo.menuItemSlots.length ? ", or the highlight" : ""}`).join("; ") : `${reached.length} controls reached by Tab${vias.length ? `; indicator drawn by ${vias.join(", ")}` : ""}${guards ? `; ${guards} focus guard${guards === 1 ? "" : "s"} skipped` : ""}` });
      }

      // errors last, so errors raised by the checks themselves count
      await page.waitForTimeout(30);
      rec({ ...base, check: "errors", status: run.errors.length ? "fail" : "pass", detail: run.errors.slice(0, 5).join("; ") });
    }
  }

  // ---- b. anatomy
  if (runnable.length && !onlyExample) {
    const seenSlots = new Set([...slotsByExample.values()].flat());
    const knownSlots = new Set(Object.values(anatomy).filter((p) => isObj(p) && p.element !== null).map((p) => p.slot));
    for (const dep of arr(spec.dependencies)) {
      const d = readSpec(join(SPECS, `${String(dep).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}.spec.json`)).spec; // Button -> button.spec.json
      if (d) for (const p of Object.values(obj(d.anatomy))) if (isObj(p)) knownSlots.add(p.slot);
    }
    for (const [key, part] of Object.entries(anatomy)) {
      if (!isObj(part) || part.required === false || part.element === null) continue;
      const found = seenSlots.has(part.slot);
      const where = [...slotsByExample.entries()].filter(([, s]) => s.includes(part.slot)).map(([id]) => id);
      rec({ check: "anatomy", status: found ? "pass" : "fail", detail: found ? `required part ${key} (data-slot="${part.slot}") appears in ${where.length} examples` : `required part ${key} has data-slot="${part.slot}", which no example renders` });
    }
    for (const s of [...seenSlots].sort()) {
      if (knownSlots.has(s)) continue;
      const where = [...slotsByExample.entries()].filter(([, list]) => list.includes(s)).map(([id]) => id);
      rec({ check: "anatomy", example: where[0], status: "fail", detail: `data-slot="${s}" is not a part in the spec (seen in ${where.join(", ")})` });
    }
  }

  // ---- c. state map
  // Each state is driven as its reach says (the grammar is parseReach's), on an instance of the part chosen by
  // __ct.pick, and the part must then match its selector; colours the spec's rules give the state are compared with
  // tokens.json for the theme.
  const colourTokens = loadColourTokens();
  const stateNames = Object.keys(states);
  const partKeys = Object.keys(anatomy);
  const disabledish = (name, st) => /disabled/i.test(name) || /disabled/i.test(String(st.selector ?? ""));
  const componentSels = Object.values(anatomy).filter((p) => isObj(p) && p.element !== null && typeof p.slot === "string").map((p) => slotSel(p.slot));
  const triggerKey = partKeys.find((k) => ["menubutton", "dialogtrigger"].includes(obj(anatomy[k]).role)) ?? (has(anatomy, "trigger") ? "trigger" : null);
  for (const [name, state] of Object.entries(states)) {
    const check = `state:${name}`;
    if (!isObj(state)) { rec({ check, status: "fail", detail: "the state entry is not an object" }); continue; }
    const part = obj(anatomy[state.on]);
    if (!part.slot) { rec({ check, status: "fail", detail: `the state is on "${state.on}", which is not a part with a data-slot` }); continue; }
    const reach = typeof state.reach === "string" ? state.reach.trim() : "";
    const parsed = parseReach(reach, partKeys);
    if (parsed.error) { rec({ check, status: "not-reached", detail: `reach not understood: "${reach || "(none)"}": ${parsed.error}` }); continue; }
    const steps = parsed.steps;
    const partSel = slotSel(part.slot);
    const stateSel = partSel + (state.selector ?? "");
    const propPairs = steps.filter((s) => s.kind === "prop").flatMap((s) => s.props);
    const exampleStep = steps.find((s) => s.kind === "example");
    const actions = steps.filter((s) => s.kind !== "prop" && s.kind !== "example");
    const bad = actions.find((s) => s.kind === "open" && !(s.target ?? triggerKey));
    if (bad) { rec({ check, status: "not-reached", detail: `reach not understood: "${reach}": "open" needs a trigger part, and the spec has none (name one with open@<part>)` }); continue; }

    let candidates = exampleStep ? runnable.filter((ex) => ex.id === exampleStep.id) : runnable;
    if (exampleStep && !candidates.length) { rec({ check, status: "not-reached", detail: `the reach names example "${exampleStep.id}", which is not a runnable example` }); continue; }
    candidates = candidates.filter((ex) => propPairs.every(([k, v]) => exampleHasProp(ex, k, v, defaults)));
    // Without an open or click step the part must already be on the page after load.
    if (!actions.some((s) => s.kind === "open" || s.kind === "click")) candidates = candidates.filter((ex) => (slotsByExample.get(ex.id) || []).includes(part.slot) || !slotsByExample.has(ex.id));
    if (!candidates.length) {
      rec({ check, status: "not-reached", detail: propPairs.length ? `no example has ${propPairs.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" and ")}${exampleStep ? ` (example ${exampleStep.id})` : ""} and renders data-slot="${part.slot}"` : `no example renders data-slot="${part.slot}"` });
      continue;
    }
    const strongerSels = strongerStates(name, states, precedence).map((s) => [s, partSel + (states[s].selector ?? "")]);
    // The last action on the state's own part is where the state is looked for; with none, the state is set by the
    // example (props) or by an action on another part, and an instance already in the state is chosen afterwards.
    const lastOwn = [...actions].reverse().find((s) => s.kind !== "open" && (s.target ?? state.on) === state.on);
    let reachedAny = false;
    const skipped = [];
    for (const ex of candidates) {
      for (const theme of ["light", "dark"]) {
        const config = { theme, width: STATE_WIDTH, density: "standard" };
        await run.openExample(page, slug, ex.id, config);
        let pressed = false;
        try {
          let skip = null;
          for (const step of actions) {
            const onKey = step.kind === "open" ? (step.target ?? triggerKey) : (step.target ?? state.on);
            const onPart = obj(anatomy[onKey]);
            const onSel = slotSel(onPart.slot);
            if (step.kind === "open") {
              const os = await page.evaluate((o) => window.__ct.openState(o), { triggerSel: onSel, partSels: componentSels });
              if (os.open) continue;
              if (!os.trigger) throw new Error(`open: no ${onKey} part on the page and nothing open`);
            }
            const own = step === lastOwn;
            const focus = step.kind === "focus-by-keyboard" || step.kind === "key";
            const pick = await page.evaluate((o) => window.__ct.pick(o), {
              partSel: onSel, stateSel: own ? state.selector ?? "" : "", strongerSels: own ? strongerSels : [],
              allowDisabled: own && disabledish(name, state), focus: focus, prefer: own ? "unmatched" : null, own,
            });
            if (pick.badSelector) throw new Error(`the selector ${stateSel} is not valid CSS`);
            if (pick.stronger) { skip = `${ex.id} (${pick.stronger.join(", ")})`; break; }
            // An example whose every instance is disabled cannot show any other state, and one that does not render an
            // optional part (required: false) cannot show it there: passed over, not failed. A required part missing fails.
            if (pick.allDisabled && !(own && disabledish(name, state))) { skip = `${ex.id} (every ${onKey} is disabled)`; break; }
            if ((pick.none || pick.hidden) && onPart.required === false) { skip = `${ex.id} (renders no ${onKey}, an optional part)`; break; }
            if (pick.none || pick.hidden || pick.allDisabled || (pick.noFocusable && step.kind !== "key")) {
              throw new Error(`no ${onKey} part to ${step.kind}${step.kind === "key" ? ` ${step.key}` : ""}: ${pick.none ? "none on the page" : pick.hidden ? `${pick.hidden} on the page, none visible` : pick.allDisabled ? "every visible one is disabled" : "none can take focus or holds a focusable element"}`);
            }
            const target = page.locator("[data-ct-target]").first();
            if (step.kind === "hover" || step.kind === "press" || step.kind === "click" || step.kind === "open") {
              const box = await target.boundingBox();
              if (!box) throw new Error(`the ${onKey} part has no box to point at`);
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              if (step.kind === "press") { await page.mouse.down(); pressed = true; }
              if (step.kind === "click" || step.kind === "open") { await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(50); }
            } else {
              // Keyboard: reach the element by real Tab presses (for a part that cannot take focus, its focusable
              // descendant), then press the key. A key step on a part that cannot take focus presses where focus is.
              // A key step presses where focus already is when it is inside the component (an open menu holds focus on
              // its content or an item); otherwise it first Tabs to an eligible instance, as focus-by-keyboard does.
              const wantTab = await page.evaluate(({ kind, componentSel }) => {
                const a = document.activeElement;
                const inside = a && a !== document.body && !!a.closest(componentSel);
                if (kind === "key" && inside) return false;
                return !!document.querySelector("[data-ct-eligible], [data-ct-focus]");
              }, { kind: step.kind, componentSel: componentSels.join(", ") });
              if (wantTab) {
                if (step.kind === "focus-by-keyboard") await page.evaluate(() => document.activeElement?.blur?.());
                const ok = await tabToEligible(page, own);
                if (!ok) throw new Error(`Tab never reached the ${onKey} part${pick.via ? ` (through ${pick.via})` : ""}`);
              }
              if (step.kind === "key") { await page.keyboard.press(step.key); await page.waitForTimeout(30); }
            }
          }
          if (skip) { skipped.push(skip); if (pressed) { await page.mouse.up(); pressed = false; } break; }
          // Where the state is looked for: the instance the last own action used; otherwise one already in the state.
          if (!lastOwn) {
            const pick = await page.evaluate((o) => window.__ct.pick(o), { partSel, stateSel: state.selector ?? "", allowDisabled: true, prefer: "matched", own: true });
            if (pick.badSelector) throw new Error(`the selector ${stateSel} is not valid CSS`);
            if ((pick.none || pick.hidden) && part.required === false) { skipped.push(`${ex.id} (renders no ${state.on}, an optional part)`); continue; }
            if (pick.none || pick.hidden) { rec({ check, example: ex.id, config, status: "fail", detail: `after "${reach}", no visible ${state.on} part (data-slot="${part.slot}") is on the page` }); continue; }
          }
          const seen = await page.evaluate(({ partSel, stateSel, kind, allStates, parts }) => {
            let el = window.__ctOwn;
            if (!el) return { lost: true };
            const safe = (e, sel) => { try { return e.matches(sel); } catch { return false; } };
            let matched = safe(el, stateSel);
            if (!matched && kind === "key") { const alt = [...document.querySelectorAll(partSel)].find((e) => safe(e, stateSel)); if (alt) { el = alt; matched = true; } }
            const active = allStates.filter(([, , ps, sel]) => (ps === partSel ? safe(el, ps + sel) : [...document.querySelectorAll(ps)].some((e) => safe(e, ps + sel)))).map(([n]) => n);
            const colours = {};
            for (const [partKey, ps] of parts) {
              const t = ps === partSel ? el : el.querySelector(ps) || el.closest(ps) || document.querySelector(ps);
              if (!t) continue;
              const cs = getComputedStyle(t);
              colours[partKey] = { background: cs.backgroundColor, color: cs.color, borderColor: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor] };
            }
            return { matched, active, colours };
          }, {
            partSel, stateSel, kind: lastOwn ? lastOwn.kind : "prop",
            allStates: stateNames.filter((s) => isObj(states[s]) && isObj(anatomy[states[s].on])).map((s) => [s, states[s].on, slotSel(anatomy[states[s].on].slot), states[s].selector ?? ""]),
            parts: Object.entries(anatomy).filter(([, p]) => isObj(p) && p.slot && p.element !== null).map(([k, p]) => [k, slotSel(p.slot)]),
          });
          if (pressed) { await page.mouse.up(); pressed = false; }
          if (seen.lost) throw new Error("no instance of the part was chosen");
          if (!seen.matched) { rec({ check, example: ex.id, config, status: "fail", detail: `after "${reach}", the part does not match ${stateSel}` }); continue; }
          reachedAny = true;

          // Expected colours: the spec's rules read like a stylesheet, for the states now on, the example's props and
          // the props the reach chose it by.
          const effective = { ...defaults, ...obj(ex.props), ...Object.fromEntries(propPairs) };
          const applies = rules.filter((r) => {
            const w = obj(r.when);
            if (w.media) return false;
            if (!arr(w.states).every((s) => seen.active.includes(s))) return false;
            return Object.entries(obj(w.props)).every(([k, v]) => propEquals(effective[k], v));
          });
          const { problems, compared, notPresent } = compareStateColours({ anatomy, applies, name, colours: seen.colours, theme, colourTokens });
          const absent = notPresent.length ? `; not present (optional, not rendered by this example): ${notPresent.join(", ")}` : "";
          rec({ check, example: ex.id, config, status: problems.length ? "fail" : "pass", detail: problems.length ? problems.join("; ") + absent : compared.length ? `matches ${state.selector}; ${compared.join(", ")} equal their tokens${absent}` : `matches ${state.selector}; no colour rule names this state${absent}` });
        } catch (e) {
          if (pressed) await page.mouse.up().catch(() => {});
          rec({ check, example: ex.id, config, status: "fail", detail: `could not drive "${reach}": ${e.message.split("\n")[0]}` });
        }
      }
    }
    if (!reachedAny && !run.checks.some((c) => c.component === slug && c.check === check)) {
      rec({ check, status: "not-reached", detail: skipped.length ? `every candidate example was passed over (a stronger state, every instance disabled, or an optional part not rendered): ${[...new Set(skipped)].join("; ")}` : "no example could be put into this state" });
    }
  }

  // ---- d. requirements and named tests
  let tests = null, testsProblem = null;
  if (target.testsFile && existsSync(target.testsFile)) {
    try { tests = obj((await import(pathToFileURL(target.testsFile).href)).tests); }
    catch (e) { testsProblem = `${rel(target.testsFile)} could not be loaded: ${e.message.split("\n")[0]}`; }
  }
  const linked = new Set();
  const runTest = async (id) => {
    const tpage = await page.context().newPage();
    const errors = [];
    tpage.on("pageerror", (e) => errors.push(e.message));
    try {
      const open = (exampleId, opts = {}) => run.openExample(tpage, slug, exampleId, opts);
      let timer;
      await Promise.race([
        Promise.resolve().then(() => tests[id]({ page: tpage, open, expect: assert })),
        new Promise((_, no) => { timer = setTimeout(() => no(new Error("timed out after 30 seconds")), 30000); }),
      ]).finally(() => clearTimeout(timer));
      return { ok: true, detail: errors.length ? `passed; page errors seen: ${errors.join("; ")}` : "passed" };
    } catch (e) {
      return { ok: false, detail: e.message.split("\n")[0] };
    } finally {
      await tpage.close();
    }
  };
  const anyExampleRan = runnable.length > 0;
  for (const req of arr(spec.requirements)) {
    if (!isObj(req)) continue;
    const m = typeof req.check === "string" ? req.check.match(/^(test|axe|lint|type|manual):(.+)$/) : null;
    const base = { check: "requirement", requirement: req.id ?? "(no id)" };
    if (!m) { rec({ ...base, status: "fail", detail: `the check ${JSON.stringify(req.check)} is not test:, axe:, lint:, type: or manual:` }); continue; }
    const [, how, id] = m;
    if (how === "test") {
      linked.add(id);
      if (testsProblem) rec({ ...base, status: "fail", detail: testsProblem });
      else if (!tests || typeof tests[id] !== "function") rec({ ...base, status: "fail", detail: `test:${id} is not implemented${target.testsFile ? ` in ${rel(target.testsFile)}` : ` (no ${slug}.tests.mjs)`}` });
      else { const r = await runTest(id); rec({ ...base, status: r.ok ? "pass" : "fail", detail: `test:${id} ${r.ok ? r.detail : `failed: ${r.detail}`}` }); }
    } else if (how === "axe") {
      if (!anyExampleRan || !axeRules) rec({ ...base, status: "not-run", detail: `axe:${id} needs at least one example to run` });
      else if (!axeRules.has(id)) rec({ ...base, status: "fail", detail: `axe has no rule named ${id}` });
      else {
        const broken = [...axeByExample.entries()].filter(([, s]) => s.has(id)).map(([e]) => e);
        rec({ ...base, status: broken.length ? "fail" : "pass", detail: broken.length ? `axe:${id} is violated in ${broken.join(", ")}` : `axe:${id}: no violation in ${axeByExample.size} examples` });
      }
    } else if (how === "type") {
      const r = proveType(id, target.fixture ? null : join(SRC, slug), run.typeCheck());
      rec({ ...base, status: r.status, detail: r.detail });
    } else {
      rec({ ...base, status: "not-run", detail: `${how}:${id} is not checked by this tool${how === "manual" ? "; a person checks it" : ""}` });
    }
  }
  if (tests) {
    for (const id of Object.keys(tests).sort()) {
      if (linked.has(id) || typeof tests[id] !== "function") continue;
      const r = await runTest(id);
      rec({ check: "requirement", requirement: `(test ${id})`, status: r.ok ? "pass" : "fail", detail: `test:${id} is not named by any requirement; ${r.ok ? r.detail : `failed: ${r.detail}`}` });
    }
  }
  return out;
}

// Presses Tab until focus lands on the element marked data-ct-focus or, for focus-by-keyboard, on (or inside) any
// eligible instance of the part (data-ct-eligible); that instance becomes the target (and, with own, the instance the
// state is looked for on). Returns whether it got there within 60 presses.
export async function tabToEligible(page, own = false) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const ok = await page.evaluate((own) => {
      const a = document.activeElement;
      if (!a || a === document.body) return false;
      const want = document.querySelector("[data-ct-focus]");
      if (a === want) return true;
      const hit = a.closest("[data-ct-eligible]");
      if (!hit) return false;
      for (const e of document.querySelectorAll("[data-ct-target]")) e.removeAttribute("data-ct-target");
      hit.setAttribute("data-ct-target", "");
      if (own) window.__ctOwn = hit;
      return true;
    }, own);
    if (ok) return true;
  }
  return false;
}

// ---------------------------------------------------------------- type: requirements

// Runs "npx tsc -p ds-components/tsconfig.json" once. Returns { ok, detail }.
export function runTypeCheck(root = REPO) {
  const r = spawnSync("npx", ["--no-install", "tsc", "-p", "ds-components/tsconfig.json"], { cwd: root, encoding: "utf8" });
  if (r.error) return { ok: false, detail: `npx tsc could not run (${r.error.message})` };
  const errors = `${r.stdout ?? ""}${r.stderr ?? ""}`.split("\n").filter((l) => /error TS\d+/.test(l));
  return r.status === 0 ? { ok: true, detail: "npx tsc -p ds-components/tsconfig.json exited 0" } : { ok: false, detail: `npx tsc -p ds-components/tsconfig.json exited ${r.status}${errors.length ? ` with ${errors.length} error${errors.length === 1 ? "" : "s"}, first: ${errors[0].trim()}` : ""}` };
}

// Lines of a component's hand-written .ts and .tsx (not generated) that hold "@ts-expect-error" and the id.
export function taggedExpectErrors(dir, id) {
  if (!dir || !existsSync(dir)) return [];
  const hits = [];
  const word = new RegExp(`(^|[^A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z0-9-])`);
  for (const f of readdirSync(dir).sort()) {
    if (!/\.tsx?$/.test(f)) continue;
    const lines = readFileSync(join(dir, f), "utf8").split("\n");
    if (/generated/i.test(lines[0]) && /do not edit/i.test(lines[0])) continue;
    lines.forEach((l, i) => { if (l.includes("@ts-expect-error") && word.test(l)) hits.push(`${rel(join(dir, f))}:${i + 1}`); });
  }
  return hits;
}

// type:<id> is proven when tsc passes and a @ts-expect-error line names the id: the directive fails tsc as soon as
// the type stops rejecting the bad case. Anything less is "not proven", never a pass.
export function proveType(id, dir, tsc) {
  const hits = taggedExpectErrors(dir, id);
  if (!hits.length) return { status: "not-proven", detail: `type:${id} not proven: no line with "@ts-expect-error" and "${id}" in ${dir ? rel(dir) : "the component"}` };
  if (!tsc.ok) return { status: "not-proven", detail: `type:${id} not proven: ${tsc.detail}` };
  return { status: "pass", detail: `type:${id}: ${tsc.detail} with the @ts-expect-error at ${hits.join(", ")} in force` };
}

// ---------------------------------------------------------------- shots

async function takeShots(run, dir, components) {
  mkdirSync(dir, { recursive: true });
  const page = run.page;
  const files = [];
  const shot = async (name) => { const f = join(dir, name); await page.screenshot({ path: f, fullPage: true }); files.push(f); };
  for (const c of components) {
    for (const id of c.examples) {
      for (const theme of ["light", "dark"]) {
        for (const width of [375, 1280]) {
          await run.openExample(page, c.slug, id, { theme, width });
          await shot(`${c.slug}--${id}--${theme}-${width}.png`);
        }
      }
    }
    await run.load(page, { component: c.slug }, { theme: "light", width: 1280 });
    await shot(`${c.slug}--all.png`);
  }
  await run.load(page, { page: "tokens" }, { theme: "light", width: 1280 });
  await shot("tokens.png");
  return files;
}

async function galleryShots(run) {
  const page = run.page;
  const files = [];
  for (const [name, query, width] of [["gallery-index.png", {}, 1280], ["gallery-index-320.png", {}, 320], ["gallery-tokens.png", { page: "tokens" }, 1280], ["gallery-tokens-320.png", { page: "tokens" }, 320]]) {
    await run.load(page, query, { theme: "light", width });
    const f = join(run.dist, name);
    await page.screenshot({ path: f, fullPage: true });
    const overflow = await page.evaluate(() => window.__ct.overflow());
    files.push({ file: rel(f), overflow: overflow ? `${overflow.scrollWidth} px in ${overflow.clientWidth}` : null });
  }
  return files;
}

// ---------------------------------------------------------------- reporting

function pad(s, n) { s = String(s); return s.length >= n ? s : s + " ".repeat(n - s.length); }

function printComponent(comp, checks) {
  const mine = checks.filter((c) => c.component === comp.slug);
  console.log(`\n${comp.name} (${comp.slug})${comp.fixture ? ", test fixture" : ""}: ${comp.examples.length} examples, spec ${comp.spec}${comp.specValid ? "" : " (does not follow the schema)"}`);
  const cols = ["Example", ...GENERIC_CHECKS, "states"];
  const widths = [Math.max(14, ...comp.examples.map((e) => e.length + 2)), 10, 10, 10, 10, 13, 15, 10];
  console.log("  " + cols.map((c, i) => pad(c, widths[i])).join(""));
  const cell = (list) => {
    if (!list.length) return "-";
    const fails = list.filter((c) => c.status === "fail").length;
    const nr = list.filter((c) => c.status === "not-reached" || c.status === "not-run" || c.status === "not-proven").length;
    if (fails) return `FAIL ${fails}/${list.length}`;
    if (nr === list.length) return "not run";
    return `ok ${list.length - nr}`;
  };
  for (const id of comp.examples) {
    const row = [id, ...GENERIC_CHECKS.map((k) => cell(mine.filter((c) => c.example === id && c.check === k))), cell(mine.filter((c) => c.example === id && c.check.startsWith("state:")))];
    console.log("  " + row.map((c, i) => pad(c, widths[i])).join(""));
  }
  const groups = [["spec", (c) => c.check === "spec"], ["example files", (c) => c.check === "example"], ["anatomy", (c) => c.check === "anatomy"], ["states", (c) => c.check.startsWith("state:")], ["requirements", (c) => c.check === "requirement"]];
  for (const [label, f] of groups) {
    const list = mine.filter(f);
    if (!list.length) continue;
    const n = (s) => list.filter((c) => c.status === s).length;
    console.log(`  ${pad(label + ":", 15)}${n("pass")} passed, ${n("fail")} failed${n("not-reached") ? `, ${n("not-reached")} not reached` : ""}${n("not-run") ? `, ${n("not-run")} not run` : ""}${n("not-proven") ? `, ${n("not-proven")} not proven` : ""}`);
  }
  const notable = mine.filter((c) => c.status !== "pass");
  if (notable.length) {
    console.log("  Findings:");
    for (const c of notable) {
      const where = [c.example, c.config, c.requirement].filter(Boolean).join(", ");
      console.log(`    ${{ fail: "FAIL", "not-reached": "NOT REACHED", "not-proven": "NOT PROVEN" }[c.status] ?? "NOT RUN"} [${c.check}]${where ? ` ${where}` : ""}: ${c.detail}`);
    }
  }
}

function summarise(checks, components) {
  const n = (f) => checks.filter(f).length;
  return {
    components: components.length,
    examples: components.reduce((s, c) => s + c.examples.length, 0),
    checks: checks.length,
    passed: n((c) => c.status === "pass"),
    failed: n((c) => c.status === "fail"),
    notRun: n((c) => c.status === "not-reached" || c.status === "not-run"),
    notProven: n((c) => c.status === "not-proven"),
  };
}
const summaryLine = (s) => `${s.components} components, ${s.examples} examples, ${s.checks} checks, ${s.passed} passed, ${s.failed} failed, ${s.notRun} not reached or not run, ${s.notProven} not proven`;

// ---------------------------------------------------------------- orchestration

// dist: the bundle folder to serve. build: rebuild the whole gallery into it first (the default run); with
// --dist nothing is built and a missing bundle is an error.
export async function runAll(targets, { onlyExample = null, headed = false, shots = null, galleryShotsWanted = false, quiet = false, dist = DEFAULT_DIST, build = true } = {}) {
  if (build) {
    const built = await buildGallery({ dist });
    if (!quiet) for (const n of built.notes) console.log(`gallery note: ${n}`);
  } else {
    for (const f of ["index.html", "gallery.js", "gallery.css"]) if (!existsSync(join(dist, f))) throw new Error(`no ${f} in ${dist}; build it first: node v2/tools/build-gallery.mjs --dist ${relative(REPO, dist) || "."}`);
    if (!quiet) console.log(`gallery: testing the bundle in ${rel(dist)} as it is (nothing built)`);
  }
  const server = await createServer({ root: dist, port: 0 });
  let launched = null;
  try {
    launched = await launchChromium({ headed });
    const context = await launched.browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const run = new Run({ base: server.url, page, headed, dist });
    await run.load(page, { component: "__none__", example: "__none__" });
    const galleryInfo = await page.evaluate(() => window.__souvenirGallery);
    const components = [];
    for (const t of targets) {
      const comp = await testComponent(run, t, { onlyExample, galleryInfo });
      comp.fixture = !!t.fixture;
      components.push(comp);
    }
    const shotFiles = shots ? await takeShots(run, shots, components) : [];
    const gShots = galleryShotsWanted ? await galleryShots(run) : [];
    await context.close();
    return { checks: run.checks, components, shotFiles, galleryShots: gShots, chromium: launched.browser.version() };
  } finally {
    if (launched) await launched.browser.close();
    await server.close();
  }
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`${name} needs a value`);
  return v;
}

async function main(argv) {
  if (argv.includes("--self-test")) return selfTest(argv);
  const only = argValue(argv, "--component");
  const onlyExample = argValue(argv, "--example");
  const shots = argValue(argv, "--shots");
  const headed = argv.includes("--headed");
  const distArg = argValue(argv, "--dist");
  const reportArg = argValue(argv, "--report");
  const dist = distArg ? resolve(distArg) : DEFAULT_DIST;
  const reportFile = reportArg ? resolve(reportArg) : REPORT;

  const discovered = discoverComponents({ includeFixture: only === "fixture" }).filter((c) => !only || c.slug === only);
  const targets = [];
  const extra = [];
  for (const c of discovered) {
    if (c.fixture || existsSync(c.specFile)) targets.push(c);
    else extra.push({ component: c.slug, check: "spec", status: "fail", detail: `the examples file has no spec at ${rel(c.specFile)}` });
  }
  // Specs with no examples file yet are listed as not run, so they are never mistaken for passing.
  const specSlugs = existsSync(SPECS) ? readdirSync(SPECS).filter((f) => f.endsWith(".spec.json")).map((f) => f.replace(/\.spec\.json$/, "")).sort() : [];
  for (const s of specSlugs) {
    if ((only && s !== only) || discovered.some((c) => c.slug === s)) continue;
    extra.push({ component: s, check: "examples-file", status: "not-run", detail: `no ds-components/src/${s}/${s}.examples.tsx yet, so nothing of ${s}.spec.json was tested` });
  }
  if (only && !targets.length && !extra.length) throw new Error(`no component "${only}": no ds-components/src/${only}/${only}.examples.tsx and no spec`);

  const result = await runAll(targets, { onlyExample, headed, shots, galleryShotsWanted: argv.includes("--gallery-shots"), dist, build: !distArg });
  const checks = [...extra.map((e) => ({ component: e.component, check: e.check, example: null, config: null, requirement: null, status: e.status, detail: e.detail })), ...result.checks];
  for (const comp of result.components) printComponent(comp, checks);
  if (extra.length) {
    console.log("\nNot tested:");
    for (const e of extra) console.log(`  ${e.status === "fail" ? "FAIL" : "NOT RUN"} ${e.component}: ${e.detail}`);
  }
  for (const f of result.shotFiles.length ? [`${result.shotFiles.length} screenshots in ${shots}`] : []) console.log(`\n${f}`);
  for (const g of result.galleryShots) console.log(`gallery screenshot: ${g.file}${g.overflow ? ` (WARNING: page scrolls sideways, ${g.overflow})` : ""}`);
  const summary = summarise(checks, result.components);
  if (reportArg || (!only && !onlyExample)) {
    mkdirSync(dirname(reportFile), { recursive: true });
    const report = {
      $comment: `Generated by ${GENERATOR}. Do not edit; rerun the tool. Every check of the last ${only || onlyExample ? "filtered" : "full"} run${only ? ` (component ${only}${onlyExample ? `, example ${onlyExample}` : ""})` : onlyExample ? ` (example ${onlyExample})` : ""}: status is pass, fail, not-reached, not-run or not-proven.`,
      summary,
      configs: GENERIC_CONFIGS.map(cfgLabel),
      components: result.components.map((c) => ({ slug: c.slug, name: c.name, spec: c.spec, specValid: c.specValid, examples: c.examples })),
      checks,
    };
    writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
    console.log(`\nreport: ${rel(reportFile)}`);
  } else {
    console.log("\nreport: not written (filtered run)");
  }
  console.log(summaryLine(summary));
  return summary.failed ? 1 : 0;
}

// ---------------------------------------------------------------- self-test

// Each planted fault: where it is planted and which check must report it.
const PLANTED = [
  ["text at low contrast", (c) => c.check === "contrast" && c.example === "low-contrast" && c.status === "fail"],
  ["two controls 16 pixels tall, edge to edge", (c) => c.check === "target-size" && c.example === "small-target" && c.status === "fail"],
  ["a control with outline none", (c) => c.check === "focus-visible" && c.example === "no-outline" && c.status === "fail"],
  ["a missing required data-slot", (c) => c.check === "anatomy" && c.status === "fail" && c.detail.includes('data-slot="fixture-hint"')],
  ["an element wider than the viewport", (c) => c.check === "overflow" && c.example === "too-wide" && c.status === "fail"],
  ["an image with no alt", (c) => c.check === "axe" && c.example === "image-no-alt" && c.status === "fail" && c.detail.includes("image-alt")],
  ["a state whose colour differs from its token", (c) => c.check === "state:hover" && c.example === "state-colour" && c.status === "fail" && c.detail.includes("interactive/primary/hover")],
  ["a data-slot the spec does not list", (c) => c.check === "anatomy" && c.status === "fail" && c.detail.includes('data-slot="fixture-extra"')],
  ["a spec example missing from the examples file", (c) => c.check === "example" && c.example === "not-written" && c.status === "fail"],
  ["a required test that is not implemented", (c) => c.check === "requirement" && c.requirement === "fixture-enter-activates" && c.status === "fail" && c.detail.includes("not implemented")],
  ["a named test that fails", (c) => c.check === "requirement" && c.requirement === "fixture-planted-failure" && c.status === "fail" && c.detail.includes("planted")],
  ["an axe requirement an example breaks", (c) => c.check === "requirement" && c.requirement === "fixture-image-alt" && c.status === "fail"],
  ["a state no example reaches", (c) => c.check === "state:busy" && c.status === "not-reached"],
];
// What must pass, so the checks are not simply failing everything.
const MUST_PASS = [
  ["requirement fixture-native-button (a named test)", (c) => c.check === "requirement" && c.requirement === "fixture-native-button" && c.status === "pass"],
  ["requirement fixture-name (axe:button-name)", (c) => c.check === "requirement" && c.requirement === "fixture-name" && c.status === "pass"],
  ["state:hover on the clean example in light and dark", (c) => c.check === "state:hover" && c.example === "clean" && c.status === "pass", 2],
  ["state:pressed on the clean example", (c) => c.check === "state:pressed" && c.example === "clean" && c.status === "pass", 2],
  ["state:focus on the clean example", (c) => c.check === "state:focus" && c.example === "clean" && c.status === "pass", 2],
  ["state:disabled on the disabled example", (c) => c.check === "state:disabled" && c.example === "disabled" && c.status === "pass", 2],
  ["required parts root, control and label", (c) => c.check === "anatomy" && c.status === "pass", 3],
];

async function selfTest(argv) {
  const fixture = discoverComponents({ includeFixture: true }).find((c) => c.fixture);
  const tmp = mkdtempSync(join(tmpdir(), "test-components-self-test-"));
  let lines = 0, caught = 0;
  const say = (ok, text) => { lines++; if (ok) caught++; console.log(`${ok ? "caught" : "MISSED"}: ${text}`); };
  try {
    // type:<id>: proven only by tsc passing with a @ts-expect-error line that names the id.
    const typeDir = join(tmp, "typed");
    mkdirSync(typeDir, { recursive: true });
    writeFileSync(join(typeDir, "chip.tsx"), "// Proof for chip-needs-label:\n// @ts-expect-error chip-needs-label: a chip without a label must not type-check\nconst x: { a: string } = {};\n// chip-other is named here but not on a directive line\n// @ts-expect-error\nconst y: number = '1';\n");
    writeFileSync(join(typeDir, "chip.contract.ts"), "// Generated by v2/tools/build-components.mjs. Do not edit.\n// @ts-expect-error chip-generated\n");
    const ok = { ok: true, detail: "tsc exited 0" }, bad = { ok: false, detail: "tsc exited 2" };
    say(proveType("chip-needs-label", typeDir, ok).status === "pass", "type: a tagged @ts-expect-error line with tsc at 0 passes");
    say(proveType("chip-needs-label", typeDir, bad).status === "not-proven", "type: a tagged line with tsc failing is not proven");
    say(proveType("chip-other", typeDir, ok).status === "not-proven", "type: an id named off the directive line is not proven");
    say(proveType("chip-needs", typeDir, ok).status === "not-proven", "type: a prefix of a tagged id is not proven");
    say(proveType("chip-generated", typeDir, ok).status === "not-proven", "type: a directive in a generated file does not count");
    // The reach grammar: what parses, what is "reach not understood", and that a prop value may hold "@".
    const keys = ["root", "trigger", "content", "item", "control"];
    const steps = (r) => { const p = parseReach(r, keys); return p.error ? null : p.steps; };
    const kinds = (r) => (steps(r) || []).map((s) => `${s.kind}${s.key ? `:${s.key}` : ""}${s.target ? `@${s.target}` : ""}${s.props ? `:${s.props.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("&")}` : ""}${s.id ? `:${s.id}` : ""}`).join(" > ");
    say(kinds("hover") === "hover", `reach: "hover" is one step (${kinds("hover")})`);
    say(kinds("open > key:ArrowDown@item") === "open > key:ArrowDown@item", `reach: "open > key:ArrowDown@item" is open, then ArrowDown on item (${kinds("open > key:ArrowDown@item")})`);
    say(kinds("prop:item.disabled=true&item.variant=danger") === 'prop:item.disabled=true&item.variant="danger"', `reach: two props joined by & (${kinds("prop:item.disabled=true&item.variant=danger")})`);
    say(kinds("prop:placeholder=name@example.com") === 'prop:placeholder="name@example.com"', `reach: a prop value keeps its "@" (${kinds("prop:placeholder=name@example.com")})`);
    say(kinds("example:side-top > open > hover@item") === "example:side-top > open > hover@item", `reach: example, open, hover@item (${kinds("example:side-top > open > hover@item")})`);
    for (const bad of ["key:ArrowDown from the open content, or move a mouse over the item", "click the trigger", "click@nosuchpart", "render with defaults", "prop:open", "hover > "]) {
      const p = parseReach(bad, keys);
      say(!!p.error, `reach not understood: "${bad}"${p.error ? "" : ` parsed as ${kinds(bad)}`}`);
    }
    // Props inside the example's content structure: a part.prop name is found anywhere in it; a plain name is not.
    const nested = { id: "x", props: { defaultOpen: true }, content: { trigger: { props: { "trigger.asChild": true } }, content: [{ part: "item", children: "A" }, { part: "item", props: { "item.disabled": true, disabled: true } }] } };
    say(exampleHasProp(nested, "item.disabled", true) && exampleHasProp(nested, "defaultOpen", true) && exampleHasProp(nested, "modal", true, { modal: true }), "reach: item.disabled=true is found inside the content, defaultOpen in the props, modal from the default");
    say(!exampleHasProp(nested, "disabled", true) && !exampleHasProp(nested, "item.disabled", false), "reach: a plain name is not looked for inside the content, and a different value does not match");
    const tabList = { id: "t", props: {}, content: [{ value: "a", label: "A" }, { value: "b", label: "B", disabled: true }] };
    const menu = { id: "m", props: {}, content: { content: [{ part: "item", props: { disabled: true } }] } };
    const sideTop = { id: "side-top", props: { defaultOpen: true }, content: { content: { props: { "content.side": "top" } } } };
    say(!exampleHasProp(sideTop, "content.side", "bottom", { "content.side": "bottom" }) && exampleHasProp(sideTop, "content.side", "top", { "content.side": "bottom" }) && exampleHasProp({ id: "plain", props: {}, content: {} }, "content.side", "bottom", { "content.side": "bottom" }), "reach: a value the content sets wins over the spec's default; the default holds only when nothing sets the prop");
    say(exampleHasProp(tabList, "trigger.disabled", true) && exampleHasProp(menu, "item.disabled", true) && !exampleHasProp(menu, "checkboxItem.disabled", true), "reach: trigger.disabled matches a bare disabled on a descriptor that names no part; a bare prop on another part's object does not match");
    // Stronger states mirror the generator: a state outside precedence excludes nothing.
    const st = { disabled: { on: "trigger" }, selected: { on: "trigger" }, hover: { on: "trigger" }, focus: { on: "trigger" }, other: { on: "content" } };
    const pr = ["disabled", "other", "selected", "hover"];
    say(JSON.stringify(strongerStates("hover", st, pr)) === '["disabled","selected"]' && strongerStates("focus", st, pr).length === 0, `stronger states: hover yields to disabled and selected; focus (not in precedence) to none (${JSON.stringify(strongerStates("hover", st, pr))}, ${JSON.stringify(strongerStates("focus", st, pr))})`);
    // Optional parts: absent and optional is "not present"; absent and required still fails; a wrong colour still fails.
    const tokensMap = loadColourTokens();
    const want = resolveColourToken(tokensMap, "text/primary", "light");
    const anat = { root: {}, badge: { required: false }, hint: {} };
    const applies = [{ when: { states: ["hover"] }, parts: { badge: { color: "text/primary" }, hint: { color: "text/primary" } } }];
    const c1 = compareStateColours({ anatomy: anat, applies, name: "hover", colours: {}, theme: "light", colourTokens: tokensMap });
    say(c1.notPresent.join() === "badge" && c1.problems.length === 1 && c1.problems[0].startsWith("hint "), `optional parts: an absent optional part is not present, an absent required one fails (${JSON.stringify(c1)})`);
    const c2 = compareStateColours({ anatomy: anat, applies, name: "hover", colours: { badge: { color: "rgb(1, 2, 3)" }, hint: { color: want.rgba ? `rgb(${want.rgba.slice(0, 3).join(", ")})` : "" } }, theme: "light", colourTokens: tokensMap });
    say(c2.problems.length === 1 && c2.problems[0].startsWith("badge color is rgb(1, 2, 3)") && c2.compared.length === 2, `optional parts: a present optional part with the wrong colour still fails (${c2.problems.join("; ")})`);
    // The ring parts named in accessibility.focus.ring, matched as whole words.
    const fi = focusInfoOf({ anatomy: { root: { slot: "x", element: "div" }, control: { slot: "x-control", element: "div" }, item: { slot: "x-item", element: "div", role: "menuitem" }, content: { slot: "x-content", element: "div", role: "menu" } }, accessibility: { focus: { ring: "control; no ring on items" } } });
    say(fi.ringSlots.join() === "x-control" && fi.menuItemSlots.join() === "x-item" && fi.menuSlots.join() === "x-content", `focus: ring "control; no ring on items" names x-control only; menu item and surface found by role (${JSON.stringify(fi)})`);

    // The in-page checks, on planted pages.
    const { browser: unitBrowser } = await launchChromium({ headed: false });
    try {
      const upage = await unitBrowser.newPage({ viewport: { width: 800, height: 600 } });
      const onPage = async (html) => { await upage.setContent(`<!doctype html><html><body style="margin:0;font:16px sans-serif">${html}</body></html>`); await upage.evaluate(pageLib); };
      const tab = async (info) => { await upage.evaluate(() => document.activeElement?.blur?.()); await upage.keyboard.press("Tab"); return upage.evaluate((i) => window.__ct.focused(i), info); };
      const FIELD = (ring) => `<style>.c{display:flex;padding:4px;outline:0 solid blue}${ring ? ".c:focus-within{outline:2px solid blue}" : ""} input{outline:none;border:0}</style><div data-slot="x-control" class="c"><input aria-label="Name"></div>`;
      await onPage(FIELD(true));
      let f = await tab({ ringSlots: ["x-control"] });
      say(f && f.ok && /x-control/.test(f.via), `focus: an input whose ring part draws the ring through :focus-within passes (${f && (f.via || f.notes.join("; "))})`);
      await onPage(FIELD(true));
      f = await tab({ ringSlots: [] });
      say(f && !f.ok, `focus: the same input fails when the spec names no ring part (${f && `outline ${f.style} ${f.width} px`})`);
      await onPage(FIELD(false));
      f = await tab({ ringSlots: ["x-control"] });
      say(f && !f.ok && f.notes.some((n) => n.includes("x-control")), `focus: an input whose named ring part draws nothing fails (${f && f.notes.join("; ")})`);
      const MENU = (bg, lit) => `<div data-slot="x-content" role="menu" style="background:#ffffff;padding:4px"><div data-slot="x-item" role="menuitem" tabindex="-1" ${lit ? "data-highlighted" : ""} style="background:${bg};outline:none;padding:8px">Rename</div></div>`;
      const menuFocus = async () => upage.evaluate(() => { document.querySelector('[data-slot="x-item"]').focus(); return window.__ct.focused({ ringSlots: [], menuItemSlots: ["x-item"], menuSlots: ["x-content"] }); });
      await onPage(MENU("#333333", true)); f = await menuFocus();
      say(f && f.ok && /highlight/.test(f.via), `focus: a highlighted menu item 12 to 1 against the surface passes (${f && (f.via || f.notes.join("; "))})`);
      await onPage(MENU("#eeeeee", true)); f = await menuFocus();
      say(f && !f.ok, `focus: a highlighted menu item barely different from the surface fails (${f && f.notes.join("; ")})`);
      await onPage(MENU("#333333", false)); f = await menuFocus();
      say(f && !f.ok, `focus: a menu item with a dark fill but no [data-highlighted] fails (${f && f.notes.join("; ")})`);
      await onPage(`<span data-radix-focus-guard tabindex="0" style="position:fixed;width:1px;height:1px;outline:none"></span><button style="outline-offset:2px">Go</button>`);
      f = await tab({});
      say(f && f.guard === true, "focus: a Radix focus guard is reported as a guard, not as a control");
      // Target size, WCAG 2.5.8 as written.
      const BTN = (style, text = "x") => `<button style="all:unset;display:block;box-sizing:border-box;${style}">${text}</button>`;
      const targets = async (html) => { await onPage(html); return upage.evaluate(() => window.__ct.targets()); };
      let t = await targets(`<div style="padding:40px">${BTN("width:60px;height:16px")}${BTN("width:60px;height:16px")}</div>`);
      say(t.failures.length === 2, `target size: two 16 px controls stacked edge to edge both fail (${t.failures.map((x) => `${x.where} ${x.width}x${x.height} near ${x.near}`).join("; ")})`);
      t = await targets(`<div style="padding:40px">${BTN("width:16px;height:16px")}</div><div style="padding:40px">${BTN("width:16px;height:16px")}</div>`);
      say(t.failures.length === 0 && t.spaced === 2, `target size: 16 px controls 80 px apart pass by spacing (${t.spaced} spaced, ${t.failures.length} failures)`);
      t = await targets(`<div style="padding:40px;display:flex;align-items:flex-start;gap:2px">${BTN("width:16px;height:16px")}${BTN("width:44px;height:44px")}</div>`);
      say(t.failures.length === 1 && t.failures[0].width === 16, `target size: a 16 px control 2 px from a 44 px one fails, its circle meets the other target (${t.failures.map((x) => `near ${x.near}`).join("; ")})`);
      t = await targets(`<p>Read the <a href="#a">terms</a> and the <a href="#b">policy</a> before you pay.</p>`);
      say(t.failures.length === 0 && t.inline === 2, `target size: two links inline in a sentence pass (${t.inline} inline)`);
      t = await targets(`<div role="tabpanel" tabindex="0" style="height:20px">Panel</div><div tabindex="0" style="height:20px;overflow:auto"><p style="height:200px;margin:0">Long</p></div><div role="dialog" tabindex="0" style="height:20px">D</div><div style="padding:40px"><div tabindex="0" style="height:20px;width:40px">a</div><div tabindex="0" style="height:20px;width:40px">b</div></div>`);
      say(t.notTargets === 3 && t.failures.length === 2, `target size: a tabpanel, a scrolling region and a dialog are not measured, two small focusable divs still fail (${t.notTargets} not targets, ${t.failures.length} failures)`);
      // Choosing the instance.
      const TABS = `<div><button data-slot="t" tabindex="-1" data-state="inactive">A</button><button data-slot="t" tabindex="0" data-state="active">B</button><button data-slot="t" tabindex="-1" data-state="inactive" disabled data-disabled>C</button><button data-slot="t" style="display:none">D</button></div>`;
      const pickOn = async (html, o) => { await onPage(html); return upage.evaluate((x) => { const r = window.__ct.pick(x); const t = document.querySelector("[data-ct-target]"); return { ...r, text: t ? t.textContent : null }; }, o); };
      let p = await pickOn(TABS, { partSel: '[data-slot~="t"]', stateSel: ":focus-visible", focus: true, prefer: "unmatched" });
      say(p.text === "B", `instance: focus-by-keyboard picks the tab that can take focus (tabindex not -1): ${p.text}`);
      p = await pickOn(TABS, { partSel: '[data-slot~="t"]', stateSel: '[data-state="inactive"]', prefer: "matched" });
      say(p.text === "A", `instance: a prop-only state picks a visible, enabled instance already in it: ${p.text}`);
      p = await pickOn(TABS, { partSel: '[data-slot~="t"]', stateSel: "[data-disabled]", allowDisabled: true, prefer: "matched" });
      say(p.text === "C", `instance: the disabled state may pick the disabled instance: ${p.text}`);
      p = await pickOn(TABS, { partSel: '[data-slot~="t"]', stateSel: ":hover", strongerSels: [["selected", '[data-slot~="t"][data-state="active"]']], prefer: "unmatched" });
      say(p.text === "A", `instance: an instance in a stronger state is passed over for another: ${p.text}`);
      await onPage(`<div role="tablist" tabindex="0" onfocus="document.getElementById('b').focus()"><button id="a" data-slot="t" tabindex="-1" data-state="inactive">A</button><button id="b" data-slot="t" tabindex="-1" data-state="active">B</button></div>`);
      await upage.evaluate(() => window.__ct.pick({ partSel: '[data-slot~="t"]', stateSel: ":focus-visible", focus: true, own: true }));
      await upage.evaluate(() => document.activeElement?.blur?.());
      const roved = await tabToEligible(upage, true);
      const landed = await upage.evaluate(() => window.__ctOwn && window.__ctOwn.textContent);
      say(roved && landed === "B", `instance: in a roving focus group (every tab tabindex -1, the list forwards focus) Tab lands on the selected tab, which becomes the instance: ${landed}`);
      await onPage(`<div data-slot="x-control"><input aria-label="n" disabled></div>`);
      const dis = await upage.evaluate(() => window.__ct.pick({ partSel: '[data-slot~="x-control"]', focus: true }));
      say(dis.allDisabled === true, `instance: a part whose only focusable element is disabled is passed over as disabled, not failed (${JSON.stringify(dis)})`);
      p = await pickOn(`<div data-slot="x-control"><span>Name</span><input aria-label="n"></div>`, { partSel: '[data-slot~="x-control"]', focus: true });
      say(p.text !== null && /input/.test(p.via || ""), `instance: a part that cannot take focus is reached through its focusable descendant (${p.via})`);
      p = await pickOn(`<section data-example="e"><button>Open</button></section><div data-slot="m-item" tabindex="-1">Portalled</div>`, { partSel: '[data-slot~="m-item"]' });
      say(p.text === "Portalled", "instance: a part outside the example's section (a portal) is found document-wide");
      p = await pickOn(`<button data-slot="button dropdown-menu-trigger">Options</button>`, { partSel: '[data-slot~="dropdown-menu-trigger"]' });
      const words = await upage.evaluate(() => window.__ct.slots());
      say(p.text === "Options" && words.join() === "button,dropdown-menu-trigger", `slots: an element carrying "button dropdown-menu-trigger" is found as either part (${words.join(", ")})`);
    } finally {
      await unitBrowser.close();
    }

    // --dist with nothing built is an error, not a silent pass.
    let distErr = null;
    try { await runAll([], { dist: join(tmp, "no-bundle"), build: false, quiet: true }); } catch (e) { distErr = e.message; }
    say(!!distErr && distErr.includes("build it first"), `--dist on a folder with no bundle fails${distErr ? `: ${distErr.slice(0, 80)}` : ""}`);

    // An invalid copy of the fixture spec: anatomy is a string and states a number. It must be reported, not crash.
    const broken = JSON.parse(readFileSync(fixture.specFile, "utf8"));
    broken.anatomy = "not an object";
    broken.states = 5;
    const brokenFile = join(tmp, "fixture.spec.json");
    writeFileSync(brokenFile, JSON.stringify(broken));

    const result = await runAll([fixture], { headed: argv.includes("--headed"), quiet: true });
    const checks = result.checks;
    for (const comp of result.components) { comp.fixture = true; printComponent(comp, checks); }
    const summary = summarise(checks, result.components);
    console.log(`\nfixture run: ${summaryLine(summary)}\n`);

    for (const [name, test] of PLANTED) {
      const hit = checks.find(test);
      say(!!hit, `${name}${hit ? ` -> [${hit.check}]${hit.example ? ` ${hit.example}` : ""}${hit.config ? ` (${hit.config})` : ""}${hit.requirement ? ` ${hit.requirement}` : ""}` : " (no check reported it)"}`);
    }
    // The clean examples must pass every check they were given.
    for (const id of ["clean", "disabled"]) {
      const mine = checks.filter((c) => c.example === id);
      const bad = mine.filter((c) => c.status !== "pass");
      say(mine.length > 0 && bad.length === 0, `the ${id} example passes all ${mine.length} of its checks${bad.length ? `; but: ${bad.map((c) => `[${c.check}] ${c.config ?? ""} ${c.detail}`).join("; ")}` : ""}`);
    }
    for (const [name, test, count = 1] of MUST_PASS) {
      const n = checks.filter(test).length;
      say(n >= count, `passes ${name} (${n} of ${count} needed)`);
    }

    // The reach grammar end to end on a copy of the fixture spec: example:<id> and @<part> choose exactly that example
    // and part, so the planted hover colour is still caught there and the clean example is not tried; "open" with no
    // trigger part is "reach not understood"; open@control clicks the named part and checks the result.
    const reached = JSON.parse(readFileSync(fixture.specFile, "utf8"));
    reached.states.hover.reach = "example:state-colour > hover@control";
    reached.states.opened = { on: "control", selector: '[data-state="open"]', source: "primitive", figma: null, reach: "open", description: "Planted: the fixture has no trigger part." };
    reached.states.clicked = { on: "control", selector: '[data-state="open"]', source: "primitive", figma: null, reach: "example:clean > open@control", description: "Planted: clicking the control opens nothing." };
    reached.anatomy.badge = { kind: "text", role: null, slot: "fixture-badge", element: "span", required: false, description: "Planted: optional, and no example renders it." };
    reached.states.badgeHover = { on: "badge", selector: ":hover", source: "native", figma: null, reach: "example:clean > click@control > hover", description: "Planted: an optional part the example does not render." };
    reached.states.hintHover = { on: "hint", selector: ":hover", source: "native", figma: null, reach: "example:clean > click@control > hover", description: "Planted: a required part the example does not render." };
    const reachedFile = join(tmp, "reach", "fixture.spec.json");
    mkdirSync(dirname(reachedFile), { recursive: true });
    writeFileSync(reachedFile, JSON.stringify(reached));
    const third = await runAll([{ ...fixture, specFile: reachedFile }], { quiet: true, build: false });
    const hov = third.checks.filter((c) => c.check === "state:hover");
    say(hov.length === 2 && hov.every((c) => c.example === "state-colour" && c.status === "fail" && c.detail.includes("interactive/primary/hover")), `reach in the browser: "example:state-colour > hover@control" drives only state-colour and still catches its colour (${hov.map((c) => `${c.example} ${c.config} ${c.status}`).join("; ")})`);
    const op = third.checks.find((c) => c.check === "state:opened");
    say(op && op.status === "not-reached" && op.detail.startsWith("reach not understood") && op.detail.includes("trigger"), `reach in the browser: "open" on a spec with no trigger part is reach not understood (${op ? op.detail.slice(0, 110) : "no check"})`);
    const cl = third.checks.filter((c) => c.check === "state:clicked");
    say(cl.length === 2 && cl.every((c) => c.example === "clean" && c.status === "fail" && c.detail.includes("does not match")), `reach in the browser: "example:clean > open@control" clicks the control and reports that nothing opened (${cl.map((c) => `${c.example} ${c.status}: ${c.detail.slice(0, 60)}`).join("; ")})`);

    const bh = third.checks.filter((c) => c.check === "state:badgeHover");
    say(bh.length === 1 && bh[0].status === "not-reached" && bh[0].detail.includes("renders no badge"), `optional parts in the browser: hovering an optional part the example does not render passes the example over (${bh.map((c) => `${c.status}: ${c.detail.slice(0, 120)}`).join("; ")})`);
    const hh = third.checks.filter((c) => c.check === "state:hintHover");
    say(hh.length === 2 && hh.every((c) => c.status === "fail" && c.detail.includes("no hint part")), `optional parts in the browser: hovering a required part the example does not render still fails (${hh.map((c) => `${c.status}: ${c.detail.slice(0, 80)}`).join("; ")})`);

    // The invalid spec, end to end on one example.
    const second = await runAll([{ ...fixture, specFile: brokenFile }], { onlyExample: "clean", quiet: true });
    const specCheck = second.checks.find((c) => c.check === "spec");
    say(specCheck && specCheck.status === "fail" && /schema/.test(specCheck.detail), `an invalid spec is reported, not crashed on -> [spec] ${specCheck ? specCheck.detail.slice(0, 120) : "(no spec check)"}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`test-components self-test: ${caught} of ${lines} expectations met (${PLANTED.length} planted faults, clean examples, required passes, invalid spec)`);
  return caught === lines ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(`test-components: failed: ${e.stack || e.message}`); process.exitCode = 1; });
}
