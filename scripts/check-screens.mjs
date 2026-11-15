#!/usr/bin/env node
// Souvenir screen checker (spec section 6, point 4), driven by playwright-core.
//   node scripts/check-screens.mjs [--only <substring>] [--no-shots] [--dir <folder>]
//   node scripts/check-screens.mjs --self-test
// Visits every .html directly under screens/ and screens/agent-test/ (not index.html) at 320, 375 and 1280 pixels
// wide (800 high), light and dark (?theme=), and fails on:
//   sideways-scroll            the page scrolls sideways
//   text-too-small             visible text below 16 pixels
//   control-too-small          a control below 24 by 24 pixels (a checkbox or radio inside a label is measured by its label).
//                              Exempt, as WCAG 2.5.8 allows: a link whose computed display is inline and whose parent also holds
//                              non-empty text or a visible inline sibling with text (a link in running text). A link that is the
//                              only content of its parent, is not display inline, or has the class sv-button is not exempt.
//   control-too-short          a button or field below 44 pixels tall
//   text-contrast              text below 4.5 to 1 against its resolved background (3 to 1 at 24 pixels or more)
//   control-boundary-contrast  a control whose border and fill are both below 3 to 1 against what is behind it
//   focus-outline              a Tab stop without a visible outline at least 2 pixels wide
//   focus-contrast             a focus outline below 3 to 1 against the page behind it
//   focus-overlap              a focus ring (box grown by offset plus width) that intersects another control
//   word-break                 a word broken across lines (outside [data-user-content], CJK ignored)
//   cost-total-largest         on a page with .sv-cost-summary, the total's dd is not the largest text
//   missing-speaker-label      a visible .sv-chat-message without a visible .sv-chat-message__from that has text
//   overflow-inside-part       visible text (measured word by word with a Range) reaching more than 1 pixel beyond, on the
//                              inline axis, the border box of an ancestor with an sv- class that is not scrollable
//                              (overflow auto or scroll). Catches an amount spilling out of a part inside a panel, which
//                              sideways-scroll does not see.
//   many-accent-fills          on a page whose file name does not begin demo-, more than one visible element whose
//                              computed background equals the computed --sv-color-accent on :root (AGENTS.md rule 4)
// Also measured, with no pass or fail: the height of the tallest visible .sv-proposal ("proposal height" in the table,
// proposalHeight in the JSON).
// Screenshots: digests/2026-11-15/screens/<screen>-<width>-<theme>.png. Data: gates/raw/2026-11-15-screens.json.

