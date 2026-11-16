# Scorecard

Updated every build cycle. A cell says "no data yet" until a run in this repo has produced the number. Nothing here is estimated.

Last updated: 2026-11-15 (version 0.2 built overnight on the CEO's instruction; one review, failed and fixed; Gates 1 and 2 not run)

| Measure | Definition | Baseline | Current | Source of the number |
|---|---|---|---|---|
| Components passing all tests | Components whose unit, keyboard, axe and visual-regression tests all pass, divided by all components | no data yet | no data under this definition: unit, axe and visual-regression tests do not exist. 10 of 10 components pass the checks that do exist (lint, size, screen check in 6 states) | `npm run check`, 15 November |
| Raw values outside the system | Count of colour, size, spacing, radius, duration, layer or font values in component or product code that do not come from a token | no data yet | 0 found by the lint in src/ and screens/. The lint allows one unit, cqi, in one place | `npm run lint`, 15 November |
| Duplicate patterns outside the system | Count of second implementations of something the system already provides | no data yet | no data yet | drift scan |
| First-pass review rate, Sonnet or Haiku tier | Items that passed tier-up review with no corrections, divided by items reviewed | 1 of 12 (survey files, 13 November) | 1 of 12 | Opus review section at the end of each file in notes/survey/ |
| First-pass review rate, Opus tier | Same, for Opus work reviewed by Fable | 5 of 7 by the lead's first review (13 November) | 2 of 7 with no error found so far | The seven Opus files: three source summaries, the survey synthesis, the checkout slice, the benchmark and the voice guideline. The lead's first review corrected the survey synthesis and the voice guideline and passed the other five. Gate reviewers later found errors in five: the survey synthesis, the checkout slice, the benchmark, the voice guideline and the board summary (gates/gate-1.md). No error has been found in the library and notebook summaries. The lead's first review was too light |
| First-pass review rate, version 0.2 as a whole | The overnight build, by Opus builders to the lead's spec, reviewed once by three fresh Fable reviewers | 0 of 1 (15 November) | 0 of 1 | gates/raw/2026-11-15-final-review.json: two lenses "fail", one "pass with fixes" |
| First-pass review rate, Fable tier | Same, for the lead's work reviewed by a fresh-context Fable reviewer | 0 of 5 (13 November) | 0 of 8 | Three challenge reviews of charter items 1.1 to 1.4 (D-006); Gate 1 runs 1 and 2 (gates/gate-1.md); the three records of 14 November: the UI SDK summary (pass with fixes, 13 corrections), the UI SDK decision (fail, one blocker) and the skills summary (pass with fixes, 16 corrections), in gates/raw/2026-11-14-ui-sdk-decision-review.json |
| Benchmark | Three fixed build tasks given to a Sonnet or Haiku agent with only the published docs: tasks completed, violations, tool calls | no data yet | no data yet (tasks are written in item 1.6) | benchmark run output | Not the benchmark, but close to it: on 15 November a Sonnet agent with only the notes built 4 and then 6 unseen screens with 0 findings on the first try (gates/raw/2026-11-15-agent-test.md) |
| Cost per component | Model tokens spent, by tier, to take one component from brief to passing all tests | no data yet | no data yet | usage reported by the tools |
| Like to dislike ratio | From the human review queue, for items outside their delta | no data yet | no data yet (queue has no reviewers) | queue export |

## Spend so far

The tools report model tokens per run, not per model tier, so a split by tier is not available.

| Run | Agents | Model tokens used by subagents |
|---|---|---|
| Sources and survey: 3 Opus readers, 12 Sonnet gatherers, 12 Opus reviewers, 1 Opus synthesiser | 28 | 3,172,657 |
| Drafts and challenge: 3 Opus drafters, 3 Fable reviewers | 6 | 958,227 |
| Gate 1, run 1: 3 Fable reviewers | 3 | 667,991 |
| Gate 1, run 2: 3 Fable reviewers | 3 | 692,746 |
| Gate 1, run 3: 3 Fable reviewers | 3 | 571,280 |
| Visual directions: 3 Fable builders | 3 | 688,903 |
| Assistant screen: 1 Sonnet builder | 1 | 205,406 |
| UI SDK and the six skills: 8 Opus readers | 8 | 1,068,904 |
| Review of the UI SDK and skills records: 3 Fable reviewers | 3 | 580,097 |
| Visual directions review: 1 Fable reviewer, in the browser | 1 | 438,815 |
| Version 0.2 foundations: 2 Opus builders | 2 | 425,399 |
| Version 0.2 components and UI SDK measurement: 6 Opus builders | 6 | 1,284,424 |
| Version 0.2 system fixes and screens: 3 Opus builders | 3 | 610,170 |
| Agent test, run 1: 1 Sonnet agent with the published notes only | 1 | 112,142 |
| Fixes from the agent test: 2 Opus builders | 2 | 346,132 |
| Agent test, run 2: 1 Sonnet agent | 1 | 118,834 |
| Final review of version 0.2: 3 Fable reviewers | 3 | 938,026 |
| Fixes from the final review: 4 Opus builders | 4 | 894,166 |

| V2 direction, 16 November: builders, snapshot copiers and integrators (Opus and Sonnet) | many | about 9,500,000 |
| V2 direction: final review, 3 Fable reviewers | 3 | about 1,700,000 |
| V2 direction: fixes from the final review, 5 Opus builders and 1 Sonnet note-writer | 6 | 1,546,151 |

The lead's own tokens are not reported to it and are not included. These figures are copied from the tool's run reports; the reviewers' returned verdicts are saved in `gates/`.

## History

| Date | Cycle | What changed | Benchmark before | Benchmark after | Kept or reverted |
|---|---|---|---|---|---|
| 2026-11-13 | Phase 1 | Brief template: clean-slate paragraph; quotes required for gathered facts. Lead's own checklist before review | no data yet | no data yet | Kept; the benchmark cannot run until docs exist |
| 2026-11-14 | Phase 2, item S.4 | Brief template written to a file (briefs/template.md) with five lines from the CEO's skills. Lead opens the charter's hard rows before writing a decision (lesson of 14 November). Readers' quotes checked by script: 232 of 233 found | no data yet | no data yet | Kept; the benchmark cannot run until docs exist |
| 2026-11-16 | V2 direction | New package on a branch: token gate, five components, runner. Share of V2 components passing all tests: 4 of 5 (DropdownMenu fails one axe rule on modal menus). Raw values in components: 0 (lint). First-pass review: the final review returned "pass with fixes" three times, 1 blocker and 26 majors. After it: a check that compares numbers written in summaries with tool output (`npm run v2:claims`); tools no longer overwrite each other's reports | not run on the V2 package | not run on the V2 package | Kept; the benchmark's three tasks were written for version 0.2's docs and have not been run against the V2 package |
