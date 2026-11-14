# Ledger: rationale

## Point of view

The interface is a well-set document: type, alignment and ruled lines carry the hierarchy, and colour appears only where something is committed or has gone wrong.

## The decisions that make it this direction

1. **Rules, not boxes.** A hairline separates rows, an ink rule opens each section and a double rule closes the total, so a section needs no surface, corner or shadow.
2. **One column of amounts.** Every amount has figures of equal width, ends on one right edge and never wraps, so the eye runs down to the total.
3. **Serif titles, sans text.** System sans gives reliable figures; system serif, roman for sections and italic for sub-heads, gives a document's voice without extra sizes.
4. **Colour is rationed.** The accent is only on the pay button and links, so the one coloured block is the action that commits. A status colours a rule and a mark; the message stays ink.
5. **Square, unfilled controls.** A field is an outline, read-only is dashed, an error is thicker with a mark: each state changes shape, not only colour. Focus is a heavy ink ring.

## What it gives up

Calm and precision even over warmth and brand presence. Reading in order even over scanning by region.

## What a system built this way would need

- Colour roles: 9 (four are statuses).
- Surfaces: 1.
- Corner radii: 1 (zero).
- Shadows: 0.
- Type sizes: 3 (16, 20, 36 pixels).
- Spacing steps: 6.

## Where it would strain

- In a chat, with no bubbles or fills, only alignment, labels and rules can say who is speaking. A long thread may read as one grey page.
- A generated result inside a message has no container to end it.
- Menus and dialogs have no shadow, so they need a heavy outline.
- Selected, pressed and disabled states have no fill to use.

## Measured

- CSS, uncompressed: 7,327 bytes.
- Lowest text contrast: 6.80 to 1, soft text on the surface, light theme.
