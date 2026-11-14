Checked: 2026-11-13

Pages were read through a summarising fetch tool, not a browser. Quotes are close paraphrase unless in quotation marks.

## Cost disclosure and abandonment (Baymard Institute)
- Baymard's abandonment list (shown as updated 28 October 2026): "Extra costs too high" 40%; "couldn't see / calculate total order cost up-front" 12%; account required 18%; complicated checkout 17%. These percentages exclude the 42% of US online shoppers who said they were "just browsing / not ready to buy", so they describe shoppers who meant to buy, not all abandoners. No sample size is given, and the page calls the study both "quantitative" and "qualitative survey". The full study link uses a /premium/ path; the page does not say it is paywalled, but it appears to be. Average abandonment 70.22% (mean of 50 studies, 2006-2025). https://baymard.com/lists/cart-abandonment-rate
- Older, different survey (Christian Holst, 20 June 2017): 21% abandoned for not seeing total cost up front; 64% of testers looked for shipping cost before adding to cart; 43% of sites showed none on product pages. Do not read 21% versus 12% as a trend. https://baymard.com/blog/show-shipping-costs-on-product-pages
- Baymard advice to show the full total before payment details: search snippet only. (not verified) https://baymard.com/blog/payment-ux

## Order and cost summaries
- Edward Scott, Baymard, 15 July 2019: show nothing new at Order Review; a late fee rise left one tester feeling "duped". Show a breakdown (tax, delivery, fees) with the total most prominent, and allow inline editing. In a 60-site benchmark, 65% rated poor to just acceptable. https://baymard.com/blog/office-depot-order-review-experience

## Form fields on mobile
- Jamie Holst, Baymard, 4 June 2013: use permanently visible labels; placeholders only for brief hints. Old. https://baymard.com/blog/mobile-forms-avoid-inline-labels
- Edward Scott, 26 June 2024: average checkout has 11.3 fields; most need only 8; 42% of testers typed a full name into "First Name". https://baymard.com/blog/checkout-flow-average-form-fields
- Sam Dutton, web.dev (no date seen): use type="email"/"tel", inputmode="numeric" rather than type="number" for card numbers, autocomplete tokens such as cc-number, enterkeyhint; do not use placeholders as labels; do not disable submit while incomplete. https://web.dev/articles/payment-and-address-form-best-practices
- Baymard "only 14% mark required and optional fields" and keyboard cheat sheet: search snippets only. (not verified) https://baymard.com/blog/required-optional-form-fields

## Inline validation, error wording, recovery
- Baymard, Edward Scott, 9 January 2024: validate on leaving the field, clear errors as soon as fixed; 31% of benchmarked sites have no inline validation (a video summary says 32%). https://baymard.com/blog/inline-form-validation
- Nielsen Norman Group, Rachel Krause, 3 February 2019 (reviewed 12 December 2024): validate after the field is left; keep messages beside fields; do not rely on a summary alone; three or more repeats of one error suggests a design problem. No data; silent on preserving input. https://www.nngroup.com/articles/errors-forms-design-guidelines/
- GOV.UK Design System: always show an error summary at the top of main, move focus to it, link items to fields, use identical wording in both places, say what went wrong and how to fix it, avoid "please" and "invalid", never clear fields. https://design-system.service.gov.uk/components/error-summary/ and https://design-system.service.gov.uk/components/error-message/
- A controlled study of error recovery: could not find. These are guidelines.

