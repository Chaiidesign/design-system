#!/usr/bin/env node
// Clay: headless check of the UI SDK trial (explore/ui-sdk-trial).
//   node explore/ui-sdk-trial/check.mjs
// For index.html (UI SDK) and native.html (plain HTML), with JavaScript off and on:
//   fills and submits the form, and reads what result.html received (each field must arrive exactly once);
//   records each control's accessible name and autocomplete, and the Tab order.
// With JavaScript on it also records what UI SDK does: empty and wrong submits, keyboard on the select and
// the checkbox, the button's pending state, live regions, and the CSS UI SDK injects (layer "ui-sdk").
// Writes explore/ui-sdk-trial/check-result.json and screenshots in explore/ui-sdk-trial/shots/.

import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { chromium } from "playwright-core";
import { createServer } from "../../scripts/serve.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SHOTS = join(HERE, "shots");
mkdirSync(SHOTS, { recursive: true });

// Chromium: the same places scripts/check-screens.mjs looks (env, this playwright-core's revision, the cache).
function candidates() {
  const out = [];
  if (process.env.PLAYWRIGHT_CHROMIUM) out.push(process.env.PLAYWRIGHT_CHROMIUM);
  try { out.push(chromium.executablePath()); } catch { /* unknown */ }
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), "Library", "Caches", "ms-playwright"), join(homedir(), ".cache", "ms-playwright")].filter(Boolean)) {
    if (!existsSync(root)) continue;
    for (const rev of readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.split("-")[1] - a.split("-")[1])) {
      for (const sub of readdirSync(join(root, rev))) {
        const base = join(root, rev, sub);
        for (const c of [join(base, "Chromium.app/Contents/MacOS/Chromium"), join(base, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"), join(base, "chrome")]) out.push(c);
      }
    }
  }
  return out.filter((p) => p && existsSync(p));
}
async function launch() {
  for (const p of candidates()) {
    try { return { browser: await chromium.launch({ executablePath: p, headless: true }), path: p }; } catch { /* next */ }
  }
  throw new Error("no usable Chromium found");
}

const FIELDS = ["email", "postcode", "country", "terms"];
const VALUES = { email: "sam@example.com", postcode: "SW1A 1AA", country: "GB", terms: "yes" };

// Every control a person can reach, with its accessible name and autofill hint.
const CONTROLS = `(() => [...document.querySelectorAll("input, select, button, [role=combobox], [role=checkbox]")]
  .filter((el) => el.isConnected && el.getClientRects().length)
  .map((el) => ({ tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name: el.getAttribute("name") || el.closest("[name]")?.getAttribute("name") || null,
    autocomplete: el.getAttribute("autocomplete") || el.closest("[auto-complete]")?.getAttribute("auto-complete") || null,
    describedby: (el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean).map((id) => document.getElementById(id)?.textContent.trim() ?? "(missing id " + id + ")"),
    invalid: el.getAttribute("aria-invalid") })))()`;

async function tabOrder(page, max = 12) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.locator("h1").click();
  const out = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const d = await page.evaluate(() => { const a = document.activeElement; return a && a !== document.body ? `${a.tagName.toLowerCase()}${a.getAttribute("role") ? "[role=" + a.getAttribute("role") + "]" : ""}${a.id ? "#" + a.id : ""}` : null; });
    if (!d || out.includes(d)) break;
    out.push(d);
  }
  return out;
}

// Fill the form the way a person would, with mouse and keyboard, then press Pay.
async function fillAndSubmit(page, js, sdk) {
  await page.getByLabel("Email address").fill(VALUES.email);
  await page.getByLabel("Postcode").fill(VALUES.postcode);
  if (sdk && js) {
    await page.getByRole("combobox", { name: "Country" }).click();
    await page.getByRole("option", { name: "United Kingdom" }).click();
  } else {
    await page.getByLabel("Country").selectOption(VALUES.country);
  }
  await page.getByText("I accept the terms of sale").click();
  await Promise.all([page.waitForURL(/result\.html/, { timeout: 5000 }), page.getByRole("button", { name: "Pay £60.75" }).click()]);
  const params = new URL(page.url()).searchParams;
  const received = Object.fromEntries(FIELDS.map((f) => [f, params.getAll(f)]));
  const ok = FIELDS.every((f) => received[f].length === 1 && received[f][0] === VALUES[f]);
  return { url: page.url().replace(/^http:\/\/[^/]+/, ""), received, every_field_once_and_correct: ok };
}

