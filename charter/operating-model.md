# Operating model

Item 1.4. Altitude: system. Terms are defined in [README.md](README.md).

This file says who does the work, who decides, how a change gets in, and how the system is meant to correct itself.

## Team model

**Choice: a central core team plus contributors.** This is the hybrid the CEO described: a core team that maintains the system, and designers, engineers and their agents who contribute through the passport. The core team does not depend on contributions arriving.

Today the core team is one lead agent and the subagents it recruits. There are no other contributors and no named steward. That is the current state, not the intended one.

| Model | For | Against | Used here |
|---|---|---|---|
| Solitary: one team builds for its own product | Close to a real product | Fits that product and little else | No. The CEO ruled out an ecommerce-only system |
| Centralised: a dedicated team builds for everyone | No single product's agenda | Can lose touch with real products | Yes, as the base. The slice and the pilots are there to keep it in touch |
| Federated: people from product teams decide together | Broad relevance | Slow; split loyalties | As the route for contributions, never alone |

The three models, and the entries in the For and Against columns, are **[pattern]**: they come from Nathan Curtis, a consultant who writes about design system teams. He reports no case, among more than 80 systems, of a federated model succeeding without investment in a central team. See [notes/survey/thinkers.md](../notes/survey/thinkers.md).

## Roles

| Role | Who | What it owns |
|---|---|---|
| CEO | The person the lead reports to | The principles, the ranges, the approvals list, the scorecard definitions, the benchmark tasks, the roles and this file's decision table |
| Steward | Not named. The CEO holds the seat | Pilots, releases to real users, EXPLORE promotions, and, with the CEO, any LOCK change |
| Lead | The lead agent, on Fable | The charter, architecture, naming, visual direction, arbitration and reports |
| Builder with judgment | A subagent on Opus, recruited per task | Work with a written spec that needs design or engineering judgment |
| Builder to a checklist | A subagent on Sonnet or Haiku, recruited per task | Work a test or checklist fully verifies |
| Reviewer | A fresh subagent one tier above the builder. For the lead's work, a fresh subagent on Fable | An independent verdict on one piece of work |
| Contributor | Any person or agent | Proposals, through the passport |

**Two honest limits.** A reviewer on the same model as the author shares the author's blind spots, so the review of the lead's own work is the weakest review in the system. And no agent's viewpoint stands in for a person: a reviewer's findings are never recorded as evidence about people.

## Recruiting and retiring subagents

**Recruit** when the work is independent and can run in parallel, when an independent review is needed, or when a checklist can verify the work and a less capable model can do it. Do small work directly.

**Every brief states** the objective, the output format, the tools and sources, what is not the subagent's job, the done-criteria, the altitude, whether the output is clay or brick, the mental models in CLAUDE.md, and any earlier decision on the same question.

**Subagents do not recruit subagents.** This is a starting rule, meant to keep cost and responsibility in one place. The alternative, one level of delegation with a spending cap and a log entry per recruit, was set aside for now because the lead has no data on what delegation costs. The rule is reviewed at the first quarterly review, or sooner if work waits on the lead for briefs.

**No standing committee of agents.** Where a decision cannot be checked by a test, the lead recruits reviewers with different lenses and asks each to try to prove the decision wrong: an accessibility specialist checking against published criteria, a writer, a performance engineer, an agent that has only the docs, a newcomer, and a sceptic.

**Retiring.** A subagent ends when its brief is done. A brief template or a skill is retired when, after one revision, fewer than half of the pieces of work made with it pass review first time across three uses, or when it has not been used for a quarter. These thresholds are *[starting value]*, reviewed at the first quarterly review. Each piece of work records the template or skill it was made with.

**Escalation.** Work that fails review twice moves up one tier. Work at the top tier that fails twice is marked blocked and reported to the CEO.

## Who decides what

A **real user** is a person using a Souvenir product for their own purposes. A **pilot participant** is a person recruited to try something, who knows it is a test. A **pilot** is a session or set of sessions with pilot participants.

