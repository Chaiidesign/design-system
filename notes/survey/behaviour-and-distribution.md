Checked: 2026-11-13


## Radix UI Primitives
- What: open-source low-level component library, usable as the base of a design system; says it follows WAI-ARIA patterns "where possible" and handles ARIA, focus and keyboard. https://www.radix-ui.com/primitives/docs/overview/introduction
- Licence and maintainer: MIT, copyright WorkOS. https://github.com/radix-ui/primitives
- Lock-in: React. Packages are named `@radix-ui/react-*`; the docs page does not state the framework (not verified on the docs page). The repo is tagged "react". https://github.com/radix-ui/primitives
- Cost: a React dependency inside the system's behaviour layer.

## React Aria (Adobe)
- What: "Over 50 components" with built-in behaviour, internationalisation (30+ languages, 13 calendar systems), drag and drop, form validation; style-free, exposes states as data attributes such as `[data-pressed]`. https://react-aria.adobe.com/
- Licence: Apache-2.0 (repo). https://github.com/adobe/react-spectrum
- Lock-in: React only; the docs show only React code. https://react-aria.adobe.com/
- Cost: React dependency. The data-attribute styling hook is plain CSS and portable.

## UI SDK (vercel-labs/ui)
- Exists: yes. Public repo, described as "A library of behaviors for agents to build the next generation of user interfaces." https://github.com/vercel-labs/ui
- Packages: `@ui-sdk/core` plus adapters for React, Vue, Svelte, Solid and Web Components (`@ui-sdk/web`). https://github.com/vercel-labs/ui
- Status and stability: "in beta"; framework, APIs, documentation and behaviour "may change before general availability." https://github.com/vercel-labs/ui . Docs: "some APIs may still change." https://ui-sdk.dev/docs
- Version: not shown on GitHub (Releases and Packages empty) or on the docs pages (not verified; npm not checked).
- Licence: Apache-2.0. https://github.com/vercel-labs/ui
- Agent features: a `ui-sdk` skill, `llms.txt`, WebMCP coverage. React setup needs React 19 or newer. https://ui-sdk.dev/docs
- Cost: the only option here built around agents and several frameworks, but it is beta and from a lab. Dependence on it means accepting API churn.

## Native HTML and Web Components
- `<dialog>`: `showModal()` makes the rest of the page inert, moves focus in, closes on Esc, offers `::backdrop`. Baseline widely available since March 2022. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- Popover API: `popover` attribute and top-layer display, non-modal. Baseline 2025, "newly available" (since January 2025), with the page's caveat that "some parts of this feature may have varying levels of support." Light dismiss not confirmed on that page (not verified). https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- Form validation: required, pattern, min/max, type, plus the Constraint Validation API. Client-side validation is not security. https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation
- `:user-invalid`: matches only after the user interacts. Widely available since November 2023. https://developer.mozilla.org/en-US/docs/Web/CSS/:user-invalid
- `inert`: makes a subtree non-interactive, unfocusable and hidden from assistive technology. Widely available since April 2023. https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- Custom elements: autonomous ones are fine; Safari does not plan to support customised built-ins (`is=`). https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
- Declarative shadow DOM: `<template shadowrootmode="open">`, useful for server rendering. Baseline status not on the page (not verified). https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- CSS `@layer`: order beats specificity; widely available since March 2022. https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
- CSS `@scope`: scope root and limit, proximity in the cascade; Baseline 2026 "newly available" since March 2026. Older browsers may lack it. https://developer.mozilla.org/en-US/docs/Web/CSS/@scope
- Container queries: style by container size. Baseline date not on the page (not verified). https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
- Licence and lock-in: web standards, no framework. Cost: the system must write and test behaviour for what the platform lacks (menus, comboboxes, tabs were not checked here). Newly available features need a browser-support policy.

