#!/usr/bin/env node
// Souvenir size report (spec section 3, "Budgets").
//   node scripts/size.mjs [--root <dir>]
// Every size is gzip level 9 after minifying.
//   each component's CSS (src/components/<name>/*.css, minified by esbuild)  <= 2048 bytes
//   each dist/components/<name>.js                                           <= 5120 bytes
//   dist/souvenir.min.css (tokens, base and components together)             <= 12288 bytes
//   each dist/ui-sdk/<name>.js: reported beside the 5120 byte budget, marked OVER or within, never failing
// Prints a table, writes it to gates/raw/2026-11-15-size.json, exits 1 if any failing row is over budget.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argRoot = process.argv.indexOf("--root");
const ROOT = argRoot > 0 ? resolve(process.argv[argRoot + 1]) : REPO;
const OUT = join(ROOT, "gates", "raw", "2026-11-15-size.json");

const CSS_BUDGET = 2048, JS_BUDGET = 5120, ALL_CSS_BUDGET = 12288;
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const dirs = (p) => (existsSync(p) ? readdirSync(p).sort().filter((n) => statSync(join(p, n)).isDirectory()) : []);
const files = (p, ext) => (existsSync(p) ? readdirSync(p).sort().filter((n) => n.endsWith(ext)) : []);

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
  for (const f of files(join(ROOT, "dist", "ui-sdk"), ".js")) {
    const buf = readFileSync(join(ROOT, "dist", "ui-sdk", f));
    rows.push({ item: `UI SDK ${f.replace(/\.js$/, "")}`, file: `dist/ui-sdk/${f}`, minified: buf.length, gzip: gz(buf), budget: JS_BUDGET, counts: false });
  }
  for (const r of rows) {
    r.over = r.gzip > r.budget;
    r.result = r.over ? "OVER" : "within";
  }

  const head = ["Item", "File", "Minified", "Gzip 9", "Budget", "Result"];
  const body = rows.map((r) => [r.item, r.file, String(r.minified), String(r.gzip), String(r.budget), r.result + (r.counts ? "" : " (reported, not failing)")]);
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
    budgets: { component_css: CSS_BUDGET, component_js: JS_BUDGET, all_css: ALL_CSS_BUDGET, ui_sdk_reported_against: JS_BUDGET },
    rows,
    over_budget: failing.map((r) => r.item),
    pass: failing.length === 0,
  }, null, 2) + "\n");
  console.log(`size: ${rows.length} rows, ${failing.length} over budget; written to ${OUT.startsWith(REPO) ? OUT.slice(REPO.length + 1) : OUT}`);
  return failing.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (err) => { console.error(`size: ${err.message}`); process.exitCode = 1; });
