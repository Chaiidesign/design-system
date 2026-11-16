// Button tests: one entry per requirement in ds-components/specs/button.spec.json whose check is test:<id>.
// Run by v2/tools/test-components.mjs (node v2/tools/test-components.mjs --component button), which calls each
// entry with { page, open, expect }: a fresh Playwright page, open(exampleId, { theme, width, density }) that
// loads one gallery example and waits for it, and node:assert/strict. Each test has 30 seconds.
//
// Presses are observed through window.__buttonClicks[<example id>], which every example in
// button.examples.tsx increments from its onClick. Focus is always reached with real Tab presses, so
// :focus-visible holds as it would for a keyboard user. Every "nothing happened" test first proves the same
// press does count on a live example, so it cannot pass by measuring nothing.

const ROOT = '[data-slot="button"]';
const LABEL = '[data-slot="button-label"]';
const ALL_EXAMPLES = ["secondary", "primary", "neutral", "ghost", "danger", "danger-soft", "outline", "success", "warning", "small", "large", "with-icons", "icon-only", "loading", "disabled", "full-width", "long-label", "as-link"];
const VARIANT_EXAMPLES = ["secondary", "primary", "neutral", "ghost", "danger", "danger-soft", "outline", "success", "warning"];

const clicks = (page, id) => page.evaluate((k) => (window.__buttonClicks && window.__buttonClicks[k]) || 0, id);

// Presses Tab until the button root has focus. Returns true when it got there.
async function tabToButton(page) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement && document.activeElement.matches(sel), ROOT)) return true;
  }
  return false;
}

