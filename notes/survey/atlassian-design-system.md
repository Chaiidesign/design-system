Checked: 2026-11-13

# Atlassian Design System (ADS), survey notes

Method note: atlassian.design is a client-rendered site. Fetching its normal pages (button, textfield, design tokens) returned empty text, and the principles page I guessed (/foundations/design-principles) returned 404. Most facts below therefore come from the site's own plain-text files (llms-*.txt), which are primary but machine-generated. Summaries were produced by a fetch tool, so exact wording is only quoted where the tool returned a quote.

## (a) Design principles
Source: https://atlassian.design/get-started/about-atlassian-design-system
- Three values: Foundational, Harmonious, "Empowering, for everyone". The page says "We avoid consistency for the sake of consistency and reject infinite flexibility."
- Three principles: "Trusted fundamentals before comprehensive patterns"; "Meet system needs before delivering individual features"; "Bring people on the journey before helping for the moment".
- The dedicated vision/values/principles page was not read directly (it appeared in search as https://atlassian.design/get-started/vision-values-principles).

## (b) Token architecture
Source: https://atlassian.design/llms-tokens.txt
- Tiers: the file does not formally name primitive and semantic tiers. Tokens are grouped by category (color, typography, space, radius, border width, elevation, opacity and others), and agents are told to prefer semantic names.
- Naming: dot-separated, general to specific, for example `color.background.brand.bold.hovered` and `space.100` (8px).
- Theming: colour tokens carry paired light and dark values, so one name adapts to the active theme.
- Format: used in code as `token('name')` from `@atlaskit/tokens`, inside `css` or `cssMap` from `@atlaskit/css`. Values are hex, px/rem, numbers and shorthand strings. There are no separate font-size tokens; size comes through a `font` shorthand.
- The file tells agents never to hardcode colours. The fetch tool also noted small errors in the file (a referenced token `color.background.disabled` that is not in the list, and a malformed example call). (not verified beyond the tool's reading)

## (c) How a component is documented
Source: https://atlassian.design/llms-components.txt (a 545,000-character file; I read only parts)
- Each package is a `## @atlaskit/<package>` section. Each component has a description, keywords, category, status, TSX examples, a props table, and bullet lists for Usage, Content and (sometimes) Accessibility guidelines.
- Button: package `@atlaskit/button`, six components (Button, IconButton, LinkButton, LinkIconButton, SplitButton, ButtonGroup). Guidance says buttons trigger actions and links navigate. I did not confirm the section tabs of the live Button or Text field web pages (the pages rendered empty to my tool). (not verified)
- Text field guidance (llms-components.txt): label required above the input, helper text optional, do not put critical information in placeholders, `isInvalid` marks a bad value, validate on blur and announce errors politely.

## (d) Governance, versioning, deprecation
Source: https://atlassian.design/release-phases
- Release phases: Early Access (0.x, breaking changes in minor releases), Beta (1.0 onward, breaking changes only in major releases, "should be infrequent"), General Availability.
- Deprecation phases: Intent to Deprecate (Caution) and Deprecated, with a replacement and migration path.
- Removal: "No General Availability feature will be removed from the system without a clearly announced deprecation period." The page gives no GA version range and no length for the deprecation period.
- Who decides: not stated on this page. Could not find.
- Contribution: the page's title, as indexed by web search, is "Contributions are only open to Atlassians" (https://atlassian.design/resources/contribution). The page body rendered empty to a fetch tool, so the wider wording (external users sent to a feedback collector) comes from a search summary only. (not verified beyond the page title)
- Support channels: public Atlassian Developer Community; Slack and critique sessions for Atlassians only (https://atlassian.design/get-started/about-atlassian-design-system).

## (e) Accessibility
Source: https://atlassian.design/llms-a11y.txt
- Stated standard: "built to meet WCAG 2.1 AA standards".
- Testing described: axe checks in unit tests through an internal `@af/accessibility-testing` package, an opt-in audit flag, a colour-contrast check in visual tests, and a manual checklist (keyboard, NVDA, JAWS, VoiceOver, high contrast, 200% and 400% zoom, reduced motion).
- The page does not say these are mandatory in CI or that a formal conformance audit exists. Treat the claim as intent.
- Also: the blog post "accessibility by default" is a principle per a search snippet only. (not verified)

## (f) Content, voice and tone
Source: https://atlassian.design/llms-content.txt
- Voice: clear, direct, professional yet approachable, localisation-friendly; brand personality "Practical, with a wink". Tone calms and solution-focused when something has gone wrong.
- Buttons: sentence case, verb-first ("Create page", not "Creating a page"); ellipsis only when more input is needed.
- Errors: "Must include clear resolution steps"; no exclamation marks or ellipses.
- Content design hub: https://atlassian.design/get-started/content-design (listed in search, not read). (not verified)

## (g) What it gives AI agents
Sources: https://atlassian.design/llms.txt, https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era
- `llms.txt` is an index to topic files: llms-tokens.txt, llms-primitives.txt, llms-components.txt, llms-styling.txt, llms-a11y.txt, llms-content.txt, and llms-full.txt (everything). The full file is very large (about 640,000 characters for llms-full), which is a real cost for an agent's context.
- MCP server: official, hosted at `https://mcp.atlassian.com/v1/ads/public/mcp` (HTTP) or local via `npx -y @atlaskit/ads-mcp`. It covers tokens, icons, components, primitives and accessibility tooling.
- Agent skill: an `atlassian-design-system` skill exists for Atlassian staff only.
- The May 28, 2026 blog post describes "structured content" context files, skills and markdown for portability. It reports self-reported gains (52% accuracy, 34% faster, 26% fewer tool calls, 16% fewer tokens). The post says the team "conducted evals" but describes no method, so treat the figures as unverified.
- Rules for agents inside the files: use only listed tokens, never hardcode colours, prefer `Text` and `Heading` over raw type tokens.
- I did not find a published rules file for agents to install (an AGENTS.md style file). Could not find.

## (h) Checkout-relevant parts
Source: https://atlassian.design/llms-components.txt unless stated
- Form: components Form, Field, Fieldset, ErrorMessage, FormFooter, CheckboxField, CharacterCounter. Form accessibility guidance: "Never disable the submit button" (use validation and instructions instead).
- Messages: Flag for confirmations and alerts needing minimal interaction; Inline message when action is required; Banner for critical system messages; "Do not use auto-dismiss for critical messages."
- Error content: https://atlassian.design/llms-content.txt (see f).
- Order or cost summary: nothing found in the portions I read; the files cover about 100,000 to 200,000 and 440,000 to 540,000 characters of llms-components.txt only. Could not find.

## (i) Weaknesses
- Outside contribution is closed (see d). (not verified on the primary page)
- Styling migration pain: Atlassian's own RFC for moving components from Emotion to Compiled CSS-in-JS warns of visual regressions and "unforeseen side effects", and partners reported bundler failures and dependency problems. Source: https://community.developer.atlassian.com/t/rfc-73-migrating-our-components-to-compiled-css-in-js/85953 (posted Nov 7, 2024).
- The llms-tokens file has small internal errors (see b), and the docs site itself does not render without JavaScript.

## (j) Is it current?
- Latest items on the What's new page: "Typography system reaches General Availability" on Sep 9, 2025 (https://atlassian.design/whats-new).
- Newer evidence: the AI blog post dated May 28, 2026 (URL in g). No later release note found. The agent files and MCP server appear to be maintained but I saw no version date for `@atlaskit/ads-mcp` (npm returned 403).

## For Souvenir
- Learn from the split of llms.txt into one index plus topic files, so an agent loads only what it needs; avoid shipping one giant full file as the only route.
- Learn from the MCP server being offered both hosted and local.
- Learn the naming pattern of general-to-specific tokens with state suffixes, and the plain agent rule "never hardcode colours".
- Learn the clear release and deprecation phases with a no-removal-without-notice promise; stay away from leaving "who decides" unstated.
- Stay away from a docs site that needs JavaScript to be read, and from claims of WCAG compliance without saying how it is enforced.

## Review 2026-11-13
Six claims re-checked against their sources: values and principles (about page), WCAG 2.1 AA and testing methods (llms-a11y.txt), release and deprecation phases (release-phases), MCP server URL, npx command and internal-only skill (llms.txt), blog date and figures (atlassian.com blog), contribution policy (contribution page, via search because the page renders empty). Also re-checked the What's new date (Sep 9, 2025, confirmed).
- (a) Second principle was misquoted; corrected to "Meet system needs before delivering individual features".
- (d) Contribution quote was misworded ("open only to Atlassians"); corrected to the page title "Contributions are only open to Atlassians", still marked not verified beyond that title.
- (g) "No method given" sharpened: the post says evals were conducted but describes no method.
Every other claim has a URL or a "(not verified)" mark, and all ten requested topics (a to j) are present; gaps (who decides, order or cost summary, live page tabs) are already stated as not found.
