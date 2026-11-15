# Voice and tone

Item 1.7. Altitude: patterns and details. Drafted by Opus 5.5; approved by the lead on 13 November 2026 with the changes in the last section. A starting guideline, expected to mature. No person has read it yet.

This file governs every word in the interface: labels, hints, errors, statuses, confirmations, empty states, and how machine-made or uncertain content is marked. **Voice** is who Souvenir is, and never changes. **Tone** is how that voice adjusts to the moment. Claims about people carry [research], [pattern] or [assumption], as in [principles.md](principles.md).

## Voice

| Trait | What it means | This, not that | Serves |
|---|---|---|---|
| Plain | Common words, short sentences, one idea per sentence. | "Enter your email address", not "Provide a valid electronic mail identifier" | 1. Usable by everyone |
| Exact | Says only what the system knows, with the real number, state or cause. | "Payment failed. You have not been charged.", not "Something went wrong" | 2. The truth |
| Steady | The same calm words for the same thing, in good moments and bad. | "Order placed", not "Woohoo, you're all set!" | 4. One meaning |
| Respectful | Explains and offers; the person decides. | "Keep order" / "Cancel order", not "No thanks, I don't want my stuff" | 3. The person decides |

## What we steer away from

- **Cheer or jokes.** "Oops! Our bad"
- **Pressure or guilt.** "Hurry, only 2 left!" when that is not known; "No thanks, I like paying more."
- **Blame.** "You entered the wrong code."
- **Vagueness.** "An error occurred."
- **Padding.** "Please kindly note that…"
- **Jargon.** "Invalid input", "CVV", "Error 402".
- **Pretending to be human.** "I totally get how you feel."

## Tone by situation

