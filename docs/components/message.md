# message

A page message: a plate with a solid coloured tab down its leading edge, carrying the tone's own mark, and ink text beside it.

## Markup

```html
<div class="sv-message" data-tone="warning" role="status">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>Delivery cost is added after you enter your postcode.</p>
</div>
```

A paragraph and a quiet link that tries again (a link, because it loads a page; see `docs/patterns.md`):

```html
<div class="sv-message" data-tone="danger" role="alert">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>We couldn't reach your calendar. Nothing was changed.</p>
  <a class="sv-button" data-variant="quiet" href="/calendar">Try again</a>
</div>
```

Inside an `sv-panel`, add `data-surface="well"` so the plate stays visible. This is the treatment for the machine-draft warning:

```html
<div class="sv-message" data-tone="warning" data-surface="well">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>Drafted by Souvenir. Check it before you send.</p>
</div>
```

## Options and states

| Attribute | Values | Effect |
|---|---|---|
| `data-tone` | `info`, `success`, `warning`, `danger` | Tab colour and mark: circle, tick, triangle, octagon. Text stays ink in every tone. |
| `data-surface` | `well` (only value) | Plate takes the well colour; use it whenever the message sits on a panel. |
| `role` | `status` or `alert` (set by you) | `alert` only for a failure the person must act on now. |

The tab grows to the full height of the plate when the text wraps. The `__mark` span is always first and always empty.

## Never use it for

- The state of one thing in a list or table: use `sv-status`.
- A field's own error: use the field's error text.
- Decoration or marketing copy. The words must say the tone; the colour and mark only repeat it.

## Don't

```html
<section class="sv-panel">
  <div class="sv-message" data-tone="warning">
    <span class="sv-message__mark" aria-hidden="true"></span>
    <p>Drafted by Souvenir. Check it before you send.</p>
  </div>
</section>
```

On a panel without `data-surface="well"` the plate is the panel's colour, so only the tab shows and the warning reads quieter than the text around it.
