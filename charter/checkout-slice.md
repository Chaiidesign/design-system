# Checkout slice

Item 1.6, part one. Altitude: patterns and details. Drafted by Opus 5.5; decided by the lead on 13 November 2026 (section 8).

The **commit action** places the order and would take payment; none is ever taken here.

## 1. The slice

A person on a phone with items in a basket gives an email and delivery address, may enter a discount code, reads what they will pay, and presses the commit action. They see a confirmation, or a failure they can recover from.

The **reference checkout page** is built in this repository from the four parts, not a real shop. Its data comes from **scenario fixtures**: files setting the items, charges and simulated server responses for one session. Top to bottom on a phone:

1. Heading; notice that this is a test and nothing will be charged.
2. Error summary, only after a failed commit.
3. Cost summary.
4. Email field.
5. Address fields: name, two lines (second optional), town, postcode; country read-only.
6. Discount code: field plus "Apply" button, composed on the page.
7. Total restated, identical to the cost summary; commit button.
8. After the press: confirmation or failure.

## 2. The four parts

LOCK items are named in short here. The full rows and their checks are in [budget.md](budget.md), which was revised after this draft; where the wording differs, budget.md is right.

**Field (core)**
- For: collecting one value.
- Anatomy: label (always visible, never a placeholder), optional hint, input, inline error message, "optional" marker. The field alone owns its inline error message.
- Build: empty; focused; filled; filled by browser autofill; pasted with spaces or hyphens (accepted and normalised); invalid (message names the problem and the fix); corrected (message clears once valid); read-only (shown, selectable, not editable); long label, hint, value and error (wrap, never truncate); other language, including right to left.
- Do not build: disabled (read-only covers it); a success mark (validity is no error); loading (server checks report through feedback).
- Failures: value missing, wrong format, or rejected by the server after submission. Each shows a message beside the field; everything typed is kept.
- LOCK: "Errors are identified in text"; "Valid input survives an error"; "Nothing is shown by colour alone"; "never asked to re-enter information"; name, role, state and value; contrast, keyboard, focus, reflow, target size.

**Button (core)**
- For: starting one action.
- Anatomy: label (verb and object), focus indicator, busy indicator.
- Build: enabled; focused; pressed; busy (label kept, busy announced, further presses ignored); succeeded (result shown by feedback); re-enabled after a failure; long label (wraps); other language.
- Do not build: disabled because a form is incomplete. Pressing shows the errors instead.
- Failures: the action fails (button re-enables; feedback explains); the outcome is unknown (button does not invite a repeat; feedback says what to do).
- LOCK: "A second press of a submit control does not submit twice"; "A control's label says what the control does"; 24 by 24 pixel minimum target (44 for primary touch controls, ADAPT); "A destructive action is never the default"; keyboard, focus, contrast.

