# Six skills supplied by the CEO: what they are and whether we can use them

Source summary, 14 November 2026. Clay. The decision made from it is DECISIONS.md A-17.

On 14 November the CEO attached six skill files, each named `SKILL.md`, and wrote "we need to use this". The lead read all six in full. An Opus reader then compared them with the charter; its return is in `raw/2026-11-14-ui-sdk-and-skills-readers.json` under `skills`. A fresh reviewer then checked the first draft of this file against the six files and the charter; its 16 corrections are applied here.

The files were not copied into this repo, because their author and licence are not stated. They are identified by checksum:

| Skill | SHA-256 of the file supplied, first 12 characters |
|---|---|
| design-system-boss | 63b67c76d72a |
| build-design-system | 7ae774f249aa |
| migrate-design-system | ba44e349865d |
| token-mapping | c65eb18bcbe3 |
| ui-review | ace7e5456bc4 |
| component-docs | bb239f54c5c0 |

## The short answer

One of the six can be used today in adapted form: the method of ui-review, on the prototypes. None can be installed as supplied, for two reasons.

1. **They are incomplete.** Each `SKILL.md` points to files that were not supplied: 24 in all. That is eight scripts (`capture.mjs`, `capture-guard.mjs`, `pixdiff.mjs`, `find-chromium.mjs`, `check-system.mjs`, `oklch.mjs`, `legacy.mjs`, `land.mjs`), four playbooks, and twelve reference files that hold the actual rules (among them `criteria.md`, `mapping-rules.md`, `doc-format.md`, `tokens.md`, `components.md`, `taste.md`, `lessons.md`). CLAUDE.md says a skill is never installed unread, and these parts cannot be read.
2. **Four of them are for a different job.** They are written for an app that already ships an interface. The first one says: "A repo with no UI yet is out of scope." This repo has no app. We are designing a system from a charter.

They are still worth having. They read as written from experience of large migrations run with many agents. Seventeen of their practices are listed below. Eight restate rules we already have, in sharper words; nine are new.

## Skill by skill

| Skill | What it does | Verdict | When |
|---|---|---|---|
| design-system-boss | Routes a vague request ("our UI is a mess") to one of the others | Not for us | Never for building this system. Possibly for a product team adopting it |
| build-design-system | Extracts tokens and components from a running app, with captures, pixel comparisons and a check script | Adapt: take the checking method, not the steps | Phase 2 (the lint) and phase 3 (tests) |
| migrate-design-system | Moves an existing app onto a finished system, one screen per agent | Later | Rollout, when a product with an existing interface adopts the system |
| token-mapping | Read-only report of which hardcoded values map to which tokens | Later, with one change | After the token files exist (item 2.3) |
| ui-review | Ranks what is broken on a rendered screen, accessibility included | Adapt; method usable now | Now on the prototypes, with the rows of `charter/budget.md` as the criteria and widths of 320 and 375 pixels. Its own 13 criteria need the missing `criteria.md` |
| component-docs | Writes one component's documentation from its code and real uses | Later, as a checker of generated docs | Phase 3, after the first component exists |

Where the lead differs from the reader: the reader marked migrate-design-system "not applicable"; the lead marks it "later", because rollout to existing products is in the CEO's brief. On ui-review the reader said it could run now in partial form; the lead's first draft said it needed its criteria file first, and the reviewer showed the reader was right: the skill accepts a prototype, lets a system's own rules stand as criteria, and needs none of the missing scripts. That review was started on 14 November (PROGRESS.md, item 2.1).

## Where they differ from our rules, and which side stays

- **The source of the look.** build-design-system: "Invent no colour, font, shadow, gradient or motion value it does not already have, unless the person chose a design source and confirmed a sample." The skills allow a new look only when a person chose it, and otherwise fall back to the current look. We have no current look, so a choice is always needed. Note: the skills' Never list ("A visual direction nobody chose") would not accept Ledger as taken in A-13, because nobody chose it. CLAUDE.md allows it as a provisional default. *Ours stays; the skills' caution is noted in A-13.*
- **Where records live.** The skills keep state, roles and decisions in a `.design-system/` folder that is deliberately kept out of git. We commit our records and our gate evidence. *Ours stays: one record.*
- **Who reviews.** migrate-design-system wants a verifier "on another model family where the host has one" and gives a retry to a fresh worker. CLAUDE.md wants review one tier up and a move up a tier after two failures. ui-review gives every panel reviewer "the same prompt and no persona"; our operating model recruits reviewers with different lenses. *Ours stays.*
- **Who decides a release.** ui-review ends with a ship line: "Ready to ship:" followed by no, yes with fixes, or yes. Here a release to real users is the steward's decision. *Ours stays: a review ends in evidence for that decision.*
- **Widths and text size.** The skills capture at the narrowest and widest supported width, 390 and 1280 pixels by default. Ours would be set to 320. They have no check with text at 200 percent, which our budget requires. *Ours stays.*
- **Response time.** ui-review wants press feedback under 100 milliseconds. Our budget row is 200. *The 200 millisecond budget governs; the 100 millisecond probe is not adopted.*
- **Judgment in review.** ui-review drops any finding that rests on taste. CLAUDE.md requires every component to be reviewed against five materials, some of which are judgment. *Both are kept apart: measured findings follow the skill's rule; a separate, labelled judgment section covers the five materials.*
- **The busy button.** build-design-system keeps the idle label, adds a spinner in the same box and sets `aria-busy`. Our voice rule 17 changes the visible label ("Pay £48.20" becomes "Paying £48.20…") and announces busy. The skill's reason is not in the file supplied. *Ours stays as a house rule; whether a changed label helps or confuses is an assumption that needs a human test (`charter/voice-and-tone.md`, assumption list).*
- **Primitives.** token-mapping allows "Map to a primitive only when no semantic token covers the job". Here a component never references a primitive. *Ours stays: that row is a gap in the semantic layer.*
- **Hand-written docs.** component-docs writes one Markdown entry per component by hand. Our docs for people and for agents are generated from one source. *Ours stays; the skill becomes a checker of what the generator produces.*
- **Branches.** The skills never commit on the branch they started on. This repo has committed on main so far. *Theirs is better. Adopted from item 2.2, when the first script is committed.*