## Regulation and status
- US FTC Rule on Unfair or Deceptive Fees, 16 CFR Part 464: announced 17 December 2024 (date seen only in secondary law-firm reports; the FTC FAQ page does not give it), effective 12 May 2025 (confirmed on the FTC page). It covers only live-event tickets and short-term lodging. Total price must be up front and more prominent than other prices; only government charges, shipping and optional extras may be excluded, and must be disclosed before payment. Vague labels such as "service fee" are barred. https://www.ftc.gov/business-guidance/resources/rule-unfair-or-deceptive-fees-frequently-asked-questions (Federal Register page would not load; date also in a search result, https://govinfo.gov/content/pkg/FR-2025-01-10/pdf/2024-30293.pdf, not opened.)
- UK DMCC Act 2024 section 230: an invitation to purchase must give the total price, including fees, taxes and charges the consumer necessarily incurs; if not calculable, explain the method. In force 6 April 2025 (SI 2025/272). https://www.legislation.gov.uk/ukpga/2024/13/section/230 and https://www.legislation.gov.uk/ukpga/2024/13/schedule/20
- CMA guidance (updated 7 January 2026): unavoidable charges normally belong in the total price; listing them separately is usually not enough; optional extras may be separate. https://www.gov.uk/government/publications/price-transparency-cma209/providing-clear-and-accurate-information-about-prices-summary (18 November 2025 first-publication date: not verified)
- EU Consumer Rights Directive 2011/83/EU Article 6(1)(e): total price inclusive of taxes, or calculation method. EUR-Lex text would not load; rests on a search summary of Commission guidance. (not verified) https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52021XC1229(04)
- EU Digital Fairness Act: a law-firm note dated 11 November 2026 says a proposal is published requiring the full price from the start. It is a proposal, not law. (not verified; no Commission page seen) https://www.lewissilkin.com/insights/2026/11/11/european-commission-publishes-long-awaited-digital-fairness-act-102o9b5

## WCAG 2.2 https://www.w3.org/TR/WCAG22/
Entries below are short paraphrases, not the exact normative text; quote the W3C page when a decision depends on wording.
- 1.3.5 Identify Input Purpose, AA: purpose of user-data inputs can be programmatically determined.
- 1.4.3 Contrast (Minimum), AA: 4.5:1 text; 3:1 large text.
- 1.4.11 Non-text Contrast, AA: 3:1 for UI component parts and states, and graphics needed to understand content.
- 2.4.7 Focus Visible, AA: keyboard focus indicator visible.
- 2.4.11 Focus Not Obscured (Minimum), AA: focused component not entirely hidden by author content.
- 2.5.8 Target Size (Minimum), AA: at least 24 by 24 CSS px, with spacing, equivalent, inline, user-agent and essential exceptions.
- 3.3.1 Error Identification, A: detected errors identified and described in text.
- 3.3.2 Labels or Instructions, A: provided when input is required.
- 3.3.3 Error Suggestion, AA: suggestions given if known, unless security or purpose is jeopardised.
- 3.3.7 Redundant Entry, A: earlier entries auto-populated or selectable, with exceptions.
- 3.3.8 Accessible Authentication (Minimum), AA: no cognitive test unless an alternative, help, object recognition or personal content is offered.
- 4.1.3 Status Messages, AA: status messages programmatically determinable without taking focus.

## For Souvenir
- Learn: Baymard's 40% and 12% cost figures, and its no-new-numbers-at-review rule, support a cost summary that shows the total early. Cite dates; the full study is paywalled.
- Learn: GOV.UK's error summary and wording guidance is public and specific. Use it as reference, not as a look to copy.
- Learn: UK s.230 and the FTC rule both put mandatory charges inside the total. The FTC rule covers only tickets and lodging, so do not cite it as general e-commerce law.
- Stay away: presenting EU rules or the Digital Fairness Act as settled; the proposal is not law and EU article text is unconfirmed.
- Stay away: citing Baymard's 2013 or 2017 items as current. WCAG's 24px target is a floor.

## Review 2026-11-13
Six claims checked against their cited pages: Baymard abandonment list, Baymard order review (Scott 2019), Baymard inline validation (Scott 2024), GOV.UK error summary and error message, FTC fees rule, UK DMCC s.230, plus the WCAG 2.2 criteria text and levels. All figures, dates, authors and levels matched. Corrections:
- Baymard list: added that the 40% and 12% figures exclude the 42% "just browsing" group, which the original omitted and which changes how the numbers can be read.
- Baymard list: "paywalled" softened; the page only links a /premium/ URL and does not say it is paywalled. Noted the page calls its method both quantitative and qualitative.
- FTC rule: the 17 December 2024 announcement date comes only from secondary law-firm reports, not the FTC page; marked as such. Effective date 12 May 2025 confirmed.
- WCAG 2.2: the brief asked for each criterion's exact requirement; the file gives paraphrases (accurate on checking). Added a line saying so rather than rewriting.
