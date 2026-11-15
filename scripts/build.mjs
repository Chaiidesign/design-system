#!/usr/bin/env node
// Souvenir build.
//   node scripts/build.mjs [--root <dir>]
// 1. runs scripts/build-tokens.mjs if dist/tokens.css is missing
// 2. dist/souvenir.css = dist/tokens.css + src/base/*.css + src/components/*/*.css (sorted by name)
//    dist/souvenir.min.css = the same, minified by esbuild
//    dist/components/<name>.css = one component's CSS, minified
// 3. dist/components/<name>.js = each src/components/*/*.js, bundled and minified as an ES module
//    dist/souvenir.js = all of them together (an empty module when there are none)
// 4. dist/ui-sdk/<name>.js = each src/ui-sdk/<name>/index.js with its dependencies, tree-shaken and minified
// --root points the build at another tree (used to test the build without touching the real src/).
// Every output is first written to a staging folder, scripts/.tmp/dist-build-<pid>/ (ignored by git, same file
// system), then each file is renamed into dist/ (a rename replaces a file in one step), and only then are files that
// the build no longer makes removed from dist/components/ and dist/ui-sdk/. So another process (a check, a screen
// server) never sees a half-written file or a missing folder. dist/ is replaced file by file, so for a moment a new
// souvenir.css can sit beside the previous souvenir.js. The staging folder is removed whatever happens.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync, renameSync, rmdirSync } from "node:fs";
import { join, dirname, basename, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as esbuild from "esbuild";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argRoot = process.argv.indexOf("--root");
const ROOT = argRoot > 0 ? resolve(process.argv[argRoot + 1]) : REPO;

const rel = (p) => relative(ROOT, p).split(sep).join("/");
const dirs = (p) => (existsSync(p) ? readdirSync(p).sort().filter((n) => statSync(join(p, n)).isDirectory()) : []);
const files = (p, ext) => (existsSync(p) ? readdirSync(p).sort().filter((n) => n.endsWith(ext) && statSync(join(p, n)).isFile()) : []);

// All files under dir, as paths relative to it (posix separators), sorted.
function listFiles(dir, prefix = "") {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, `${prefix}${name}/`));
    else out.push(prefix + name);
  }
  return out;
}

// Move every staged file into dist/ by rename, then remove what the build no longer makes from the folders it owns.
function publish(stage, dist) {
  const made = listFiles(stage);
  for (const f of made) {
    const to = join(dist, ...f.split("/"));
    mkdirSync(dirname(to), { recursive: true });
    renameSync(join(stage, ...f.split("/")), to);
  }
  const keep = new Set(made);
  for (const owned of ["components", "ui-sdk"]) { // generated only by this script
    const dir = join(dist, owned);
    for (const f of listFiles(dir)) if (!keep.has(`${owned}/${f}`)) rmSync(join(dir, ...f.split("/")), { force: true });
    if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
  }
}

async function main() {
  const realDist = join(ROOT, "dist");
  mkdirSync(realDist, { recursive: true });
  // scripts/.tmp/ is ignored by git, so a build that is killed half way leaves nothing a commit could sweep in
  const stage = join(ROOT, "scripts", ".tmp", `dist-build-${process.pid}`);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  try {
    const code = await buildInto(stage, realDist);
    if (code === 0) publish(stage, realDist);
    return code;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

// Build every output into dist (the staging folder); tokens are read from realDist, which build-tokens owns.
async function buildInto(dist, realDist) {

  // 1. tokens
  const tokensCss = join(realDist, "tokens.css");
  if (!existsSync(tokensCss)) {
    const buildTokens = join(ROOT, "scripts", "build-tokens.mjs");
    if (existsSync(buildTokens)) {
      console.log("build: dist/tokens.css is missing; running scripts/build-tokens.mjs");
      const r = spawnSync(process.execPath, [buildTokens], { cwd: ROOT, stdio: "inherit" });
      if (r.status !== 0) { console.error("build: build-tokens failed"); return 1; }
    }
    if (!existsSync(tokensCss)) {
      console.error("build: dist/tokens.css is missing and scripts/build-tokens.mjs could not make it; the CSS has no tokens");
      return 1;
    }
  }

  // 2. CSS
  const parts = [{ path: tokensCss }];
  for (const f of files(join(ROOT, "src", "base"), ".css")) parts.push({ path: join(ROOT, "src", "base", f) });
  const components = dirs(join(ROOT, "src", "components"));
  const componentCss = new Map();
  for (const name of components) {
    const dir = join(ROOT, "src", "components", name);
    const own = files(dir, ".css").map((f) => join(dir, f));
    own.forEach((path) => parts.push({ path }));
    if (own.length) componentCss.set(name, own);
  }
  const header = "/* Souvenir design system 0.2. Generated by scripts/build.mjs. Do not edit by hand. */\n";
  const css = header + parts.map(({ path }) => `/* ${rel(path)} */\n${readFileSync(path, "utf8").trim()}\n`).join("\n");
  writeFileSync(join(dist, "souvenir.css"), css);
  const min = await esbuild.transform(css, { loader: "css", minify: true, legalComments: "none" });
  writeFileSync(join(dist, "souvenir.min.css"), min.code);

  const outComponents = join(dist, "components");
  mkdirSync(outComponents, { recursive: true });
  for (const [name, paths] of componentCss) {
    const one = paths.map((p) => readFileSync(p, "utf8")).join("\n");
    const m = await esbuild.transform(one, { loader: "css", minify: true, legalComments: "none" });
    writeFileSync(join(outComponents, `${name}.css`), m.code);
  }

  // 3. component scripts
  const scripts = [];
  for (const name of components) {
    const dir = join(ROOT, "src", "components", name);
    for (const f of files(dir, ".js")) scripts.push(join(dir, f));
  }
  for (const entry of scripts) {
    await esbuild.build({
      entryPoints: [entry], outfile: join(outComponents, basename(entry)),
      bundle: true, format: "esm", minify: true, platform: "browser", legalComments: "none", logLevel: "warning",
    });
  }
  const stdin = scripts.map((p) => `import ${JSON.stringify("./" + rel(p))};`).join("\n");
  await esbuild.build({
    stdin: { contents: stdin, resolveDir: ROOT, sourcefile: "souvenir-entry.js", loader: "js" },
    outfile: join(dist, "souvenir.js"),
    bundle: true, format: "esm", minify: true, platform: "browser", legalComments: "none", logLevel: "warning",
  });

  // 4. UI SDK-backed variants
  const outSdk = join(dist, "ui-sdk");
  const sdk = dirs(join(ROOT, "src", "ui-sdk")).filter((n) => existsSync(join(ROOT, "src", "ui-sdk", n, "index.js")));
  if (sdk.length) mkdirSync(outSdk, { recursive: true });
  for (const name of sdk) {
    await esbuild.build({
      entryPoints: [join(ROOT, "src", "ui-sdk", name, "index.js")], outfile: join(outSdk, `${name}.js`),
      bundle: true, treeShaking: true, format: "esm", minify: true, platform: "browser", legalComments: "none", logLevel: "warning",
    });
  }

  console.log(`build: dist/souvenir.css from ${parts.length} files (${css.length} bytes; minified ${min.code.length})`);
  console.log(`build: ${componentCss.size} component stylesheets, ${scripts.length} component scripts, dist/souvenir.js, ${sdk.length} UI SDK bundles`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (err) => { console.error(`build: ${err.message}`); process.exitCode = 1; });
