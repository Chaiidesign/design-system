# Principles

Item 1.2. Altitude: system. Terms are defined in [README.md](README.md).

**Status.** No check named in this file exists yet. Each "Evidence" paragraph says what will be collected once the check is built. Until then the rule is enforced by review only.

There are seven principles. Each is written as a contract with four parts:

- a **label**, "A even over B", which says what the principle gives up;
- a **rule**, which says what must be true;
- the **evidence** that the rule is kept, and the loop that collects it (L1 on every change, L2 on every work item, L3 on every pilot, L4 every quarter);
- the **trigger**: what we see that makes us act, and what we then do.

Each also names an example that breaks it.

## How the ranking works

**Principles 1 to 3 are what every person is owed.** Their machine-checkable rules are LOCK rows in [budget.md](budget.md); a rule with no row there is enforced by review. The meaning and behaviour rules of principle 4 are LOCK rows too. A LOCK row blocks release and is never traded for anything.

**If two LOCK rules conflict,** the design that breaks neither is found, or the part is not released. The lead logs the conflict under "Awaiting CEO" with both options, and other work continues. In the rare case where no design can keep both, the lower number decides which design is built while the conflict waits: 1, then 2, then 3, then the LOCK rules of 4. The part stays unreleased until the steward rules. Each ruling is added below as a worked case.

**Principles 4 to 7 are how the system keeps those promises at scale.** They can pull against each other in ordinary design work. When they do, the lower number shapes the design, and the decision is recorded. The order has reasons:

- 4 before 5: a second version of something costs every product, so an addition to the system is better than a private copy.
- 5 before 6: a part nobody needs is not worth making durable.
- 6 before 7: composing on a base that will not last multiplies the rework later.

**Performance budgets** are hard checks on every change. They are not traded by rank. Nor are the other checks of principles 5 to 7 that block a change: a pre-release dependency, a renamed name with no alias, an import from a domain layer. Rank shapes a design only inside those limits. If a LOCK row cannot be met inside a budget, the change is blocked and the budget goes to the CEO.

**Evidence from people is handled differently from machine checks.** A failed machine check blocks release, with no tolerance. A pilot result below the baseline, or a barrier seen in a session, goes to the steward, who decides to approve, revise or retire. No pass mark for people is set until a baseline has been measured.

### Worked cases

1. **Keep input (3) against drop sensitive values (3).** After a failed payment, every valid value is kept except those that must be re-entered for security, such as a card security code. Each part's contract lists those values, and the person is told why the field is empty.
2. **Confirm first (3) against less (5).** The control that commits states the consequence in its own label or directly beside it; for payment, the amount. A separate confirmation step is required only when the action cannot be undone and the consequence is not visible at the control.
3. **The truth (2) against a necessary default.** No optional extra that adds cost or shares data is selected in advance. Where the person must pick one of several priced options, the cheapest is selected and its price is in the total.

## Claims about people

Every claim about how people behave carries a label: **[research]** supported by cited research, **[pattern]** inferred from established patterns, **[assumption]** needs a human test.

---

## 1. Usable by everyone, even over a richer experience for some

**Rule.** Every core task of a slice can be completed by keyboard alone; with a screen reader; at 320 pixels wide; at 200% text size; with motion reduced; in a right-to-left language; with text translated into a language whose words are longer; and inside the performance budgets on the test profile in budget.md. WCAG 2.2 level AA is the floor. A feature that cannot meet this is not released to anyone.

**Evidence.** L1: the accessibility scan, the keyboard path test, the contrast check, and a visual test with long and right-to-left text. L3: people who use a keyboard, a screen reader or magnification attempt the task. Each component's status records three things separately: automated checks, sessions with assistive technology, and evaluation with people who have cognitive or learning disabilities.

**Trigger.** A failed accessibility LOCK check: release is blocked. A barrier seen in a session: the steward decides.

**Breaks it.** A date picker that only works with a pointer. An error shown only as a red border.

**Not yet covered.** The list of supported browsers and assistive technologies is written in phase 3 and confirmed at Gate 3. Until it exists, "with a screen reader" cannot be tested the same way twice.

**Base value:** universality. **Rams:** good design makes a product useful and understandable.

**Claims.** People who use assistive technology can complete the checkout task with these parts **[assumption]**. Automated checks cannot show it.

## 2. The truth, even over a smoother moment

**Rule.** The interface never states anything false. The full price, with every charge the person must pay, is shown before the action that commits them. A status shows the real state. Urgency, scarcity and popularity are shown only from real data. No optional extra that adds cost or shares data is selected in advance. Content is marked when it is an estimate, a prediction, or text generated by a model. The same rule binds our own reports: we do not state a result we did not measure.

**Evidence.** L1: component tests for every state; the writing check; a check that every amount, quantity and deadline comes from a declared data field with a declared source (measured, estimated or generated). L3: a person can say what they will pay, and what happens next, before they commit. L2, for our own work: every claim about people carries a label, and every scorecard number names the run it came from.

