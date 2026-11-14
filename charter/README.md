# Charter

The charter says what the Souvenir design system is for, what it promises, how far anything may differ from it, and who decides. Everything built later is checked against it.

**Status.** Once Gate 1 passes, the charter is the working basis for agent work. No person has approved it. The principles, the LOCK rows and the ranges stay provisional until the CEO has read them. Nothing it describes has been built yet.

**How firm each part is.**

- *Anchored outside the system:* WCAG 2.2 level AA, showing the full price before commitment, and the token rules and base values in the CEO's brief. These are firm.
- *Starting values:* every number and limit the lead chose. Each is marked, dated 13 November 2026, and reviewed at a named gate.
- *Waiting for people:* everything that needs a steward or pilot participants.

## Read in this order

1. [vision.md](vision.md), with [vision-notes.md](vision-notes.md): what the system is for and where it should be in 1 day, 1 week, 1 quarter, 1 year and 5 years.
2. [principles.md](principles.md): seven ranked principles, each written as a contract.
3. [budget.md](budget.md): how far anything may differ from its reference, and the performance budgets.
4. [operating-model.md](operating-model.md): who does what, who decides, and the four loops.
5. [survey.md](survey.md): what public design systems do, and what we adopt, adapt or avoid.
6. [checkout-slice.md](checkout-slice.md): the first four parts, and how the baseline will be measured.
7. [benchmark.md](benchmark.md): the three fixed build tasks used to score the system.
8. [voice-and-tone.md](voice-and-tone.md): how the system writes.

## Terms

**The documents**

- **CLAUDE.md:** the CEO's standing instructions to the lead agent, at the top of the repository.
- **The brief:** the CEO's raw notes, in `notes/ceo-brief.md`.
- **The board:** a FigJam whiteboard holding a proposed process model for this system. Nothing on it is marked approved. Summarised in `notes/sources/`.
- **Rams:** Dieter Rams, the industrial designer, whose ten principles of good design the CEO asked us to use as a lens.
- **PROGRESS.md:** the list of work items and their status. An **item** such as 1.2 is one line of it. A **phase** is a group of items; there are five.
- **DECISIONS.md:** the log of decisions. Its "Awaiting CEO" section holds decisions the lead made without an answer.
- **The approvals list:** the six actions in CLAUDE.md that need the CEO's approval first.
- **Scorecard:** `scorecard.md`, the measures recorded after every work item.
- **Digest:** five lines written each day: done, next, decisions made for the CEO, risks. The **sandbox channel** is where it would be posted; none is named yet.

**The system's material**

- **Token:** a named design decision, such as a colour or a spacing step, stored once and used everywhere. A **primitive token** holds a raw value. A **semantic token** names a purpose and points to a primitive. A **component token** names one part of one component and points to a semantic token.
- **Component, or part:** a reusable piece of interface, such as a button. The **founding set** is the tokens and the four checkout parts.
- **Pattern:** a reusable arrangement of components that solves a named task.
- **Component contract:** what a component promises: its markup, states, behaviour, accessible name and the tokens it uses. A **principle contract** is a principle written as a rule, evidence and a trigger.
- **Component status:** the record of which kinds of accessibility evidence a component has.
- **Core layer:** the parts that belong to no domain. A **domain layer** holds the parts of one domain, such as commerce, built from core parts.
- **Theme file:** a product's file of choices inside the ADAPT ranges.
- **Vocabulary file:** the list of the system's terms and their banned synonyms.
- **Declared pair:** a text colour and a background colour that the system states may be used together.
- **Design source:** the design-tool file for a component, once one exists.
- **Slice:** a thin, complete piece of a product, built end to end. The first is mobile checkout. Its **core tasks** are: reach the page, enter details, see the total, pay, see the result.
- **Reference checkout page:** a checkout page built in this repository to test the parts. It is not a real shop.

**Differences and limits**

- **Reference:** what an instance is compared with: a token, a component contract or a writing rule.
- **Delta:** a measured difference between an instance and its reference.
- **LOCK:** a rule whose delta must be zero. A breach blocks release.
- **ADAPT:** a delta allowed inside a written range.
- **EXPLORE:** a time-boxed experiment outside the ranges, listed in the **register** with an owner, a hypothesis and an expiry date.
- **Drift:** a value that bypasses a token, a second version of something the system provides, or a difference between the design source and the code.
- **Writing check:** an automated check of interface text against the numbered rules in voice-and-tone.md.
- **Nightly scan:** a scheduled run that counts drift.

**People and process**

- **Lead:** the lead agent, which owns the system and reports to the CEO.
- **Subagent:** another agent the lead recruits for one task. A **brief** is the written task it is given. A **skill** is a short written procedure for a recurring task.
- **Tier:** a model's level of capability: Sonnet or Haiku, then Opus, then Fable.
- **Steward:** the accountable person who decides pilots, releases to real users and EXPLORE promotions.
- **Real user, pilot participant, pilot:** defined in operating-model.md.
- **Passport:** the one-page record a change carries: what is proposed, the independent proof, the decision.
- **Clay:** work made to learn from. Fast, disposable, never released.
- **Brick:** work that other work rests on. Reviewed, tested and maintained.
- **Altitude:** the level a task sits at: system, patterns, details or implementation.
- **Gate:** a review at the end of a phase, against pass criteria written before the phase began.
- **Baseline:** a measurement taken before any target is set.
- **Work item and build cycle:** a work item is one line of PROGRESS.md. A build cycle is one pass of build, check, fix, record and learn on a work item.
- **L1, L2, L3, L4:** the four feedback loops. L1 runs automated checks on every change. L2 reviews every work item. L3 tests with people in every pilot. L4 reviews the principles every quarter.
- **Benchmark:** three fixed ecommerce build tasks given to a less capable agent that has only the published docs.
