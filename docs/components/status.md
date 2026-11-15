# status

The state of one thing, as a small solid tab with the tone's own mark and a short ink label beside it.

## Markup

The tab and its mark are drawn by the stylesheet; write only the span and its words.

```html
<span class="sv-status" data-tone="success">Delivered</span>
```

While something happens as the person waits, use `busy` and say what is happening. Add `role="status"` when the change should be announced:

```html
<span class="sv-status" data-tone="busy" role="status">Checking both calendars…</span>
```

It sits in a line of text, a list row or a table cell:

```html
<p>Your order of 3 items is <span class="sv-status" data-tone="info">On its way</span> and arrives on Tuesday 18 November.</p>
```

## Options and states

Choose the tone by what the state means for the person, not by how it feels:

| `data-tone` | Means | Examples | Mark |
|---|---|---|---|
| `success` | Finished, and finished well | Delivered, Paid, Sent | tick |
| `danger` | Failed, and needs the person | Payment failed, Not sent | octagon with cross |
| `warning` | Will go wrong unless the person acts | Payment due tomorrow, Storage almost full | triangle |
| `info` | Any other state, including ones that last days | Being prepared, On its way, Cancelled, Draft | circle with i |
| `busy` | Happening right now, while the person waits: seconds, not days | Checking both calendars… | open ring that turns once per 800 ms; still under reduced motion |

Cancelled is `info`, not `warning`: nothing will go wrong. A state that lasts days, such as "Being prepared", is never `busy`. In a list row the status is a line of its own in the main part, never in the trail (`docs/layout.md`).

It is never shorter than the body line height (24 pixels), so it does not change the line it sits in. A long label wraps beside the tab, and the tab stays on the first line.

## Never use it for

- A sentence or an instruction: use `sv-message`.
- A button or a link. It is not focusable and does nothing when pressed.
- Counts or badges on icons.

## Don't

```html
<span class="sv-status" data-tone="success"></span>
```

A status without a label is colour and shape alone. People who cannot see the colour, and screen readers, get nothing. Always write the state in words.
