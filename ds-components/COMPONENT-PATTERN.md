# Building a component from its spec

Button (ds-components/src/button/) is the worked example. Copy its shape, and read its files beside this page.
The section on compound components covers Tabs, DropdownMenu and Dialog.

## Who writes what
- The generator (`node v2/tools/build-components.mjs`) writes `<slug>.css`, `<slug>.contract.ts`,
  `docs/<slug>.md`, `docs/state-map.md`, `src/styles.css`, `src/index.ts` and `generated/tokens-used.json`.
  Nobody else writes them. The lint compares each one with a fresh in-memory build and reports any difference.
- `ds-components/gallery/icons.tsx` is shared and set for every spec's examples. Builders do not edit it. If an
  icon is missing, report it to the lead.
- You write four files per component, all in your folder: `<slug>.tsx`, `<slug>.extensions.css` (only if
  needed), `<slug>.examples.tsx` and `<slug>.tests.mjs`. You write nothing outside your folder.

## Steps, in order
1. Read ds-components/schema/component.schema.json (every description is a rule) and your spec.
2. `node v2/tools/check-specs.mjs` must report 0 findings for your spec. If the spec is wrong, report it with
   numbers. Do not edit it.
3. `node v2/tools/build-components.mjs <slug>` writes your component's files. It always builds every spec, so the
   shared files keep everyone's components. Rerun it after you create `<slug>.tsx` or `<slug>.extensions.css`,
   or change what `<slug>.tsx` exports. `index.ts` and `styles.css` follow the files on disk.
   Do not import CSS from the .tsx: styles.css already loads it.
4. Write your hand-written files. Do not touch `src/index.ts`: it is generated. For each folder with a
   `<slug>.tsx` it holds `export * from './<slug>/<slug>';` and `export type * from './<slug>/<slug>.contract';`.
   Where both files export the same name (your `<Name>Props` and the contract's), it adds an explicit export of
   yours, so yours wins. The contract's constants (`<NAME>_SLOTS`...) are exported from the index as types only;
   import their values from `./<slug>.contract`.
5. Build and test in your own gallery folder, so that four builders never overwrite each other:
   ```
   node v2/tools/lint-components.mjs --types ; node v2/tools/lint-components.mjs
   node v2/tools/build-gallery.mjs --dist ds-components/gallery/dist-<slug> --component <slug>
   node v2/tools/test-components.mjs --component <slug> --dist ds-components/gallery/dist-<slug> \
     --report ds-components/gallery/dist-<slug>/test-report.json --shots ds-components/generated/shots
   node v2/tools/lint-components.mjs --size
   ```
   - `--dist` names your bundle folder. Git ignores folders named `ds-components/gallery/dist-*`.
   - `--component` on the gallery bundles only your component and the test fixture, so another builder's
     half-written examples cannot break your bundle.
   - With `--dist`, the test runner builds nothing: it tests what is in that folder, so rebuild the gallery
     after every change.
   - `--report` writes the JSON report even on a filtered run. Keep it inside your dist folder, which git ignores.
   - While iterating, add `--example <id>`.
6. Read the 375 px PNGs in light and dark, and `<slug>--all.png`. Look for clipped text, missing padding, and
   icons off the line.

Shared hazard: `lint-components.mjs --types` and every `type:` requirement run tsc over all of
`ds-components/src`. One builder's broken `.tsx` therefore fails tsc for everyone, and every `type:` check is
"not proven" until it is fixed. Keep your `.tsx` compiling between saves, and fix a red tsc run at once, even
if the error is in your own file.

## File contracts (all in ds-components/src/<slug>/)
- `<slug>.tsx`, lower case, exactly the slug. Use function components, with the React 19 ref as a prop.
  - Take names, defaults, slots and reflected attributes from the contract: `<NAME>_DEFAULTS`,
    `<NAME>_SLOTS.<part>`, `<NAME>_REFLECTS[<key>]`. Write `data-slot={X_SLOTS.part}`; the slots lint accepts
    that form.
  - **data-slot is a list of slot names, like a class list.** One element can be two parts at once: a Button inside
    `DropdownMenuTrigger asChild` or `DialogTrigger asChild` is both, and carries
    `data-slot="button dropdown-menu-trigger"`. A component that can be the child of asChild (Button today; any
    component whose root may sit inside a trigger or close part) takes an incoming `"data-slot"` prop and merges it:
    its own name first, then each incoming word once, never overwriting. Button's `slotList(BUTTON_SLOTS.root,
    incoming)` is the worked example. The slots lint reads every data-slot string word by word: each word must be a
    part of your spec, and the `" "` a list is joined with is no part.
  - Find a part by the word, never by the whole attribute: `[data-slot~="x"]` in CSS, tests and selectors.
    `[data-slot="x"]` misses an element that carries a second name (check-specs reports it in a state selector).
  - A reflected enum is `data-x="value"`. A reflected boolean is the bare attribute, present only when true
    (`""` or undefined).
  - No `style`, and no class names for the look. Pass `className` and other native attributes through.
  - The contract types handlers as `(...args: never[]) => void`, which cannot be called. Omit them from the
    contract props and retype them (`React.MouseEventHandler<HTMLElement>`). Omit native attributes the contract
    owns (type, disabled, aria-label...), so that each thing has one way to be set.
  - Import the contract's interface as `<Name>ContractProps` and export your own full props type as
    `<Name>Props`. The index makes yours win.
  - A rule a type must enforce (Button: iconOnly needs ariaLabel) is a union, proved by a `// @ts-expect-error`
    line whose text names the requirement id:
    `// @ts-expect-error button-icon-only-needs-label: iconOnly without ariaLabel must not type-check`.
    The runner counts `type:<id>` as passed only when tsc exits 0 and such a line exists in your hand-written
    source. Otherwise it is "not proven", never passed.
  - `process` has no types here. Button declares `declare const process: { env: { NODE_ENV?: string } }`.
    Development warnings use console.warn and warn once. The test runner fails a page on any console.error.
  - asChild: `<Slot>` with `<Slottable child={children}>{(c) => <span data-slot=...>{c}</span>}</Slottable>`
    keeps the child's content inside your label part.
