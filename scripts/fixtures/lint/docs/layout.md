# Layout (fixture)

<!-- lint-expect: nothing -->

A whole page in a fence: the theme script before the stylesheet is allowed, and the link resolves as if from screens/.

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
<main class="sv-page">
  <h1>Checkout</h1>
</main>
</body>
</html>
```

```html
<section class="sv-demo">
  <h2>Order summary</h2>
</section>
```