## shadcn/ui registry and CLI
- What: the `shadcn` CLI can run your own registry that distributes components, hooks, pages, config and rules to any project; "not limited to React." https://ui.shadcn.com/docs/registry
- Licence: MIT; 128k stars. https://github.com/shadcn-ui/ui
- Model: code is copied into the consumer's project, not imported as a package; the docs say shadcn/ui "hands you the actual component code" instead of an npm package. https://ui.shadcn.com/docs . Item schema is on separate spec pages, not read (not verified).
- Cost: consumers own and diverge from copies, so fixes do not propagate. Fits agents, which edit local files easily.

## Storybook
- What: workshop for building UI components in isolation; officially supports React, Vue, Angular, Svelte, Web Components and others. Docs show version 10.6. https://storybook.js.org/docs
- Licence: MIT. https://github.com/storybookjs/storybook
- Testing: the "test addon" is the Vitest addon, running stories as tests in Playwright's Chromium. The a11y addon is built on axe-core; `parameters.a11y.test` set to 'error' fails CI. https://storybook.js.org/docs/writing-tests/accessibility-testing
- Visual tests: only a link and a product name on the pages read; details not verified.
- Cost: a build tool and story format to maintain; framework-agnostic.

## Playwright and axe-core
- Playwright runs axe through `@axe-core/playwright`. Docs say automated tests cannot detect all WCAG violations. https://playwright.dev/docs/accessibility-testing
- Playwright: Apache-2.0; Chromium, Firefox and WebKit; JavaScript, Python, .NET, Java. https://github.com/microsoft/playwright
- axe-core: MPL-2.0; claims "on average 57% of WCAG issues" found automatically; returns "incomplete" items for manual review. https://github.com/dequelabs/axe-core
- Cost: framework-neutral, tests rendered output. Leaves roughly half of issues to manual review (by the vendor's own figure).

## Style Dictionary and Terrazzo
- Style Dictionary: "A build system for creating cross-platform styles," Apache-2.0. https://github.com/amzn/style-dictionary . First-class DTCG support since v4; DTCG 2025.10 not yet fully supported, in progress for v5. https://styledictionary.com/info/dtcg/
- Terrazzo: DTCG JSON to CSS, Sass, JS/TS; MIT; CLI has `build`, `lint`, `check`. https://github.com/terrazzoapp/terrazzo , https://terrazzo.app/docs/ . Its docs say it is the only tool supporting the full DTCG format; resolvers and 2025.10 features are planned for 2.0 (self-claim, not independently verified).
- Versions and maintainers of both: not shown (not verified).
- Cost: both are Node tools; outputs are plain CSS/JSON, so consumers need no dependency.

## For Souvenir
- Learn from the platform first: dialog, popover, inert, `:user-invalid`, `@layer` are widely available and need no library; check the newly available ones (popover, `@scope`) against a stated browser policy.
- Learn from shadcn's registry model for agent delivery: files copied into a project, any framework. Stay away from assuming copies stay in sync.
- Treat UI SDK as a thing to watch, not to depend on: it is beta, version not shown, and the only multi-framework, agent-oriented option found.
- Stay away from Radix or React Aria as a required layer if technology-agnostic is a hard rule; both are React-only as far as the pages show.
- Pair axe-core checks (via Storybook or Playwright) with manual review; the vendor itself says about 57% is automated.

## Review 2026-11-13
Six claims checked against their sources and confirmed: UI SDK exists, is in beta with APIs that may change before general availability, has core plus React, Vue, Svelte, Solid and Web Components adapters, Apache-2.0, no version on GitHub; CSS `@scope` Baseline 2026 newly available since March 2026; Popover API Baseline 2025 newly available since January 2025; axe-core MPL-2.0 and "on average 57% of WCAG issues"; Style Dictionary first-class DTCG since v4, 2025.10 not fully supported and in progress for v5; shadcn registry "not limited to React".
- UI SDK licence line had no URL; added the repo URL, where Apache-2.0 is confirmed.
- Popover API: added MDN's caveat that some parts have varying levels of support, so "newly available" is not read as full support.
- shadcn "code is copied into the project" had no URL; added the docs URL and its wording ("hands you the actual component code").
- Gap, not filled here: maturity (current version, release history) is not given for Radix, React Aria, Style Dictionary or Terrazzo, and Storybook visual tests remain unverified. Later decisions should not assume these are known.
