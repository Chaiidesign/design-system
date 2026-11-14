# Benchmark

Item 1.6, part two. Altitude: system. Drafted by Opus 5.5; revised and decided by the lead on 13 November 2026. The tasks become fixed when Gate 1 passes. From then, only the CEO can change them.

## What the benchmark is for and what it cannot show

Three fixed tasks, rerun every build cycle, show whether a less capable agent with only the published docs and package builds a correct checkout page. A falling score points at the docs, package or lint rules to fix (loop L2).

It says nothing about real people: a passing page may still confuse a shopper **[assumption]**. Only pilots (L3) show that.

## Fixed conditions

- **Model:** Sonnet 5.5, identifier `claude-sonnet-5-5`. Each run records the identifier; a new one means a new baseline.
- **Context:** each run starts fresh; tasks do not chain.
- **Given:** the prompt, the published docs and package, an empty folder, a shell and a browser. No network.
- **Not given:** the system's source, past outputs, other interface libraries, human help. Any question gets: "No more information. Use the published docs."
- **Limit:** 80 tool calls or 30 minutes, whichever comes first. Whatever exists at the limit is scored item by item. Reaching the limit does not by itself fail any item.
- **Runs:** five per task. Identical runs differ, so one run cannot separate a change from chance.
- **Tool call:** each invocation logged, failed and parallel ones included.
- **Viewing:** served locally; checks use a 375 by 812 pixel viewport unless stated.
- **"Fill valid":** the scorer types the valid customer values below into the matching fields.

Five runs, 80 tool calls and 30 minutes are *[starting values]*, checked against the spread of the first baseline.

## Fixed order data

Each prompt includes this block where it says [ORDER DATA].

```
Store: Fernhill Supply. Currency: US dollars (USD), two decimal places.
Items:
1. "Organic cotton waffle-weave bath towel, extra large, undyed natural oatmeal": quantity 2, unit price 24.50
2. "抹茶セット": quantity 1, unit price 18.75
3. "Soap": quantity 3, unit price 3.25
Discount: "Welcome discount", 5.00 off the item subtotal.
Sales tax: 8% of (subtotal minus discount), calculated by the store as 5.80. Delivery is not taxed.
Delivery: standard, 3.95. No other option.
Valid customer: email sam@example.com; full name Ana María Núñez-O'Brien;
phone +1 (415) 555-0136 (optional); address line 1 1200 NW Naito Pkwy;
address line 2 Apt 4B (optional); city Portland; state OR; ZIP code 97209;
country United States.
```

Line totals 49.00, 18.75 and 9.75. Item subtotal **77.50**; minus the discount, 72.50; plus tax 5.80 and delivery 3.95, **total 82.25**. Nothing rounds. An amount matches if it shows "$" or "USD" with these exact digits; the discount may use a hyphen or a minus sign.

## How items are tagged

Each checklist item ends with a tag. A tag that names a table in [budget.md](budget.md) (Accessibility, Truthful content, Safe behaviour) means the item checks a LOCK row in that table, and a failure is a LOCK breach. A tag that names a principle (P2, P3, P4, P5, P6, P7) or ADAPT means the item checks that principle or range, and a failure is not a LOCK breach. The rows of the Meaning table are checked by the count of values that bypass the system, under Scoring.

## Task 1: build

```
Build a mobile checkout page using only the published docs and the published package.
The page must open at index.html in your working folder.
Show the order below with each line item, its quantity and line total, and a cost
summary with the item subtotal, discount, sales tax, delivery and total.
Collect contact details (email; phone, optional) and the delivery address.
End with one pay action. There is no real payment service: when pay is used with
valid details, wait 2 seconds, write PAYMENT ATTEMPT to the browser console, then
show that the order is paid.
Payment always succeeds in this task.
[ORDER DATA]
```