**Feedback (core)**
- For: telling the person the real state of something.
- Anatomy: kind (error, warning, success, information), heading, body saying what to do, optional links.
- Forms: **error summary** (receives focus; one link per field error, worded exactly as the field's message); **status message** (announced without moving focus); **notice** (stays while true).
- Build: each kind; in progress; succeeded; failed; outcome unknown (says so and how to check, without inviting a second attempt); long content; other language; reduced motion.
- Do not build: messages that disappear on a timer.
- LOCK: "A status shows the real state"; "Nothing is shown by colour alone"; "No invented urgency"; "Errors are identified in text"; "Motion stops or reduces"; contrast.

**Cost summary (commerce; built only from core parts and text)**
- For: showing the full amount and what makes it up, before the commit action.
- Anatomy: heading; line items (name, quantity, amount); subtotal; discounts (named, minus sign and the word "discount"); delivery; taxes; other mandatory charges, each named, never a vague "fee"; total, most prominent, with currency.
- Taxes: both "included in prices" (amount stated) and "added" (own line).
- Charges not yet known: a line saying when it will be known, such as "Delivery: added after you enter your postcode". Meanwhile the total reads "Total so far", never "Total".
- Currency: one per page, formatted for the page's locale, currency named; a value reads identically everywhere. A zero charge says "Free" and keeps its line.
- A value changes after it was shown: the line says in text what it changed from and to; a status message announces it. If this happens after the commit press, the order is not placed; the person sees the new total and presses again.
- Build: loading (old values marked as updating); all known; some unknown; value changed; discount applied; empty basket (no commit); many or long lines; other language and currency; tax included; tax added.
- Failures: discount rejected (code kept, reason given); failed to calculate (commit blocked; feedback offers a retry); value changed after the press (above).
- LOCK: "The full price ... is shown before the action that commits them"; "A status shows the real state"; "spends money asks for confirmation"; "No option that costs money ... is selected in advance"; "Nothing is shown by colour alone"; reflow; contrast.
- Invariant: the commit never completes while a mandatory charge is unknown or has changed since last shown.

## 3. What is deliberately left out of the slice

- **Card entry and real payment:** the commit returns a simulated response, so no sensitive value enters the page and failures are induced safely.
- **Accounts, saved addresses, wallets, address lookup:** no new part tested.
- **Delivery choice and other selects:** need parts outside the four.
- **Cross-border duties and later costs:** truthful "may be charged later" wording needs its own test.
- **Basket editing, subscriptions:** different journeys.

## 4. Definition: checkout comprehension

**A person comprehends the checkout when, before the commit action, they state the total exactly, name every charge in it, say correctly whether anything is unknown or payable later, and say what the commit button does.**

- **Setup.** The facilitator supplies all details from the fixture. Nothing is charged; the person is told so, and asked to "answer as if this order were real". Q1 and Q4 are scored as for a real order.
- **When.** Once every field is filled and the commit button is on screen, the facilitator says: "Please stop before pressing anything." The page stays visible; scrolling is allowed.
- **Early press.** Committing before the pause is recorded as missing, not failed, with the reason.
- **Questions, in this order and wording:**
  1. "If you placed this order now, how much would you pay in total?"
  2. "What makes up that amount?" One neutral probe only: "Anything else?"
  3. "Is there anything you might still have to pay, or that isn't decided yet?"
  4. "What will happen when you press [the button's label]?"
- **Facilitator.** Script and probe only; no hints or confirmations.
- **Answer key.** Derived from the fixture when built; checked by a second person before any session. Its charges are: the items, as one group; each discount; delivery; each tax or other charge with its own line.
- **Scoring.** Final answers are scored; self-corrections are recorded. "Don't know" is incorrect. Q1: matches the displayed total to the smallest currency unit. Q2: names every charge in the key. Q3: matches the key, including "nothing". Q4: says it places the order and commits them to pay.
- **Pass.** All four correct. A group's result is the share who pass.
- **Recorded alongside:** each charge overlooked in Q2; **surprise**, meaning the person remarks on a cost unexpectedly, questions a line, or changes their stated total (with moment and line); time to answer Q1 (unscored); access needs, assistive technology, device, language, scenario, page version. Two people score each recording independently; disagreements are recorded.

## 5. Baseline plan

Targets are not set here; only after the baseline is observed.

- **Measured:** comprehension; charges overlooked; surprise; unaided task completion; after induced errors, unaided recovery and re-entry of valid input; barriers with keyboard or assistive technology.
- **With whom:** people who shop on phones, including screen reader users (iOS and Android), keyboard or switch users, magnification or 200% text users, people with cognitive or learning disabilities, second-language readers, and people on a low-end phone and slow network. Sessions per group: set by researcher and steward before recruiting, then fixed. Staff: UX researcher (E1), accessibility researcher (E2), second scorer.
- **Material:** the reference page, frozen at a version that passed Gate 3; fixtures for all charges known, a discount applied, and a value changing after shown; induced errors (missing field, rejected field, failed commit, unknown outcome); script, answer keys, scoring sheet, consent form.
- **Compared:** groups by access need, device and language; later cost-summary revisions against this.
- **Would disconfirm:** a group with lower comprehension or completion than others (principle 1); a charge on screen yet overlooked or surprising (principle 2); needing help to recover, or re-entering valid input (principle 3); nearly everyone passing or failing, so the measure cannot tell designs apart and must be revised.
- **Cannot start until:** a steward is named; both researcher roles are filled; participants are recruited with consent and agreed compensation; the script has had a dry run.
- **Open for the lead:** market, currency and tax mode; page visible (as drafted) or questions from memory; a late-disclosure comparison page, which would make E1 testable but shows what principle 2 calls a breach (if used: clay, never shipped, participants debriefed, steward decides).

## 6. Evidence coverage

| Part | Automated checks | Keyboard test | Assistive-technology session | Comprehension session | Error-recovery session |
|---|---|---|---|---|---|
| Field | planned | planned | planned | not applicable | planned |
| Button | planned | planned | planned | planned | planned |
| Feedback | planned | planned | planned | planned | planned |
| Cost summary | planned | planned | planned | planned | planned |

## 7. Claims and their labels

- Unexpected extra costs are a leading reason given for abandoning a purchase **[research]**: Baymard cart abandonment list, updated 28 October 2026 (40% "extra costs too high"; 12% could not see the total up front); excludes the 42% "just browsing"; method not public.
- A cost rising at review makes people feel misled **[research]**: Scott, Baymard, 15 July 2019; one tester quoted.
- Showing the full total before commit improves comprehension **[assumption]**: the E1 pilot tests it.
- Keeping valid input and explaining errors beside the field helps people recover alone; validate on leaving a field **[pattern]**: GOV.UK error message and summary; Krause, Nielsen Norman Group, 2019; Scott, Baymard, 2024. No controlled study found.
- Visible labels, not placeholders; do not disable submit while incomplete **[pattern]**: Dutton, web.dev; Holst, Baymard, 2013 (old).
- Mandatory charges belong in the total **[pattern]**: UK DMCC Act 2024 s.230; CMA guidance (the US FTC rule covers only tickets and lodging).
- **[assumption]**, each needing a human test: screen reader users hear status messages without a focus move (WCAG 2.2 4.1.3 requires it); an announced change does not surprise; timed messages get missed; answering with the page visible measures understanding, not reading skill; pausing to ask questions changes how closely people read costs, so baseline results describe this test, not real-world rates.

## 8. The lead's decisions, 13 November 2026

1. **Fixtures.** The reference page has three scenario fixtures: British English with pounds and tax included in prices; American English with dollars and tax added on its own line, using the benchmark's order data; and Arabic, right to left, with pounds. Together they cover both tax modes, two currencies and a right-to-left language.
2. **Comprehension is asked with the page visible,** as drafted. Asking from memory would test memory. This is a *[starting value]* the researcher may change before the first session, not after.
3. **The pass rule stands:** all four questions correct. It is a *[starting value]* for the same reason.
4. **No late-disclosure comparison page is built.** It would show the breach principle 2 names. If a researcher wants one, it is an EXPLORE item and the steward decides.
5. **Card entry stays out of the slice.** The commit returns a simulated response from a small test server in this repository, which also makes the path without script testable.
6. **Confirmed as drafted:** the field has no disabled state, no success mark and no loading state; the commit button is never disabled because a form is incomplete; feedback has no message that disappears on a timer; the field owns its inline error and the summary repeats its words exactly.
7. **When the baseline is measured.** The board puts the baseline before the build. No earlier Souvenir checkout exists to observe, so the baseline is the first measurement of the first version that has passed Gate 3. No target is set before it. This difference from the board is logged in DECISIONS.md.