- `<slug>.extensions.css`: only layout the spec cannot express, inside `@layer ds.extensions`, using tokens and
  logical properties only.
  - That layer beats ds.components whatever the selector. Never set colour, border, padding, outline, block size
    or minimum size there: you would silently override the spec.
  - Do set `box-sizing: border-box`, or a full-width part overflows at 320 px.
  - Select parts by the word, `[data-slot~="x"]`, as the generated stylesheet does.
  - Raw times are lint errors. Use a token (`var(--duration-spin)` for a looping indicator) or a `calc()` of one.
  - You may read a custom property the behaviour library sets at run time, limited to names starting `--radix-`
    (`var(--radix-dropdown-menu-content-available-height)`). You may never declare one.
  - Every animation needs a `prefers-reduced-motion` rule.
- `<slug>.examples.tsx`: `export const examples = { "<id>": () => <JSX/> }`, one top-level key per spec example,
  with exactly the props and content the spec gives (the runner predicts state colours from the spec's props).
  - At most one `variant="primary"` per example tree.
  - Icons: `import { Icon } from "../../gallery/icons"`, using the names the spec's examples use.
- `<slug>.tests.mjs`: `export const tests = { "<id>": async ({ page, open, expect }) => {} }`, one key per
  requirement whose check is `test:<id>`. `open(exampleId, { theme, width, density })` loads one example;
  `expect` is node:assert/strict. Each test has 30 seconds.

## How the generated stylesheet reads
Every rule for a part has the specificity of `[data-slot~="..."]` alone (one attribute selector, matched by the
word, because data-slot is a list): the generator wraps prop conditions,
states, precedence exclusions and ancestor parts in `:where()`. Rules therefore apply in spec order. A later
rule wins where two set the same property: ghost-disabled after disabled, and a size rule after a variant rule.
A state rule also excludes every stronger state in `precedence`, so hover never shows on a disabled control.
If two rules fight, reorder them in the spec; never raise specificity in extensions CSS.

Outline: a block that sets `outlineWidth` also gets `outline-style`, written last. `outlineWidth: none` writes
`outline-width: 0; outline-style: none`, which also turns off Chromium's automatic focus ring (`outline-style:
auto`, painted at any width); a width token writes `outline-style: solid`. So "this part draws no outline" is
`outlineWidth: none` in the spec, never an outline rule in extensions CSS.

## How examples expose state to tests
- Every example records the events a test needs in a window global named after the component. Button: every
  example passes `onClick={record("<example id>")}`, which adds one to `window.__buttonClicks[id]`. Use
  `window.__<camelSlug>Events` (for example `__tabsEvents`) for compound components, keyed by example id, then by
  event: `{ "controlled": { valueChange: ["reviews"], openChange: [true, false] } }`.
- A controlled example (the spec gives `value` or `open` with a handler) holds its state in `useState` inside the
  example and records every change, so a test can read both what the user did and what the component shows.
- Every "nothing happens" test first proves that the same press counts on a live example.

## Compound components (Tabs, DropdownMenu, Dialog)
- **Parts and exports.** Each part is exported from `<slug>.tsx` as `<Name><Part>` (`TabsList`, `TabsTrigger`,
  `DropdownMenuItem`, `DialogTitle`) wrapping its Radix part. The root part is `<Name>`. Each part with an
  element sets its own data-slot.
- **Parts that render nothing.** A part whose element is null (Root, Portal) wraps the Radix part and sets no
  data-slot. Its slot is in `<NAME>_SLOTS` with a "renders nothing" comment. The lint rejects a data-slot that
  names it, and the runner does not look for it.
- **Typing from the split contract.** A spec prop keyed `part.prop` is a prop of that part's component, under
  the name after the dot. The contract already splits them:
  - `trigger.value` is `value` in `TabsTriggerProps`.
  - Plain keys are in `TabsProps`.
  - Unions are named `<Name><Part><Prop>` (`TabsListBehavior`).
  - Look defaults and reflected attributes up by the spec key: `TABS_DEFAULTS["list.behavior"]`,
    `TABS_REFLECTS["list.behavior"]`.
- **Radix props pass through; ours sit on top.** Each part's props type is the Radix part's own props minus the
  names the contract owns, plus the contract's:
  ```tsx
  import * as RadixTabs from "@radix-ui/react-tabs";
  import { TABS_DEFAULTS, TABS_REFLECTS, TABS_SLOTS, type TabsListProps as TabsListContractProps } from "./tabs.contract";

  export type TabsListProps = Omit<React.ComponentPropsWithoutRef<typeof RadixTabs.List>, keyof TabsListContractProps>
    & TabsListContractProps & { ref?: React.Ref<HTMLDivElement> };

  export function TabsList({ behavior = TABS_DEFAULTS["list.behavior"], loop = TABS_DEFAULTS["list.loop"], ariaLabel, ariaLabelledby, ...radix }: TabsListProps) {
    const reflected = { [TABS_REFLECTS["list.behavior"]]: behavior };
    return <RadixTabs.List {...radix} {...reflected} loop={loop} aria-label={ariaLabel} aria-labelledby={ariaLabelledby} data-slot={TABS_SLOTS.list} />;
  }
  ```
  Retype handlers as above. A prop the spec renames (`ariaLabel`) is mapped onto the native attribute here, and
  the native one is omitted so that it has one way to be set.
- **Never pass a null default to Radix.** A default of null means unset unless given. It is absent from
  `<NAME>_DEFAULTS` and listed in a comment there. `open`, `value` or `checked` set to `null` or `undefined`
  explicitly would make Radix treat the part as controlled, or log a warning. Spread only the props the caller
  gave.
- **Examples** compose the parts in JSX. The spec's `content` has no fixed shape for compound components: read it
  as the tree to build.
- **Portalled parts and tests.** Menu content and the dialog overlay and content render in a portal at the end of
  `<body>`, outside the example's `section[data-example]`. Tests find every part document-wide by its data-slot,
  for example `page.locator('[data-slot~="dropdown-menu-content"]')`, never scoped to the section. The runner does
  the same for anatomy and for the colours of other parts in a state check. Wait for an opened part with
  `locator.waitFor()` before measuring.

## How the runner reaches a state (the "reach" of a state)
The schema's description of `reach` is the rule; the runner (`parseReach` in v2/tools/test-components.mjs) follows it
exactly and reports anything else as "reach not understood", never guessed.
- Steps are joined by ` > ` and run in order. A step is one of:
  - `hover`, `press`, `focus-by-keyboard`, `click`, `key:<Key>`. `<Key>` is a key name only: `ArrowDown`,
    `Escape`, `Shift+Tab`. Prose after it does not parse.
  - `prop:<name>=<value>`, several joined by `&`. It chooses the example whose props say so. A plain name is one
    of the example's own props (or the spec's default). A name `part.prop` (`item.disabled`) also matches that
    prop anywhere inside the example's content structure: under its full key, or as the bare prop (`disabled`) on
    an object whose `part` field names that part or that names no part (a list of tab descriptors).
  - `open`. It clicks the component's trigger part (the part whose role is menubutton or dialogtrigger), or uses
    the example as it is when the trigger already says it is open.
  - `example:<id>`. It uses exactly that example.
- An action step may end in `@<part>`, an anatomy key, to name the part it acts on: `click@trigger`, `hover@item`.
  The state's own part is the default. A prop step takes no `@<part>`, so `prop:placeholder=name@example.com` works.
- Examples: `hover`; `prop:disabled=true`; `prop:invalid=true&errorMessage=Enter an email address.`;
  `open > key:ArrowDown@item`; `example:side-top > open > hover@item`; `prop:defaultOpen=true&content.side=bottom`.
- Which instance it acts on, document-wide (portalled parts included): a visible one; not disabled unless the state
  is the disabled one; for `focus-by-keyboard`, one that can take focus, reached by real Tab presses (tabindex not
  -1 first; in a roving focus group, where Radix gives every tab -1 and the list forwards focus, the tab Tab lands
  on) or, for a part that cannot take focus (Input's control), its focusable descendant, with the state then
  checked on the part (`:focus-within`); never one already in a stronger state of `precedence` (a state not
  listed in precedence yields to none, as in the generated CSS). An example whose every instance is disabled, or
  that does not render an optional part (`required: false`) a step needs, is passed over, not failed; a required
  part that is missing fails. A prop-only reach checks an instance already in the state. `open` on an example with
  no trigger on the page counts it open when one of its parts carries `data-state="open"`.
- A key step presses where focus is when focus is already inside the component (an open menu); otherwise it Tabs
  to the part first. Name the part the key acts on: `open > key:Escape@content`, not `open > key:Escape` on a
  state whose part is the trigger.
- Colours: an optional part (`required: false`) that the chosen example does not render is counted "not present"
  for that state, not failed. A required part that is missing still fails.

## The focus rule (generic focus-visible check)
Every control reached by real Tab presses must show an indicator, one of:
- an outline at least 2 px wide on the focused element itself;
- an outline at least 2 px wide on its nearest ancestor whose data-slot names a part that
  `accessibility.focus.ring` names (as whole words matching anatomy keys or slots). Input's ring is `control`, drawn
  through `:focus-within`, while the input itself draws none;
- for a part whose role is menuitem, menuitemcheckbox or menuitemradio: the highlight, `[data-highlighted]` with a
  background at least 3 to 1 against the menu surface (the nearest ancestor part whose role is menu).
A focused element with none of these fails. Radix's focus guards (`data-radix-focus-guard`) are skipped. The lint's
`no-hover-on-menu-items` keeps `:hover` and `:focus` off menu item parts, so the highlight is the only indicator.

## Target size (generic target-size check)
WCAG 2.5.8 as written. A target under 24 by 24 px passes when a 24 px circle centred on its box meets no other target
and no other undersized target's circle (the spacing exception), or when it is inline in a sentence. Elements that
take focus but are not pointer targets are not measured: a tabpanel, a dialog's own container, a scrollable region
made focusable with tabindex.

## What cost Button a cycle
- The gallery once set the type size on html, which made 1rem 14 px and every token 0.875 of its size (a 40 px
  button measured 35). If sizes look scaled, check the root font size before blaming the component.
- A media-feature override of `pointer` is ignored by Chromium. A coarse pointer needs CDP touch emulation
  (`Emulation.setTouchEmulationEnabled`) before `open()`. Assert `matchMedia("(pointer: coarse)")` before
  measuring.
- A state selector that also matched a busy control (aria-disabled) made loading look disabled. The spec now
  keys disabled on `:is(:disabled, [data-disabled])`, and Button sets data-disabled only when disabled.
  Check that each state's selector matches only that state.
- A fixed `height` could not grow for wrapped text. Use `minHeight` and `paddingBlock` in the spec when text can
  wrap.

## Test craft
- Reach focus with real Tab presses (loop until `document.activeElement` matches), never `.focus()`, so that
  `:focus-visible` holds.
- Click with `page.mouse.click` at the centre of the box: Playwright's `click()` waits on a disabled element.
- Measure every case before asserting, so that one failure message reports all of them.
- Prove each test catches its fault: break the component on purpose and see the test or tsc fail, then restore it.
  For Button: native disabled while loading, data-disabled while loading, no aria-hidden on the spinner,
  ariaLabel optional, or the id removed from the @ts-expect-error line.
- Hover and press with `page.mouse.move` / `mouse.down` after one load. The runner turns transitions off.
- Colour checks composite translucent fills over what is behind them. Copy `inPageColour` from button.tests.mjs.
