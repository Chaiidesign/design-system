// Dialog tests: one entry per requirement in ds-components/specs/dialog.spec.json whose check is test:<id>.
// Run by v2/tools/test-components.mjs (node v2/tools/test-components.mjs --component dialog), which calls each
// entry with { page, open, expect }: a fresh Playwright page, open(exampleId, { theme, width, height, density })
// that loads one gallery example and waits for it, and node:assert/strict. Each test has 30 seconds.
//
// What the tests read, all set by dialog.examples.tsx:
//   window.__dialogEvents[<example id>].openChange   every value onOpenChange was called with
//   window.__dialogControl["controlled-without-trigger"].setOpen   opens that dialog as a product would
//   window.__dialogFixtures.mountUntitled(kind)      mounts a dialog without a title, for the warning test
// The overlay and the content are portalled to the end of <body>, so every part is found document-wide.
// The trigger and the close parts are Souvenir Buttons rendered through asChild. Button sets its own
// data-slot="button" over the part's, so the trigger is found by aria-haspopup="dialog" and the close parts by
// their text inside the footer.
// Focus is reached with real Tab presses. Every "nothing happened" test first proves the same action does
// something on a live example, so it cannot pass by measuring nothing.

const OVERLAY = '[data-slot="dialog-overlay"]';
const CONTENT = '[data-slot="dialog-content"]';
const HEADER = '[data-slot="dialog-header"]';
const TITLE = '[data-slot="dialog-title"]';
const DESCRIPTION = '[data-slot="dialog-description"]';
const BODY = '[data-slot="dialog-body"]';
const FOOTER = '[data-slot="dialog-footer"]';
const TRIGGER = '[aria-haspopup="dialog"]';
const ALL_EXAMPLES = ["default", "confirm-step", "small", "medium", "no-description", "not-dismissible", "title-focus", "closed", "controlled-without-trigger", "long-text", "worst-case-320"];
const NOT_DISMISSIBLE = ["not-dismissible", "worst-case-320"];

const events = (page, id) => page.evaluate((k) => {
  const e = (window.__dialogEvents && window.__dialogEvents[k]) || {};
  return { openChange: e.openChange || [], action: e.action || [] };
}, id);
const openCount = (page) => page.locator(`${CONTENT}[data-state="open"]`).count();
const waitOpen = (page) => page.locator(`${CONTENT}[data-state="open"]`).first().waitFor({ timeout: 5000 });
const waitClosed = (page) => page.waitForFunction((sel) => !document.querySelector(sel), CONTENT, { timeout: 5000 });
// What has focus: its text, its data-slot, and whether it sits inside the dialog content.
const focused = (page) => page.evaluate((content) => {
  const a = document.activeElement;
  if (!a || a === document.body) return { text: null, slot: null, inside: false, id: null, tag: a ? "BODY" : null };
  return { text: (a.textContent || "").trim(), slot: a.getAttribute("data-slot"), inside: !!a.closest(content), id: a.id || null, tag: a.tagName };
}, CONTENT);
const box = async (page, sel) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error(`${sel} has no box`);
  return b;
};
const clickAt = (page, b) => page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
const footerButton = (page, text) => page.locator(`${FOOTER} button`, { hasText: text }).first();

// Opens an example and, for the closed one, presses its trigger, so the dialog is open either way.
async function openDialog(page, open, id, opts = {}) {
  await open(id, opts);
  if (id === "closed") await clickAt(page, await box(page, TRIGGER));
  await waitOpen(page);
}

// Presses Tab until fn(focused) holds, from wherever focus is. Returns the focus seen, or null.
async function tabUntil(page, fn, { max = 20, shift = false } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(shift ? "Shift+Tab" : "Tab");
    const f = await focused(page);
    if (fn(f)) return f;
  }
  return null;
}

// A point on the overlay that is outside the content: inside the overlay's top-left padding.
async function outsidePoint(page) {
  const o = await box(page, OVERLAY);
  const c = await box(page, CONTENT);
  const p = { x: o.x + 8, y: o.y + 8 };
  if (p.x >= c.x && p.x <= c.x + c.width && p.y >= c.y && p.y <= c.y + c.height) throw new Error("no overlay point outside the content");
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("data-slot"), p);
  if (hit !== "dialog-overlay") throw new Error(`the point ${p.x},${p.y} hits ${hit}, not the overlay`);
  return p;
}

// Colour maths in the page (as in button.tests.mjs): parse, composite over what is behind, WCAG ratio.
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
  window.__dialogColour = { parse, over, ratio, hex, backgroundOf };
}

