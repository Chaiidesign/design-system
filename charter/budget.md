# Consistency budget

Item 1.3. Altitude: patterns. Terms are defined in [README.md](README.md).

This file answers one question: how far may anything differ from the system, and who decides?

**Status.** Nothing in this file is enforced by a machine yet. Each check named here is built in phases 2 to 4. A check goes through three states, recorded in `checks/status.md` once that file exists:

- **named:** written here, not built;
- **built:** runs on every change;
- **proven:** has caught a breach planted on purpose.

Until a check is proven, its row is enforced by review, and the scorecard reports it as "not measured", not as zero.

**Where the numbers come from.** A number marked *[standard]* comes from WCAG 2.2 or another published standard. A number marked *[starting value]* was chosen by the lead on 13 November 2026 without measurement. A starting value is reviewed at the gate named beside it, or at Gate 3 if none is named, and becomes firm only when a measurement supports it or a person has approved it.

## What a delta is

A **delta** is a measured difference between an instance and its reference. The reference is a **token** (for a value), a **component contract** (for markup, behaviour and accessible names) or a **writing rule** (for text). A delta is a fact a check can report, such as "this button is 40 pixels tall and the reference is 48". It is never a score for taste.

## LOCK: the delta must be zero

A breach of a LOCK row blocks release and is never averaged with good results elsewhere. Changing a LOCK row needs both the CEO and the steward. Tightening the check behind a row is the lead's decision. Loosening or removing a check is never done to make a change pass.

All pixel values are CSS pixels.

### Accessibility

Every WCAG 2.2 level A and AA success criterion is LOCK. The table lists the criteria that have their own check. Every other criterion is covered by a per-component audit: a file, completed in phase 3 and confirmed at Gate 3, that lists each criterion as checked by a named automated check, checked by a named manual check, or not applicable with the reason.

| Requirement | Check |
|---|---|
| Text contrast is at least 4.5 to 1, or 3 to 1 for large text *[standard]* | A lint fails when a component uses a text and background combination that is not in the declared list. A script checks every declared pair in every theme. A scan checks rendered contrast in every component state |
| Controls, their states and focus indicators have at least 3 to 1 contrast against what is next to them *[standard]* | Declared pairs include each border and indicator colour with the background beside it, so the same three checks cover them. Inactive controls are exempt in WCAG; the system avoids them |
| Every function works with the keyboard alone, in a sensible order, with no trap | A keyboard path test per component and per reference page |
| Keyboard focus is visible and not covered | The test asserts a focus indicator at least 2 pixels thick (*[starting value]*) with 3 to 1 contrast, and that the centre of the focused element is not covered by another element |
| No target is smaller than 24 by 24 pixels, with the exceptions WCAG gives, such as a link inside a sentence *[standard]* | A size assertion on every interactive element that is not inside running text |
| Every control exposes its name, role, state and value | The automated scan, plus the audit file's manual check with a screen reader |
| The purpose of each input that collects personal data can be read by software, so browsers can fill it in | A test asserts the autocomplete value on each such input |
| Status messages are announced without moving focus | A test asserts the live-region role on each status message |
| Content reflows at 320 pixels wide, and text can be enlarged to 200% | A test asserts that the page is no wider than 320 pixels and that no text is clipped, at normal and at 200% text size |
| Text stays readable when a person increases line, paragraph, letter and word spacing | A test applies the WCAG spacing values and asserts that no text is clipped |
| Motion stops or reduces when the person has asked for reduced motion | A test with the reduced-motion setting on asserts that no CSS transition or animation runs longer than 0.01 seconds (*[starting value]*, standing for "none") |
| Nothing is shown by colour alone | For each pair of states in a component contract, a test asserts a visible difference in text, icon or shape |
| Parts work in a right-to-left language and with text 40% longer than the English (*[starting value]*) | A visual test with right-to-left and lengthened text asserts that nothing is clipped or overlaps, and that the order of parts is mirrored |
| Errors are identified in text, next to the problem, with a way to fix them | A component test, and the writing check |
| A person is not asked to re-enter information they gave earlier in the same task, except where it is essential or needed for security | A flow test asserts that every field not on the contract's security list keeps its value |

Automated scans find only part of the accessibility problems that exist. The surveyed sources put the share at roughly 30% to 57% **[pattern]** (see [survey.md](survey.md)). Every component's status therefore says "automated checks only" until sessions with people have been run.

### Truthful content

The design system owns the parts. It does not own a product's data. So each row has two halves.