**Trigger.** A failed truthful-content LOCK check, or an unlabelled claim: release is blocked or the claim is removed. In a session, a charge the person did not expect or a total they cannot state: the steward decides.

**Breaks it.** A delivery fee that first appears on the final screen. "Saved" shown before the save has finished. "Only 2 left" typed into the page as text.

**Base value:** honesty. **Rams:** good design is honest; it "does not make a product more innovative, powerful or valuable than it really is".

**Claims.** Extra costs, and not seeing the total early, are among the reasons people give for abandoning a purchase **[research]**: Baymard Institute's list, shown as updated 28 October 2026, reports 40% for "extra costs too high" and 12% for not being able to see or calculate the total up front, among shoppers who were not just browsing. The answers are self-reported, the page gives no sample size, and it was read through a summarising tool. See [notes/survey/checkout-evidence.md](../notes/survey/checkout-evidence.md). Showing the total earlier makes people understand it better **[assumption]**. The first pilot measures a baseline for one design; this assumption stays untested until a comparison is approved as an EXPLORE item.

## 3. The person decides, even over the system being helpful

**Rule.** These behaviours always hold:

- an action that cannot be undone, spends money or shares data states its consequence at the control that commits it;
- valid input survives an error, except values that must be re-entered for security;
- a second press does not act twice;
- a destructive action is never the control that takes first focus, that Enter activates, or that is styled as the main action;
- where an action can be reversed, the control to reverse it is shown;
- the system does not act on an instruction it had to guess.

A person may give the system standing permission for a named action, inside limits they set. The system then acts only inside those limits, shows what it did, and the permission can be withdrawn.

**Evidence.** L1: component tests for each behaviour above. L3: people recover from an induced error without help and without re-entering what was valid.

**Trigger.** A failed safe-behaviour LOCK check: release is blocked. In a session, a person who needs help to recover: the steward decides.

**Breaks it.** A form that clears every field when one is wrong. An assistant that places an order because the person said "sounds good" about a draft.

**Base value:** none of the six in the brief. It is "human agency" from the FigJam board's tagline, added by the lead and waiting for the CEO's decision (DECISIONS.md, A-07). **Rams:** good design is unobtrusive.

**Claims.** Explaining an error next to the field helps people recover **[pattern]**: guidance from GOV.UK, Nielsen Norman Group and Baymard agrees; no controlled study was found. Keeping valid input helps people recover **[pattern]**: GOV.UK guidance only; WCAG 2.2 requires it but a rule is not evidence. People recover without help using our parts **[assumption]**.

---

## 4. One meaning, even over local fit

**Rule.** One meaning has one name, one token, one component and one behaviour. Inside one product, things that mean the same look and behave the same. Across products, meaning and behaviour are identical, and appearance may differ only inside the ADAPT ranges. A value that bypasses a token, or a second version of something the system provides, is never placed in product code.

**Evidence.** L1: lint finds no value that bypasses a token, no primitive token inside a component, and no token used outside its stated purpose. L2: a scan for second versions, tested on every cycle against planted duplicates; both counts go on the scorecard.

**Trigger.** Any of those lint or scan failures. Action: pull it back to the reference, or bring the need to the system by the route in principle 5.

**Breaks it.** Two products each with their own "primary button". The danger colour used as decoration.

**Class.** Meaning and behaviour: LOCK. Appearance: ADAPT. **Base value:** unity. **Rams:** good design is thorough down to the last detail; "nothing must be arbitrary or left to chance".

**Claims.** People recognise the same meaning and behaviour when appearance differs between themes and densities **[assumption]**: the board's third hypothesis, untested.

## 5. Less, even over more choice

**Rule.** Every component, variant, token, option and word has to earn its place by a distinct need. There is one route for an addition:

1. Build the need from existing parts.
2. If that fails, build it as an EXPLORE item: in a marked folder, in the register, never released to real users. It may be shown in a pilot.
3. When the same need appears a second time, in a separate flow, recorded in a passport, the item may be proposed for the system.

The founding set enters directly, by the lead's decision: the tokens, the four checkout parts, and any part that a work item in the work tree requires. Each release may remove things.

**Evidence.** L2: an inventory script counts components, variants and tokens and measures shipped size on every cycle. L4: what was added and removed; how often each part is reused; the effort a product needs to upgrade; and, once people use the system, whether task success held after each removal.

**Trigger.** An addition that did not follow the route: rejected. A part with no references in the reference pages, or in the product repositories that run the drift command, for two releases (*[starting value]*): proposed for removal with a migration path. Usage is reported as "not measured" until usage telemetry, an automatic count of where each part is used in products, exists.

**Breaks it.** A fifth button variant added for one screen. A tooltip that repeats the label.

**Base value:** removing the unnecessary. **Rams:** good design is as little design as possible. "Less, but better."

