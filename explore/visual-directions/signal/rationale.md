# Signal: rationale

## Point of view

An interface should read like a public sign: the fact first, in black and white, at a size nobody can miss, with colour kept for the one action and the one number.

## The decisions that make it this direction

1. **Two colours do the work.** Text and lines are near-black on white, or the reverse, because a sign is read in a hurry.
2. **The accent is a block, never a tint.** Only the total and the pay button are filled, so the eye lands on what you owe and how to pay.
3. **Every control is a square box with a 3 pixel line.** Solid means ready. Dashed means waiting or locked. Shape carries state, so colour need not.
4. **Messages are framed notices, each with a mark of its own shape.** The fixed content has no word naming the kind, so an octagon, triangle, tick or circle names it.
5. **The summary is a board.** One rule per row, bold right-aligned figures, the total in the largest type.

## What it gives up

- Legibility even over warmth.
- One loud thing even over several levels of emphasis.
- Large type even over seeing much at once.

## What a system built this way would need

Nine colour roles: page, text, accent, four statuses, two mark colours. Two surfaces that carry text: page and accent block. One corner radius, zero. No shadows. Five type sizes (16 to 56 pixels). Six spacing steps (4 to 48). Three line weights (1, 3, 6).

## Where it would strain

- **Dense screens.** With no grey text or tinted surface, secondary content can only get smaller.
- **Narrow screens.** At 320 pixels a long email address breaks mid-word.
- **Chat.** A conversation is long, quiet reading. Heavy frames around every message would shout, and nothing here shows "thinking" softly.

## Measured

The CSS is 7,210 bytes uncompressed. The lowest text contrast is 5.60 to 1: page colour on the accent block, dark theme (6.23 in light). All other text is 19.68 to 1.
