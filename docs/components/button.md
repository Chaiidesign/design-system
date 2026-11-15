# button

Starts an action (`button.sv-button`) or goes somewhere that looks like an action (`a.sv-button`).

```html
<button type="button" class="sv-button" data-variant="secondary">Apply code</button>
<a class="sv-button" data-variant="quiet" href="/basket">Back to basket</a>
```

The one submit button that commits money or sends something goes inside `sv-button`, with the label it shows while busy:

```html
<form action="/pay" method="post">
  <sv-button>
    <button type="submit" class="sv-button" data-variant="primary" data-width="full" data-busy-label="Paying £60.75…">Pay £60.75</button>
  </sv-button>
</form>
```

| Option or state | How | What it does |
|---|---|---|
| `data-variant="secondary"` | default; write it anyway | Edge outline, ink label. Most actions |
| `data-variant="primary"` | at most one per screen | Accent fill, taller (primary control height), label in on-solid |
| `data-variant="quiet"` | | Underlined ink text, no edge. Cancel, back, change |
| `data-width="full"` | | Fills its container. Use for the primary on a phone |
| hover, pressed, focus | the browser | Ink edge on hover; moves down by the press depth when pressed; ink focus ring |
| `disabled` | `<button>` only | Soft label, edge kept, no fill. Say next to it why it is unavailable |
| `aria-busy="true"` | set by `sv-button` | Turning mark before the label, held down, further presses ignored |

Labels name the result with a verb: "Pay £60.75", "Move event and send message". A busy label says what is happening: "Paying £60.75…". A long label wraps and keeps its padding.

`sv-button` script: on a valid submit by this button it sets `aria-busy="true"`, swaps in `data-busy-label`, and ignores further presses and Enter. It never sets `disabled`, so the button keeps its place in the Tab order and is still submitted. Going back to the page restores the label. With no script the form still submits.

Never use it for: navigation inside running text (use a plain `a`), a toggle (use a checkbox), or a link that is disabled (remove the link instead).

## Don't

Don't show "busy" with `disabled`. The button drops out of the Tab order, loses focus mid-press, and its name and value are not submitted.

```html
<button type="submit" class="sv-button" data-variant="primary" disabled>Paying £60.75…</button>
```