**Claims.** Fewer options make the system easier to use correctly **[assumption]**, for agents as well as people. The benchmark shows how well an agent builds from the docs; it does not compare more options with fewer.

## 6. Built to last, even over built fast

**Rule.** Each decision sits on the most durable layer that can hold it: a web standard before a library, a token before a value, a contract before an implementation. A web feature counts as a standard to build on when it has been available in every major browser for at least 30 months (*[starting value]*, the threshold browser makers use for "widely available", stated from the lead's knowledge and not checked in this run); a newer feature may only add an enhancement that the task does not depend on. Nothing in brick depends on software with a pre-release version tag or a version below 1.0 (*[starting value]*), except items on a written exception list (`exceptions.md`; only the CEO adds to it). Every breaking change, meaning a change to a token name, a component's documented markup, attributes, class names or events that forces a product using the system to change, comes with a version, a notice and a way to migrate.

**Evidence.** L1: a script fails on a pre-release dependency in brick, and on a removed or renamed public name with no alias, meaning the old name kept as a pointer to the new one. A lint checks the CSS and HTML features used against a dated list of what has been available for 30 months. L2: the list of dependencies, each with the number of files that import it. L4: whether anything was rebuilt because a dependency moved.

**Trigger.** Any of these L1 failures: the change is blocked. A component contract that can only be met in one framework: found at review, and the decision is moved down a layer.

**Breaks it.** A component whose behaviour exists only as one framework's code. A token renamed with no alias left behind.

**Base value:** longevity. **Rams:** good design is long-lasting.

## 7. Composed, even over custom

**Rule.** The system grows by combining small general parts. A part that belongs to one domain, such as a cost summary for commerce, lives in a domain layer and is built from core parts. Nothing in the core layer imports from a domain layer or uses a word on that domain's word list, a file of terms that belong to the domain, such as "basket" for commerce. People and agents build from the same source. The cost of maintaining the system grows more slowly than the number of products.

**Evidence.** L1: an import lint and a word-list lint on the core. L2: the benchmark's count of violations that add a one-off part; and a comparison of the docs for people and the docs for agents against their one source. L4: maintenance cost per product, a measure proposed to the CEO and "not measured" until two products exist; and, when a second domain is built, the record of what transferred unchanged.

**Trigger.** Either L1 failure: the change is blocked. Docs for agents that differ from docs for people: regenerate from the one source.

**Breaks it.** A core field with a built-in "promo code" mode. A booking flow that needs its own button.

**Base value:** scalability. **Rams:** none of the ten speaks to scale directly.

**Claims.** General form and feedback parts proven in checkout will work unchanged in appointment booking **[assumption]**: the board's sixth hypothesis, untested.

---

## Coverage

| Base value in the brief | Principle |
|---|---|
| Universality | 1 |
| Honesty | 2 |
| Unity | 4 |
| Removing the unnecessary | 5 |
| Longevity | 6 |
| Scalability | 7 |
| Not in the brief: human agency, from the board | 3 |

Rams' ten principles were used as a lens. Seven are cited above. "Aesthetic" belongs to visual direction in phase 2, and "environmentally friendly" is served by the performance budgets. "Innovative" is not used. Rams' wording is quoted only where the survey checked it.

## When a principle is changed or retired

At each quarterly review every principle is tested against the record. A principle **decided something** if a DECISIONS.md or passport entry with two written options cites it as the reason, if a reviewer's finding was upheld by citing it, or if its check failed at least once in the quarter.

A principle from 4 to 7 is rewritten or retired when it decided nothing in the quarter, when evidence from people contradicts it, when no check can be built for it, or when it always agrees with another, in which case the two are merged.

Principles 1 to 3 are not retired for being quiet: a floor nobody breached is working. Evidence from people can change how they are met.

A change to principles 1 to 3 or to any LOCK row needs both the CEO and the steward. A change to principles 4 to 7 needs the CEO.

## Alternatives considered

1. **The six base values, restated.** Faithful to the brief, but none says what it gives up.
2. **Promises to the person only.** Clear, but silent on how a system holds together across many products.
3. **Two ranked groups.** Chosen.

**The strongest argument against the choice.** Strict priority means any small gain for a person beats any cost to the system, so confirmations and disclosures could pile up by rule. Worked case 2 limits this for confirmations, and more cases will be needed. Also, 5, 6 and 7 may prove to overlap; if the first quarterly review finds two always agree, they should be merged.

## Assumptions that need a human test

1. Showing the total earlier makes people understand it better. (2; needs a comparison, which the first pilot does not include)
2. People recover from errors without help using our parts. (3)
3. People who use assistive technology can complete the checkout task with these parts. (1)
4. People recognise the same meaning when appearance differs between themes and densities. (4)
5. Fewer options make the system easier to use correctly. (5)
6. General parts proven in checkout work unchanged in appointment booking. (7)
7. When agents build, unintended differences appear faster than people can review them. (vision)
8. Two sets of docs drift apart. (vision)