async function clickCentre(page) {
  const box = await page.locator(ROOT).first().boundingBox();
  if (!box) throw new Error("the button has no box to click");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// Colour maths in the page: parse a computed colour, composite it over what is behind, and give the WCAG ratio.
function inPageColour() {
  const parse = (s) => {
    if (!s || s === "transparent") return [0, 0, 0, 0];
    let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = s.match(/^color\(srgb ([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    throw new Error(`cannot read the colour ${s}`);
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
  const backgroundOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  window.__buttonColour = { parse, over, ratio, hex, backgroundOf };
}

export const tests = {
  "button-native-element": async ({ page, open, expect }) => {
    for (const id of ALL_EXAMPLES) {
      await open(id);
      const tag = await page.locator(ROOT).first().evaluate((el) => el.tagName);
      if (id === "as-link") {
        expect.equal(tag, "A", "with asChild the root is the link element");
        expect.equal(await page.locator(ROOT).first().getAttribute("href"), "#settings", "the link keeps its href");
      } else {
        expect.equal(tag, "BUTTON", `the root of "${id}" is a button element`);
      }
    }
  },

  "button-type-default": async ({ page, open, expect }) => {
    for (const id of ["secondary", "primary", "icon-only", "loading", "disabled"]) {
      await open(id);
      expect.equal(await page.locator(ROOT).first().getAttribute("type"), "button", `"${id}" has type="button" when no type is given`);
    }
    await open("as-link");
    expect.equal(await page.locator(ROOT).first().getAttribute("type"), null, "a link rendered with asChild gets no button type");
  },

  "button-icons-hidden": async ({ page, open, expect }) => {
    await open("with-icons");
    for (const slot of ["button-icon-start", "button-icon-end"]) {
      const el = page.locator(`[data-slot="${slot}"]`);
      expect.equal(await el.count(), 1, `with-icons renders ${slot}`);
      expect.equal(await el.getAttribute("aria-hidden"), "true", `${slot} carries aria-hidden="true"`);
    }
    await open("icon-only");
    expect.equal(await page.locator('[data-slot="button-icon-start"]').getAttribute("aria-hidden"), "true", "the icon of an icon-only button carries aria-hidden");
    expect.equal(await page.locator(ROOT).getAttribute("aria-label"), "Send message", "the icon-only button is named by ariaLabel, not by its icon");
    await open("loading");
    const spinner = page.locator('[data-slot="button-spinner"]');
    expect.equal(await spinner.count(), 1, "loading shows the spinner");
    expect.equal(await spinner.getAttribute("aria-hidden"), "true", "the spinner carries aria-hidden");
  },

  "button-enter-activates": async ({ page, open, expect }) => {
    for (const id of ["primary", "secondary", "as-link"]) {
      await open(id);
      expect.ok(await tabToButton(page), `Tab reaches the "${id}" button`);
      await page.keyboard.press("Enter");
      expect.equal(await clicks(page, id), 1, `Enter on "${id}" calls onClick once`);
    }
  },

  "button-space-activates": async ({ page, open, expect }) => {
    for (const id of ["primary", "secondary"]) {
      await open(id);
      expect.ok(await tabToButton(page), `Tab reaches the "${id}" button`);
      await page.keyboard.press("Space");
      expect.equal(await clicks(page, id), 1, `Space on "${id}" calls onClick once`);
    }
  },

  "button-disabled-inert": async ({ page, open, expect }) => {
    await open("primary");
    await clickCentre(page);
    expect.equal(await clicks(page, "primary"), 1, "control: a click on a live primary button counts once");
    await open("disabled");
    expect.equal(await page.locator(ROOT).evaluate((el) => el.disabled), true, "the disabled example sets the native disabled attribute");
    expect.equal(await page.locator(ROOT).getAttribute("data-disabled"), "", "the disabled prop reflects data-disabled");
    await clickCentre(page);
    await page.locator(ROOT).dispatchEvent("click");
    expect.equal(await clicks(page, "disabled"), 0, "a click on a disabled button does not call onClick");
  },

  "button-loading-inert": async ({ page, open, expect }) => {
    await open("primary");
    expect.ok(await tabToButton(page), "control: Tab reaches the live primary button");
    await page.keyboard.press("Enter");
    await clickCentre(page);
    expect.equal(await clicks(page, "primary"), 2, "control: Enter and a click on a live button count twice");
    await open("loading");
    expect.ok(await tabToButton(page), "Tab reaches the loading button");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await clickCentre(page);
    expect.equal(await clicks(page, "loading"), 0, "Enter, Space and a click on a loading button do not call onClick");
  },

  "button-loading-stays-focusable": async ({ page, open, expect }) => {
    await open("loading");
    expect.ok(await tabToButton(page), "Tab reaches the loading button");
    const seen = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return { focused: document.activeElement === el, busy: el.getAttribute("aria-busy"), unavailable: el.getAttribute("aria-disabled"), nativeDisabled: el.hasAttribute("disabled"), dataDisabled: el.hasAttribute("data-disabled"), tabIndex: el.tabIndex };
    }, ROOT);
    expect.equal(seen.focused, true, "the loading button is document.activeElement");
    expect.equal(seen.busy, "true", "aria-busy is true");
    expect.equal(seen.unavailable, "true", "aria-disabled is true");
    expect.equal(seen.nativeDisabled, false, "the native disabled attribute is absent");
    expect.equal(seen.dataDisabled, false, "data-disabled is absent: loading is busy, not unavailable");
    expect.ok(seen.tabIndex >= 0, "the button stays in the Tab order");
    await page.keyboard.press("Enter");
    expect.equal(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), ROOT), true, "focus stays on the button after a press while loading");
  },

  "button-focus-visible": async ({ page, open, expect }) => {
    const problems = [];
    for (const theme of ["light", "dark"]) {
      for (const id of ["secondary", "primary", "ghost", "outline", "danger"]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        if (!(await tabToButton(page))) { problems.push(`${id} ${theme}: Tab never reached the button`); continue; }
        const r = await page.evaluate((sel) => {
          const C = window.__buttonColour;
          const el = document.querySelector(sel);
          const cs = getComputedStyle(el);
          const beside = C.backgroundOf(el.parentElement);
          const ring = C.over(C.parse(cs.outlineColor), beside);
          return { visible: el.matches(":focus-visible"), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, ratio: C.ratio(ring, beside), ring: C.hex(ring), beside: C.hex(beside) };
        }, ROOT);
        if (!r.visible) problems.push(`${id} ${theme}: the button does not match :focus-visible after Tab`);
        if (r.style !== "solid" || r.width < 2) problems.push(`${id} ${theme}: outline ${r.style} ${r.width} px, needs solid and at least 2 px`);
        if (r.ratio < 3) problems.push(`${id} ${theme}: ring ${r.ring} on ${r.beside} is ${r.ratio.toFixed(2)} to 1, needs 3`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "button-label-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const theme of ["light", "dark"]) {
      for (const id of VARIANT_EXAMPLES) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        const box = await page.locator(ROOT).first().boundingBox();
        const measure = () => page.evaluate(({ root, label }) => {
          const C = window.__buttonColour;
          const el = document.querySelector(root);
          const text = el.querySelector(label);
          const fill = C.backgroundOf(el);
          const ink = C.over(C.parse(getComputedStyle(text).color), fill);
          return { ratio: C.ratio(ink, fill), ink: C.hex(ink), fill: C.hex(fill) };
        }, { root: ROOT, label: LABEL });
        const states = [["default", async () => {}], ["hover", async () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)], ["active", async () => page.mouse.down()]];
        for (const [state, drive] of states) {
          await drive();
          const r = await measure();
          measured++;
          if (r.ratio < 4.5) problems.push(`${id} ${state} ${theme}: ${r.ink} on ${r.fill} is ${Math.floor(r.ratio * 100) / 100} to 1, needs 4.5`);
        }
        await page.mouse.up();
      }
    }
    expect.ok(measured === VARIANT_EXAMPLES.length * 6, `measured ${measured} label and fill pairs`);
    expect.deepEqual(problems, [], `${problems.length} of ${measured} label and fill pairs are under 4.5 to 1: ${problems.join("; ")}`);
  },

  // Loading keeps the variant's look: the loading example (primary, loading) must paint exactly as the live primary
  // example does, and must not take the disabled look. Measured in both themes before anything is asserted.
  "button-loading-keeps-look": async ({ page, open, expect }) => {
    const look = () => page.evaluate(({ root, label }) => {
      const el = document.querySelector(root);
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor, color: getComputedStyle(el.querySelector(label)).color, opacity: cs.opacity,
        borderColor: cs.borderTopColor, disabledSelector: el.matches(":is(:disabled, [data-disabled])"),
      };
    }, { root: ROOT, label: LABEL });
    const problems = [];
    for (const theme of ["light", "dark"]) {
      await open("primary", { theme });
      const live = await look();
      await open("disabled", { theme });
      const off = await look();
      await open("loading", { theme });
      const busy = await look();
      if (off.background === live.background) problems.push(`${theme}: the disabled and live primary fills are both ${live.background}, so this test could not tell them apart`);
      for (const k of ["background", "color", "opacity", "borderColor"]) if (busy[k] !== live[k]) problems.push(`${theme}: loading ${k} is ${busy[k]}, the live primary button's is ${live[k]}`);
      if (busy.disabledSelector) problems.push(`${theme}: the loading button matches the disabled state's selector`);
      if (busy.background === off.background) problems.push(`${theme}: the loading fill ${busy.background} is the disabled fill`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "button-target-size": async ({ page, open, expect }) => {
    for (const id of ["small", "icon-only", "secondary", "large", "as-link", "loading", "disabled"]) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        const box = await page.locator(ROOT).first().boundingBox();
        expect.ok(box && box.width >= 24 && box.height >= 24, `"${id}" at ${width} wide is ${box ? `${box.width} by ${box.height}` : "not rendered"} px; needs at least 24 by 24`);
      }
    }
  },

  "button-touch-target": async ({ page, open, expect }) => {
    // Touch emulation is what makes Chromium report (pointer: coarse); a media-feature override of pointer is
    // ignored. It lasts across the loads open() does.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    for (const id of ["small", "secondary", "icon-only", "large"]) {
      await open(id, { width: 375 });
      expect.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the page sees a coarse pointer, so the measurement means something");
      const box = await page.locator(ROOT).first().boundingBox();
      expect.ok(box && box.height >= 44 - 0.01, `with a coarse pointer "${id}" is ${box ? box.height : "not"} px tall; needs at least 44`);
    }
    await cdp.detach();
  },

  "button-label-wraps": async ({ page, open, expect }) => {
    const problems = [];
    for (const width of [320, 375]) {
      await open("long-label", { width });
      const m = await page.evaluate(({ root, label }) => {
        const el = document.querySelector(root);
        const text = el.querySelector(label);
        const b = el.getBoundingClientRect(), t = text.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const px = (v) => parseFloat(v) || 0;
        const inner = {
          left: b.left + px(cs.borderInlineStartWidth) + px(cs.paddingInlineStart),
          right: b.right - px(cs.borderInlineEndWidth) - px(cs.paddingInlineEnd),
          top: b.top + px(cs.borderBlockStartWidth),
          bottom: b.bottom - px(cs.borderBlockEndWidth),
        };
        const range = document.createRange();
        range.selectNodeContents(text);
        const lineTops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
        let clipped = null;
        for (let e = text; e && e !== document.body; e = e.parentElement) {
          const o = getComputedStyle(e);
          if ([o.overflowX, o.overflowY].some((v) => v !== "visible") || o.textOverflow === "ellipsis") { clipped = e.getAttribute("data-slot") || e.tagName; break; }
        }
        return {
          lines: lineTops.size, clipped, viewport: document.documentElement.clientWidth,
          button: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, height: b.height },
          label: { left: t.left, right: t.right, top: t.top, bottom: t.bottom, height: t.height },
          inner,
        };
      }, { root: ROOT, label: LABEL });
      // Every width is measured before anything is asserted, so a failure reports all of them.
      const at = `at ${width} wide`;
      if (m.lines < 2) problems.push(`${at} the long label does not wrap (${m.lines} line)`);
      if (m.clipped !== null) problems.push(`${at} ${m.clipped} around the label hides overflow`);
      if (m.button.right > m.viewport + 0.5) problems.push(`${at} the button ends at ${m.button.right} px, outside the ${m.viewport} px viewport`);
      if (m.label.left < m.inner.left - 0.5 || m.label.right > m.inner.right + 0.5) problems.push(`${at} the label (${m.label.left} to ${m.label.right} px) leaves the inline padding (${m.inner.left} to ${m.inner.right} px)`);
      if (m.label.top < m.inner.top - 0.5 || m.label.bottom > m.inner.bottom + 0.5) problems.push(`${at} the label is ${m.label.height} px tall (${m.lines} lines) but the button has ${m.inner.bottom - m.inner.top} px inside its border (${m.button.height} px button)`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },
};
