# FigJam board summary: Souvenir process model

Date: 2026-11-13. Source: https://www.figma.com/board/Thy6ULSqteAMzw9o65a9Te/Design-system-research

## What this is and how I read it (tool or text copy, date)

This summarises the four Souvenir sections of the board. I read them on 2026-11-13 with the Figma `get_figjam` tool, read-only. Node 147:115 holds "a living design system" and, inside it, "evidence to evolution". Node 20:6 is the whole page, and it contains "sort the work, see the system" (154:494) and "what we are proposing" (151:873, named "Proposal model"). I cross-checked against the text copy in `notes/ceo-brief.md`. They match, but the copy omits "what we are proposing", which comes from the tool alone. Other page material is not covered.

## The north star and the three principle contracts

Tagline: "Universal foundations. Evidence-led evolution. Human agency. Ecommerce is the proving ground, not the boundary." The north star is "a proposed direction, not a claim of validation".

- **Universal:** different abilities, languages, devices and networks. Test with people, not agent agreement.
- **Unified:** shared meanings, behaviours and voice. Foundations stay stable, with room for context.
- **Scalable:** composable foundations, documented contracts, supported migrations, no forks.

Each contract has a rule, evidence and a trigger:

- **Honesty:** disclose the full cost before commitment. Evidence: checkout comprehension. Trigger: surprise fees or misunderstood totals.
- **Universality:** complete core tasks without a pointer. Evidence: keyboard and assistive-tech sessions. Trigger: any task-blocking barrier.
- **Simplicity + longevity:** justify every new variant. Evidence: reuse, task success, upgrade effort. Trigger: duplication without a distinct need.

## Consistency budget (LOCK, ADAPT, EXPLORE)

"A delta is a defined deviation from a reference, not a taste score."

- **LOCK:** accessibility, truthful content, semantic meaning, safe behaviour. A breach blocks release and is never averaged away.
- **ADAPT:** brand, density and responsive composition vary within explicit bounds, with the context and rationale recorded.
- **EXPLORE:** owner, hypothesis and expiry. The pattern is promoted, revised or retired after evidence review.

## Hypotheses H1-H6 and experiments E1-E6 (one line each, with dependencies)

These are "AI-proposed hypotheses, untested" and "candidate experiments, not yet committed". Every owner is a role marked "unassigned".

- **H1/E1, honest total cost:** users explain the total before paying, across cost-summary variants, with no payment needed. Owner: UX researcher. "Recommended first pilot". It needs comprehension defined and an owner and review date named first.
- **H2/E2, recover without starting over:** induced address and payment errors, recovery with keyboard and assistive tech, safe test data. Owner: accessibility researcher. Not a prerequisite to E1; runs in parallel if staffed.
- **H3/E3, unify behaviour, not appearance:** the same checkout in two themes and two densities. Owner: design-system engineer. Parallel to E1 if staffed.
- **H4/E4, adoption through usefulness:** a fresh adopter builds from docs alone, without coaching. Owner: developer-experience researcher. Starts after the pilot validates the foundations.
- **H5/E5, passport for agent changes:** one real agent proposal from the E1 build, independent review, human decision. Owner: design-system maintainer. Runs alongside E1.
- **H6/E6, transfer primitives:** checkout primitives reused in appointment booking. Owner: design-system engineer. Starts after checkout validation and then feeds a release benchmark.

## New ideas N1-N8

"Experiment limits and delegation boundaries have not been adopted."

- **N1, delegation ladder:** separate sandbox edits, pilot releases and system-wide changes; give agents autonomy only within reversible bounds.
- **N2, experiment lease:** draft limit of one new EXPLORE pattern per pilot, reviewed after two cycles.
- **N3, coverage gate:** evidence for each primitive before claiming transfer readiness.
- **N4, voice + visual lab:** two visual treatments and two tones for a failed-payment message, with a human creative checkpoint.
- **N5, reversibility drill:** rollback owner, fallback and stop condition, rehearsed first.
- **N6, dissent ledger:** the strongest counterargument recorded beside each decision.
- **N7, accessibility coverage:** keyboard, assistive-tech and cognitive evaluation tracked separately from automation.
- **N8, cost of complexity:** variants, dependencies, payload and migration tracked separately, not as one score.

## Contribution passport and decision rights

"Separate proposing from approving. Keep an accountable human."

- **Propose (human or agent):** need, hypothesis, affected principles, dependency impact, alternatives, and the disagreement kept.
- **Prove (independent review):** examples, tests, user evidence; checks for accessibility, content, performance and migration.
- **Decide (human steward):** approve consequential changes and record owner, version, rationale and rollback. "Agent consensus is not user research."

Decision rights are open: "ADAPT autonomy vs human release sign-off needs an explicit boundary." A proposed decision-rights matrix keeps names "unassigned until agreed". No steward is named.