import { existsSync, readdirSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";
import { createServer } from "./serve.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTHS = [320, 375, 1280];
const THEMES = ["light", "dark"];
const HEIGHT = 800;
const args = process.argv.slice(2);
// --dir <folder inside the repo> checks that folder instead of screens/ and writes its output to scripts/.tmp/,
// so the full run (screenshots and JSON) can be exercised without touching the real gate files.
const DIR = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : null;
// --out <folder inside the repo> moves that --dir output elsewhere (default scripts/.tmp/check-screens-out).
const TMP_OUT = args.includes("--out") ? resolve(REPO, args[args.indexOf("--out") + 1]) : join(REPO, "scripts", ".tmp", "check-screens-out");
const SHOTS_DIR = DIR ? join(TMP_OUT, "screens") : join(REPO, "digests", "2026-11-15", "screens");
const OUT_JSON = DIR ? join(TMP_OUT, "screens.json") : join(REPO, "gates", "raw", "2026-11-15-screens.json");
const MAX_TAB_STOPS = 300;

const SELF_TEST = args.includes("--self-test");
const NO_SHOTS = args.includes("--no-shots") || SELF_TEST;
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const posix = (p) => p.split(sep).join("/");

// ---------------------------------------------------------------- contrast (WCAG 2.2 relative luminance)
// Uses scripts/lib/color.mjs when it provides relativeLuminance and contrastRatio; otherwise a private copy.
let luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let ratioOfLum = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
let contrastSource = "private function in check-screens.mjs";
try {
  const lib = await import("./lib/color.mjs");
  if (typeof lib.relativeLuminance === "function" && typeof lib.contrastRatio === "function") {
    const lum = (rgb) => lib.relativeLuminance(rgb.map((c) => c / 255));
    // the library belongs to another builder and may change: use it only if it gives the known answers
    const k1 = lib.contrastRatio(lum([255, 255, 255]), lum([0, 0, 0]));
    const k2 = lib.contrastRatio(lum([148, 148, 148]), lum([255, 255, 255]));
    if (Math.abs(k1 - 21) < 0.01 && Math.abs(k2 - 3.03) < 0.01) {
      luminance = lum;
      ratioOfLum = lib.contrastRatio;
      contrastSource = "scripts/lib/color.mjs (relativeLuminance, contrastRatio; verified 21:1 and 3.03:1 at start)";
    } else {
      contrastSource = `private function in check-screens.mjs (scripts/lib/color.mjs gave ${k1.toFixed(2)} and ${k2.toFixed(2)}, expected 21 and 3.03)`;
    }
  }
} catch { /* the private copy stays */ }
const contrast = (a, b) => Math.round(ratioOfLum(luminance(a), luminance(b)) * 100) / 100;

// ---------------------------------------------------------------- Chromium

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

async function launchChromium() {
  const tried = [];
  const attempt = async (path, why) => {
    if (!path || !existsSync(path)) return null;
    try {
      const browser = await chromium.launch({ executablePath: path, headless: true });
      return { browser, path, why };
    } catch (e) { tried.push(`${path}: ${e.message.split("\n")[0]}`); return null; }
  };
  if (process.env.PLAYWRIGHT_CHROMIUM) {
    const r = await attempt(process.env.PLAYWRIGHT_CHROMIUM, "PLAYWRIGHT_CHROMIUM");
    if (r) return r;
    console.warn(`check-screens: warning: PLAYWRIGHT_CHROMIUM=${process.env.PLAYWRIGHT_CHROMIUM} ${existsSync(process.env.PLAYWRIGHT_CHROMIUM) ? "could not be launched" : "does not exist"}; looking for a Playwright-managed Chromium instead`);
  }
  let own = null;
  try { own = chromium.executablePath(); } catch { /* not known */ }
  for (const p of [own, ...cachedChromiums().filter((p) => p !== own)]) {
    const r = await attempt(p, p === own ? "Playwright-managed (this playwright-core's revision)" : "Playwright-managed (cached revision)");
    if (r) return r;
  }
  console.log("check-screens: no usable Chromium found; running `npx playwright-core install chromium` once");
  const inst = spawnSync("npx", ["playwright-core", "install", "chromium"], { cwd: REPO, stdio: "inherit" });
  if (inst.status === 0) {
    try { own = chromium.executablePath(); } catch { own = null; }
    const r = await attempt(own, "Playwright-managed (installed now)");
    if (r) return r;
  }
  throw new Error(`could not launch Chromium. Tried:\n  ${tried.join("\n  ") || "(nothing found)"}`);
}

// ---------------------------------------------------------------- in-page measurement library
// Evaluated once per page. It adds nothing to the document except a temporary probe used to read the canvas colour.
const PAGE_LIB = String.raw`(() => {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  // Any CSS colour (rgb, oklch, color(), ...) to [r, g, b, a] in sRGB 0..255, alpha 0..1.
  function rgba(css) {
    if (cache.has(css)) return cache.get(css);
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "rgba(0,0,0,0)"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const v = [d[0], d[1], d[2], d[3] / 255];
    cache.set(css, v); return v;
  }
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map((i) => Math.round(top[i] * a + under[i] * (1 - a))); };
  let canvasColour = null;
  function pageCanvas() {
    if (canvasColour) return canvasColour;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;inline-size:0;block-size:0;background-color:Canvas";
    document.documentElement.appendChild(probe);
    canvasColour = rgba(getComputedStyle(probe).backgroundColor).slice(0, 3);
    probe.remove();
    return canvasColour;
  }
  // Walk up to the first opaque background; composite any translucent layers on the way.
  // An element with a mask-image counts by its background colour, like any other.
  function background(el) {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let base = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop().slice(0, 3) : pageCanvas();
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  }
  function opacity(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; }
  function describe(el) {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += "#" + e.id;
      const cls = [...e.classList].slice(0, 2); if (cls.length) s += "." + cls.join(".");
      const sib = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : [];
      if (sib.length > 1) s += ":nth-of-type(" + (sib.indexOf(e) + 1) + ")";
      parts.unshift(s);
    }
    return parts.join(" > ");
  }
  // Hidden from sight: no box, invisible, transparent, or clipped to a pixel (the visually-hidden pattern).
  function hidden(el) {
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || cs.display === "none") return true;
    if (!el.getClientRects().length) return true;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (parseFloat(s.opacity) === 0) return true;
      const r = e.getBoundingClientRect();
      const clips = s.overflow !== "visible" || s.clipPath !== "none" || s.clip !== "auto";
      if (clips && (r.width <= 1 || r.height <= 1)) return true;
    }
    return false;
  }
  const CONTROL_SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable="true"]';
  const isBox = (el) => el.matches('input[type="checkbox"], input[type="radio"]');
  function kind(el) {
    if (el.matches('button, input[type="submit"], input[type="button"], input[type="reset"], input[type="image"], [role="button"], a.sv-button')) return "button";
    if (el.matches('select, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"])')) return "field";
    return "other";
  }
  function targetRect(el) {
    const label = isBox(el) ? el.closest("label") : null;
    const r = (label || el).getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  // A link in running text (WCAG 2.5.8 inline exception): display inline, not an sv-button, and its parent
  // holds other content on the line: a non-empty text node or a visible inline element with text.
  function inRunningText(el) {
    if (!el.matches('a[href], [role="link"]') || el.classList.contains("sv-button")) return false;
    if (getComputedStyle(el).display !== "inline") return false;
    const parent = el.parentElement;
    if (!parent) return false;
    for (const n of parent.childNodes) {
      if (n === el) continue;
      if (n.nodeType === Node.TEXT_NODE && /\S/.test(n.data)) return true;
      if (n.nodeType === Node.ELEMENT_NODE && !hidden(n) && getComputedStyle(n).display === "inline" && /\S/.test(n.textContent)) return true;
    }
    return false;
  }
  function controls() {
    const out = [];
    for (const el of document.querySelectorAll(CONTROL_SEL)) {
      const label = isBox(el) ? el.closest("label") : null;
      if (hidden(label || el)) continue;
      out.push(el);
    }
    return out;
  }
  const CJK = /[ᄀ-ᇿ⺀-⿿　-ヿ㄀-ㇿ㈀-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-￯]/;
  const SKIP_TEXT = "script, style, noscript, template, select, option, optgroup, textarea, title";

  function texts() {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/\S/.test(n.data)) continue;
      const el = n.parentElement;
      if (!el || el.closest(SKIP_TEXT) || hidden(el)) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (!rects.length) continue;
      out.push({ node: n, el, from: "text", text: n.data.trim().replace(/\s+/g, " ") });
    }
    for (const el of document.querySelectorAll("input, select, textarea")) {
      if (hidden(el)) continue;
      const t = (el.type || "").toLowerCase();
      if (["checkbox", "radio", "hidden", "range", "color", "file", "image"].includes(t)) continue;
      if (el.tagName === "SELECT") { const o = el.options[el.selectedIndex]; if (o && o.text.trim()) out.push({ el, from: "select", text: o.text.trim() }); continue; }
      if (el.value && el.value.trim()) out.push({ el, from: "value", text: el.value.trim().slice(0, 60) });
      else if (el.placeholder) out.push({ el, from: "placeholder", text: el.placeholder.slice(0, 60) });
    }
    return out;
  }

  function measureText(t) {
    const cs = getComputedStyle(t.el, t.from === "placeholder" ? "::placeholder" : null);
    const size = parseFloat(getComputedStyle(t.el).fontSize);
    const bg = background(t.el);
    const fgRaw = rgba(cs.color);
    const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity(t.el)], bg);
    return { text: t.text.slice(0, 60), from: t.from, where: describe(t.el), size, fg, bg, userContent: !!t.el.closest("[data-user-content]") };
  }

  function brokenWords(t) {
    if (t.from !== "text" || t.el.closest("[data-user-content]")) return [];
    const out = [];
    const data = t.node.data;
    for (const m of data.matchAll(/[^\s‐–—\/-]+[‐–—\/-]?/g)) {
      const word = m[0].replace(/[‐–—\/-]$/, "");
      if (word.length < 2 || CJK.test(word)) continue;
      const r = document.createRange(); r.setStart(t.node, m.index); r.setEnd(t.node, m.index + word.length);
      const tops = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0).map((x) => x);
      if (tops.length < 2) continue;
      // two rects on different lines: the second starts below the first ends
      const sorted = tops.sort((a, b) => a.top - b.top);
      if (sorted[sorted.length - 1].top >= sorted[0].bottom - 1) out.push({ word, where: describe(t.el) });
    }
    return out;
  }

  function boundary(el) {
    const cs = getComputedStyle(el);
    const behind = background(el.parentElement);
    const own = rgba(cs.backgroundColor);
    const sides = ["top", "right", "bottom", "left"].map((s) => ({
      width: parseFloat(cs.getPropertyValue("border-" + s + "-width")),
      style: cs.getPropertyValue("border-" + s + "-style"),
      color: rgba(cs.getPropertyValue("border-" + s + "-color")),
    })).filter((s) => s.width >= 1 && s.style !== "none" && s.style !== "hidden" && s.color[3] > 0);
    const fill = own[3] > 0 ? over(own, behind) : null;
    const borders = sides.map((s) => over(s.color, fill || behind));
    const appearanceAuto = isBox(el) && cs.appearance !== "none";
    return { behind, fill, borders, appearanceAuto };
  }

  // overflow-inside-part: text that spills out of an sv- part on the inline axis. Each visible text node is measured
  // word by word (so hanging spaces at a line end do not count); its extent is then compared with the border box of
  // every ancestor that has an sv- class and is not scrollable. Above an ancestor that clips (overflow not visible)
  // only the part of the text inside that ancestor counts.
  function overflowInsideParts() {
    const worst = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!/\S/.test(n.data)) continue;
      const el = n.parentElement;
      if (!el || el.closest(SKIP_TEXT) || hidden(el)) continue;
      const horizontal = getComputedStyle(el).writingMode.startsWith("horizontal");
      let lo = Infinity, hi = -Infinity;
      for (const m of n.data.matchAll(/\S+/g)) {
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        for (const x of r.getClientRects()) {
          if (x.width <= 0 || x.height <= 0) continue;
          lo = Math.min(lo, horizontal ? x.left : x.top); hi = Math.max(hi, horizontal ? x.right : x.bottom);
        }
      }
      if (!(hi > lo)) continue;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        const b = e.getBoundingClientRect();
        const start = horizontal ? b.left : b.top, end = horizontal ? b.right : b.bottom;
        const ov = horizontal ? cs.overflowX : cs.overflowY;
        const svClass = [...e.classList].find((c) => c.startsWith("sv-"));
        if (svClass && !/(auto|scroll)/.test(ov)) {
          const amount = Math.max(start - lo, hi - end);
          if (amount > 1 && (!worst.has(e) || worst.get(e).amount < amount)) {
            worst.set(e, { cls: svClass, where: describe(e), amount: Math.round(amount * 10) / 10, text: n.data.trim().replace(/\s+/g, " ").slice(0, 40) });
          }
        }
        if (ov !== "visible") { lo = Math.max(lo, start); hi = Math.min(hi, end); if (!(hi > lo)) break; }
      }
    }
    return [...worst.values()];
  }

  // many-accent-fills: visible elements whose computed background equals --sv-color-accent on :root.
  // Skipped (null) when the page has no such token or it does not parse to an opaque colour.
  function accentFills() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--sv-color-accent").trim();
    if (!raw) return null;
    const a = rgba(raw);
    if (a[3] < 0.999) return null;
    const out = [];
    for (const el of document.body.querySelectorAll("*")) {
      const c = rgba(getComputedStyle(el).backgroundColor);
      if (c[3] < 0.999 || [0, 1, 2].some((i) => Math.abs(c[i] - a[i]) > 1)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || hidden(el)) continue;
      out.push({ where: describe(el), text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 40) });
    }
    return { accent: a.slice(0, 3), elements: out };
  }

  function measure() {
    const de = document.documentElement;
    const ts = texts();
    const textRows = ts.map(measureText);
    const words = ts.flatMap(brokenWords);
    const ctrls = controls().map((el) => {
      const k = kind(el);
      return { where: describe(el), tag: el.tagName.toLowerCase(), type: el.getAttribute("type") || "", kind: k, ...targetRect(el),
        targetExempt: inRunningText(el) ? "inline link in running text (WCAG 2.5.8)" : null,
        boundary: (k === "button" || k === "field" || isBox(el)) ? boundary(el) : null };
    });
    let cost = null;
    if (document.querySelector(".sv-cost-summary")) {
      const totals = [...document.querySelectorAll('.sv-cost-summary__row[data-row="total"] dd')].filter((e) => !hidden(e));
      let maxOther = null;
      ts.forEach((t, i) => {
        if (totals.some((d) => d.contains(t.el))) return;
        const s = textRows[i].size;
        if (!maxOther || s > maxOther.size) maxOther = { size: s, text: textRows[i].text, where: textRows[i].where };
      });
      cost = { totals: totals.map((d) => ({ size: parseFloat(getComputedStyle(d).fontSize), where: describe(d), text: d.textContent.trim().slice(0, 40) })), maxOther };
    }
    const chat = [...document.querySelectorAll(".sv-chat-message")].filter((el) => !hidden(el)).map((el) => {
      const from = [...el.querySelectorAll(".sv-chat-message__from")].find((f) => !hidden(f) && /\S/.test(f.textContent));
      return { where: describe(el), from: from ? from.textContent.trim().replace(/\s+/g, " ").slice(0, 40) : null };
    });
    let proposal = null;
    const proposals = [...document.querySelectorAll(".sv-proposal")].filter((el) => !hidden(el));
    if (proposals.length) {
      const tallest = proposals.map((el) => ({ el, h: el.getBoundingClientRect().height })).sort((a, b) => b.h - a.h)[0];
      proposal = { count: proposals.length, height: Math.round(tallest.h), where: describe(tallest.el) };
    }
    return {
      scroll: { scrollWidth: Math.max(de.scrollWidth, document.body.scrollWidth), clientWidth: de.clientWidth },
      texts: textRows, brokenWords: words, controls: ctrls, cost, chat, proposal,
      partOverflow: overflowInsideParts(), accentFills: accentFills(),
    };
  }

  let stopId = 0;
  async function focusInfo() {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    await Promise.race([Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1000))]);
    if (!el.__svStop) el.__svStop = ++stopId;
    const cs = getComputedStyle(el);
    const width = parseFloat(cs.outlineWidth) || 0, offset = parseFloat(cs.outlineOffset) || 0;
    const style = cs.outlineStyle;
    const behind = background(el.parentElement || el);
    const colour = over(rgba(cs.outlineColor), behind);
    const grow = offset + width;
    const rings = [...el.getClientRects()].map((r) => ({ x: r.left - grow, y: r.top - grow, w: r.width + 2 * grow, h: r.height + 2 * grow }));
    const overlaps = [];
    if (style !== "none" && width > 0) {
      for (const c of controls()) {
        if (c === el || c.contains(el) || el.contains(c)) continue;
        const label = isBox(c) ? c.closest("label") : null;
        if (label && (label.contains(el) || el.contains(label))) continue;
        const r = (label || c).getBoundingClientRect();
        for (const g of rings) {
          const ix = Math.min(g.x + g.w, r.right) - Math.max(g.x, r.left);
          const iy = Math.min(g.y + g.h, r.bottom) - Math.max(g.y, r.top);
          if (ix > 0.5 && iy > 0.5) { overlaps.push(describe(label || c)); break; }
        }
      }
    }
    return { id: el.__svStop, where: describe(el), style, width, offset, colour, behind, rings, overlaps };
  }
  window.__svCheck = { measure, focusInfo };
})()`;

// ---------------------------------------------------------------- one page state

async function checkState(browser, base, file, width, theme, shots) {
  const context = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = `${base}/${posix(file)}?theme=${theme}`;
  const resp = await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(PAGE_LIB);
  const m = await page.evaluate(() => window.__svCheck.measure());
  const findings = [];
  const add = (rule, message, where = "") => findings.push({ rule, message, where });

  if (!resp || !resp.ok()) add("page-load", `HTTP ${resp ? resp.status() : "no response"} for ${url}`);
  if (m.scroll.scrollWidth > m.scroll.clientWidth) add("sideways-scroll", `page is ${m.scroll.scrollWidth}px wide in a ${m.scroll.clientWidth}px viewport`);

  for (const t of m.texts) {
    t.ratio = contrast(t.fg, t.bg);
    t.needs = t.size >= 24 ? 3 : 4.5;
    if (t.size < 16) add("text-too-small", `"${t.text}" is ${t.size}px`, t.where);
    if (t.ratio < t.needs) add("text-contrast", `"${t.text}" is ${t.ratio}:1 (needs ${t.needs}:1) — rgb(${t.fg}) on rgb(${t.bg})`, t.where);
  }
  for (const c of m.controls) {
    if ((c.w < 24 || c.h < 24) && !c.targetExempt) add("control-too-small", `${c.tag} target is ${Math.round(c.w)}×${Math.round(c.h)}px (needs 24×24)`, c.where);
    if ((c.kind === "button" || c.kind === "field") && c.h < 44) add("control-too-short", `${c.kind} is ${Math.round(c.h)}px tall (needs 44)`, c.where);
    const b = c.boundary;
    if (b) {
      if (b.appearanceAuto) { c.boundaryResult = "native appearance, not measurable"; continue; }
      const ratios = [...b.borders.map((x) => contrast(x, b.behind)), ...(b.fill ? [contrast(b.fill, b.behind)] : [])];
      c.boundaryRatios = ratios;
      if (!ratios.length) { c.boundaryResult = "no border or fill (text only)"; continue; }
      const best = Math.max(...ratios);
      c.boundaryResult = best;
      if (best < 3) add("control-boundary-contrast", `${c.tag} boundary is ${best}:1 against rgb(${b.behind}) (needs 3:1)`, c.where);
    }
  }
  for (const w of m.brokenWords) add("word-break", `"${w.word}" is broken across lines`, w.where);
  for (const c of m.chat) {
    if (!c.from) add("missing-speaker-label", "chat message has no visible .sv-chat-message__from with text", c.where);
  }
  for (const o of m.partOverflow) {
    add("overflow-inside-part", `text "${o.text}" extends ${o.amount}px beyond the box of .${o.cls}`, o.where);
  }
  const demoPage = /^demo-/.test(posix(file).split("/").pop());
  if (!demoPage && m.accentFills && m.accentFills.elements.length > 1) {
    add("many-accent-fills", `${m.accentFills.elements.length} visible elements are filled with the accent rgb(${m.accentFills.accent}): ${m.accentFills.elements.map((e) => `${e.where} "${e.text}"`).join("; ")}`);
  }
  if (m.cost) {
    if (!m.cost.totals.length) add("cost-total-largest", "page has .sv-cost-summary but no visible total row dd");
    for (const t of m.cost.totals) {
      if (m.cost.maxOther && t.size <= m.cost.maxOther.size) {
        add("cost-total-largest", `total "${t.text}" is ${t.size}px but "${m.cost.maxOther.text}" is ${m.cost.maxOther.size}px`, t.where);
      }
    }
  }

  // Tab through every stop.
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const stops = [];
  let first = null;
  for (let i = 0; i < MAX_TAB_STOPS; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => window.__svCheck.focusInfo());
    if (!f || f.id === first) break;
    if (first === null) first = f.id;
    f.ratio = contrast(f.colour, f.behind);
    stops.push(f);
    if (f.style === "none" || f.style === "hidden" || f.width < 2) add("focus-outline", `Tab stop has outline ${f.style} ${f.width}px (needs a visible outline of 2px or more)`, f.where);
    else if (f.ratio < 3) add("focus-contrast", `focus outline is ${f.ratio}:1 against rgb(${f.behind}) (needs 3:1)`, f.where);
    for (const o of f.overlaps) add("focus-overlap", `focus ring overlaps ${o}`, f.where);
  }
  if (stops.length >= MAX_TAB_STOPS) add("focus-outline", `stopped after ${MAX_TAB_STOPS} Tab stops without returning to the start`);
  for (const e of errors) add("page-error", e);

  let shot = null;
  if (shots) {
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    const name = posix(relative(DIR ? resolve(REPO, DIR) : join(REPO, "screens"), join(REPO, file))).replace(/\//g, "-").replace(/\.html$/, "");
    shot = join(SHOTS_DIR, `${name}-${width}-${theme}.png`);
    await page.screenshot({ path: shot, fullPage: true });
  }
  await context.close();
  return {
    file: posix(file), width, theme, url,
    screenshot: shot ? posix(relative(REPO, shot)) : null,
    proposalHeight: m.proposal ? m.proposal.height : null,
    measurements: { scroll: m.scroll, texts: m.texts, controls: m.controls, brokenWords: m.brokenWords, cost: m.cost, chat: m.chat, proposal: m.proposal, partOverflow: m.partOverflow, accentFills: m.accentFills, tabStops: stops },
    findings,
  };
}

// ---------------------------------------------------------------- runs

function screenFiles(dirRel) {
  const dir = join(REPO, dirRel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".html") && f !== "index.html").sort().map((f) => join(dirRel, f));
}

