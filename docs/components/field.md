# field

A labelled text entry (input, textarea or select) with an optional hint and an error line that names the fix.

```html
<sv-field>
  <div class="sv-field">
    <label class="sv-field__label" for="email">Email address</label>
    <p class="sv-field__hint" id="email-hint">We'll send your receipt here</p>
    <p class="sv-field__error" id="email-error" hidden></p>
    <input class="sv-field__control" id="email" name="email" type="email" autocomplete="email" required
      aria-describedby="email-hint email-error"
      data-error-required="Enter your email address."
      data-error-type="Enter an email address with an @, like name@example.com.">
  </div>
</sv-field>
```

Order is fixed: label, hint, error, control. The control is `input`, `textarea` or `select`, always with `sv-field__control`. Use the browser's own rules (`required`, `type`, `pattern`) and give one message per rule.

| Option or state | How | Looks like |
|---|---|---|
| Optional | write "(optional)" at the end of the label text | label text only; required fields say nothing |
| Hint | `p.sv-field__hint`, one sentence, no full stop | soft text under the label |
| Multi-line | `textarea.sv-field__control` | two control heights, resizes vertically |
| Read-only | `readonly` | dashed edge, no well |
| Disabled | `disabled`; say why in the hint | thin edge, no well, soft text and label |
| Error | `aria-invalid="true"` on the control and the error line not `hidden` | ink text at 600 with the danger mark; thick danger leading edge |
| Messages | `data-error-required`, `data-error-type`, `data-error-pattern` on the control | shown in the error line; else the browser's message |

The `sv-field` element (optional, light DOM): fills in missing ids, `for` and `aria-describedby` (hint, then error); checks on blur after the person has typed and on submit; sets or removes `aria-invalid`; never changes the value; adds `novalidate` to the form only when it runs; stops an invalid submit and focuses the first invalid control unless an `sv-error-summary` handles the form; dispatches bubbling `sv-field-invalid` and `sv-field-valid` events. `element.check()` validates now; `element.error` is the current message.

With no script, render a server error as plain markup: `aria-invalid="true"` on the control and the message in a visible error line. The browser's own validation runs.

Never use it for: a choice from two to five options (radios), a yes or no (checkbox), a search box in a toolbar, or text the person cannot change (show it as text, or `readonly` if it is sent with the form).

## Don't

Don't put an error, or any instruction, in the placeholder. (This snippet is not checked: it shows what the lint rejects.)

```
<div class="sv-field">
  <label class="sv-field__label" for="code">Discount code</label>
  <input class="sv-field__control" id="code" name="code" placeholder="Code not recognised">
</div>
```

With no `aria-invalid` and no error line there is no edge, no mark and no text a screen reader can tie to the field; a placeholder disappears as soon as the person types. Write the message in `p.sv-field__error` and set `aria-invalid="true"`.
