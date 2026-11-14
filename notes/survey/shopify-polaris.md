Checked: 2026-11-13

# Shopify Polaris survey (patterns altitude, clay)

Access note: polaris.shopify.com and polaris-react.shopify.com now answer with a 301 redirect to https://shopify.dev/docs/api/polaris, so I could not read their old pages directly. Old-system facts below come from the archived GitHub repos. The old docs site (storybook.polaris.shopify.dev) returned no usable content. Fetch summaries were produced by a small model, so quotes are short and paraphrase is likely.

## Current state (j)
- Polaris is now "Shopify's unified UI framework built on web components" (https://shopify.dev/docs/api/polaris).
- Polaris Web Components were released 1 October 2025; the React library is deprecated, and the repo was archived 11 September 2026 (https://github.com/Shopify/polaris).
- Latest release found: "Polaris 2.0 is now stable", changelog dated 22 October 2026 (https://shopify.dev/changelog and https://shopify.dev/changelog/polaris-cdn-2-0-is-now-stable). It follows a 2.0.0-rc.1 entry dated 1 October 2026. Current: yes.

## (a) Design principles
- Not found on a Polaris page. The nearest is the app design guidelines, which list five principles, including "Match the Shopify admin", mobile first, merchant needs first, a high quality bar, and accessibility (https://shopify.dev/docs/apps/design). Treat these as app guidance, not Polaris's own principles (not verified as such).

## (b) Token architecture
- Old React system (v11 era): CSS custom properties with a `--p-` prefix, then category, then path, such as `--p-color-{role}-{intent}-{state}` with roles text, bg, border, icon; also border, motion, shadow and z-index families (https://github.com/Shopify/polaris/blob/main/documentation/guides/migrating-from-v10-to-v11.md).
- Version 12 split tokens into primitive and semantic layers (https://polaris.shopify.com/previous-releases/version-12, seen only as a search snippet, so not verified).
- Web components: a Shopify staff reply, as relayed in a search summary, says no CSS tokens are provided (https://community.shopify.dev/t/built-for-shopify-polaris-web-components/33561; not verified). The docs say styling "can't be overridden with custom CSS" and use properties such as `tone` and `padding` (https://shopify.dev/docs/api/polaris/using-polaris-web-components).
- Theming: the new look is chosen at runtime from a signal sent by the Shopify admin through App Bridge (https://shopify.dev/docs/apps/build/app-home/polaris2). Format: CSS custom properties (old); no token file format found for the new system.

## (c) How one component is documented
- Button page (https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button): Use cases, Properties, Events, Slots, Examples, Best practices, Limitations.
- Text field page (https://shopify.dev/docs/api/app-home/polaris-web-components/forms/textfield): same pattern, with named examples such as "Provide specific error messages for merchant context".
- Props include `variant`, `tone`, `loading`, `disabled`, `accessibilityLabel` (button) and `error`, `required`, `maxLength` (text field).
- There is no "do not use when" section on either page.

## (d) Governance
- Old React system, from CONTRIBUTING (https://github.com/Shopify/polaris/blob/main/.github/CONTRIBUTING.md): anyone may contribute, with a CLA; non-trivial changes need a proposal issue first; maintainers merge, request changes or close.
- Old versioning: semver. Removing a component or prop is a major change. Deprecations land in a minor version with warnings and an upgrade path, then removal in the next major.
- That repo is archived, so this process is no longer in use.
- New system: it is a CDN script with channels `polaris-N.js` (stable), `polaris-N.M.js` (pinned) and `-rc` builds. Stable releases are immutable except for critical security fixes (https://shopify.dev/docs/api/app-home/v2.0/web-components/versioning).
- That page states no deprecation or removal policy, and I found no page on who decides or how outsiders contribute to the new system (could not find).

## (e) Accessibility
- The components include semantic HTML, keyboard support, ARIA and focus handling, and log warnings when required accessibility properties are missing (https://shopify.dev/docs/api/polaris/using-polaris-web-components).
- The app guidance cites WCAG 2.0 principles and requires AA contrast, and recommends Accessibility Insights, Lighthouse and WAVE. It says following it does not guarantee accessibility (https://shopify.dev/docs/apps/build/accessibility).
- A Polaris page stating a WCAG 2.1 A and AA target appeared only in a search snippet (https://polaris.shopify.com/foundations/accessibility; not verified). How Shopify tests its own components: could not find.

## (f) Content, voice and tone
- Voice stays consistent and matches the admin; tone adapts to the situation, and errors are more direct than onboarding tips. Plain language aimed at a US grade 7 reading level. One term per concept. Calls to action start with a strong verb (https://shopify.dev/docs/apps/design/content).
- Button docs add: verbs, sentence case, no punctuation, critical tone only for destructive actions that are hard to undo (button page above).
- Text field docs: state what is wrong and how to fix it; replace "Invalid value" with the actual rule (text field page above).

## (g) AI agents
- Dev MCP server `@shopify/dev-mcp`, local, no authentication (https://shopify.dev/docs/apps/build/devmcp). Its Polaris support was announced 21 May 2025 as early access (https://shopify.dev/changelog/the-shopifydev-mcp-server-now-supports-polaris-web-components).
- Tool names (`learn_shopify_api`, `search_docs_chunks`, `validate_component_codeblocks`) come only from third-party listings (not verified).
- Docs pages offer Markdown versions, for example https://shopify.dev/docs/api/polaris.md.
- The migration guide tells readers to review each AI-generated diff (https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react).
- https://shopify.dev/llms.txt returned 404. A "shopify agent skill" is mentioned on the MCP page, with no detail read. Agent rules files: could not find.

## (h) Checkout-relevant parts
- Checkout UI extensions offer, among others, Text field, Email field, Phone field, Money field, Number field, Select, Choice list, Checkbox, Consent checkbox, Form, Button, Link, Banner and Announcement (https://shopify.dev/docs/api/checkout-ui-extensions/latest/polaris-web-components, API version 2026-10).
- There is no dedicated error component (Banner is closest) and no order or cost summary component in that list.
- Field errors use the `error` property, which shows a message under the field and announces it to screen readers (text field page above).
- `loading` on the button disables it and shows an indicator (button page above).

## (i) Weaknesses
- Missing features at launch: a developer reported no bulk actions or multi-row selection in `s-table`, thinner docs, and deprecation of React before parity. A Shopify staff member replied that web components are "the future of the admin" and that React apps get no further updates (https://community.shopify.dev/t/is-anyone-else-disappointed-with-polaris-web-components-so-many-missing-features/23687, October 2025).
- Styling is closed: Shadow DOM stops overrides, and the docs tell teams to use documented properties only (https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react).
- The archived README still says pull requests are welcome while also saying none are accepted (https://github.com/Shopify/polaris).

## For Souvenir
- Learn: the component page skeleton (Use cases, Properties, Events, Slots, Examples, Best practices, Limitations) is a clear, repeatable shape. Add the "do not use when" section Polaris lacks.
- Learn: per-field `error` with guidance to say what is wrong and how to fix it, and button labels as sentence-case verbs, match our own rules.
- Learn: release channels with immutable stable versions, a pinned option and a candidate channel are a tidy versioning model.
- Avoid: deprecating the old system before the new one reaches parity, and shipping without a written deprecation policy. Polaris web components may also expose no public token layer, but that rests only on a relayed forum reply (not verified).
- Avoid: sealing components so consumers cannot adapt them, and leaving agent support (llms.txt, rules files) unclear.

## Review 2026-11-13
Six claims checked against their cited URLs: repo archive date, React deprecation and the 1 October 2025 web components release (github.com/Shopify/polaris); "Polaris 2.0 is now stable" on 22 October 2026 and the 2.0.0-rc.1 entry on 1 October 2026 (shopify.dev/changelog); release channels, immutability and the absence of a deprecation policy (versioning page); button page sections, label guidance and `loading` behaviour (button page); Dev MCP Polaris support in early access on 21 May 2025 (changelog entry); llms.txt returning 404. Also re-checked the checkout component list (API 2026-10, no order or cost summary component) and the README's contradictory pull-request sentences. All held.
- Corrected: the "For Souvenir" bullet said Polaris ships "no token layer" as fact; that rests only on an unverified forum reply relayed in a search summary, so it is now marked (not verified).