async function runAll(files, { shots }) {
  const server = await createServer({ root: REPO, port: 0 });
  let launched;
  try {
    launched = await launchChromium();
    console.log(`check-screens: Chromium ${launched.browser.version()} (${launched.why}); contrast from ${contrastSource}`);
    if (shots) mkdirSync(SHOTS_DIR, { recursive: true });
    const results = [];
    for (const file of files) for (const width of WIDTHS) for (const theme of THEMES) {
      results.push(await checkState(launched.browser, server.url, file, width, theme, shots));
    }
    return { results, chromium: { version: launched.browser.version(), path: launched.path, source: launched.why } };
  } finally {
    if (launched) await launched.browser.close();
    await server.close();
  }
}

function summaryTable(results) {
  const states = WIDTHS.flatMap((w) => THEMES.map((t) => `${w} ${t}`));
  const files = [...new Set(results.map((r) => r.file))];
  const rows = files.flatMap((f) => {
    const of = (s) => results.find((x) => x.file === f && `${x.width} ${x.theme}` === s);
    const out = [[f, ...states.map((s) => (of(s).findings.length ? String(of(s).findings.length) : "pass"))]];
    // measured only, never a pass or fail
    if (states.some((s) => of(s).proposalHeight != null)) {
      out.push(["  proposal height", ...states.map((s) => (of(s).proposalHeight != null ? `${of(s).proposalHeight}px` : "-"))]);
    }
    return out;
  });
  const head = ["Screen", ...states];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (c) => "| " + c.map((x, i) => x.padEnd(w[i])).join(" | ") + " |";
  return [line(head), "|" + w.map((n) => "-".repeat(n + 2)).join("|") + "|", ...rows.map(line)].join("\n");
}

