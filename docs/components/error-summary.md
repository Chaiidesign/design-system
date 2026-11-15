# error-summary

After a failed submit, lists every field's error as a link to that field, above the form, and takes focus.

```html
<sv-error-summary for="contact">
  <div class="sv-error-summary" role="alert" tabindex="-1" aria-labelledby="problem-title" hidden>
    <h2 class="sv-error-summary__title" id="problem-title">There is a problem</h2>
    <ul class="sv-error-summary__list"></ul>
  </div>
</sv-error-summary>
<form id="contact" action="/contact" method="post">
  <!-- sv-field elements and the submit button -->
</form>
```

Place it at the top of the page content, before the form, on the ground (not inside a panel). The fields must be `sv-field` elements (see field.md).

| Option or state | How |
|---|---|
| Form | `for="<form id>"`; without it, the form it is inside, else the form directly after it |
| Hidden | `hidden` on `div.sv-error-summary`: the resting state; the `sv-error-summary` wrapper then takes no space either |
| Shown by the script | on a submit with invalid fields: stops the submit, asks each `sv-field` for its error, fills the list, removes `hidden`, takes focus and shows the focus ring (on `:focus`, since script moves focus there); `role="alert"` announces it |
| Links | each link's text is the field's error word for word; `href="#<control id>"`; a click moves focus to the control and scrolls its label into view |
| Hides | when every field is valid, on submit or as the person fixes each field (that field's link is removed) |
| Server-rendered | no `hidden`, links written out, and each field in its error state; the script moves focus to it on load |

The plate is panel-toned with a solid danger tab on its leading edge carrying the danger mark; the heading and links are ink.

Server-rendered example (works with no script):

```html
<div class="sv-error-summary" role="alert" tabindex="-1" aria-labelledby="problem">
  <h2 class="sv-error-summary__title" id="problem">There is a problem</h2>
  <ul class="sv-error-summary__list">
    <li><a href="#contact-email">Enter an email address with an @, like name@example.com.</a></li>
  </ul>
</div>
```

Never use it for: a single field checked on blur (the field's own error line does that), a failure on our side such as a payment service being down (use a `danger` message), or warnings and notices.

## Don't

Don't write a different message in the summary from the one beside the field, or a link with no target.

```html
<ul class="sv-error-summary__list">
  <li><a href="#top">Email is invalid</a></li>
</ul>
```

The person reads one thing at the top and another at the field, and the link does not take them to the control. Use the field's exact error text and link to the control's id.
