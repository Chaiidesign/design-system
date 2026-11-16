// Tabs tests: one entry per requirement in ds-components/specs/tabs.spec.json whose check is test:<id>.
// Run by v2/tools/test-components.mjs (node v2/tools/test-components.mjs --component tabs), which calls each entry
// with { page, open, expect }: a fresh Playwright page, open(exampleId, { theme, width, density }) that loads one
// gallery example and waits for it, and node:assert/strict. Each test has 30 seconds.
//
// Selections are observed through window.__tabsEvents[<example id>].valueChange, which every example in
// tabs.examples.tsx appends to from onValueChange, and through aria-selected. Focus is always reached with real Tab
// and arrow key presses, so :focus-visible holds as it would for a keyboard user. Radix moves focus for an arrow key
// in a setTimeout, so every key press waits for focus to settle before anything is read. Every "nothing happened"
// test first proves the same press does something on a live example, so it cannot pass by measuring nothing.

const ROOT = '[data-slot="tabs"]';
const LIST = '[data-slot="tabs-list"]';
const TAB = '[data-slot="tabs-trigger"]';
const LABEL = '[data-slot="tabs-trigger-label"]';
const PANEL = '[data-slot="tabs-content"]';
const INDICATOR = '[data-slot="tabs-indicator"]';
const ALL_EXAMPLES = ["line", "pill", "fill", "with-icons", "small", "small-pill", "vertical", "vertical-pill", "disabled-tab", "manual", "rtl", "controlled", "long-labels", "worst-case-320"];
const VARIANT_EXAMPLES = ["line", "pill", "small", "small-pill", "vertical", "vertical-pill", "with-icons", "disabled-tab"];

// ---------------------------------------------------------------- helpers

// What the page shows now: the focused tab's label (or what else has focus), the selected labels, the log.
const read = (page, id) =>
  page.evaluate(({ TAB, LABEL, id }) => {
    const label = (t) => t.querySelector(LABEL).textContent;
    const a = document.activeElement;
    const tab = a && a.matches(TAB) ? a : null;
    const selected = [...document.querySelectorAll(TAB)].filter((t) => t.getAttribute("aria-selected") === "true").map(label);
    const log = (window.__tabsEvents && window.__tabsEvents[id] && window.__tabsEvents[id].valueChange) || [];
    const focus = tab ? label(tab) : a && a !== document.body ? `${a.tagName.toLowerCase()}${a.getAttribute("data-slot") ? `[${a.getAttribute("data-slot")}]` : a.id ? `#${a.id}` : ""}` : "nothing";
    return { focus, selected, log: [...log] };
  }, { TAB, LABEL, id });

const focusedLabel = (page) =>
  page.evaluate(({ TAB, LABEL }) => {
    const a = document.activeElement;
    return a && a.matches(TAB) ? a.querySelector(LABEL).textContent : null;
  }, { TAB, LABEL });

// Presses a key, then waits (up to a second) for focus to land on the tab labelled `want`. Returns what has focus.
async function press(page, key, want) {
  await page.keyboard.press(key);
  if (want === undefined) {
    await page.waitForTimeout(120);
  } else {
    await page
      .waitForFunction(({ TAB, LABEL, want }) => {
        const a = document.activeElement;
        return !!a && a.matches(TAB) && a.querySelector(LABEL).textContent === want;
      }, { TAB, LABEL, want }, { timeout: 1000 })
      .catch(() => {});
    await page.waitForTimeout(30);
  }
  return focusedLabel(page);
}

// Presses Tab from the top of the page until a tab has focus. Returns its label, or null.
async function tabIntoList(page) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const l = await focusedLabel(page);
    if (l !== null) return l;
  }
  return null;
}

// Puts a focusable button before the example (and one after it), so "the element before the list" exists.
async function addSentinels(page) {
  await page.evaluate(() => {
    const section = document.querySelector("section[data-example]");
    const before = document.createElement("button");
    before.id = "sentinel-before";
    before.textContent = "Before";
    section.before(before);
    const after = document.createElement("button");
    after.id = "sentinel-after";
    after.textContent = "After";
    section.after(after);
  });
}
// Tab presses from the top of the page until the sentinel before the list has focus.
async function focusSentinel(page) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement && document.activeElement.id === "sentinel-before")) return true;
  }
  return false;
}

async function clickCentre(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("the element has no box to click");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
const tabByLabel = (page, label) => page.locator(TAB).filter({ has: page.locator(LABEL, { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) });

// The accessible tree as Chromium builds it: role and name of every node that is not ignored.
async function axNodes(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: n.role && n.role.value, name: n.name ? n.name.value : "" }));
}

async function touch(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return cdp;
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
  window.__tabsColour = { parse, over, ratio, hex, backgroundOf };
}

// The list's visible box (its padding box, where scrolling clips) and the box of every tab, in viewport pixels.
const boxes = (page) =>
  page.evaluate(({ LIST, TAB, LABEL }) => {
    const list = document.querySelector(LIST);
    const l = list.getBoundingClientRect();
    const clip = { left: l.left + list.clientLeft, top: l.top + list.clientTop, right: l.left + list.clientLeft + list.clientWidth, bottom: l.top + list.clientTop + list.clientHeight };
    const tabs = [...document.querySelectorAll(TAB)].map((t) => {
      const r = t.getBoundingClientRect();
      return { label: t.querySelector(LABEL).textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, selected: t.getAttribute("aria-selected") === "true" };
    });
    return { clip, tabs, scrollLeft: list.scrollLeft, scrollWidth: list.scrollWidth, clientWidth: list.clientWidth };
  }, { LIST, TAB, LABEL });
const inside = (r, c, margin = 0) => r.left >= c.left + margin - 0.5 && r.right <= c.right - margin + 0.5 && r.top >= c.top + margin - 0.5 && r.bottom <= c.bottom - margin + 0.5;
const fmt = (r) => `${Math.round(r.left)} to ${Math.round(r.right)} by ${Math.round(r.top)} to ${Math.round(r.bottom)}`;

// Walks a list with one key and reports each landing, so a failure message shows the whole path.
async function walk(page, key, wants) {
  const got = [];
  for (const want of wants) got.push(await press(page, key, want));
  return got;
}

// ---------------------------------------------------------------- tests