export const tests = {
  "dialog-title-required": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ALL_EXAMPLES) {
      await openDialog(page, open, id);
      const r = await page.evaluate(({ content, title }) => [...document.querySelectorAll(content)].map((c) => {
        const t = c.querySelector(title);
        return { hasTitle: !!t, text: t ? (t.textContent || "").trim() : "", titleId: t ? t.id : null, labelledby: c.getAttribute("aria-labelledby") };
      }), { content: CONTENT, title: TITLE });
      if (!r.length) problems.push(`${id}: no DialogContent rendered`);
      r.forEach((c, i) => {
        if (!c.hasTitle) problems.push(`${id}: content ${i + 1} holds no DialogTitle`);
        else if (!c.text) problems.push(`${id}: content ${i + 1} has an empty DialogTitle`);
        else if (!c.titleId || c.labelledby !== c.titleId) problems.push(`${id}: aria-labelledby is ${c.labelledby}, the title's id is ${c.titleId}`);
      });
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-title-dev-warning": async ({ page, open, expect }) => {
    const warnings = [];
    page.on("console", (m) => { if (m.type() === "warning") warnings.push(m.text()); });
    await openDialog(page, open, "default");
    await page.waitForTimeout(100);
    const titleWarning = (w) => /DialogTitle/.test(w);
    expect.deepEqual(warnings.filter(titleWarning), [], "control: a dialog with a title gives no title warning");
    for (const [kind, pattern] of [["missing", /no DialogTitle/], ["empty", /DialogTitle is empty/]]) {
      const before = await page.locator(CONTENT).count();
      await page.evaluate((k) => window.__dialogFixtures.mountUntitled(k), kind);
      await page.waitForFunction(({ sel, n }) => document.querySelectorAll(sel).length > n, { sel: CONTENT, n: before }, { timeout: 5000 });
      await page.waitForTimeout(100);
      const seen = warnings.filter((w) => pattern.test(w));
      expect.ok(seen.length >= 1, `a DialogContent mounted with the title ${kind} logs a console warning matching ${pattern}; warnings seen: ${JSON.stringify(warnings)}`);
    }
  },

  "dialog-aria-modal": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["default", "closed", "no-description", "not-dismissible", "controlled-without-trigger"]) {
      await openDialog(page, open, id);
      const r = await page.locator(CONTENT).first().evaluate((el) => ({ role: el.getAttribute("role"), modal: el.getAttribute("aria-modal") }));
      if (r.role !== "dialog") problems.push(`${id}: role is ${r.role}`);
      if (r.modal !== "true") problems.push(`${id}: aria-modal is ${r.modal}, needs "true"`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-describedby": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["default", "confirm-step", "not-dismissible", "no-description", "small", "medium"]) {
      await openDialog(page, open, id);
      const r = await page.evaluate(({ content, description }) => {
        const c = document.querySelector(content);
        const d = c.querySelector(description);
        return { describedby: c.getAttribute("aria-describedby"), descriptionId: d ? d.id : null };
      }, { content: CONTENT, description: DESCRIPTION });
      if (r.descriptionId) {
        if (!r.describedby || !r.describedby.split(/\s+/).includes(r.descriptionId)) problems.push(`${id}: aria-describedby is ${r.describedby}; it must name the description ${r.descriptionId}`);
      } else if (r.describedby !== null) problems.push(`${id}: no description, yet aria-describedby is "${r.describedby}"`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-trigger-attributes": async ({ page, open, expect }) => {
    await open("closed");
    const trigger = page.locator(TRIGGER);
    expect.equal(await trigger.count(), 1, "the closed example has one element with aria-haspopup=\"dialog\"");
    const read = () => trigger.evaluate((el) => ({ tag: el.tagName, haspopup: el.getAttribute("aria-haspopup"), expanded: el.getAttribute("aria-expanded"), controls: el.getAttribute("aria-controls"), state: el.getAttribute("data-state") }));
    const closed = await read();
    expect.equal(closed.tag, "BUTTON", "the trigger is a button element");
    expect.equal(closed.expanded, "false", "aria-expanded is false while closed");
    expect.equal(closed.state, "closed", "data-state is closed while closed");
    await clickAt(page, await box(page, TRIGGER));
    await waitOpen(page);
    const opened = await read();
    const contentId = await page.locator(CONTENT).first().getAttribute("id");
    expect.equal(opened.haspopup, "dialog", "aria-haspopup is dialog");
    expect.equal(opened.expanded, "true", "aria-expanded is true while open");
    expect.equal(opened.state, "open", "data-state is open while open");
    expect.ok(contentId, "the content has an id");
    expect.equal(opened.controls, contentId, "aria-controls names the content's id while open");
  },

  "dialog-trigger-opens-by-keyboard": async ({ page, open, expect }) => {
    const problems = [];
    for (const key of ["Enter", "Space"]) {
      await open("closed");
      expect.equal(await openCount(page), 0, "the closed example starts closed");
      const f = await tabUntil(page, (x) => x.text === "Change address");
      if (!f) { problems.push(`${key}: Tab never reached the trigger`); continue; }
      await page.keyboard.press(key);
      try { await waitOpen(page); } catch { problems.push(`${key} on the trigger did not open the dialog`); continue; }
      const e = await events(page, "closed");
      if (JSON.stringify(e.openChange) !== "[true]") problems.push(`${key}: onOpenChange calls were ${JSON.stringify(e.openChange)}, expected [true]`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-focus-on-open": async ({ page, open, expect }) => {
    const problems = [];
    // [example, the first control that is not a link]. long-text's body scrolls and is tabbable, yet is not a control.
    for (const [id, want] of [["default", "Cancel"], ["closed", "Cancel"], ["not-dismissible", "Use a different card"], ["long-text", "Back"], ["controlled-without-trigger", "Sign out"]]) {
      await openDialog(page, open, id);
      await page.waitForTimeout(50);
      const f = await focused(page);
      if (!f.inside) problems.push(`${id}: focus is on ${f.tag} "${f.text}", outside the dialog`);
      else if (f.text !== want) problems.push(`${id}: focus is on "${f.text}" (${f.slot}), expected the first control "${want}"`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-initial-focus-title": async ({ page, open, expect }) => {
    const problems = [];
    for (const [width, height] of [[1280, 800], [375, 667], [320, 568]]) {
      await openDialog(page, open, "title-focus", { width, height });
      await page.waitForTimeout(50);
      const r = await page.evaluate(({ title, body }) => {
        const t = document.querySelector(title), b = document.querySelector(body);
        const tr = t.getBoundingClientRect(), br = b.getBoundingClientRect();
        const first = b.firstElementChild ? b.firstElementChild.getBoundingClientRect() : br;
        return {
          onTitle: document.activeElement === t, tabIndex: t.getAttribute("tabindex"), scrollTop: b.scrollTop,
          scrolls: b.scrollHeight > b.clientHeight, titleTop: tr.top, titleBottom: tr.bottom, vh: innerHeight,
          firstTop: first.top, bodyTop: br.top, bodyBottom: br.bottom,
        };
      }, { title: TITLE, body: BODY });
      const at = `at ${width} by ${height}`;
      if (!r.onTitle) problems.push(`${at}: focus is not on the title`);
      if (r.tabIndex !== "-1") problems.push(`${at}: the title's tabindex is ${r.tabIndex}, needs -1`);
      if (r.titleTop < 0 || r.titleBottom > r.vh) problems.push(`${at}: the title (${r.titleTop} to ${r.titleBottom}) is outside the viewport`);
      if (r.scrollTop !== 0) problems.push(`${at}: the body is scrolled ${r.scrollTop} px; its top must stay in view`);
      if (r.firstTop < r.bodyTop - 0.5 || r.firstTop > r.bodyBottom) problems.push(`${at}: the first paragraph starts at ${r.firstTop}, outside the body (${r.bodyTop} to ${r.bodyBottom})`);
      if (width === 320 && !r.scrolls) problems.push(`${at}: the body does not scroll, so this case proves nothing about keeping its top in view`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-tab-wraps": async ({ page, open, expect }) => {
    await openDialog(page, open, "default");
    const start = await focused(page);
    expect.equal(start.text, "Cancel", "focus starts on the first control");
    const seen = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      seen.push(await focused(page));
    }
    const outside = seen.filter((f) => !f.inside);
    expect.deepEqual(outside, [], `Tab moved focus outside the dialog: ${JSON.stringify(outside)}`);
    expect.deepEqual(seen.map((f) => f.text), ["Use this address", "Cancel", "Use this address", "Cancel", "Use this address", "Cancel"], "Tab from the last control wraps to the first");
  },

  "dialog-shift-tab-wraps": async ({ page, open, expect }) => {
    await openDialog(page, open, "default");
    expect.equal((await focused(page)).text, "Cancel", "focus starts on the first control");
    const seen = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Shift+Tab");
      seen.push(await focused(page));
    }
    expect.deepEqual(seen.filter((f) => !f.inside), [], "Shift+Tab keeps focus inside the dialog");
    expect.deepEqual(seen.map((f) => f.text), ["Use this address", "Cancel", "Use this address", "Cancel"], "Shift+Tab from the first control wraps to the last");
  },

  // Not covered here: "when a DropdownMenu inside the dialog is open, the first Escape closes only the menu". No
  // example in the spec holds a menu, and DropdownMenu is being built in parallel.
  "dialog-escape-closes": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["default", "closed", "medium"]) {
      await openDialog(page, open, id);
      await page.keyboard.press("Escape");
      try { await waitClosed(page); } catch { problems.push(`${id}: Escape did not close the dialog`); continue; }
      const e = await events(page, id);
      const want = id === "closed" ? "[true,false]" : "[false]";
      if (JSON.stringify(e.openChange) !== want) problems.push(`${id}: onOpenChange calls were ${JSON.stringify(e.openChange)}, expected ${want}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-outside-press-closes": async ({ page, open, expect }) => {
    for (const width of [1280, 320]) {
      await openDialog(page, open, "default", { width });
      // A press inside the content, on the body text, does not close.
      await clickAt(page, await box(page, BODY));
      await page.waitForTimeout(100);
      expect.equal(await openCount(page), 1, `at ${width}: a press inside the content leaves the dialog open`);
      const p = await outsidePoint(page);
      await page.mouse.click(p.x, p.y, { button: "right" });
      await page.waitForTimeout(100);
      expect.equal(await openCount(page), 1, `at ${width}: a right-click on the overlay leaves the dialog open`);
      await page.keyboard.down("Control");
      await page.mouse.click(p.x, p.y);
      await page.keyboard.up("Control");
      await page.waitForTimeout(100);
      expect.equal(await openCount(page), 1, `at ${width}: a Ctrl+click on the overlay leaves the dialog open`);
      expect.deepEqual((await events(page, "default")).openChange, [], `at ${width}: no onOpenChange call yet`);
      await page.mouse.click(p.x, p.y);
      await waitClosed(page);
      expect.deepEqual((await events(page, "default")).openChange, [false], `at ${width}: a primary press on the overlay closes the dialog and calls onOpenChange(false) once`);
    }
  },

  "dialog-not-dismissible": async ({ page, open, expect }) => {
    // Control: on a dismissible dialog, the same Escape and the same overlay press both close it.
    await openDialog(page, open, "default");
    await page.keyboard.press("Escape");
    await waitClosed(page);
    await openDialog(page, open, "default");
    const p0 = await outsidePoint(page);
    await page.mouse.click(p0.x, p0.y);
    await waitClosed(page);
    const problems = [];
    for (const id of NOT_DISMISSIBLE) {
      for (const width of [1280, 320]) {
        await openDialog(page, open, id, { width });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
        if ((await openCount(page)) !== 1) problems.push(`${id} at ${width}: Escape closed the dialog`);
        const p = await outsidePoint(page);
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(150);
        if ((await openCount(page)) !== 1) problems.push(`${id} at ${width}: a press on the overlay closed the dialog`);
        const e = await events(page, id);
        if (e.openChange.length) problems.push(`${id} at ${width}: onOpenChange was called with ${JSON.stringify(e.openChange)}`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-not-dismissible-has-way-out": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, way] of [["not-dismissible", "Use a different card"], ["worst-case-320", "Go back to my basket"]]) {
      await openDialog(page, open, id, { width: 320, height: 568 });
      // Tab around the dialog once and collect the footer actions reached.
      const reached = new Set();
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        const r = await page.evaluate((footer) => {
          const a = document.activeElement;
          return a && a.closest(footer) ? (a.textContent || "").trim() : null;
        }, FOOTER);
        if (r) reached.add(r);
      }
      if (!reached.size) { problems.push(`${id}: Tab reaches no footer action`); continue; }
      if (!reached.has(way)) { problems.push(`${id}: Tab reaches ${[...reached].join(", ")} but not "${way}"`); continue; }
      const f = await tabUntil(page, (x) => x.text === way);
      if (!f) { problems.push(`${id}: could not put focus on "${way}"`); continue; }
      await page.keyboard.press("Enter");
      try { await waitClosed(page); } catch { problems.push(`${id}: Enter on "${way}" did not close the dialog`); continue; }
      const e = await events(page, id);
      if (JSON.stringify(e.openChange) !== "[false]") problems.push(`${id}: onOpenChange calls were ${JSON.stringify(e.openChange)}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-close-part-closes": async ({ page, open, expect }) => {
    const problems = [];
    for (const how of ["press", "Enter", "Space"]) {
      await openDialog(page, open, "default");
      if (how === "press") await clickAt(page, await footerButton(page, "Cancel").boundingBox());
      else {
        const f = await tabUntil(page, (x) => x.text === "Cancel");
        if (!f) { problems.push(`${how}: Tab never reached Cancel`); continue; }
        await page.keyboard.press(how);
      }
      try { await waitClosed(page); } catch { problems.push(`${how} on the close part did not close the dialog`); continue; }
      const e = await events(page, "default");
      if (JSON.stringify(e.openChange) !== "[false]") problems.push(`${how}: onOpenChange calls were ${JSON.stringify(e.openChange)}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  // The close part cannot be told from other footer buttons by an attribute (Button replaces its data-slot), so
  // it is found by what it does: a visible footer button that closes the dialog when pressed.
  "dialog-visible-close": async ({ page, open, expect }) => {
    const problems = [];
    const dismissible = ALL_EXAMPLES.filter((id) => !NOT_DISMISSIBLE.includes(id));
    for (const id of dismissible) {
      await openDialog(page, open, id, { width: 375, height: 667 });
      const count = await page.locator(`${FOOTER} button`).count();
      let found = null;
      for (let i = 0; i < count && !found; i++) {
        if (i > 0) await openDialog(page, open, id, { width: 375, height: 667 });
        const b = page.locator(`${FOOTER} button`).nth(i);
        const r = await b.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return { text: (el.textContent || "").trim(), visible: el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth };
        });
        if (!r.visible) continue;
        await clickAt(page, await b.boundingBox());
        try { await waitClosed(page); found = r.text; } catch { /* not a close part */ }
      }
      if (!found) problems.push(`${id}: no visible footer button closes the dialog (${count} footer buttons)`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-focus-returns": async ({ page, open, expect }) => {
    const problems = [];
    const onTrigger = () => page.waitForFunction((sel) => document.activeElement === document.querySelector(sel), TRIGGER, { timeout: 3000 }).then(() => true, () => false);
    // Opened by keyboard, closed by Escape.
    await open("closed");
    if (!(await tabUntil(page, (x) => x.text === "Change address"))) problems.push("Tab never reached the trigger");
    await page.keyboard.press("Enter");
    await waitOpen(page);
    await page.keyboard.press("Escape");
    await waitClosed(page);
    if (!(await onTrigger())) problems.push(`after Escape focus is on ${JSON.stringify(await focused(page))}, not the trigger`);
    // Opened by pointer, closed by the close part.
    await open("closed");
    await clickAt(page, await box(page, TRIGGER));
    await waitOpen(page);
    await clickAt(page, await footerButton(page, "Cancel").boundingBox());
    await waitClosed(page);
    if (!(await onTrigger())) problems.push(`after Cancel focus is on ${JSON.stringify(await focused(page))}, not the trigger`);
    // Open on load (defaultOpen), with a trigger.
    await openDialog(page, open, "default");
    await page.keyboard.press("Escape");
    await waitClosed(page);
    if (!(await onTrigger())) problems.push(`default: after Escape focus is on ${JSON.stringify(await focused(page))}, not the trigger`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-focus-returns-without-trigger": async ({ page, open, expect }) => {
    const id = "controlled-without-trigger";
    await openDialog(page, open, id);
    await page.keyboard.press("Escape");
    await waitClosed(page);
    // A control on the page, focused by Tab, as the product's own button would be when it opens the dialog.
    await page.evaluate(() => {
      const b = document.createElement("button");
      b.id = "dialog-test-before";
      b.textContent = "Check session";
      document.querySelector("section[data-example]").appendChild(b);
    });
    const f = await tabUntil(page, (x) => x.id === "dialog-test-before");
    expect.ok(f, "Tab reaches the page's own button");
    await page.evaluate((k) => window.__dialogControl[k].setOpen(true), id);
    await waitOpen(page);
    await page.waitForTimeout(50);
    const inside = await focused(page);
    expect.ok(inside.inside, `focus moved inside on open (it is on ${JSON.stringify(inside)}), so a return is needed`);
    await page.keyboard.press("Escape");
    await waitClosed(page);
    const back = await page.waitForFunction(() => document.activeElement && document.activeElement.id === "dialog-test-before", null, { timeout: 3000 }).then(() => true, () => false);
    expect.ok(back, `on close focus returns to the element that had it when the dialog opened; it is on ${JSON.stringify(await focused(page))}`);
  },

  "dialog-background-inert": async ({ page, open, expect }) => {
    await openDialog(page, open, "not-dismissible");
    // A control and a tall block on the page behind, added after the dialog opened.
    await page.evaluate(() => {
      window.__dialogBehindPresses = 0;
      const b = document.createElement("button");
      b.id = "dialog-test-behind";
      b.textContent = "Behind";
      b.onclick = () => { window.__dialogBehindPresses++; };
      const tall = document.createElement("div");
      tall.style.blockSize = "3000px";
      const s = document.querySelector("section[data-example]");
      s.prepend(b);
      s.appendChild(tall);
    });
    const hidden = await page.evaluate((content) => ({
      page: !!document.querySelector("section[data-example]").closest('[aria-hidden="true"]'),
      content: !!document.querySelector(content).closest('[aria-hidden="true"]'),
    }), CONTENT);
    expect.equal(hidden.page, true, "while open, the page behind sits inside an element with aria-hidden=\"true\"");
    expect.equal(hidden.content, false, "the dialog content itself is not hidden");
    const behind = await box(page, "#dialog-test-behind");
    await clickAt(page, behind);
    expect.equal(await page.evaluate(() => window.__dialogBehindPresses), 0, "a press on a control behind the open dialog does nothing");
    const p = await outsidePoint(page);
    await page.mouse.move(p.x, p.y);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);
    expect.equal(await page.evaluate(() => scrollY), 0, "the wheel over the overlay does not scroll the page behind");
    // Control: once the dialog is closed, the same press and the same wheel do act on the page.
    await clickAt(page, await footerButton(page, "Use a different card").boundingBox());
    await waitClosed(page);
    await page.waitForTimeout(50);
    await clickAt(page, await box(page, "#dialog-test-behind"));
    expect.equal(await page.evaluate(() => window.__dialogBehindPresses), 1, "control: with the dialog closed, the same press counts");
    await page.mouse.move(p.x, p.y);
    await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => scrollY > 0, null, { timeout: 2000 }).catch(() => {});
    expect.ok(await page.evaluate(() => scrollY > 0), "control: with the dialog closed, the same wheel scrolls the page");
  },

  "dialog-overlay-covers-viewport": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, width, height] of [["default", 1280, 800], ["default", 320, 568], ["small", 375, 667]]) {
      await openDialog(page, open, id, { width, height });
      await page.evaluate(() => {
        const tall = document.createElement("div");
        tall.style.blockSize = "3000px";
        document.querySelector("section[data-example]").appendChild(tall);
        window.scrollTo(0, 400);
      });
      await page.waitForTimeout(50);
      const r = await page.evaluate(({ overlay, content }) => {
        const o = document.querySelector(overlay).getBoundingClientRect();
        const c = document.querySelector(content).getBoundingClientRect();
        return { o: [o.left, o.top, o.right, o.bottom], c: [c.left, c.top, c.right, c.bottom], vw: document.documentElement.clientWidth, vh: innerHeight, position: getComputedStyle(document.querySelector(overlay)).position };
      }, { overlay: OVERLAY, content: CONTENT });
      const at = `${id} at ${width} by ${height}`;
      const near = (a, b) => Math.abs(a - b) <= 0.5;
      if (r.position !== "fixed") problems.push(`${at}: the overlay's position is ${r.position}, needs fixed`);
      if (!(near(r.o[0], 0) && near(r.o[1], 0) && near(r.o[2], r.vw) && near(r.o[3], r.vh))) problems.push(`${at}: the overlay covers ${r.o.join(", ")}; the viewport is 0, 0, ${r.vw}, ${r.vh}`);
      const cx = (r.c[0] + r.c[2]) / 2, cy = (r.c[1] + r.c[3]) / 2;
      if (Math.abs(cx - r.vw / 2) > 1 || Math.abs(cy - r.vh / 2) > 1) problems.push(`${at}: the content's centre is ${cx}, ${cy}; the viewport's is ${r.vw / 2}, ${r.vh / 2}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-fits-320": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["default", "small", "medium", "worst-case-320"]) {
      await openDialog(page, open, id, { width: 320, height: 568 });
      const r = await page.evaluate((content) => {
        const c = document.querySelector(content).getBoundingClientRect();
        const de = document.documentElement;
        return { left: c.left, right: c.right, width: c.width, vw: de.clientWidth, sw: de.scrollWidth };
      }, CONTENT);
      const want = r.vw - 32;
      if (Math.abs(r.width - want) > 0.5) problems.push(`${id}: the content is ${r.width} px wide; needs ${want} (viewport ${r.vw} less 16 each side)`);
      if (Math.abs(r.left - 16) > 0.5 || Math.abs(r.vw - r.right - 16) > 0.5) problems.push(`${id}: the content runs from ${r.left} to ${r.right}; needs 16 to ${r.vw - 16}`);
      if (r.sw > r.vw) problems.push(`${id}: the page scrolls sideways (${r.sw} px in ${r.vw})`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-body-scrolls": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, width, height] of [["worst-case-320", 320, 568], ["long-text", 375, 667], ["long-text", 1280, 800], ["title-focus", 320, 568]]) {
      await openDialog(page, open, id, { width, height });
      const measure = () => page.evaluate(({ overlay, content, header, body, footer }) => {
        const q = (s) => document.querySelector(s);
        const r = (s) => { const b = q(s).getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
        const scrolls = (s) => { const e = q(s); return e.scrollHeight > e.clientHeight + 1; };
        return {
          vh: innerHeight, content: r(content), header: r(header), body: r(body), footer: r(footer),
          bodyScrolls: scrolls(body), bodyOverflow: getComputedStyle(q(body)).overflowY,
          contentScrolls: scrolls(content), overlayScrolls: scrolls(overlay), headerScrolls: scrolls(header), footerScrolls: scrolls(footer),
          scrollTop: q(body).scrollTop,
        };
      }, { overlay: OVERLAY, content: CONTENT, header: HEADER, body: BODY, footer: FOOTER });
      const a = await measure();
      await page.locator(BODY).evaluate((el) => { el.scrollTop = 200; });
      const b = await measure();
      const at = `${id} at ${width} by ${height}`;
      if (!a.bodyScrolls) problems.push(`${at}: the body does not scroll (header ${a.header.height}, body ${a.body.height}, footer ${a.footer.height} px), so this case proves nothing`);
      if (a.contentScrolls || a.overlayScrolls || a.headerScrolls || a.footerScrolls) problems.push(`${at}: a part other than the body scrolls (content ${a.contentScrolls}, overlay ${a.overlayScrolls}, header ${a.headerScrolls}, footer ${a.footerScrolls})`);
      if (a.content.top < 16 - 0.5 || a.content.bottom > a.vh - 16 + 0.5) problems.push(`${at}: the content runs from ${a.content.top} to ${a.content.bottom}; it must stay within 16 and ${a.vh - 16}`);
      if (a.header.top < 0 || a.header.bottom > a.vh) problems.push(`${at}: the header (${a.header.top} to ${a.header.bottom}) is not fully visible`);
      if (a.footer.top < 0 || a.footer.bottom > a.vh) problems.push(`${at}: the footer (${a.footer.top} to ${a.footer.bottom}) is not fully visible; header ${a.header.height} + footer ${a.footer.height} px in a ${a.vh - 32} px box`);
      if (a.body.height <= 0) problems.push(`${at}: the body has no height left (header ${a.header.height}, footer ${a.footer.height} px, box ${a.vh - 32} px)`);
      if (!(b.scrollTop > 0)) problems.push(`${at}: setting the body's scrollTop did not move it`);
      if (Math.abs(b.header.top - a.header.top) > 0.5 || Math.abs(b.footer.top - a.footer.top) > 0.5) problems.push(`${at}: scrolling the body moved the header or the footer`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-footer-wraps": async ({ page, open, expect }) => {
    const problems = [];
    const measure = () => page.evaluate(({ footer, content }) => {
      const f = document.querySelector(footer), c = document.querySelector(content);
      const cs = getComputedStyle(f);
      const fr = f.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const inner = { left: fr.left + parseFloat(cs.paddingLeft), right: fr.right - parseFloat(cs.paddingRight) };
      const buttons = [...f.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return { text: (b.textContent || "").trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom, clipped: b.scrollWidth > b.clientWidth + 1 }; });
      return { inner, footer: { top: fr.top, bottom: fr.bottom }, content: { left: cr.left, right: cr.right, bottom: cr.bottom }, buttons };
    }, { footer: FOOTER, content: CONTENT });
    const check = (m, at) => {
      for (const b of m.buttons) {
        if (b.left < m.inner.left - 0.5 || b.right > m.inner.right + 0.5) problems.push(`${at}: "${b.text}" runs from ${b.left} to ${b.right}, outside the footer's inner box ${m.inner.left} to ${m.inner.right}`);
        if (b.bottom > m.footer.bottom + 0.5 || b.top < m.footer.top - 0.5) problems.push(`${at}: "${b.text}" leaves the footer vertically`);
        if (b.clipped) problems.push(`${at}: "${b.text}" is cut off`);
      }
      if (m.footer.bottom > m.content.bottom + 0.5) problems.push(`${at}: the footer is pushed outside the content`);
    };
    // Fits: one row, aligned to the end.
    await openDialog(page, open, "default", { width: 1280 });
    const one = await measure();
    check(one, "default at 1280");
    if (new Set(one.buttons.map((b) => Math.round(b.top))).size !== 1) problems.push(`default at 1280: the actions are not on one row (tops ${one.buttons.map((b) => b.top).join(", ")})`);
    const last = one.buttons[one.buttons.length - 1];
    if (Math.abs(last.right - one.inner.right) > 0.5) problems.push(`default at 1280: the last action ends at ${last.right}, not at the footer's inner end ${one.inner.right}`);
    if (!(one.buttons[0].left > one.inner.left + 1)) problems.push("default at 1280: the actions start at the footer's start edge, so they are not aligned to the end");
    // Does not fit: wraps onto further rows.
    for (const width of [320, 375]) {
      await openDialog(page, open, "worst-case-320", { width, height: 568 });
      const m = await measure();
      check(m, `worst-case-320 at ${width}`);
      if (new Set(m.buttons.map((b) => Math.round(b.top))).size < 2) problems.push(`worst-case-320 at ${width}: the actions do not wrap (tops ${m.buttons.map((b) => b.top).join(", ")})`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-text-wraps": async ({ page, open, expect }) => {
    const problems = [];
    const LONG_WORD = "Versandkostenübernahmebedingungsänderungsbenachrichtigung";
    for (const [id, width] of [["long-text", 320], ["long-text", 375], ["worst-case-320", 320]]) {
      await openDialog(page, open, id, { width, height: 568 });
      // A long word, put into the title and the description, must break rather than overflow.
      await page.evaluate(({ title, description, word }) => {
        for (const s of [title, description]) document.querySelector(s).append(` ${word}`);
      }, { title: TITLE, description: DESCRIPTION, word: LONG_WORD });
      const m = await page.evaluate(({ title, description, header }) => {
        const h = document.querySelector(header);
        const hcs = getComputedStyle(h);
        const hr = h.getBoundingClientRect();
        const inner = { left: hr.left + parseFloat(hcs.paddingLeft), right: hr.right - parseFloat(hcs.paddingRight) };
        return [title, description].map((sel) => {
          const el = document.querySelector(sel);
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()];
          const lines = new Set(rects.map((r) => Math.round(r.top))).size;
          const right = Math.max(...rects.map((r) => r.right));
          let clipped = null;
          for (let e = el; e && !e.matches('[data-slot="dialog-content"]'); e = e.parentElement) {
            const o = getComputedStyle(e);
            if ([o.overflowX, o.overflowY].some((v) => v !== "visible") || o.textOverflow === "ellipsis" || o.webkitLineClamp !== "none") { clipped = e.getAttribute("data-slot") || e.tagName; break; }
          }
          return { sel, lines, right, inner, clipped, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
        });
      }, { title: TITLE, description: DESCRIPTION, header: HEADER });
      for (const t of m) {
        const at = `${id} at ${width}, ${t.sel}`;
        if (t.lines < 2) problems.push(`${at}: does not wrap (${t.lines} line)`);
        if (t.right > t.inner.right + 0.5) problems.push(`${at}: text reaches ${t.right}, past the header's inner edge ${t.inner.right}`);
        if (t.scrollWidth > t.clientWidth + 1) problems.push(`${at}: overflows (${t.scrollWidth} px in ${t.clientWidth})`);
        if (t.clipped) problems.push(`${at}: ${t.clipped} clips or truncates it`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-text-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const theme of ["light", "dark"]) {
      for (const id of ["default", "no-description", "worst-case-320"]) {
        await openDialog(page, open, id, { theme });
        await page.evaluate(inPageColour);
        const r = await page.evaluate(({ content, parts }) => {
          const C = window.__dialogColour;
          const c = document.querySelector(content);
          const fill = C.backgroundOf(c);
          return parts.map((sel) => {
            const el = c.querySelector(sel);
            if (!el) return null;
            const ink = C.over(C.parse(getComputedStyle(el).color), C.backgroundOf(el));
            return { sel, ratio: C.ratio(ink, fill), ink: C.hex(ink), fill: C.hex(fill) };
          }).filter(Boolean);
        }, { content: CONTENT, parts: [TITLE, DESCRIPTION, BODY] });
        for (const x of r) {
          measured++;
          if (x.ratio < 4.5) problems.push(`${id} ${theme} ${x.sel}: ${x.ink} on ${x.fill} is ${Math.floor(x.ratio * 100) / 100} to 1, needs 4.5`);
        }
      }
    }
    expect.ok(measured >= 16, `measured ${measured} text and fill pairs`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dialog-reduced-motion": async ({ page, open, expect }) => {
    await openDialog(page, open, "default");
    // The runner turns every transition off on load; undo that, so the dialog's own durations are measured.
    await page.evaluate(() => {
      for (const s of document.querySelectorAll("style")) if ((s.textContent || "").includes("transition: none !important")) s.remove();
    });
    const durations = () => page.evaluate(({ overlay, content }) => [overlay, content].map((sel) => {
      const cs = getComputedStyle(document.querySelector(sel));
      return { sel, transition: cs.transitionDuration, animation: cs.animationName };
    }), { overlay: OVERLAY, content: CONTENT });
    const normal = await durations();
    for (const d of normal) expect.ok(d.transition.split(",").some((v) => parseFloat(v) > 0), `control: without reduced motion ${d.sel} has a transition (${d.transition})`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await durations();
    for (const d of reduced) {
      expect.ok(d.transition.split(",").every((v) => parseFloat(v) === 0), `with reduced motion ${d.sel} has transition-duration ${d.transition}, needs 0s`);
      expect.equal(d.animation, "none", `with reduced motion ${d.sel} runs no animation`);
    }
    // Leaving: with reduced motion the content is gone at once.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(30);
    expect.equal(await page.locator(CONTENT).count(), 0, "with reduced motion the content leaves without a transition");
  },
};
