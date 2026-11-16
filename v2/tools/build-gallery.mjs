#!/usr/bin/env node
// Builds the component gallery: one page where every component example is rendered.
//
//   node v2/tools/build-gallery.mjs              build ds-components/gallery/dist/
//   --dist <dir>                                 write the bundle to <dir> instead (default ds-components/gallery/dist).
//                                                Each builder uses its own, such as ds-components/gallery/dist-tabs
//                                                (git ignores dist-*), so parallel builds never overwrite each other.
//                                                The registry for a non-default dist is written inside that dist.
//   --component <slug>[,<slug>]                  bundle only these components (and the test fixture), so another
//                                                builder's half-written examples cannot break this bundle
//   node v2/tools/build-gallery.mjs --self-test  build into a scratch folder with a planted bad spec and
//                                                a planted examples file, and confirm both are handled
//
// What it does:
//   1. Finds components by folder. Each ds-components/src/<slug>/ that holds <slug>.examples.tsx is one
//      component. The test fixture in ds-components/gallery/fixture/ is always added, marked as a fixture
//      (it exists so the gallery and the test runner can be exercised; it is not part of the package).
//   2. Writes ds-components/gallery/src/registry.generated.ts, which imports every examples file and
//      carries the example titles from each spec (ds-components/specs/<slug>.spec.json). A spec that is
//      missing or unreadable is noted in the registry and on the page; it never stops the build.
//   3. Bundles ds-components/gallery/src/main.tsx with esbuild into dist/gallery.js.
//   4. Writes dist/gallery.css: the Geist font face, then ds-tokens/dist/tokens.css, then
//      ds-components/src/styles.css with its @imports inlined by esbuild (skipped with a note while it does not exist), then any CSS the
//      examples import, then the gallery's own stylesheet (ds-components/gallery/src/gallery.css).
//   5. Copies the Geist variable font and writes dist/index.html.
// Every generated file starts with a "generated, do not edit" line. Two runs give byte-identical files.
//
// URL parameters the page understands: component, example, theme (light|dark), density
// (standard|compact), dir (ltr|rtl), page=tokens. See ds-components/gallery/src/main.tsx.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "..", "..");
export const DEFAULT_DIST = join(REPO, "ds-components", "gallery", "dist");
const SRC = join(REPO, "ds-components", "src");
const SPECS = join(REPO, "ds-components", "specs");
const GALLERY = join(REPO, "ds-components", "gallery");
const FIXTURE = join(GALLERY, "fixture");
const TOKENS_CSS = join(REPO, "ds-tokens", "dist", "tokens.css");
const STYLES_CSS = join(SRC, "styles.css");
const FONT = join(REPO, "node_modules", "geist", "dist", "fonts", "geist-sans", "Geist-Variable.woff2");
const GENERATOR = "v2/tools/build-gallery.mjs";

const rel = (p) => relative(REPO, p).split(sep).join("/");
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

// ---------------------------------------------------------------- discovery

// Every component the gallery shows, sorted by slug, the fixture last.
// Each: { slug, fixture, examplesFile, specFile, testsFile }
export function discoverComponents({ srcDir = SRC, specDir = SPECS, includeFixture = true, only = null } = {}) {
  const found = [];
  if (existsSync(srcDir)) {
    for (const slug of readdirSync(srcDir).sort()) {
      if (only && !only.includes(slug)) continue;
      const dir = join(srcDir, slug);
      if (!statSync(dir).isDirectory()) continue;
      const examplesFile = join(dir, `${slug}.examples.tsx`);
      if (!existsSync(examplesFile)) continue;
      const tests = join(dir, `${slug}.tests.mjs`);
      found.push({ slug, fixture: false, examplesFile, specFile: join(specDir, `${slug}.spec.json`), testsFile: existsSync(tests) ? tests : null });
    }
  }
  if (includeFixture) {
    found.push({
      slug: "fixture", fixture: true,
      examplesFile: join(FIXTURE, "fixture.examples.tsx"),
      specFile: join(FIXTURE, "fixture.spec.json"),
      testsFile: join(FIXTURE, "fixture.tests.mjs"),
    });
  }
  return found;
}

