# Building a component from its spec

Button (ds-components/src/button/) is the worked example. Copy its shape; read its files beside this page.

## Steps, in order
1. Read ds-components/schema/component.schema.json (every description is a rule) and your spec.
2. `node v2/tools/check-specs.mjs` must report 0 findings for your spec. If the spec is wrong, report it; do not edit it.
3. `node v2/tools/build-components.mjs <slug>` writes `<slug>.css`, `<slug>.contract.ts`, docs/<slug>.md and
   src/styles.css. Never edit those. styles.css imports `<slug>.extensions.css` only once that file exists, so
   rerun the build after creating it. Do not import CSS from the .tsx: styles.css already loads it.
4. Write the five hand-written files below, then add your exports to src/index.ts.
5. Run, until each exits 0:
   `node v2/tools/lint-components.mjs --types` ; `node v2/tools/lint-components.mjs` ;
   `node v2/tools/build-gallery.mjs` ; `node v2/tools/test-components.mjs --component <slug> --shots ds-components/generated/shots` ;
   `node v2/tools/lint-components.mjs --size`.
   While iterating, add `--example <id>` to the test run; the full run of one component takes about 40 seconds.
6. Read the 375 px PNGs in light and dark, and `<slug>--all.png`. Look for clipped text, missing padding, icons off the line.

## File contracts (all in ds-components/src/<slug>/)
- `<slug>.tsx`, lower case, exactly the slug: the lint and the size check look for that name (a capitalised
  file only passes on a case-insensitive disk). Function components, React 19 ref as a prop.
  - Take names, defaults, slots and reflected attributes from the contract: `<NAME>_DEFAULTS`, `<NAME>_SLOTS.<part>`,
    `<NAME>_REFLECTS.<prop>`. Write `data-slot={X_SLOTS.part}`; the slots lint accepts that form.
  - A reflected enum is `data-x="value"`; a reflected boolean is the bare attribute, present only when true (`""` or undefined).
  - No `style`, no class names for the look. Pass `className` and other native attributes through.
  - The contract types handlers as `(...args: never[]) => void`, which cannot be called. Omit them from the
    contract props and retype them (`React.MouseEventHandler<HTMLElement>`). Omit native attributes the contract
    owns (type, disabled, aria-label...), so each thing has one way to be set.
  - The contract already exports `<Name>Props`. Import it as `<Name>ContractProps` and export your own full props type as `<Name>Props`.
  - A rule a type must enforce (Button: iconOnly needs ariaLabel) is a union, proved by a `// @ts-expect-error`
    line in the .tsx: if the union stops rejecting the bad case, tsc fails on the unused directive.
  - `process` has no types here; Button declares `declare const process: { env: { NODE_ENV?: string } }`.
    Development warnings use console.warn and warn once; the test runner fails a page on any console.error.
  - asChild: `<Slot>` with `<Slottable child={children}>{(c) => <span data-slot=...>{c}</span>}</Slottable>` keeps the child's content inside your label part.
- `<slug>.extensions.css`: only layout the spec cannot say, inside `@layer ds.extensions`, tokens and logical
  properties only. That layer beats ds.components whatever the selector, so never set colour, border, padding,
  outline, block size or min size there: you would silently override the spec. Do set `box-sizing: border-box`
  (or a full-width part overflows at 320 px). Raw times are lint errors: write `calc(var(--duration-base) * 5)`.
  Every animation needs a `prefers-reduced-motion` rule.
- `<slug>.examples.tsx`: `export const examples = { "<id>": () => <JSX/> }`, one top-level key per spec example,
  with exactly the props and content the spec gives (the runner predicts state colours from the spec's props).
  At most one `variant="primary"` per example tree. Icons: `import { Icon } from "../../gallery/icons"`.
- `<slug>.tests.mjs`: `export const tests = { "<id>": async ({ page, open, expect }) => {} }`, one key per
  requirement whose check is `test:<id>`. `open(exampleId, { theme, width, density })` loads one example;
  `expect` is node:assert/strict. 30 seconds per test.

## How examples expose state to tests
Every example passes `onClick={record("<example id>")}`, which adds one to `window.__buttonClicks[id]`; tests read
that counter. Use your own global (`window.__<slug>Events`) for other events. Every "nothing happens" test first
proves the same press counts on a live example.

## What cost Button a cycle
- The gallery once set the type size on html, which made 1rem 14 px and every token 0.875 of its size (a 40 px
  button measured 35). If sizes look scaled, check the root font size before blaming the component.
- A media-feature override of `pointer` is ignored by Chromium. A coarse pointer needs CDP touch emulation
  (`Emulation.setTouchEmulationEnabled`) before `open()`; assert `matchMedia("(pointer: coarse)")` before measuring.

## Test craft
- Reach focus with real Tab presses (loop until `document.activeElement` matches), never `.focus()`, so `:focus-visible` holds.
- Click with `page.mouse.click` at the centre of the box: Playwright's `click()` waits on a disabled element.
- Measure every case before asserting, so one failure message reports all of them.
- Prove each test bites: break the component on purpose (Button: native disabled while loading, no aria-hidden
  on the spinner, ariaLabel optional) and see the test or tsc fail, then restore.
- Hover and press with `page.mouse.move` / `mouse.down` after one load; the runner turns transitions off.
- Colour checks composite translucent fills over what is behind them; copy `inPageColour` from button.tests.mjs.

## Compound components (Tabs, DropdownMenu, Dialog)
- Export each part with an element as its own component (`TabsList`, `TabsTrigger`, `DialogContent`), each
  wrapping its Radix part and setting its own data-slot. A prop keyed `part.prop` in the spec is a prop of that part's component.
- A part whose element is null (Root, Portal) wraps the Radix part and sets no data-slot.
- Export every part from `<slug>.tsx` and list each one in src/index.ts with its props types.
- Examples compose the parts in JSX; the spec's `content` has no fixed shape for compound components.

## Known gaps (as of the Button build)
- A state the spec drives with aria-disabled also matches the disabled selector: Button's loading state looks disabled.
- A part with a fixed `height` cannot grow for wrapped text; use `minHeight` in the spec when text can wrap.
