# Vision notes

Supports [vision.md](vision.md). Altitude: system.

## Why this is needed now

Souvenir's interfaces are built by people and by AI agents. When agents build, differences that nobody decided on can appear faster than people can review them **[assumption]**: we have no measured rate, and the drift count on the scorecard will give one.

Three things matter more when agents build:

1. **Promises a machine can check.** Each promise is written as a contract, and each contract names the check that will be built for it. No check exists yet.
2. **One source for people and agents.** Two sets of docs are likely to drift apart **[assumption]**.
3. **Correction by evidence from people.** Agents can check contrast and keyboard paths. They cannot tell us whether a person understood the total before paying.

## What the system is not

- Not an ecommerce kit. Ecommerce is where it is tested first.
- Not a visual style to admire. Appearance may vary inside written ranges. Meaning and behaviour may not.
- Not meant to stay a plan. Today it is a charter and nothing else. The aim is working software and working guidance, checked on every change.

## Horizon checks

A check marked *needs people* cannot be met by the lead agent alone. It needs a named steward, and usually participants. These are the resources the lead needs from the CEO.

**1 day (by 14 November 2026)**
- Every charter file has had a fresh-context review, and the verdict is in the repository.
- Every conflict and every unfilled placeholder is logged under "Awaiting CEO".
- Nothing has reached a real user.

**1 week (by 20 November 2026)**
- Tokens exist in three layers, in light, dark and increased-contrast themes, and every declared text and background pair passes its contrast check.
- The four checkout parts pass their unit, keyboard, accessibility-scan and visual tests.
- One source generates the docs for people and the docs for agents.
- The benchmark has a first measured score.
- Every LOCK row has a check, and the record shows which checks have caught a deliberately planted breach.

**1 quarter (by 13 February 2027)**
- The cost summary has been tested with people against a baseline measured first, and the steward has decided to approve, revise or retire it. *Needs people.*
- The four core parts have been used to build a second flow outside checkout, with a record of what transferred unchanged.
- The first review of what could be removed has been held and its result recorded, even if nothing was removed.
- The benchmark has held or improved at every release.
- The human review queue has received votes. *Needs people.*

**1 year (by 13 November 2027)**
- At least three products use the system, and none contains a value that bypasses the tokens.
- The cost of maintaining the system, per product, is lower with three products than with one. This measure is proposed in DECISIONS.md and is "not measured" until two products exist.
- The same token source produces output for the web and for one other platform.
- A person or agent outside the core team has had a change accepted through the passport. *Needs people.*
- The principles have been reviewed four times against evidence. *Needs people.*
- Ecommerce parts sit in their own layer, and one other domain has its own layer on the same core layer.

**5 years (by 13 November 2031)**
- At least one framework, build tool or model has been replaced without changing a principle's rule or a token name.
- Most changes are proposed by agents and decided inside the written ranges. Whether agents may decide without a person once real users are affected is an open question for the CEO.
- People decide what real users receive, what the promises are, and what is worth exploring.
- The count of components and variants has gone down in at least one year.

## Is the vision useful?

At each quarterly review, two questions are asked of the record in DECISIONS.md:

1. Was the vision cited as the reason for at least one decision that had two written options? If everyone followed the vision and nothing was contested, that counts as working, not as failing.
2. Did we build anything that falls outside it and that we would build again? If yes, the vision is rewritten.

## The strongest argument against the north star

It describes agreement with rules the system wrote for itself. Every surface could keep all seven promises while people still fail at their tasks. The last bullet under the north star is there to answer this, but it only has force once people are involved, and today they are not.
