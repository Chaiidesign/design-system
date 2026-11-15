#!/usr/bin/env node
// Souvenir size report (spec section 3, "Budgets").
//   node scripts/size.mjs [--root <dir>] [--out <file.json>]
//   node scripts/size.mjs --self-test
// Every size is gzip level 9 after minifying.
//   each component's CSS (src/components/<name>/*.css, minified by esbuild)  <= 2048 bytes
//   each dist/components/<name>.js                                           <= 5120 bytes
//   dist/souvenir.min.css (tokens, base and components together)             <= 12288 bytes
//   all component scripts together: dist/souvenir.js, the one bundle of every component script that a page loads
//                                                                            <= 15360 bytes
//   the checkout page: screens/checkout.html and every file it loads (stylesheet and icon links, scripts, images, and
//   the relative imports of those scripts and stylesheets), each gzipped on its own as it is sent, summed
//                                                                            <= 102400 bytes
//   each dist/ui-sdk/<name>.js: reported beside the 5120 byte budget, marked OVER or within, never failing
// A row that cannot be measured (dist/souvenir.js or screens/checkout.html missing, or a file the page loads missing)
// is marked MISSING and fails.
// Prints a table, writes it to gates/raw/2026-11-15-size.json under the root (or to --out), exits 1 if any failing
// row is over budget or missing.
// --self-test builds four small trees in a temporary folder under scripts/.tmp/ and runs this script on each with --root: one within
// every budget must exit 0; one with a component's CSS over budget, one with the component scripts over budget and
// one with the checkout page over budget must each exit 1 and name exactly that row.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const SELF = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(SELF), "..");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const ROOT = arg("--root") ? resolve(arg("--root")) : REPO;
const OUT = arg("--out") ? resolve(arg("--out")) : join(ROOT, "gates", "raw", "2026-11-15-size.json");

const CSS_BUDGET = 2048, JS_BUDGET = 5120, ALL_CSS_BUDGET = 12288, ALL_JS_BUDGET = 15360, PAGE_BUDGET = 102400;
const PAGE = "screens/checkout.html";
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const dirs = (p) => (existsSync(p) ? readdirSync(p).sort().filter((n) => statSync(join(p, n)).isDirectory()) : []);
const files = (p, ext) => (existsSync(p) ? readdirSync(p).sort().filter((n) => n.endsWith(ext)) : []);
const posix = (p) => p.split(sep).join("/");

