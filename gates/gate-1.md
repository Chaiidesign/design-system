# Gate 1 record

Gate 1 is judged by fresh-context reviewers on Fable against the ten pass criteria in PROGRESS.md. The lead cannot overrule the verdict.

## Run 1, 13 November 2026: fail

Three reviewers; each judged the criteria assigned to it. Reviewer text is quoted as returned, shortened where marked.

| Criterion | Verdict |
|---|---|
| 1 | pass |
| 2 | pass |
| 3 | pass |
| 4 | fail |
| 5 | fail |
| 6 | fail |
| 7 | pass |
| 8 | fail |
| 9 | pass |
| 10 | fail |

Other findings: 22 major, 19 minor.

### Criterion 4: what would make it pass

Three edits to the table in charter/operating-model.md. (1) Make rows 5 and 8 agree: either say a new part arriving by the principle 5 route is an EXPLORE promotion decided by the steward, as CLAUDE.md has it, or define how the two differ and log the departure under "Awaiting CEO". (2) Add a row for a breaking change to a part or token when no real users are affected. (3) Add a row for narrowing a range, with a decider consistent with CLAUDE.md's "ask me first" for changes to deltas, or log it under "Awaiting CEO".

### Criterion 5: what would make it pass

1. Correct survey.md lines 23, 30, 48 and 67 so each says only what its cited file says (drop Apple from the sentence-case claim; say Apple Pay is the only cost-summary guidance among the six systems; say the summariser, not the library, noted the chat gap; support or soften the GOV.UK "when not to use" claim).
2. For every claim that now cites notes/sources/: either add a reviewed file in notes/survey/ that supports it, or remove the claim. Cross-references to the board's H1/E1 and H2/E2 can stay if worded as pointers, not claims.
3. Relabel the Gloaguen claim (line 68) from [R] until someone has read the paper and a reviewed survey file records it.

### Criterion 6: what would make it pass

Reconcile Task 3 with the accent row in budget.md before the tasks count as fixed. Either (a) restate the brand in terms the range allows and replace item 3.1's literal count and item 3.3's #000000 swap with checks that work when only the hue varies, or (b) propose a wider accent range to the CEO. Log the choice under "Awaiting CEO", since both the tasks and the range are the CEO's. In the same pass, fix the other benchmark contradictions listed under other findings (items 1.4 and 1.12, the LOCK tags, the script budget) and write the Task 2 and Task 3 prompts out in full.

### Criterion 8: what would make it pass

1. voice-and-tone.md:113: replace the automatic block with the rule in principles.md:30 (a misreading goes to the steward; no pass mark until a baseline exists).
2. checkout-slice.md:112: either report it as one tester's reaction or relabel it [pattern].
3. voice-and-tone.md:35: relabel as [pattern], inferred from Baymard's abandonment reasons, and restate the figure as principles.md:72 does.
4. checkout-slice.md:111: drop "Unexpected" or use the source's wording.
5. survey.md:76: change [R] to [P] so it agrees with checkout-slice.md:115.

### Criterion 10: what would make it pass

1. Add to the README terms: E1 and E2 (with H1 and H2), the Design Systems Library, DTCG, APCA, MCP, llms.txt, human review queue, usage telemetry and domain word list.
2. Put the one-line definitions of real user, pilot participant and pilot in README instead of a pointer.
3. In survey.md, expand or drop NN/g, semver, Compose, "resolver modifier" and "the admin", and say who Rauno Freiberg, Emil Kowalski and Jakub Krehel are.
4. Use "core team" and "core layer" as two distinct terms.
5. Rewrite the six sentences listed in the evidence.

### Major findings outside the failed criteria

