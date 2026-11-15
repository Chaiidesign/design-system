# Progress

The work tree for the Souvenir design system. Status is one of: next, in progress, done, blocked.
An item is marked done only when its check output or reviewer verdict has been shown in the session and is linked here.

Last updated: 2026-11-15

## Setup

| Item | Owner | Status | Evidence |
|---|---|---|---|
| S.1 Read CLAUDE.md, the CEO brief and the references | Fable | done | DECISIONS.md D-001 to D-008 |
| S.2 Summarise the three process sources into notes/sources/ | Opus | done | notes/sources/; DECISIONS.md D-002 |
| S.3 Create PROGRESS.md, DECISIONS.md, scorecard.md, lessons/ | Fable | done | this commit |
| S.4 Read UI SDK and the six skills the CEO supplied on 14 November | Opus readers; Fable decides | done | notes/sources/2026-11-14-ui-sdk.md; notes/sources/2026-11-14-ceo-skills.md; DECISIONS.md D-013, A-16, A-17 |

## Phase 1: Charter

Pass criteria for Gate 1 (written before the phase started; the reviewer is a fresh-context Fable agent):

1. **Vision.** States what the system is for and where it stands in 1 week, 1 quarter, 1 year and 5 years. Every horizon has at least one check an outsider could observe. It fits on one screen, meaning at most 300 words in vision.md. (The size was added on 13 November, before the gate, because a reviewer noted the criterion could not be checked without one.)
2. **Principles.** Five to seven contracts, ranked. Each has an "A even over B" label, a rule, the evidence that shows it is kept, and the trigger that makes us act. Each can be failed by a concrete example. The six base values (universality, unity, scalability, honesty, longevity, removing the unnecessary) are all covered. The ranking settles every conflict between two principles.
3. **Budget.** Every LOCK item names the check that detects a breach. Every ADAPT item has a reference and a stated range. EXPLORE has an owner, a hypothesis, an expiry and a cap. The numeric performance budgets are stated.
4. **Operating model.** A team model is chosen, with the alternatives and why they lost. A decision-rights table says who proposes, proves, decides and rolls back each kind of change. The passport is defined. Each of the four loops has its variable, current state, desired state, sensor, actuator, owner and cadence. The human like/dislike queue is defined.
5. **Survey.** Every claim points to a reviewed file in notes/survey/. There is an adopt, adapt, avoid table.
6. **Checkout slice.** The four parts are inventoried with their states and failure states. "Checkout comprehension" is defined before any target is set. The three benchmark tasks are written, fixed, and can be run by a Sonnet or Haiku agent that has only the published docs.
7. **Voice and tone.** Says what Souvenir sounds like, what it steers away from, and how tone shifts by situation. Its rules can be checked in review. It has examples for the four checkout parts.
8. **Honesty.** Every claim about how people behave is labelled as supported by cited research, inferred from established patterns, or an assumption that needs a human test. No result is invented. Targets come after baselines.
9. **Conflicts.** Every conflict between the FigJam board and CLAUDE.md is logged under "Awaiting CEO".
10. **Reader test.** A reader who has seen none of the work can follow the charter. Every special term is defined where it first appears or in charter/README.md.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 1.1 Vision for 1 day, 1 week, 1 quarter, 1 year, 5 years | Fable | done | charter/vision.md, vision-notes.md. Criterion 1 passed in Gate 1 runs 1 and 2 (gates/gate-1.md). Edited since; edits not re-judged |
| 1.2 Five to seven principle contracts, ranked | Fable | done | charter/principles.md. Criterion 2 passed in Gate 1 runs 1 and 2. Edited since; edits not re-judged |
| 1.3 LOCK / ADAPT / EXPLORE budget | Fable | done | charter/budget.md. Criterion 3 passed in Gate 1 runs 1 and 2. Edited since; edits not re-judged |
| 1.4 Operating model, passport, the four nested loops | Fable | done | charter/operating-model.md. Criterion 4 failed run 1 and passed run 2. Edited since; edits not re-judged |
| 1.5 Survey of public systems | Sonnet gathers, Opus reviews and synthesises | blocked | charter/survey.md, notes/survey/. Criterion 5 failed all three runs on wording stronger than the survey files. Run 3 points corrected, not re-judged (DECISIONS.md A-12) |
| 1.6 Checkout slice inventory and baseline plan; the three benchmark tasks | Opus drafts, Fable decides | done | charter/checkout-slice.md, charter/benchmark.md. Criterion 6 failed run 1 and passed run 2. The benchmark tasks are not yet fixed, because Gate 1 has not passed |
| 1.7 Voice and tone starting guideline | Opus drafts, Fable approves | done | charter/voice-and-tone.md. Criterion 7 passed in Gate 1 runs 1 and 2. No person has read it |
| Gate 1: fresh Fable reviewer; charter posted | Fable reviewer | blocked | Run 1 failed five criteria, run 2 three, run 3 the same three on new points (5, 8, 10). Criteria 1, 2, 3, 4, 6, 7 and 9 passed in run 2. Record in gates/gate-1.md; reported in DECISIONS.md A-12. No channel is named, so the charter is committed here instead of posted (A-02) |

