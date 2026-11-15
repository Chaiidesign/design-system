# status

The state of one thing, as a small solid tab with the tone's own mark and a short ink label beside it.

## Markup

The tab and its mark are drawn by the stylesheet; write only the span and its words.

```html
<span class="sv-status" data-tone="success">Shipped</span>
```

While something is in progress, use `busy` and say what is happening. Add `role="status"` when the change should be announced:

```html
<span class="sv-status" data-tone="busy" role="status">Checking both calendars…</span>
```

It sits in a line of text, a list row or a table cell:

```html
<p>Your order of 3 items is <span class="sv-status" data-tone="success">Shipped</span> and arrives on Tuesday 18 November.</p>
```

## Options and states

| `data-tone` | Tab | Mark | Example label |
|---|---|---|---|
| `info` | neutral | circle with i | Not sent yet |
| `success` | green | tick | Shipped |
| `warning` | amber | triangle | Waiting for your reply |
| `danger` | red | octagon with cross | Payment failed |
| `busy` | neutral | open ring that turns once per 800 ms; still under reduced motion | Checking both calendars… |

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
