# Field

A labelled single-line text input with an optional hint and error message.

Status: beta (0.1.0) · CSS: `components/field/field.css`

## Use it when

- The answer is short free text: a name, an email address, a reference number.

## Do not use it when

- The answer is one of a known set. Use radios, a select or checkboxes.
- The answer runs to several lines. Use a textarea (not built yet).
- You are tempted to use placeholder text as the label. Placeholders disappear on typing and are not a label.

## Markup

```html
<div class="ds-field">
  <label class="ds-field__label" for="email">Email address</label>
  <p class="ds-field__hint" id="email-hint">We only use this to send your receipt.</p>
  <input class="ds-field__input" id="email" type="email" autocomplete="email"
         aria-describedby="email-hint email-error">
  <p class="ds-field__error" id="email-error" hidden>Enter an email address, like name@example.com</p>
</div>
```

To show an error: set `aria-invalid="true"` on the input and remove `hidden` from the error.

## Accessibility

- Every input has a visible `<label>` tied to it with `for` / `id`.
- Hint and error are linked with `aria-describedby`, so screen readers read them after the label.
- The input border is at least 3:1 against its background, so the field is findable without the label.
- The invalid state changes border thickness and adds a text message; it never relies on red alone.
- Set `type` and `autocomplete` so phones show the right keyboard and browsers can fill the field.
- Validate when the person leaves the field or submits, not on every keystroke.

## Content

- Label: a noun phrase in sentence case, no colon. "Email address", not "Enter your email:".
- Hint: say why you ask or what format you need. Leave it out if the label is enough.
- Error: say what to do, not what went wrong. "Enter an email address, like name@example.com", not "Invalid input".