One rule sits above the table, and follows the FigJam board until the CEO says otherwise: **any change that reaches real users is the steward's decision, including a change inside an ADAPT range.**

| Kind of change | Who may propose | Independent proof | Who decides | Who can roll it back |
|---|---|---|---|---|
| Clay: a prototype or experiment file | Anyone | None | Its author | Its author |
| A product choosing a value inside an ADAPT range, no real users affected | The product or its agent | The range check; the entry in the theme file | The product | The product |
| A change to the system's default inside an ADAPT range, no real users affected | Anyone | Automated checks; a reviewer | Lead | Lead |
| A founding part, or a non-breaking change to a part that adds no variant, token or option, no real users affected | Anyone | Automated checks; a reviewer | Lead | Lead |
| A breaking change to a part or token, no real users affected | Anyone | Automated checks; a reviewer; an alias and a migration note | Lead | Lead |
| Starting an EXPLORE item | Anyone, with a complete register entry | The register check | Lead | Its owner |
| Extending or retiring an EXPLORE item at expiry | Its owner | The evidence collected | Lead | Lead |
| Adding a new part, variant, token or option outside the founding set. Each arrives as an EXPLORE item, so this is always a promotion | Its owner | A passport showing the second occurrence; evidence against its hypothesis; checks; a reviewer | Steward | Steward |
| Running a pilot | Lead | Gate results; passing LOCK checks; safe test data; a named rollback owner, a fallback and a stop condition written first | Steward | Steward |
| A release to real users, or any change that reaches them | Lead | Gate results and pilot evidence | Steward | Steward |
| Removing or retiring a part | Anyone | Usage data, an owner, a replacement, a migration window, a way back, and a check that task success held | Lead; steward if real users are affected | Whoever decided |
| Choosing the visual direction or the voice | Lead | Three or more variants; a reviewer | CEO. If there is no answer within a day, the lead chooses and logs it | CEO |
| Adding or tightening a test or lint rule; changing a skill, brief, docs page or the work tree | Anyone | A reviewer, for tests and lint rules | Lead | Lead |
| Loosening or removing a test or lint rule | Anyone | The reason it is wrong | CEO; with the steward if it sits behind a LOCK row. Never done to make a change pass | CEO |
| Tightening a performance budget | Lead | A measurement | Lead | Lead |
| Loosening a performance budget, other than the one reset at Gate 3 described in budget.md | Lead | A measurement | CEO | CEO |
| Changing an ADAPT range, wider or narrower | Lead | A measurement or evidence | CEO | CEO |
| A change to a LOCK row or to principles 1 to 3 | Anyone | Evidence; a reviewer | CEO and steward together | CEO and steward |
| A change to principles 4 to 7, the approvals list, the scorecard definitions, the benchmark tasks, the roles or this table | Lead | Evidence from the loops; a reviewer | CEO | CEO |
| Passing a gate | Lead submits | The pass criteria written before the phase | The gate reviewer. The lead cannot overrule the verdict | Not applicable |

**When the lead is the proposer,** in a row where the table names the lead as decider, the proof is written by a fresh reviewer on Fable, and the decision is the reviewer's verdict. The lead may not overrule it. The lead may take a disagreement to the CEO under "Awaiting CEO".

**What Gate 1 does and does not do.** The board has a person read the charter at Gate 1. CLAUDE.md gives the gate to a fresh reviewer. So a Gate 1 pass makes the charter the working basis for agent work, and no more. No person has approved it. The principles, the LOCK rows and the ranges stay provisional until the CEO has read them.

## The passport

A passport is one page that travels with a change. The author of the first part never writes the third.

1. **Propose.** The need. The hypothesis. The principles it touches. What depends on it. The alternatives. Its altitude, whether it is clay or brick, and whether it falls under LOCK, ADAPT or EXPLORE.
2. **Prove.** Written by an independent reviewer. The test output. The accessibility, writing and performance checks. What consumers of the part must change. The label on every claim about people. The strongest argument against the change, kept even if it is approved.
3. **Decide.** Who decided. Approve, revise or retire. The reason. The version. How to reverse it.

