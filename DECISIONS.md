# Decisions

Each entry gives the decision, the reason, the principle it rests on, and how to reverse it.
Entries under "Awaiting CEO" were made without an answer from the CEO. In each case the most reversible option was chosen and the work continued.

Last updated: 2026-11-13

## Awaiting CEO

### A-01. The lead agent built the archived 0.1.0, in this same conversation

- **Situation:** CLAUDE.md says not to read, reuse or reference the tag v0.1.0-archive. The lead agent wrote 0.1.0 earlier in the conversation in which this run started, so it cannot be unread. In addition, three survey files and the survey synthesis came back with remarks such as "our token files already use..." and "the repo's 32px is stricter": the tooling had passed the old AGENTS.md to the subagents, although it is no longer in the repository.
- **Decision:** Nothing from 0.1.0 is copied or consulted. The tag has not been read or touched. On 13 November the four files were corrected, and a search of `notes/` and `charter/` for those remarks then found none. Every later brief tells the subagent that no tokens or components exist and that any AGENTS.md text describing them is retired.
- **Principle:** 2, the truth.
- **To reverse or strengthen:** Start a fresh Claude Code session in this repository. Everything so far is in files.

### A-02. Five placeholders in CLAUDE.md are unfilled

- **Situation:** The steward, the sandbox channel, the list of tools, the ecommerce surface and the people to interview are not named. On 13 November the CEO said the focus now is the lead owning the system, and that handing it to humans comes later.
- **Decision:**
  - *Steward:* the CEO holds the seat. Nothing is released to real users and no pilot is run.
  - *Sandbox channel:* nothing is posted to any channel. Digests go to `digests/`; gate results and reports are committed here.
  - *Tools:* GitHub (this private repository) and local tools. Figma and Superhuman Docs are read, never written.
  - *Ecommerce surface:* a reference mobile checkout built in this repository. It is not a real shop.
  - *People to interview:* none. Every claim about people is labelled, and the pilot loop is designed but not run.
- **Principle:** 3, the person decides.
- **To reverse:** Fill in the "Resources" section of CLAUDE.md.

### A-03. The raw notes say "you are approved, just do it"; the approvals list still applies

- **Decision:** The six approvals in CLAUDE.md stand, because CLAUDE.md says the notes do not override it and these six are the actions that are hard to undo.
- **To reverse:** Remove items from the "Approvals" section of CLAUDE.md.

### A-04. Conflicts between the FigJam board and CLAUDE.md

Nothing on the board is marked approved. For each conflict the rule in CLAUDE.md was applied: follow the board where real users or a LOCK item are touched.

| # | Conflict | What the lead did |
|---|---|---|
| 1 | CLAUDE.md lets the lead decide everything inside ADAPT. The board says that boundary is not agreed | One rule, stated in operating-model.md: any change that reaches real users is the steward's decision, including one inside an ADAPT range. Otherwise the lead decides inside ADAPT |
| 2 | CLAUDE.md requires an "A even over B" label. On the board it is only a suggestion | The label is used |
| 3 | CLAUDE.md states the process model as settled. The board calls it proposed and untested | It is used as the working model. Every hypothesis about people stays labelled an assumption |
| 4 | Neither names a steward | See A-02 |
| 5 | CLAUDE.md has "approve, revise or retire". One board diagram has no retire exit | Retire is included |
| 6 | CLAUDE.md allows transfer to booking once checkout passes. The board says the first pilot proves only that people understand the cost | The board is followed: a part is called ready for transfer only when there is evidence for that part |
| 7 | CLAUDE.md fixes the benchmark as three ecommerce tasks. A board note suggests a booking build at every release | The three ecommerce tasks are the benchmark. See A-05 |
| 8 | CLAUDE.md asks for design-code sync and usage telemetry. The board lists them as gaps | Both are planned in item 4.2 |
| 9 | The board has a person read the charter at Gate 1. CLAUDE.md and the work tree give Gate 1 to a fresh Fable reviewer | A Gate 1 pass makes the charter the working basis for agent work only. The principles, LOCK rows and ranges stay provisional until the CEO has read them |
| 10 | The board says "baseline first, targets after". CLAUDE.md asks for numeric performance budgets in the charter | The budgets are set as marked starting guesses, and are reset once to measured values at Gate 3 |
| 11 | The board says the steward picks the visual direction, or the agent picks after a day. CLAUDE.md gives visual direction to the lead | The lead makes three directions; the CEO chooses; if there is no answer within a day the lead chooses and logs it |
| 12 | The board's first cycle measures a baseline before building. No earlier Souvenir checkout exists to observe | The baseline is the first measurement of the first version that passes Gate 3. No target is set before it |
| 13 | CLAUDE.md gives every EXPLORE promotion to the steward. The charter's route for additions makes every new part outside the founding set an EXPLORE item first | Adding such a part is therefore the steward's decision. With no steward, the system can grow only by the founding set: the tokens, the four checkout parts, and parts a work item in the CEO's work tree requires |
| 14 | CLAUDE.md asks the CEO first for changes to deltas. An earlier draft let the lead narrow a range | Any change to a range, wider or narrower, needs the CEO |
| 15 | A board note says components reference semantic tokens only. CLAUDE.md says semantic or component tokens | CLAUDE.md is followed: three layers, and components never reference primitives |
| 16 | A board review note asks for a human checkpoint for visuals and voice. CLAUDE.md gives both to the lead | The lead proposes; the CEO chooses; a person reads every string before it reaches pilot participants or real users |

