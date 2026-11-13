# Button

Starts an action: save, send, delete, open a dialog.

Status: beta (0.1.0) · CSS: `components/button/button.css`

## Use it when

- The person is doing something: submitting, saving, confirming, starting a flow.

## Do not use it when

- The control goes to another page. Use a link (`<a href>`). A link may take button styling only for a main call to action.
- There are more than a few choices of equal weight. Use a menu or a list.
- The choice is on/off. Use a checkbox or switch.

## Variants

| Class | Use for | Limit |
|---|---|---|
| `.ds-button` (primary) | The one main action of a view | One per view |
| `.ds-button--secondary` | Other actions next to a primary | |
| `.ds-button--ghost` | Low-emphasis actions: Cancel, toolbar actions | |
| `.ds-button--danger` | Actions that destroy data | Only for the final confirming step |

Sizes: `.ds-button--sm` (32px), default (40px), `.ds-button--lg` (48px). Use one size per group of buttons.

## Markup

```html
<button class="ds-button" type="button">Save changes</button>
<button class="ds-button ds-button--secondary" type="button">Preview</button>
<button class="ds-button ds-button--danger" type="button">Delete project</button>

<!-- Disabled, but still focusable so the reason is reachable -->
<button class="ds-button" type="button" aria-disabled="true" aria-describedby="why">Publish</button>
<p id="why">Add a title to publish.</p>

<!-- Loading -->
<button class="ds-button" type="button" aria-busy="true" aria-disabled="true">Saving…</button>
```

## Accessibility

- Use a real `<button>`. It gives keyboard activation (Enter and Space) and the right role for free.
- Always set `type`. Inside a form a button without `type` submits it.
- The focus ring is 2px with a 2px offset and at least 3:1 contrast. Never remove `outline`.
- Prefer `aria-disabled="true"` plus a visible reason over the `disabled` attribute, which removes the button from the tab order. With `aria-disabled` the script must ignore the click.
- An icon-only button needs an `aria-label`.
- Colour is never the only signal: a danger button's label must say what it destroys.
- All sizes are at least 32px tall, above the WCAG 2.2 target-size minimum of 24px.

## Content

- Start with a verb and name the object: "Save changes", "Delete project". Not "OK", "Submit", "Yes".
- Sentence case. No full stop.
- Keep the label the same while loading, or switch to the present participle with an ellipsis character: "Saving…".
- Two to three words. If it needs more, the surrounding text is missing something.
