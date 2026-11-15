# Patterns

Situations that recur on every product, built from the parts. Copy the markup; it passes the lint. `screens/pattern-confirm.html` and `screens/pattern-states.html` show each one working.

## An action that cannot be undone

It gets a page of its own; there is no dialog. On the page where the action starts, a secondary link goes to that page:

```html
<a class="sv-button" data-variant="secondary" href="/account/delete">Delete account</a>
```

The confirmation page holds, in this order: an `h1` that names the action as a question; a `warning` message that says exactly what will be lost and that it cannot be undone; a form whose primary button names the action in full, with a secondary link back that names staying.

```html
<main class="sv-page sv-stack" data-gap="6">
  <h1>Delete your account?</h1>
  <div class="sv-message" data-tone="warning">
    <span class="sv-message__mark" aria-hidden="true"></span>
    <p>Your details, your saved addresses and the record of your orders will be deleted. This cannot be undone.</p>
  </div>
  <form class="sv-stack" action="/account/delete" method="post">
    <button type="submit" class="sv-button" data-variant="primary" data-width="full">Delete my account</button>
    <a class="sv-button" data-variant="secondary" data-width="full" href="/account">Keep my account</a>
  </form>
</main>
```

Never "Are you sure?" and never "Yes" or "OK": each label says what happens.

## After a save

Show the same page again, with a `success` message directly under the `h1`. It has `role="status"`, so a screen reader announces it.

```html
<div class="sv-message" data-tone="success" role="status">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>Your changes are saved.</p>
</div>
```

## After a failed load

In place of what failed to load, a `danger` message with `role="alert"`. It says what happened, then what is safe if we know it, then offers a link that loads the page again.

```html
<div class="sv-message" data-tone="danger" role="alert">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>We couldn't load your orders.</p>
  <a class="sv-button" data-variant="quiet" href="/orders">Try again</a>
</div>
```

Never claim something we cannot know. A page that only lists orders cannot know whether anyone was charged, so it never says "You have not been charged". A payment page says it only when the payment service has told us so.

## An empty list

In place of the list, under its heading, an `info` message that says what will appear and how to add it. When adding happens on another page, the action is a link, not a button. On a panel, add `data-surface="well"`.

```html
<div class="sv-message" data-tone="info">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>You have no orders yet. When you place one, it will appear here.</p>
  <a class="sv-button" data-variant="quiet" href="/shop">Start shopping</a>
</div>
```

## Buttons and links

A control that goes to another page is a link: `a.sv-button`. A control that changes something is a `type="submit"` button inside a form with `method` and `action`. A `type="button"` does nothing without script: use it only where a component note names the script that acts on it.

## Words

- Dates: "12 November" in the current year; "12 November 2025" in any other year.
- Contractions are fine: "couldn't", "we'll".
- Two facts on one detail line are joined by a middle dot with a space each side: "Placed 12 November · 3 items".