function printFindings(results) {
  for (const r of results) for (const f of r.findings) {
    console.log(`${r.file} ${r.width} ${r.theme} ${f.rule} ${f.message}${f.where ? ` at ${f.where}` : ""}`);
  }
}

async function runNormal() {
  const top = DIR ? relative(REPO, resolve(REPO, DIR)) : "screens";
  if (top.startsWith("..")) { console.error("check-screens: --dir must be inside the repository"); return 1; }
  let files = [...screenFiles(top), ...screenFiles(join(top, "agent-test"))];
  if (ONLY) files = files.filter((f) => posix(f).includes(ONLY));
  if (!files.length) {
    console.log(`check-screens: no screens to check${ONLY ? ` matching "${ONLY}"` : ""} (screens/*.html and screens/agent-test/*.html, index.html skipped); nothing written`);
    return 0;
  }
  const { results, chromium: info } = await runAll(files, { shots: !NO_SHOTS });
  printFindings(results);
  console.log(summaryTable(results));
  const total = results.reduce((n, r) => n + r.findings.length, 0);
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify({
    produced_by: "scripts/check-screens.mjs",
    measured_at: new Date().toISOString(),
    chromium: info, contrast: contrastSource, widths: WIDTHS, height: HEIGHT, themes: THEMES, only: ONLY,
    screenshots: !NO_SHOTS,
    states: results.length, findings_total: total, pass: total === 0,
    results,
  }, null, 2) + "\n");
  console.log(`check-screens: ${files.length} screens × ${WIDTHS.length * THEMES.length} states, ${total} finding${total === 1 ? "" : "s"}; data in ${posix(relative(REPO, OUT_JSON))}${NO_SHOTS ? "" : `, screenshots in ${posix(relative(REPO, SHOTS_DIR))}/`}`);
  return total ? 1 : 0;
}

