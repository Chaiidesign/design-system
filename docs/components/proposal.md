# proposal
What Souvenir proposes to do, with everything a person needs to check it, on one phone screen.

## Markup

```html
<section class="sv-proposal" aria-labelledby="proposal-title">
  <h3 id="proposal-title">Move the event to Thursday and tell Priya</h3>
  <dl class="sv-proposal__fields">
    <div><dt>Event</dt><dd>Planning with Priya</dd></div>
    <div><dt>From</dt><dd>Wednesday, 3:00 pm</dd></div>
    <div><dt>To</dt><dd>Thursday, 3:00 pm</dd></div>
  </dl>
  <figure class="sv-proposal__message">
    <figcaption class="sv-proposal__caption">Message to Priya</figcaption>
    <blockquote class="sv-proposal__draft">
      <p>Hi Priya, can we move planning to Thursday at 3pm? I have a clash on Wednesday.</p>
    </blockquote>
  </figure>
  <div class="sv-message" data-tone="warning" data-surface="well" role="status">
    <span class="sv-message__mark" aria-hidden="true"></span>
    <p>Drafted by Souvenir. Check it before you send.</p>
  </div>
  <form class="sv-proposal__actions" action="/proposals/move-planning" method="post">
    <button type="submit" class="sv-button" data-variant="primary">Move event and send</button>
    <a class="sv-button" data-variant="secondary" href="/proposals/move-planning/edit">Edit message</a>
    <a class="sv-button" data-variant="quiet" href="/assistant">Cancel</a>
  </form>
</section>
```

## Parts and states

| Part or state | What to do |
|---|---|
| Heading | `h2` or `h3`: what will be done, in plain words |
| `.sv-proposal__fields` | Term in soft text, value in ink at weight 600 at the end; a long value takes its own line |
| `.sv-proposal__draft` | Dashed edge: read, not yet sent. Always under a `figcaption` naming the recipient. Leave it out when there is no message to send |
| Warning | `sv-message`, `data-tone="warning"`, `data-surface="well"`, whenever a draft is shown before sending |
| `.sv-proposal__actions` | A `form` that posts the proposal. Primary first, a submit button, on a row of its own at full width, as a direct child; the others are links (`a.sv-button`) that share the row below (stretched on a phone, own width from 48rem) |
| Busy | The primary gets `aria-busy="true"` and its label becomes "Moving event and sending…" |
| Done | Heading, fields and a `success` message ("Event moved. Message sent to Priya."); no draft, warning or actions. The dashed edge means "not yet sent", so once sent the draft is gone |
| Failed | Add a `danger` message with `role="alert"` above the actions; keep the actions |

No script. Keep to one heading, three to five fields and a short draft, so it fits one 720 pixel phone screen.
## Never use it for

Asking about something already done (show the done state, or a `success` message on its own); a form the person fills in (use `sv-field`); a draft without its warning.

## Don't

```html
<section class="sv-proposal" aria-labelledby="bad-title">
  <h3 id="bad-title">Send this message to Priya</h3>
  <blockquote class="sv-proposal__draft"><p>Hi Priya, can we move planning?</p></blockquote>
  <form class="sv-proposal__actions" action="/proposals/move-planning" method="post"><button type="submit" class="sv-button" data-variant="primary">Send message</button></form>
</section>
```

Why: the draft has no caption and no "Drafted by Souvenir" warning, so a person may send machine-made words without checking them. Voice rule 13 (a LOCK) requires the warning in text.
