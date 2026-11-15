# Agent test, 15 November 2026

Two runs. Each time a fresh Sonnet agent was allowed to read only AGENTS.md, the layout and pattern notes and the component notes, and was asked to build screens nobody had drawn: a list of six orders, account settings, and an empty and an error state. It wrote every file before running any check and saved the first output of the checks before fixing anything. The lead then ran the same checks itself.

| | Run 1 | Run 2, after the fixes |
|---|---|---|
| Screens built | 4 | 6 (it added a delete-confirmation page and a "just saved" page) |
| Lint findings on the first run | 0 | 0 |
| Screen-check findings on the first run, at 320, 375 and 1280 pixels, light and dark | 0 in 24 states | 0 in 36 states |
| Fixes needed to pass | none | none |
| Invented classes, options or styles | none | none |
| Model tokens | 112,142 | 118,834 |
| Places it said it guessed | 16 | 12, all smaller |
| The saved screens | `gates/raw/agent-test-run-1/` | `screens/agent-test/` |

## What run 1 got wrong, by the lead's eye, though no check failed

- "Being prepared", a state that lasts days, was shown with the turning "busy" mark, and "Cancelled" as a warning.
- Deleting an account was one press on a button, with no step to confirm.
- A message said "you have not been charged" on a page that could not know that.
- It had to guess where a status goes on a row that also has an amount, and where a row's own action goes.
- It used a link where the notes' own examples used a button that does nothing without script.

## What was changed in the system, not in its screens

A patterns note (empty list, failed load, saved page, an action that cannot be undone); the meaning of each status tone, with examples; one place for each part of a list row; links in every example that goes to another page; a visible heading for a group of checkboxes; a default for a choice that always has a value; dates with a year; and ten new checks, so that the rules AGENTS.md states are enforced (one primary action, forms and buttons that work without script, a label on every control, headings in order, no placeholders, text spilling out of a part, a second accent fill).

## What run 2 did differently

It showed "Being prepared", "On its way" and "Cancelled" as plain information and "Payment failed" as the only danger. It built the delete flow as a page of its own with the consequence stated. Its failed-load message claimed nothing about charges. It wrote the year on an order from last year. It put each part of an order row where the note says.

## What run 2 still had to guess, and what was done

- Whether a button in a stack should stretch: it should not. Fixed in the base styles and the layout note.
- Whether a select needs the `sv-field` element round it: said in the select note.
- Whether words inside an input need the "typed by a person" mark: they do not. Said in AGENTS.md.
- Not fixed, and listed for later: there is no navigation between pages; nothing says how page titles differ between the states of one page; nothing says what a settings page shows when a save fails on the server; no wording rule for a marketing opt-in.

## What this test cannot show

Both agents were the same model family as the builders, read notes written by that family, and were scored by checks the same night's work wrote. It shows the notes are enough for such an agent to build passing screens without inventing anything. It does not show the screens are right for people.
