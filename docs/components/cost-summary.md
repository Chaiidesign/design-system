# cost-summary

The inverse display of what an order costs, ending in a total that is the largest text on the page.

## Markup

```html
<dl class="sv-cost-summary">
  <div class="sv-cost-summary__row"><dt>Items</dt><dd>£61.80</dd></div>
  <div class="sv-cost-summary__row"><dt>Discount: Welcome discount</dt><dd>−£5.00</dd></div>
  <div class="sv-cost-summary__row"><dt>Delivery</dt><dd>£3.95</dd></div>
  <div class="sv-cost-summary__row" data-row="total"><dt>Total</dt><dd>£60.75<p class="sv-cost-summary__note">Includes £10.13 VAT</p></dd></div>
</dl>
```

A cost not known yet is said in words, on a row with `data-state="unknown"`:

```html
<dl class="sv-cost-summary">
  <div class="sv-cost-summary__row"><dt>Items</dt><dd>£54.00</dd></div>
  <div class="sv-cost-summary__row" data-state="unknown"><dt>Delivery</dt><dd>Not known yet. Enter your postcode to see it.</dd></div>
  <div class="sv-cost-summary__row" data-row="total"><dt>Total so far</dt><dd>£54.00</dd></div>
</dl>
```

## Options and states

| Attribute or part | Value | Effect |
|---|---|---|
| `data-row` on a row | `total` | Label at the lead size; amount at the display size, weight 600; a rule above. One per summary, last. |
| `data-length` on the total row | `long` | Set it when the total has more than nine characters (£1,234.56 has nine; £12,345.67 has ten). The amount steps down to 28 pixels, still larger than the page title; on a phone the amount moves below "Total", at the inline end. |
| `data-state` on a row | `unknown` | The value is plain words at body size and wraps normally. |
| `p.sv-cost-summary__note` | inside the total's `dd`, after the amount | Small print under the total, at the inline end. |

Amounts use tabular figures, sit on the inline-end edge and never wrap. A term wraps only between words; if a term's longest word and its amount cannot share a line, the amount moves below the term. It sits on the ground or on an `sv-panel` as it is.

A long total, which fits the display at 320 pixels wide on a panel:

```html
<dl class="sv-cost-summary">
  <div class="sv-cost-summary__row" data-row="total" data-length="long"><dt>Total</dt><dd>£12,345,678.90</dd></div>
</dl>
```

## Never use it for

- A list of products with pictures or quantities to change: that is the order, not the cost.
- Any amount that is a guess. Show the `unknown` state until the amount is known.
- More than one total, or a second display-size number on the same page.

## Don't

```html
<dl class="sv-cost-summary">
  <div class="sv-cost-summary__row"><dt>Delivery</dt><dd>£0.00</dd></div>
</dl>
```

A cost not yet known shown as £0.00 states something untrue, and the person may pay more than they were shown. Use `data-state="unknown"` and say what is needed to know it.