| Requirement | What the system checks | What the product must show in its passport |
|---|---|---|
| The full price, with every mandatory charge, is shown before the action that commits | The cost summary cannot be rendered without a total and a list of charges, and shows "Total so far" while any charge is marked unknown. On the reference pages a flow test asserts that the summary comes before the committing control, that the amount at the control equals the summary total, and that the amount the test server receives equals both | That every charge it makes is passed in |
| A status shows the real state | A status takes its state from a fixed set, and a test covers each. On the reference pages a flow test asserts that the status changes only after the test server answers | That each state is set by the real outcome, not a timer |
| Urgency, scarcity and popularity come only from real data | A lint fails on quantity, deadline or popularity wording in literal text. Such text must come from a declared data field | The source of each such field |
| No optional extra that adds cost or shares data is selected in advance | Options declare whether they add cost or share data, and a lint fails if such an option is selected by default | Nothing further |
| A control's label says what the control does | The writing check: a verb and an object | Nothing further |
| Estimates, predictions and model-generated text are marked | Content fields declare a source: measured, estimated or generated. A test asserts that the marker is rendered for the last two | That each source is declared truthfully |

### Meaning

| Requirement | Check |
|---|---|
| Each component uses the native element or role that matches its meaning | Markup lint and the automated scan |
| Each token is used only for its stated purpose | Each semantic token declares where it may be used (text, background, border and so on). A lint fails on use elsewhere. A status colour used as decoration in an allowed place is judged by review |
| One meaning has one name | A naming lint against the vocabulary file, which lists each term and its banned synonyms |
| No value in a component bypasses a token | A lint on every change, with the published allow-list described under "zero drift" |
| There is no second version of something the system provides | The scan described under "zero drift". It catches only the cases its rules describe, and its result is reported that way |
| Components use semantic or component tokens, never primitive tokens | A lint that fails on any reference to any primitive group. It is proven by a fixture that uses each group once |

### Safe behaviour

| Requirement | Check |
|---|---|
| An action that cannot be undone, spends money or shares data states its consequence at the control that commits it. A separate confirmation is required only when the action cannot be undone and the consequence is not visible at the control | A component test on the control; a flow checklist run by the reviewer for flows the system does not own |
| Valid input survives an error, except values that must be re-entered for security, which the contract lists | A flow test on the reference pages, with script on and with script off |
| A second press does not act twice | A component test with script on. With script off, the form carries a hidden value that is different on each page load, and the contract requires the server to act only once for each value. The reference page's test server does so |
| A destructive action is never the control that takes first focus, that Enter activates, or that is styled as the main action | Markup lint, using a declared "destructive" attribute |
| Where an action can be reversed, the control to reverse it is shown | A component test |
| The system does not act on an instruction it had to guess | A flow checklist run by the reviewer, for every flow in which the assistant acts. Judged by review, not measured |
| No part stores a sensitive value | A lint fails on any use of browser storage in a part |
| Under a standing permission, the system acts only inside the limits the person set, shows what it did, and lets the permission be withdrawn | A flow checklist run by the reviewer. Judged by review, not measured. No part implements standing permissions yet |

## The delta for each principle

| Principle | Reference | Allowed delta | Enforced by |
|---|---|---|---|
| 1. Usable by everyone | WCAG 2.2 level AA; the test profile | Zero | The accessibility rows above |
| 2. The truth | The truthful-content rows | Zero | Those rows |
| 3. The person decides | The safe-behaviour rows | Zero | Those rows |
| 4. One meaning | Tokens, contracts and the vocabulary file | Zero for meaning and behaviour. The ADAPT ranges below for appearance | The meaning rows; the range check |
| 5. Less | The inventory at the last release; the performance budgets | Additions only by the route in principle 5. Budgets never exceeded | Review of the passport; budget checks |
| 6. Built to last | The dependency list and the public names at the last release | Zero pre-release dependencies in brick. Zero breaking changes without an alias and a migration note | Two scripts in L1 |
| 7. Composed | The core and domain layers | Zero imports from a domain into the core. Zero domain words in the core | Two lints in L1 |

## ADAPT: the delta is allowed inside a written range

Two cases are kept apart:

- **A product choosing a value inside a range,** while no real user is affected, needs no approval. The range check passes, and the choice is recorded in the product's theme file with its context and reason. Once real users are affected, the steward decides, as for any change that reaches them.
- **A change to the system's own default** inside a range is the lead's decision, after the checks and a review.

A value outside its range does not enter brick. It is pulled back to the reference, or it becomes an EXPLORE item. Once the human review queue exists, it is shown there first.

From Gate 1, changing a range, wider or narrower, needs the CEO. Phase 2 sets only the numeric steps of the scales, not the ranges. Every number in this table is a *[starting value]* reviewed at Gate 2.