- **To reverse:** Tell the lead which side to take on any row.

### A-05. Proposed: add a booking task to the benchmark later

Not added. Proposed for after the checkout slice passes, so the benchmark also shows whether the core stays free of commerce.

### A-06. "W3C Design Tokens spec 2025.10" is a Community Group report

The survey found that the format is a report of the Design Tokens Community Group, declared stable, and not a W3C standard (`notes/survey/dtcg-2025-10.md`). Tokens will conform to it, and docs will call it the "Design Tokens Community Group format, 2025.10".

### A-07. A seventh value, human agency, was added as principle 3

- **Situation:** The brief lists six base values. The board's tagline adds "human agency". For an AI work assistant, the rule that the system does not commit on a person's behalf seemed too important to leave out.
- **Decision:** Added as principle 3, "The person decides", with its checkable behaviours as LOCK rows. It ranks above four of the CEO's own values.
- **Strongest argument against:** it is not in the brief, it comes from a board where nothing is approved, and locking it could force confirmations that principle 5 would remove.
- **To reverse:** Remove principle 3 and move its rows into principle 2 or drop them. The other six principles stand without it.

### A-08. Every number the lead chose is a starting value

- **Situation:** The ranges, the EXPLORE limits, the byte budgets, the writing limits and the benchmark limits were chosen by the lead without measurement.
- **Decision:** Each is marked "starting value" where it appears. All were chosen on 13 November 2026 and are reviewed at Gate 2, Gate 3 or the first quarterly review, as the file that holds them says. The byte budgets are reset once to measured values at Gate 3, which may mean loosening one; that reset is the one loosening the lead will make without asking.
- **To reverse:** Replace any number; none has anything built on it yet.

### A-09. Proposed additions to the scorecard

Scorecard definitions are the CEO's. These are proposed, not added:

1. counts of components, variants and tokens, and shipped size, from an inventory script (principle 5);
2. maintenance cost per product: model tokens and human hours spent on system changes per release, divided by the number of products using the system (principle 7; "not measured" until two products exist);
3. for each LOCK row, whether its check is named, built or proven by catching a planted breach;
4. defects found later in work that passed review first time.

### A-11. Benchmark Task 3 was rewritten to fit the accent range

- **Situation:** The first draft of Task 3 gave a brand as two exact colours. The budget lets a product change only the accent's hue. The first run of Gate 1 failed on this.
- **Decision:** The range was kept and the task rewritten: one brand colour, tested by hue. The tasks become fixed when Gate 1 passes; after that only the CEO changes them.
- **To reverse:** Widen the accent range in `charter/budget.md` and restore two colours in the task.

### A-12. Gate 1 has not passed after three runs, and is blocked

