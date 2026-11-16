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
//      target-size (every focusable control at least 24 by 24), focus-visible (every control reached by
//      real Tab presses shows an outline at least 2 px wide).
//   b. anatomy: every required part that has an element appears with its data-slot across the examples, found
//      document-wide (a portalled part sits outside its example's section); no unlisted data-slot. A part whose
//      element is null renders nothing and is not looked for.
//   c. state:<name>: each state is driven as its "reach" says and the part must match its selector; colours
//      named by the spec's rules for that state are compared with tokens.json for the theme.
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
const obj = (x) => (isObj(x) ? x : {});
const arr = (x) => (Array.isArray(x) ? x : []);
const cfgLabel = (c) => (c ? `${c.theme} ${c.width}${c.density === "compact" ? " compact" : ""}` : "");
const slotSel = (slot) => `[data-slot=${JSON.stringify(String(slot))}]`;

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
    targets() {
      const sel = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable="true"], [contenteditable=""]';
      const failures = [];
      let checked = 0;
      for (const el of document.querySelectorAll(sel)) {
        if (el.matches(":disabled") || el.tabIndex < 0) continue;
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        checked++;
        if (r.width < 23.99 || r.height < 23.99) failures.push({ where: describe(el), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
      }
      return { checked, failures };
    },
    focused() {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (!el.__ctKey) el.__ctKey = ++keys;
      const cs = getComputedStyle(el);
      return { key: el.__ctKey, where: describe(el), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0 };
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
    slots() {
      return [...new Set([...document.querySelectorAll("[data-slot]")].map((e) => e.getAttribute("data-slot")))].sort();
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
      if (tg.checked) rec({ ...base, check: "target-size", status: tg.failures.length ? "fail" : "pass", detail: tg.failures.length ? tg.failures.map((f) => `${f.where} is ${f.width} by ${f.height} px; needs 24 by 24`).join("; ") : `${tg.checked} controls` });

      // focus by real Tab presses
      const limit = (await page.evaluate(() => window.__ct.focusables())) + 3;
      await page.evaluate(() => document.activeElement?.blur?.());
      const seen = new Set();
      const reached = [];
      for (let i = 0; i < limit; i++) {
        await page.keyboard.press("Tab");
        const f = await page.evaluate(() => window.__ct.focused());
        if (!f) { if (reached.length) break; continue; }
        if (seen.has(f.key)) break;
        seen.add(f.key);
        reached.push(f);
      }
      if (reached.length) {
        const bad = reached.filter((f) => f.style === "none" || f.style === "hidden" || f.width < 1.99);
        rec({ ...base, check: "focus-visible", status: bad.length ? "fail" : "pass", detail: bad.length ? bad.map((f) => `${f.where}: outline ${f.style} ${f.width} px; needs a visible outline at least 2 px wide`).join("; ") : `${reached.length} controls reached by Tab` });
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
      const d = readSpec(join(SPECS, `${dep}.spec.json`)).spec;
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
  const colourTokens = loadColourTokens();
  const stateNames = Object.keys(states);
  const rank = (name) => { const i = precedence.indexOf(name); return i < 0 ? Infinity : i; };
  for (const [name, state] of Object.entries(states)) {
    const check = `state:${name}`;
    if (!isObj(state)) { rec({ check, status: "fail", detail: "the state entry is not an object" }); continue; }
    const part = obj(anatomy[state.on]);
    if (!part.slot) { rec({ check, status: "fail", detail: `the state is on "${state.on}", which is not a part with a data-slot` }); continue; }
    const reach = typeof state.reach === "string" ? state.reach.trim() : "";
    const partSel = slotSel(part.slot);
    const stateSel = partSel + (state.selector ?? "");
    let kind = null, key = null, propName = null, propValue = null;
    if (["hover", "press", "focus-by-keyboard", "click"].includes(reach)) kind = reach;
    else if (/^key:.+/.test(reach)) { kind = "key"; key = reach.slice(4); }
    else if (/^prop:[^=]+=.*/.test(reach)) { kind = "prop"; [propName] = reach.slice(5).split("="); propValue = parseReachValue(reach.slice(5 + propName.length + 1)); }
    if (!kind) { rec({ check, status: "not-reached", detail: `the reach "${reach || "(none)"}" is not one this tool can follow` }); continue; }

    let candidates = runnable.filter((ex) => (slotsByExample.get(ex.id) || []).includes(part.slot));
    if (kind === "prop") candidates = candidates.filter((ex) => propEquals(obj(ex.props)[propName], propValue));
    if (!candidates.length) {
      rec({ check, status: "not-reached", detail: kind === "prop" ? `no example has ${propName}=${JSON.stringify(propValue)} and renders data-slot="${part.slot}"` : `no example renders data-slot="${part.slot}"` });
      continue;
    }
    // A stronger state already on the part decides its look, so driving this one there proves nothing.
    const stronger = stateNames.filter((s) => s !== name && isObj(states[s]) && states[s].on === state.on && rank(s) < rank(name));
    let reachedAny = false;
    const skipped = [];
    for (const ex of candidates) {
      for (const theme of ["light", "dark"]) {
        const config = { theme, width: STATE_WIDTH, density: "standard" };
        await run.openExample(page, slug, ex.id, config);
        const pick = await page.evaluate(({ partSel, stateSel, strongerSels }) => {
          const els = [...document.querySelectorAll(partSel)];
          if (!els.length) return { none: true };
          const safe = (el, sel) => { try { return el.matches(sel); } catch { return null; } };
          if (safe(els[0], stateSel) === null) return { badSelector: true };
          let i = els.findIndex((e) => !safe(e, stateSel));
          if (i < 0) i = 0;
          els[i].setAttribute("data-ct-target", "");
          return { already: strongerSels.filter(([, sel]) => safe(els[i], sel)).map(([n]) => n) };
        }, { partSel, stateSel, strongerSels: kind === "prop" ? [] : stronger.map((s) => [s, partSel + (states[s].selector ?? "")]) });
        if (pick.badSelector) { rec({ check, example: ex.id, config, status: "fail", detail: `the selector ${stateSel} is not valid CSS` }); break; }
        if (pick.none) continue;
        if (pick.already.length) { skipped.push(`${ex.id} (${pick.already.join(", ")})`); break; }

        const target = page.locator("[data-ct-target]").first();
        let pressed = false;
        try {
          if (kind === "hover" || kind === "press") {
            const box = await target.boundingBox();
            if (!box) throw new Error("the part has no box to point at");
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            if (kind === "press") { await page.mouse.down(); pressed = true; }
          } else if (kind === "click") {
            await target.click({ timeout: 3000 });
          } else if (kind === "focus-by-keyboard" || kind === "key") {
            await page.evaluate(() => document.activeElement?.blur?.());
            let ok = false;
            for (let i = 0; i < 60 && !ok; i++) {
              await page.keyboard.press("Tab");
              ok = await page.evaluate((k) => {
                const a = document.activeElement, t = document.querySelector("[data-ct-target]");
                if (!a || !t) return false;
                if (a === t) return true;
                return k === "key" && (t.contains(a) || a.contains(t) || !!a.closest("section[data-example]"));
              }, kind);
            }
            if (!ok) throw new Error("Tab never reached the part");
            if (kind === "key") await page.keyboard.press(key);
          }
          const seen = await page.evaluate(({ partSel, stateSel, kind, allStates, parts }) => {
            let el = document.querySelector("[data-ct-target]");
            let matched = el.matches(stateSel);
            if (!matched && kind === "key") { const alt = [...document.querySelectorAll(partSel)].find((e) => e.matches(stateSel)); if (alt) { el = alt; matched = true; } }
            const safe = (e, sel) => { try { return e.matches(sel); } catch { return false; } };
            const active = allStates.filter(([, on, ps, sel]) => (ps === partSel ? safe(el, ps + sel) : [...document.querySelectorAll(ps)].some((e) => safe(e, ps + sel)))).map(([n]) => n);
            const colours = {};
            for (const [partKey, ps] of parts) {
              const t = ps === partSel ? el : el.querySelector(ps) || el.closest(ps) || document.querySelector(ps);
              if (!t) continue;
              const cs = getComputedStyle(t);
              colours[partKey] = { background: cs.backgroundColor, color: cs.color, borderColor: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor] };
            }
            return { matched, active, colours };
          }, {
            partSel, stateSel, kind,
            allStates: stateNames.filter((s) => isObj(states[s]) && isObj(anatomy[states[s].on])).map((s) => [s, states[s].on, slotSel(anatomy[states[s].on].slot), states[s].selector ?? ""]),
            parts: Object.entries(anatomy).filter(([, p]) => isObj(p) && p.slot).map(([k, p]) => [k, slotSel(p.slot)]),
          });
          if (pressed) { await page.mouse.up(); pressed = false; }
          if (!seen.matched) { rec({ check, example: ex.id, config, status: "fail", detail: `after "${reach}", the part does not match ${stateSel}` }); continue; }
          reachedAny = true;

          // Expected colours: the spec's rules read like a stylesheet, for the states now on and the example's props.
          const effective = { ...defaults, ...obj(ex.props) };
          const applies = rules.filter((r) => {
            const w = obj(r.when);
            if (w.media) return false;
            if (!arr(w.states).every((s) => seen.active.includes(s))) return false;
            return Object.entries(obj(w.props)).every(([k, v]) => propEquals(effective[k], v));
          });
          const problems = [], compared = [];
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
              const actual = seen.colours[partKey];
              if (!actual) { problems.push(`${partKey} is not found next to the part, so its ${cssName} cannot be compared`); continue; }
              const want = resolveColourToken(colourTokens, String(token), theme);
              if (want.problem) { problems.push(`${partKey} ${cssName}: ${want.problem}`); continue; }
              const got = prop === "borderColor" ? actual.borderColor : [actual[prop]];
              const bad = got.map(parseCssColour).find((g) => !sameColour(g, want.rgba));
              compared.push(`${partKey} ${cssName}`);
              if (bad !== undefined) problems.push(`${partKey} ${cssName} is ${showColour(bad)}, but ${token} is ${want.raw} (${showColour(want.rgba)}) in ${theme}`);
            }
          }
          rec({ check, example: ex.id, config, status: problems.length ? "fail" : "pass", detail: problems.length ? problems.join("; ") : compared.length ? `matches ${state.selector}; ${compared.join(", ")} equal their tokens` : `matches ${state.selector}; no colour rule names this state` });
        } catch (e) {
          if (pressed) await page.mouse.up().catch(() => {});
          rec({ check, example: ex.id, config, status: "fail", detail: `could not drive "${reach}": ${e.message.split("\n")[0]}` });
        }
      }
    }
    if (!reachedAny && !run.checks.some((c) => c.component === slug && c.check === check)) {
      rec({ check, status: "not-reached", detail: skipped.length ? `every candidate example was already in a stronger state: ${skipped.join("; ")}` : "no example could be put into this state" });
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
  ["a control 16 pixels tall", (c) => c.check === "target-size" && c.example === "small-target" && c.status === "fail"],
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
