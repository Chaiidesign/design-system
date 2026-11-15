# Patterns

Situations that recur on every product, built from the parts. Copy the markup; it passes the lint. `screens/pattern-confirm.html`, `screens/pattern-states.html`, `screens/pattern-search-empty.html` and `screens/pattern-payment-failed.html` show them working.

## An action that cannot be undone

It gets a page of its own; there is no dialog. On the page where the action starts, a secondary link goes to that page:

```html
<a class="sv-button" data-variant="secondary" href="/account/delete">Delete account</a>
```

The confirmation page holds, in this order: an `h1` that names the action as a question; a `warning` message that says exactly what will be lost and that it cannot be undone; a form whose primary button names the action in full, with a secondary link back that names staying. Never "Are you sure?" and never "Yes" or "OK": each label says what happens.

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

## After a save, and any result page

Show the same page again, with a `success` message directly under the `h1`. It has `role="status"`, so a screen reader announces it. The page a form leads to opens at its result, so that on a small phone the person sees it without scrolling and a screen reader starts there. The form's `action` ends `#result` (`action="/pay#result"`); on the page it leads to, the message that reports the outcome has `id="result"` and `tabindex="-1"`. The browser then scrolls to that message and moves focus to it. Every pattern below that reports the outcome of a submit does this.

```html
<div class="sv-message" data-tone="success" role="status" id="result" tabindex="-1">
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

## A search that finds nothing

Keep the `h1` "Search results" and the search form, with the words still in the field. A search box is a field with `type="search"` and a visible label. Its button goes under it in the stack, never beside it in an `sv-row`, and it is the primary, because searching is the page's one purpose. Under the form, an `info` message with `role="status"` repeats the words searched for in a `span` with `data-user-content`, and says what to try.

```html
<form class="sv-stack" role="search" action="/search#result" method="get">
  <div class="sv-field">
    <label class="sv-field__label" for="q">Words to search for</label>
    <input class="sv-field__control" id="q" name="q" type="search" value="blue linen shirt" required enterkeyhint="search" autocapitalize="off">
  </div>
  <button type="submit" class="sv-button" data-variant="primary">Search the shop</button>
</form>
<div class="sv-message" data-tone="info" role="status" id="result" tabindex="-1">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>Nothing found for “<span data-user-content>blue linen shirt</span>”. Check the spelling or use fewer words.</p>
  <a class="sv-button" data-variant="quiet" href="/shop">See all products</a>
</div>
```

## After a failed payment

The page Pay leads to when the payment does not go through. Under the `h1`, a `danger` message with `role="alert"` says what happened and what is safe, only as far as the payment service has told us. Keep the cost summary, so the person sees what they tried to pay. The way back is a secondary link, "Return to checkout", to a checkout that keeps what was typed. This page has no primary button. When we do not know, say so: never "You have not been charged", and never a heading that says the payment failed.

| What the payment service told us | `h1` and title | Message |
|---|---|---|
| The payment was not taken | Payment not taken | We couldn't take your payment. You have not been charged. |
| The bank declined the card | Payment not taken | Your bank declined this card. Use another card, or contact your bank. |
| Nothing, or nothing clear | Payment not confirmed | We couldn't confirm your payment. We don't know yet whether you were charged. Check with your bank before you try again. |

```html
<main class="sv-page sv-stack" data-gap="6">
  <h1>Payment not confirmed</h1>
  <div class="sv-message" data-tone="danger" role="alert" id="result" tabindex="-1">
    <span class="sv-message__mark" aria-hidden="true"></span>
    <p>We couldn't confirm your payment of £60.75. We don't know yet whether you were charged. Check with your bank before you try again.</p>
  </div>
  <section class="sv-panel sv-stack" aria-labelledby="summary-heading">
    <h2 id="summary-heading">Your order</h2>
    <dl class="sv-cost-summary">
      <div class="sv-cost-summary__row"><dt>Items</dt><dd>£56.80</dd></div>
      <div class="sv-cost-summary__row"><dt>Delivery</dt><dd>£3.95</dd></div>
      <div class="sv-cost-summary__row" data-row="total"><dt>Total</dt><dd>£60.75</dd></div>
    </dl>
  </section>
  <a class="sv-button" data-variant="secondary" href="/checkout">Return to checkout</a>
</main>
```

## A form the server rejects as a whole

When an error belongs to no single field, such as an email and password that do not match, show a `danger` message with `role="alert"` above the form, and mark no field. On a sign-in page the form is the page's one purpose, so "Sign in" is the primary.

```html
<div class="sv-message" data-tone="danger" role="alert" id="result" tabindex="-1">
  <span class="sv-message__mark" aria-hidden="true"></span>
  <p>That email and password do not match. Check both and try again.</p>
</div>
<form class="sv-stack" action="/sign-in#result" method="post">
  <div class="sv-field">
    <label class="sv-field__label" for="email">Email address</label>
    <input class="sv-field__control" id="email" name="email" type="email" autocomplete="username" required>
  </div>
  <div class="sv-field">
    <label class="sv-field__label" for="password">Password</label>
    <input class="sv-field__control" id="password" name="password" type="password" autocomplete="current-password" required>
  </div>
  <a class="sv-button" data-variant="quiet" href="/forgot-password">Forgot your password?</a>
  <button type="submit" class="sv-button" data-variant="primary" data-width="full">Sign in</button>
</form>
```

## Buttons and links

A control that goes to another page is a link: `a.sv-button`. A control that changes something is a `type="submit"` button inside a form with `method` and `action`. A `type="button"` does nothing without script: use it only where a component note names the script that acts on it. A link on a line of its own, such as "Forgot your password?", is a quiet `a.sv-button` placed after the field it belongs to; a plain `a` is only for the middle of a sentence, and on its own it is too small to tap.

## Words

- In a conversation Souvenir says "I": "I'll move the event and send Priya this message." "We" is for failures of the service: "We couldn't reach your calendar."
- Dates: "12 November" in the current year; "12 November 2025" in any other year.
- Times: "3:00 pm", with the minutes, a space and a lower-case "am" or "pm".
- A time the person must approve always has its date beside it: "Thursday 19 November, 3:00 pm", never "Thursday, 3:00 pm".
- A no-break space (`&nbsp;` in HTML) inside a postcode example and between a number and its unit, so that they never split across lines: "SW1A 1AA", "250 g", "30 days".
- Contractions are fine: "couldn't", "we'll".
- Two facts on one detail line are joined by a middle dot with a space each side: "Placed 12 November · 3 items".