## Phase 2: Foundations

Pass criteria for Gate 2 (written 13 November, before the phase started; the reviewer is a fresh-context Opus agent). Each names what decides it.

1. **Three directions exist and are comparable.** `explore/visual-directions/` holds three prototypes of the same checkout screen and a written rationale for each. Decided by: a script confirms the three pages contain the same visible text in the same order.
2. **A direction is chosen and the choice is recorded.** Decided by: an entry in DECISIONS.md naming who chose (the CEO, or the lead after one day), the reasons, and the strongest argument against.
3. **Token files are valid.** Decided by: the validation script exits with no error on every token file (2025.10 value shapes, every alias resolves, no cycle, every name matches the naming grammar).
4. **Three themes pass contrast.** Decided by: the contrast script exits with no error for every declared pair in light, dark and increased-contrast.
5. **The primitive lint is proven.** Decided by: a fixture that uses each primitive group once makes the lint fail once per group, and a clean fixture passes.
6. **The range check is proven.** Decided by: one theme fixture inside the ranges passes, and one fixture outside each numeric range fails.
7. **The build is repeatable.** Decided by: two runs of the build produce identical files.
8. **Size is measured.** Decided by: the build prints the compressed size of the token CSS for the three themes, and the number is on the scorecard beside its budget.
9. **The architecture holds up to tracing.** Decided by: the reviewer picks fifteen tokens across the three layers and traces each to a raw value; none may skip a layer or break the naming grammar.
10. **Nothing is claimed that was not run.** Decided by: every number in the phase's records points to a command whose output is saved in `gates/raw/`.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 2.1 Three visual directions as clay prototypes; choose one | Fable | done | Three prototypes on two screens (explore/visual-directions/). Reviewer's verdict: gates/raw/2026-11-14-visual-directions-review.md (no clear winner; all hard rows pass). Choice recorded with reasons and the strongest argument against: DECISIONS.md A-13. The lead took Ledger provisionally, with three corrections; the CEO can still choose otherwise until item 2.3 starts |
| 2.2 Token architecture: primitive, semantic, component; lint that blocks every primitive group in components | Fable | next | Practices to apply: notes/sources/2026-11-14-ceo-skills.md (a ban ships with its check; a failing check names its rule). Work moves off main to a branch from this item on |
| 2.3 Token files and themes, DTCG 2025.10; contrast checks | Sonnet or Haiku; automated | next | Practices to apply: notes/sources/2026-11-14-ceo-skills.md (colours and lengths converted in code, in OKLCH; no tolerance added to any range) |
| Gate 2: Opus reviewer plus tests | Opus reviewer | next | |

## Version 0.2, overnight, 15 November