- 1.1 All three item names appear in full, character for character. (P2)
- 1.2 Line totals 49.00, 18.75 and 9.75 appear beside their items. (Truthful content)
- 1.3 The item subtotal, discount, tax, delivery and total each appear, labelled, with the expected amounts. (Truthful content)
- 1.4 82.25 appears in the pay control's label or directly beside the control. (Safe behaviour)
- 1.5 Every field has a visible label that stays when filled and is its accessible name. (Accessibility)
- 1.6 Email, name, phone and address fields declare their autofill purpose. (Accessibility)
- 1.7 The accessibility scan reports zero failures on load. (Accessibility)
- 1.8 By keyboard alone, every field and the pay control are reached in visual order with visible focus, and pay works after "fill valid". (Accessibility)
- 1.9 At 320 pixels nothing scrolls sideways; at 200% text nothing clips or overlaps. (Accessibility)
- 1.10 "Fill valid", then press pay twice within 100 milliseconds: the console shows exactly one PAYMENT ATTEMPT. (Safe behaviour)
- 1.11 During the wait, text says payment is in progress, exposed as a status message; "paid" appears only afterwards. (Truthful content)
- 1.12 No optional extra that adds cost or shares data is selected on load. (Truthful content)
- 1.13 With script off, all items, amounts, labels and fields are present. (P6)
- 1.14 Fields, pay control, messages and cost summary use the package's parts as documented, not local replacements. (P4)

## Task 2: recover

```
Build a mobile checkout page using only the published docs and the published package.
The page must open at index.html in your working folder.
Show the order below with each line item, its quantity and line total, and a cost
summary with the item subtotal, discount, sales tax, delivery and total.
Collect contact details (email; phone, optional) and the delivery address.
End with one pay action. There is no real payment service: when pay is used with
valid details, wait 2 seconds and write PAYMENT ATTEMPT to the browser console.
The first payment attempt with valid details is declined after the wait. The second
succeeds, and the page then shows that the order is paid.
Handle these entries: email "sam.example.com", address line 1 empty, ZIP code "9720",
other fields valid. Accept the name and phone exactly as given below. Identify each
error, keep everything the person entered, and let them recover.
[ORDER DATA]
```

Scorer sequence: (A) fill valid, enter those three values, press pay; (B) correct the three fields and press pay; (C) after the decline, press pay.

- 2.1 After A, no PAYMENT ATTEMPT is logged. (P3)
- 2.2 After A, only email, address line 1 and ZIP code show errors. (Accessibility)
- 2.3 Each error is text beside its field saying what to enter, not only that it is wrong. (Accessibility)
- 2.4 Each error is its field's accessible description, and the field is exposed as invalid. (Accessibility)
- 2.5 After A, every error can be reached by keyboard, and focus has moved to the first error or to a summary of the errors. (Accessibility)
- 2.6 After A, every field keeps what was typed, wrong values included. (P3)
- 2.7 After B, no error remains. (Truthful content)
- 2.8 After B, text says the payment did not go through and what to do next; nothing says "paid". (Truthful content)
- 2.9 The decline message is exposed as a status or alert, or receives focus. (Accessibility)
- 2.10 After B, every field keeps its value and the total still reads 82.25. (Safe behaviour)
- 2.11 C needs no re-entry, logs a second PAYMENT ATTEMPT, then shows the order paid. (Accessibility)
- 2.12 A to C can be done by keyboard alone. (Accessibility)
- 2.13 The accessibility scan reports zero failures after A and after B. (Accessibility)

## Task 3: adapt

```
Build a mobile checkout page using only the published docs and the published package.
The page must open at index.html in your working folder.
Show the order below with each line item, its quantity and line total, and a cost
summary with the item subtotal, discount, sales tax, delivery and total.
Collect contact details (email; phone, optional) and the delivery address.
End with one pay action. There is no real payment service: when pay is used with
valid details, wait 2 seconds, write PAYMENT ATTEMPT to the browser console, then
show that the order is paid.
Deliver it for a second brand: store name "Brightwater Goods", brand colour #0F6E6E,
square corners. The page follows the person's light or dark setting and uses compact
density. Apply the brand only in the way the published docs describe, in one place.
Use no other colour, size, spacing, corner or timing value from outside the system.
[ORDER DATA, with "Fernhill Supply" replaced by "Brightwater Goods"]
```

