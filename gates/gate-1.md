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

## Run 2, 13 November 2026: fail

Three new reviewers judged all ten criteria on the corrected files.

| Criterion | Verdict |
|---|---|
| 1 | pass |
| 2 | pass |
| 3 | pass |
| 4 | pass |
| 5 | fail |
| 6 | pass |
| 7 | pass |
| 8 | fail |
| 9 | pass |
| 10 | fail |

Other findings: 10 major, 32 minor.

### Criterion 5: what would make it pass

Three edits to charter/survey.md:
1. L35: delete "none gives evidence", or write "the survey file records no evidence for any of the three".
2. L55: remove "Material Web" from Source, material-design-3.md from Supports and "one former engineer's account of weak adoption" from Reason. If the Material lesson is wanted, give it its own row named for what the file says (platforms left in maintenance mode).
3. L29: replace "None publishes DTCG JSON" with what the files say: the survey found no JSON token file for GOV.UK or Carbon; for Atlassian and Material it recorded only the format in use.

In the same edit, add one sentence to the method paragraph saying that "no reason stated" (L28, L30, L32, L34) means the survey file records none, not that the source gives none.

### Criterion 8: what would make it pass

Four small edits. (1) operating-model.md:13-19: label the For/Against claims (for example [pattern: Curtis, notes/survey/thinkers.md]) and remove or separately label "Fast" and "consistent", which the survey file does not record. (2) survey.md:55: replace "Developer complaints" with what shopify-polaris.md:58 records (one developer's forum post) and give the row one of the three labels ([P] or [A]) instead of "(anecdotes)". (3) checkout-slice.md:122: add [assumption] to "Asking from memory would test memory" or fold it into the labelled assumption at line 117. (4) voice-and-tone.md:35: add the base of the 40% figure ("among shoppers who were not just browsing"), as principles.md:72 has it.

### Criterion 10: what would make it pass

1. Add one-line README entries for: WCAG (with level A/AA), lint, range check, register check, alias, consumer, fresh-context reviewer, delta class, primitive group, fixture, test server, OKLCH (lightness, chroma, hue), coarse pointer, accessible name and description, live region, payload, and the names of the four checkout parts.
2. In survey.md and the two claim lists, say once what each outside name is (Baymard Institute, web.dev, DMCC Act, CMA, FTC, Lighthouse, axe, Storybook, Playwright, Sass, Material Web, AGENTS.md, CI, resolver, Candidate Recommendation, and the owner of each of the six systems) or drop the name where nothing rests on it.
3. Remove the second meanings: rename the voice rules' ADAPT tag or define it there and reconcile it with operating-model.md rows 68 and 73; say "model tokens" or "spend" for usage cost in scorecard.md, DECISIONS.md A-09 and operating-model.md:105; correct "four core parts" in vision-notes.md:39.
4. Rewrite the ten sentences listed in the evidence.

### Major findings outside the failed criteria

- `operating-model.md`, Decision table line 60 ("a non-breaking change to a part": lead) against principles.md:115: Principle 5 gives one route for any addition of a "component, variant, token, option and word": existing parts, then an EXPLORE item, then a second occurrence; its own breaking example is a fifth button variant. budget.md says promotion of an EXPLORE item is the steward's decision. The table only sends a new part down that route (line 64). Adding a variant, token or option to an existing part is a…
- `operating-model.md`, Human review queue, lines 116 and 120, against table line 63 and budget.md:138: The table and budget.md say the lead extends or retires an EXPLORE item at expiry, or proposes it for promotion. The queue says an EXPLORE item at expiry enters the queue and "anything else" than three votes with a majority of likes "is pulled back", including after 14 days with no vote. Once the queue has reviewers it is unclear whether the lead may still extend an item, or propose promotion with…
- `budget.md`, ADAPT table, "Tone of voice" row (line 119), with voice-and-tone.md:42: The range is "as the tone table allows", but that table prescribes one tone per situation and gives no bounds on what a product may vary, so the effective range is unknown. voice-and-tone.md uses the ADAPT tag for something else ("ADAPT rules the lead may adjust"), which also conflicts with budget.md:107 and the decision table, where any change to a range needs the CEO. A product builder cannot te…
- `budget.md`, Meaning table (lines 66-71) and "What zero drift means" (lines 163-167), against principle: Principle 4 classes meaning and behaviour as LOCK, and principles.md:18 says those rules are LOCK rows in budget.md. The two central rules, no value that bypasses a token and no second version of something the system provides, have no LOCK row. They appear only as drift counts. Principle 4's trigger says "pull it back", not "release is blocked". A builder cannot tell whether a raw value or a dupli…
- `budget.md`, Truthful content table, first row (line 57): The named system check is that the cost summary cannot render without a total and a list of charges. No named check asserts that a page with a committing control shows the summary before it, or that the amount at the pay control equals the summary total. A reference page that omits the summary, or adds a charge after the summary, would pass this row. The status row beside it does name a flow test …
- `principles.md`, Principle 6, Rule, Evidence and Trigger (lines 135-139): The rule that a web feature may be built on only after 30 months in every major browser, and that a newer feature may only add an enhancement, has no evidence and no trigger. The L1 scripts named cover only pre-release dependencies and renamed public names. This clause is a rule without a contract. Principle 7's "people and agents build from the same source" likewise has a trigger but no named sen…
- `voice-and-tone.md`, line 42, "ADAPT rules the lead may adjust"; also decision 3 (line 130): This gives the lead the right to change eleven voice rules, while operating-model.md:68 gives the voice to the CEO and :73 and budget.md:107 say changing a range needs the CEO. Run 1 raised the double meaning of ADAPT here; it is unchanged. A builder or the lead could alter sentence case, banned words or length limits without asking.
- `benchmark.md`, "How items are tagged", last sentence (line 48); Scoring category 3 (line 157): "The rows of the Meaning table are checked by the count of values that bypass the system" does not match budget.md lines 66-71. The four Meaning rows are native element or role, token used for its stated purpose, one name per meaning, and no primitive tokens in components. A count of colour literals and numbers with units checks none of them; a page that references a primitive token directly has n…
- `benchmark.md`, Item 2.5 (line 104); also items 2.2 (line 101) and 1.2 (line 66): Item 2.5 is tagged Accessibility, so a failure counts as a LOCK breach. Its second half, "focus has moved to the first error or to a summary of the errors", is not a row in budget.md's Accessibility table and is not required by a WCAG 2.2 A or AA criterion. A page that announces its errors without moving focus can meet budget.md line 40 and still be scored as a LOCK breach. Run 1 listed 2.5 among …
- `voice-and-tone.md`, Line 42 ("ADAPT rules the lead may adjust") against budget.md line 119, README.md line 67 : ADAPT means two things. In README and budget.md it is a difference a product may make inside a written range, and changing a range needs the CEO. Here it marks a rule the lead may change. budget.md's tone row says a product varying its tone must still hold "the voice rules marked LOCK", which implies the ADAPT-tagged rules (sentence case, banned words, no exclamation marks, length) are optional fo…

## Run 3, 13 November 2026: fail

Three new reviewers judged only the criteria that failed in run 2.

| Criterion | Verdict |
|---|---|
| 5 | fail |
| 8 | fail |
| 10 | fail |

### Criterion 5: what would make it pass

Two edits to charter/survey.md:
1. L63, Reason: replace "A form agents follow well" with what agent-skills.md:22 says, for example "The closest match in form: short rules an agent can read". If the behavioural claim is wanted, label it [A].
2. L61, Reason: replace "The only cost-summary guidance among the six systems" with "The only cost-summary guidance the survey found among the six systems", and either add the five other system files to the Supports cell or point to the "Still missing" list at L79.

In the same edit, to remove the same kind of wording elsewhere: L75 "Apple and GOV.UK have nothing official" to "the survey found nothing official for Apple or GOV.UK"; L134 "No surveyed system publishes a method" to "The survey found none published".

### Criterion 8: what would make it pass

One edit to scorecard.md:13, so the Opus-tier row says only what a record shows.

1. Name the seven Opus files. Say which four the lead's first review passed, and put that record in DECISIONS.md or the scorecard source cell.
2. Give the current figure that follows from recorded findings. The repository shows gate-reviewer errors in five files: survey.md, checkout-slice.md, benchmark.md, voice-and-tone.md and the FigJam summary.
   - If no error was found in the library and notebook summaries, the figure is not 0 of 7. Replace "found errors in all seven Opus files" with the true count.
   - If errors were found in those two summaries as well, drop "including one of the three source summaries", record the findings in gates/gate-1.md, and correct or annotate the two files.
3. If the lead's first review cannot be reconstructed, write "not recorded" for the baseline instead of "4 of 7".

Nothing else needs to change for criterion 8.

### Criterion 10: what would make it pass

About ten small edits; no restructuring.
1. README.md: add a "Work tree" entry. Say whether it is PROGRESS.md as the CEO's kickoff set it or PROGRESS.md as the lead may later edit it. Make README.md:57, principles.md:121 and operating-model.md:69 use that one meaning.
2. README.md:9: list the six base values, or add a "Base values" entry.
3. operating-model.md:87 and survey.md:65: replace "consumers" with "products that use the part" / "products that use the system", or add a README entry.
4. principles.md:125 and budget.md:172: say what registering a product repository means, or reword so it cannot be confused with the EXPLORE register (for example "product repositories that run the drift command").
5. operating-model.md:39: name the mental models in one clause, or add a README entry pointing to the "Mental models" section of CLAUDE.md with a one-line summary.
6. survey.md "Names used in this survey": add "release phases" and "Increase Contrast". At :66 replace "frequency bands" with plain words. At :98 name the law (notes/survey/checkout-evidence.md:29 records it as the EU Consumer Rights Directive 2011/83/EU) and call the Digital Fairness Act a proposed EU law. Gloss or drop "Apple Writing" at voice-and-tone.md:49.
7. Gloss "switch users" at checkout-slice.md:94. At benchmark.md:108 say "exposed as a live region" or explain "status or alert".
8. Rewrite the sentences listed in the evidence: budget.md:132; benchmark.md:179 (name the two colours); checkout-slice.md:87; operating-model.md:84 (say "section"); operating-model.md:116 and :120 (say what happens to an EXPLORE item in the queue); survey.md:11, :44 and :98; vision-notes.md:27; voice-and-tone.md:46 and :112.
Optional: define "density" and "tool call" in README, since both are used before the file that defines them.

## Where Gate 1 stands

Gate 1 has not passed. After three runs, criteria 1, 2, 3, 4, 6, 7 and 9 have each passed once (run 2) and criteria 5, 8 and 10 have failed every time, on a shorter and different list each time. The points named in run 3 were corrected on 13 November, and those corrections have not been judged by a reviewer.

The lead recorded the gate as blocked and reported it to the CEO (DECISIONS.md A-12), as it had said it would after a third failure.

The full text each reviewer returned, including the evidence for every verdict, is in `gates/raw/`, one JSON file per run, with the three challenge reviews that preceded the gate.
