# Souvenir design system: how to build a screen with it

Version 0.2, 15 November 2026. For anyone, person or AI agent, who builds a screen. It has had one review and has not been released to real users. If you are changing the system itself, read `briefs/v0.2-build-spec.md` instead.

## Read in this order

1. This file.
2. `docs/layout.md`: the page skeleton to copy, and the layout classes.
3. `docs/components/<name>.md` for each component you use. Each note has the markup to copy.

The notes are the contract. Do not read `src/` to work out how to use a part, and do not copy from another screen: copy from the notes.

## The rules

Each one is enforced by `npm run check`.

1. **A screen has no style of its own.** No `<style>`, no `style` attribute, no inline SVG. Only classes and elements that begin `sv-`.
2. **Never invent.** Use only the classes, options and values that a note or `docs/layout.md` names. If you need something that does not exist, do not make it up and do not fake it with something that looks close. Build the screen with what exists, and say in your report what was missing and what you used in its place.
3. **Text is ink.** You cannot colour text, and you do not need to.
4. **The accent marks the one action that commits.** A screen has at most one primary button: the action that pays, sends or changes something. Every other action is secondary or quiet.
5. **A status is never shown by colour alone.** Use a `message` or a `status` with a `data-tone`. The tone brings its own mark.
6. **Everything works without script.** A form is a real `<form>` with `method` and `action`. A link is an `<a>`. A button that submits is `type="submit"`.
7. **Every control has a visible label.** No placeholder used as a label.
8. **Headings go in order.** One `h1`, then `h2` for sections, then `h3`. Never choose a heading for its size.
9. **Words a person typed** go in an element with the attribute `data-user-content`, so that long strings can break.
10. **An amount is never text you styled.** A total goes in a `cost-summary`; an amount in a list goes in the list's trail.

## Which part for which job

| You need | Use | Note |
|---|---|---|
| A page, a section, a column of things, a row of things | `sv-page`, `sv-panel`, `sv-stack`, `sv-row` | `docs/layout.md` |
| A list of items, orders or settings, each with an optional amount, status or action at the end | `sv-list` | `docs/layout.md` |
| An action | button: `primary`, `secondary` or `quiet` | `docs/components/button.md` |
| Text entry, one line or several | field | `docs/components/field.md` |
| One choice from a short known list | select, inside a field | `docs/components/select.md` |
| A yes or no | checkbox | `docs/components/checkbox.md` |
| What something costs, ending in a total | cost-summary | `docs/components/cost-summary.md` |
| Every error on a form, after a failed submit | error-summary | `docs/components/error-summary.md` |
| To tell the person something about the page: it worked, it failed, be careful, for your information | message, with `data-tone` | `docs/components/message.md` |
| The state of one thing: an order, a task, a row | status, with `data-tone` | `docs/components/status.md` |
| One turn of a conversation with Souvenir | chat-message | `docs/components/chat-message.md` |
| Something Souvenir proposes to do, for the person to check and approve | proposal | `docs/components/proposal.md` |

**A list is empty:** replace it with an `info` message that says what will appear there and how to add it.

**Something failed and it is our fault:** a `danger` message that says what happened, what is safe, and what to do next. "We couldn't load your orders. Nothing has changed. Try again."

**Something a machine wrote:** a `warning` message beside it. "Drafted by Souvenir. Check it before you send."

## What does not exist yet

Tabs, a dialog, a toast, a table, a date picker, navigation, pagination, images, avatars, and any icon other than the marks that come with a tone. If your screen seems to need one, build it from what exists (a list in place of a table, a page in place of a dialog) and report the gap.

## Words

- Plain words, full sentences, no exclamation marks, no "please", no "sorry", no "oops".
- A button says what it does and to what: "Pay £60.75", "Save changes", "Cancel order". Not "Submit", not "OK". One-word labels are for Cancel, Close and Done only.
- An error says what to do, without blame: "Enter a postcode, like SW1A 1AA." Not "Invalid postcode".
- Our failures use "we" and say what is safe: "We couldn't reach the payment service. You have not been charged. Try again."
- Dates as "12 November". Amounts with their currency sign and two decimals: "£7.80".
- Never claim something happened unless it did, and never fake progress.

## Theme and accent

The theme follows the device. `?theme=light` or `?theme=dark` in the address fixes it, and `?accent=teal` swaps the accent from blue. You do nothing for either: the page skeleton handles them.

## Check your work

Save a screen in `screens/` and run:

```
node scripts/build.mjs
node scripts/lint.mjs
node scripts/check-screens.mjs --only <part of your file name>
```

The lint finds invented classes, invented option values and styles of your own. The screen check opens your page at 320, 375 and 1280 pixels wide, in light and dark, and measures contrast, text size, target size, focus rings, sideways scroll and broken words. It saves a screenshot of each to `digests/2026-11-15/screens/`. Look at them. A screen is done when both commands find nothing and the screenshots look intended at every width.