async function runSelfTest() {
  const dirRel = join("scripts", "fixtures", "screens");
  const files = readdirSync(join(REPO, dirRel)).filter((f) => f.endsWith(".html")).sort().map((f) => join(dirRel, f));
  const { results } = await runAll(files, { shots: false });
  console.log("check-screens self-test: each bad page must yield exactly the rules in its <meta name=\"expect\">, the clean page none");
  let problems = 0;
  const seen = new Set();
  for (const file of files) {
    const html = readFileSync(join(REPO, file), "utf8");
    const m = /<meta\s+name="expect"\s+content="([^"]*)"/.exec(html);
    const expect = new Set((m ? m[1] : "MISSING-META").split(/\s+/).filter(Boolean));
    const mine = results.filter((r) => r.file === posix(file));
    const got = new Set(mine.flatMap((r) => r.findings.map((f) => f.rule)));
    const ok = expect.size === got.size && [...expect].every((x) => got.has(x));
    if (!ok) problems++;
    else got.forEach((r) => seen.add(r));
    const perState = mine.map((r) => `${r.width}${r.theme[0]}:${r.findings.length}`).join(" ");
    console.log(`${ok ? "PASS" : "FAIL"}  ${posix(file).replace("scripts/fixtures/screens/", "").padEnd(34)} expect ${[...expect].join(", ") || "nothing"}; got ${[...got].join(", ") || "nothing"}  [${perState}]`);
    const example = mine.flatMap((r) => r.findings.map((f) => `${r.width} ${r.theme} ${f.rule} ${f.message}${f.where ? ` at ${f.where}` : ""}`));
    for (const e of (ok ? example.slice(0, 1) : example.slice(0, 12))) console.log(`      ${e}`);
  }
  const RULES = ["page-error", "sideways-scroll", "text-too-small", "control-too-small", "control-too-short", "text-contrast", "control-boundary-contrast", "focus-outline", "focus-contrast", "focus-overlap", "word-break", "cost-total-largest", "missing-speaker-label", "overflow-inside-part", "many-accent-fills"];
  const never = RULES.filter((r) => !seen.has(r));
  if (never.length) { problems++; console.log(`FAIL  rules never seen failing: ${never.join(", ")}`); }
  console.log(`check-screens self-test: ${files.length} pages, ${seen.size} of ${RULES.length} rules seen failing, ${problems} problem${problems === 1 ? "" : "s"}`);
  return problems ? 1 : 0;
}

(SELF_TEST ? runSelfTest() : runNormal()).then(
  (code) => { process.exitCode = code; },
  (err) => { console.error(`check-screens: ${err.stack || err.message}`); process.exitCode = 1; },
);