async function run() {
  const server = await createServer({ root: REPO, port: 0 });
  const { browser, path } = await launch();
  const result = { produced_by: "explore/ui-sdk-trial/check.mjs", measured_at: new Date().toISOString(), chromium: path, pages: {} };

  for (const [key, file, sdk] of [["ui-sdk", "index.html", true], ["native", "native.html", false]]) {
    result.pages[key] = {};
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ javaScriptEnabled: js, viewport: { width: 375, height: 800 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errors.push(m.text()); });
      const url = `${server.url}/explore/ui-sdk-trial/${file}`;
      await page.goto(url);
      if (js) await page.waitForTimeout(400);
      const r = {};
      r.defined = js ? await page.evaluate(() => ["ui-field", "ui-input", "ui-select", "ui-checkbox", "ui-button"].map((t) => `${t}:${!!customElements.get(t)}`)) : "scripts off";
      r.accessibility_tree = await page.locator("form").ariaSnapshot();
      r.controls = await page.evaluate(CONTROLS);
      r.tab_order = await tabOrder(page);
      await page.screenshot({ path: join(SHOTS, `${key}-${js ? "js-on" : "js-off"}-375.png`), fullPage: true });

      if (js) {
        // 1. Press Pay with everything empty.
        await page.getByRole("button", { name: "Pay £60.75" }).click();
        await page.waitForTimeout(200);
        r.empty_submit = await page.evaluate(() => ({
          still_on_form: location.pathname.endsWith(".html") && !location.pathname.endsWith("result.html"),
          focused: (() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}${a.getAttribute("role") ? "[role=" + a.getAttribute("role") + "]" : ""}` : null; })(),
          errors_shown: [...document.querySelectorAll("[data-slot=field-error]:not([hidden])")].map((e) => e.textContent.trim()),
          native_messages: [...document.querySelectorAll("input, select")].filter((e) => e.validationMessage).map((e) => `${e.name}: ${e.validationMessage}`),
        }));
        r.controls_after_empty_submit = await page.evaluate(CONTROLS);
        await page.screenshot({ path: join(SHOTS, `${key}-js-on-empty-submit-375.png`), fullPage: true });

        // 2. A wrong email, then the fix: does the message follow the value, and is the text kept?
        await page.getByLabel("Email address").fill("sam@");
        await page.waitForTimeout(100);
        const wrong = await page.evaluate(() => [...document.querySelectorAll("[data-slot=field-error]:not([hidden])")].map((e) => e.textContent.trim()));
        await page.getByLabel("Email address").fill("sam@example.com");
        await page.waitForTimeout(100);
        r.email_message_follows_value = { while_wrong: wrong, after_fix: await page.evaluate(() => [...document.querySelectorAll("[data-slot=field-error]:not([hidden])")].map((e) => e.textContent.trim())), value_kept: await page.getByLabel("Email address").inputValue() };

        // 3. Keyboard on the country control.
        const country = sdk ? page.getByRole("combobox", { name: "Country" }) : page.getByLabel("Country");
        await country.focus();
        if (sdk) {
          await page.keyboard.press("ArrowDown");
          await page.waitForTimeout(150);
          const opened = await page.evaluate(() => ({ expanded: document.querySelector("[role=combobox]")?.getAttribute("aria-expanded"), active: document.activeElement?.textContent.trim(), activedescendant: document.querySelector("[role=combobox]")?.getAttribute("aria-activedescendant") }));
          await page.keyboard.type("Fr");
          await page.waitForTimeout(150);
          const typed = await page.evaluate(() => document.activeElement?.textContent.trim());
          await page.keyboard.press("Enter");
          await page.waitForTimeout(150);
          const chosen = await page.evaluate(() => ({ trigger_text: document.querySelector("[role=combobox]")?.textContent.trim(), focus_back_on_trigger: document.activeElement?.getAttribute("role") === "combobox", form_value: new FormData(document.querySelector("form")).getAll("country") }));
          await page.keyboard.press("Escape");
          r.select_keyboard = { after_arrow_down: opened, after_typing_Fr: typed, after_enter: chosen };
        } else {
          await page.keyboard.press("ArrowDown"); // on macOS Chromium this opens the native popup; elsewhere it changes the value
          r.select_keyboard = "native <select>: keyboard handled by the browser and the operating system (not observable in headless popups)";
        }

        // 4. Keyboard on the checkbox.
        const box = page.getByRole("checkbox", { name: "I accept the terms of sale" });
        await box.focus();
        await page.keyboard.press("Space");
        r.checkbox_space = await page.evaluate(() => ({ form_terms: new FormData(document.querySelector("form")).getAll("terms"), aria_checked: document.querySelector("[role=checkbox]")?.getAttribute("aria-checked") ?? null, native_checked: document.querySelector("input[type=checkbox]")?.checked ?? null }));
        await page.keyboard.press("Space");

        // 5. The button during a slow submit: hold the submit with a listener, then look for pending state and announcements.
        await page.evaluate(() => {
          window.__liveBefore = [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")].length;
          window.__submits = 0;
          document.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); window.__submits++; });
          document.querySelector("ui-button")?.addEventListener("action", (e) => e.detail.waitUntil(new Promise((r) => setTimeout(r, 1600))), { once: true });
        });
        await fillAndFixForPending(page, sdk);
        await page.getByRole("button", { name: "Pay £60.75" }).click();
        await page.waitForTimeout(100);
        const during = await buttonState(page);
        await page.getByRole("button", { name: "Pay £60.75" }).click({ force: true, timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const afterSecond = await buttonState(page);
        await page.waitForTimeout(800);
        r.button_pending_with_action_waitUntil = { during, after_1_3_seconds: afterSecond, after_settle: await buttonState(page) };

        // 6. The CSS UI SDK injects.
        r.injected_css = await page.evaluate(() => {
          const sheets = [...document.styleSheets, ...document.adoptedStyleSheets];
          const found = [];
          const walk = (rules, owner) => { for (const rule of rules) { if (rule.constructor.name === "CSSLayerBlockRule" && rule.name === "ui-sdk") found.push({ owner, css: rule.cssText }); else if (rule.cssRules) walk(rule.cssRules, owner); } };
          for (const s of sheets) { try { walk(s.cssRules, s.href ? s.href.replace(/^.*\/explore\//, "explore/").replace(/^.*\/dist\//, "dist/") : (document.adoptedStyleSheets.includes(s) ? "adoptedStyleSheets" : "inline <style>" + (s.ownerNode?.id ? "#" + s.ownerNode.id : ""))); } catch { /* cross-origin */ } }
          const layerOrder = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].filter((r) => r.constructor.name === "CSSLayerStatementRule").map((r) => r.cssText); } catch { return []; } });
          return { blocks: found, layer_statements_in_order: layerOrder };
        });
        const css = r.injected_css.blocks.map((b) => b.css).join("\n");
        const props = [...new Set([...css.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]))];
        r.injected_css.properties_set = props;
        r.injected_css.sets_colour_font_or_size = props.filter((p) => /color|background|font|^(inline-size|block-size|width|height|min-|max-|padding|margin|border|line-height|letter-spacing)/.test(p));
      }
      r.page_errors = errors;

      // Submit a correctly filled form (fresh page) and read what result.html received.
      await page.goto(url);
      if (js) await page.waitForTimeout(400);
      try { r.submission = await fillAndSubmit(page, js, sdk); } catch (e) { r.submission = { error: e.message.split("\n")[0], url: page.url() }; }
      result.pages[key][js ? "js_on" : "js_off"] = r;
      await ctx.close();
    }
  }
  await browser.close();
  await server.close();
  writeFileSync(join(HERE, "check-result.json"), JSON.stringify(result, null, 2) + "\n");
  const s = (k, m) => result.pages[k][m].submission;
  for (const k of ["ui-sdk", "native"]) for (const m of ["js_off", "js_on"]) console.log(`${k.padEnd(6)} ${m.padEnd(6)} submission: ${JSON.stringify(s(k, m))}`);
  const ok = Object.values(result.pages).every((p) => p.js_off.submission.every_field_once_and_correct && p.js_on.submission.every_field_once_and_correct);
  console.log(`check: every page, scripts off and on, sent every field exactly once: ${ok}`);
  return ok ? 0 : 1;
}

async function fillAndFixForPending(page, sdk) {
  await page.getByLabel("Email address").fill(VALUES.email);
  await page.getByLabel("Postcode").fill(VALUES.postcode);
  if (sdk) {
    await page.getByRole("combobox", { name: "Country" }).click();
    await page.getByRole("option", { name: "United Kingdom" }).click();
  } else await page.getByLabel("Country").selectOption(VALUES.country);
  const checked = await page.getByRole("checkbox", { name: "I accept the terms of sale" }).isChecked();
  if (!checked) await page.getByText("I accept the terms of sale").click();
}

const buttonState = (page) => page.evaluate(() => {
  const b = document.querySelector("button[type=submit]");
  return {
    aria_busy: b.getAttribute("aria-busy"), aria_disabled: b.getAttribute("aria-disabled"), data_pending: b.hasAttribute("data-pending"),
    focused: document.activeElement === b, submit_events_so_far: window.__submits,
    live_regions: [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")].map((e) => ({ tag: e.tagName.toLowerCase(), live: e.getAttribute("aria-live") || e.getAttribute("role"), text: e.textContent.trim() })),
  };
});

run().then((c) => process.exit(c), (e) => { console.error(`check: ${e.stack}`); process.exit(1); });
