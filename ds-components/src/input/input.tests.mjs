// Input tests: one entry per requirement in ds-components/specs/input.spec.json whose check is test:<id>.
// Run by v2/tools/test-components.mjs (node v2/tools/test-components.mjs --component input), which calls each
// entry with { page, open, expect }: a fresh Playwright page, open(exampleId, { theme, width, density }) that
// loads one gallery example and waits for it, and node:assert/strict. Each test has 30 seconds.
//
// Focus is reached with real Tab presses, presses with page.mouse at a measured point. Ids made by useId hold
// characters that break "#id" selectors, so ids are always looked up with getElementById. Text at 200 percent is
// set as the root font size (every token is in rem) and asserted before measuring. A coarse pointer comes from CDP
// touch emulation, asserted through matchMedia before measuring. Every case is measured before anything is
// asserted, so one failure message reports all of them.

const ROOT = '[data-slot~="input"]';
const CONTROL = '[data-slot~="input-control"]';
const FIELD = '[data-slot~="input-input"]';
const ALL_EXAMPLES = ["default", "with-description", "placeholder", "required", "invalid", "disabled", "read-only", "small", "large", "prefix-text", "suffix-text", "search", "password", "url", "number", "hover", "focus", "long-text", "worst-case-320"];

// Presses Tab until the input has focus. Returns true when it got there.
async function tabToField(page, tries = 20) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < tries; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((sel) => !!document.activeElement && document.activeElement.matches(sel), FIELD)) return true;
  }
  return false;
}

// Text at 200 percent: every token is in rem, so doubling the root font size doubles every length and type size.
async function textAt200(page, expect) {
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.evaluate(async () => { await document.fonts.ready; });
  const root = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  expect.equal(root, "32px", "the root font size is 200 percent, so the measurement means something");
}

async function coarsePointer(page) {
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
  window.__inputColour = { parse, over, ratio, hex, backgroundOf };
}

