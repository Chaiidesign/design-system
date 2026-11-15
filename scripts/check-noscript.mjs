#!/usr/bin/env node
// Checkout with JavaScript switched off, driven by playwright-core.
//   node scripts/check-noscript.mjs
// At 375 pixels wide, with JavaScript disabled in the browser context:
//   - the page really runs without script (the theme script did not set data-theme; sv-field did not add novalidate)
//   - the total in the cost summary is visible
//   - submitting the empty form with Pay stays on the page (the browser's own validation stops it)
//   - filling every required field by its label and pressing Pay loads checkout-result.html, which shows the
//     success message, and its query string carries every named field of the form
// Prints one line per assertion (PASS or FAIL) and exits 1 if any fails.
// SV_NOSCRIPT_ALLOW_JS=1 runs the same assertions with JavaScript on, to see the check fail.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { chromium } from "playwright-core";
import { createServer } from "./serve.mjs";

const WIDTH = 375;
const HEIGHT = 800;
const JS_ON = process.env.SV_NOSCRIPT_ALLOW_JS === "1";

// The same lookup as scripts/check-screens.mjs: this playwright-core's Chromium, else a cached Playwright revision.
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

let failures = 0;
function assert(ok, what, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? ` (${detail})` : ""}`);
}

const REQUIRED = [
  ["Email address", "sam@example.com"],
  ["Full name", "Sam Lee"],
  ["Address line 1", "12 Mill Lane"],
  ["Town or city", "Leeds"],
  ["Postcode", "LS1 4AB"],
];

async function main() {
  const server = await createServer({ port: 0 });
  let browser;
  try {
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, javaScriptEnabled: JS_ON });
    const page = await context.newPage();
    const checkout = `${server.url}/screens/checkout.html`;
    console.log(`check-noscript: ${checkout} at ${WIDTH} pixels, JavaScript ${JS_ON ? "ON (SV_NOSCRIPT_ALLOW_JS=1: expect failures)" : "off"}`);

    // 1. The page runs without script.
    await page.goto(`${checkout}?theme=dark`);
    const theme = await page.locator("html").getAttribute("data-theme");
    assert(theme === null, "no script ran: the theme script did not set data-theme from ?theme=dark", `data-theme=${theme}`);
    const novalidate = await page.locator("form#checkout").getAttribute("novalidate");
    assert(novalidate === null, "no script ran: the form has no novalidate, so the browser validates", `novalidate=${novalidate}`);

    // 2. The total is visible.
    const total = page.locator('.sv-cost-summary__row[data-row="total"] > dd');
    const totalVisible = await total.isVisible();
    const totalText = totalVisible ? (await total.innerText()).split("\n")[0].trim() : "";
    assert(totalVisible && totalText === "£60.75", "the total £60.75 is visible in the cost summary", `visible=${totalVisible}, text="${totalText}"`);

    // 3. An empty submit is stopped by the browser and the page stays.
    await page.goto(checkout);
    const before = page.url();
    await page.getByRole("button", { name: "Pay £60.75" }).click();
    await page.waitForTimeout(1000);
    const after = new URL(page.url());
    assert(page.url() === before && !after.search && after.pathname.endsWith("/screens/checkout.html"),
      "submitting the empty form does not leave the page", `url ${after.pathname}${after.search}`);
    const firstInvalid = await page.locator("form#checkout :invalid").first().getAttribute("id").catch(() => null);
    assert(firstInvalid === "email", "the browser's validation marks the first required field, Email address", `first :invalid is #${firstInvalid}`);

    // 4. Fill every required field by its label and pay.
    await page.goto(checkout);
    for (const [label, value] of REQUIRED) await page.getByLabel(label, { exact: true }).fill(value);
    const names = [...new Set(await page.locator("form#checkout [name]").evaluateAll((els) => els.map((e) => e.name)).catch(() => null) ?? [])];
    // evaluateAll needs script in the page in some builds; fall back to reading the attributes one by one.
    if (!names.length) {
      const loc = page.locator("form#checkout [name]");
      for (let i = 0; i < await loc.count(); i++) names.push(await loc.nth(i).getAttribute("name"));
    }
    assert(names.length >= 9, "the form has its named fields", names.join(", "));
    await Promise.all([page.waitForURL(/checkout-result\.html/, { timeout: 5000 }).catch(() => null),
      page.getByRole("button", { name: "Pay £60.75" }).click()]);
    const result = new URL(page.url());
    assert(result.pathname.endsWith("/screens/checkout-result.html"), "pressing Pay loads checkout-result.html", `url ${result.pathname}`);
    const success = page.locator('.sv-message[data-tone="success"]');
    const successText = (await success.count()) ? (await success.innerText()).trim() : "";
    assert(await success.isVisible().catch(() => false) && successText === "Order placed. Receipt sent to sam@example.com.",
      "the result page shows the success message", `"${successText}"`);
    const q = result.searchParams;
    const missing = names.filter((n) => !q.has(n));
    assert(names.length > 0 && missing.length === 0, "the query string carries every named field", missing.length ? `missing: ${missing.join(", ")}` : [...q.keys()].join(", "));
    for (const [label, value] of REQUIRED) {
      const name = { "Email address": "email", "Full name": "name", "Address line 1": "line1", "Town or city": "town", Postcode: "postcode" }[label];
      assert(q.get(name) === value, `the query string carries ${label} as typed`, `${name}=${q.get(name)}`);
    }
    assert(q.get("country") === "GB" && q.get("billing") === "same", "the query string carries the chosen country and the ticked billing box",
      `country=${q.get("country")}, billing=${q.get("billing")}`);
    await context.close();
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().then(
  () => {
    console.log(`check-noscript: ${failures} failure${failures === 1 ? "" : "s"}`);
    process.exitCode = failures ? 1 : 0;
  },
  (err) => { console.error(`check-noscript: ${err.stack || err.message}`); process.exitCode = 1; },
);
