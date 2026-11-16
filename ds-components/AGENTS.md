# Building with Souvenir DS (V2 direction)

For people and agents who build screens with this package. Stage: alpha, on the branch `v2-direction`; not released. The repo's root AGENTS.md describes version 0.2, an older and separate set of parts.

## Read in this order

1. `ds-tokens/dist/tokens.json`: every token with its Figma name, CSS name, value per mode and a one-line description. Read this, not the CSS.
2. `ds-components/generated/spec-index.json`: the five components, their parts, props, defaults and states.
3. `ds-components/specs/<name>.spec.json`: the full contract of the one component you are using. `ds-components/docs/<name>.md` is the same thing as a page.
4. `ds-components/src/<name>/<name>.examples.tsx`: working uses to copy.

## Names

One name, written once in Figma. Figma `text/primary` is CSS `--color-text-primary`; a trailing `/default` is dropped (`surface/primary/default` is `--color-surface-primary`). Component names follow Radix: Button, Input, Tabs, DropdownMenu, Dialog. Parts of a compound component are `<Name><Part>`: `TabsList`, `DialogTitle`.

## Rules

- **Tokens only.** No raw colour, length or font in a component or a screen. If no token fits, stop and say which job has no token; do not pick a near value.
- **Never a primitive.** `pink/800` and `neutral/light/500` are not available in CSS on purpose. Use the token named for the job.
- **Use what exists.** Use one of the five components before writing markup that does the same job. A new pattern goes into the system, not into a screen.
- **Props are a fixed list.** Each enum prop has listed values and a default (see the contract). Do not pass a value that is not listed.
- **States are selectors, not props.** Hover and focus are never props. Style a state with the selector the spec gives: `[data-state="active"]`, `[data-highlighted]`, `[data-disabled]`, `:focus-visible`.
- **Find a part by its slot name:** `[data-slot~="tabs-trigger"]`. `data-slot` is a list of names, so always match with `~=`.
- **One primary button in a view.** Button's default is secondary.
- **A destructive button says what it destroys** ("Delete project"). In the dark theme its red is close to the brand pink; never rely on the colour.
- **A Dialog always has a DialogTitle.** An Input always has a label, or `ariaLabel`.
- **Theme and density** are attributes on the root element: `data-theme="light|dark"`, `data-density="standard|compact"`.
- **Load the CSS in one order.** In the app's entry stylesheet, first `@layer theme, base, ds, components, utilities;`, then Tailwind, then `tokens.css`, then `styles.css`. Any other order lets a reset strip Button and Input. `ds-tokens/README.md`, "Loading the CSS", has the snippet and what was checked.
- **A link keeps its underline.** A link and brand text are the same colour in both themes.
- **A disabled Button is told apart by its label only.** Its fill equals a hovered secondary Button's. Do not put the two side by side as the only cue for anything.

## Check your work

```bash
npm run v2:specs     # specs valid, code generated from them
npm run v2:lint      # no raw values, no primitives, slots present, types pass
npm run v2:test      # every example in a real browser: states, keyboard, axe, contrast
```

A check that fails is telling you something true. Fix the screen, not the check.

## Known and open

- DropdownMenu in Radix's default modal mode fails one axe rule (`aria-hidden-focus`): the trigger stays focusable in markup while the page behind an open menu is hidden. Measured: focus cannot reach it by key, pointer or script. It is reported, not hidden.
- 25 tokens (border widths, focus ring, control and icon sizes, motion, shadows, a scrim, a strong control edge, two stacking levels) exist in the repo and not yet in Figma: `ds-tokens/proposed/`. They hold raw numbers, because Figma has no primitives for them yet.
- 73 colour values differ from Figma on purpose, to pass contrast: `ds-tokens/overrides.json`, each with its reason.
- Not built: a direction provider for right-to-left per instance (set `dir` on the root element), and a forced-colours look for a disabled menu item.
- Nothing here has been tested with people, a screen reader or a real phone. Only Chromium was used.
