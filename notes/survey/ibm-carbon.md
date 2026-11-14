Checked: 2026-11-13

# IBM Carbon Design System

Method note: pages were read through a fetch tool that summarises each page, so quotes are as returned by that tool. Several sub-pages I tried returned 404 (listed at the end).

## (a) Design principles
- Carbon's home page lists no design principles of its own. It calls Carbon "IBM's enterprise-ready, open-source design system, shaped by the IBM Design Language" (https://carbondesignsystem.com/).
- The principles live on the IBM Design Language site (https://www.ibm.com/design/language/philosophy/principles). The page text did not load for me, so I cannot name or quote them (not verified). A search snippet says the principles are meant to endure while their expression evolves (not verified; search result only).

## (b) Token architecture
- Vocabulary: theme, token, role, value. A token is a role-based identifier that stays the same across themes; the theme assigns the value (https://carbondesignsystem.com/elements/themes/overview/).
- Naming is by purpose, with a `$` prefix, for example `$layer-01`, `$text-primary`, `$border-strong`. Some tokens reference palette tokens; `$interactive` uses `$blue-60` in the default theme. The page does not use the word "tiers" (same URL).
- Categories: color, spacing, typography, global. Four themes: White (default), Gray 10, Gray 90, Gray 100 (same URL).
- Format: Sass module configured with `with`; definitions live in the `@carbon/themes` package, one file per theme (same URL). I did not find a W3C-style JSON token format (could not find).

## (c) How a component is documented
Text input page sections: Live demo; Overview (When to use, When not to use, Variants); Text input and Text area (Anatomy, Sizing); Formatting; Content (Labels, Helper text, Placeholder, Overflow); Universal behaviors (States, Validation, Required vs optional, Interactions); Modifiers; AI presence; Related; Feedback (https://carbondesignsystem.com/components/text-input/usage/). The button page follows the same pattern, adding Emphasis and button-group rules (https://carbondesignsystem.com/components/button/usage/). Each component has "When not to use" guidance, similar in spirit to Souvenir's own format.

## (d) Governance
- Contribution routes: new components start in Carbon Labs (own repo, Storybook, Figma) and must "follow the Product Development Lifecycle and complete all requirements in the component checklist"; enhancements, Figma kits, docs and bug fixes each have a route (https://carbondesignsystem.com/contributing/get-started/overview/).
- Who makes final decisions: the page does not say. GOVERNANCE.md and CONTRIBUTING.md paths I guessed returned 404 (could not find).
- Versioning: Carbon "aims to follow" Semantic Versioning. Deprecating a prop is a minor bump; removing it is major. TypeScript types and some DOM details (id, aria-label targets, data-testid) are exceptions (https://github.com/carbon-design-system/carbon/blob/main/docs/guides/versioning.md).

## (e) Accessibility
- Stated standard: components follow the IBM Accessibility Checklist, "based on WCAG AA, Section 508, and European standards" (https://carbondesignsystem.com/guidelines/accessibility/overview/). The page names no WCAG version for components; its colour section says Carbon colour themes aim for "WCAG 2.1 AA guidelines for contrast" (same URL). No WCAG 2.2 claim was found.
- Testing: automated accessibility verification tests run on every proposed change, using the IBM Equal Access Accessibility Checker (default and advanced states, keyboard). Manual screen reader testing (JAWS, VoiceOver, NVDA) happens periodically. Each component carries a status tag: Tested, Partially tested, Manually tested, Not available, Not tested (https://carbondesignsystem.com/components/overview/accessibility-status).

## (f) Content, voice and tone
- No dedicated voice-and-tone section. The content overview asks for clear, concise, actionable text, sentence-style capitalisation, standard IBM terminology, and points to IBM language and tone standards (https://carbondesignsystem.com/guidelines/content/overview/).
- Buttons: use "verb + noun" except common actions (Done, Close, Cancel, Add, Delete); sentence case; left-aligned labels (button page URL above).
- Labels: always present, short, no colons (text input page URL above).

## (g) What it gives AI agents
- Hosted MCP server at https://mcp.carbondesignsystem.com/mcp, exposing components, tokens, icons, guidance and code. Works with Claude Desktop, Claude Code, Cursor, VS Code, IBM Bob, Figma Make and others (endpoint and clients: https://carbondesignsystem.com/developing/carbon-mcp/onboarding-and-setup/; what it exposes: https://carbondesignsystem.com/developing/carbon-mcp/overview/). Issue tracker: https://github.com/carbon-design-system/carbon-mcp. Planned: Carbon Labs and Patterns context, agentic migration (overview URL).
- Agent rules and skills: setup page names AGENTS.md, `.cursor/rules/carbon-builder.mdc`, `.claude/skills/`, `.github/skills/` and others as install locations (onboarding URL above). A "carbon-builder" skill is implied by the file names; its content I did not read.
- llms.txt exists at https://carbondesignsystem.com/llms.txt: a Markdown index of Getting Started, Foundations, Components, Patterns, Data Visualization, Building Experiences, Support, Resources.

## (h) Checkout-relevant parts
- Form: labels required; helper text replaced by error or warning on state change; two-column form rules (https://carbondesignsystem.com/components/form/usage/). The form page defers error summary guidance to a forms pattern page I did not read (not verified).
- Validation: error when data is invalid or a required field is empty; real-time validation helps, otherwise validate on submit (text input URL above).
- Button: one primary button per screen, exceptions for temporary flows (button URL above).
- Errors and feedback: inline notifications stay until resolved and sit above the submit and cancel buttons for form errors; toasts auto-dismiss in about five seconds. Error body is one or two short sentences saying how to fix it; "User actions are mandatory for error messages" (https://carbondesignsystem.com/components/notification/usage/).
- Order or cost summary: no such component found (could not find). The site has a "Buy" step in its Universal Experiences journey (https://carbondesignsystem.com/ home page navigation); I could not open its page.

## (i) Known weaknesses
Only anecdotal sources; no formal review found.
- A reviewer on the Open edX wiki called the layout system lacking and documentation hard to navigate (https://openedx.atlassian.net/wiki/x/AQDONw; seen as a search summary, not opened).
- A tester importing Carbon into Claude Design found Figma import produced many inconsistencies, while GitHub import worked better (https://uxplanet.org/using-design-systems-in-claude-design-how-good-is-it-bb697a767b44; search summary, not opened).
- Official docs gap: no stated decision owner, and "aims to follow" semver rather than guaranteeing it (see d).

## (j) Currency
- Latest GitHub release found: v11.120.0, 4 November 2026 (https://github.com/carbon-design-system/carbon/releases). Home page points to a planned Carbon v12 (https://carbondesignsystem.com/). Actively maintained.

## Could not open
carbondesignsystem.com/guides/mcp/overview, /guides/accessibility/overview, /building-experiences/universal-experiences/buy; GitHub GOVERNANCE.md and CONTRIBUTING.md; ibm.com principles page text.

## For Souvenir
- Learn: every component page has "When to use / When not to use" and a Content section, plus a per-component accessibility status tag. Copy that honesty.
- Learn: error messages must tell the user what to do; inline for form errors, toasts only for transient information.
- Learn: ship agent access in layers: MCP server, llms.txt and agent rules files, not only one.
- Avoid: leaving ownership and deprecation rules implicit; Carbon's public contribution page names no decider.
- Avoid: assuming Carbon covers checkout. I found no order summary component, so Souvenir must define its own.

## Review 2026-11-13
Checked against the cited pages: MCP endpoint, clients and exposed content (g); agent rules and skill file paths (g); llms.txt sections (g); semver policy and its exceptions (d); stated accessibility standard (e); accessibility testing and status tags (e); latest release v11.120.0 on 4 November (j). All held except the corrections below.
- (e) The WCAG 2.1 AA contrast statement is on the accessibility overview page itself, so it is now cited to that page instead of marked "(not verified)"; the page names no WCAG version for components.
- (e) The status tag list was incomplete: added "Not available" (no test data exists or applies, such as keyboard tests for non-interactive components).
- (g) The MCP overview page names no endpoint and no clients; both come only from the onboarding page, so the citation now says which URL supports which part.
- Still open, not a correction: (a) the principles themselves are not named or quoted because the IBM Design Language page did not load; (i) both criticisms rest on search summaries, not opened pages.
