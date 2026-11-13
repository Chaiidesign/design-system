# Design system

Version 0.1.0. A starting point built by following the *Design Systems Library* learning path: tokens first, then one button, accessibility built in, governance written down, and rules an agent can read.

Open `docs/index.html` in a browser to see it.

## What is here

| Layer | Where | State |
|---|---|---|
| Principles and voice | `docs/index.html#principles` | Draft placeholders |
| Tokens | `tokens/*.tokens.json` | 129 tokens, light and dark |
| Components | `components/<name>/` | Button, Field, Callout |
| Guidance | `components/<name>/<name>.md` | When to use, when not, accessibility, content |
| Tooling | `scripts/`, `dist/`, `docs/` | Build, contrast check, CSS lint, reference page |
| Agent surface | `AGENTS.md`, `llms.txt`, `dist/tokens.resolved.json` | Rules, index, machine-readable tokens |
| Governance | This file, `CHANGELOG.md` | Below |

Not here yet: patterns (forms, empty states, navigation), a Figma library, a component token tier, behavioural tests (axe, keyboard), visual regression tests, an MCP server.

## Commands

No dependencies; needs Node 20.11 or later.

```
npm run build   # tokens -> dist/tokens.css, dist/tokens.resolved.json, docs/tokens.js
npm run check   # build + contrast check + CSS token lint
```

## Tokens

Source files are in the DTCG 2025.10 format (a W3C Community Group report, not a W3C standard). `tokens/ds.resolver.json` says how they combine.

- `primitives.tokens.json`: raw values. `palette.*`, `space.*`, `radius.*`, `font.*`.
- `semantic.base.tokens.json`: purpose-named tokens that do not change by theme. `size.*`, `shape.*`, `border.*`, `motion.*`, `measure.*`.
- `semantic.light.tokens.json`, `semantic.dark.tokens.json`: purpose-named colour and elevation. `color.*`, `elevation.*`. Each is an alias to a palette step.

The rule: components use `color.*`, never `palette.*`. That is why a theme switch touches one layer.

### Rebrand

Change the ramps in `primitives.tokens.json` (`palette.accent` first), then run `npm run check`. The contrast check tells you which semantic pointers need to move to a different step.

### Add a theme

Add `semantic.<name>.tokens.json` with the same token names, add it to `contexts` in `ds.resolver.json`, rebuild. It is emitted as `:root[data-theme="<name>"]`.

## Using it in a page

```html
<link rel="stylesheet" href="dist/tokens.css">
<link rel="stylesheet" href="components/button/button.css">
<button class="ds-button" type="button">Save changes</button>
```

Theme follows the operating system. Force one with `<html data-theme="light">` or `data-theme="dark"`.

## Governance

- **Propose**: describe the need and where it appears. A new component needs at least two real uses; otherwise it stays in the product.
- **Build**: a component is CSS plus a guidance file with all five sections. Colour pairings it introduces go in `tokens/contrast-pairs.json`.
- **Review**: `npm run check` passes; keyboard-only walkthrough; both themes looked at.
- **Release**: bump the version in `package.json`, add a `CHANGELOG.md` entry, state any breaking change and how to migrate.
- **Deprecate**: mark the token with `$deprecated` (with the replacement in the string) or the component's guidance file with "Deprecated"; remove in the next major version.
