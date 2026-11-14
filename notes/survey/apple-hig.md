Checked: 2026-11-13

# Apple Human Interface Guidelines (HIG)

Source note: the HIG web pages render with JavaScript, so a plain page fetch returned only titles. I read the same pages through the JSON that the site itself serves for each page, at `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`. This is the page content, but it is not a documented public API. URLs below are the human-facing page addresses.

## (a) Design principles
The page was "Reintroduced" on 2026-06-08 per its own alert text. It says the principles are "tools to help you weigh competing priorities" and that "There's no one right way to apply these principles." (https://developer.apple.com/design/human-interface-guidelines/design-principles)
Eight headed groups, each with two to four bold imperative sentences followed by a few sentences of reasoning: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. Examples: "Stay out of the way." "Help people recover from mistakes." "Include just what's necessary." (same URL)
How they are written: a short imperative, then a "why" in plain words. They are opinionated but explicitly framed as trade-off aids, not rules.

## (b) Token architecture
Does not apply in the sense of a token file: I found no published token file, tier model or export format for HIG. (could not find)
What exists instead is a de facto named-colour layer, published as platform APIs rather than tokens. The Color page's Specifications table lists system colours (Red, Orange and so on) by SwiftUI API name, each with Default (light), Default (dark), Increased contrast (light) and Increased contrast (dark) values. The same page lists purpose-named dynamic colours for iOS, each with a "Use for" description and UIKit name, for example Label ("A text label that contains primary content", `label`), Secondary label, Placeholder text, Separator and Link, plus system and grouped background colours in primary, secondary and tertiary variants. (https://developer.apple.com/design/human-interface-guidelines/color) The Accessibility page says to "Prefer system-defined colors" because they "automatically adapt" to Increase Contrast and light/dark appearance. (https://developer.apple.com/design/human-interface-guidelines/accessibility)

## (c) How a component is documented
Text fields page sections: Best practices; Platform considerations (iOS and iPadOS, macOS, watchOS); Resources (Related, Developer documentation); Change log. (https://developer.apple.com/design/human-interface-guidelines/text-fields)
Buttons page sections: Best practices; Style; Content; Role; Platform considerations (iOS and iPadOS, macOS, visionOS, watchOS); Resources; Change log. (https://developer.apple.com/design/human-interface-guidelines/buttons)
There is no "do not use it when" section; guidance is bold-lead sentences. Each page carries an update note and a dated change log. Hit-region rule: "at least 44x44 pt" (60x60 pt in visionOS). (buttons URL)

## (d) Governance
Who decides, contribution process, versioning scheme, deprecation and removal policy: could not find on the pages I read. Evidence of process is only per-page dated change logs, for example "Updated guidance for Liquid Glass" on 2025-12-16. (buttons URL) There is no semantic version number that I found.

## (e) Accessibility
Standard: the Accessibility page names WCAG and the Accessible Perceptual Contrast Algorithm (APCA) as measures, and uses "values from WCAG Level AA" as guidance. Its table: up to 17 pt text needs 4.5:1; 18 pt text 3:1; bold text 3:1. Minimum control size on iOS is 28x28 pt, default 44x44 pt. If minimum contrast is not met by default, offer a higher-contrast scheme under Increase Contrast, and check both light and dark. (https://developer.apple.com/design/human-interface-guidelines/accessibility)
Enforcement: advice, not a gate. The page tells designers to "audit the accessibility of your interface" with Accessibility Inspector, which it says highlights accessibility issues and to declare support through Accessibility Nutrition Labels on the App Store. (same URL)

## (f) Content, voice and tone
The Writing page (updated 2025-12-16) says: determine your app's voice, "Match your tone to the context", "Be clear". Be action-oriented: "it's almost always best to use a verb"; prefer "Send" over "Let's do it!". Pick a capitalisation style per element type. Avoid "we" in errors: "Unable to load content" beats "We're having trouble loading this content." Errors: show "as close to the problem as possible, avoid blame", say how to fix it; "Choose a password with at least 8 characters" beats "That password is too short"; interjections like "oops!" are "typically unnecessary and can sound insincere". For multi-step flows pick one label ("Continue" or "Next") and stay consistent. (https://developer.apple.com/design/human-interface-guidelines/writing)
Alerts: title describes the situation; one- or two-word verb button titles; avoid "OK" unless purely informational. (https://developer.apple.com/design/human-interface-guidelines/alerts)

## (g) What it gives AI agents
No llms.txt: `https://developer.apple.com/llms.txt` and `https://developer.apple.com/design/human-interface-guidelines/llms.txt` both returned 404 when fetched. No HIG-specific MCP server or agent rules file found. (could not find)
Xcode has an MCP server, but I only saw it described by third-party pages, not Apple documentation, and it concerns the IDE, not HIG content. (https://developer.apple.com/forums/thread/814862 appeared in search; I did not read it) (not verified)

## (h) Checkout-relevant parts
- Text field: validate email "when people switch to another field"; passwords/usernames before. Use secure fields; match size to expected input; show the right keyboard type. (text-fields URL)
- Button: prominent style for the likely action, "one or two per view"; distinguish with style, not size; label like "Add to Cart". (buttons URL)
- Apple Pay page (updated 2026-06-08), https://developer.apple.com/design/human-interface-guidelines/apple-pay : sections include Offering Apple Pay, Streamlining checkout, Customizing the payment sheet, Handling problems, Supporting subscriptions, Supporting donations, Using Apple Pay buttons and Referring to Apple Pay. Order summary (under Customizing the payment sheet): "Use line items to explain additional charges, discounts, pending costs"; do not list products as line items; "Keep line items short"; show "Pay [Business_Name]" on the total line; disclose possible later costs; subscriptions show trial amount, regular amount and billing start date. Errors: "Avoid forcing compliance with your business logic" (accept Zip+4, phone formats); point out missing size or colour after the tap rather than hiding the button.

## (i) Weaknesses
- Nielsen Norman Group, "Liquid Glass Is Cracked, and Usability Suffers in iOS 26" (Raluca Budiu, 2025-10-10): translucent controls and overlapping text hurt legibility; motion distracts. https://www.nngroup.com/articles/liquid-glass/ (read via summarising fetch, not word for word)
- A UX Collective essay argues the material conflicts with Apple's own contrast and clarity guidance. https://uxdesign.cc/did-apple-abandoned-its-own-design-heuristics-accessibility-principles-2d616ed7ace5 (seen in search results only) (not verified). A figure of 1.5:1 contrast from one opinion piece is also (not verified).
- Internal: staleness varies by page. Text fields last changed 2023-06-05, while Buttons changed 2025-12-16. (page URLs above)

## (j) Current?
Yes. The newest dates I saw: 2026-06-08 (design principles, Apple Pay), 2025-12-16 (buttons, writing, color). (URLs above) I did not find a site-wide version or release date.

## For Souvenir
- Learn: principles as 2 to 4 bold imperative sentences plus a short reason, grouped under one-word headings. Copy the shape, not the content.
- Learn: Writing and Alerts give precise error rules (near the problem, no blame, say the fix, no "we", no "oops"). These map directly to our content rule.
- Learn: the Apple Pay order-summary rules (short line items, business name on total, disclose later costs) are a good checkout cost-summary reference.
- Learn: per-page dated change logs are cheap and visible versioning.
- Avoid: no token file (only API-named system colours), no governance, no agent files, no "do not use when" section; do not treat HIG as a model for machine-readability. Also avoid pinning to its look, which critics fault for legibility.

## Review 2026-11-13
I checked six claims against the page JSON that the site serves for each cited page, and against the NN/g article. All six held: (1) the design principles page, its 2026-06-08 "Reintroduced" date, eight groups and the quotes; (2) the Accessibility contrast table (4.5:1 up to 17 pt, 3:1 at 18 pt and for bold) and the control sizes (iOS 44x44 pt default, 28x28 pt minimum); (3) the Buttons hit region (44x44 pt, 60x60 pt in visionOS), "one or two" prominent buttons per view, and the page sections; (4) the Writing page quotes on errors, "we" and verbs; (5) the Apple Pay line-item, "Pay [Business_Name]", subscription and Zip+4 rules; (6) both llms.txt URLs return 404, and the NN/g author, title and date are correct.
Corrections:
- (b) The token claim understated what exists. The Color page publishes named system colours with light, dark and increased-contrast values, and purpose-named dynamic colours (label, secondaryLabel, separator and others). I rewrote (b) to describe this with the Color URL and updated the matching "For Souvenir" line.
- (h) The Apple Pay section list was incomplete and the line-item rules sit under "Customizing the payment sheet", which was missing. I added the missing sections.
- (f) "avoid oops!" was stronger than the source, which says such interjections are "typically unnecessary and can sound insincere". I quoted the source instead.
- (e) The unnamed audit tool is Accessibility Inspector, named on the page. I named it.
