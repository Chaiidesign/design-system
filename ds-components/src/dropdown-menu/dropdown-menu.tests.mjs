// DropdownMenu tests: one entry per requirement in ds-components/specs/dropdown-menu.spec.json whose check is
// test:<id>. Run by v2/tools/test-components.mjs (--component dropdown-menu), which calls each entry with
// { page, open, expect }: a fresh Playwright page, open(exampleId, { theme, width, density }) that loads one gallery
// example and waits for it, and node:assert/strict. Each test has 30 seconds.
//
// The content is portalled to the end of <body>, so every part is found document-wide by its data-slot after the
// menu opens, by the word ([data-slot~="x"]), because data-slot is a list. The trigger is a Souvenir Button passed
// with asChild: it carries data-slot="button dropdown-menu-trigger", so it is found by its own slot word, which also
// proves the merge. What the examples did is read from window.__dropdownMenuEvents[<example id>]
// (select, openChange, checkedChange, valueChange), which dropdown-menu.examples.tsx records. Focus is reached with
// real Tab presses and menus are driven by real keys and real mouse moves. Every "nothing happened" check first
// proves that the same press does count on a live item, so it cannot pass by measuring nothing.

const TRIGGER = '[data-slot~="dropdown-menu-trigger"]';
const CONTENT = '[data-slot~="dropdown-menu-content"]';
const ITEMS = '[data-slot~="dropdown-menu-item"], [data-slot~="dropdown-menu-checkbox-item"], [data-slot~="dropdown-menu-radio-item"]';
const LABEL = '[data-slot~="dropdown-menu-item-label"]';
const OPEN_EXAMPLES = ["actions", "model-selector", "with-descriptions", "with-shortcuts", "grouped", "disabled-items", "side-top", "align-end", "non-modal", "right-to-left", "long-label", "touch", "worst-case-320"];

// Radix moves focus between items in a setTimeout after the keydown, so each key waits for that to land before the
// next key or measurement, as a person's next key press would.
const settle = (page) => page.evaluate(() => new Promise((done) => setTimeout(() => requestAnimationFrame(() => done()), 0)));
async function press(page, k) {
  await page.keyboard.press(k);
  await settle(page);
}
async function typeKeys(page, text) {
  for (const ch of text) await press(page, ch);
}

const events = (page, id) => page.evaluate((k) => (window.__dropdownMenuEvents && window.__dropdownMenuEvents[k]) || {}, id);
const pause = (page, ms) => page.waitForTimeout(ms);

async function waitOpen(page) {
  await page.locator(CONTENT).first().waitFor({ state: "visible", timeout: 5000 });
}
// Radix returns focus to the trigger in a setTimeout after the content unmounts, so wait for that too.
async function waitClosed(page) {
  await page.locator(CONTENT).first().waitFor({ state: "detached", timeout: 5000 });
  await settle(page);
}
const isOpen = (page) => page.evaluate((sel) => !!document.querySelector(sel), CONTENT);

// Presses Tab until the trigger has focus. Returns true when it got there.
async function tabToTrigger(page) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement && document.activeElement.matches(sel), TRIGGER)) return true;
  }
  return false;
}

// Opens a closed example's menu from the keyboard: Tab to the trigger, press the key.
async function openByKey(page, expect, which = "Enter") {
  expect.ok(await tabToTrigger(page), "Tab reaches the trigger");
  await press(page, which);
  await waitOpen(page);
  // Radix moves focus to the first item just after the content mounts; keys pressed before that land on the content.
  await page.waitForFunction((items) => !!document.activeElement && document.activeElement.matches(items), ITEMS, { timeout: 2000 }).catch(() => {});
}

async function centre(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("the element has no box to point at");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function clickCentre(page, locator) {
  const c = await centre(page, locator);
  await page.mouse.click(c.x, c.y);
}
async function hover(page, locator) {
  const c = await centre(page, locator);
  await page.mouse.move(c.x - 2, c.y);
  await page.mouse.move(c.x, c.y);
}

// What has focus: which part, the item's label, whether it is highlighted.
const active = (page) =>
  page.evaluate(({ trigger, content, items, label }) => {
    const a = document.activeElement;
    if (!a || a === document.body) return { what: "body" };
    if (a.matches(trigger)) return { what: "trigger" };
    if (a.matches(content)) return { what: "content" };
    if (a.matches(items)) return { what: a.getAttribute("data-slot"), label: a.querySelector(label)?.textContent ?? null, highlighted: a.hasAttribute("data-highlighted") };
    return { what: a.tagName.toLowerCase() };
  }, { trigger: TRIGGER, content: CONTENT, items: ITEMS, label: LABEL });
const activeLabel = async (page) => (await active(page)).label ?? `(${(await active(page)).what})`;
const highlightedLabels = (page) => page.evaluate(({ items, label }) => [...document.querySelectorAll(items)].filter((e) => e.hasAttribute("data-highlighted")).map((e) => e.querySelector(label)?.textContent ?? "?"), { items: ITEMS, label: LABEL });
const itemByLabel = (page, text) => page.locator(ITEMS).filter({ has: page.locator(LABEL, { hasText: text }) }).first();

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
  // A text part's ink over what is behind it, and the ratio.
  const textPair = (el) => {
    const bg = backgroundOf(el);
    const ink = over(parse(getComputedStyle(el).color), bg);
    return { ratio: ratio(ink, bg), ink: hex(ink), bg: hex(bg) };
  };
  window.__ddColour = { parse, over, ratio, hex, lum, backgroundOf, textPair };
}

// The highlighted item's fill and text against the content, measured in the page.
const highlightLook = (page, itemSel) =>
  page.evaluate(({ itemSel, content, label }) => {
    const C = window.__ddColour;
    const el = document.querySelector(itemSel) ?? document.activeElement;
    const box = document.querySelector(content);
    const contentBg = C.backgroundOf(box);
    const fill = C.backgroundOf(el);
    const text = el.querySelector(label);
    const ink = C.over(C.parse(getComputedStyle(text).color), fill);
    return { background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, fill: C.hex(fill), contentBg: C.hex(contentBg), fillRatio: C.ratio(fill, contentBg), ink: C.hex(ink), textRatio: C.ratio(ink, fill) };
  }, { itemSel, content: CONTENT, label: LABEL });

// Every style rule in the page's stylesheets, layers and media blocks included.
const allSelectors = (page) =>
  page.evaluate(() => {
    const out = [];
    const walk = (rules) => {
      for (const r of rules) {
        if (r.selectorText) out.push(r.selectorText);
        if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* cross-origin */ } }
    return out;
  });

