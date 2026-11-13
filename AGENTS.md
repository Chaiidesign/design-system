# AGENTS.md

Rules for building UI with this design system. Kept short on purpose: it lists only what cannot be worked out from the code.

## Before writing UI

1. Check `components/` for an existing component. Read its `.md` file, including "Do not use it when".
2. Look up tokens in `dist/tokens.resolved.json` (name, purpose, value per theme).

## Rules

- **Colour: semantic tokens only.** Use `var(--ds-color-*)`. Never write a hex, `rgb()` or `hsl()` value, and never use `var(--ds-palette-*)`. Reason: themes and rebrands change the palette; only semantic tokens stay correct in dark mode.
- **Spacing, radius, type size, duration: tokens only.** Use `--ds-space-*`, `--ds-shape-*`, `--ds-font-size-*`, `--ds-motion-*`. Reason: one change must update everything.
- **Reuse before creating.** Use existing component classes (`ds-button`, `ds-field`, `ds-callout`) with their documented markup. Do not restyle them from outside. If nothing fits, say so and propose a new component; do not build a one-off.
- **Never remove a focus outline**, and keep interactive targets at least `--ds-size-control-sm` (32px) tall.
- **Any new text-on-background pairing** must be added to `tokens/contrast-pairs.json` so it is checked in both themes.
- **Write UI text to the component's Content section**: verb-plus-object button labels, errors that say what to do, sentence case.

## Changing the system

- Edit `tokens/*.tokens.json`, never `dist/`. Files in `dist/` and `docs/tokens.js` are generated.
- A new semantic colour must be added to both `semantic.light.tokens.json` and `semantic.dark.tokens.json`; the build fails otherwise.
- A component is a folder: `components/<name>/<name>.css` plus `<name>.md` with the sections Use it when / Do not use it when / Markup / Accessibility / Content.
- Add a line to `CHANGELOG.md`. Renaming or removing a token or class is a breaking change.

## Commands

- `npm run build`: tokens to `dist/tokens.css`, `dist/tokens.resolved.json`, `docs/tokens.js`
- `npm run check`: build, contrast check, CSS token lint. Must pass before finishing.