| What may vary | Reference | Allowed range | What must still hold |
|---|---|---|---|
| Colour theme | The default light theme | Any theme that defines every semantic colour token. Light, dark and increased-contrast are required. In increased-contrast, text is at least 7 to 1 | Every declared pair passes. The product runs the contrast check on its own theme file |
| Accent and neutral colours | The system's scales, defined in the OKLCH colour space | The hue may change. The lightness and chroma of each step stay fixed. The accent hue stays at least 30 degrees from each status hue | Status colours (danger, warning, success, information) belong to the system and do not vary |
| Typeface | The system's type family | A family that covers the product's languages and has figures of equal width | Text in inputs is at least 16 pixels. Body line height is 1.4 to 1.6 |
| Line length | 60 characters | At most 75 characters. At least 45, wherever the container is wide enough to hold 45 characters at the current text size | Reflow at 320 pixels |
| Density | The default step | Three steps: compact, default and comfortable, multiplying the spacing scale by 0.75, 1 and 1.25 | Where the browser reports a coarse pointer, primary controls are at least 44 pixels tall. The 24 pixel floor always holds |
| Shape | The corner-radius scale | One multiplier from 0 to 2 for the whole scale | No per-component radius |
| Motion | The system's durations and easings | A product may shorten durations or turn motion off. No transition runs longer than 500 milliseconds | Reduced motion is honoured |
| Layout | The component's default arrangement | The arrangements listed in the component's contract | A test asserts that the visual order matches the order in the markup |

Tone of voice is not in this table. It shifts by situation, in the same way in every product, as [voice-and-tone.md](voice-and-tone.md) says.

Where the starting values come from: 44 pixels follows Apple's guidance of a 44 point touch area, which is a different unit, so it is a starting value and not a standard. 16 pixels for inputs avoids a browser zoom on focus on some phones **[pattern]**. The line length, line height, hue distance, density steps and 500 milliseconds are the lead's choices, informed by the craft notes in the survey, which disagree with each other.

## EXPLORE: outside the range, for a limited time

An EXPLORE item is the only way to try something the ranges or the inventory do not allow. It is clay. Brick never imports it, and it is never released to real users. It may be shown to pilot participants.

Every item has an entry in the register, `explore/register.md`, a file created with the first item: an owner, a hypothesis that evidence could prove wrong, a start date, an expiry date, the evidence to collect, and whether it has been extended. A check on every change fails if an entry is incomplete, if more than three items are active, or if brick imports an item.

Limits. The limit of one new item per pilot was taken from an idea on the board that has not been adopted; the cap of three and the 30 days are the lead's. All are *[starting values]*, reviewed at the first quarterly review:

- at most three active items;
- at most one new item per pilot, or per slice while no pilot is running;
- expiry 30 days after the start, extended once at most, by up to 30 days;
- an item whose evidence needs people does not expire while its pilot waits for a steward. It is marked "waiting".

Items made by the route in principle 5 count toward these limits. This is deliberate: it caps how many unproven parts exist at once. With no steward, three waiting items stop further additions outside the founding set.

At expiry the lead extends or retires the item, or proposes it for promotion. Promotion is the steward's decision. An item nobody decided on is retired.

## Performance budgets

These apply to the web output. The byte budgets are *[starting guesses, not measured]*. At Gate 3 the lead resets each one once, up or down, to the first measured value plus a fifth, and logs it. After that, tightening is the lead's decision and loosening needs the CEO.

| What | Budget |
|---|---|
| CSS for the checkout slice: tokens for the three required themes plus four components, compressed with gzip at level 9 | At most 12 kilobytes |
| CSS for any one component, compressed | At most 2 kilobytes |
| JavaScript needed to read the page and complete the core tasks | None. The page works by sending the form to a server |
| JavaScript for enhancement, compressed | At most 5 kilobytes per component, 15 for the slice |
| Reference checkout page, total transfer, without product images | At most 100 kilobytes |
| Fonts needed before the first text is shown | None |
| Time until the main content is visible (largest contentful paint) | At most 2.5 seconds |
| Time the page is too busy to respond while loading (total blocking time) | At most 200 milliseconds |
| How much the page jumps while loading (cumulative layout shift) | At most 0.1 |
| Response to each scripted interaction: type in a field, trigger an error, press pay | At most 200 milliseconds |

**Test profile.** The reference checkout page in this repository, loaded in Lighthouse's mobile mode: processor slowed four times, 1.6 megabits per second down, 750 kilobits per second up, 150 milliseconds of delay. The tool's version is fixed in phase 4. Each figure is the median of five runs.

The 2.5 second and 0.1 thresholds are the "good" thresholds Google publishes for its Core Web Vitals, and 200 milliseconds is its "good" threshold for interaction. All of these are lab measures. They are not data from real users. The profile figures and the thresholds are stated from the lead's knowledge of Lighthouse, a page-testing tool from Google, and of Google's published thresholds. They were not checked against the sources in this run, and are verified in phase 4 when the tool is installed.

## What "zero drift" means

**Drift** is any of three things, each counted:

1. a value in component or product code that does not come from a token. A published allow-list names what is not drift: zero, percentages, keywords such as "inherit", and breakpoint widths, which the build substitutes from tokens;
2. a second version of something the system provides. The scan's rules are listed with the scan, and it is tested on every cycle against planted duplicates. Its result is reported as "none detected by rules 1 to N", with the share of planted duplicates it caught;
3. a difference between the design source and the code for the same component. This is "not measured" until a design source exists.

The counts will cover this repository's reference pages first, and then each product repository that runs the same drift command.
