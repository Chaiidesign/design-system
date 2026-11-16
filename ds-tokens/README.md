# ds-tokens

The Souvenir design tokens, generated from the owner's two Figma files. Figma is the source;
everything in `primitives/`, `semantic/`, `dist/` and `tokens.resolver.json` is generated. Do not edit those files.

## The one command

    node v2/tools/build-tokens.mjs

It reads the checked snapshot of Figma (`v2/figma/semantic.txt`, `v2/figma/primitives.txt`), applies
`overrides.json`, merges `proposed/tokens.json`, runs every check, and writes the files only if all checks pass.
It prints a count per collection (308 semantic, 225 primitive), the number of proposed tokens merged (25 of 25), and a
one-line summary. `--self-test` plants faults in memory and
confirms they are caught.

## What is here

| Path | What it is |
| --- | --- |
| `primitives/*.tokens.json` | Raw values named by value (colour, typography, space, radius). DTCG 2025.10. Never used by components. |
| `semantic/*.tokens.json` | Tokens named by purpose. Each Figma token is an alias to a primitive; most proposed tokens hold a raw value (see "Proposed tokens"). One file per collection and mode; the first mode keeps the plain name (`color.tokens.json` is light, `color.dark.tokens.json` is dark; `space.tokens.json` is standard, `space.compact.tokens.json` is compact). |
| `tokens.resolver.json` | DTCG 2025.10 resolver: the `theme` modifier (light, dark) and the `density` modifier (standard, compact). |
| `dist/tokens.css` | Semantic custom properties, named exactly as Figma's WEB code syntax, as literal values. Theme by `data-theme`, or by system preference when no `data-theme` is set; density by `data-density`. |
| `semantic/{border,size,motion,layer}.tokens.json`, `semantic/elevation{,.dark}.tokens.json` | Proposed tokens only (not in Figma), each marked `$extensions."com.souvenir.proposed": true` with its `com.souvenir.why`. Proposed colours sit in the colour files with the same mark. |
| `dist/tailwind-theme.css` | Tailwind v4 `@theme inline` block mapping every semantic token that has a Tailwind namespace. Border widths, sizes, durations and layers have none (19 tokens); use them as `h-(--size-control-md)`. Load `tokens.css` unlayered with it (see "Loading the CSS"). |
| `dist/tokens.json` | Flat array of the 308 semantic tokens and 25 proposed tokens for agents and tools: name, collection, category, type, CSS name, description, value and alias per mode, scopes, overrides; proposed ones also carry `"proposed": true` and `why`. |
| `overrides.json` | Repo-side corrections waiting to be made in Figma. Not generated. |
| `proposed/tokens.json` | Tokens the components need that Figma does not hold yet. Not generated; see `proposed/README.md`. |
| `audit/` | Generated reports: `lint.json` (naming lint), `contrast.json` and `contrast.html` (contrast, Figma as it stands and the built set side by side), `proposed-overrides.json`, `diff.json` and `figma-patch-list.md` (the changes to make by hand in Figma). Do not edit. |

Names: one name written once in Figma; only the separator changes. Figma `text/primary` in the Themes
collection is JSON `color.text.primary` and CSS `--color-text-primary`.

Gradient `-fade` tokens are derived at build time: the glow colour at alpha 0. The build fails if a derived
fade differs from the value Figma holds.

## Overrides

`overrides.json` is an array. Each entry carries a fix in the repo until the owner applies it in Figma:

    { "token": "text/link/default", "collection": "Themes", "mode": "light",
      "to": "pink/700", "reason": "4.5:1 on surface/primary", "rule": "WCAG 1.4.3" }

- `collection` is the Figma name (`Themes`) or the category (`color`). `mode` must be one of its modes.
- `to` is a primitive name (it becomes the alias) or a literal of the token's type (`#rrggbb`, a number of px).
- The build fails if the token, mode or primitive does not exist, if `reason` is missing, or if it targets a fade.
- Each applied override is recorded under `overridden` in `dist/tokens.json` and in the token's `$extensions`.
- When Figma has the fix, delete the entry and rebuild.

## Proposed tokens

Each entry in `proposed/tokens.json` is merged with the CSS name the naming rule gives it (`Size control/md` is
`--size-control-md`, `Motion duration/fast` is `--duration-fast`, `Layer overlay` is `--layer-overlay`). Themes and
Elevation tokens go in the theme blocks of `tokens.css`; Border, Size, Motion and Layer in a `:root` block of their
own (border in px, size in rem, durations in ms, layers as plain numbers). Each carries its Figma scopes into
`dist/tokens.json` and the patch list; Motion and Layer carry none, because no Figma scope fits a duration, an easing
or a stacking level. The build fails if a proposed name collides with a Figma variable or its CSS name, if an alias
names no colour primitive, or if the mode keys are not exactly the collection's modes. `v2/tools/diff-figma.mjs`
lists them as "Proposed in the repo, not in Figma" (not a failure) and writes them under "Variables to add" in
`audit/figma-patch-list.md`, with the collections they need (Size, Motion, Elevation and Layer do not exist in Figma;
Border exists and is empty) and each variable's scopes. When a token is added in Figma, delete it from
`proposed/tokens.json` and rebuild.