// What the page needs from a spec: its name and the id and title of each example, in spec order.
// Never throws: a missing or broken spec gives { specProblem }.
export function readSpecMeta(component) {
  const meta = { slug: component.slug, name: component.slug, fixture: component.fixture, specFile: rel(component.specFile), specProblem: null, examples: [] };
  if (!existsSync(component.specFile)) { meta.specProblem = `no spec at ${rel(component.specFile)}`; return meta; }
  let spec;
  try { spec = JSON.parse(readFileSync(component.specFile, "utf8")); } catch (e) { meta.specProblem = `the spec is not readable JSON: ${e.message}`; return meta; }
  if (!isObj(spec)) { meta.specProblem = "the spec is not a JSON object"; return meta; }
  if (typeof spec.name === "string") meta.name = spec.name;
  if (!Array.isArray(spec.examples)) { meta.specProblem = "the spec has no examples list"; return meta; }
  for (const ex of spec.examples) {
    if (!isObj(ex) || typeof ex.id !== "string") continue;
    meta.examples.push({ id: ex.id, title: typeof ex.title === "string" ? ex.title : ex.id, note: typeof ex.note === "string" ? ex.note : null });
  }
  return meta;
}

// ---------------------------------------------------------------- generated registry

function registrySource(components, registryFile) {
  const from = dirname(registryFile);
  const lines = [
    `// Generated by ${GENERATOR}. Do not edit; add a ds-components/src/<slug>/<slug>.examples.tsx file and rebuild.`,
    "// One entry per component folder that has an examples file, sorted by slug, then the test fixture.",
    "",
  ];
  components.forEach((c, i) => {
    let p = relative(from, c.examplesFile).split(sep).join("/");
    if (!p.startsWith(".")) p = "./" + p;
    lines.push(`import * as m${i} from ${JSON.stringify(p)};`);
  });
  lines.push("");
  lines.push("export type ExampleMeta = { id: string; title: string; note: string | null };");
  lines.push("export type ComponentMeta = { slug: string; name: string; fixture: boolean; specFile: string; specProblem: string | null; examples: ExampleMeta[] };");
  lines.push("export type RegistryEntry = { meta: ComponentMeta; module: { examples?: Record<string, () => unknown> } };");
  lines.push("");
  lines.push("export const registry: RegistryEntry[] = [");
  components.forEach((c, i) => {
    lines.push(`  { meta: ${JSON.stringify(readSpecMeta(c))}, module: m${i} as RegistryEntry["module"] },`);
  });
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------- build

const writeIfChanged = (file, content) => {
  mkdirSync(dirname(file), { recursive: true });
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (existsSync(file) && readFileSync(file).equals(buf)) return false;
  writeFileSync(file, buf);
  return true;
};

const INDEX_HTML = `<!doctype html>
<!-- Generated by ${GENERATOR}. Do not edit. -->
<html lang="en" data-theme="light" data-density="standard" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Souvenir gallery</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="gallery.css">
</head>
<body>
<div id="root"></div>
<noscript>The gallery needs JavaScript.</noscript>
<script src="gallery.js"></script>
</body>
</html>
`;

const FONT_FACE = `@font-face {
  font-family: "Geist";
  src: url("Geist-Variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;

// Builds the gallery. Returns { components, notes, files, dist }.
// Options let the self-test build into a scratch folder from scratch sources.
// The registry a dist uses: the shared one in gallery/src for the default dist, and one inside any other dist,
// so builders bundling into their own dist never write the same file.
export const registryFor = (dist) => (resolve(dist) === DEFAULT_DIST ? join(GALLERY, "src", "registry.generated.ts") : join(resolve(dist), "registry.generated.ts"));

export async function buildGallery({ srcDir = SRC, specDir = SPECS, dist = DEFAULT_DIST, registryFile = registryFor(dist), stylesCss = STYLES_CSS, includeFixture = true, only = null } = {}) {
  const esbuild = require("esbuild");
  const notes = [];
  const components = discoverComponents({ srcDir, specDir, includeFixture, only });
  if (only) for (const slug of only) if (!components.some((c) => c.slug === slug)) notes.push(`--component ${slug}: no ds-components/src/${slug}/${slug}.examples.tsx, so it is not in the bundle`);
  const metas = components.map(readSpecMeta);
  for (const m of metas) if (m.specProblem) notes.push(`${m.slug}: ${m.specProblem}`);
  if (components.filter((c) => !c.fixture).length === 0) notes.push(`no component folder in ${rel(srcDir)} has an examples file yet; the gallery shows the test fixture only`);

  writeIfChanged(registryFile, registrySource(components, registryFile));

  const result = await esbuild.build({
    entryPoints: [join(GALLERY, "src", "main.tsx")],
    absWorkingDir: REPO,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outfile: join(dist, "gallery.js"),
    write: false,
    jsx: "automatic",
    charset: "utf8",
    legalComments: "none",
    sourcemap: false,
    logLevel: "silent",
    nodePaths: [join(REPO, "node_modules")],
    alias: { "@gallery/registry": registryFile },
    define: { "process.env.NODE_ENV": '"development"' },
    banner: { js: `// Generated by ${GENERATOR}. Do not edit.` },
  });
  for (const w of result.warnings) notes.push(`esbuild warning: ${w.text}`);

  let js = null;
  let importedCss = "";
  for (const f of result.outputFiles) {
    if (f.path.endsWith(".js")) js = f.text;
    else if (f.path.endsWith(".css")) importedCss = f.text;
  }
  if (js === null) throw new Error("esbuild produced no JavaScript");

  const parts = [`/* Generated by ${GENERATOR}. Do not edit. Order: font face, ${rel(TOKENS_CSS)}, ${rel(stylesCss)}, CSS imported by examples, ds-components/gallery/src/gallery.css. */`, FONT_FACE];
  if (!existsSync(TOKENS_CSS)) throw new Error(`${rel(TOKENS_CSS)} is missing; build the tokens first`);
  parts.push(`/* ---- ${rel(TOKENS_CSS)} ---- */`, readFileSync(TOKENS_CSS, "utf8"));
  if (existsSync(stylesCss)) {
    // styles.css pulls each component's stylesheet in with @import. A browser ignores an @import that is not at
    // the top of a sheet, so the imports are inlined here by esbuild rather than pasted in the middle.
    try {
      const bundled = await esbuild.build({
        entryPoints: [stylesCss], absWorkingDir: REPO, bundle: true, write: false, logLevel: "silent",
        charset: "utf8", legalComments: "none", outfile: join(dist, "styles.bundled.css"),
        loader: { ".svg": "dataurl", ".png": "dataurl", ".woff2": "dataurl", ".woff": "dataurl" },
      });
      parts.push(`/* ---- ${rel(stylesCss)}, with its @imports inlined ---- */`, bundled.outputFiles[0].text);
    } catch (e) {
      const why = (e.errors?.[0]?.text ?? e.message).split("\n")[0];
      parts.push(`/* ---- ${rel(stylesCss)}: could not be bundled, skipped ---- */`);
      notes.push(`${rel(stylesCss)} could not be bundled (${why}); the CSS bundle skips it`);
    }
  } else { parts.push(`/* ---- ${rel(stylesCss)}: not present yet, skipped ---- */`); notes.push(`${rel(stylesCss)} does not exist yet; the CSS bundle skips it`); }
  if (importedCss.trim()) parts.push("/* ---- CSS imported by examples files ---- */", importedCss);
  parts.push("/* ---- ds-components/gallery/src/gallery.css ---- */", readFileSync(join(GALLERY, "src", "gallery.css"), "utf8"));
  const css = parts.map((p) => p.replace(/\s+$/, "")).join("\n\n") + "\n";

  if (!existsSync(FONT)) throw new Error(`the Geist variable font is missing at ${rel(FONT)}`);
  const files = {
    "gallery.js": js,
    "gallery.css": css,
    "index.html": INDEX_HTML,
    "Geist-Variable.woff2": readFileSync(FONT),
  };
  for (const [name, content] of Object.entries(files)) writeIfChanged(join(dist, name), content);
  return { components: metas, notes, files: Object.keys(files).map((n) => rel(join(dist, n))), dist };
}

