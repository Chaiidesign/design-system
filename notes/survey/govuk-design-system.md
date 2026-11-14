Checked: 2026-11-13

# GOV.UK Design System: survey notes

## (a) Design principles
The Design System itself has no principles page (design-system.service.gov.uk/design-principles/ returned 404). It leans on the eleven Government Design Principles at https://www.gov.uk/guidance/government-design-principles. They include "Start with user needs", "Do the hard work to make it simple", "This is for everyone", "Be consistent, not uniform", "Make things open" and "Minimise environmental impact". "Be consistent, not uniform" means reuse common patterns but adapt where needed.

## (b) Token architecture
There is no design-token file format (JSON or W3C tokens) that I could find. Tokens are Sass, in GOV.UK Frontend: https://frontend.design-system.service.gov.uk/sass-api-reference/
- Tiers: a palette (`govuk-colour()`), a purpose layer of "functional colours" (`govuk-functional-colour()`, e.g. brand, text, link), and per-component settings such as `$govuk-button-background-colour`.
- Naming: `$govuk-` prefix for settings, `govuk-` for functions and mixins. Spacing and type are scale-based by point number (`govuk-spacing(point)`, sizes 16, 19, 24).
- Theming: redefine the `brand` functional colour before import. Functional colours also compile to CSS custom properties, for example `var(--govuk-brand-colour, hotpink)`. The older applied-colour variables are deprecated.
- The team's own vision says it does not support custom branding: https://team-playbook.design-system.service.gov.uk/what-we-do/future-of-the-govuk-design-system

## (c) How one component page is built
Button page, https://design-system.service.gov.uk/components/button/. Sections in order: When to use this component; How it works (default, start, secondary, warning, dark-background, disabled, grouped, and preventing double sends); Research on this component; Recent changes; Help improve this component; Need help?
The "Research" and "Recent changes" sections are the notable parts. Example: the button page says testing showed green start buttons improved click-through.

## (d) Governance and versioning
- Who decides: the community page says the Design System team reviews and approves components and patterns. It names no decision-making body: https://design-system.service.gov.uk/community/.
- Contribution: propose, then develop, then publish. Criteria are Useful (evidence it would be useful for many teams or services; no minimum number is set), Unique, Usable (user research including disabled users), Consistent, Versatile (range of browsers and assistive tech). Evidence is screenshots or links to live services plus research: https://design-system.service.gov.uk/community/contribution-criteria/
- Versioning: semantic versioning. Breaking changes only in major releases. Deprecations can land in any release and signal removal in the next major: https://frontend.design-system.service.gov.uk/staying-up-to-date/
- Support window for old majors: could not find (the page says nothing about it). Docs are available for v4, v5 and v6.

## (e) Accessibility
- Standard: WCAG 2.2 AA, stated as fully compliant for the website, docs site and code. External audits by the Digital Accessibility Centre: July 2024 for the website and the code examples, April 2021 for the Frontend documentation website. Statement last updated 18 December 2024: https://design-system.service.gov.uk/accessibility-statement/
- Enforcement: jest-axe and axe-core run on every example at deploy, html-validate, manual screen reader, magnifier and speech tests, results logged. The team cites a 2017 finding that about 30% of issues are found by automated tools. It says using the system does not make a service accessible: https://design-system.service.gov.uk/community/accessibility-strategy

## (f) Content, voice and tone
Button text: sentence case, describes the action. Labels: short, sentence case, no colon. Hint text: one short sentence, no full stop, no links (text input page). General voice guidance lives in the GOV.UK style guide (https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/). The pages I opened for voice and tone were stubs, so the voice rules themselves are not verified.

## (g) What it gives AI agents
Nothing official that I found.
- llms.txt: returns 404 on design-system.service.gov.uk and frontend.design-system.service.gov.uk (fetched directly).
- Official MCP server: none surfaced in search. Only community projects exist (e.g. a "govuk-frontend-mcp" on a directory), unvetted: https://claudemarket.ai/mcp/georgeherby/govuk-frontend-mcp
- The govuk-frontend GitHub repo front page shows no agent rules file (AGENTS.md or similar), but folder contents were not fully visible (not verified): https://github.com/alphagov/govuk-frontend

## (h) Checkout-relevant parts
- Text input: avoid placeholders, prefix and suffix for money, autocomplete, no disabled paste, money-specific error messages ("amount of money that needs decimals"): https://design-system.service.gov.uk/components/text-input/
- Payment card details pattern: all fields on one page in card order; accept spaces and hyphens; avoid the acronym "CVV"; suggests checking GOV.UK Pay first: https://design-system.service.gov.uk/patterns/payment-card-details/
- Check answers: summary list with Change links and hidden text; submit button names the action; "Not provided" for skipped items; no costs or totals mentioned: https://design-system.service.gov.uk/patterns/check-answers/
- Confirmation page: reference number, what happens next, a way to save a record. No cost or order summary guidance: https://design-system.service.gov.uk/patterns/confirmation-pages/
- Order or cost summary: could not find a pattern for it.

## Error messages, error summary, evidence-based criteria
- Criteria need evidence the component would be useful for many teams or services (screenshots or links to it in use are given as examples, with no minimum count) and testing with a representative sample of users, including disabled users (see (d)).
- Error message: red text after the label and hint, names the field, never clears answers, hidden "Error:" prefix. Avoid "please", "sorry", "valid", "invalid" and "This field is required". Use templates like "Enter your ..." and reuse the label words: https://design-system.service.gov.uk/components/error-message/
- Error summary: shown for any validation error, titled "There is a problem", each error links to its field, focus moves to it, page title gets "Error:" prefix. Wording must match the inline message exactly: https://design-system.service.gov.uk/components/error-summary/

## (i) Weaknesses
- Built for public-facing, occasional use. A 2022 government blog says it favours simplicity over speed, so a Ministry of Justice team had to go beyond it for professional users: https://designnotes.blog.gov.uk/2022/03/21/going-beyond-the-gov-uk-design-system-for-moj-forms-professional-users
- It admits automated testing is not enough, assistive tech testing is desktop-only, and capacity is limited (accessibility strategy URL above).

## (j) Is it current?
GOV.UK Frontend v6.6.0 is marked latest on the releases page, dated "15 Oct"; the year is not shown, so which year is not verified: https://github.com/alphagov/govuk-frontend/releases. The text input page mentions a guidance change in June 2026 and an `id` default change in March 2025. The accessibility statement was last updated December 2024. So it looks active in 2026.

## For Souvenir
- Learn: the component page frame, especially "When not to use", "Research on this component" and "Recent changes". It shows why each rule exists.
- Learn: error content rules. Same words in the field message and the summary, banned words, a template per case. Directly usable for checkout.
- Avoid: having no machine-readable tokens, no agent entry point and no cost summary pattern. Those are the gaps Souvenir needs for AI agents and checkout.

## Review 2026-11-13
Six claims checked against their cited pages: accessibility statement, contribution criteria, versioning and deprecation, error message, error summary, Sass token tiers and theming. A seventh check (latest release) confirmed v6.6.0 is marked latest; its year is still not verified. Corrections:
- (e) Audit dates were stated too broadly: the July 2024 audit covered the website and code examples; the Frontend documentation website was last audited in April 2021.
- (d) "Useful (evidence from many services)" overstated the criterion; the source asks for evidence it would be useful for many teams or services and sets no minimum.
- Error section: "use in several live services" was stronger than the source; reworded to the criteria's actual wording (useful for many teams or services; tested with a representative sample of users including disabled users).