## Subtraction release

"Improve the system by removing work, not adding options."

1. Find unused variants, repeats, unclear guidance and excess payload, and confirm usage first.
2. Merge or deprecate with an owner, a replacement, a migration window and rollback.
3. Check that task success held and that choices, defects or weight fell.

## First working cycle and evidence dashboard

The cycle is "Proposed sequence; owners and commitments to agree."

1. **Baseline:** inventory the checkout slice, observe outcomes, draft three contracts, list unknowns.
2. **Build and test:** field, button, feedback and cost summary, with examples, tests and guidance together.
3. **Gate:** review usability and guardrails, then revise or release a pilot. Only then go to a second domain.

Dashboard rule: "Baseline first. Set targets after observation. No fabricated results."

- **Human outcomes:** task success, errors, recovery and cost understanding, segmented by access needs, device and language.
- **System health:** adoption, deviations, duplicates, upgrade effort and performance against the baseline.
- **Learning loops:** checks per change, research per pilot, periodic principle and subtraction review, and an owner for each signal.

## The four loops and the build flow

**Build flow** (legend: violet Fable decides, blue agents build, green automated check, pink human decides):

1. Brief and notes feed CLAUDE.md, the work tree and the progress file.
2. Charter, then Gate 1: the steward reads it and it passes or is revised.
3. Three visual directions as clay prototypes: "Steward picks one, or agent picks after a day."
4. Tokens: DTCG files, themes and contrast checks.
5. Checkout slice, then Gate 3: tests plus review one tier up.
6. Docs site, package, lint and MCP server, then Gate 4: "an agent builds a page from docs alone".
7. Pilot E1 with real people, then a human release decision: approve (measure against the baseline), revise, or retire and record why.

**Loops:**

- **L1:** every change, builder agents. Tests, contrast, lint, payload; escalate after two failures.
- **L2:** per work item, Fable. Review one tier up and the weak-agent benchmark; fix the skill, doc or rule, then keep or revert.
- **L3:** per pilot, the steward. Real outcomes against the baseline; approve, revise or retire.
- **L4:** quarterly, CEO and steward. Revise principles or the budget, or run a subtraction release.

The loops wrap the Design Systems Library's eight steps. "Gaps to add": token layering, design-code sync, usage telemetry.

## The review notes signed "Claude" and what they ask for

The notes are under headings "Review feedback · Claude", with empty author fields. They ask the team to:

- name the steward;
- add a Retire exit;
- let agents decide inside ADAPT while the steward signs off real-user releases, LOCK changes and EXPLORE promotions;
- run automated checks on every change and human sessions only for pilots;
- define "checkout comprehension" before the baseline;
- add an "A even over B" label to each contract;
- give EXPLORE an expiry and a cap;
- add a human checkpoint for visuals and voice;
- reuse the transfer test as a benchmark on every release;
- run E1 first with a named owner and date, E5 alongside it, and hold E4 and E6 until E1 passes.

An unsigned "04 / Review" block says that E1 cannot prove every primitive ready.

## What is marked approved versus provisional

Nothing on the board is approved. "Approved" appears only as a connector label in the system map. Provisional: the north star, H1-H6, E1-E6, N1-N8, the first cycle, the work-map placements, the system map, the operating model ("not observed data") and the review notes ("feedback, not decisions").

## Open questions the board leaves

- Who is the steward, and who owns each experiment?
- Where is the boundary between ADAPT autonomy and human sign-off?
- How is comprehension measured?
- What are EXPLORE's expiry and cap?
- What human checkpoint covers visuals and voice, given that an agent may pick a direction after a day?
- What evidence does each primitive need before transfer?
- Should Retire be added to the "evidence to evolution" loop?

## Conflicts between the board and CLAUDE.md

1. **Decision rights.** CLAUDE.md says "You decide everything else inside ADAPT." On the board this is only a Claude sticky, and the board says the "boundary" is open and "not adopted".
2. **Label.** CLAUDE.md has contracts "with an 'A even over B' label on top". The board's contracts have no such label; it appears only as a sticky.
3. **Status.** CLAUDE.md states the model as settled. The board labels it proposed throughout.
4. **Steward.** CLAUDE.md has "[steward name]", a placeholder. The board names no one.
5. **Retire.** CLAUDE.md: "approve, revise or retire". The build flow agrees, but the board's "evidence to evolution" loop has only Approve and Revise.
6. **Transfer.** CLAUDE.md: "only after checkout passes". The board says E1 proves cost comprehension, "not readiness of every primitive", and N3 asks for evidence per primitive.
7. **Benchmark.** CLAUDE.md, Build loop: "three fixed ecommerce build tasks". A board sticky proposes an agent build "the booking flow" every release.
8. **Sync and telemetry.** CLAUDE.md says to "cover design-code sync and usage telemetry". The board lists both as "gaps to add".