- `benchmark.md`, Item 1.4 (line 64) and decision 3 (line 155): Item 1.4 requires the pay control's label to contain 82.25. budget.md's safe-behaviour row asks only that the consequence is stated "at the control", and principles.md worked case 2 allows "in its own label or directly beside it". checkout-slice.md section 1 item 7 puts the total beside the button. A page that follows the docs can fail 1.4 and be counted as a LOCK breach that budget.md does not de…
- `benchmark.md`, Item 1.12 (line 72): "No option is selected on load" is wider than the budget.md row ("No optional extra that adds cost or shares data is selected in advance") and contradicts principles.md worked case 3, which selects the cheapest of several required priced options.
- `benchmark.md`, Scoring category 3 (line 138), decision 8 (line 160); items 1.1, 2.1, 2.5, 2.6, 3.10: A failed item tagged to a LOCK table counts as a LOCK breach, but several tagged items match no row in budget.md: 1.1 (item names in full), 2.1 (no attempt logged on invalid input), 2.5 (focus leaves the pay control), 2.6 (wrong values kept; the row covers valid input), 3.10 (44 pixels, which budget.md line 113 and DECISIONS D-008 call an ADAPT starting value, not LOCK). The scorecard would report…
- `benchmark.md`, Decisions 6 and 7 (lines 158-159), against budget.md line 144: Decision 7 applies budget.md's script budgets to the agent-built page. One of them is "JavaScript needed to read the page and complete the core tasks: None", and paying is a core task (README line 50). The prompts require the payment to be simulated in the browser, so every run exceeds that budget unless it is exempt, and the file does not say. The reference page uses a test server (checkout-slice…
- `checkout-slice.md`, LOCK lines of the four parts (lines 32, 40, 48, 59); disclaimer at line 24: Four quoted LOCK names no longer match budget.md: "A second press of a submit control does not submit twice", "A destructive action is never the default", "No invented urgency", "No option that costs money ... is selected in advance". A fifth, "spends money asks for confirmation", states a requirement that budget.md line 76 and worked case 2 removed. The file says budget.md wins where wording diff…
- `checkout-slice.md`, Section 1 item 6 (line 18) and Button build states (line 37): Two conflicts with voice-and-tone.md. (1) The discount button is labelled "Apply"; rule 2 allows a one-word label only for Cancel, Close and Done, and the voice example is "Apply code". (2) The busy state says "label kept"; rule 17 and the Button example change "Pay" to "Paying…", which also drops the amount and is not verb plus object as budget.md's label check requires.
- `checkout-slice.md`, Feedback (lines 42-48): Feedback is the only part with no Failures line. It does not say what feedback does when script is off, although budget.md requires the core tasks to work without script and status messages to be announced without moving focus.
- `voice-and-tone.md`, Rules 1, 3 and 11 (lines 44, 46, 54) against the examples (lines 33-34, 72-74, 91): Model strings fail the file's own rules. Rule 1: messages end with a full stop, yet the three field errors and the tone-table error have none. Rule 3: an error says what happened and what to do, yet "Enter your email address" says only what to do. Rule 11: an error is at most 2 sentences, yet "We couldn't reach the payment service. Your card has not been charged. Try again." is 3. A writing check …
- `voice-and-tone.md`, Line 42 and decision 3 (line 130): "LOCK rules block release; only the steward changes them" contradicts budget.md line 23 and principles.md line 183, which need both the CEO and the steward. Decision 3 says each LOCK-tagged rule is the writing form of a truthful-content or safe-behaviour row; rules 3 and 16 belong to the Accessibility and Meaning tables, and rules 4 and 9 (money) have no row in budget.md at all.
- `voice-and-tone.md`, L3 row of "How this guideline improves" (line 113): "Anyone misreads a cost or status string: release is blocked" contradicts principles.md lines 30 and 66 and the L3 actuator in operating-model.md: a session finding goes to the steward, who decides, and "No pass mark for people is set until a baseline has been measured". It is in effect a pass mark of zero misreadings set before any baseline, which also bears on criterion 8.
- `voice-and-tone.md`, Cost summary examples (lines 100, 102): "Subtotal" sits in the "Not this" column, but checkout-slice.md line 52 lists a subtotal and benchmark item 1.3 requires a labelled subtotal. The total is "Total to pay" here and "Total" or "Total so far" in checkout-slice.md line 54 and budget.md line 56, which breaks rule 16 inside the charter. Rule 16 as written cannot fail "Subtotal · S&H · Promo · Grand total" on its own.
- `README.md`, README.md:10; also DECISIONS.md A-08 and D-006: All three say every number the lead chose is marked as a starting value, dated, and reviewed at a named gate. Several are not marked: operating-model.md:45 (fewer than half, three uses, a quarter), :109 (five runs), :119 (three votes, 14 days); budget.md:36 (2-pixel focus indicator), :43 (0.01 seconds); principles.md:125 (two releases). A builder would read an unmarked number as firm. The "fewer t…
- `principles.md`, principles.md:72 and :195; checkout-slice.md:113: Both files say the first (E1) pilot tests whether showing the total earlier improves understanding. checkout-slice.md:98 says a late-disclosure comparison page is what "would make E1 testable", and decision 4 (:124) says that page is not built. As planned, the pilot measures a baseline for one design and cannot test "earlier is better".
- `operating-model.md`, operating-model.md:61 against :64; principles.md:117-119: Principle 5 routes every new part through an EXPLORE item. The decision table gives "Adding a new part to the system" to the lead and "Promoting an EXPLORE item into the system" to the steward. The same change has two deciders, and CLAUDE.md:34 gives EXPLORE promotion to the steward.
- `checkout-slice.md`, checkout-slice.md:32, 40, 48, 59: The LOCK lists put in quotation marks rows that do not exist in budget.md, such as "spends money asks for confirmation" and "A destructive action is never the default". The first contradicts budget.md:76 and worked case 2, which require a separate confirmation only when the consequence is not visible at the control. Line 24 warns that budget.md wins, but a builder reading the cost summary entry wo…
- `budget.md`, ADAPT section, first bullet ("A product choosing a value inside a range needs no approval": operating-model.md puts one rule above the table: any change that reaches real users is the steward's decision, "including a change inside an ADAPT range". budget.md, vision.md and table row 2 state the product's freedom with no such limit. A product builder reading budget.md alone would ship an in-range choice to real users without the steward.
- `principles.md`, "How the ranking works", paragraphs 1 and 2 (lines 18-20): Three sentences give different outcomes for two LOCK rules that cannot both be kept: a LOCK row "is never traded for anything"; "the part is not released"; and "the lower number wins until the steward rules". A builder could read "wins" as permission to release with the higher-numbered LOCK row broken.
- `budget.md`, LOCK tables: "Nothing is shown by colour alone"; "Controls, their states and focus indicat: Four checks would miss the breach they are named for. (1) The colour-alone test passes on a difference in "attribute", so principle 1's own example, an error shown only as a red border, passes once aria-invalid is set. (2) Non-text contrast uses "the same three checks", which are defined on text and background pairs (README: declared pair). (3) Nothing tests that a status follows the real outcome,…
- `principles.md`, Principle 1 Rule (right-to-left, longer-word languages); principle 3 standing-permission p: principles.md says the machine-checkable rules of principles 1 to 3 "are LOCK rows in budget.md". Right-to-left and long translated text have a visual test named in principle 1 but no row in budget.md, so a builder cannot tell whether a failure blocks release. The standing-permission duties (act only inside limits, show what was done, allow withdrawal) have no evidence, check or row. The 30-month …
- `budget.md`, ADAPT table, rows "Layout" and "Tone of voice": The file says a product's in-range choice needs no approval because "the range check passes". No script can evaluate these two ranges as written. Layout gives no enumerated arrangements or measurable bound. Tone points to a qualitative table, and voice-and-tone.md itself says no machine can test how words sound. In voice-and-tone.md the ADAPT tag also means something else: a rule the lead may adju…
- `budget.md`, EXPLORE limits ("at most three active items", "at most one new item per pilot, or per slic: Principle 5 sends every new need that existing parts cannot meet through an EXPLORE item. The EXPLORE limits then allow one new need per slice and three in total, and an item waiting for a steward never expires. With no steward named, three waiting items would stop all additions. The limits came from a board idea about experiments; the charter does not say the effect on ordinary additions is inten…
- `budget.md`, ADAPT section: "From Gate 1, narrowing a range is the lead's decision": CLAUDE.md lists "changes to the principles or their deltas" among the things to ask the CEO first. A range is a delta, so narrowing one is a change the charter gives to the lead. The departure is not logged in DECISIONS.md.
