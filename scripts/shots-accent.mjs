// Takes screenshots of the two main screens with each accent, so that blue and teal can be compared.
// Usage: node scripts/shots-accent.mjs
// Writes digests/2026-11-15/accent/<screen>-<accent>-<width>-<theme>.png and prints one line per file.
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { chromium } from "playwright-core";
import { createServer } from "./serve.mjs";

function chromiumCandidates() {
  const out = [];
  if (process.env.PLAYWRIGHT_CHROMIUM) out.push(process.env.PLAYWRIGHT_CHROMIUM);
  try { out.push(chromium.executablePath()); } catch { /* not known */ }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), "Library", "Caches", "ms-playwright"), join(homedir(), ".cache", "ms-playwright")].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const revs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
    for (const rev of revs) for (const sub of readdirSync(join(root, rev))) {
      const base = join(root, rev, sub);
      out.push(join(base, "Chromium.app", "Contents", "MacOS", "Chromium"),
        join(base, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"), join(base, "chrome"));
    }
  }
  return [...new Set(out)].filter((p) => p && existsSync(p));
}

async function launch() {
  const tried = [];
  for (const path of chromiumCandidates()) {
    try { return await chromium.launch({ executablePath: path, headless: true }); }
    catch (e) { tried.push(`${path}: ${e.message.split("\n")[0]}`); }
  }
  throw new Error(`no usable Chromium (run "npx playwright-core install chromium"). Tried:\n  ${tried.join("\n  ") || "(nothing found)"}`);
}

const OUT = "digests/2026-11-15/accent";
mkdirSync(OUT, { recursive: true });
const server = await createServer({ port: 0 });
const base = `${server.url}/screens/`;
const browser = await launch();
let n = 0;
for (const screen of ["checkout", "assistant"]) {
  for (const accent of ["blue", "teal"]) {
    for (const [width, theme] of [[375, "light"], [375, "dark"], [1280, "light"]]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.goto(`${base}${screen}.html?theme=${theme}&accent=${accent}`, { waitUntil: "load" });
      const fill = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sv-color-accent").trim());
      const file = `${OUT}/${screen}-${accent}-${width}-${theme}.png`;
      await page.screenshot({ path: file, fullPage: true, animations: "disabled" }); // a turning mark draws the same every run
      await page.close();
      console.log(`${file}  accent ${fill}`);
      n++;
    }
  }
}
await browser.close();
await server.close();
console.log(`shots-accent: ${n} screenshots`);
