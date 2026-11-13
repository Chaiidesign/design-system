# Callout

A short message set apart from the content around it: information, success, a warning or an error.

Status: beta (0.1.0) · CSS: `components/callout/callout.css`

## Use it when

- The person needs to know something before or after acting, and it applies to the whole section or page.

## Do not use it when

- The message is about one field. Use the field's error message.
- The message is decoration or marketing. If everything is called out, nothing is.
- There would be more than one callout in view. Combine them or cut one.

## Variants

| Class | Meaning | Start the title with |
|---|---|---|
| `.ds-callout` | Information | (no prefix needed) |
| `.ds-callout--success` | Something worked | "Saved", "Sent", the past-tense result |
| `.ds-callout--warning` | Something needs attention soon | "Check", "Before you continue" |
| `.ds-callout--danger` | Something failed or is blocked | "There is a problem" |

## Markup

```html
<div class="ds-callout ds-callout--danger" role="alert">
  <p class="ds-callout__title">There is a problem</p>
  <p class="ds-callout__body">Enter an email address to continue.</p>
</div>
```

## Accessibility

- The four variants differ only by colour, so the title text must carry the meaning.
- Add `role="alert"` only to a callout inserted after the page loads because of something the person did. Static callouts need no role.
- Text is `color.text.default` on every variant, checked at 4.5:1 or better in both themes.

## Content

- Title: one line that states the situation. Body: one or two sentences on what to do next.
- No exclamation marks. Do not blame the person ("You entered…").