Set by the CEO's instruction of 15 November (DECISIONS.md D-015). It runs ahead of the phases below and replaces their order for this work. Judged by the screens, not by documents.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| V.0 Record the UI SDK exception | Fable | done | charter/exceptions.md; DECISIONS.md D-014 |
| V.1 Direction: Instrument; fix its quiet machine-draft warning | Fable | done | explore/visual-directions/instrument/assistant.html: the warning is ink text on an amber status tab (measured in the browser, dark theme) |
| V.2 Tokens: one file, OKLCH, blue and teal accent, light and dark | Opus builds; scripts check | done | tokens/souvenir.tokens.json: 144 tokens at the end of the night. `npm run tokens` passes every rule for light and dark with blue and teal, and its self-test shows 25 of 25 broken fixtures failing on the named rule. The lint, the token check, the size report and the screen check have self-tests; the build and the no-script check do not |
| V.3 Ten components, plain HTML and CSS plus web components; sizes measured | Opus builds; scripts check | done | src/components/ (ten), docs/components/ (ten notes), screens/demo-*.html. At the end of the night (`npm run size`): largest stylesheet 847 bytes of 2,048, largest script 1,170 of 5,120, all CSS 5,001 of 12,288. UI SDK measured for four parts: 15,628 to 63,343 bytes each against the 5,120 row; none is used (DECISIONS.md A-19) |
| V.4 Checkout and assistant screens from components only, checked at 320, 375 and 1280, light and dark | Opus builds; scripts check | done | screens/checkout.html, checkout-errors.html, checkout-result.html, assistant.html, assistant-done.html, index.html. At the end of the night: 27 screens in 6 states and 16 at 200 percent text, 0 findings; checkout completes with JavaScript off, by button and by Enter. The total is inside the first 720 pixels at 320 wide (382 to 460; 630 to 708 on the error page) |
| V.5 AGENTS.md and a note per component; a fresh agent builds three screens from them alone | Sonnet builds the screens; Fable fixes the system | done | Two runs, 0 findings on the first try each time; the system was fixed between them. gates/raw/2026-11-15-agent-test.md, with each agent's brief and report in gates/raw/agent-test-run-1/ and -2/ |
| V.6 One fresh-context review; digest with screenshots | Fable reviewer; Fable | done; the review failed and its fixes are not re-reviewed | gates/raw/2026-11-15-final-review.json (4 blockers, 34 major, 24 minor); fixes in gates/raw/2026-11-15-review-fixes.json; digests/2026-11-15.md |
| V.7 After 0.2: cost summary into a commerce layer; increased-contrast theme; a fresh review of the fixes; radio part; theme kept across pages | Fable decides; Opus builds | next | Listed under "Not done" in digests/2026-11-15.md |

## Phase 3: Checkout slice

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 3.1 Component API, naming and file conventions | Fable | next | Decides the part-naming and state-attribute convention (DECISIONS.md D-013, point 4) after reading UI SDK's styling and component pages |
| 3.2 Cost summary end to end as the reference component, with the reference checkout page, its fixtures and its test server; then a skill written from it | Opus | next | The test server blocks every request that writes data before any capture runs (notes/sources/2026-11-14-ceo-skills.md) |
| 3.3 Field, button, feedback from that skill | Sonnet or Haiku | next | |
| 3.4 Unit, keyboard, axe and visual-regression tests; metadata | Sonnet or Haiku | next | Practices to apply: notes/sources/2026-11-14-ceo-skills.md (baselines never edited; a no-change control capture; focus judged by real Tab presses; responsiveness measured, not seen) |
| 3.5 Field and button built twice in explore/, on plain HTML and on UI SDK with native fallback markup; compressed size and the three scripted interactions measured for each | Opus builds; Sonnet or Haiku measures; Opus reviews | next | Informs DECISIONS.md A-16, point 2; the CEO decides if a figure is above the budget row. The measurement is kept out of the Gate 3 budget reset. Clay only: nothing in brick imports it |
| 3.6 Short survey of stable, multi-framework, unstyled behaviour libraries, as alternatives to UI SDK | Sonnet gathers with quotes; Opus reviews | next | Required by DECISIONS.md D-013 before any UI SDK part could enter brick |
| Gate 3: Opus reviewer plus tests; Fable samples all four | Opus reviewer, Fable | next | |

## Phase 4: Tooling and docs

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 4.1 Repo structure, semver, deprecation and retire policy, CI | Fable | next | |
| 4.2 Docs site built with the system, package, MCP server, AGENTS.md and llms.txt, design-code sync plan, usage telemetry plan | Opus | next | Practices to apply: notes/sources/2026-11-14-ceo-skills.md (never document a state or use with no source; every usage rule has a snippet that breaks it). UI SDK's per-package docs for agents are a model (notes/sources/2026-11-14-ui-sdk.md) |
| 4.3 Docs pages, lint rules, CI wiring | Sonnet or Haiku | next | |
| 4.4 Adoption test: a Sonnet or Haiku agent builds a checkout page from the docs alone; fix what it struggled with | Sonnet or Haiku, Fable | next | |
| Gate 4: fresh Fable reviewer | Fable reviewer | next | |

## Phase 5: Handover

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 5.1 Switch on the loops: CI on every change, nightly drift scan and benchmark, weekly delta review | Fable | next | |
| 5.2 Pilot plan for E1 (cost summary with real people), human test plan, rollout plan | Opus drafts, Fable approves | next | |
| 5.3 Final report | Fable | next | |