export const tests = {
  "dropdown-menu-trigger-attributes": async ({ page, open, expect }) => {
    await open("closed");
    const trigger = page.locator(TRIGGER);
    expect.equal(await trigger.count(), 1, "the closed example has one trigger with aria-haspopup=menu");
    const closed = await trigger.evaluate((el) => ({ tag: el.tagName, popup: el.getAttribute("aria-haspopup"), expanded: el.getAttribute("aria-expanded"), controls: el.getAttribute("aria-controls") }));
    expect.equal(closed.tag, "BUTTON", "the trigger is a button element");
    expect.equal(closed.expanded, "false", "closed: aria-expanded is false");
    expect.equal(closed.controls, null, "closed: aria-controls is absent, as the content is not in the page");
    await clickCentre(page, trigger);
    await waitOpen(page);
    const opened = await page.evaluate(({ trigger, content }) => {
      const t = document.querySelector(trigger);
      const id = t.getAttribute("aria-controls");
      const target = id ? document.getElementById(id) : null;
      return { expanded: t.getAttribute("aria-expanded"), popup: t.getAttribute("aria-haspopup"), controls: id, controlsContent: !!target && target.matches(content) };
    }, { trigger: TRIGGER, content: CONTENT });
    expect.equal(opened.popup, "menu", "open: aria-haspopup is menu");
    expect.equal(opened.expanded, "true", "open: aria-expanded is true");
    expect.ok(opened.controlsContent, `open: aria-controls (${opened.controls}) names the content`);
    await press(page, "Escape");
    await waitClosed(page);
    expect.equal(await trigger.getAttribute("aria-expanded"), "false", "after Escape aria-expanded is false again");
    await open("actions");
    await waitOpen(page);
    expect.equal(await page.locator(TRIGGER).getAttribute("aria-expanded"), "true", "a menu rendered open has aria-expanded true on its trigger");
  },

  "dropdown-menu-content-named": async ({ page, open, expect }) => {
    for (const id of ["actions", "model-selector", "worst-case-320"]) {
      await open(id);
      await waitOpen(page);
      const r = await page.evaluate(({ trigger, content }) => {
        const t = document.querySelector(trigger), c = document.querySelector(content);
        return { role: c.getAttribute("role"), labelledby: c.getAttribute("aria-labelledby"), triggerId: t.id };
      }, { trigger: TRIGGER, content: CONTENT });
      expect.equal(r.role, "menu", `${id}: the content has role menu`);
      expect.ok(r.triggerId, `${id}: the trigger has an id`);
      expect.equal(r.labelledby, r.triggerId, `${id}: the content's aria-labelledby names the trigger`);
    }
    await open("actions");
    await waitOpen(page);
    expect.equal(await page.getByRole("menu", { name: "Chat options", exact: true }).count(), 1, "the actions menu's accessible name is the icon-only trigger's ariaLabel");
  },

  "dropdown-menu-description-not-name": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["with-descriptions", "disabled-items", "worst-case-320"]) {
      await open(id);
      await waitOpen(page);
      const items = await page.evaluate(({ items, label }) => [...document.querySelectorAll(items)].filter((e) => e.querySelector('[data-slot~="dropdown-menu-item-description"]')).map((e) => {
        const l = e.querySelector(label), d = e.querySelector('[data-slot~="dropdown-menu-item-description"]');
        // The text type-ahead matches is Radix's collection textValue, read from the React props of its item slot.
        const key = Object.keys(e).find((k) => k.startsWith("__reactFiber$"));
        let typeAhead = null;
        for (let f = key ? e[key] : null; f; f = f.return) {
          const p = f.memoizedProps;
          if (p && typeof p === "object" && "textValue" in p && "scope" in p) { typeAhead = p.textValue; break; }
        }
        return { role: e.getAttribute("role"), label: l.textContent, labelId: l.id, description: d.textContent, descriptionId: d.id, labelledby: e.getAttribute("aria-labelledby"), describedby: e.getAttribute("aria-describedby"), typeAhead };
      }), { items: ITEMS, label: LABEL });
      if (!items.length) problems.push(`${id}: no item with a description was found`);
      for (const it of items) {
        const at = `${id} "${it.label}"`;
        if (!it.labelId || it.labelledby !== it.labelId) problems.push(`${at}: aria-labelledby is ${it.labelledby}, the label's id is ${it.labelId || "(none)"}`);
        if (!it.descriptionId || it.describedby !== it.descriptionId) problems.push(`${at}: aria-describedby is ${it.describedby}, the description's id is ${it.descriptionId || "(none)"}`);
        const named = await page.getByRole(it.role, { name: it.label, exact: true, includeHidden: true }).count();
        if (named !== 1) problems.push(`${at}: ${named} ${it.role} elements have exactly the name "${it.label}"; the description must not be part of the name`);
        if (it.typeAhead !== it.label) problems.push(`${at}: type-ahead matches ${JSON.stringify(it.typeAhead)}, not the label alone`);
      }
    }
    // Type-ahead in use: "Opens…" begins only a description, so typing o after opening must not reach that item.
    await open("with-descriptions");
    await waitOpen(page);
    await press(page, "ArrowDown");
    const before = await activeLabel(page);
    await typeKeys(page, "m");
    const onM = await activeLabel(page);
    if (onM !== "Model settings") problems.push(`control: typing m highlights ${onM}, not Model settings`);
    await press(page, "Home");
    await pause(page, 1100);
    await typeKeys(page, "o");
    const onO = await activeLabel(page);
    if (onO !== before) problems.push(`typing o (which begins only the description "Opens in a new tab") moved the highlight from ${before} to ${onO}`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-group-labelled": async ({ page, open, expect }) => {
    const problems = [];
    const read = () => page.evaluate(() => [...document.querySelectorAll('[data-slot~="dropdown-menu-group"], [data-slot~="dropdown-menu-radio-group"]')].map((g) => {
      const label = g.querySelector('[data-slot~="dropdown-menu-label"]');
      const by = g.getAttribute("aria-labelledby");
      return { slot: g.getAttribute("data-slot"), role: g.getAttribute("role"), label: label?.textContent ?? null, labelId: label?.id ?? null, labelledby: by, pointsAt: by ? document.getElementById(by)?.textContent ?? "(no element with that id)" : null };
    }));
    const expected = { grouped: ["Sort by", "Show"], "model-selector": ["Models"], "with-descriptions": ["Models"], "worst-case-320": ["This chat and everything shared from it"], "highlighted-keyboard": [null], "disabled-items": [null] };
    for (const [id, labels] of Object.entries(expected)) {
      await open(id);
      if (id === "highlighted-keyboard") await openByKey(page, expect);
      await waitOpen(page);
      const groups = await read();
      if (groups.length !== labels.length) problems.push(`${id}: ${groups.length} groups, expected ${labels.length}`);
      groups.forEach((g, i) => {
        const at = `${id} group ${i + 1}`;
        if (g.role !== "group") problems.push(`${at}: role ${g.role}, expected group`);
        if (labels[i] === null) {
          if (g.labelledby !== null) problems.push(`${at} has no label but aria-labelledby="${g.labelledby}" (points at ${g.pointsAt})`);
        } else {
          if (g.label !== labels[i]) problems.push(`${at}: label is ${g.label}, expected ${labels[i]}`);
          if (!g.labelId || g.labelledby !== g.labelId) problems.push(`${at}: aria-labelledby is ${g.labelledby}, the label's id is ${g.labelId}`);
          if (g.pointsAt !== labels[i]) problems.push(`${at}: aria-labelledby points at "${g.pointsAt}"`);
        }
      });
    }
    await open("grouped");
    await waitOpen(page);
    for (const name of ["Sort by", "Show"]) {
      const n = await page.getByRole("group", { name, exact: true, includeHidden: true }).count();
      if (n !== 1) problems.push(`grouped: ${n} groups are named "${name}"`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-checked-state": async ({ page, open, expect }) => {
    const read = () => page.evaluate(() => [...document.querySelectorAll('[data-slot~="dropdown-menu-checkbox-item"], [data-slot~="dropdown-menu-radio-item"]')].map((e) => ({
      slot: e.getAttribute("data-slot"), label: e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent,
      ariaChecked: e.getAttribute("aria-checked"), state: e.getAttribute("data-state"),
      indicator: !!e.querySelector('[data-slot~="dropdown-menu-item-indicator"]'),
    })));
    const check = (rows, want, when) => {
      const problems = [];
      for (const [label, on] of Object.entries(want)) {
        const r = rows.find((x) => x.label === label);
        if (!r) { problems.push(`${when}: no item ${label}`); continue; }
        if (r.ariaChecked !== String(on)) problems.push(`${when}: ${label} aria-checked=${r.ariaChecked}, expected ${on}`);
        if (r.state !== (on ? "checked" : "unchecked")) problems.push(`${when}: ${label} data-state=${r.state}`);
        if (r.indicator !== on) problems.push(`${when}: ${label} ${r.indicator ? "shows" : "lacks"} its indicator`);
      }
      const radiosOn = rows.filter((x) => x.slot === "dropdown-menu-radio-item" && x.ariaChecked === "true").length;
      if (rows.some((x) => x.slot === "dropdown-menu-radio-item") && radiosOn !== 1) problems.push(`${when}: ${radiosOn} radio items are checked, expected exactly 1`);
      return problems;
    };
    const problems = [];
    await open("model-selector");
    await waitOpen(page);
    problems.push(...check(await read(), { Pro: false, Standard: true, Fast: false, "Extended thinking": true }, "model-selector at first"));
    await clickCentre(page, itemByLabel(page, "Pro"));
    await waitClosed(page);
    await clickCentre(page, page.locator(TRIGGER));
    await waitOpen(page);
    problems.push(...check(await read(), { Pro: true, Standard: false, Fast: false, "Extended thinking": true }, "after choosing Pro"));
    await clickCentre(page, itemByLabel(page, "Extended thinking"));
    await waitClosed(page);
    await clickCentre(page, page.locator(TRIGGER));
    await waitOpen(page);
    problems.push(...check(await read(), { Pro: true, Standard: false, Fast: false, "Extended thinking": false }, "after turning Extended thinking off"));
    const ev = await events(page, "model-selector");
    expect.deepEqual(ev.valueChange, ["pro"], "choosing Pro reports the value pro once");
    expect.deepEqual(ev.checkedChange, [["Extended thinking", false]], "choosing Extended thinking reports false once");
    await open("grouped");
    await waitOpen(page);
    problems.push(...check(await read(), { "Archived chats": true, "Shared chats": false }, "grouped"));
    await open("disabled-items");
    await waitOpen(page);
    problems.push(...check(await read(), { Pinned: true, Pro: false, Standard: true }, "disabled-items"));
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-glyphs-hidden": async ({ page, open, expect }) => {
    const seen = {};
    const problems = [];
    for (const id of ["with-descriptions", "with-shortcuts", "model-selector", "grouped", "actions", "disabled-items"]) {
      await open(id);
      await waitOpen(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-slot~="dropdown-menu-item-indicator"], [data-slot~="dropdown-menu-icon-start"], [data-slot~="dropdown-menu-icon-end"], [data-slot~="dropdown-menu-item-shortcut"]')].map((e) => ({ slot: e.getAttribute("data-slot"), hidden: e.getAttribute("aria-hidden") })));
      for (const r of rows) {
        seen[r.slot] = (seen[r.slot] ?? 0) + 1;
        if (r.hidden !== "true") problems.push(`${id}: a ${r.slot} has aria-hidden=${r.hidden}`);
      }
    }
    for (const slot of ["dropdown-menu-item-indicator", "dropdown-menu-icon-start", "dropdown-menu-icon-end", "dropdown-menu-item-shortcut"]) if (!seen[slot]) problems.push(`no ${slot} was rendered, so it could not be checked`);
    expect.deepEqual(problems, [], `${JSON.stringify(seen)}; ${problems.join("; ")}`);
  },

  "dropdown-menu-shortcut-exposed": async ({ page, open, expect }) => {
    // aria-keyshortcuts is key names joined by "+" (ARIA 1.2, KeyboardEvent.key values), never the hint's glyphs.
    // The expected value is worked out here from the hint, with this test's own table, not the component's.
    const NAMES = { "⌘": "Meta", "⇧": "Shift", "⌥": "Alt", "⌃": "Control", "⌫": "Backspace" };
    const expected = (hint) => {
      const keys = [];
      let rest = "";
      for (const ch of hint) { if (NAMES[ch]) keys.push(NAMES[ch]); else rest += ch; }
      return [...keys, ...(rest ? [rest.toUpperCase()] : [])].join("+");
    };
    const SYNTAX = /^[A-Za-z0-9]+(\+[A-Za-z0-9]+)*$/;
    const problems = [];
    let withShortcut = 0;
    for (const id of ["with-shortcuts", "disabled-items", "long-label", "right-to-left", "actions", "worst-case-320"]) {
      await open(id);
      await waitOpen(page);
      const rows = await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => ({ label: e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent, hint: e.querySelector('[data-slot~="dropdown-menu-item-shortcut"]')?.textContent ?? null, keys: e.getAttribute("aria-keyshortcuts") })), ITEMS);
      for (const r of rows) {
        if (r.hint === null) {
          if (r.keys !== null) problems.push(`${id} "${r.label}": no hint but aria-keyshortcuts is ${JSON.stringify(r.keys)}`);
          continue;
        }
        withShortcut++;
        if (r.keys === null || !SYNTAX.test(r.keys)) problems.push(`${id} "${r.label}": aria-keyshortcuts ${JSON.stringify(r.keys)} is not key names joined by "+"`);
        else if (r.keys !== expected(r.hint)) problems.push(`${id} "${r.label}": the hint ${JSON.stringify(r.hint)} should give aria-keyshortcuts ${JSON.stringify(expected(r.hint))}, not ${JSON.stringify(r.keys)}`);
      }
    }
    expect.ok(withShortcut >= 7, `${withShortcut} items with a shortcut hint were checked`);
    // Edge cases no example carries, through a test hook: the plus key is "Plus" (ARIA 1.2), and a sequence of two
    // shortcuts gets no attribute, because a space in aria-keyshortcuts separates alternatives, not steps.
    await open("closed");
    const EDGE = { "⌘+": "Meta+Plus", "Ctrl++": "Control+Plus", "⌘⇧+": "Meta+Shift+Plus", "Ctrl+Shift+P": "Control+Shift+P", "⌘K ⌘S": null, "Ctrl+K Ctrl+S": null };
    await page.evaluate((hints) => window.__dropdownMenuFixtures.mountShortcuts(hints), Object.keys(EDGE));
    await waitOpen(page);
    const edge = await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => ({ hint: e.querySelector('[data-slot~="dropdown-menu-item-shortcut"]')?.textContent ?? null, keys: e.getAttribute("aria-keyshortcuts") })), ITEMS);
    if (edge.length !== Object.keys(EDGE).length) problems.push(`the hook mounted ${edge.length} items, expected ${Object.keys(EDGE).length}`);
    for (const r of edge) {
      const want = EDGE[r.hint];
      if (want === undefined) problems.push(`unexpected hint ${JSON.stringify(r.hint)}`);
      else if (r.keys !== want) problems.push(`the hint ${JSON.stringify(r.hint)} should give aria-keyshortcuts ${JSON.stringify(want)}, not ${JSON.stringify(r.keys)}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-trigger-enter-opens": async ({ page, open, expect }) => {
    for (const [id, first] of [["closed", "Rename chat"], ["highlighted-keyboard", "Rename chat"]]) {
      await open(id);
      await openByKey(page, expect, "Enter");
      const a = await active(page);
      expect.equal(a.label, first, `${id}: Enter opens with focus on the first enabled item (focus is on ${a.label ?? a.what})`);
      expect.equal(a.highlighted, true, `${id}: the first item carries data-highlighted`);
      expect.deepEqual(await highlightedLabels(page), [first], `${id}: exactly one item is highlighted`);
    }
  },

  "dropdown-menu-trigger-space-opens": async ({ page, open, expect }) => {
    for (const [id, first] of [["closed", "Rename chat"], ["highlighted-keyboard", "Rename chat"]]) {
      await open(id);
      await openByKey(page, expect, " ");
      const a = await active(page);
      expect.equal(a.label, first, `${id}: Space opens with focus on the first enabled item (focus is on ${a.label ?? a.what})`);
      expect.equal(a.highlighted, true, `${id}: the first item carries data-highlighted`);
      expect.deepEqual(await highlightedLabels(page), [first], `${id}: exactly one item is highlighted`);
    }
  },

  "dropdown-menu-trigger-arrowdown-opens": async ({ page, open, expect }) => {
    for (const [id, first] of [["closed", "Rename chat"], ["highlighted-keyboard", "Rename chat"]]) {
      await open(id);
      await openByKey(page, expect, "ArrowDown");
      const a = await active(page);
      expect.equal(a.label, first, `${id}: ArrowDown opens with focus on the first enabled item (focus is on ${a.label ?? a.what})`);
      expect.equal(a.highlighted, true, `${id}: the first item carries data-highlighted`);
      expect.deepEqual(await highlightedLabels(page), [first], `${id}: exactly one item is highlighted`);
    }
  },

  "dropdown-menu-arrowdown-next": async ({ page, open, expect }) => {
    await open("highlighted-keyboard");
    await openByKey(page, expect);
    const path = [await activeLabel(page)];
    for (let i = 0; i < 4; i++) { await press(page, "ArrowDown"); path.push(await activeLabel(page)); }
    expect.deepEqual(path, ["Rename chat", "Delete chat", "Extended thinking", "Standard", "Standard"], "ArrowDown walks the items, skips the separator and stays on the last item");
    expect.deepEqual(await highlightedLabels(page), ["Standard"], "only the last item is highlighted");
    await open("disabled-items");
    await waitOpen(page);
    const skip = [];
    for (let i = 0; i < 3; i++) { await press(page, "ArrowDown"); skip.push(await activeLabel(page)); }
    expect.deepEqual(skip, ["Rename chat", "Standard", "Standard"], "ArrowDown skips the four disabled items and stays on the last enabled one");
  },

  "dropdown-menu-arrowup-previous": async ({ page, open, expect }) => {
    await open("highlighted-keyboard");
    await openByKey(page, expect);
    await press(page, "End");
    const path = [await activeLabel(page)];
    for (let i = 0; i < 4; i++) { await press(page, "ArrowUp"); path.push(await activeLabel(page)); }
    expect.deepEqual(path, ["Standard", "Extended thinking", "Delete chat", "Rename chat", "Rename chat"], "ArrowUp walks back, skips the separator and stays on the first item");
    await open("disabled-items");
    await waitOpen(page);
    const skip = [];
    for (let i = 0; i < 3; i++) { await press(page, "ArrowUp"); skip.push(await activeLabel(page)); }
    expect.deepEqual(skip, ["Standard", "Rename chat", "Rename chat"], "from the content ArrowUp highlights the last enabled item, then skips the disabled items and stays on the first");
  },

  "dropdown-menu-home-first": async ({ page, open, expect }) => {
    const seen = [];
    for (const which of ["Home", "PageUp"]) {
      await open("highlighted-keyboard");
      await openByKey(page, expect);
      await press(page, "End");
      expect.equal(await activeLabel(page), "Standard", "End reached the last item before the test key");
      await press(page, which);
      seen.push([which, await activeLabel(page), (await active(page)).highlighted]);
    }
    await open("disabled-items");
    await waitOpen(page);
    await press(page, "End");
    await press(page, "Home");
    seen.push(["Home in disabled-items", await activeLabel(page), (await active(page)).highlighted]);
    expect.deepEqual(seen, [["Home", "Rename chat", true], ["PageUp", "Rename chat", true], ["Home in disabled-items", "Rename chat", true]], `seen: ${JSON.stringify(seen)}`);
  },

  "dropdown-menu-end-last": async ({ page, open, expect }) => {
    const seen = [];
    for (const which of ["End", "PageDown"]) {
      await open("highlighted-keyboard");
      await openByKey(page, expect);
      expect.equal(await activeLabel(page), "Rename chat", "the menu opened on the first item");
      await press(page, which);
      seen.push([which, await activeLabel(page), (await active(page)).highlighted]);
    }
    await open("disabled-items");
    await waitOpen(page);
    await press(page, "Home");
    await press(page, "PageDown");
    seen.push(["PageDown in disabled-items", await activeLabel(page), (await active(page)).highlighted]);
    expect.deepEqual(seen, [["End", "Standard", true], ["PageDown", "Standard", true], ["PageDown in disabled-items", "Standard", true]], `seen: ${JSON.stringify(seen)}`);
  },

  "dropdown-menu-enter-selects": async ({ page, open, expect }) => {
    await open("closed");
    await openByKey(page, expect);
    await press(page, "ArrowDown");
    expect.equal(await activeLabel(page), "Share", "ArrowDown highlighted Share");
    await press(page, "Enter");
    await waitClosed(page);
    expect.deepEqual((await events(page, "closed")).select, ["Share"], "Enter on Share calls its handler once");
    expect.equal((await active(page)).what, "trigger", "focus is back on the trigger");
    await open("highlighted-keyboard");
    await openByKey(page, expect);
    await press(page, "End");
    await press(page, "ArrowUp");
    expect.equal(await activeLabel(page), "Extended thinking", "the checkbox item is highlighted");
    await press(page, "Enter");
    await waitClosed(page);
    expect.deepEqual((await events(page, "highlighted-keyboard")).checkedChange, [["Extended thinking", false]], "Enter on the checkbox item toggles it once");
    expect.equal((await active(page)).what, "trigger", "focus is back on the trigger after the checkbox item");
  },

  "dropdown-menu-space-selects": async ({ page, open, expect }) => {
    await open("closed");
    await openByKey(page, expect);
    await press(page, "ArrowDown");
    expect.equal(await activeLabel(page), "Share", "ArrowDown highlighted Share");
    await press(page, " ");
    await waitClosed(page);
    expect.deepEqual((await events(page, "closed")).select, ["Share"], "Space on Share calls its handler once");
    expect.equal((await active(page)).what, "trigger", "focus is back on the trigger");
    await open("model-selector");
    await waitOpen(page);
    await press(page, "ArrowDown");
    expect.equal(await activeLabel(page), "Pro", "ArrowDown highlighted the Pro radio item");
    await press(page, " ");
    await waitClosed(page);
    expect.deepEqual((await events(page, "model-selector")).valueChange, ["pro"], "Space on the radio item chooses it once");
    expect.equal((await active(page)).what, "trigger", "focus is back on the trigger after the radio item");
  },

  "dropdown-menu-escape-closes": async ({ page, open, expect }) => {
    await open("closed");
    await openByKey(page, expect);
    await press(page, "ArrowDown");
    await press(page, "Escape");
    await waitClosed(page);
    const ev = await events(page, "closed");
    expect.equal(ev.select, undefined, "Escape calls no item's handler");
    expect.deepEqual(ev.openChange, [true, false], "the menu reported open, then closed");
    expect.equal((await active(page)).what, "trigger", "focus is on the trigger after Escape");
    await open("actions");
    await waitOpen(page);
    await press(page, "Escape");
    await waitClosed(page);
    expect.equal((await events(page, "actions")).select, undefined, "Escape on a menu rendered open calls no handler");
    expect.equal((await active(page)).what, "trigger", "focus moves to the trigger when a menu rendered open is closed by Escape");
  },

  "dropdown-menu-tab-held": async ({ page, open, expect }) => {
    await open("closed");
    await openByKey(page, expect);
    for (const which of ["Tab", "Shift+Tab"]) {
      await press(page, which);
      const a = await active(page);
      expect.equal(a.label, "Rename chat", `after ${which} focus is still on the highlighted item (it is on ${a.label ?? a.what})`);
      expect.equal(a.highlighted, true, `after ${which} the item is still highlighted`);
      expect.equal(await isOpen(page), true, `after ${which} the menu is still open`);
      expect.equal(await page.locator(TRIGGER).getAttribute("aria-expanded"), "true", `after ${which} aria-expanded is still true`);
    }
  },

  "dropdown-menu-type-ahead": async ({ page, open, expect }) => {
    const seen = [];
    await open("closed");
    await openByKey(page, expect);
    await typeKeys(page, "s");
    seen.push(["closed s", await activeLabel(page)]);
    await open("highlighted-keyboard");
    await openByKey(page, expect);
    await typeKeys(page, "d");
    seen.push(["d", await activeLabel(page)]);
    await pause(page, 1100);
    await typeKeys(page, "ext");
    seen.push(["ext", await activeLabel(page)]);
    await pause(page, 1100);
    await typeKeys(page, "st");
    seen.push(["st", await activeLabel(page)]);
    // Disabled items are never matched: Share, Pinned and Pro are disabled.
    await open("disabled-items");
    await waitOpen(page);
    await press(page, "ArrowDown");
    seen.push(["disabled-items start", await activeLabel(page)]);
    await typeKeys(page, "s");
    seen.push(["s skips the disabled Share", await activeLabel(page)]);
    await pause(page, 1100);
    await typeKeys(page, "p");
    seen.push(["p matches only disabled items", await activeLabel(page)]);
    expect.deepEqual(seen, [
      ["closed s", "Share"], ["d", "Delete chat"], ["ext", "Extended thinking"], ["st", "Standard"],
      ["disabled-items start", "Rename chat"], ["s skips the disabled Share", "Standard"], ["p matches only disabled items", "Standard"],
    ], `seen: ${JSON.stringify(seen)}`);
    expect.deepEqual(await highlightedLabels(page), ["Standard"], "no disabled item was highlighted");
  },

  "dropdown-menu-focus-returns": async ({ page, open, expect }) => {
    const seen = [];
    // Escape after a keyboard open.
    await open("closed");
    await openByKey(page, expect);
    await press(page, "Escape");
    await waitClosed(page);
    seen.push(["Escape", (await active(page)).what]);
    // Choosing by Enter.
    await open("closed");
    await openByKey(page, expect);
    await press(page, "Enter");
    await waitClosed(page);
    seen.push(["Enter on an item", (await active(page)).what]);
    // Choosing by pointer after a pointer open.
    await open("closed");
    await clickCentre(page, page.locator(TRIGGER));
    await waitOpen(page);
    await clickCentre(page, itemByLabel(page, "Share"));
    await waitClosed(page);
    seen.push(["click on an item", (await active(page)).what]);
    // A menu rendered open, closed by choosing.
    await open("with-shortcuts");
    await waitOpen(page);
    await press(page, "ArrowDown");
    await press(page, "Enter");
    await waitClosed(page);
    seen.push(["Enter in a menu rendered open", (await active(page)).what]);
    expect.deepEqual(seen, [["Escape", "trigger"], ["Enter on an item", "trigger"], ["click on an item", "trigger"], ["Enter in a menu rendered open", "trigger"]], `seen: ${JSON.stringify(seen)}`);
    expect.deepEqual((await events(page, "with-shortcuts")).select, ["Copy"], "control: the item chosen in the last case was Copy");
  },

  "dropdown-menu-pointer-open-focus": async ({ page, open, expect }) => {
    await open("closed");
    await clickCentre(page, page.locator(TRIGGER));
    await waitOpen(page);
    expect.equal((await active(page)).what, "content", "opened by pointer, focus is on the content");
    expect.deepEqual(await highlightedLabels(page), [], "no item is highlighted after a pointer open");
    await hover(page, itemByLabel(page, "Share"));
    expect.deepEqual(await highlightedLabels(page), ["Share"], "moving the mouse over Share highlights it");
    expect.equal(await activeLabel(page), "Share", "and focuses it");
    await open("closed");
    await clickCentre(page, page.locator(TRIGGER));
    await waitOpen(page);
    await press(page, "ArrowDown");
    expect.deepEqual(await highlightedLabels(page), ["Rename chat"], "ArrowDown after a pointer open highlights the first item");
  },

  "dropdown-menu-disabled-inert": async ({ page, open, expect }) => {
    await open("disabled-items");
    await waitOpen(page);
    const attrs = await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => [e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent, e.getAttribute("aria-disabled"), e.hasAttribute("data-disabled")]), ITEMS);
    expect.deepEqual(attrs, [["Rename chat", null, false], ["Share", "true", true], ["Pinned", "true", true], ["Delete chat", "true", true], ["Pro", "true", true], ["Standard", null, false]], "the four disabled items carry aria-disabled and data-disabled; the live ones do not");
    // Control: the live item highlights under the mouse and counts a click.
    await hover(page, itemByLabel(page, "Rename chat"));
    expect.deepEqual(await highlightedLabels(page), ["Rename chat"], "control: the mouse highlights a live item");
    await clickCentre(page, itemByLabel(page, "Rename chat"));
    await waitClosed(page);
    expect.deepEqual((await events(page, "disabled-items")).select, ["Rename chat"], "control: a click on a live item counts once");
    // The disabled ones.
    await open("disabled-items");
    await waitOpen(page);
    const problems = [];
    for (const label of ["Share", "Pinned", "Delete chat", "Pro"]) {
      const item = itemByLabel(page, label);
      await hover(page, item);
      const lit = await highlightedLabels(page);
      if (lit.length) problems.push(`the mouse over ${label} highlights ${lit.join(", ")}`);
      await clickCentre(page, item);
      await pause(page, 50);
      if (!(await isOpen(page))) { problems.push(`a click on ${label} closed the menu`); break; }
    }
    const ev = await events(page, "disabled-items");
    if (ev.select) problems.push(`select was called with ${JSON.stringify(ev.select)}`);
    if (ev.checkedChange) problems.push(`checkedChange was called with ${JSON.stringify(ev.checkedChange)}`);
    if (ev.valueChange) problems.push(`valueChange was called with ${JSON.stringify(ev.valueChange)}`);
    expect.deepEqual(problems, [], problems.join("; "));
    expect.equal(await page.locator(TRIGGER).getAttribute("aria-expanded"), "true", "the menu is still open after pressing every disabled item");
  },

  "dropdown-menu-highlight-one-look": async ({ page, open, expect }) => {
    const order = ["Rename chat", "Delete chat", "Extended thinking", "Standard"];
    const problems = [];
    for (const theme of ["light", "dark"]) {
      for (let i = 0; i < order.length; i++) {
        const label = order[i];
        await open("highlighted-keyboard", { theme });
        await page.evaluate(inPageColour);
        await openByKey(page, expect);
        for (let k = 0; k < i; k++) await press(page, "ArrowDown");
        if ((await activeLabel(page)) !== label) { problems.push(`${theme}: ArrowDown did not reach ${label}`); continue; }
        const byKey = await highlightLook(page, '[data-highlighted]');
        await open("highlighted-keyboard", { theme });
        await page.evaluate(inPageColour);
        await clickCentre(page, page.locator(TRIGGER));
        await waitOpen(page);
        const resting = await page.evaluate(({ sel }) => getComputedStyle(document.querySelectorAll(sel)[0]).backgroundColor, { sel: ITEMS });
        await hover(page, itemByLabel(page, label));
        if ((await highlightedLabels(page)).join() !== label) { problems.push(`${theme}: the mouse did not highlight ${label}`); continue; }
        const mouse = await highlightLook(page, '[data-highlighted]');
        if (byKey.background !== mouse.background) problems.push(`${theme} ${label}: background ${byKey.background} by keyboard, ${mouse.background} by mouse`);
        if (byKey.color !== mouse.color) problems.push(`${theme} ${label}: text ${byKey.color} by keyboard, ${mouse.color} by mouse`);
        if (i === 0 && resting === byKey.background) problems.push(`${theme}: the highlighted and resting backgrounds are both ${resting}, so this comparison means nothing`);
      }
    }
    const hoverRules = (await allSelectors(page)).filter((s) => /dropdown-menu/.test(s) && /:hover|:focus(?!-within)/.test(s));
    if (hoverRules.length) problems.push(`stylesheet rules style menu parts with :hover or :focus: ${hoverRules.join(" | ")}`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-highlight-visible": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const theme of ["light", "dark"]) {
      await open("highlighted-keyboard", { theme });
      await page.evaluate(inPageColour);
      await openByKey(page, expect);
      for (const label of ["Rename chat", "Delete chat", "Extended thinking", "Standard"]) {
        const r = await highlightLook(page, "[data-highlighted]");
        measured++;
        if (r.fillRatio < 3) problems.push(`${theme} ${label}: highlight ${r.fill} on content ${r.contentBg} is ${r.fillRatio.toFixed(2)} to 1, needs 3`);
        await press(page, "ArrowDown");
      }
    }
    expect.equal(measured, 8, `measured ${measured} highlighted items`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-highlight-not-colour-alone": async ({ page, open, expect }) => {
    const problems = [];
    for (const theme of ["light", "dark"]) {
      await open("highlighted-keyboard", { theme });
      await page.evaluate(inPageColour);
      const restingInk = {};
      await clickCentre(page, page.locator(TRIGGER));
      await waitOpen(page);
      for (const r of await page.evaluate(({ items, label }) => [...document.querySelectorAll(items)].map((e) => [e.querySelector(label).textContent, getComputedStyle(e.querySelector(label)).color]), { items: ITEMS, label: LABEL })) restingInk[r[0]] = r[1];
      await press(page, "Escape");
      await waitClosed(page);
      await openByKey(page, expect);
      for (const label of ["Rename chat", "Delete chat", "Extended thinking", "Standard"]) {
        const m = await page.evaluate(({ content, label }) => {
          const C = window.__ddColour;
          const el = document.activeElement, box = document.querySelector(content);
          const cs = getComputedStyle(box);
          const inner = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const fill = C.backgroundOf(el), behind = C.backgroundOf(box);
          const text = el.querySelector(label);
          const ink = C.over(C.parse(getComputedStyle(text).color), fill);
          return { width: el.getBoundingClientRect().width, inner, alpha: C.parse(getComputedStyle(el).backgroundColor)[3], fillRatio: C.ratio(fill, behind), textRatio: C.ratio(ink, fill), ink: getComputedStyle(text).color, fill: C.hex(fill) };
        }, { content: CONTENT, label: LABEL });
        const at = `${theme} ${label}`;
        if (m.alpha < 1) problems.push(`${at}: the highlight fill is not opaque (alpha ${m.alpha})`);
        if (Math.abs(m.width - m.inner) > 1) problems.push(`${at}: the fill is ${m.width} px wide, the content's inner width is ${m.inner} px`);
        if (m.fillRatio < 3) problems.push(`${at}: the fill ${m.fill} is ${m.fillRatio.toFixed(2)} to 1 against the content, needs 3`);
        if (m.ink === restingInk[label]) problems.push(`${at}: the text stays ${m.ink}; it must invert against the fill`);
        if (m.textRatio < 4.5) problems.push(`${at}: the text is ${m.textRatio.toFixed(2)} to 1 on the fill, needs 4.5`);
        await press(page, "ArrowDown");
      }
    }
    // Forced colours: the outline replaces the fill.
    await open("highlighted-keyboard");
    await page.emulateMedia({ forcedColors: "active" });
    expect.equal(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), true, "the page sees forced colours, so the outline measurement means something");
    await openByKey(page, expect);
    const outline = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0 }; });
    if (outline.style !== "solid" || outline.width < 2) problems.push(`forced colours: the highlighted item's outline is ${outline.style} ${outline.width} px`);
    await page.emulateMedia({ forcedColors: "none" });
    // A checked item shows its glyph, never only a colour.
    await open("model-selector");
    await waitOpen(page);
    const glyphs = await page.evaluate(() => [...document.querySelectorAll('[data-slot~="dropdown-menu-checkbox-item"], [data-slot~="dropdown-menu-radio-item"]')].map((e) => {
      const g = e.querySelector('[data-slot~="dropdown-menu-item-indicator"] svg');
      const r = g ? g.getBoundingClientRect() : null;
      return [e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent, e.getAttribute("aria-checked"), !!r && r.width >= 8 && r.height >= 8 && g.checkVisibility()];
    }));
    for (const [label, checked, drawn] of glyphs) if ((checked === "true") !== drawn) problems.push(`${label} is aria-checked=${checked} but its glyph is ${drawn ? "drawn" : "not drawn"}`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-text-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    const TEXT = '[data-slot~="dropdown-menu-item-label"], [data-slot~="dropdown-menu-item-description"], [data-slot~="dropdown-menu-item-shortcut"], [data-slot~="dropdown-menu-label"]';
    const measure = (where) => page.evaluate(({ text, where }) => {
      const C = window.__ddColour;
      const out = [];
      for (const el of document.querySelectorAll(text)) {
        if (el.closest('[aria-disabled="true"]')) continue;
        const r = C.textPair(el);
        out.push({ where: `${where} ${el.getAttribute("data-slot").replace("dropdown-menu-", "")} "${el.textContent.slice(0, 24)}"`, ...r });
      }
      return out;
    }, { text: TEXT, where });
    for (const theme of ["light", "dark"]) {
      for (const id of ["actions", "model-selector", "with-descriptions", "with-shortcuts", "grouped", "disabled-items", "right-to-left", "worst-case-320"]) {
        await open(id, { theme });
        await waitOpen(page);
        await page.evaluate(inPageColour);
        const all = [...(await measure(`${theme} ${id} resting`))];
        const count = await page.evaluate((items) => [...document.querySelectorAll(items)].filter((e) => !e.hasAttribute("data-disabled")).length, ITEMS);
        await press(page, "ArrowDown");
        for (let i = 0; i < count; i++) {
          all.push(...(await measure(`${theme} ${id} with "${await activeLabel(page)}" highlighted`)));
          await press(page, "ArrowDown");
        }
        for (const r of all) { measured++; if (r.ratio < 4.5) problems.push(`${r.where}: ${r.ink} on ${r.bg} is ${Math.floor(r.ratio * 100) / 100} to 1`); }
      }
    }
    expect.ok(measured > 200, `measured ${measured} text and background pairs`);
    expect.deepEqual(problems, [], `${problems.length} of ${measured} pairs are under 4.5 to 1: ${problems.join("; ")}`);
  },

  "dropdown-menu-forced-colors-highlight": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["highlighted-keyboard", "disabled-items"]) {
      await open(id);
      await page.emulateMedia({ forcedColors: "active" });
      expect.equal(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), true, "the page sees forced colours");
      if (id === "highlighted-keyboard") await openByKey(page, expect);
      else { await waitOpen(page); await press(page, "ArrowDown"); }
      const steps = id === "highlighted-keyboard" ? 4 : 2;
      for (let i = 0; i < steps; i++) {
        const rows = await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => { const cs = getComputedStyle(e); return { label: e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent, lit: e.hasAttribute("data-highlighted"), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0 }; }), ITEMS);
        const lit = rows.filter((r) => r.lit);
        if (lit.length !== 1) problems.push(`${id} step ${i + 1}: ${lit.length} items highlighted`);
        for (const r of rows) {
          const drawn = r.style !== "none" && r.style !== "hidden" && r.width > 0;
          if (r.lit && (r.style !== "solid" || r.width < 2)) problems.push(`${id}: highlighted ${r.label} has outline ${r.style} ${r.width} px; needs solid, at least 2 px`);
          if (!r.lit && drawn) problems.push(`${id}: ${r.label}, not highlighted, has outline ${r.style} ${r.width} px`);
        }
        await press(page, "ArrowDown");
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-target-size": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const width of [320, 1280]) {
      for (const id of OPEN_EXAMPLES) {
        await open(id, { width });
        await waitOpen(page);
        const rows = await page.evaluate(({ items, content }) => {
          const box = document.querySelector(content);
          const cs = getComputedStyle(box);
          const inner = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          return [...document.querySelectorAll(items)].map((e) => { const r = e.getBoundingClientRect(); return { label: e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent.slice(0, 24), width: r.width, height: r.height, inner }; });
        }, { items: ITEMS, content: CONTENT });
        for (const r of rows) {
          measured++;
          if (r.height < 24 - 0.01) problems.push(`${id} at ${width}: "${r.label}" is ${r.height} px tall`);
          if (Math.abs(r.width - r.inner) > 1) problems.push(`${id} at ${width}: "${r.label}" is ${r.width} px wide; the content's inner width is ${r.inner} px`);
        }
      }
    }
    expect.ok(measured >= 60, `measured ${measured} items`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-touch-target": async ({ page, open, expect }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    const problems = [];
    let measured = 0;
    for (const id of ["touch", "model-selector", "with-shortcuts", "grouped", "worst-case-320"]) {
      await open(id, { width: 375 });
      expect.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the page sees a coarse pointer, so the measurement means something");
      await waitOpen(page);
      for (const r of await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => [e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent.slice(0, 24), e.getBoundingClientRect().height]), ITEMS)) {
        measured++;
        if (r[1] < 44 - 0.01) problems.push(`${id}: "${r[0]}" is ${r[1]} px tall with a coarse pointer; needs 44`);
      }
    }
    await cdp.detach();
    expect.ok(measured >= 14, `measured ${measured} items`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-item-layout": async ({ page, open, expect }) => {
    const problems = [];
    const read = () => page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => {
      const part = (slot) => { const p = e.querySelector(`:scope > [data-slot~="dropdown-menu-${slot}"]`); if (!p) return null; const r = p.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, ws: getComputedStyle(p).whiteSpace }; };
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return {
        label: e.querySelector('[data-slot~="dropdown-menu-item-label"]').textContent.slice(0, 24),
        innerLeft: r.left + parseFloat(cs.paddingLeft), innerRight: r.right - parseFloat(cs.paddingRight),
        parts: { lead: part("icon-start") ?? part("indicator-box"), text: part("item-label"), description: part("item-description"), end: part("icon-end"), shortcut: part("item-shortcut") },
      };
    }), ITEMS);
    const near = (a, b) => Math.abs(a - b) <= 1;
    const checkRow = (id, row, rtl) => {
      const at = `${id} "${row.label}"`;
      const { lead, text, description, end, shortcut } = row.parts;
      // Reading order along the row: start edge first.
      const seq = [lead, text, end, shortcut].filter(Boolean);
      for (let i = 1; i < seq.length; i++) {
        const before = seq[i - 1], after = seq[i];
        if (rtl ? !(after.right <= before.left + 0.5) : !(after.left >= before.right - 0.5)) problems.push(`${at}: parts are out of reading order (${JSON.stringify(seq.map((p) => Math.round(rtl ? p.right : p.left)))})`);
      }
      const startEdge = rtl ? row.innerRight : row.innerLeft;
      const first = seq[0];
      if (!near(rtl ? first.right : first.left, startEdge)) problems.push(`${at}: the first part starts ${Math.abs((rtl ? first.right : first.left) - startEdge).toFixed(1)} px from the start edge`);
      if (lead && !(near(lead.width, 16) && near(lead.height, 16))) problems.push(`${at}: the lead is ${lead.width} by ${lead.height} px, not 16 by 16`);
      if (end && !(near(end.width, 16) && near(end.height, 16))) problems.push(`${at}: iconEnd is ${end.width} by ${end.height} px, not 16 by 16`);
      if (description) {
        if (!(description.top >= text.bottom - 0.5)) problems.push(`${at}: the description is not under the label`);
        if (!near(rtl ? description.right : description.left, rtl ? text.right : text.left)) problems.push(`${at}: the description does not line up with the label`);
      }
      const last = shortcut ?? end ?? null;
      const endEdge = rtl ? row.innerLeft : row.innerRight;
      if (shortcut && !near(rtl ? shortcut.left : shortcut.right, endEdge)) problems.push(`${at}: the shortcut ends ${Math.abs((rtl ? shortcut.left : shortcut.right) - endEdge).toFixed(1)} px from the end edge`);
      if (shortcut && shortcut.ws !== "nowrap") problems.push(`${at}: the shortcut has white-space ${shortcut.ws}`);
      if (!last && !near(rtl ? text.left : text.right, endEdge)) problems.push(`${at}: the label column stops ${Math.abs((rtl ? text.left : text.right) - endEdge).toFixed(1)} px short of the end edge`);
      if (last) { const gapToLast = rtl ? text.left - (end ?? shortcut).right : (end ?? shortcut).left - text.right; if (gapToLast > 9) problems.push(`${at}: the label column stops ${gapToLast.toFixed(1)} px before the next part; it must take the remaining width`); }
    };
    for (const [id, width, rtl] of [["with-descriptions", 1280, false], ["with-shortcuts", 1280, false], ["grouped", 1280, false], ["model-selector", 1280, false], ["right-to-left", 1280, true], ["worst-case-320", 320, false], ["long-label", 320, false]]) {
      await open(id, { width });
      await waitOpen(page);
      const rows = await read();
      for (const row of rows) checkRow(id, row, rtl);
      if (id === "with-shortcuts") {
        const plain = rows.find((r) => r.label === "Select all"), withIcon = rows.find((r) => r.label === "Copy");
        if (plain && !near(plain.parts.text.left, plain.innerLeft)) problems.push(`with-shortcuts: Select all, which has no icon, starts its label ${(plain.parts.text.left - plain.innerLeft).toFixed(1)} px in from the padding`);
        if (withIcon && !(withIcon.parts.text.left > withIcon.parts.lead.right)) problems.push("with-shortcuts: Copy's label does not follow its icon");
      }
      if (id === "grouped") {
        const on = rows.find((r) => r.label === "Archived chats"), off = rows.find((r) => r.label === "Shared chats");
        if (!off?.parts.lead) problems.push("grouped: the unchecked Shared chats has no indicator box");
        else if (!near(on.parts.text.left, off.parts.text.left)) problems.push(`grouped: checked and unchecked labels start at ${on.parts.text.left} and ${off.parts.text.left} px`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-label-wraps": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, width] of [["long-label", 320], ["long-label", 375], ["long-label", 1280], ["worst-case-320", 320]]) {
      await open(id, { width });
      await waitOpen(page);
      const rows = await page.evaluate((items) => [...document.querySelectorAll(items)].map((e) => {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        const inner = { left: r.left + parseFloat(cs.paddingLeft), right: r.right - parseFloat(cs.paddingRight), top: r.top + parseFloat(cs.paddingTop), bottom: r.bottom - parseFloat(cs.paddingBottom) };
        const lines = (el) => { const range = document.createRange(); range.selectNodeContents(el); return new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size; };
        const text = [...e.querySelectorAll('[data-slot~="dropdown-menu-item-label"], [data-slot~="dropdown-menu-item-description"]')].map((t) => {
          const b = t.getBoundingClientRect();
          let clipped = null;
          for (let x = t; x && x !== e; x = x.parentElement) { const o = getComputedStyle(x); if ([o.overflowX, o.overflowY].some((v) => v !== "visible") || o.textOverflow === "ellipsis") clipped = x.getAttribute("data-slot"); }
          return { slot: t.getAttribute("data-slot").replace("dropdown-menu-", ""), lines: lines(t), left: b.left, right: b.right, top: b.top, bottom: b.bottom, scrollW: t.scrollWidth, clientW: t.clientWidth, clipped };
        });
        const sc = e.querySelector('[data-slot~="dropdown-menu-item-shortcut"]');
        const label = e.querySelector('[data-slot~="dropdown-menu-item-label"]');
        const firstLine = (() => { const range = document.createRange(); range.selectNodeContents(label); const rects = [...range.getClientRects()]; return rects.length ? rects[0] : null; })();
        const s = sc ? sc.getBoundingClientRect() : null;
        return { name: label.textContent.slice(0, 24), height: r.height, inner, text, shortcut: s && { left: s.left, right: s.right, top: s.top, bottom: s.bottom }, firstLine: firstLine && { top: firstLine.top, bottom: firstLine.bottom } };
      }), ITEMS);
      const at = (r) => `${id} at ${width} "${r.name}"`;
      const longOnes = rows.filter((r) => r.text.some((t) => t.lines > 1));
      if (width < 1000 && !longOnes.length) problems.push(`${id} at ${width}: no label or description wraps`);
      for (const r of rows) {
        for (const t of r.text) {
          if (t.left < r.inner.left - 0.5 || t.right > r.inner.right + 0.5) problems.push(`${at(r)}: the ${t.slot} (${t.left.toFixed(1)} to ${t.right.toFixed(1)}) leaves the padding (${r.inner.left.toFixed(1)} to ${r.inner.right.toFixed(1)})`);
          if (t.top < r.inner.top - 0.5 || t.bottom > r.inner.bottom + 0.5) problems.push(`${at(r)}: the ${t.slot} (${t.top.toFixed(1)} to ${t.bottom.toFixed(1)}) leaves the padding (${r.inner.top.toFixed(1)} to ${r.inner.bottom.toFixed(1)}); the item is ${r.height} px tall`);
          if (t.scrollW > t.clientW + 1) problems.push(`${at(r)}: the ${t.slot} overflows itself (${t.scrollW} in ${t.clientW} px)`);
          if (t.clipped) problems.push(`${at(r)}: ${t.clipped} around the ${t.slot} hides overflow`);
        }
        if (r.shortcut) {
          const label = r.text.find((t) => t.slot === "item-label");
          if (r.shortcut.left < label.right - 0.5 && r.shortcut.right > label.left + 0.5) problems.push(`${at(r)}: the shortcut overlaps the label`);
          if (r.firstLine && (r.shortcut.top > r.firstLine.bottom || r.shortcut.bottom < r.firstLine.top)) problems.push(`${at(r)}: the shortcut is not on the label's first line`);
        }
      }
      for (const r of longOnes) if (r.height <= 32.5) problems.push(`${at(r)}: wraps but the item is only ${r.height} px tall`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-separator-line": async ({ page, open, expect }) => {
    const problems = [];
    let seen = 0;
    for (const theme of ["light", "dark"]) {
      for (const id of ["actions", "model-selector", "grouped", "worst-case-320"]) {
        await open(id, { theme });
        await waitOpen(page);
        const rows = await page.evaluate((content) => {
          const probe = document.createElement("div");
          probe.style.color = "var(--color-border-primary)";
          document.body.appendChild(probe);
          const token = getComputedStyle(probe).color;
          probe.remove();
          const box = document.querySelector(content);
          const bcs = getComputedStyle(box);
          const innerLeft = box.getBoundingClientRect().left + box.clientLeft + parseFloat(bcs.paddingLeft);
          const innerRight = innerLeft + box.clientWidth - parseFloat(bcs.paddingLeft) - parseFloat(bcs.paddingRight);
          return [...document.querySelectorAll('[data-slot~="dropdown-menu-separator"]')].map((s) => {
            const cs = getComputedStyle(s), r = s.getBoundingClientRect();
            const prev = s.previousElementSibling?.getBoundingClientRect(), next = s.nextElementSibling?.getBoundingClientRect();
            return {
              height: r.height, left: r.left, right: r.right, innerLeft, innerRight, token,
              top: [cs.borderTopStyle, parseFloat(cs.borderTopWidth), cs.borderTopColor],
              others: [cs.borderBottomWidth, cs.borderLeftWidth, cs.borderRightWidth].map(parseFloat),
              above: prev ? r.top - prev.bottom : null, below: next ? next.top - r.bottom : null,
            };
          });
        }, CONTENT);
        for (const s of rows) {
          seen++;
          const at = `${theme} ${id}`;
          if (Math.abs(s.height - 1) > 0.01) problems.push(`${at}: the separator is ${s.height} px tall, not 1`);
          if (s.top[0] !== "solid" || s.top[1] !== 1) problems.push(`${at}: its block-start border is ${s.top[0]} ${s.top[1]} px`);
          if (s.top[2] !== s.token) problems.push(`${at}: its colour is ${s.top[2]}, border/primary/default is ${s.token}`);
          if (s.others.some((w) => w !== 0)) problems.push(`${at}: other borders are ${s.others.join(", ")} px`);
          if (Math.abs(s.left - s.innerLeft) > 0.5 || Math.abs(s.right - s.innerRight) > 0.5) problems.push(`${at}: it spans ${s.left} to ${s.right}, the content's inner width is ${s.innerLeft} to ${s.innerRight}`);
          if (!(s.above > 0) || !(s.below > 0)) problems.push(`${at}: space above ${s.above} px and below ${s.below} px; both must be more than 0`);
        }
      }
    }
    expect.ok(seen >= 8, `measured ${seen} separators`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-above-page": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["actions", "non-modal", "with-shortcuts"]) {
      await open(id);
      await waitOpen(page);
      // A page element with its own stacking level (position relative, z-index 10), as tall as the viewport and first
      // in the body. pointer-events auto, because a modal menu sets none on the body and hit-testing skips such
      // elements, which would make the check pass by measuring nothing.
      await page.evaluate(() => {
        const el = document.createElement("div");
        el.setAttribute("data-test-raised", "");
        el.style.cssText = "position: relative; z-index: 10; block-size: 100vh; inline-size: 100%; pointer-events: auto; background: rgb(255, 0, 255);";
        document.body.prepend(el);
      });
      await settle(page);
      const r = await page.evaluate(({ content, items }) => {
        const c = document.querySelector(content);
        const wrapper = c.parentElement;
        const rows = [...c.querySelectorAll(items)].map((it) => {
          const b = it.getBoundingClientRect();
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return { text: (it.textContent || "").trim(), raised: !!hit?.closest("[data-test-raised]"), inside: !!hit && (it === hit || it.contains(hit)) };
        });
        return { rows, zContent: getComputedStyle(c).zIndex, zWrapper: getComputedStyle(wrapper).zIndex, wrapperPosition: getComputedStyle(wrapper).position };
      }, { content: CONTENT, items: ITEMS });
      if (r.rows.length < 2) problems.push(`${id}: only ${r.rows.length} items to check`);
      for (const row of r.rows) if (!row.inside) problems.push(`${id}: at the centre of "${row.text}" the top element is ${row.raised ? "the page element at z-index 10" : "something else"}`);
      if (r.zWrapper === "auto") problems.push(`${id}: the positioned wrapper (${r.wrapperPosition}) has z-index auto; the content has ${r.zContent}`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-fits-viewport": async ({ page, open, expect }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    const problems = [];
    for (const [id, height] of [["worst-case-320", 480], ["long-label", 480], ["actions", 480], ["align-end", 480], ["right-to-left", 480], ["with-descriptions", 480]]) {
      await open(id, { width: 320 });
      await page.setViewportSize({ width: 320, height });
      await waitOpen(page);
      await pause(page, 100);
      const m = await page.evaluate((content) => {
        const c = document.querySelector(content), r = c.getBoundingClientRect(), de = document.documentElement;
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: de.clientWidth, vh: window.innerHeight, sw: de.scrollWidth, align: c.getAttribute("data-align") };
      }, CONTENT);
      const at = `${id} at 320 by ${height}`;
      if (m.left < 8 - 0.5 || m.right > m.vw - 8 + 0.5) problems.push(`${at}: the content spans ${m.left.toFixed(1)} to ${m.right.toFixed(1)} px; it must stay 8 px inside 0 to ${m.vw}`);
      if (m.top < 8 - 0.5 || m.bottom > m.vh - 8 + 0.5) problems.push(`${at}: the content spans ${m.top.toFixed(1)} to ${m.bottom.toFixed(1)} px down; it must stay 8 px inside 0 to ${m.vh}`);
      if (m.sw > m.vw) problems.push(`${at}: the page scrolls sideways (${m.sw} in ${m.vw} px)`);
      if (id === "worst-case-320" && m.align !== "start") problems.push(`${at}: data-align is ${m.align}; Radix shifts a start-aligned menu and keeps start`);
    }
    // Text at 200 percent: menu/min is 12rem, 384 px, wider than every phone here. The root font size is set before
    // the menu opens (Radix measures on open), then the menu is opened with the keyboard.
    for (const [id, width] of [["with-shortcuts", 320], ["with-shortcuts", 360], ["with-shortcuts", 375], ["with-shortcuts", 390], ["actions", 320], ["worst-case-320", 320], ["right-to-left", 360]]) {
      await open(id, { width });
      await page.setViewportSize({ width, height: 800 });
      await waitOpen(page);
      await page.keyboard.press("Escape");
      await waitClosed(page);
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), "32px", "the root font size is 200 percent");
      await press(page, "Enter");
      await waitOpen(page);
      await pause(page, 100);
      const m = await page.evaluate(({ content, items }) => {
        const c = document.querySelector(content), r = c.getBoundingClientRect(), de = document.documentElement;
        const cut = [...c.querySelectorAll('[data-slot~="dropdown-menu-item-shortcut"], [data-slot~="dropdown-menu-item-label"]')].filter((e) => { const b = e.getBoundingClientRect(); return b.left < -0.5 || b.right > de.clientWidth + 0.5; }).map((e) => (e.textContent || "").trim());
        return { left: r.left, right: r.right, vw: de.clientWidth, sw: de.scrollWidth, minWidth: getComputedStyle(c).minWidth, items: c.querySelectorAll(items).length, cut };
      }, { content: CONTENT, items: ITEMS });
      const at = `${id} at ${width}, text 200%`;
      if (!m.items) problems.push(`${at}: the menu did not open on Enter`);
      if (m.left < 8 - 0.5 || m.right > m.vw - 8 + 0.5) problems.push(`${at}: the content spans ${m.left.toFixed(1)} to ${m.right.toFixed(1)} px (least width ${m.minWidth}); it must stay 8 px inside 0 to ${m.vw}`);
      if (m.cut.length) problems.push(`${at}: cut by the screen edge: ${m.cut.join(", ")}`);
      if (m.sw > m.vw) problems.push(`${at}: the page scrolls sideways (${m.sw} in ${m.vw} px)`);
    }
    await cdp.detach();
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-scrolls-when-tall": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, width, height] of [["worst-case-320", 320, 300], ["actions", 375, 200], ["model-selector", 1280, 220]]) {
      await open(id, { width });
      await page.setViewportSize({ width, height });
      await waitOpen(page);
      await pause(page, 100);
      const m = await page.evaluate((content) => {
        const c = document.querySelector(content), r = c.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, vh: window.innerHeight, scrollH: c.scrollHeight, clientH: c.clientHeight, overflowY: getComputedStyle(c).overflowY };
      }, CONTENT);
      const at = `${id} at ${width} by ${height}`;
      if (!(m.scrollH > m.clientH)) problems.push(`${at}: the content is not taller than its box (${m.scrollH} in ${m.clientH} px), so the cap was not exercised`);
      if (m.bottom > m.vh - 8 + 0.5 || m.top < 8 - 0.5) problems.push(`${at}: the content spans ${m.top.toFixed(1)} to ${m.bottom.toFixed(1)} px in a ${m.vh} px screen`);
      if (!["auto", "scroll"].includes(m.overflowY)) problems.push(`${at}: overflow-y is ${m.overflowY}`);
      // Every item can be reached: End scrolls the last enabled item into view inside the content.
      await press(page, "End");
      const last = await page.evaluate(({ content, items }) => {
        const c = document.querySelector(content).getBoundingClientRect();
        const all = [...document.querySelectorAll(items)];
        const e = all[all.length - 1], r = e.getBoundingClientRect();
        return { focused: document.activeElement === e, inside: r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5, scrollTop: document.querySelector(content).scrollTop };
      }, { content: CONTENT, items: ITEMS });
      if (!last.focused) problems.push(`${at}: End did not focus the last item`);
      if (!last.inside) problems.push(`${at}: the last item is not visible inside the content after End (scrollTop ${last.scrollTop})`);
      if (!(last.scrollTop > 0)) problems.push(`${at}: the content did not scroll to show the last item`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "dropdown-menu-modal-blocks-page": async ({ page, open, expect }) => {
    // A tall block and a press counter are added to the page, so scrolling and presses outside can be observed.
    const addPageBehind = () => page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.id = "dd-test-behind";
      spacer.style.blockSize = "3000px";
      spacer.addEventListener("click", () => { window.__ddBehindClicks = (window.__ddBehindClicks ?? 0) + 1; });
      document.body.appendChild(spacer);
      window.__ddBehindClicks = 0;
    });
    const probe = async () => {
      await page.mouse.move(160, 600);
      await page.mouse.wheel(0, 400);
      await pause(page, 150);
      const scrolled = await page.evaluate(() => window.scrollY);
      await page.mouse.click(160, 600);
      await pause(page, 100);
      return { scrolled, clicks: await page.evaluate(() => window.__ddBehindClicks), open: await isOpen(page), focus: (await active(page)).what };
    };
    // Control: the non-modal menu leaves the page live.
    await open("non-modal", { width: 375 });
    await waitOpen(page);
    await addPageBehind();
    const live = await probe();
    expect.ok(live.scrolled > 0, `control: with modal false the page scrolls (scrollY ${live.scrolled})`);
    expect.equal(live.clicks, 1, "control: with modal false a press outside reaches the page");
    expect.equal(live.open, false, "control: with modal false a press outside still closes the menu");
    expect.notEqual(live.focus, "trigger", "control: with modal false focus is not pulled back to the trigger after a press outside");
    // Modal: the page is hidden from assistive technology, does not scroll and ignores presses.
    await open("actions", { width: 375 });
    await waitOpen(page);
    const hidden = await page.evaluate(() => { const s = document.querySelector("section[data-example]"); return !!s.closest('[aria-hidden="true"]'); });
    expect.ok(hidden, "with modal true the example's section sits inside an aria-hidden ancestor");
    await addPageBehind();
    const blocked = await probe();
    expect.equal(blocked.scrolled, 0, "with modal true the page does not scroll");
    expect.equal(blocked.clicks, 0, "with modal true a press outside does not reach the page");
    expect.equal(blocked.open, false, "with modal true a press outside closes the menu");
    expect.equal(blocked.focus, "trigger", "with modal true focus returns to the trigger after a press outside");
  },
};