export const tests = {
  "tabs-roles": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ALL_EXAMPLES) {
      await open(id);
      const r = await page.evaluate(({ LIST, TAB, PANEL }) => ({
        listRole: document.querySelector(LIST).getAttribute("role"),
        tabs: [...document.querySelectorAll(TAB)].map((t) => ({ tag: t.tagName, role: t.getAttribute("role"), link: !!t.closest("a") || !!t.querySelector("a[href]") })),
        panels: [...document.querySelectorAll(PANEL)].map((p) => p.getAttribute("role")),
      }), { LIST, TAB, PANEL });
      if (r.listRole !== "tablist") problems.push(`${id}: the list has role ${r.listRole}`);
      if (!r.tabs.length) problems.push(`${id}: no tabs rendered`);
      r.tabs.forEach((t, i) => {
        if (t.tag !== "BUTTON") problems.push(`${id}: tab ${i + 1} is a ${t.tag}, not a BUTTON`);
        if (t.role !== "tab") problems.push(`${id}: tab ${i + 1} has role ${t.role}`);
        if (t.link) problems.push(`${id}: tab ${i + 1} is or holds a link`);
      });
      r.panels.forEach((p, i) => { if (p !== "tabpanel") problems.push(`${id}: panel ${i + 1} has role ${p}`); });
    }
    // Chromium's own accessible tree: each tab is named by its label alone (no icon, no reserved-width copy).
    for (const [id, labels] of [["line", ["Details", "Reviews (124)", "Delivery"]], ["with-icons", ["Delivery", "Collection"]], ["worst-case-320", ["Details", "Reviews (1,284)", "Size guide", "Delivery", "Returns", "Questions and answers"]]]) {
      await open(id);
      const names = (await axNodes(page)).filter((n) => n.role === "tab").map((n) => n.name);
      if (JSON.stringify(names) !== JSON.stringify(labels)) problems.push(`${id}: the accessible tree names the tabs ${JSON.stringify(names)}, expected ${JSON.stringify(labels)}`);
      if (!(await axNodes(page)).some((n) => n.role === "tablist")) problems.push(`${id}: no tablist in the accessible tree`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-one-selected": async ({ page, open, expect }) => {
    const problems = [];
    const check = async (id, when) => {
      const s = await read(page, id);
      if (s.selected.length !== 1) problems.push(`${id} ${when}: ${s.selected.length} tabs have aria-selected="true" (${s.selected.join(", ")})`);
      return s;
    };
    for (const id of ALL_EXAMPLES) {
      await open(id);
      await check(id, "on load");
      const count = await page.locator(TAB).count();
      for (let i = 0; i < count; i++) {
        await clickCentre(page, page.locator(TAB).nth(i));
        await page.waitForTimeout(20);
        await check(id, `after a press on tab ${i + 1}`);
      }
      if ((await tabIntoList(page)) !== null) {
        for (const key of ["ArrowRight", "ArrowDown", "End", "Home", "ArrowLeft", "ArrowUp"]) { await press(page, key); await check(id, `after ${key}`); }
      }
    }
    // Controlled: the parent's state decides; a press changes it through onValueChange.
    await open("controlled");
    const before = await read(page, "controlled");
    await clickCentre(page, tabByLabel(page, "Details"));
    const after = await read(page, "controlled");
    if (JSON.stringify(before.selected) !== JSON.stringify(["Reviews (124)"])) problems.push(`controlled starts with ${JSON.stringify(before.selected)} selected, expected Reviews (124)`);
    if (JSON.stringify(after.selected) !== JSON.stringify(["Details"]) || JSON.stringify(after.log) !== JSON.stringify(["details"])) problems.push(`controlled after a press on Details: selected ${JSON.stringify(after.selected)}, log ${JSON.stringify(after.log)}`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-wiring": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ALL_EXAMPLES) {
      await open(id);
      const r = await page.evaluate(({ TAB, PANEL }) => {
        const out = [];
        const tabs = [...document.querySelectorAll(TAB)];
        const panels = [...document.querySelectorAll(PANEL)];
        if (tabs.length !== panels.length) out.push(`${tabs.length} tabs but ${panels.length} panels`);
        const used = new Set();
        for (const t of tabs) {
          const c = t.getAttribute("aria-controls");
          const p = c && document.getElementById(c);
          if (!t.id) { out.push("a tab has no id"); continue; }
          if (!p) { out.push(`tab #${t.id} controls "${c}", which is not an element`); continue; }
          if (!p.matches(PANEL)) out.push(`tab #${t.id} controls #${c}, which is not a panel`);
          if (p.getAttribute("aria-labelledby") !== t.id) out.push(`panel #${c} is labelled by "${p.getAttribute("aria-labelledby")}", not its tab #${t.id}`);
          if (used.has(c)) out.push(`two tabs control #${c}`);
          used.add(c);
        }
        return out;
      }, { TAB, PANEL });
      for (const p of r) problems.push(`${id}: ${p}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-hidden-panels": async ({ page, open, expect }) => {
    const problems = [];
    const look = async (id, shown) => {
      const r = await page.evaluate(({ PANEL }) => [...document.querySelectorAll(PANEL)].map((p) => ({ text: p.textContent, hidden: p.hasAttribute("hidden"), visible: p.checkVisibility(), selected: p.getAttribute("data-state") === "active" })), { PANEL });
      const ax = (await axNodes(page)).filter((n) => n.role === "tabpanel");
      const open_ = r.filter((p) => !p.hidden);
      if (open_.length !== 1 || open_[0].text !== shown) problems.push(`${id}: the panels without hidden are ${JSON.stringify(open_.map((p) => p.text))}, expected only "${shown}"`);
      for (const p of r.filter((p) => !p.selected)) {
        if (!p.hidden) problems.push(`${id}: a panel of a tab that is not selected has no hidden attribute`);
        if (p.visible) problems.push(`${id}: a panel of a tab that is not selected is visible`);
        if (p.text !== "") problems.push(`${id}: a hidden panel still renders "${p.text}"`);
      }
      if (ax.length !== 1) problems.push(`${id}: ${ax.length} tabpanels in the accessible tree, expected 1`);
    };
    await open("line");
    await look("line", "Organic cotton, relaxed fit.");
    await clickCentre(page, tabByLabel(page, "Reviews (124)"));
    await look("line after selecting Reviews", "Average rating 4.6 out of 5.");
    await open("worst-case-320", { width: 320 });
    await look("worst-case-320", "12 questions.");
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-icons-hidden": async ({ page, open, expect }) => {
    await open("with-icons");
    const r = await page.evaluate(() => ({
      icons: [...document.querySelectorAll('[data-slot="tabs-trigger-icon-start"], [data-slot="tabs-trigger-icon-end"]')].map((e) => ({ slot: e.getAttribute("data-slot"), hidden: e.getAttribute("aria-hidden"), svg: !!e.querySelector("svg") })),
    }));
    expect.equal(r.icons.length, 2, `with-icons renders ${r.icons.length} icon parts; expected one iconStart in each of the 2 tabs`);
    for (const i of r.icons) {
      expect.equal(i.hidden, "true", `${i.slot} carries aria-hidden="true"`);
      expect.ok(i.svg, `${i.slot} holds the icon`);
    }
    const names = (await axNodes(page)).filter((n) => n.role === "tab").map((n) => n.name);
    expect.deepEqual(names, ["Delivery", "Collection"], `each tab is named by its label alone; the accessible tree says ${JSON.stringify(names)}`);
  },

  "tabs-tab-enters-selected": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, want] of [["long-labels", "Washing and care instructions"], ["vertical-pill", "Addresses"], ["small-pill", "Open"], ["worst-case-320", "Questions and answers"], ["line", "Details"]]) {
      await open(id);
      await addSentinels(page);
      if (!(await focusSentinel(page))) { problems.push(`${id}: Tab never reached the button before the list`); continue; }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(30);
      const s = await read(page, id);
      if (s.focus !== want) problems.push(`${id}: Tab from the element before the list lands on "${s.focus}", expected the selected tab "${want}"`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-tab-to-panel": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, text] of [["line", "Organic cotton, relaxed fit."], ["long-labels", "Wash at 30 degrees."], ["vertical", "Name and email."]]) {
      await open(id);
      const l = await tabIntoList(page);
      if (l === null) { problems.push(`${id}: Tab never reached a tab`); continue; }
      await page.keyboard.press("Tab");
      const r = await page.evaluate(({ PANEL }) => {
        const a = document.activeElement;
        return { isPanel: !!a && a.matches(PANEL), text: a ? a.textContent : "", tabIndex: a ? a.getAttribute("tabindex") : null, hidden: a ? a.hasAttribute("hidden") : null, visible: !!a && a.matches(":focus-visible") };
      }, { PANEL });
      if (!r.isPanel) problems.push(`${id}: Tab from the selected tab does not reach a panel`);
      else {
        if (r.text !== text) problems.push(`${id}: Tab reached the panel "${r.text}", expected the shown one "${text}"`);
        if (r.tabIndex !== "0") problems.push(`${id}: the shown panel has tabindex ${r.tabIndex}`);
        if (r.hidden) problems.push(`${id}: the focused panel is hidden`);
        if (!r.visible) problems.push(`${id}: the focused panel does not match :focus-visible`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-shift-tab-leaves-list": async ({ page, open, expect }) => {
    const problems = [];
    // From the selected tab, and from a tab reached by an arrow key (in manual mode it is not the selected one).
    for (const [id, arrows, wantFocus] of [["line", 0, "Details"], ["line", 1, "Reviews (124)"], ["manual", 1, "Older"], ["worst-case-320", 2, "Reviews (1,284)"]]) {
      await open(id, { width: 320 });
      await addSentinels(page);
      if (!(await focusSentinel(page))) { problems.push(`${id}: Tab never reached the button before the list`); continue; }
      await page.keyboard.press("Tab");
      await page.waitForTimeout(30);
      for (let i = 0; i < arrows; i++) await press(page, id === "worst-case-320" && i === 0 ? "Home" : "ArrowRight", i === arrows - 1 ? wantFocus : undefined);
      const from = await focusedLabel(page);
      if (from !== wantFocus) { problems.push(`${id}: focus is on "${from}" before Shift+Tab, expected "${wantFocus}"`); continue; }
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(30);
      const to = await page.evaluate(() => (document.activeElement ? document.activeElement.id || document.activeElement.getAttribute("data-slot") || document.activeElement.tagName : null));
      if (to !== "sentinel-before") problems.push(`${id}: Shift+Tab from "${from}" moves focus to ${to}, expected the element before the list`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-arrow-right-next": async ({ page, open, expect }) => {
    const problems = [];
    await open("line");
    expect.equal(await tabIntoList(page), "Details", "Tab enters the line example on Details");
    const path = await walk(page, "ArrowRight", ["Reviews (124)", "Delivery", "Details"]);
    if (JSON.stringify(path) !== JSON.stringify(["Reviews (124)", "Delivery", "Details"])) problems.push(`line: ArrowRight goes ${JSON.stringify(path)}, expected Reviews (124), Delivery, then Details (wrapping)`);
    const s = await read(page, "line");
    if (JSON.stringify(s.log) !== JSON.stringify(["reviews", "delivery", "details"])) problems.push(`line: automatic activation selected ${JSON.stringify(s.log)}`);
    // Horizontal: ArrowDown and ArrowUp do nothing. The control above proved arrows move here.
    for (const key of ["ArrowDown", "ArrowUp"]) {
      const before = await read(page, "line");
      await press(page, key);
      const after = await read(page, "line");
      if (after.focus !== before.focus || JSON.stringify(after.selected) !== JSON.stringify(before.selected)) problems.push(`line: ${key} moved focus from "${before.focus}" to "${after.focus}"`);
    }
    await open("disabled-tab");
    await tabIntoList(page);
    const skip = await walk(page, "ArrowRight", ["Delivery", "Details"]);
    if (JSON.stringify(skip) !== JSON.stringify(["Delivery", "Details"])) problems.push(`disabled-tab: ArrowRight goes ${JSON.stringify(skip)}, expected Delivery (skipping Size guide), then Details`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-arrow-left-previous": async ({ page, open, expect }) => {
    const problems = [];
    await open("line");
    expect.equal(await tabIntoList(page), "Details", "Tab enters the line example on Details");
    const path = await walk(page, "ArrowLeft", ["Delivery", "Reviews (124)", "Details"]);
    if (JSON.stringify(path) !== JSON.stringify(["Delivery", "Reviews (124)", "Details"])) problems.push(`line: ArrowLeft goes ${JSON.stringify(path)}, expected Delivery (wrapping), Reviews (124), Details`);
    await open("disabled-tab");
    await tabIntoList(page);
    const skip = await walk(page, "ArrowLeft", ["Delivery", "Details"]);
    if (JSON.stringify(skip) !== JSON.stringify(["Delivery", "Details"])) problems.push(`disabled-tab: ArrowLeft goes ${JSON.stringify(skip)}, expected Delivery (wrapping), then Details (skipping Size guide)`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-arrow-down-next-vertical": async ({ page, open, expect }) => {
    const problems = [];
    await open("vertical");
    expect.equal(await tabIntoList(page), "Profile", "Tab enters the vertical example on Profile");
    const path = await walk(page, "ArrowDown", ["Addresses", "Payments", "Profile"]);
    if (JSON.stringify(path) !== JSON.stringify(["Addresses", "Payments", "Profile"])) problems.push(`vertical: ArrowDown goes ${JSON.stringify(path)}, expected Addresses, Payments, Profile (wrapping)`);
    for (const key of ["ArrowRight", "ArrowLeft"]) {
      const before = await read(page, "vertical");
      await press(page, key);
      const after = await read(page, "vertical");
      if (after.focus !== before.focus || JSON.stringify(after.selected) !== JSON.stringify(before.selected)) problems.push(`vertical: ${key} moved focus from "${before.focus}" to "${after.focus}"`);
    }
    await open("vertical-pill");
    expect.equal(await tabIntoList(page), "Addresses", "Tab enters vertical-pill on Addresses");
    const p2 = await walk(page, "ArrowDown", ["Payments", "Profile"]);
    if (JSON.stringify(p2) !== JSON.stringify(["Payments", "Profile"])) problems.push(`vertical-pill: ArrowDown goes ${JSON.stringify(p2)}, expected Payments, Profile (wrapping)`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-arrow-up-previous-vertical": async ({ page, open, expect }) => {
    const problems = [];
    await open("vertical");
    expect.equal(await tabIntoList(page), "Profile", "Tab enters the vertical example on Profile");
    const path = await walk(page, "ArrowUp", ["Payments", "Addresses", "Profile"]);
    if (JSON.stringify(path) !== JSON.stringify(["Payments", "Addresses", "Profile"])) problems.push(`vertical: ArrowUp goes ${JSON.stringify(path)}, expected Payments (wrapping), Addresses, Profile`);
    const s = await read(page, "vertical");
    if (JSON.stringify(s.selected) !== JSON.stringify(["Profile"])) problems.push(`vertical: after the walk ${JSON.stringify(s.selected)} is selected, expected Profile (automatic activation)`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-home-first": async ({ page, open, expect }) => {
    const problems = [];
    await open("worst-case-320", { width: 320 });
    expect.equal(await tabIntoList(page), "Questions and answers", "Tab enters worst-case-320 on the selected last tab");
    const got = await press(page, "Home", "Details");
    if (got !== "Details") problems.push(`worst-case-320: Home moves focus to "${got}", expected Details`);
    await open("line");
    await tabIntoList(page);
    await press(page, "ArrowLeft", "Delivery");
    const got2 = await press(page, "Home", "Details");
    if (got2 !== "Details") problems.push(`line: Home from Delivery moves focus to "${got2}", expected Details`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-end-last": async ({ page, open, expect }) => {
    const problems = [];
    await open("line");
    expect.equal(await tabIntoList(page), "Details", "Tab enters line on Details");
    const got = await press(page, "End", "Delivery");
    if (got !== "Delivery") problems.push(`line: End moves focus to "${got}", expected Delivery`);
    await open("worst-case-320", { width: 320 });
    await tabIntoList(page);
    await press(page, "Home", "Details");
    const got2 = await press(page, "End", "Questions and answers");
    if (got2 !== "Questions and answers") problems.push(`worst-case-320: End moves focus to "${got2}", expected Questions and answers`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-page-up-first": async ({ page, open, expect }) => {
    await open("worst-case-320", { width: 320 });
    expect.equal(await tabIntoList(page), "Questions and answers", "Tab enters worst-case-320 on the selected last tab");
    expect.equal(await press(page, "PageUp", "Details"), "Details", "PageUp moves focus to the first tab");
  },

  "tabs-page-down-last": async ({ page, open, expect }) => {
    await open("line");
    expect.equal(await tabIntoList(page), "Details", "Tab enters line on Details");
    expect.equal(await press(page, "PageDown", "Delivery"), "Delivery", "PageDown moves focus to the last tab");
  },

  "tabs-rtl-arrows": async ({ page, open, expect }) => {
    const problems = [];
    await open("rtl");
    const geo = await boxes(page);
    const [first, second] = geo.tabs;
    if (!(second.right <= first.left + 0.5)) problems.push(`in rtl the second tab (${fmt(second)}) is not to the left of the first (${fmt(first)})`);
    expect.equal(await tabIntoList(page), "التفاصيل", "Tab enters the rtl example on its first tab");
    const left = await press(page, "ArrowLeft", "المراجعات");
    if (left !== "المراجعات") problems.push(`rtl: ArrowLeft from the first tab moves focus to "${left}", expected the next tab المراجعات`);
    const right = await press(page, "ArrowRight", "التفاصيل");
    if (right !== "التفاصيل") problems.push(`rtl: ArrowRight from the second tab moves focus to "${right}", expected the previous tab التفاصيل`);
    const wrap = await press(page, "ArrowRight", "المراجعات");
    if (wrap !== "المراجعات") problems.push(`rtl: ArrowRight from the first tab moves focus to "${wrap}", expected a wrap to the last tab`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-enter-selects-manual": async ({ page, open, expect }) => {
    // Control: with automatic activation an arrow key selects, so the manual check below measures something.
    await open("line");
    await tabIntoList(page);
    await press(page, "ArrowRight", "Reviews (124)");
    expect.deepEqual((await read(page, "line")).selected, ["Reviews (124)"], "control: in the automatic line example ArrowRight selects Reviews (124)");
    await open("manual");
    expect.equal(await tabIntoList(page), "Recent", "Tab enters manual on Recent");
    const moved = await press(page, "ArrowRight", "Older");
    const s1 = await read(page, "manual");
    expect.equal(moved, "Older", "ArrowRight moves focus to Older");
    expect.deepEqual(s1.selected, ["Recent"], `with manual activation ArrowRight leaves Recent selected; ${JSON.stringify(s1.selected)} is`);
    expect.deepEqual(s1.log, [], `with manual activation ArrowRight selects nothing; onValueChange got ${JSON.stringify(s1.log)}`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    const s2 = await read(page, "manual");
    expect.deepEqual(s2.selected, ["Older"], `Enter selects the focused tab Older; ${JSON.stringify(s2.selected)} is selected`);
    expect.deepEqual(s2.log, ["older"], `Enter calls onValueChange once with older; got ${JSON.stringify(s2.log)}`);
    expect.equal(s2.focus, "Older", "focus stays on the tab after Enter");
    const shown = await page.evaluate((PANEL) => [...document.querySelectorAll(PANEL)].filter((p) => !p.hidden).map((p) => p.textContent), PANEL);
    expect.deepEqual(shown, ["Loaded when selected."], `the Older panel is shown; shown: ${JSON.stringify(shown)}`);
  },

  "tabs-space-selects-manual": async ({ page, open, expect }) => {
    await open("manual");
    expect.equal(await tabIntoList(page), "Recent", "Tab enters manual on Recent");
    await press(page, "ArrowRight", "Older");
    const s1 = await read(page, "manual");
    expect.equal(s1.focus, "Older", "control: ArrowRight moves focus to Older");
    expect.deepEqual(s1.selected, ["Recent"], "ArrowRight alone selects nothing in manual mode");
    await page.keyboard.press("Space");
    await page.waitForTimeout(30);
    const s2 = await read(page, "manual");
    expect.deepEqual(s2.selected, ["Older"], `Space selects the focused tab Older; ${JSON.stringify(s2.selected)} is selected`);
    expect.deepEqual(s2.log, ["older"], `Space calls onValueChange once with older; got ${JSON.stringify(s2.log)}`);
  },

  "tabs-disabled-skipped": async ({ page, open, expect }) => {
    await open("disabled-tab");
    const attrs = await tabByLabel(page, "Size guide").evaluate((t) => ({ disabled: t.disabled, data: t.getAttribute("data-disabled") }));
    expect.deepEqual(attrs, { disabled: true, data: "" }, `the disabled tab has the native disabled attribute and data-disabled; got ${JSON.stringify(attrs)}`);
    // Control: a press on a live tab selects it.
    await clickCentre(page, tabByLabel(page, "Delivery"));
    expect.deepEqual((await read(page, "disabled-tab")).log, ["delivery"], "control: a press on Delivery selects it");
    await open("disabled-tab");
    await clickCentre(page, tabByLabel(page, "Size guide"));
    await tabByLabel(page, "Size guide").dispatchEvent("mousedown");
    await page.waitForTimeout(30);
    const s = await read(page, "disabled-tab");
    expect.deepEqual(s.selected, ["Details"], `a press on the disabled tab leaves Details selected; ${JSON.stringify(s.selected)} is`);
    expect.deepEqual(s.log, [], `a press on the disabled tab calls onValueChange with nothing; got ${JSON.stringify(s.log)}`);
    // By key: every key that moves focus skips it, so it can never be focused and selected.
    expect.equal(await tabIntoList(page), "Details", "Tab enters on Details");
    const seen = new Set();
    for (const key of ["ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft", "End", "Home", "PageDown", "PageUp"]) {
      await press(page, key);
      seen.add(await focusedLabel(page));
    }
    expect.ok(!seen.has("Size guide"), `the keys landed on ${JSON.stringify([...seen])}; the disabled tab must never get focus`);
    expect.ok(seen.has("Delivery"), `control: the keys reached Delivery; they landed on ${JSON.stringify([...seen])}`);
    expect.ok(!(await read(page, "disabled-tab")).log.includes("sizes"), "the disabled tab was never selected by key");
  },

  "tabs-focus-visible": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    const ring = (sel) =>
      page.evaluate(({ sel, LIST }) => {
        const C = window.__tabsColour;
        const el = document.activeElement;
        if (!el || !el.matches(sel)) return null;
        const cs = getComputedStyle(el);
        const beside = C.backgroundOf(el.parentElement);
        const colour = C.over(C.parse(cs.outlineColor), beside);
        const width = parseFloat(cs.outlineWidth) || 0;
        const offset = parseFloat(cs.outlineOffset) || 0;
        const r = el.getBoundingClientRect();
        const out = width + offset;
        const box = { left: r.left - out, right: r.right + out, top: r.top - out, bottom: r.bottom + out };
        const list = el.closest(LIST);
        let clip = null;
        if (list) { const l = list.getBoundingClientRect(); clip = { left: l.left + list.clientLeft, top: l.top + list.clientTop, right: l.left + list.clientLeft + list.clientWidth, bottom: l.top + list.clientTop + list.clientHeight }; }
        return { visible: el.matches(":focus-visible"), style: cs.outlineStyle, width, offset, ratio: C.ratio(colour, beside), ring: C.hex(colour), beside: C.hex(beside), box, clip };
      }, { sel, LIST });
    const judge = (where, r, clipped) => {
      measured++;
      if (!r) { problems.push(`${where}: nothing focused`); return; }
      if (!r.visible) problems.push(`${where}: does not match :focus-visible`);
      if (r.style !== "solid" || r.width < 1.99) problems.push(`${where}: outline ${r.style} ${r.width} px, needs solid and 2 px`);
      if (Math.abs(r.offset - 2) > 0.01) problems.push(`${where}: outline offset ${r.offset} px, needs 2`);
      if (r.ratio < 3) problems.push(`${where}: ring ${r.ring} on ${r.beside} is ${r.ratio.toFixed(2)} to 1, needs 3`);
      if (clipped && r.clip && !inside(r.box, r.clip)) problems.push(`${where}: the ring (${fmt(r.box)}) is cut off by the list's scrolling box (${fmt(r.clip)})`);
    };
    for (const theme of ["light", "dark"]) {
      for (const [id, width] of [["line", 375], ["pill", 375], ["vertical", 375], ["worst-case-320", 320], ["long-labels", 320], ["small-pill", 375]]) {
        await open(id, { theme, width });
        await page.evaluate(inPageColour);
        const first = await tabIntoList(page);
        if (first === null) { problems.push(`${id} ${theme}: Tab never reached a tab`); continue; }
        judge(`${id} ${theme} "${first}"`, await ring(TAB), true);
        await press(page, "Home");
        judge(`${id} ${theme} first tab "${await focusedLabel(page)}"`, await ring(TAB), true);
        await press(page, "End");
        judge(`${id} ${theme} last tab "${await focusedLabel(page)}"`, await ring(TAB), true);
        // The shown panel, reached by Tab from the tab.
        await page.keyboard.press("Tab");
        judge(`${id} ${theme} panel`, await ring(PANEL), false);
      }
    }
    expect.ok(measured === 2 * 6 * 4, `measured ${measured} rings`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-label-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const theme of ["light", "dark"]) {
      for (const id of VARIANT_EXAMPLES) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        const measure = () => page.evaluate(({ TAB, LABEL }) => {
          const C = window.__tabsColour;
          return [...document.querySelectorAll(TAB)].filter((t) => !t.disabled).map((t) => {
            const text = t.querySelector(LABEL);
            const fill = C.backgroundOf(t);
            const ink = C.over(C.parse(getComputedStyle(text).color), fill);
            return { label: text.textContent, ratio: C.ratio(ink, fill), ink: C.hex(ink), fill: C.hex(fill), selected: t.getAttribute("aria-selected") === "true" };
          });
        }, { TAB, LABEL });
        for (const r of await measure()) {
          measured++;
          if (r.ratio < 4.5) problems.push(`${id} ${theme} "${r.label}"${r.selected ? " selected" : ""}: ${r.ink} on ${r.fill} is ${Math.floor(r.ratio * 100) / 100} to 1`);
        }
        // Hover each live tab in turn.
        const count = await page.locator(TAB).count();
        for (let i = 0; i < count; i++) {
          const t = page.locator(TAB).nth(i);
          if (await t.isDisabled()) continue;
          const box = await t.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          const label = await t.locator(LABEL).textContent();
          const hovered = (await measure()).find((r) => r.label === label);
          measured++;
          if (hovered.ratio < 4.5) problems.push(`${id} ${theme} "${label}" hovered: ${hovered.ink} on ${hovered.fill} is ${Math.floor(hovered.ratio * 100) / 100} to 1`);
        }
        await page.mouse.move(0, 0);
      }
    }
    expect.ok(measured >= 60, `measured ${measured} label and fill pairs`);
    expect.deepEqual(problems, [], `${problems.length} of ${measured} pairs are under 4.5 to 1: ${problems.join("; ")}`);
  },

  "tabs-indicator-contrast": async ({ page, open, expect }) => {
    const problems = [];
    for (const theme of ["light", "dark"]) {
      for (const id of ["line", "vertical", "small", "pill", "small-pill", "vertical-pill"]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        const r = await page.evaluate(({ LIST, TAB, INDICATOR }) => {
          const C = window.__tabsColour;
          const t = document.querySelector(`${TAB}[aria-selected="true"]`);
          const page_ = C.backgroundOf(t.closest(LIST));
          const ind = getComputedStyle(t.querySelector(INDICATOR));
          const edge = ind.borderBottomWidth !== "0px" ? "Bottom" : ind.borderLeftWidth !== "0px" ? "Left" : ind.borderRightWidth !== "0px" ? "Right" : "Top";
          const line = C.over(C.parse(ind[`border${edge}Color`]), page_);
          const lineWidth = parseFloat(ind[`border${edge}Width`]) || 0;
          const fill = C.over(C.parse(getComputedStyle(t).backgroundColor), page_);
          return { variant: t.closest('[data-slot="tabs"]').getAttribute("data-variant"), line: C.hex(line), lineWidth, lineRatio: C.ratio(line, page_), fill: C.hex(fill), fillRatio: C.ratio(fill, page_), page: C.hex(page_) };
        }, { LIST, TAB, INDICATOR });
        if (r.variant === "line") {
          if (r.lineWidth < 1.99) problems.push(`${id} ${theme}: the selected tab's line is ${r.lineWidth} px`);
          if (r.lineRatio < 3) problems.push(`${id} ${theme}: the line ${r.line} on ${r.page} is ${r.lineRatio.toFixed(2)} to 1, needs 3`);
        } else if (r.fillRatio < 3) problems.push(`${id} ${theme}: the fill ${r.fill} on ${r.page} is ${r.fillRatio.toFixed(2)} to 1, needs 3`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-selected-not-colour-alone": async ({ page, open, expect }) => {
    const problems = [];
    for (const theme of ["light", "dark"]) {
      for (const id of ["line", "pill", "vertical", "small-pill"]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        const r = await page.evaluate(({ TAB, LABEL, INDICATOR }) => {
          const C = window.__tabsColour;
          return [...document.querySelectorAll(TAB)].map((t) => {
            const ind = getComputedStyle(t.querySelector(INDICATOR));
            const widths = ["Top", "Right", "Bottom", "Left"].map((s) => [parseFloat(ind[`border${s}Width`]) || 0, C.parse(ind[`border${s}Color`])[3]]);
            return {
              selected: t.getAttribute("aria-selected") === "true",
              weight: parseInt(getComputedStyle(t.querySelector(LABEL)).fontWeight, 10),
              line: widths.some(([w, a]) => w >= 1.99 && a > 0),
              fill: C.parse(getComputedStyle(t).backgroundColor)[3] > 0,
            };
          });
        }, { TAB, LABEL, INDICATOR });
        const sel = r.find((t) => t.selected), others = r.filter((t) => !t.selected);
        const variant = id.includes("pill") ? "pill" : "line";
        for (const o of others) {
          if (!(sel.weight > o.weight)) problems.push(`${id} ${theme}: the selected label weighs ${sel.weight}, an unselected one ${o.weight}`);
          if (variant === "line" && (!sel.line || o.line)) problems.push(`${id} ${theme}: the line shows on the selected tab: ${sel.line}, on an unselected one: ${o.line}`);
          if (variant === "pill" && (!sel.fill || o.fill)) problems.push(`${id} ${theme}: the fill shows on the selected tab: ${sel.fill}, on an unselected one: ${o.fill}`);
        }
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-selected-forced-colors": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["line", "vertical", "pill", "small-pill"]) {
      await open(id);
      await page.emulateMedia({ forcedColors: "active" });
      expect.equal(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), true, "the page sees forced colours, so the measurement means something");
      const r = await page.evaluate(({ TAB, INDICATOR }) => {
        const sides = (cs) => ["Top", "Right", "Bottom", "Left"].map((s) => ({ style: cs[`border${s}Style`], width: parseFloat(cs[`border${s}Width`]) || 0, colour: cs[`border${s}Color`] }));
        const seen = (b) => b.style !== "none" && b.width >= 1.99 && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(b.colour);
        return [...document.querySelectorAll(TAB)].map((t) => ({
          selected: t.getAttribute("aria-selected") === "true",
          // A line is shown when one edge has a visible border and the indicator itself is not hidden.
          line: sides(getComputedStyle(t.querySelector(INDICATOR))).some(seen) && t.querySelector(INDICATOR).checkVisibility({ visibilityProperty: true }),
          border: sides(getComputedStyle(t)).map(seen),
          raw: sides(getComputedStyle(t.querySelector(INDICATOR))).map((b) => `${b.style} ${b.width} ${b.colour}`).join(" / "),
        }));
      }, { TAB, INDICATOR });
      const sel = r.find((t) => t.selected), others = r.filter((t) => !t.selected);
      if (id.includes("pill")) {
        if (!sel.border.every(Boolean)) problems.push(`${id}: in forced colours the selected pill's border shows on ${sel.border.filter(Boolean).length} of 4 sides`);
        for (const o of others) if (o.border.some(Boolean) || o.line) problems.push(`${id}: in forced colours an unselected pill shows a border or line too, so nothing marks the selected one`);
      } else {
        if (!sel.line) problems.push(`${id}: in forced colours the selected tab's line is gone (${sel.raw})`);
        for (const o of others) if (o.line) problems.push(`${id}: in forced colours an unselected tab shows a line too (${o.raw})`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-no-page-scroll-320": async ({ page, open, expect }) => {
    const problems = [];
    const cdp = await touch(page);
    for (const id of ["worst-case-320", "long-labels", "line", "fill", "with-icons", "vertical", "rtl"]) {
      await open(id, { width: 320 });
      const m = await page.evaluate(({ LIST, TAB, LABEL }) => {
        const de = document.documentElement;
        const list = document.querySelector(LIST);
        const cs = getComputedStyle(list);
        const labels = [...document.querySelectorAll(LABEL)].map((l) => {
          const range = document.createRange();
          range.selectNodeContents(l);
          const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
          const t = l.closest(TAB).getBoundingClientRect(), b = l.getBoundingClientRect();
          let cut = null;
          for (let e = l; e && !e.matches(LIST); e = e.parentElement) {
            const o = getComputedStyle(e);
            if (o.textOverflow === "ellipsis" || (e !== l && e.scrollWidth > e.clientWidth + 1 && o.overflowX !== "visible")) cut = e.getAttribute("data-slot") || e.tagName;
          }
          return { text: l.textContent, lines, cut, insideTab: b.left >= t.left - 0.5 && b.right <= t.right + 0.5, overflowing: l.scrollWidth > l.clientWidth + 1 };
        });
        return { page: { sw: de.scrollWidth, cw: de.clientWidth }, list: { sw: list.scrollWidth, cw: list.clientWidth, ox: cs.overflowX }, labels };
      }, { LIST, TAB, LABEL });
      if (m.page.sw > m.page.cw) problems.push(`${id}: the page scrolls sideways at 320 (${m.page.sw} px in ${m.page.cw})`);
      if (!["auto", "scroll"].includes(m.list.ox)) problems.push(`${id}: the list's overflow-x is ${m.list.ox}`);
      for (const l of m.labels) {
        if (l.lines !== 1) problems.push(`${id}: "${l.text}" takes ${l.lines} lines`);
        if (l.cut) problems.push(`${id}: "${l.text}" is cut off by ${l.cut}`);
        if (!l.insideTab || l.overflowing) problems.push(`${id}: "${l.text}" spills out of its tab`);
      }
      if (id === "worst-case-320" || id === "long-labels") {
        if (!(m.list.sw > m.list.cw)) problems.push(`${id}: the tabs (${m.list.sw} px) do not overflow the ${m.list.cw} px list at 320, so the list is not scrolling inside itself`);
        // The list really scrolls: scrolling it to each end brings the first and the last tab fully into view.
        for (const end of ["start", "end"]) {
          await page.evaluate(({ LIST, end }) => { const l = document.querySelector(LIST); l.scrollLeft = end === "start" ? 0 : l.scrollWidth; }, { LIST, end });
          const g = await boxes(page);
          const t = end === "start" ? g.tabs[0] : g.tabs[g.tabs.length - 1];
          if (!inside(t, g.clip)) problems.push(`${id}: scrolled to the ${end}, "${t.label}" (${fmt(t)}) is not inside the list (${fmt(g.clip)})`);
        }
        const de = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        if (de[0] > de[1]) problems.push(`${id}: after scrolling the list, the page scrolls sideways (${de[0]} in ${de[1]})`);
      }
    }
    await cdp.detach();
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-focused-tab-in-view": async ({ page, open, expect }) => {
    const problems = [];
    await open("worst-case-320", { width: 320 });
    expect.equal(await tabIntoList(page), "Questions and answers", "Tab enters on the selected last tab");
    const order = ["Details", "Reviews (1,284)", "Delivery", "Returns", "Questions and answers", "Details"];
    await press(page, "Home", "Details");
    let g = await boxes(page);
    let f = g.tabs.find((t) => t.label === "Details");
    if (!inside(f, g.clip)) problems.push(`Home: "Details" (${fmt(f)}) is not inside the list (${fmt(g.clip)})`);
    for (const want of order.slice(1)) {
      const got = await press(page, "ArrowRight", want);
      g = await boxes(page);
      f = g.tabs.find((t) => t.label === got);
      if (got !== want) problems.push(`ArrowRight landed on "${got}", expected "${want}"`);
      if (!f || !inside(f, g.clip)) problems.push(`ArrowRight to "${got}": the tab (${f ? fmt(f) : "none"}) is not inside the list (${fmt(g.clip)})`);
    }
    await open("long-labels", { width: 320 });
    await tabIntoList(page);
    for (const [key, want] of [["ArrowLeft", "Details and materials"], ["ArrowLeft", "Delivery and free returns"]]) {
      const got = await press(page, key, want);
      g = await boxes(page);
      f = g.tabs.find((t) => t.label === got);
      if (!f || !inside(f, g.clip)) problems.push(`long-labels ${key} to "${got}": the tab (${f ? fmt(f) : "none"}) is not inside the list (${fmt(g.clip)})`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-selected-in-view-on-mount": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, width] of [["worst-case-320", 320], ["worst-case-320", 375], ["long-labels", 320]]) {
      await open(id, { width });
      const g = await boxes(page);
      const s = g.tabs.find((t) => t.selected);
      if (!(g.scrollWidth > g.clientWidth)) problems.push(`${id} at ${width}: the list does not scroll (${g.scrollWidth} in ${g.clientWidth}), so this proves nothing`);
      if (!inside(s, g.clip)) problems.push(`${id} at ${width}: on first render the selected "${s.label}" (${fmt(s)}) is not inside the list (${fmt(g.clip)}), scrollLeft ${g.scrollLeft}`);
      const page_ = await page.evaluate(() => [window.scrollX, window.scrollY]);
      if (page_[0] !== 0 || page_[1] !== 0) problems.push(`${id} at ${width}: revealing the tab scrolled the page to ${page_.join(", ")}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-orientation-layout": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["line", "pill", "worst-case-320"]) {
      await open(id);
      const m = await page.evaluate(({ LIST, TAB, PANEL }) => {
        const l = document.querySelector(LIST).getBoundingClientRect();
        const p = [...document.querySelectorAll(PANEL)].find((e) => !e.hidden).getBoundingClientRect();
        const tops = [...document.querySelectorAll(TAB)].map((t) => Math.round(t.getBoundingClientRect().top));
        const lefts = [...document.querySelectorAll(TAB)].map((t) => t.getBoundingClientRect().left);
        return { listBottom: l.bottom, panelTop: p.top, tops, increasing: lefts.every((x, i) => i === 0 || x > lefts[i - 1]) };
      }, { LIST, TAB, PANEL });
      if (new Set(m.tops).size !== 1) problems.push(`${id}: horizontal tabs are not in one row (tops ${m.tops.join(", ")})`);
      if (!m.increasing) problems.push(`${id}: horizontal tabs do not run left to right`);
      if (m.listBottom > m.panelTop + 0.5) problems.push(`${id}: the list (bottom ${m.listBottom}) is not above its panel (top ${m.panelTop})`);
    }
    for (const id of ["vertical", "vertical-pill"]) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        const m = await page.evaluate(({ LIST, TAB, PANEL }) => {
          const list = document.querySelector(LIST);
          const l = list.getBoundingClientRect();
          const cs = getComputedStyle(list);
          const inner = list.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const p = [...document.querySelectorAll(PANEL)].find((e) => !e.hidden).getBoundingClientRect();
          const tabs = [...document.querySelectorAll(TAB)].map((t) => t.getBoundingClientRect());
          return { listRight: l.right, listTop: l.top, panelLeft: p.left, panelTop: p.top, inner, widths: tabs.map((t) => t.width), lefts: tabs.map((t) => Math.round(t.left)), tops: tabs.map((t) => t.top) };
        }, { LIST, TAB, PANEL });
        const at = `${id} at ${width}`;
        if (new Set(m.lefts).size !== 1) problems.push(`${at}: vertical tabs are not in one column (lefts ${m.lefts.join(", ")})`);
        if (!m.tops.every((y, i) => i === 0 || y > m.tops[i - 1])) problems.push(`${at}: vertical tabs do not run top to bottom`);
        for (const w of m.widths) if (Math.abs(w - m.inner) > 1) problems.push(`${at}: a vertical tab is ${w} px wide; the list's inside is ${m.inner} px`);
        if (m.listRight > m.panelLeft + 0.5) problems.push(`${at}: the list (right ${m.listRight}) is not at the inline start of its panel (left ${m.panelLeft})`);
        if (Math.abs(m.listTop - m.panelTop) > 8) problems.push(`${at}: the list (top ${m.listTop}) does not sit beside its panel (top ${m.panelTop})`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-behavior-fill": async ({ page, open, expect }) => {
    const problems = [];
    const measure = () => page.evaluate(({ ROOT, LIST, TAB, LABEL }) => {
      const root = document.querySelector(ROOT).getBoundingClientRect();
      const list = document.querySelector(LIST);
      const tabs = [...document.querySelectorAll(TAB)].map((t) => {
        const cs = getComputedStyle(t);
        const kids = [...t.children].filter((c) => getComputedStyle(c).position !== "absolute");
        const content = kids.reduce((s, c) => s + c.getBoundingClientRect().width, 0) + (kids.length - 1) * (parseFloat(cs.columnGap) || 0) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
        const l = t.querySelector(LABEL);
        return { width: t.getBoundingClientRect().width, content, labelCut: l.scrollWidth > l.clientWidth + 1 };
      });
      return { root: root.width, list: list.getBoundingClientRect().width, scrolls: list.scrollWidth > list.clientWidth, tabs };
    }, { ROOT, LIST, TAB, LABEL });
    for (const width of [320, 375, 1280]) {
      await open("fill", { width });
      const m = await measure();
      const at = `fill at ${width}`;
      if (Math.abs(m.list - m.root) > 1) problems.push(`${at}: the list is ${m.list} px in a ${m.root} px container`);
      const ws = m.tabs.map((t) => t.width);
      if (Math.max(...ws) - Math.min(...ws) > 1) problems.push(`${at}: the tabs are ${ws.join(", ")} px wide, not equal`);
    }
    for (const id of ["pill", "line", "with-icons"]) {
      await open(id, { width: 1280 });
      const m = await measure();
      for (const t of m.tabs) if (Math.abs(t.width - t.content) > 1) problems.push(`${id} (hug) at 1280: a tab is ${t.width} px wide, its label and padding ${t.content.toFixed(1)} px`);
      if (!(m.list < m.root - 1)) problems.push(`${id} (hug) at 1280: the list is ${m.list} px, as wide as its ${m.root} px container`);
    }
    // When fill's labels do not fit, the list scrolls instead of cutting a label.
    await open("fill", { width: 200 });
    const narrow = await measure();
    if (!narrow.scrolls) problems.push(`fill at 200: the labels fit, so this proves nothing (list ${narrow.list} px)`);
    if (narrow.tabs.some((t) => t.labelCut)) problems.push("fill at 200: a label is cut off instead of the list scrolling");
    const de = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (de[0] > de[1]) problems.push(`fill at 200: the page scrolls sideways (${de[0]} in ${de[1]})`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-indicator-edge": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, edge] of [["line", "bottom"], ["rtl", "bottom"], ["small", "bottom"], ["vertical", "start"], ["pill", "bottom"]]) {
      await open(id);
      const m = await page.evaluate(({ TAB, INDICATOR }) => {
        const probe = document.createElement("div");
        probe.style.setProperty("width", "var(--border-width-md)");
        document.body.append(probe);
        const md = probe.getBoundingClientRect().width;
        probe.remove();
        return { md, tabs: [...document.querySelectorAll(TAB)].map((t) => {
          const i = t.querySelector(INDICATOR);
          const cs = getComputedStyle(i);
          const r = i.getBoundingClientRect(), b = t.getBoundingClientRect();
          return { dir: getComputedStyle(t).direction, w: { top: parseFloat(cs.borderTopWidth), right: parseFloat(cs.borderRightWidth), bottom: parseFloat(cs.borderBottomWidth), left: parseFloat(cs.borderLeftWidth) }, style: { top: cs.borderTopStyle, right: cs.borderRightStyle, bottom: cs.borderBottomStyle, left: cs.borderLeftStyle }, r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, b: { left: b.left, right: b.right, top: b.top, bottom: b.bottom } };
        }) };
      }, { TAB, INDICATOR });
      if (!(m.md >= 1)) problems.push(`--border-width-md resolves to ${m.md} px`);
      m.tabs.forEach((t, n) => {
        const at = `${id} tab ${n + 1}`;
        const side = edge === "bottom" ? "bottom" : t.dir === "rtl" ? "right" : "left";
        for (const s of ["top", "right", "bottom", "left"]) {
          const want = s === side ? m.md : 0;
          if (Math.abs(t.w[s] - want) > 0.01) problems.push(`${at}: the indicator's ${s} border is ${t.w[s]} px, expected ${want}`);
        }
        if (t.style[side] !== "solid") problems.push(`${at}: the indicator's ${side} border is ${t.style[side]}`);
        const near = (a, b) => Math.abs(a - b) <= 0.5;
        if (edge === "bottom") {
          if (!near(t.r.left, t.b.left) || !near(t.r.right, t.b.right)) problems.push(`${at}: the line runs ${Math.round(t.r.left)} to ${Math.round(t.r.right)}, the tab ${Math.round(t.b.left)} to ${Math.round(t.b.right)}`);
          if (!near(t.r.bottom, t.b.bottom)) problems.push(`${at}: the line ends at ${t.r.bottom}, the tab's bottom edge is ${t.b.bottom}`);
        } else {
          if (!near(t.r.top, t.b.top) || !near(t.r.bottom, t.b.bottom)) problems.push(`${at}: the line runs ${Math.round(t.r.top)} to ${Math.round(t.r.bottom)}, the tab ${Math.round(t.b.top)} to ${Math.round(t.b.bottom)}`);
          if (!near(side === "left" ? t.r.left : t.r.right, side === "left" ? t.b.left : t.b.right)) problems.push(`${at}: the line is not on the tab's inline-start edge`);
        }
      });
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-no-width-shift": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["line", "pill", "small", "vertical", "worst-case-320"]) {
      await open(id);
      const before = await boxes(page);
      const count = before.tabs.length;
      for (let i = 0; i < count; i++) {
        const t = page.locator(TAB).nth(i);
        if (await t.isDisabled()) continue;
        await clickCentre(page, t);
        await page.mouse.move(0, 0);
        const after = await boxes(page);
        after.tabs.forEach((a, n) => {
          const b = before.tabs[n];
          if (Math.abs(a.width - b.width) > 0.5 || Math.abs(a.left - after.clip.left - (b.left - before.clip.left) + (after.scrollLeft - before.scrollLeft)) > 0.5)
            problems.push(`${id}: selecting "${before.tabs[i].label}" moved "${b.label}" from ${b.left.toFixed(1)} (${b.width.toFixed(1)} wide) to ${a.left.toFixed(1)} (${a.width.toFixed(1)} wide)`);
        });
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-target-size": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ALL_EXAMPLES) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        for (const t of (await boxes(page)).tabs) if (t.width < 24 || t.height < 24) problems.push(`${id} at ${width}: "${t.label}" is ${t.width} by ${t.height} px`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "tabs-touch-target": async ({ page, open, expect }) => {
    const problems = [];
    const cdp = await touch(page);
    for (const id of ["small", "small-pill", "line", "vertical", "worst-case-320"]) {
      await open(id, { width: 375 });
      expect.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the page sees a coarse pointer, so the measurement means something");
      for (const t of (await boxes(page)).tabs) if (t.height < 44 - 0.01) problems.push(`${id}: with a coarse pointer "${t.label}" is ${t.height} px tall`);
    }
    await cdp.detach();
    expect.deepEqual(problems, [], problems.join("; "));
  },
};
