# checkbox

One yes-or-no choice the person makes, such as agreeing to terms or keeping a setting; the whole label row is the target.

```html
<label class="sv-checkbox">
  <input type="checkbox" name="updates">
  <span class="sv-checkbox__label">Email me when my order ships</span>
</label>
```

Several related boxes go in a group with a name:

```html
<div class="sv-stack" data-gap="2" role="group" aria-label="Delivery options">
  <label class="sv-checkbox">
    <input type="checkbox" name="safe-place">
    <span class="sv-checkbox__label">Leave the parcel in a safe place</span>
  </label>
  <label class="sv-checkbox">
    <input type="checkbox" name="gift" checked>
    <span class="sv-checkbox__label">This is a gift: leave prices off the receipt</span>
  </label>
</div>
```

| State | How | What it looks like |
|---|---|---|
| unchecked | default | A well with an edge, the size of a mark |
| checked | `checked` | Ink tick and ink edge |
| focus | the browser | Ink ring around the box |
| disabled | `disabled` | No well, soft text and tick. Say why in the label |
| invalid | `required`, then `:user-invalid` or `aria-invalid="true"` | Thicker edge in the danger colour. The error text is the field's job: put it beside the box |

The label states what checking it means, in the person's terms. A required box says what they agree to, not "I accept".

Never use it for: choosing one of several options (use radios or a select), starting an action at once (use a button), or a box ticked for the person to opt them in to marketing.

## Don't

Don't put the input outside its label. The row stops being the target, and the box alone is 24 pixels, too small to tap with confidence.

```html
<div class="sv-checkbox">
  <input type="checkbox" id="terms" name="terms">
  <label class="sv-checkbox__label" for="terms">I agree to the terms of sale</label>
</div>
```