// ---------------------------------------------------------------- self-test

// Plants: a component whose spec is not JSON, a component with no spec, a folder with no examples
// file, and a styles.css that @imports a component stylesheet. Confirms the build finishes, skips the empty folder, notes both spec problems, generates a
// registry that names both components, and is byte-identical on a second run.
async function selfTest() {
  const os = await import("node:os");
  const { mkdtempSync } = await import("node:fs");
  const tmp = mkdtempSync(join(os.tmpdir(), "build-gallery-self-test-"));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? "caught" : "MISSED"}: ${name}${detail ? ` (${detail})` : ""}`); };
  try {
    const srcDir = join(tmp, "src"), specDir = join(tmp, "specs"), dist = join(tmp, "dist");
    const registryFile = join(GALLERY, "src", "registry.self-test.generated.ts");
    mkdirSync(join(srcDir, "alpha"), { recursive: true });
    mkdirSync(join(srcDir, "beta"), { recursive: true });
    mkdirSync(join(srcDir, "empty"), { recursive: true });
    mkdirSync(specDir, { recursive: true });
    const ex = 'export const examples = { one: () => <span>One</span> };\n';
    writeFileSync(join(srcDir, "alpha", "alpha.examples.tsx"), ex);
    writeFileSync(join(srcDir, "beta", "beta.examples.tsx"), ex);
    writeFileSync(join(specDir, "alpha.spec.json"), "{ not json");
    let out, out2, err = null;
    try {
      out = await buildGallery({ srcDir, specDir, dist, registryFile, stylesCss: join(srcDir, "styles.css"), includeFixture: false });
      const first = Object.fromEntries(["gallery.js", "gallery.css", "index.html"].map((f) => [f, readFileSync(join(dist, f))]));
      out2 = await buildGallery({ srcDir, specDir, dist, registryFile, stylesCss: join(srcDir, "styles.css"), includeFixture: false });
      const same = Object.entries(first).every(([f, b]) => readFileSync(join(dist, f)).equals(b));
      check("an unreadable spec is noted and does not stop the build", out.notes.some((n) => n.startsWith("alpha: the spec is not readable JSON")));
      check("a missing spec is noted", out.notes.some((n) => n.startsWith("beta: no spec at")));
      check("a folder without an examples file is skipped", out.components.length === 2 && !out.components.some((c) => c.slug === "empty"), out.components.map((c) => c.slug).join(", "));
      check("the registry is generated from the folders, not a hand list", /m0 from .*alpha\.examples\.tsx/.test(readFileSync(registryFile, "utf8")) && /m1 from .*beta\.examples\.tsx/.test(readFileSync(registryFile, "utf8")));
      check("a missing ds-components/src/styles.css is skipped with a note", out.notes.some((n) => n.includes("styles.css does not exist")));
      check("two runs are byte-identical", same);
      // A styles.css that @imports a component stylesheet: the import must be inlined, not left mid-file.
      mkdirSync(join(srcDir, "alpha"), { recursive: true });
      writeFileSync(join(srcDir, "alpha", "alpha.css"), "[data-slot=\"alpha\"] { color: var(--color-text-primary); }\n");
      writeFileSync(join(srcDir, "styles.css"), '@layer ds.components;\n@import "./alpha/alpha.css" layer(ds.components);\n');
      await buildGallery({ srcDir, specDir, dist, registryFile, stylesCss: join(srcDir, "styles.css"), includeFixture: false });
      const bundledCss = readFileSync(join(dist, "gallery.css"), "utf8");
      check("an @import in ds-components/src/styles.css is inlined, not left in the middle of the bundle", /\[data-slot="?alpha"?\]/.test(bundledCss) && !/@import\s+(url\(|["'])/.test(bundledCss));
      // --dist and --component: a second dist gets its own registry and only the named component.
      const dist2 = join(tmp, "dist-other");
      const out3 = await buildGallery({ srcDir, specDir, dist: dist2, stylesCss: join(srcDir, "styles.css"), includeFixture: false, only: ["beta"] });
      const ownRegistry = join(dist2, "registry.generated.ts");
      check("a non-default dist gets its own registry and leaves the shared one alone", existsSync(join(dist2, "gallery.js")) && existsSync(ownRegistry) && registryFor(dist2) === ownRegistry && registryFor(DEFAULT_DIST) === join(GALLERY, "src", "registry.generated.ts"));
      check("--component bundles only the named component", out3.components.length === 1 && out3.components[0].slug === "beta" && !readFileSync(ownRegistry, "utf8").includes("alpha.examples"), out3.components.map((c) => c.slug).join(", "));
      check("every generated text file starts with a do-not-edit line", ["gallery.js", "gallery.css"].every((f) => /^(\/\/|\/\*) Generated by v2\/tools\/build-gallery\.mjs\. Do not edit/.test(readFileSync(join(dist, f), "utf8"))) && readFileSync(join(dist, "index.html"), "utf8").includes("Generated by v2/tools/build-gallery.mjs. Do not edit."));
    } catch (e) { err = e; }
    finally { rmSync(registryFile, { force: true }); }
    if (err) check("the build finishes", false, err.message);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  const caught = results.filter(Boolean).length;
  console.log(`build-gallery self-test: ${caught} of ${results.length} planted cases handled`);
  return caught === results.length ? 0 : 1;
}

// ---------------------------------------------------------------- main

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`${name} needs a value`);
  return v;
}

async function main(argv) {
  if (argv.includes("--self-test")) return selfTest();
  const distArg = argValue(argv, "--dist");
  const onlyArg = argValue(argv, "--component");
  const dist = distArg ? resolve(distArg) : DEFAULT_DIST;
  const out = await buildGallery({ dist, only: onlyArg ? onlyArg.split(",").map((x) => x.trim()).filter(Boolean) : null });
  for (const n of out.notes) console.log(`note: ${n}`);
  for (const c of out.components) console.log(`${c.fixture ? "fixture  " : "component"} ${c.slug}: ${c.examples.length} examples in its spec${c.specProblem ? ` (${c.specProblem})` : ""}`);
  console.log(`build-gallery: ${out.components.length} components (${out.components.filter((c) => c.fixture).length} fixture), wrote ${out.files.join(", ")}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => { console.error(`build-gallery: failed: ${e.message}`); process.exitCode = 1; });
}
