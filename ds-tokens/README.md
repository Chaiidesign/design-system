# ds-tokens

The Souvenir design tokens, generated from the owner's two Figma files. Figma is the source;
everything in `primitives/`, `semantic/`, `dist/` and `tokens.resolver.json` is generated. Do not edit those files.

## The one command

    node v2/tools/build-tokens.mjs

It reads the checked snapshot of Figma (`v2/figma/semantic.txt`, `v2/figma/primitives.txt`), applies
`overrides.json`, merges `proposed/tokens.json`, runs every check, and writes the files only if all checks pass.
It prints a count per collection (308 semantic, 225 primitive), the number of proposed tokens merged (22), and a
one-line summary. `--self-test` plants faults in memory and
confirms they are caught.

## What is here

| Path | What it is |
| --- | --- |
| `primitives/*.tokens.json` | Raw values named by value (colour, typography, space, radius). DTCG 2025.10. Never used by components. |
| `semantic/*.tokens.json` | Tokens named by purpose, each an alias to a primitive. One file per collection and mode; the first mode keeps the plain name (`color.tokens.json` is light, `color.dark.tokens.json` is dark; `space.tokens.json` is standard, `space.compact.tokens.json` is compact). |
| `tokens.resolver.json` | DTCG 2025.10 resolver: the `theme` modifier (light, dark) and the `density` modifier (standard, compact). |
| `dist/tokens.css` | Semantic custom properties, named exactly as Figma's WEB code syntax, as literal values. Theme by `data-theme`, or by system preference when no `data-theme` is set; density by `data-density`. |
| `semantic/{border,size,motion}.tokens.json`, `semantic/elevation{,.dark}.tokens.json` | Proposed tokens only (not in Figma), each marked `$extensions."com.souvenir.proposed": true` with its `com.souvenir.why`. Proposed colours sit in the colour files with the same mark. |
| `dist/tailwind-theme.css` | Tailwind v4 `@theme inline` block mapping every semantic token that has a Tailwind namespace. Border widths, sizes and durations have none; use them as `h-(--size-control-md)`. Load `tokens.css` unlayered with it. |
| `dist/tokens.json` | Flat array of the 308 semantic tokens and 22 proposed tokens for agents and tools: name, collection, category, type, CSS name, description, value and alias per mode, scopes, overrides; proposed ones also carry `"proposed": true` and `why`. |
| `overrides.json` | Repo-side corrections waiting to be made in Figma. Not generated. |
| `proposed/tokens.json` | Tokens the components need that Figma does not hold yet. Not generated; see `proposed/README.md`. |

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
`--size-control-md`, `Motion duration/fast` is `--duration-fast`). Themes and Elevation tokens go in the theme
blocks of `tokens.css`; Border, Size and Motion in a `:root` block of their own (border in px, size in rem,
durations in ms). The build fails if a proposed name collides with a Figma variable or its CSS name, if an alias
names no colour primitive, or if the mode keys are not exactly the collection's modes. `v2/tools/diff-figma.mjs`
lists them as "Proposed in the repo, not in Figma" (not a failure) and writes them under "Variables to add" in
`audit/figma-patch-list.md`. When a token is added in Figma, delete it from `proposed/tokens.json` and rebuild.

## Checks the build runs

Every alias resolves to a primitive; every CSS name is unique and equals the Figma code syntax (read back
from the written CSS); no primitive name or `var()` appears in `tokens.css`; fades match Figma; counts match;
two builds in one run are byte-identical.
