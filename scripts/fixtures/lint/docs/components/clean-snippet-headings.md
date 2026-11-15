# demo

A fragment may start at any level.

```html
<section class="sv-demo">
  <h2>Order summary</h2>
  <h3>Items</h3>
  <button type="button" class="sv-demo__part" data-variant="primary">Pay £60.75</button>
</section>
```

A second fence is a separate fragment, so its own primary does not add to the first.

```html
<button type="button" class="sv-demo" data-variant="primary">Pay £60.75</button>
```
