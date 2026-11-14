# Progress

The work tree for the Souvenir design system. Status is one of: next, in progress, done, blocked.
An item is marked done only when its check output or reviewer verdict has been shown in the session and is linked here.

Last updated: 2026-11-13

## Setup

| Item | Owner | Status | Evidence |
|---|---|---|---|
| S.1 Read CLAUDE.md, the CEO brief and the references | Fable | done | DECISIONS.md D-001 to D-008 |
| S.2 Summarise the three process sources into notes/sources/ | Opus | done | notes/sources/; DECISIONS.md D-002 |
| S.3 Create PROGRESS.md, DECISIONS.md, scorecard.md, lessons/ | Fable | done | this commit |

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
| 1.1 Vision for 1 day, 1 week, 1 quarter, 1 year, 5 years | Fable | in progress | charter/vision.md; rewritten after challenge review (D-006); awaiting Gate 1 |
| 1.2 Five to seven principle contracts, ranked | Fable | in progress | charter/principles.md; rewritten after challenge review; awaiting Gate 1 |
| 1.3 LOCK / ADAPT / EXPLORE budget | Fable | in progress | charter/budget.md; rewritten after challenge review; awaiting Gate 1 |
| 1.4 Operating model, passport, the four nested loops | Fable | in progress | charter/operating-model.md; rewritten after challenge review; awaiting Gate 1 |
| 1.5 Survey of public systems | Sonnet gathers, Opus reviews and synthesises | in progress | notes/survey/ (12 files, each with an Opus review section); charter/survey.md; awaiting Gate 1 |
| 1.6 Checkout slice inventory and baseline plan; the three benchmark tasks | Opus drafts, Fable decides | in progress | charter/checkout-slice.md; charter/benchmark.md; decided 13 November; awaiting Gate 1 |
| 1.7 Voice and tone starting guideline | Opus drafts, Fable approves | in progress | charter/voice-and-tone.md; approved with changes 13 November; awaiting Gate 1 |
| Gate 1: fresh Fable reviewer; charter posted | Fable reviewer | in progress | No channel is named, so the charter is committed here instead of posted (DECISIONS.md A-02) |

## Phase 2: Foundations

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 2.1 Three visual directions as clay prototypes; choose one | Fable | next | |
| 2.2 Token architecture: primitive, semantic, component; lint that blocks every primitive group in components | Fable | next | |
| 2.3 Token files and themes, DTCG 2025.10; contrast checks | Sonnet or Haiku; automated | next | |
| Gate 2: Opus reviewer plus tests | Opus reviewer | next | |

## Phase 3: Checkout slice

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 3.1 Component API, naming and file conventions | Fable | next | |
| 3.2 Cost summary end to end as the reference component, then a skill written from it | Opus | next | |
| 3.3 Field, button, feedback from that skill | Sonnet or Haiku | next | |
| 3.4 Unit, keyboard, axe and visual-regression tests; metadata | Sonnet or Haiku | next | |
| Gate 3: Opus reviewer plus tests; Fable samples all four | Opus reviewer, Fable | next | |

## Phase 4: Tooling and docs

Pass criteria: to be written before the phase starts.

| Item | Owner | Status | Evidence |
|---|---|---|---|
| 4.1 Repo structure, semver, deprecation and retire policy, CI | Fable | next | |
| 4.2 Docs site built with the system, package, MCP server, AGENTS.md and llms.txt, design-code sync plan, usage telemetry plan | Opus | next | |
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