The prompt gives the brand as one colour, as a brand would. How that colour becomes a setting inside the system's accent range is for the docs to say.

- 3.1 "Brightwater Goods" is shown, and the brand is set in exactly one place in the agent's files, in the form the docs describe. (P4)
- 3.2 The count of values that bypass the system (see Scoring) is zero. (P4)
- 3.3 In light mode, the pay control's colour has the hue of the brand colour, within 10 degrees in OKLCH. (ADAPT)
- 3.4 When the scorer resets the brand to a purple (#6B3FA0) in that one place, the pay control's hue follows and the error and success colours do not change. (P4)
- 3.5 Light mode: the accessibility scan, including contrast, reports zero failures. (Accessibility)
- 3.6 With the dark preference set, the background is darker than the body text. (P4)
- 3.7 Dark mode: the scan, including contrast, reports zero failures. (Accessibility)
- 3.8 Dark mode: focus on every control is visible, at least 3 to 1 against its surroundings. (Accessibility)
- 3.9 Density is set as the docs describe; switching it to default makes the page taller. (ADAPT)
- 3.10 Compact, with touch emulation: every target is at least 24 by 24 pixels. (Accessibility)
- 3.11 Compact, with touch emulation: the pay control is at least 44 pixels tall. (ADAPT)
- 3.12 Compact at 320 pixels and at 200% text: no sideways scroll, clipping or overlap. (Accessibility)
- 3.13 Fields and pay control have square corners, set once for the whole page. (ADAPT)
- 3.14 Dark mode, pay pressed with all fields empty: each error is shown in text beside its field. (Accessibility)

## Scoring

**Completion:** items passed over items in the task, per run; overall, items passed over all 41.

**Violations,** per run, in four categories:

1. *Values that bypass the system:* in files the agent wrote (not copies of package files), a script counts each colour literal (hex, rgb, hsl, oklch or named) and each number with a length or time unit. Exempt: 0, auto, inherit, currentColor, transparent, percentages, and in Task 3 the one brand setting.
2. *Accessibility scan failures:* distinct rule-and-element pairs across all scanned states.
3. *LOCK breaches:* each failed item whose tag names a budget.md table.
4. *Budget breaches:* each byte or script budget the page exceeds.

Among categories 1, 2 and 4, a defect counts once, in the first that covers it. LOCK breaches are tallied separately, so a defect may also appear there.

**Scorecard:** per cycle, completion per task and overall, violations by category, LOCK breaches on their own line, and tool calls. Each is the median of five runs with its range, naming the run date and the model. LOCK breaches also show how many runs had any, and are never averaged away. No statistical significance is claimed.

**Disagreement:** an item two scorers disagree on is failed, and its wording goes to the lead.

## How the baseline is taken

The baseline is the first complete fifteen runs after the published docs and package exist (phase 4). Until then the scorecard says "no data yet". It is retaken only when the model changes; history is kept.

## The lead's decisions, 13 November 2026

1. **Model.** Sonnet 5.5, as above.
2. **The pay label.** The total in the pay control's label, or directly beside it, meets the safe-behaviour row. See worked case 2 in [principles.md](principles.md).
3. **Lab timing budgets** are left out of the violation count until the lab setup is fixed in phase 4.
4. **Scanner.** axe-core, at the version installed in phase 3, recorded with each run.
5. **Which budgets apply.** The byte budgets in [budget.md](budget.md) apply to the agent-built page. The rule that the core tasks need no script does not apply to the simulated payment, which stands in for a server: that script is exempt by name, and item 1.13 still checks that the content is present with script off.
6. **Task 3 was rewritten before the gate.** The first draft gave two exact accent colours and tested by swapping in black. budget.md lets a product change only the accent's hue, so the task now gives one brand colour and tests the hue.
