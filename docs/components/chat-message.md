# chat-message

One turn in a conversation between a person and Souvenir, with the speaker named in words.

## Markup

Put each message in an `li` of an `ol.sv-chat`. Every message carries its visible speaker label.

```html
<ol class="sv-chat" aria-label="Conversation">
  <li>
    <article class="sv-chat-message" data-from="person">
      <p class="sv-chat-message__from">You</p>
      <div class="sv-chat-message__body">
        <p data-user-content>Move my 3pm with Priya to Thursday and tell her why.</p>
      </div>
    </article>
  </li>
  <li>
    <article class="sv-chat-message" data-from="assistant">
      <p class="sv-chat-message__from">Souvenir</p>
      <div class="sv-chat-message__body">
        <p>Thursday at 3pm is free for both of you.</p>
      </div>
    </article>
  </li>
</ol>
```

## Options and states

| Part or option | Values | What it does |
|---|---|---|
| `data-from` | `person` | A plate held to the end of the line, inset from the start by at least `--sv-chat-message-person-inset`, with an edge border and one squared corner. Label "You" |
| `data-from` | `assistant` | Plain text on the ground, full width. Label "Souvenir" |
| `.sv-chat-message__from` | text | The speaker label, weight 600. Required on every message |
| `.sv-chat-message__body` | any content | Paragraphs, an `sv-status`, an `sv-message` or an `sv-proposal`, spaced by a stack gap |
| `data-user-content` | on the element holding text a person wrote | Lets long unbroken strings (an email address, a link) break anywhere |

No script and no state of its own: a busy or failed turn holds an `sv-status` or an `sv-message`. Speakers stay distinguishable with colour removed: label, border and inset.

## Never use it for

- Notifications, comments or reviews outside a conversation with Souvenir.
- Wrapping Souvenir's own words in a plate: only the person's message has one.
- `data-user-content` on text Souvenir wrote, such as a draft.

## Don't

Leave out the speaker label and rely on the plate alone:

```html
<article class="sv-chat-message" data-from="person">
  <div class="sv-chat-message__body">
    <p data-user-content>Move my 3pm to Thursday.</p>
  </div>
</article>
```

Why: who is speaking would then be carried by styling alone, which a screen reader user and a reader of a long thread can miss. The screen checker fails it as `missing-speaker-label`.