- **Situation:** Gate 1 ran three times on 13 November. Criteria 1, 2, 3, 4, 6, 7 and 9 passed in run 2. Criteria 5 (survey), 8 (honesty) and 10 (reader test) failed all three runs, each time on a shorter, different list: by run 3, two survey sentences, one scorecard row, and about a dozen undefined terms and unclear sentences. The run 3 points were corrected and have not been re-judged. The record is in `gates/gate-1.md`.
- **Why it keeps failing:** the lead wrote those three criteria with the word "every" and no limit on what counts. A fresh reviewer can always find one more term or one more sentence. The work improved each run; the criteria cannot be met with certainty. Rewriting a criterion to make it pass is not something the lead may do.
- **Decision:** Gate 1 is recorded as blocked, not passed. Items 1.1 to 1.4, 1.6 and 1.7 are marked done on the strength of the criteria that passed. Item 1.5 is marked blocked. The lead moves on to phase 2, starting with the three visual directions, which are disposable prototypes. Nothing in phase 2 rests on the three failing criteria: they concern the survey's wording, one scorecard row and the glossary.
- **What the CEO can do:** read the charter and pass or fail it yourself, which is what the board intended for Gate 1; or ask for a fourth run; or rewrite criteria 5, 8 and 10 so that a bounded check can decide them.
- **To reverse:** Tell the lead to stop phase 2 until the gate passes.

### A-13. Choose a visual direction

- **Situation:** Three disposable prototypes of the same checkout screen exist in `explore/visual-directions/`: Ledger, Instrument and Signal. They share identical text and markup (checked by `_shared/compare-text.mjs`; output in `gates/raw/visual-directions-text-check.txt`). The lead viewed each at 375 and 320 pixels wide in light and dark: no sideways scroll, no text under 16 pixels, no control under 48 pixels tall. Contrast figures are the builders' own calculations and have not been checked independently.
- **The lead's recommendation: Ledger.** It needs the fewest parts (one surface, no shadows, three type sizes), which serves principles 5 and 6, and its cost summary is the clearest of the three.
- **Strongest argument against Ledger:** it reads as a document, and Souvenir is an assistant people talk to; controls that look like text may feel less alive than Instrument's. Also, its square corners leave the corner-radius range with nothing to multiply, so the reference radius would have to be small but not zero.
- **Decision:** The choice is the CEO's. If there is no answer by 14 November 2026, 18:30, the lead chooses Ledger and logs it.
- **To reverse:** Choose another direction before the token values are made (item 2.3). After that, a change costs the token values but not the architecture.

### A-14. The lead now runs on Sonnet 5.5, not Fable 5.2

- **Situation:** On 13 November the CEO said the Fable limit had been reached and the work must continue on a cheaper model, and set the session to `claude-sonnet-5-5`. CLAUDE.md routes vision, principles, visual direction, architecture, naming, arbitration and gate reviews to the lead on Fable.
- **Decision:** The lead continues on Sonnet 5.5 and follows the CEO's instruction. To keep the rule's intent, each decision that much depends on and that no test can check (token architecture, naming grammar, the visual direction) is put to the advisor tool, a stronger reviewer, before it is written, and is logged as made on Sonnet. Gate reviews are still done by fresh reviewers; their tier is whatever the CEO's limit allows and is recorded with the verdict.
- **To reverse:** Switch the session back to Fable. Decisions logged as made on Sonnet can then be re-read.

### A-15. The archived 0.1.0 is not deleted

- **Situation:** The CEO said the old build may be deleted if needed, to clear the confusion it caused.
- **Decision:** Not deleted. The confusion did not come from the tag. It came from the old AGENTS.md being passed to subagents while the conversation that wrote it was still open (A-01). That session has now ended: the new session's instruction files no longer list AGENTS.md. Deleting the tag would remove the record and fix nothing. Deleting is also the one step here that cannot be undone, and CLAUDE.md says a deletion needs the CEO's approval for something the lead did not create.
- **To reverse:** Tell the lead in a plain sentence to delete `v0.1.0-archive`, and it will.

### A-10. What the lead needs from the CEO

In order of how much they unblock: a named steward; a first read of the charter, especially the seven principles and the LOCK rows; a channel for digests; a choice among the three visual directions when they exist; and, for the first pilot, a researcher and participants.

## Decisions made by the lead

### D-001. Read the FigJam board at both node addresses

CLAUDE.md's references point to node 147-115 and the raw notes to node 20-6 of the same board. Both were read.

### D-002. All three process sources were opened

The FigJam board (Figma tool, read-only), the Design Systems Library (Superhuman Docs tool) and the Systems Notebook (a saved copy of the artifact) were read on 13 November. One gap: the library's process-loop diagram is an image, and its step names could not be read. Summaries are in `notes/sources/`.