// Every file a page loads: <link href> (stylesheet, icon, preload, modulepreload), <script src>, <img src>, and,
// inside a loaded script or stylesheet, its relative imports. Only relative URLs; the page's own folder is the base.
function pageFiles(pageAbs) {
  const seen = new Map(); // abs path -> exists
  const queue = [pageAbs];
  const rel = (from, url) => {
    if (!url || /^([a-z][\w+.-]*:|\/\/|#)/i.test(url)) return null;
    return resolve(dirname(from), url.split(/[?#]/)[0]);
  };
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    const ok = existsSync(f) && statSync(f).isFile();
    seen.set(f, ok);
    if (!ok) continue;
    const text = readFileSync(f, "utf8");
    const found = [];
    if (/\.html?$/i.test(f)) {
      for (const m of text.matchAll(/<link\b[^>]*>/gi)) {
        const relAttr = (/\brel\s*=\s*["']?([^"'>]+)/i.exec(m[0]) || [])[1] || "";
        const href = (/\bhref\s*=\s*["']([^"']*)["']/i.exec(m[0]) || [])[1];
        if (/(^|\s)(stylesheet|icon|preload|modulepreload)(\s|$)/i.test(relAttr)) found.push(href);
      }
      for (const m of text.matchAll(/<(?:script|img)\b[^>]*\bsrc\s*=\s*["']([^"']*)["']/gi)) found.push(m[1]);
    } else if (/\.m?js$/i.test(f)) {
      for (const m of text.matchAll(/(?:\bimport\s*\(?|\bfrom)\s*["'](\.{1,2}\/[^"']+)["']/g)) found.push(m[1]);
    } else if (/\.css$/i.test(f)) {
      for (const m of text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)) found.push(m[1]);
    }
    for (const u of found) { const p = rel(f, u); if (p) queue.push(p); }
  }
  return [...seen].map(([path, exists]) => ({ path, exists }));
}

async function main() {
  const minCss = join(ROOT, "dist", "souvenir.min.css");
  if (!existsSync(minCss)) { console.error("size: dist/souvenir.min.css is missing; run node scripts/build.mjs first"); return 1; }
  const rows = [];

  for (const name of dirs(join(ROOT, "src", "components"))) {
    const dir = join(ROOT, "src", "components", name);
    const css = files(dir, ".css").map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
    if (!css) continue;
    const m = await esbuild.transform(css, { loader: "css", minify: true, legalComments: "none" });
    rows.push({ item: `${name} CSS`, file: `src/components/${name}/*.css`, minified: Buffer.byteLength(m.code), gzip: gz(m.code), budget: CSS_BUDGET, counts: true });
  }
  for (const f of files(join(ROOT, "dist", "components"), ".js")) {
    const buf = readFileSync(join(ROOT, "dist", "components", f));
    rows.push({ item: `${f.replace(/\.js$/, "")} JS`, file: `dist/components/${f}`, minified: buf.length, gzip: gz(buf), budget: JS_BUDGET, counts: true });
  }
  {
    const buf = readFileSync(minCss);
    rows.push({ item: "all CSS", file: "dist/souvenir.min.css", minified: buf.length, gzip: gz(buf), budget: ALL_CSS_BUDGET, counts: true });
  }
  {
    const p = join(ROOT, "dist", "souvenir.js");
    if (existsSync(p)) {
      const buf = readFileSync(p);
      rows.push({ item: "all component scripts", file: "dist/souvenir.js", minified: buf.length, gzip: gz(buf), budget: ALL_JS_BUDGET, counts: true,
        method: "gzip level 9 of dist/souvenir.js, the single minified bundle of every src/components/*/*.js" });
    } else {
      rows.push({ item: "all component scripts", file: "dist/souvenir.js", minified: null, gzip: null, budget: ALL_JS_BUDGET, counts: true, missing: ["dist/souvenir.js"] });
    }
  }
  {
    const pageAbs = join(ROOT, ...PAGE.split("/"));
    const loaded = pageFiles(pageAbs);
    const missing = loaded.filter((x) => !x.exists).map((x) => posix(relative(ROOT, x.path)));
    const parts = loaded.filter((x) => x.exists).map((x) => { const buf = readFileSync(x.path); return { file: posix(relative(ROOT, x.path)), bytes: buf.length, gzip: gz(buf) }; });
    rows.push({ item: "checkout page", file: `${PAGE} and the ${Math.max(0, parts.length - 1)} files it loads`,
      minified: parts.reduce((n, p) => n + p.bytes, 0), gzip: parts.reduce((n, p) => n + p.gzip, 0), budget: PAGE_BUDGET, counts: true,
      method: "each file gzipped (level 9) on its own, as it is sent, then summed; sizes as stored (the page links the files as they are)",
      parts, ...(missing.length ? { missing } : {}) });
  }
  for (const f of files(join(ROOT, "dist", "ui-sdk"), ".js")) {
    const buf = readFileSync(join(ROOT, "dist", "ui-sdk", f));
    rows.push({ item: `UI SDK ${f.replace(/\.js$/, "")}`, file: `dist/ui-sdk/${f}`, minified: buf.length, gzip: gz(buf), budget: JS_BUDGET, counts: false });
  }
  for (const r of rows) {
    r.over = r.missing ? true : r.gzip > r.budget;
    r.result = r.missing ? "MISSING" : r.over ? "OVER" : "within";
  }

  const head = ["Item", "File", "Minified", "Gzip 9", "Budget", "Result"];
  const body = rows.map((r) => [r.item, r.file, String(r.minified ?? "-"), String(r.gzip ?? "-"), String(r.budget), r.result + (r.counts ? "" : " (reported, not failing)") + (r.missing ? ` (${r.missing.join(", ")})` : "")]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => "| " + cells.map((c, i) => (i >= 2 && i <= 4 ? c.padStart(widths[i]) : c.padEnd(widths[i]))).join(" | ") + " |";
  console.log(line(head));
  console.log("|" + widths.map((w, i) => (i >= 2 && i <= 4 ? "-".repeat(w + 1) + ":" : "-".repeat(w + 2))).join("|") + "|");
  body.forEach((b) => console.log(line(b)));

  const failing = rows.filter((r) => r.counts && r.over);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    produced_by: "scripts/size.mjs",
    measured_at: new Date().toISOString(),
    method: "gzip level 9 of the minified file (component CSS minified by esbuild from src)",
    budgets: { component_css: CSS_BUDGET, component_js: JS_BUDGET, all_css: ALL_CSS_BUDGET, all_component_scripts: ALL_JS_BUDGET, checkout_page: PAGE_BUDGET, ui_sdk_reported_against: JS_BUDGET },
    rows,
    over_budget: failing.map((r) => r.item),
    pass: failing.length === 0,
  }, null, 2) + "\n");
  console.log(`size: ${rows.length} rows, ${failing.length} over budget or missing; written to ${OUT.startsWith(REPO + sep) ? posix(OUT.slice(REPO.length + 1)) : OUT}`);
  return failing.length ? 1 : 0;
}

// ---------------------------------------------------------------- self-test

// Text that gzip cannot shrink much (a seeded pseudo-random generator, so every run builds the same trees).
function noise(bytes, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  while (s.length < bytes) s += abc[Math.floor(rnd() * abc.length)];
  return s;
}

function writeTree(root, extra) {
  const put = (rel, text) => { const p = join(root, ...rel.split("/")); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
  put("src/components/demo/demo.css", "@layer sv.components { .sv-demo { display: grid; } }\n");
  put("dist/components/demo.js", "class e extends HTMLElement{}customElements.define(\"sv-demo\",e);\n");
  put("dist/souvenir.js", "class e extends HTMLElement{}customElements.define(\"sv-demo\",e);\n");
  put("dist/souvenir.css", ".sv-demo{display:grid}\n");
  put("dist/souvenir.min.css", ".sv-demo{display:grid}\n");
  put("screens/checkout.html", '<!doctype html><html lang="en"><head><title>Checkout</title><link rel="stylesheet" href="../dist/souvenir.css"><script type="module" src="../dist/souvenir.js"></script></head><body><main class="sv-demo"><h1>Checkout</h1></main></body></html>\n');
  for (const [rel, text] of Object.entries(extra)) put(rel, text);
}

function runSelfTest() {
  // inside the repository's ignored scripts/.tmp/, never outside the repository; removed at the end
  mkdirSync(join(REPO, "scripts", ".tmp"), { recursive: true });
  const tmp = mkdtempSync(join(REPO, "scripts", ".tmp", "size-self-test-"));
  const cases = [
    { name: "within every budget", extra: {}, exit: 0, over: [] },
    { name: "one component's CSS over 2048", extra: { "src/components/big/big.css": `@layer sv.components { .sv-big { --sv-big-noise: "${noise(4000, 1)}"; } }\n` }, exit: 1, over: ["big CSS"] },
    { name: "all component scripts over 15360", extra: { "dist/souvenir.js": `export const n="${noise(24000, 2)}";\n` }, exit: 1, over: ["all component scripts"] },
    { name: "checkout page over 102400", extra: { "dist/souvenir.css": `.sv-demo{--n:"${noise(150000, 3)}"}\n` }, exit: 1, over: ["checkout page"] },
  ];
  let problems = 0;
  console.log("size self-test: each tree must give its exit code and exactly its over-budget rows");
  try {
    cases.forEach((c, i) => {
      const root = join(tmp, `tree-${i}`);
      writeTree(root, c.extra);
      const out = join(tmp, `tree-${i}.json`);
      const r = spawnSync(process.execPath, [SELF, "--root", root, "--out", out], { encoding: "utf8" });
      let over = null;
      try { over = JSON.parse(readFileSync(out, "utf8")).over_budget; } catch { /* no JSON: a failure below */ }
      const ok = r.status === c.exit && Array.isArray(over) && over.length === c.over.length && c.over.every((x) => over.includes(x));
      if (!ok) problems++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(34)} expect exit ${c.exit}, over [${c.over.join(", ")}]; got exit ${r.status}, over [${over ? over.join(", ") : "no JSON written"}]`);
      if (!ok) console.log((r.stdout + r.stderr).split("\n").map((l) => "      " + l).join("\n"));
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`size self-test: ${cases.length} trees, ${problems} problem${problems === 1 ? "" : "s"}`);
  return problems ? 1 : 0;
}

if (process.argv.includes("--self-test")) process.exitCode = runSelfTest();
else main().then((code) => { process.exitCode = code; }, (err) => { console.error(`size: ${err.message}`); process.exitCode = 1; });