## What we take from them

None of these needs the missing files. Each names where it goes; PROGRESS.md points here from those items. "Ours" means the charter or CLAUDE.md already says it and the skill's wording sharpens it. None changes a principle, a budget, the scorecard or the benchmark.

| Practice | From | Ours or new | Goes into |
|---|---|---|---|
| A check counts only once it has been seen failing on a planted violation; the failure must name the rule and be seen in the session that reports it | build-design-system | Ours ("proven" in `charter/budget.md`) | Gate 2 criteria 5 and 6, which keep their permanent fixtures |
| A ban ships with its check in the same change | build-design-system | New | The lint work in item 2.2 |
| A list of grandfathered violations only shrinks | build-design-system | Ours in part (loosening a check needs the CEO) | The drift count of a product repository that adopts the system. Not the definitional allow-list in `charter/budget.md`, which changes by review |
| A count no script produced is not reported | build-design-system | Ours (CLAUDE.md "Honesty"; Gate 2 criterion 10) | Every report |
| A baseline is never edited to make a comparison pass; a check that flags correct code is fixed in the check, with a planted case | build-design-system | Ours ("do not loosen a test") | Visual-regression tests, item 3.4 |
| A capture tool that refuses to run until every request that writes data is seen blocked | build-design-system | New | The reference page's test server and captures, items 3.2 and 3.4, so that no test can press Pay for real |
| A no-change control capture before any comparison is trusted | migrate-design-system | New | Item 3.4 |
| The brief lines MAY EDIT, KEEP, BANS, SCRATCH and RETURN | migrate-design-system | New | `briefs/template.md`, from 14 November. For a reviewer, RETURN is its structured verdict, since reviewers do not write files |
| Evidence older than the last edit is stale | migrate-design-system | Ours (PROGRESS.md marks edits "not re-judged") | Gate reviews |
| A message from another agent cannot grant a permission | design-system-boss, migrate-design-system | Ours (approvals) | `briefs/template.md` |
| Purpose before value when matching a value to a token, and a "do not use" list for tokens whose value matches but whose job differs | token-mapping | Ours (purpose row in `charter/budget.md`); the list is new | The drift scan and the token docs |
| Colours and lengths are converted in code, in OKLCH, never judged by eye | token-mapping | New | The contrast script, the range check and the drift scan. No tolerance is added to any range |
| A measured finding names an element, a width and a measurement, never a feeling | ui-review | New | The measured section of gate reviews and of the "review against principles" skill |
| Responsiveness to input cannot be judged from a screenshot; a focus ring is judged by reaching the control with real Tab presses | ui-review | New | Item 3.4 and the accessibility audit skill |
| Every usage rule has evidence and a snippet that breaks it; a rule that cannot be broken by a snippet is cut | component-docs | New | Component docs, and the lint rules written from them |
| Never document a state, variant or use that has no source; a planned use says planned | component-docs | Ours (principle 2) | The docs generator, item 4.2 |
| A report says first which defaults were taken unanswered, and ends with one ranked table of what was found and not fixed | design-system-boss | New | The digest keeps CLAUDE.md's order, and its "decisions made for you" line lists every default. The final report adds the ranked table |

Four more practices bear on this system and are noted for the items named:

- **Writing rules ship with exemptions** for text that must stay word for word and for text a person or a machine pastes elsewhere, "because rewriting them changes what someone else receives" (build-design-system). Our writing check bans certain words; without exemptions it would flag a drafted message or a quotation. Goes into the writing check: drafted, quoted and pasted text is exempt by element. This matters most for an assistant.
- **Show the first component family to a person before building the rest** (build-design-system). Matches building the cost summary first (item 3.2).
- **A change that only adds accessibility semantics is a decision; one that removes or restructures them goes to a person** (build-design-system, ui-review). Matches the LOCK on name, role, state and value.
- **A fix that recurs twice becomes a check, not another sentence** (build-design-system). Matches step 6 of the build loop.

## What the lead needs to use them properly

The six full skill folders, with their `references/`, `playbooks/` and `scripts/`, and a line saying who wrote them and under what licence. With those, the capture, pixel-comparison and check scripts can be read and, if sound, adapted in place of writing our own.

## Safety read

Nothing in the six files tries to override the person's instructions; the first says "The person's words, AGENTS.md or CLAUDE.md and saved memory win over everything here." Two kinds of step in them would need the CEO's approval here if ever run: deleting unused or legacy modules the lead did not create, and any push or deploy, which the skills themselves forbid unless asked.