### D-003. Model routing in practice

"Latest Opus" is Opus 5.5 and "latest Sonnet" is Sonnet 5.5, started as subagents. Survey gathering ran on Sonnet at medium effort. Each file was checked by a fresh Opus reviewer, who corrected errors directly. A file that needed any correction counts as not passing first time: one of twelve passed.

### D-004. Seven principles in two ranked groups

See `charter/principles.md`, "Alternatives considered", and A-07.

### D-005. Subagents do not recruit subagents; no standing committee of agents

A starting rule, with the alternative and the review trigger written in `charter/operating-model.md`.

### D-006. The charter was rewritten after three challenge reviews

Before the gate, three fresh reviewers on Fable were asked to break items 1.1 to 1.4, each with a different lens: fidelity to the brief, whether each contract can be checked and can fail, and a sceptic. Two returned "fail as drafted" and one "pass with fixes": 9 blockers, 68 major and 20 minor findings, with overlap. The five files were rewritten. The main changes: the vision was cut to one screen; conflicts among the first three principles now have a rule that keeps work moving without a person, while the part in question stays unreleased until the steward rules; every LOCK row names a check that can read a declared fact; every number the lead chose is marked as a starting value; and the charter no longer calls itself approved.

### D-010. Gate 1, first run: fail

Three fresh reviewers on Fable judged the ten criteria on 13 November. Criteria 1, 2, 3, 7 and 9 passed. Criteria 4, 5, 6, 8 and 10 failed. The record is in `gates/gate-1.md`. The causes: two deciders for adding a part; survey claims resting on files that had no review; a benchmark task written before the accent range was tightened; four research labels stronger than their sources; and terms used without a definition. All were fixed the same day and the gate was run again.

### D-011. Gate 1, second run: fail

Fresh reviewers judged all ten criteria again. Criteria 1, 2, 3, 4, 6, 7 and 9 passed. Criteria 5, 8 and 10 failed: three survey sentences said more than their files; three claims about people had no label; and about forty terms and outside names were still undefined. All were fixed the same day. The record is in `gates/gate-1.md`.

### D-012. Gate 1, third run: fail; gate recorded as blocked

Criteria 5, 8 and 10 failed again on new, smaller points. See A-12 and `gates/gate-1.md`. From phase 2 on, each pass criterion is written so that a script, a count or a stated sample can decide it (lesson of 13 November, "criteria that say every").

### D-007. Three arguments against the charter, kept on record

1. **It is a closed loop with no person in it.** Agents wrote the promises, build to them, check them and review the gate. The system could reach zero drift and a rising benchmark while being wrong for people.
2. **A named check is not a check.** No check exists yet, and none has been shown to catch the breach it is named for. Builders will optimise for what the detectors see.
3. **It follows the board's governance more than the CEO's wish for a working system to react to.** A more faithful charter would be shorter and would make firm only what a machine can check today.

The lead's answer: the charter now separates what is anchored outside the system from starting values and from what waits for people; check status is tracked as named, built or proven; and the next phases build working software, which is the only real reply to the third argument.

### D-008. Answers to the survey's open questions

1. *Touch target:* 24 pixels is the LOCK floor; 44 pixels for primary controls where the pointer is coarse is a starting value.
2. *A behaviour library tied to one framework:* not in the core. Native HTML and CSS first; custom elements only where the platform lacks a behaviour.
3. *The beta UI SDK:* watched, not used.
4. *Browser policy:* features available in every major browser for 30 months may be relied on; newer ones only as enhancement.
5. *Versioning:* semantic versioning, deprecate in a minor release, remove in the next major. Confirmed in item 4.1.
6. *Distribution:* a package is the source of truth. A copy-in registry is not offered at first, because copies drift.
7. *Error summary:* shown after a failed submit, with each field's message repeated word for word. An assumption to test.
8. *Checkout comprehension:* defined in `charter/checkout-slice.md`; measured by the steward's researcher.
9. *Steward and experiment owners:* see A-10.
10. *Testing that an agent followed the system:* the benchmark, the lints and the nightly scan. No surveyed system publishes a method.
11. *GitHub Primer's deprecation practice:* to be surveyed in item 4.1 before the policy is written.

### D-009. Digests and reports live in the repository

See A-02.
