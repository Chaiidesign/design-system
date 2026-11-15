# select

The native select, styled as a field control with a chevron, for choosing one of a short, known list.

It is always the control of a field. Wrap it in `sv-field` so label, hint and error are joined and checked:

```html
<sv-field>
  <div class="sv-field">
    <label class="sv-field__label" for="country">Country</label>
    <p class="sv-field__hint" id="country-hint">We deliver to these countries</p>
    <p class="sv-field__error" id="country-error" hidden></p>
    <select class="sv-field__control sv-select" id="country" name="country" required data-error-required="Choose the country we deliver to" aria-describedby="country-hint">
      <option value="">Choose a country</option>
      <option>United Kingdom</option>
      <option>Ireland</option>
    </select>
  </div>
</sv-field>
```

| State | How | What it looks like |
|---|---|---|
| default | | A well with an edge, text at body size, chevron at the inline end |
| hover, focus | the browser | Ink edge on hover; ink focus ring |
| disabled | `disabled` | No well, thin edge, soft text and chevron |
| invalid | `aria-invalid="true"`, set by `sv-field` | Thick leading edge in the danger colour, error text above the control |

Both classes are needed: `sv-field__control` gives the shared field look, `sv-select` the chevron and its room. The select sets its own height, edge and colours too, so it keeps its shape if the field styles are missing. The chevron follows the text direction.

A required select starts on an empty option ("Choose a country"), so nobody submits a choice they did not make. The first option says what to choose.

Never use it for: more than about 15 options or a list the person must search (use a text field), two or three options that all fit on screen (use radios), or a choice that starts an action at once (use buttons).

## Don't

Don't preselect a real option on a required choice. The person can submit without ever looking at it, and the error never fires.

```html
<select class="sv-field__control sv-select" id="size" name="size" required>
  <option selected>Medium</option>
  <option>Large</option>
</select>
```
