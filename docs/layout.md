# Layout

How to build a page from the system. A screen holds no style of its own: no `<style>`, no `style` attribute, only `sv-` classes and `sv-` elements. If a screen needs something the system lacks, add it to the system (a token, a component, `src/base/base.css`), never to the screen.

## Page skeleton

Copy this whole file. The one inline script reads `?theme=` and `?accent=`; it must come before the stylesheet. The two paths, to `dist/souvenir.css` and `dist/souvenir.js`, are relative to the file you are writing: `../dist/` for a file directly in `screens/`. For a file one folder deeper, such as `screens/orders/list.html`, add one `../` to each:

```html
<link rel="stylesheet" href="../../dist/souvenir.css">
<script type="module" src="../../dist/souvenir.js"></script>
```

The skeleton, for a file directly in `screens/`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Checkout</title>
<script>var p=new URLSearchParams(location.search),t=p.get("theme"),a=p.get("accent");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;if(a==="blue"||a==="teal")document.documentElement.dataset.accent=a</script>
<link rel="stylesheet" href="../dist/souvenir.css">
<script type="module" src="../dist/souvenir.js"></script>
</head>
<body>
<main class="sv-page sv-stack" data-gap="6">
  <h1>Checkout</h1>
</main>
</body>
</html>
```

Theme: the device setting by default; `data-theme="light"` or `"dark"` on `<html>` fixes it. Accent: blue by default; `data-accent="teal"` on `<html>` swaps it. Nothing else changes colour.

## Layout classes

| Class | What it does |
|---|---|
| `sv-page` | Centred column, 34rem at most, with page padding. `data-layout="split"`: two equal columns from 48rem, 64rem at most; one column below. In split, children span both columns, except `sv-page__main` (first column) and `sv-page__aside` (second column, stays in view while the main scrolls), which sit side by side whatever their order in the document |
| `sv-panel` | Raised surface with a hairline edge. Put a `sv-message` on it with `data-surface="well"` |
| `sv-stack` | Children one under another, 16 pixels apart. `data-gap`: `2` (8), `3` (12), `6` (32, between sections) |
| `sv-row` | Children side by side, 12 pixels apart, wrapping. `data-align="end"` pushes them to the end |
| `sv-list` | `ul` or `ol` of `li.sv-list__item`, each a `div.sv-list__main` (title line, then `p.sv-list__detail` lines in soft text, then an optional action) and an optional `p.sv-list__trail` holding an amount. Hairlines between items |
| `sv-chat` | `ol` of `li`, each holding one `sv-chat-message`, 20 pixels apart |
| `sv-visually-hidden` | Kept for screen readers, hidden from view |

```html
<section class="sv-panel sv-stack" aria-labelledby="summary">
  <h2 id="summary">Order summary</h2>
  <ul class="sv-list">
    <li class="sv-list__item">
      <div class="sv-list__main"><p>Soap</p><p class="sv-list__detail">Quantity 3</p></div>
      <p class="sv-list__trail">£7.80</p>
    </li>
  </ul>
</section>
```

Each part of a row has one place:

- **Title**: the first line of the main part; a link when the row opens a page of its own.
- **Details**: each fact a `p.sv-list__detail`; two short facts share a line, joined by " · ".
- **Status**: a line of its own in the main part, after the details: a `p.sv-list__detail` holding the `sv-status`.
- **Action for one row**: last in the main part, a secondary or quiet `a.sv-button` (or a submit button inside a form). Give each repeated action a distinct name with `sv-visually-hidden`.
- **Amount**: bare text in the trail. It never wraps. Nothing else goes in the trail.

One order, with all five:

```html
<ul class="sv-list">
  <li class="sv-list__item">
    <div class="sv-list__main">
      <a href="/orders/10420">Order 10420</a>
      <p class="sv-list__detail">Placed 2 October · 1 item</p>
      <p class="sv-list__detail"><span class="sv-status" data-tone="danger">Payment failed</span></p>
      <a class="sv-button" data-variant="secondary" href="/orders/10420/payment">Fix payment<span class="sv-visually-hidden"> for order 10420</span></a>
    </div>
    <p class="sv-list__trail">£15.99</p>
  </li>
</ul>
```

A row with no amount, such as a setting, has no trail; its action ("Change") still goes last in the main part. An empty list is not an empty `ul` or a line of soft text: replace the list with an `info` message that says what will appear and how to add it. When adding happens on another page, the action is a link:

```html
<div class="sv-message" data-tone="info" data-surface="well">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>You have no saved addresses yet.</p>
  <a class="sv-button" data-variant="quiet" href="/addresses/new">Add an address</a>
</div>
```

States after a save, after a failed load and before an action that cannot be undone are in `docs/patterns.md`.

## Split page

Put the aside first when a phone should read it first, as an order summary before the form. From 48rem it moves to the second column, beside the main. It holds nothing focusable, so the Tab order still follows the screen.

```html
<main class="sv-page sv-stack" data-gap="6" data-layout="split">
  <h1>Checkout</h1>
  <section class="sv-page__aside sv-panel sv-stack" aria-labelledby="summary-heading">
    <h2 id="summary-heading">Order summary</h2>
  </section>
  <form class="sv-page__main sv-stack" data-gap="6" action="/pay" method="post"></form>
</main>
```

## Headings

One `h1` per page: its title, 24 pixels, always smaller than a cost total. `h2` (20 pixels) names each section or panel. `h3` (16 pixels, weight 600) names a part inside a section, such as a proposal under a section heading. Never skip a level, and never pick a heading for its size.
