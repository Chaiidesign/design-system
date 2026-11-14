Checked: 2026-11-13

Method note: m3.material.io renders in the browser, so plain page fetches returned only titles. Pages below were read in a browser pane. Colour-roles and motion pages were truncated at about 3,500 to 5,000 characters, so claims from them cover only the part read.

## (a) Design principles
- Could not find a general principles page on m3.material.io. The page at https://m3.material.io/foundations/overview/principles is only about accessibility.
- It says "Accessibility by default is a core design value for Material" and lists three accessibility principles: honor individuals, learn before not after, requirements as a starting point (https://m3.material.io/foundations/overview/principles).
- Get Started describes Material 3 as enabling "personal, adaptive, and expressive experiences" (https://m3.material.io/get-started).

## (b) Token architecture
- Three classes: reference (all available values), system (decisions and roles; "this is where theming occurs"), component (properties of a component's parts). Names are dot-separated from general to specific, for example md.ref.palette.secondary90 and md.comp.fab.primary.container.color (https://m3.material.io/foundations/design-tokens/overview).
- Contexts (dark theme, dense layouts, RTL, form factor) let one system token point to different reference tokens (same page).
- The same page labels component tokens "(in development)".
- Web format: CSS custom properties. Reference tokens use --md-ref-*, system tokens --md-sys-*, and component tokens have no "comp" prefix, for example --md-filled-button-container-shape. Material Web does not support --md-ref-palette or --md-sys-motion (https://material-web.dev/theming/material-theming/; summarised by the fetch tool).
- Tokens are shown in interactive modules and in each component's Specs tab, grouped by state then element (design-tokens page above).

## (c) How a component is documented
- The text field and button pages each have four tabs: Overview, Specs, Guidelines, Accessibility (https://m3.material.io/components/text-fields/overview).
- Overview: summary bullets, an availability table (Figma kit, Flutter, Compose, Android Views, Web, each with status), and "Differences from M2". Buttons add a dated "M3 Expressive update" (May 2025) (https://m3.material.io/components/buttons/overview).
- Guidelines: Usage, Choosing, Anatomy, Adaptive design, with Do and Don't examples (https://m3.material.io/components/text-fields/guidelines).
- Accessibility: use cases, keyboard navigation, labelling elements (https://m3.material.io/components/text-fields/accessibility).
- Specs: token tables; content not read.

## (d) Governance
- Could not find any page on who decides, a deprecation policy, or a versioning policy for the design guidance itself.
- Site content is Apache 2.0 or CC BY 4.0, and the system is "built and supported by Google designers and developers" (https://m3.material.io/get-started).
- Material Web contributions: sign Google's CLA, open an issue first, new features go in a labs folder, and new components are "difficult for us to directly accept" because they need engineer, design and accessibility review. The page does not say who makes final decisions (https://github.com/material-components/material-web/blob/main/CONTRIBUTING.md).
- Removal in practice: Material Views 1.14.0 is the last stable Views release and the library is in maintenance mode; features go to Compose only (https://m3.material.io/blog/material-is-compose-first, 19 May 2026). Material Web is in maintenance mode pending new maintainers (https://github.com/material-components/material-web).

## (e) Accessibility
- Stated standard: the framework "draws on WCAG standards and industry best practices" (https://m3.material.io/foundations/designing/overview). It does not name a WCAG version or level on the pages read.
- Colour roles are built on pairs with a "minimum 3:1 contrast" (https://m3.material.io/styles/color/roles). Note this is below the usual 4.5:1 for body text (my observation, not the site's).
- Enforcement: it says standards are "built into Material components", and advises native elements and semantic HTML (principles and designing pages above). I found no stated audit, automated test or certification process.

## (f) Content, voice and tone
- Content design: "UI text should be clear to anyone"; follow AP Style unless noted (https://m3.material.io/foundations/content-design/overview). Buttons: "concise", sentence case (buttons page). Notifications: lead with the most important information, state the next action, avoid dynamic text in titles (https://m3.material.io/foundations/content-design/notifications). No explicit voice-and-tone page found.

## (g) What it gives AI agents
- m3.material.io/llms.txt and material-web.dev/llms.txt both returned 404.
- Google publishes a separate Design MCP server (https://developers.google.com/design-mcp/reference/mcp) with five tools: generate_color_scheme, search_icons, icons_instructions, search_fonts, describe_font. It does not mention M3 components or tokens. No agent rules file found.
- The Compose-first post points Android developers to a "migration Android skill" for moving Views screens to Compose, usable "with Android Studio, Android CLI, or any other AI tool". It is a migration aid, not a rules file for the design system (https://m3.material.io/blog/material-is-compose-first).
- Community M3 MCP servers exist (https://lobehub.com/nl/mcp/weppa-cloud-material3-mcp-server) but are third party (not verified).

## (h) Checkout-relevant parts
- Text field: use it for "contact or payment information". Label text should always be visible, not truncated and not on multiple lines; a field may go without its own label only when it has an adjacent label. Required fields get an asterisk plus an explanation. Prefix text can hold a currency symbol (https://m3.material.io/components/text-fields/guidelines).
- Errors: swap supporting text for error text so layout does not shift; say how to avoid the most likely error; show an error icon as a second cue. Screen readers get an "alert" role (guidelines page above and https://m3.material.io/components/text-fields/accessibility).
- Feedback: snackbar is low priority, one at a time, one action. On web, auto-dismissing messages must also appear inline, for example the button label changes to "Saved". Dialogs are for high-priority messages needing action (https://m3.material.io/components/snackbar/guidelines).
- Order or cost summary component: could not find one on the pages I read; I did not search the full component list.

## (i) Criticisms
- Google's own study reports a trade-off: removing text labels from email actions decreased usability (https://research.google/pubs/usability-hasnt-peaked-exploring-how-expressive-design-overcomes-the-usability-plateau/, as summarised by search results; page not opened) (not verified).
- Material Web stalled: a former engineer says the deprecation was "self inflicted" through weak adoption; this is one person's view (https://github.com/material-components/material-web/discussions/5642, as summarised).

## (j) Currency
- Current. Latest posts on 19 May 2026 (Google I/O 2026): an expressive layout system, an 8dp spacing system with spacing tokens, expressive lists and menus (https://m3.material.io/blog/whats-new-at-io26). M3 Expressive launched May 2025 (https://m3.material.io/get-started). Compose 1.5.0 stable is due "later in 2026" (Compose-first post).

## Colour, elevation, motion
- Colour: 26 roles in six groups (primary, secondary, tertiary, error, surface, outline). Names use on-, container and variant, and roles must be used only in the intended pairs. Dynamic color builds five key colours, tonal palettes and roles from one source colour, and has three contrast levels (https://m3.material.io/styles/color/roles, https://m3.material.io/styles/color/system/how-the-system-works).
- Elevation: levels, not raw values. Tokens carry no shadow or colour; each platform chooses shadows or tonal fills. Keep default elevation and use few levels (https://m3.material.io/styles/elevation/overview).
- Motion: a spring-based system replaces easing and duration. Two preset schemes (expressive, standard), tokens like md.sys.motion.spring.fast.spatial, with the scheme set once at product level (https://m3.material.io/styles/motion/overview/how-it-works).

## For Souvenir
- Learn from: the role-and-pair model (primary and on-primary) with a rule to use only intended pairs; it keeps contrast safe when themes change.
- Learn from: component pages that open with a one-glance summary and Do and Don't pairs, plus a separate Accessibility tab with screen-reader labels.
- Learn from: the error pattern (replace helper text with error text, add an icon, say how to avoid it) and the rule that auto-dismissing messages need an inline twin. Both suit checkout.
- Stay away from: advertising unfinished layers (component tokens are still "in development") and platform fragmentation (Views and Web in maintenance mode); ship fewer things fully.
- Stay away from: no published agent surface or governance on the M3 site and a 3:1 pair contrast; Souvenir should publish llms.txt, ownership and removal policy.

## Review 2026-11-13
Six claims checked against their cited pages (read in a browser pane where plain fetch returned only the title): token classes, naming and contexts, with component tokens marked "(in development)" (design-tokens overview); 26 roles in six groups, pairs with a "minimum 3:1 contrast", and the intended-pairs rule (color roles); Views 1.14.0 as the final stable Views release, maintenance mode and Compose 1.5.0 due later in 2026 (Compose-first post, 19 May 2026); the five Design MCP tools with no mention of M3 components or tokens (Design MCP reference); Material Web "in maintenance mode pending new maintainers" (GitHub README); and the text field error pattern and "alert" role (text field guidelines and accessibility pages). All six held. Also confirmed: the I/O 2026 post and blog index (no post newer than 19 May 2026), and the former-engineer "self inflicted" quote in discussion #5642. Corrections:
- (h) "Every field needs a visible label" overstated the source, which allows a field to rely on an adjacent label; reworded.
- (g) Added the migration Android skill for AI tools named in the Compose-first post, which the survey had missed.