| Situation | What the person is likely feeling | How tone shifts | Example |
|---|---|---|---|
| Routine action | Focused on the task [assumption] | Shortest form. Verb first. | "Continue to delivery" |
| Waiting | Unsure whether it is working [assumption] | Say what is happening. Never fake progress. | "Paying £48.20…" |
| Success | Wants confirmation and the next step [pattern: GOV.UK confirmation pages give a reference and what happens next] | Plain fact, then what happens next. No celebration. | "Order placed. Receipt sent to sam@example.com." |
| A mistake the person made | Frustrated if blamed [assumption] | Name the field, give the fix. No blame. | "Enter an email address with an @, like name@example.com." |
| A failure that is our fault | Worried about money or lost work [assumption] | Own it with "we". Say what is safe and what to do. | "We couldn't reach the payment service. You have not been charged. Try again." |
| Money and commitment | Wary of extra costs [pattern: inferred from Baymard's list of reasons people give for abandoning a purchase, shown as updated 28 October 2026, where 40% of shoppers who were not just browsing gave "extra costs too high"] | Every amount visible. Name the commitment on the button. | "Pay £48.20" |
| Irreversible action | Cautious [assumption] | Slow down. State the consequence and that it cannot be undone. | "Delete saved card? This can't be undone." |
| Machine-made or uncertain content | May trust it more than is warranted [assumption] | Say who made it and how sure it is, in words. | "Drafted by Souvenir. Check it before you send." |
| Bad news | Disappointed [assumption] | Direct first, then the best next option. No softening that hides the fact. | "This item is out of stock. Remove it to continue." |

## Rules a reviewer can check

All 17 rules bind every product. A rule tagged LOCK blocks release, and changing it needs both the CEO and the steward. A rule tagged "house rule" is changed by the lead, with a review. Neither tag is a range a product may vary. Limits marked *starting value* were set by the lead, not by research.

1. **Sentence case** for every string, including buttons and headings. Proper nouns keep their capitals. Messages end with a full stop; labels, hints and buttons do not. (house rule)
2. **Button labels are verb plus object**: "Save address", "Pay £48.20". One-word verbs are allowed only for Cancel, Close and Done. Never "OK", "Yes", "No" or "Submit". (LOCK: a label says what the control does)
3. **An error says what to do. If the cause is not obvious from that, it also says what happened**, in text, next to the problem. (LOCK; budget.md, accessibility: errors are identified in text)
4. **One error, one wording.** The message beside the field and in any summary is the same, word for word. [pattern: GOV.UK error summary] (house rule)
5. **No blame.** The subject of an error is the field or the thing, not "you" doing something wrong. (house rule)
6. **Banned words**: "please", "sorry", "oops", "invalid", "valid", "error occurred", "something went wrong" (without a cause), "simply", "just", "easy", "click here"; and abbreviations or trade jargon a shopper would not say, such as "S&H" or "promo". [pattern: GOV.UK's error message guidance and Apple's writing guidance] (house rule)
7. **No exclamation marks.** (house rule)
8. **"We" only for what Souvenir did or failed to do**, never in an error about the person's input. (house rule)
9. **Numbers are digits**: "3 items". Money shows the currency and the exact amount from the locale's formatter, never rounded. Dates name the month in words; a relative date ("tomorrow") also gives the date. Formats come from the locale, never built by hand. (LOCK for money)
10. **Plain words.** Sentences of at most 20 words (*starting value*). Aim for US grade 7 or lower [pattern: Polaris content guidance]. Judge by sentence length and word choice; readability formulas are unreliable on short strings. (house rule)
11. **Length limits** (*starting values*): labels and buttons at most 4 words plus any amount; a hint one sentence; an error at most 2 sentences, or 3 for a failure on our side; any other message at most 3 sentences. Layout must not depend on these limits, because translated text is often longer [pattern]. (house rule)
12. **Never state what the system does not know to be true.** "Saved" appears only after the save succeeds; "not charged" only when that is confirmed; no stock or time claims without data. (LOCK)
13. **Mark machine-made or uncertain content in text**, at the start, naming who made it ("Drafted by Souvenir", "Suggested by Souvenir"), and say what the person should check. Not by icon or colour alone. Never show a confidence figure the system has not measured. (LOCK)
14. **Survives translation.** No idioms, puns or slang. Never join fragments into a sentence; each sentence is one string with named placeholders ("{count} items"), and plurals use the locale's plural rules, never "item(s)". (house rule)
15. **Consequences before commitment.** A confirmation names the action in its title, states the consequence, and says if it cannot be undone. Its buttons repeat the action ("Cancel order" / "Keep order"). (LOCK)
16. **One word per meaning.** Do not switch between synonyms ("delivery", "shipping") within a product. (LOCK, principle 4)
17. **Loading and done states** reuse the button's verb and keep any amount: "Pay £48.20" → "Paying £48.20…" → the confirmed result. Ellipsis only on loading states. Rule 2 applies to the resting label. (house rule)

## Examples for the checkout slice

Amounts are illustrative. The reference page's fixtures are listed in [checkout-slice.md](checkout-slice.md).

**Field: email address**

| Part | This | Not this | Rule |
|---|---|---|---|
| Label | Email address | E-mail: | 1 |
| Hint | We'll send your receipt here | Please enter a valid email | 6 |
| Error: empty | Enter your email address. | This field is required | 3 |
| Error: no @ | Enter an email address with an @, like name@example.com. | Invalid email | 3, 6 |
| Error: has a space | Remove the space from the email address. | You typed a space | 5 |

**Button**

| Part | This | Not this | Rule |
|---|---|---|---|
| Label | Continue to delivery | Next step! | 2, 7 |
| Label | Apply code | Go | 2 |
| Label | Pay £48.20 | Submit | 2 |
| Loading | Paying £48.20… | Please wait | 6, 17 |
| Done | Payment received (only after the payment service confirms) | Success | 12 |

**Feedback**

| Kind | This | Not this | Rule |
|---|---|---|---|
| Success | Order placed. Receipt sent to sam@example.com. | Yay! You did it! | 7 |
| Our failure | We couldn't reach the payment service. You have not been charged. Try again. | Oops, something went wrong | 3, 6 |
| Our failure, outcome unknown | We don't know yet if your payment went through. Check your bank before you pay again. | Payment failed, try again | 12 |
| Their side | Your payment was declined. Try another payment method, or contact your bank. | Your payment is invalid | 5, 6 |
| Warning | Delivery cost is added after you enter your postcode. | Additional fees may apply | 12 |

**Cost summary**

| Part | This | Not this | Rule |
|---|---|---|---|
| Line labels | Items · Discount · Delivery · Tax · Total | Sub-total · S&H · Promo · Grand total | 6, 16 |
| Unknown delivery | Delivery: not known yet. Enter your postcode to see it. | Delivery: Free* | 12 |
| Total | Total £48.20, or "Total so far £44.21" while a charge is unknown | Total from £44.21 | 9, 12 |
| Price change | Delivery changed from £3.99 to £4.99 for this address. New total £49.20. Check it before you pay. | Total updated | 12, 15 |

An unknown charge may appear only before the step that commits the person to pay; a "Pay" button never shows a total that is not final. If a charge cannot be calculated, say how it will be worked out [pattern: UK DMCC Act 2024 s.230]. After a price change, the person confirms again (principle 3).

## How this guideline improves

| Loop ([operating-model.md](operating-model.md)) | What is observed | What triggers a change |
|---|---|---|
| L1 Change loop | The writing check: banned words, case, length, and an error in text beside each field | A failed check blocks the change |
| L2 Build cycle | A reviewer with the writer viewpoint, and the strings the benchmark agent wrote | The same rule fails in two cycles: fix the example or the rule that misled, and keep that fix if the benchmark holds |
| L3 Pilot loop | Whether people can say what happened, what they will pay and what to do next, in their own words | A misreading seen in a session goes to the steward, who decides to approve, revise or retire. No pass mark is set before a baseline |
| L4 Strategy loop | L3 evidence against the voice traits | A trait contradicted by evidence is revised (CEO) |

**Human checkpoint.** No machine can test whether words sound plain, steady and respectful. Before any string reaches pilot participants or real users, a person reads every string aloud, in context, on success and failure paths, and approves or revises it. The CEO asked for an in-house writer; none is named, so the CEO holds this seat. At Gate 3 a fresh reviewer checks every string against the numbered rules, which is a check of the rules and not of how the words sound. The board's idea of trying two tones for a failed-payment message is a candidate EXPLORE item for voice.

## Assumptions that need a human test

1. The feelings in the tone table marked [assumption] are what people in checkout actually feel.
2. People understand "Drafted by Souvenir" as machine-made and check it before use.
3. Owning our failures with "we" builds more trust than impersonal wording. Apple's guidance advises against "we" in errors; this file diverges, and it needs a test.
4. People can state what they will pay from the cost summary wording.
5. The starting values for sentence and message length are short enough to read and long enough to be exact.
6. A busy button whose visible label changes ("Pay £48.20" to "Paying £48.20…", rule 17) helps people more than a label that stays the same beside a spinner. A set of skills supplied by the CEO takes the opposite view; its reason was not in the files supplied.

## The lead's decisions, 13 November 2026

1. **"We" for our own failures** is kept (rule 8), against Apple's guidance, as a *[starting value]* and assumption 3.
2. **The length and reading-level numbers** in rules 10 and 11 are *[starting values]*, reviewed at Gate 3 against the strings actually written.
3. **LOCK and house-rule tags.** Each LOCK rule is the writing form of a row in [budget.md](budget.md): rules 2, 9 (money), 12 and 13 of truthful-content rows; rule 3 of the accessibility row on errors; rule 15 of the safe-behaviour row on consequences; rule 16 of the meaning row "one meaning has one name". Rule 4 was retagged a house rule because no row requires it.
4. **"Sorry" stays on the banned list** for now. An apology with no cause and no next step says nothing; rule 3 already requires both.
5. **Choosing the voice is the CEO's decision** under the table in [operating-model.md](operating-model.md). This guideline is the lead's proposal until the CEO has read it.
