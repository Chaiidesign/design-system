# Scorecard

Updated every build cycle. A cell says "no data yet" until a run in this repo has produced the number. Nothing here is estimated.

Last updated: 2026-11-13 (phase 1; Gate 1 has run three times and not passed; nothing built yet)

| Measure | Definition | Baseline | Current | Source of the number |
|---|---|---|---|---|
| Components passing all tests | Components whose unit, keyboard, axe and visual-regression tests all pass, divided by all components | no data yet | no data yet (0 components exist) | test run output |
| Raw values outside the system | Count of colour, size, spacing, radius, duration, layer or font values in component or product code that do not come from a token | no data yet | no data yet | lint and drift scan |
| Duplicate patterns outside the system | Count of second implementations of something the system already provides | no data yet | no data yet | drift scan |
| First-pass review rate, Sonnet or Haiku tier | Items that passed tier-up review with no corrections, divided by items reviewed | 1 of 12 (survey files, 13 November) | 1 of 12 | Opus review section at the end of each file in notes/survey/ |
| First-pass review rate, Opus tier | Same, for Opus work reviewed by Fable | 5 of 7 by the lead's first review (13 November) | 2 of 7 with no error found so far | The seven Opus files: three source summaries, the survey synthesis, the checkout slice, the benchmark and the voice guideline. The lead's first review corrected the survey synthesis and the voice guideline and passed the other five. Gate reviewers later found errors in five: the survey synthesis, the checkout slice, the benchmark, the voice guideline and the board summary (gates/gate-1.md). No error has been found in the library and notebook summaries. The lead's first review was too light |
| First-pass review rate, Fable tier | Same, for the lead's work reviewed by a fresh-context Fable reviewer | 0 of 5 (13 November) | 0 of 5 | Three challenge reviews of charter items 1.1 to 1.4 (D-006); Gate 1 runs 1 and 2 (gates/gate-1.md) |
| Benchmark | Three fixed build tasks given to a Sonnet or Haiku agent with only the published docs: tasks completed, violations, tool calls | no data yet | no data yet (tasks are written in item 1.6) | benchmark run output |
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

The lead's own tokens are not reported to it and are not included. These figures are copied from the tool's run reports; the reviewers' returned verdicts are saved in `gates/`.

## History

| Date | Cycle | What changed | Benchmark before | Benchmark after | Kept or reverted |
|---|---|---|---|---|---|
| 2026-11-13 | Phase 1 | Brief template: clean-slate paragraph; quotes required for gathered facts. Lead's own checklist before review | no data yet | no data yet | Kept; the benchmark cannot run until docs exist |