The 25 proposed tokens do not meet naming rule 6 ("Every alias points at a primitive"): 23 of them hold a raw
value (a width, a size, a duration, an easing, a shadow, a stacking level, and the overlay colour `#00000080`); only
`border/strong/default` and `border/strong/hover` alias a primitive. The primitives they would point at do not
exist: Figma has no primitives for widths, sizes, durations, easings, shadows or levels, and no translucent black. A
number that happens to equal a Space or Radius primitive (for example 2) is a coincidence, not that primitive's
meaning. Adding those primitives is the owner's step in Figma; the repo does not invent them. On the sandbox copy,
where 23 of the 25 exist as variables (the two shadows do not), the naming lint reports 21 of them under rule 6
(`SOUVENIR_SNAPSHOT_DIR=v2/figma/sandbox node v2/tools/lint-tokens.mjs --report-only`).

## Audit tools and where they write

    node v2/tools/lint-tokens.mjs --no-fail        naming lint: writes audit/lint.json, exit 0 (without --no-fail: exit 1 on a breach)
    node v2/tools/audit-contrast.mjs --built       contrast: writes audit/contrast.{json,html} and proposed-overrides.json;
                                                   exit 1 only if a pair of the built set fails
    node v2/tools/diff-figma.mjs                   Figma against dist: writes audit/diff.json and audit/figma-patch-list.md

- `--report-only` on any of the three prints the report and writes nothing at all. `--no-fail` writes and exits 0.
- With `SOUVENIR_SNAPSHOT_DIR` set to any snapshot other than `v2/figma` (for example `v2/figma/sandbox`), each tool
  writes to `<that folder>/audit/` and never to `ds-tokens/audit/`.
- `contrast.html` and `contrast.json` hold both sets: Figma as it stands (no overrides, no proposed tokens) and the
  built set, with a "Before and after" table that lists every pair failing in either set, its ratio in each, the
  change, and the override (with its reason) or proposed token that changed it. The top level of `contrast.json` is
  the built set; `figma` holds the same fields for Figma as it stands; `changes` holds the per-pair rows.

## Loading the CSS

The component styles are written for one cascade-layer order; load them any other way and a host's reset can undo
them.

- `dist/tokens.css` declares no layer: it is plain custom properties. Load it unlayered.
- `dist/tailwind-theme.css` is one `@theme inline` block for Tailwind v4; it declares no layer of its own.
- `ds-components/src/styles.css` declares `@layer ds.tokens, ds.components, ds.extensions;` (three sub-layers of one
  layer, `ds`) and puts every component rule in `ds.components` or `ds.extensions`. Each rule has the specificity of
  one attribute selector (0,1,0), so its layer, not its selector, decides whether it survives. `ds.tokens` is
  declared and never filled; the tokens are unlayered on purpose.
- Tailwind v4 declares `@layer theme, base, components, utilities;` and puts its preflight reset in `base`. Layers
  are ordered by first appearance and a later layer wins. If the design system loads first, `base` comes after `ds`
  and the preflight strips the Button and Input (transparent background, no padding, no border). If Tailwind loads
  first with no order statement, `ds` comes after `utilities` and no utility class can adjust a component.
- An unlayered rule beats every layer whatever the order: an app reset written outside any `@layer` (for example
  `button { background: transparent }`) strips the components however they are loaded. Put app resets in `base`.

The supported order, for an app entry stylesheet with Tailwind v4 (the layer statement first, before any import):

```css
@layer theme, base, ds, components, utilities;
@import "tailwindcss";
@import "<path>/ds-tokens/dist/tokens.css";
@import "<path>/ds-tokens/dist/tailwind-theme.css";
@import "<path>/ds-components/src/styles.css";
```

Without Tailwind: load `tokens.css`, then `styles.css`, and keep any reset in a layer declared before `ds`
(`@layer reset, ds;`).

What was checked: four orders were loaded in headless Chromium with the real `tokens.css` and `styles.css`
and a stand-in for Tailwind's output (its layer statement, a preflight rule on `button` in `base`, one utility):
design system first, the Button lost its fill and padding; the supported order kept them and the utility still
overrode the fill; Tailwind first without the statement kept them but the utility could not override; an unlayered
reset stripped them in the supported order too. Not checked: a real Tailwind compile (Tailwind is not installed in
this repository), whether Tailwind's import handling keeps the leading `@layer` statement in place, and the
order without Tailwind.

## Checks the build runs

Every alias resolves to a primitive; every CSS name is unique and equals the Figma code syntax (read back
from the written CSS); no primitive name or `var()` appears in `tokens.css`; fades match Figma; counts match;
two builds in one run are byte-identical.