A passport helps a reviewer; it does not replace one. If the proof cannot be verified, the change is not approved.

## The four loops

This is how the system is meant to correct itself. One of the four loops runs today, in part.

Each loop measures one thing, compares it with a desired state, and acts. An inner loop passes a signal outward when it cannot settle it. An outer loop sets the limits for the inner ones. The loops run at different speeds on purpose, because a loop that corrects using old information overshoots.

| | L1 Change loop | L2 Build cycle | L3 Pilot loop | L4 Strategy loop |
|---|---|---|---|---|
| Runs | On every change | On every work item, and nightly | On every pilot. At least one a quarter once a steward is named | Every quarter |
| Owner | Builder agents | Lead | Steward | CEO and steward |
| Variable | Does this change pass its checks? | The scorecard | Do pilot participants succeed at the task? | Are the principles and ranges still right? |
| Current state | Not running. Starts with the first token file | Review is running. The benchmark and the scans are not, until tokens and docs exist | Not running. No steward, no participants | Not running. First review due 13 February 2027 |
| Desired state | Every check passes before a change is merged | First-pass review rate rises, benchmark holds or improves, and defects found later in work that passed first time stay low | Task success and understanding at or above the baseline | Each principle decided something, and none is contradicted by evidence |
| Sensors | Tests, contrast, lint, the size of what is shipped | Reviewer verdicts; the benchmark; the nightly scan for bypassing values and second versions; the inventory script; the spend in model tokens that the tools report | Sessions with pilot participants, measured against the baseline | L3 evidence; scorecard history; DECISIONS.md and the passports; counts of parts added and removed |
| Actuator | Fix the change and rerun. A check is never loosened or removed to make it pass | Change the skill, brief, docs page or lint rule that caused a failure. Keep the change if the benchmark holds; revert if it drops | Approve, revise or retire | Revise a principle or a range, or schedule a release that removes things |
| Passes outward when | A change fails twice | A slice is ready for people, or an item shows no gain after three cycles | Evidence contradicts a principle | Not applicable |
| Cannot tell us | Whether the checks are the right checks | Whether the charter is right for people. It measures agreement with the charter | Anything, until it runs | Anything about people, until L3 runs |

**Comparing benchmark scores.** A score is made of five runs of each task. Five is a *[starting value]*, to be checked against how much the runs of the first baseline differ from each other. Violations are compared first, then completion, then tool calls. A change counts as a drop only if it is larger than the spread between the five runs.

### The human review queue

This is the fast human loop for one case: an item outside its range.

- **What enters:** an instance a check reports as outside an ADAPT range. The lead may also add an EXPLORE item at its expiry, to inform the lead's own decision; the vote does not decide it.
- **What the reviewer sees:** the instance, the reference, the size of the difference, and one sentence of context.
- **What the reviewer does:** like or dislike, with an optional line saying why.
- **Who reviews:** people named by the steward.
- **What happens:** an item with at least three votes and a majority of likes becomes a proposal to widen the range or promote the item, through the passport. Anything else is pulled back to the reference. An item with no vote after 14 days is pulled back. Three votes and 14 days are *[starting value]*. The item stays out of brick while it waits.
- **What it is not:** votes are opinions from inside the company. They are not evidence about users, and they never override a LOCK row.

The queue is built in phase 4. Until it has reviewers, an out-of-range value is pulled back.

## Where things are said

Until a sandbox channel is named, the daily digest is written to `digests/`, and gate results and reports are committed to this repository. Nothing is posted anywhere else.

## The strongest argument against this model

It is a closed loop with no person in it. An agent wrote the promises, agents build to them, agents check the building, and an agent reviews the gate. Every sensor that runs today measures agreement with the charter. The sensors that could show the charter is wrong for people are defined and empty. The system could reach zero drift and a rising benchmark while being wrong, and look healthy on its own scorecard. The remedy is not in this file: it is a named steward and a first pilot.
