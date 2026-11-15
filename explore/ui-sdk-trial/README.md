# UI SDK trial: what it adds to a checkout form, and what it costs

Clay, 15 November 2026. UI SDK `0.1.0-beta.3` (`@ui-sdk/core`, `@ui-sdk/web`), measured against the 5,120-byte row per component in `charter/budget.md`.

**In short:** stay native for all four. Every bundle is 3 to 12 times over the row, and `charter/exceptions.md` says such a part stays blocked until the CEO changes the row. Only the select adds something a checkout could use, and it costs the most. With UI SDK, select and checkbox need glue of our own to work with scripts off, and probably lose browser autofill (inferred, not tested). When UI SDK parts are mixed, an empty submit can send focus to the wrong field.

`index.html` uses UI SDK web components around native fallback markup. `native.html` is the same form in plain HTML with no script. `check.mjs` drives both in headless Chromium and writes `check-result.json` and `shots/`.

How sizes were measured: gzip level 9 of minified esbuild bundles with tree-shaking, taken from `scripts/size.mjs`. "Alone" means the component in its own bundle. "Share" is its marginal cost: the size of all four together (74,857 B) minus the size of the other three. The shared core is the size of all four minus the sum of the marginals: 16,714 B. Version 0.2's own scripts measured 843 B (field) and 513 B (button) at the time of this trial. They are another builder's work in progress.

The scripts-off result: both pages were filled and submitted with JavaScript disabled. `result.html` received `email`, `postcode`, `country=GB` and `terms=yes`, each exactly once. The same held with JavaScript on.

## Field (ui-field + ui-input + ui-label)
| | |
|---|---|
| Adds over native + `sv-field` | Wires `aria-describedby` to the hint and to the error that shows, and sets `aria-invalid`. Shows the author's message per problem (`match="valueMissing"` or `"typeMismatch"`). The message follows the value as it is corrected, and the text is kept. A polite live region carried the error text. `sv-field` is specified to do the same wiring and messages. |
| Size | 22,405 B alone (21,791 B without `ui-label`); share 6,869 B |
| Scripts off | Works, but only because a native `<label for>` sits inside `ui-field-label`. Without it the input has no name, and the hint is not connected. |
| Breaks | On an empty submit, focus went past the invalid email to the terms checkbox, which was required and outside a `ui-field`. With `required` removed from it, focus went to email. So a required control outside a field takes focus ahead of the fields. The browser's own messages are still English and say "Please". |
| Recommendation | **Stay native.** It does what `sv-field` already promises, at 26 times the size. |

## Select (ui-select)
| | |
|---|---|
| Adds over native `<select>` | A styleable popup list with keyboard support: ArrowDown opens it, typing "Fr" moves to France, Enter chooses and returns focus to the trigger. It also sets `aria-invalid` and links its error. |
| Size | 63,343 B alone; share 46,988 B |
| Scripts off | Submits nothing on its own. The docs point to "fallback markup on its component page", but that page has none. Our fallback is a native `<select>` inside it, which UI SDK leaves in the form. Glue (`glue.js`, 211 B gzip) copies the choice across and removes the native select; without it, `country` would submit twice. In a test where the script arrived late, a choice made on the fallback (France) was kept and submitted once. |
| Breaks | Autofill for `country` is probably lost with scripts on. This is inferred, not tested with real autofill: the trigger is a `<button>`, and no native control is left to fill. The glue removes the native select that carried `autocomplete`. |
| Recommendation | **Stay native.** A checkout needs autofill and a phone's own picker more than a styled list. |

## Checkbox (ui-checkbox)
| | |
|---|---|
| Adds over native `<input type=checkbox>` | Nothing a checkout needs. It is a form-associated element with `role=checkbox`, Space toggles it and it submits `terms=yes`, which the native element already does. |
| Size | 19,212 B alone; share 3,106 B |
| Scripts off | Submits nothing. It needs a native checkbox beside it, plus glue to remove that checkbox. Nesting the native checkbox inside it made a checkbox inside a checkbox. A box ticked before the script arrived stayed ticked and submitted once. |
| Breaks | Outside a field, its error is the browser bubble ("Please check this box…"). Because it was required, focus went to it on an empty submit, past three earlier invalid fields (see Field). |
| Recommendation | **Stay native.** |

## Button (ui-button)
| | |
|---|---|
| Adds over native + `sv-button` | It is pending while a Promise passed to its `action` event's `waitUntil()` runs. During that time it sets `aria-busy` and `aria-disabled`, keeps focus, ignores a second press (1 submit, against 2 on the plain page), and says "Paying" through a live region after about 1 second. It does not track a normal form submit. A button without a type becomes `type="button"`, so `type="submit"` must be written. |
| Size | 15,628 B alone; share 1,180 B |
| Scripts off | Works, because it wraps a native submit button. |
| Breaks | Nothing observed. |
| Recommendation | **Stay native.** `sv-button` is specified to set `aria-busy` and ignore repeat presses on submit, at 513 B. The one-second announcement is worth copying into `sv-button` (an assumption that needs a human test). |

## The CSS UI SDK injects
Two inline `<style>` elements (`#ui-sdk-web-1` and `#ui-sdk-hidden`) hold a cascade layer named `ui-sdk`. Its only declarations are `display` (block, contents or none) for each element, `display: none !important` on `[data-slot][hidden]`, and `text-align: inherit` on aligned select content. **It sets no colour, font or size.** `trial.css` declares `@layer ui-sdk, sv.tokens, sv.base, sv.components, trial;` first, so every Souvenir layer wins over it. The exception is its one `!important` rule on `[data-slot][hidden]`: an important declaration in an earlier layer wins, so nothing can override it. That is harmless, because hidden stays hidden. A strict content security policy would block these `<style>` elements unless a nonce is given (not tested).

## Not tested
Screen readers, real phones and their native pickers, other browsers, autofill itself, a strict content security policy, dark theme, and the agent bridge. The accessible names come from Chromium's tree. Playwright's snapshot showed the UI SDK checkbox without a name, while Chromium named it from its label.