export const tests = {
  "input-native-element": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ALL_EXAMPLES) {
      await open(id);
      const r = await page.locator(FIELD).evaluate((el) => ({ tag: el.tagName, editable: el.isContentEditable, count: document.querySelectorAll('[data-slot~="input-input"]').length, ce: document.querySelectorAll("[contenteditable]").length }));
      if (r.count !== 1) problems.push(`${id}: ${r.count} input parts`);
      if (r.tag !== "INPUT") problems.push(`${id}: the input part is a ${r.tag}`);
      if (r.editable || r.ce) problems.push(`${id}: something is contenteditable`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-ids-generated": async ({ page, open, expect }) => {
    // The whole component page: every example on one page, none given an id prop.
    await open("default");
    const url = new URL(page.url());
    url.searchParams.delete("example");
    await page.goto(url.toString(), { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.getAttribute("data-gallery-ready") === "true", null, { timeout: 15000 });
    const r = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('[data-slot~="input"]')];
      const problems = [];
      const ids = [];
      for (const root of roots) {
        const input = root.querySelector('[data-slot~="input-input"]');
        const id = input && input.id;
        if (!id) { problems.push("an input has no id"); continue; }
        ids.push(id);
        if (document.getElementById(id) !== input) problems.push(`the id ${id} does not lead back to its own input`);
        const label = root.querySelector('[data-slot~="input-label"]');
        if (label && label.htmlFor !== id) problems.push(`a label's for is ${label.htmlFor}, its input's id is ${id}`);
        if (label && !(input.labels && [...input.labels].includes(label))) problems.push(`the label is not in ${id}'s labels`);
        const desc = root.querySelector('[data-slot~="input-description"]');
        if (desc && desc.id !== `${id}-description`) problems.push(`the description's id is ${desc.id}, not made from ${id}`);
        const err = root.querySelector('[data-slot~="input-error-message"]');
        if (err && err.id !== `${id}-error`) problems.push(`the error message's id is ${err.id}, not made from ${id}`);
      }
      const all = [...document.querySelectorAll("[id]")].map((e) => e.id);
      const dupes = [...new Set(all.filter((v, i) => all.indexOf(v) !== i))];
      return { count: roots.length, unique: new Set(ids).size, ids: ids.length, dupes, problems };
    });
    expect.ok(r.count >= 2, `the component page shows ${r.count} inputs; needs at least two to compare ids`);
    expect.equal(r.unique, r.ids, `${r.ids} inputs share ${r.unique} distinct ids`);
    expect.deepEqual(r.dupes, [], `ids used twice on the page: ${r.dupes.join(", ")}`);
    expect.deepEqual(r.problems, [], r.problems.join("; "));
  },

  "input-described-by": async ({ page, open, expect }) => {
    // [example, what aria-describedby must list, in order]
    const cases = [["default", []], ["required", []], ["with-description", ["description"]], ["invalid", ["error"]], ["long-text", ["error", "description"]], ["worst-case-320", ["error", "description"]]];
    const problems = [];
    for (const [id, want] of cases) {
      await open(id);
      const r = await page.evaluate((sel) => {
        const input = document.querySelector(sel);
        const attr = input.getAttribute("aria-describedby");
        const tokens = attr ? attr.split(/\s+/).filter(Boolean) : [];
        return {
          attr,
          parts: tokens.map((t) => { const el = document.getElementById(t); return el ? (el.getAttribute("data-slot") || el.tagName) : null; }),
        };
      }, FIELD);
      const got = r.parts.map((p) => (p === "input-description" ? "description" : p === "input-error-message" ? "error" : p));
      if (r.parts.includes(null)) problems.push(`${id}: aria-describedby "${r.attr}" names an id that is not in the page`);
      if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${id}: aria-describedby lists [${got.join(", ")}], needs [${want.join(", ")}]`);
      if (want.length === 0 && r.attr !== null) problems.push(`${id}: aria-describedby is "${r.attr}", needs to be absent`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-invalid-only-with-error": async ({ page, open, expect }) => {
    const problems = [];
    let shown = 0;
    for (const id of ALL_EXAMPLES) {
      await open(id);
      const r = await page.evaluate(({ root, field }) => {
        const input = document.querySelector(field);
        const err = document.querySelector('[data-slot~="input-error-message"]');
        return { ariaInvalid: input.getAttribute("aria-invalid"), error: !!err && err.getBoundingClientRect().height > 0 && getComputedStyle(err).visibility !== "hidden", dataInvalid: document.querySelector(root).hasAttribute("data-invalid") };
      }, { root: ROOT, field: FIELD });
      if (r.error) {
        shown++;
        if (r.ariaInvalid !== "true") problems.push(`${id}: the error message is shown but aria-invalid is ${r.ariaInvalid}`);
        if (!r.dataInvalid) problems.push(`${id}: the error message is shown but the root has no data-invalid`);
      } else {
        if (r.ariaInvalid !== null) problems.push(`${id}: no error message is shown but aria-invalid is "${r.ariaInvalid}"`);
        if (r.dataInvalid) problems.push(`${id}: no error message is shown but the root has data-invalid`);
      }
    }
    expect.equal(shown, 3, `the invalid, long-text and worst-case-320 examples show an error; ${shown} did`);
    // invalid with no words to show (errorMessage "", blank, or absent through a cast): the field must still say it is
    // invalid, to every user. aria-invalid and data-invalid follow invalid alone, the control draws the 2 px error edge
    // in the error colour, no empty error part is rendered and aria-describedby names no missing id. Compared with the
    // invalid example, measured first.
    await open("invalid");
    const edgeOf = () => page.locator(CONTROL).first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: parseFloat(cs.borderTopWidth), colour: cs.borderTopColor };
    });
    const want = await edgeOf();
    await open("default");
    const plain = await edgeOf();
    if (want.colour === plain.colour) problems.push(`the invalid edge ${want.colour} is the default edge, so this test could not tell them apart`);
    for (const kind of ["empty", "blank", "missing"]) {
      await open("default");
      await page.evaluate((k) => window.__inputFixtures.mountInvalidWithoutMessage(k), kind);
      const host = page.locator(`[data-input-fixture="${kind}"]`);
      await host.locator(FIELD).waitFor();
      const r = await host.evaluate((h, { root, control, field }) => {
        const input = h.querySelector(field);
        const ids = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        const cs = getComputedStyle(h.querySelector(control));
        return {
          ariaInvalid: input.getAttribute("aria-invalid"), dataInvalid: h.querySelector(root).hasAttribute("data-invalid"),
          errorPart: !!h.querySelector('[data-slot~="input-error-message"]'), describedBy: input.getAttribute("aria-describedby"),
          dangling: ids.filter((id) => !document.getElementById(id)), edge: { width: parseFloat(cs.borderTopWidth), colour: cs.borderTopColor },
        };
      }, { root: ROOT, control: CONTROL, field: FIELD });
      const at = `invalid with errorMessage ${kind}`;
      if (r.ariaInvalid !== "true") problems.push(`${at}: aria-invalid is ${r.ariaInvalid}, needs "true"`);
      if (!r.dataInvalid) problems.push(`${at}: the root has no data-invalid`);
      if (r.edge.width < 2 - 0.01 || r.edge.colour !== want.colour) problems.push(`${at}: the edge is ${r.edge.width} px ${r.edge.colour}; the invalid example's is ${want.width} px ${want.colour}`);
      if (r.errorPart) problems.push(`${at}: an error message part with no words is rendered`);
      if (r.dangling.length) problems.push(`${at}: aria-describedby "${r.describedBy}" names ids not in the page`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-error-not-colour-alone": async ({ page, open, expect }) => {
    const problems = [];
    await open("default");
    const base = await page.locator(CONTROL).evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth));
    for (const id of ["invalid", "long-text", "worst-case-320"]) {
      for (const theme of ["light", "dark"]) {
        await open(id, { theme });
        const r = await page.evaluate((control) => {
          const err = document.querySelector('[data-slot~="input-error-message"]');
          const icon = document.querySelector('[data-slot~="input-error-icon"]');
          const text = document.querySelector('[data-slot~="input-error-text"]');
          const svg = icon && icon.querySelector("svg");
          const ib = svg ? svg.getBoundingClientRect() : null;
          const cs = getComputedStyle(document.querySelector(control));
          return {
            err: !!err, words: text ? text.textContent.trim() : "", textHeight: text ? text.getBoundingClientRect().height : 0,
            icon: ib ? { w: ib.width, h: ib.height, shapes: svg.querySelectorAll("path,circle").length, stroke: getComputedStyle(svg).stroke } : null,
            edges: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat),
            styles: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle],
          };
        }, CONTROL);
        const at = `${id} ${theme}`;
        if (!r.err) { problems.push(`${at}: no error message`); continue; }
        if (r.words.length < 10 || r.textHeight <= 0) problems.push(`${at}: the error words are "${r.words}" (${r.textHeight} px tall)`);
        if (!r.icon || r.icon.w < 12 || r.icon.h < 12 || r.icon.shapes === 0) problems.push(`${at}: the error icon is ${r.icon ? `${r.icon.w} by ${r.icon.h} px with ${r.icon.shapes} shapes` : "missing"}`);
        if (r.edges.some((w) => w < 2 - 0.01)) problems.push(`${at}: the control's edge is ${r.edges.join("/")} px; needs 2 on every side`);
        if (r.styles.some((s) => s !== "solid")) problems.push(`${at}: the edge style is ${r.styles.join("/")}`);
      }
    }
    if (!(base < 2)) problems.push(`the default edge is ${base} px, so a 2 px error edge would not be a change`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-required-not-colour-alone": async ({ page, open, expect }) => {
    const problems = [];
    for (const [id, want] of [["required", true], ["password", true], ["long-text", true], ["default", false], ["placeholder", false]]) {
      await open(id);
      const r = await page.evaluate((field) => {
        const input = document.querySelector(field);
        const mark = document.querySelector('[data-slot~="input-required-mark"]');
        const label = document.querySelector('[data-slot~="input-label"]');
        const b = mark ? mark.getBoundingClientRect() : null;
        return { native: input.required, mark: mark ? mark.textContent.trim() : null, inLabel: !!(mark && label && label.contains(mark)), visible: !!b && b.width > 0 && b.height > 0 && getComputedStyle(mark).visibility !== "hidden" && getComputedStyle(mark).opacity !== "0", dataRequired: document.querySelector('[data-slot~="input"]').hasAttribute("data-required") };
      }, FIELD);
      if (want) {
        if (!r.native) problems.push(`${id}: the input has no native required attribute`);
        if (r.mark !== "Required") problems.push(`${id}: the required mark reads ${JSON.stringify(r.mark)}, needs "Required"`);
        if (!r.inLabel) problems.push(`${id}: the required mark is not next to the label text`);
        if (!r.visible) problems.push(`${id}: the required mark is not visible`);
        if (!r.dataRequired) problems.push(`${id}: the root has no data-required`);
      } else {
        if (r.native) problems.push(`${id}: not required but the input has the required attribute`);
        if (r.mark !== null) problems.push(`${id}: not required but shows ${JSON.stringify(r.mark)}`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-tab-order": async ({ page, open, expect }) => {
    const seen = {};
    for (const id of ["default", "read-only", "disabled", "search"]) {
      await open(id);
      seen[id] = await tabToField(page, 15);
    }
    expect.equal(seen.default, true, "Tab reaches the enabled input");
    expect.equal(seen.search, true, "Tab reaches the search input");
    expect.equal(seen["read-only"], true, "Tab reaches the read-only input");
    expect.equal(seen.disabled, false, "Tab skips the disabled input");
  },

  "input-enter-submits-form": async ({ page, open, expect }) => {
    const results = {};
    for (const id of ["default", "prefix-text", "invalid"]) {
      await open(id);
      // Wrap the field in a form, in place, and count submits without leaving the page.
      await page.evaluate((root) => {
        const el = document.querySelector(root);
        const form = document.createElement("form");
        el.parentElement.insertBefore(form, el);
        form.appendChild(el);
        // noValidate: the browser's own check (an email field holding "name@example12") must not be what stops
        // the submit; the requirement is that the component never cancels it.
        form.noValidate = true;
        window.__inputSubmits = 0;
        form.addEventListener("submit", (e) => { e.preventDefault(); window.__inputSubmits++; });
      }, ROOT);
      const reached = await tabToField(page);
      if (reached) {
        await page.keyboard.type("12");
        await page.keyboard.press("Enter");
      }
      results[id] = { reached, submits: await page.evaluate(() => window.__inputSubmits) };
    }
    for (const [id, r] of Object.entries(results)) {
      expect.ok(r.reached, `Tab reaches the input of "${id}"`);
      expect.equal(r.submits, 1, `Enter in "${id}" submits the enclosing form once; it submitted ${r.submits} times`);
    }
  },

  "input-focus-visible": async ({ page, open, expect }) => {
    const problems = [];
    for (const theme of ["light", "dark"]) {
      for (const id of ["default", "invalid", "read-only", "search", "small", "worst-case-320"]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        if (!(await tabToField(page))) { problems.push(`${id} ${theme}: Tab never reached the input`); continue; }
        const r = await page.evaluate(({ control, field }) => {
          const C = window.__inputColour;
          const box = document.querySelector(control);
          const input = document.querySelector(field);
          const cs = getComputedStyle(box);
          const ics = getComputedStyle(input);
          const beside = C.backgroundOf(box.parentElement);
          const ring = C.over(C.parse(cs.outlineColor), beside);
          return {
            within: box.matches(":focus-within"), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, ratio: C.ratio(ring, beside), ring: C.hex(ring), beside: C.hex(beside),
            inputOutline: ics.outlineStyle === "none" ? 0 : parseFloat(ics.outlineWidth) || 0, inputStyle: ics.outlineStyle,
          };
        }, { control: CONTROL, field: FIELD });
        const at = `${id} ${theme}`;
        if (!r.within) problems.push(`${at}: the control does not match :focus-within`);
        if (r.style !== "solid" || r.width < 2) problems.push(`${at}: the control's outline is ${r.style} ${r.width} px, needs solid and at least 2 px`);
        if (r.ratio < 3) problems.push(`${at}: ring ${r.ring} on ${r.beside} is ${r.ratio.toFixed(2)} to 1, needs 3`);
        if (r.inputOutline > 0 || r.inputStyle === "auto") problems.push(`${at}: the input draws its own outline (${r.inputStyle} ${r.inputOutline} px)`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-edge-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    const edge = () => page.evaluate((control) => {
      const C = window.__inputColour;
      const el = document.querySelector(control);
      const cs = getComputedStyle(el);
      const page = C.backgroundOf(el.parentElement);
      const sides = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map((c) => C.over(C.parse(c), page));
      const ratios = sides.map((s) => C.ratio(s, page));
      const worst = ratios.indexOf(Math.min(...ratios));
      return { ratio: ratios[worst], edge: C.hex(sides[worst]), page: C.hex(page) };
    }, CONTROL);
    for (const theme of ["light", "dark"]) {
      for (const [id, drive] of [["default", null], ["hover", "hover"], ["focus", "focus"], ["invalid", null], ["read-only", null], ["required", null], ["worst-case-320", null]]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        if (drive === "hover") {
          const b = await page.locator(CONTROL).boundingBox();
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
          if (!(await page.locator(CONTROL).evaluate((el) => el.matches(":hover")))) problems.push(`${id} ${theme}: the control is not hovered`);
        }
        if (drive === "focus" && !(await tabToField(page))) problems.push(`${id} ${theme}: Tab never reached the input`);
        const r = await edge();
        measured++;
        if (r.ratio < 3) problems.push(`${id} ${theme}: edge ${r.edge} on ${r.page} is ${r.ratio.toFixed(2)} to 1, needs 3`);
      }
    }
    expect.equal(measured, 14, `measured ${measured} edges`);
    expect.deepEqual(problems, [], `${problems.length} of ${measured} edges are under 3 to 1: ${problems.join("; ")}`);
  },

  "input-placeholder-contrast": async ({ page, open, expect }) => {
    const problems = [];
    let measured = 0;
    for (const theme of ["light", "dark"]) {
      for (const id of ["placeholder", "search", "url", "worst-case-320"]) {
        await open(id, { theme });
        await page.evaluate(inPageColour);
        const r = await page.evaluate((field) => {
          const C = window.__inputColour;
          const input = document.querySelector(field);
          const fill = C.backgroundOf(input);
          const ink = C.over(C.parse(getComputedStyle(input, "::placeholder").color), fill);
          return { shown: input.matches(":placeholder-shown"), ratio: C.ratio(ink, fill), ink: C.hex(ink), fill: C.hex(fill) };
        }, FIELD);
        measured++;
        if (!r.shown) problems.push(`${id} ${theme}: the placeholder is not showing`);
        if (r.ratio < 4.5) problems.push(`${id} ${theme}: placeholder ${r.ink} on ${r.fill} is ${Math.floor(r.ratio * 100) / 100} to 1, needs 4.5`);
      }
    }
    expect.equal(measured, 8, `measured ${measured} placeholders`);
    expect.deepEqual(problems, [], `${problems.length} of ${measured} placeholders fail: ${problems.join("; ")}`);
  },

  "input-no-ios-zoom": async ({ page, open, expect }) => {
    const ids = ["small", "default", "large", "prefix-text", "search", "worst-case-320"];
    const size = () => page.locator(FIELD).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // Without a coarse pointer the medium input is 14 px: proof that the 16 px below comes from the media rule.
    await open("default", { width: 375 });
    const fine = { coarse: await page.evaluate(() => matchMedia("(pointer: coarse)").matches), size: await size() };
    const cdp = await coarsePointer(page);
    const problems = [];
    for (const id of ids) {
      await open(id, { width: 375 });
      expect.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the page sees a coarse pointer, so the measurement means something");
      const s = await size();
      if (s < 16 - 0.01) problems.push(`${id}: the input text is ${s} px with a coarse pointer; needs at least 16`);
    }
    await cdp.detach();
    expect.equal(fine.coarse, false, "the first load has a fine pointer");
    expect.ok(fine.size < 16, `with a fine pointer the medium input is ${fine.size} px, so this test could not tell the touch rule apart`);
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-touch-target": async ({ page, open, expect }) => {
    const cdp = await coarsePointer(page);
    const problems = [];
    for (const id of ["small", "default", "large", "search", "read-only"]) {
      await open(id, { width: 375 });
      expect.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the page sees a coarse pointer, so the measurement means something");
      const box = await page.locator(CONTROL).boundingBox();
      if (!box || box.height < 44 - 0.01) problems.push(`with a coarse pointer "${id}" is ${box ? box.height : "not"} px tall; needs at least 44`);
    }
    await cdp.detach();
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-target-size": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["small", "default", "large", "search", "disabled", "prefix-text"]) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        const box = await page.locator(CONTROL).boundingBox();
        if (!box || box.width < 24 || box.height < 24) problems.push(`"${id}" at ${width} wide is ${box ? `${box.width} by ${box.height}` : "not rendered"} px; needs at least 24 by 24`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-reflow": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["worst-case-320", "long-text", "with-description"]) {
      await open(id, { width: 320 });
      await textAt200(page, expect);
      const m = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const q = (s) => document.querySelector(`[data-slot~="${s}"]`);
        const root = q("input").getBoundingClientRect();
        const out = { vw, scrollWidth: document.documentElement.scrollWidth, problems: [] };
        for (const slot of ["input-label", "input-control", "input-description", "input-error-message", "input-error-text", "input-prefix", "input-suffix", "input-input"]) {
          const el = q(slot);
          if (!el) continue;
          const b = el.getBoundingClientRect();
          if (b.right > vw + 0.5 || b.left < -0.5) out.problems.push(`${slot} runs from ${b.left} to ${b.right} px, outside the ${vw} px viewport`);
          if (b.right > root.right + 0.5 || b.left < root.left - 0.5) out.problems.push(`${slot} leaves the field (${b.left} to ${b.right} px, field ${root.left} to ${root.right})`);
          if (slot !== "input-input" && el.scrollWidth > el.clientWidth + 1) out.problems.push(`${slot} holds ${el.scrollWidth} px of content in ${el.clientWidth} px`);
          if (slot !== "input-input" && el.scrollHeight > el.clientHeight + 1) out.problems.push(`${slot} holds ${el.scrollHeight} px of content in ${el.clientHeight} px tall`);
          for (let e = el; e && e !== document.body; e = e.parentElement) {
            const o = getComputedStyle(e);
            if (e !== el && [o.overflowX, o.overflowY].some((v) => v !== "visible")) { out.problems.push(`${e.getAttribute("data-slot") || e.tagName} around ${slot} hides overflow`); break; }
            if (o.textOverflow === "ellipsis") { out.problems.push(`${slot} ends in an ellipsis`); break; }
          }
        }
        const lines = (el) => { if (!el) return 0; const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; };
        out.labelLines = lines(q("input-label"));
        out.errorLines = lines(q("input-error-text"));
        const input = q("input-input");
        out.input = { height: input.getBoundingClientRect().height, line: parseFloat(getComputedStyle(input).lineHeight), width: input.getBoundingClientRect().width };
        const control = q("input-control");
        const ccs = getComputedStyle(control);
        out.control = { height: control.getBoundingClientRect().height, min: parseFloat(ccs.minHeight) };
        return out;
      });
      const at = `${id} at 320 wide, text 200%`;
      if (m.scrollWidth > m.vw) problems.push(`${at}: the page scrolls sideways (${m.scrollWidth} px in ${m.vw})`);
      for (const p of m.problems) problems.push(`${at}: ${p}`);
      if (id !== "with-description" && m.labelLines < 2) problems.push(`${at}: the label does not wrap (${m.labelLines} line)`);
      if (id !== "with-description" && m.errorLines < 2) problems.push(`${at}: the error does not wrap (${m.errorLines} line)`);
      if (m.input.height < m.input.line - 0.5) problems.push(`${at}: the input is ${m.input.height} px tall for ${m.input.line} px lines of text`);
      if (m.input.width < 24) problems.push(`${at}: the input is squeezed to ${m.input.width} px`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-text-resize": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["small", "default", "large", "worst-case-320", "prefix-text"]) {
      await open(id, { width: 1280 });
      const before = await page.locator(CONTROL).evaluate((el) => el.getBoundingClientRect().height);
      await textAt200(page, expect);
      const m = await page.evaluate(({ control, field }) => {
        const c = document.querySelector(control), i = document.querySelector(field);
        const cs = getComputedStyle(c), is = getComputedStyle(i);
        const px = (v) => parseFloat(v) || 0;
        const need = px(is.lineHeight) + px(cs.paddingBlockStart) + px(cs.paddingBlockEnd) + px(cs.borderBlockStartWidth) + px(cs.borderBlockEndWidth);
        const parts = [...c.children].map((e) => ({ slot: e.getAttribute("data-slot"), top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom }));
        const b = c.getBoundingClientRect();
        return { height: b.height, need, line: px(is.lineHeight), inputHeight: i.getBoundingClientRect().height, font: px(is.fontSize), outside: parts.filter((p) => p.top < b.top - 0.5 || p.bottom > b.bottom + 0.5).map((p) => p.slot) };
      }, { control: CONTROL, field: FIELD });
      const at = `${id} at 200%`;
      if (m.height < m.need - 0.5) problems.push(`${at}: the control is ${m.height} px tall; its ${m.line} px text line, padding and border need ${m.need}`);
      if (m.inputHeight < m.line - 0.5) problems.push(`${at}: the input is ${m.inputHeight} px tall for ${m.line} px lines`);
      if (m.outside.length) problems.push(`${at}: ${m.outside.join(", ")} stick out of the control`);
      if (!(m.height > before + 0.5)) problems.push(`${at}: the control stayed ${m.height} px tall (it was ${before} px at 100%)`);
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-field-stack": async ({ page, open, expect }) => {
    const problems = [];
    for (const id of ["long-text", "worst-case-320", "with-description", "invalid", "required"]) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        const m = await page.evaluate(() => {
          const root = document.querySelector('[data-slot~="input"]');
          const order = ["input-label", "input-control", "input-description", "input-error-message"];
          const kids = [...root.children].map((e) => e.getAttribute("data-slot"));
          const parts = order.map((s) => root.querySelector(`:scope > [data-slot~="${s}"]`)).filter(Boolean).map((e) => ({ slot: e.getAttribute("data-slot"), ...JSON.parse(JSON.stringify(e.getBoundingClientRect())) }));
          const gap = parseFloat(getComputedStyle(root).rowGap);
          const icon = document.querySelector('[data-slot~="input-error-icon"]');
          const text = document.querySelector('[data-slot~="input-error-text"]');
          let err = null;
          if (icon && text) {
            const r = document.createRange();
            r.selectNodeContents(text);
            const first = r.getClientRects()[0];
            const ib = icon.getBoundingClientRect();
            err = { iconRight: ib.right, iconCentre: (ib.top + ib.bottom) / 2, textLeft: text.getBoundingClientRect().left, lineTop: first.top, lineBottom: first.bottom, iconFirst: icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING };
          }
          return { kids, parts, gap, err };
        });
        const at = `${id} at ${width}`;
        const expected = ["input-label", "input-control", "input-description", "input-error-message"].filter((s) => m.kids.includes(s));
        if (JSON.stringify(m.kids) !== JSON.stringify(expected)) problems.push(`${at}: the parts are in the order ${m.kids.join(", ")}`);
        if (!(m.gap > 0)) problems.push(`${at}: the root gap is ${m.gap} px`);
        for (let i = 1; i < m.parts.length; i++) {
          const a = m.parts[i - 1], b = m.parts[i];
          const space = b.top - a.bottom;
          if (Math.abs(space - m.gap) > 0.5) problems.push(`${at}: ${b.slot} starts ${space.toFixed(2)} px below ${a.slot}; the root gap is ${m.gap} px`);
          if (Math.abs(b.left - m.parts[0].left) > 0.5) problems.push(`${at}: ${b.slot} starts at x ${b.left}, ${m.parts[0].slot} at ${m.parts[0].left}`);
        }
        if (m.err) {
          if (!m.err.iconFirst) problems.push(`${at}: the error icon is not before the words`);
          if (m.err.iconRight > m.err.textLeft + 0.5) problems.push(`${at}: the error icon ends at ${m.err.iconRight}, after the words start at ${m.err.textLeft}`);
          if (m.err.iconCentre < m.err.lineTop - 0.5 || m.err.iconCentre > m.err.lineBottom + 0.5) problems.push(`${at}: the error icon's centre ${m.err.iconCentre} is outside the first line (${m.err.lineTop} to ${m.err.lineBottom})`);
        }
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-control-row": async ({ page, open, expect }) => {
    const problems = [];
    const long = "SW1A 1AA 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const id of ["prefix-text", "suffix-text", "search", "worst-case-320"]) {
      for (const width of [320, 1280]) {
        await open(id, { width });
        // Type a value longer than the field, so the text would run under the suffix if the row did not hold.
        if (id === "worst-case-320" || id === "suffix-text") {
          await page.locator(FIELD).click();
          await page.keyboard.type(long);
        }
        const m = await page.evaluate(() => {
          const q = (s) => document.querySelector(`[data-slot~="${s}"]`);
          const c = q("input-control");
          const cs = getComputedStyle(c);
          const px = (v) => parseFloat(v) || 0;
          const cb = c.getBoundingClientRect();
          const content = { left: cb.left + px(cs.borderInlineStartWidth) + px(cs.paddingInlineStart), right: cb.right - px(cs.borderInlineEndWidth) - px(cs.paddingInlineEnd), mid: (cb.top + cb.bottom) / 2 };
          const box = (s) => { const e = q(s); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, mid: (b.top + b.bottom) / 2, natural: e.scrollWidth, width: b.width }; };
          const i = q("input-input");
          // The text box inside the input: its painted width is the input's client width, so text never leaves it.
          return { content, gap: px(cs.columnGap), prefix: box("input-prefix"), input: box("input-input"), suffix: box("input-suffix"), inputClient: i.clientWidth, inputScroll: i.scrollWidth, overflowClip: getComputedStyle(i).overflow };
        });
        const at = `${id} at ${width}`;
        const row = [m.prefix && ["prefix", m.prefix], ["input", m.input], m.suffix && ["suffix", m.suffix]].filter(Boolean);
        for (let k = 1; k < row.length; k++) {
          const [an, a] = row[k - 1], [bn, b] = row[k];
          if (b.left < a.right - 0.5) problems.push(`${at}: the ${bn} (from ${b.left}) overlaps the ${an} (to ${a.right})`);
          if (Math.abs(b.left - a.right - m.gap) > 0.5) problems.push(`${at}: ${bn} starts ${(b.left - a.right).toFixed(2)} px after ${an}; the control gap is ${m.gap}`);
        }
        if (row[0][1].left < m.content.left - 0.5) problems.push(`${at}: the ${row[0][0]} starts at ${row[0][1].left}, before the control's padding ends at ${m.content.left}`);
        const last = row[row.length - 1];
        if (last[1].right > m.content.right + 0.5) problems.push(`${at}: the ${last[0]} ends at ${last[1].right}, after the control's content ends at ${m.content.right}`);
        for (const [n, b] of row) if (Math.abs(b.mid - m.content.mid) > 1) problems.push(`${at}: the ${n}'s centre is ${(b.mid - m.content.mid).toFixed(2)} px off the control's centre`);
        for (const n of ["prefix", "suffix"]) if (m[n] && m[n].natural > m[n].width + 0.5) problems.push(`${at}: the ${n} was squeezed to ${m[n].width} px from ${m[n].natural}`);
        if (m.input.width < 24) problems.push(`${at}: the input is ${m.input.width} px wide`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-decorations-hidden": async ({ page, open, expect }) => {
    const problems = [];
    const want = { "worst-case-320": ["input-prefix", "input-suffix", "input-required-mark", "input-error-icon"], "prefix-text": ["input-prefix"], "suffix-text": ["input-suffix"], search: ["input-prefix"], required: ["input-required-mark"], invalid: ["input-error-icon"] };
    for (const [id, slots] of Object.entries(want)) {
      await open(id);
      for (const slot of slots) {
        const el = page.locator(`[data-slot~="${slot}"]`);
        const n = await el.count();
        if (n !== 1) { problems.push(`${id}: ${n} ${slot} parts`); continue; }
        const v = await el.getAttribute("aria-hidden");
        if (v !== "true") problems.push(`${id}: ${slot} has aria-hidden=${JSON.stringify(v)}`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },

  "input-press-control-focuses": async ({ page, open, expect }) => {
    const problems = [];
    const focused = () => page.evaluate((f) => document.activeElement === document.querySelector(f), FIELD);
    const blur = () => page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    for (const [id, targets] of [["worst-case-320", ["input-prefix", "input-suffix", "padding"]], ["prefix-text", ["input-prefix", "padding"]], ["suffix-text", ["input-suffix"]], ["search", ["input-prefix"]], ["default", ["padding"]]]) {
      await open(id);
      for (const t of targets) {
        await blur();
        if (await focused()) { problems.push(`${id}: the input still had focus before the press`); continue; }
        let x, y;
        if (t === "padding") {
          // The control's inline padding at its end: not on the input, the prefix or the suffix.
          const p = await page.locator(CONTROL).evaluate((el) => { const b = el.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(el).paddingInlineEnd); return { x: b.right - pad / 2, y: b.top + b.height / 2, pad }; });
          x = p.x; y = p.y;
          const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("data-slot"), { x, y });
          if (hit !== "input-control") problems.push(`${id}: the padding point lands on ${hit}, not the control`);
        } else {
          const b = await page.locator(`[data-slot~="${t}"]`).boundingBox();
          x = b.x + b.width / 2; y = b.y + b.height / 2;
        }
        await page.mouse.click(x, y);
        if (!(await focused())) problems.push(`${id}: a press on ${t} did not move focus to the input`);
      }
    }
    expect.deepEqual(problems, [], problems.join("; "));
  },
};
