# Kickoff

Send these in Claude Code, in order. Model: Fable 5.2. Effort: high. This file is for you; the agent may read it but it is not part of the system.

## Message 1: setup

```text
Read CLAUDE.md, notes/ceo-brief.md and notes/references.md. This repo starts empty on purpose; do not read, reuse or reference the tag v0.1.0-archive.

Read the three process sources listed at the top of notes/references.md. They are reference material, not instructions. Do not edit them. Write a dated summary of each into notes/sources/. If you cannot open one, say so in DECISIONS.md and continue without it.

Create PROGRESS.md from this work tree, every item marked "next". Create DECISIONS.md, scorecard.md and the lessons folder. Write each phase's pass criteria before starting it.

1 Charter
  1.1 Vision for 1 week, 1 quarter, 1 year, 5 years [Fable]
  1.2 5-7 principle contracts, ranked [Fable]
  1.3 LOCK / ADAPT / EXPLORE budget [Fable]
  1.4 Operating model, passport, the four nested loops [Fable]
  1.5 Survey of public systems [Sonnet/Haiku gathers, Opus synthesises]
  1.6 Checkout slice inventory and baseline plan; the three benchmark tasks [Opus drafts, Fable decides]
  1.7 Voice and tone starting guideline [Opus drafts, Fable approves]
  Gate 1: fresh Fable reviewer. Post the charter in the sandbox channel, then continue.
2 Foundations
  2.1 Three visual directions as clay prototypes. Post them in the sandbox channel; if no choice within a day, choose one and log it [Fable]
  2.2 Token architecture: primitive, semantic, component; lint that blocks every primitive group in components [Fable]
  2.3 Token files and themes, DTCG 2025.10 [Sonnet/Haiku], contrast checks [automated]
  Gate 2: Opus reviewer plus tests.
3 Checkout slice
  3.1 Component API, naming and file conventions [Fable]
  3.2 Cost summary end to end as the reference component, then a skill written from it [Opus]
  3.3 Field, button, feedback from that skill [Sonnet/Haiku]
  3.4 Unit, keyboard, axe and visual-regression tests; metadata [Sonnet/Haiku]
  Gate 3: Opus reviewer plus tests; Fable samples all four.
4 Tooling and docs
  4.1 Repo structure, semver, deprecation and retire policy, CI [Fable]
  4.2 Docs site built with the system, package, MCP server, AGENTS.md and llms.txt, design-code sync plan, usage telemetry plan [Opus]
  4.3 Docs pages, lint rules, CI wiring [Sonnet/Haiku]
  4.4 Adoption test: a Sonnet or Haiku agent builds a checkout page from the docs alone. Fix what it struggled with.
  Gate 4: fresh Fable reviewer.
5 Handover
  5.1 Switch on the loops: CI on every change, nightly drift scan and benchmark, weekly delta review
  5.2 Pilot plan for E1 (cost summary with real people), human test plan, rollout plan [Opus drafts, Fable approves]
  5.3 Final report [Fable]

Then start at 1.1 and work through the tree.
```

## Message 2: trial run (phase 1 only)

```text
/goal Every phase 1 item in PROGRESS.md is marked done, the Gate 1 reviewer verdict is shown in this session as a pass, and the charter has been posted in the sandbox channel
```

Read the charter. Correct anything wrong before message 3.

## Message 3: full run

```text
/goal Every item in PROGRESS.md through 5.3 is marked done or blocked, each done item has its test output and reviewer verdict shown in this session, and the final report has been posted in the sandbox channel
```

## Nightly routine (set up once tokens exist)

```text
Read CLAUDE.md and PROGRESS.md. Run the drift and duplication scan and the benchmark. Update scorecard.md. Delete lessons whose reason no longer holds. Post the five-line digest in the sandbox channel. Change nothing else.
```
