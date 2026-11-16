# V2 handoff one-pager and naming standard: what they say

Source summary, 16 November 2026. Clay: a record of what two documents say, not a spec. Nothing here has been checked against the Figma files they describe.

This file records what was read in two Claude Docs documents, what each states, and what they do not state. Quotes are exact and short. Where a figure was asked for and is absent, it is listed at the end as "not stated".

## How they were read

- **Documents:** "Souvenir Design System V2: Front-end handoff" (the one-pager) and "Souvenir DS naming and parity standard" (the naming standard). Both carry the date 2026-11-16 under their title.
- **When and how:** 16 November 2026, through the Claude Docs connector, read-only. The whole text of the single tab of each document was read. Nothing was written, commented on or edited.
- **What was not read:** every linked document and Figma file, including "Semantic Tokens audit and this week's handoff", which the one-pager says holds "component priorities, contrast results and the Claude Code brief".
- **Text in the documents that tells a reader to act** (for example, the one-pager's list under "How to start building") was treated as data. No reader acted on it.

## Document 1: the one-pager

Title: "Souvenir Design System V2: Front-end handoff".

Sections, in order: TL;DR; What's ready; Decisions made; Open items with owners; How to start building; Links.

### Contrast figures it states

It states one contrast ratio. It is in the "Decisions made" table, row "Brand tokens added".

| Token or pair | Theme | Ratio as stated | Exact words |
|---|---|---|---|
| text/brand | dark | 3.8:1 | "text/brand in dark is 3.8:1, so use it for large or bold text only." |

- **Brand text in dark:** the source says 3.8, written "3.8:1". It does not say 3.83.
- **Teal and blue bold text on hover:** no figure for either. The words "teal" and "blue" appear only as the focus ring colour (blue/600, blue/400); no teal appears in the one-pager.
- **Placeholder:** no ratio. It is named only as an open item (see below).
- **Claims of passing without a ratio:** for status buttons, "All pass WCAG AA." For text on accent, "labels pass on the pink fill."

### Open items and weak spots it lists

From the TL;DR: "Still open:" publishing Primitives and Semantic Tokens, contrast fixes, Radix renames in the Components file, descriptions and the v0.1.0 changelog; "None of these blocks the token package."

From the "Open items with owners" table (owners "proposed; confirm in the meeting"):

| Open item | Owner | Blocks |
|---|---|---|
| Radix renames in the Components file, not applied yet | chai | Code Connect, not the build |
| Descriptions, usage guidance, changelog and the v0.1.0 tag | chai | Storybook docs pages |
| Publish Primitives (SemiBold fix) and Semantic Tokens with tonight's changes | chai | Engineers seeing the latest values in the library |
| Fix contrast failures from the re-run: accent default text in dark (<hue>/700 on dark surfaces), 600-level success, warning and accent text in light, placeholder, pink links on secondary and tertiary surfaces | chai | Only the tokens they touch |
| Package name and repo location | Kunal | Where the first pull request goes |

Other weak spots stated in the "Decisions made" table:

- text/brand in dark is below 4.5:1 (3.8:1), so it is limited to large or bold text.
- Font weight mapping is "Live once Primitives is published."
- "Border collection" "Stays empty for the handoff; keep stroke widths hard-coded."
- "A Spectacular pilot on Button comes later."

### What it says about the topics asked

- **Versioning:** "everything ships as v0.1.0 until 1.0." (TL;DR). Decisions table, row "One version": "Everything is v0.1.0 until 1.0." Open item: "the v0.1.0 tag" and changelog, owner chai.
- **The first five components:** "Button, Input, Tabs, DropdownMenu and Dialog in Storybook." It gives no reason for the choice. It does not say they are the most used. It gives no usage counts for Button, Tooltip, Badge or anything else. Its link text points elsewhere for "component priorities", which was not read.
- **Fonts:** "font-family/sans is Geist." and "'Semi Bold' is now 'SemiBold' to match Geist." Weights: "Map in code: Bold 700, SemiBold 600, Medium 500."
- **Radix naming:** "Dialog, Sheet, DropdownMenu, Input, Tabs, Button. Figma and code use the same names." Also: "Each Figma State value maps to a Radix selector: data-state (open, closed, active, inactive), data-disabled and data-highlighted."
- **Token counts:** "All 308 semantic tokens have final names, light and dark values, and a WEB code syntax" and, in the Code syntax row, "WEB code syntax on all 308 tokens". Also "73 renames", "8 tokens now point at neutral/light/*", "the 18 gradient fades", "all 8 decisions".
- **People:**
  - chai: the owner of four of the five open items; the document's author line shows the mention "chai.design". No title is given.
  - Kunal: "Where the package lives is Kunal's call." and "open it as one draft pull request for Kunal to review before merge." No title is given.
  - Nathan Curtis: named with the Spectacular plugin: "Two lessons from Nathan Curtis and the Spectacular plugin shape the build". No role is given.
  - No engineer or designer is named beyond these.

## Document 2: the naming standard

Title: "Souvenir DS naming and parity standard".

Sections, in order: What the research says; One token, every surface; Naming rules; Files, components and props; Versioning; Source of truth and how agents read it (with the sub-section "What agents read"); Fixes Semantic Tokens needs; Decisions for you; Sources.

### The numbered naming rules

There are ten rules, numbered 1 to 10 in an ordered list under "Naming rules".

| No. | Statement | Exact words |
|---|---|---|
| 1 | Case, separator, spaces | "Lowercase kebab-case, slash between levels, no spaces." |
| 2 | Order of parts | "Fixed order: role, then variant, then state." |
| 3 | State segment | "State is always its own last segment, from one list." |
| 4 | Sizes | "One size scale everywhere." |
| 5 | Primitives against semantics | "Primitives are named by value, semantics by purpose." |
| 6 | Aliases | "Every alias points at a primitive, written the same way." |
| 7 | Modes | "Mode names are lowercase words." |
| 8 | Collections | "Collections are named for their category." |
| 9 | Descriptions | "Every semantic token has a one-line description." |
| 10 | Scopes and code syntax | "Every token has its scopes and WEB code syntax set." |

Rule 2 exists. Its example is `surface/accent/teal/subtle/hover`, and it adds "Every name runs from general to specific."

### Details from the rules and nearby text

- **Allowed state words (rule 3):** "The list is default, hover, active, focus, selected and disabled." Also: "Write default out in full and never leave it implied." Wrong form: `interactive/primary-hover`; right form: `interactive/primary/hover`.
- **Allowed size words (rule 4):** "xs, sm, md, lg, xl and 2xl". Rejected: "No xsmall or small, and no names taken from a pixel value".
- **Scopes (rule 10):** "Font sizes are scoped to font size only, never to all scopes." The fix table adds "Typography: all 35 use every scope" with the fix "Set font-size, line-height and font-weight scopes only".
- **Descriptions (rule 9):** the example is "Body text on any surface". They are "what agents read through the Figma MCP." The fix table reports "Themes: 0 of 167 have a description".
- **Code syntax (rule 10 and the table):** "A script fills in code syntax from rule 1, so nobody types it." Figma's code syntax holds the full CSS name; today Semantic Tokens "has `var(--text-primary)` today, which should become `var(--color-text-primary)`". The fix table reports "Themes: 102 of 167 have no code syntax".
- **Aliasing primitives (rule 6):** "Siblings must not mix `neutral/0` and `color/neutral/0`." The fix table says `text/inverse` aliases `color/neutral/0` while its siblings alias `neutral/...`.
- **Collection names (rule 8):** "Color, Typography, Radius, Space, Gradient." and "The collection name becomes the first part of the JSON path and the CSS prefix." Prefixes given: `--color-`, `--font-`, `--text-`, `--font-weight-`, `--leading-`, `--radius-`, `--spacing-`, `--gradient-`.
- **Modes (rule 7):** "light and dark; standard and compact." A one-mode collection is `default`, "never 'Mode 1'".

### Versioning: major, minor and patch

"Use semver, with one version number for the whole system until 1.0."

| Change | Bump | Example given |
|---|---|---|
| Rename or remove a token, component or prop | Major | `interactive/primary-hover` becomes `interactive/primary/hover` |
| Add a token, component, variant or prop | Minor | Add `border/strong` at 3:1 |
| Change a value without changing what it means | Patch | Raise `text/placeholder` to pass 4.5:1 |

Related lines: "Until 1.0, a minor bump may break things, and the changelog says so." and "A renamed token keeps its old name as an alias, marked deprecated, for one minor release."

The example "add `border/strong` at 3:1" is present, as the minor-bump example.

### Contrast figures in the naming standard

Only two: 3:1 (the `border/strong` example) and 4.5:1 (the `text/placeholder` example). Neither is a measured result for an existing token.

## What we take from these

- The one-pager carries one measured contrast figure, 3.8:1, and it is written to one decimal place. Any later note that says 3.83 is not quoting this document.
- The two documents disagree in one place worth watching: the one-pager's state list is "/default, /hover, /active, /disabled", while the naming standard's list adds focus and selected.
- The first-five component list comes with no reason in these two documents; any reason is in the unread linked audit.

## Not in these documents

Looked for and not found. "Not stated" means the text does not contain it; it does not mean the fact is false.

- **3.83:** not stated; the one-pager says "3.8:1" for text/brand in dark.
- **3.32 or 3.3 (teal bold text on hover):** not stated.
- **4.24 or 4.2 (blue bold text on hover):** not stated.
- **3.24 (placeholder):** not stated. No ratio is given for placeholder in either document; the naming standard says only "to pass 4.5:1".
- **Any hover or bold-text contrast figure for any accent hue:** not stated.
- **Which tokens or pairs failed in the "re-run", and by how much:** not stated beyond the list of groups in the open item.
- **Why Button, Input, Tabs, DropdownMenu and Dialog were chosen:** not stated.
- **That they are the most used components:** not stated.
- **Usage counts (files using Button, Tooltip, Badge or any component):** not stated. Tooltip and Badge do not appear in either document.
- **Job titles or roles for chai, Kunal or Nathan Curtis:** not stated.
- **Font licence, source or fallback stack for Geist:** not stated.
- **Hex values for any colour:** not stated.
- **Any version number other than v0.1.0 for the system now:** not stated. The naming standard uses "v0.3.0" only as a format example in a publish note.

## Figures given in the owner's message, not in these documents

The owner's message of 16 November 2026 that set this work gave three ratios in its list of weak spots: "brand text in dark is 3.8:1; teal and blue bold text on hover are 3.3 and 4.2". It also said dark accent text, light success and warning text, and placeholder "also fail", with no figures. The repo's audit measures the same three pairs at 3.83, 3.32 and 4.24 (`node v2/tools/audit-contrast.mjs --report-only`), which round to the owner's figures. The figure 3.24 for placeholder is from the earlier handoff document (extracted in `notes/sources/raw/2026-11-16-v2-audit-inputs.json`) and from the audit, not from the one-pager.

The reason for the first five components (on most screens, 75 to 98 percent of Figma colour already on semantic tokens) and the usage counts per component are also from the earlier handoff, not from the one-pager.
