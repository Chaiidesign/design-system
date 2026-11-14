# Instrument: rationale

## Point of view

Every part should look like the physical thing it does, so a person can tell a well, a key, a display and a label apart before reading a word.

## The decisions that make it this direction

1. **Depth is shown by tone alone.** Panels are one step lighter than the ground. Wells and dividers are the ground showing through. Nothing needs a shadow.
2. **Colour lives only in solid parts.** The pay key, the status tabs and the display are filled. Text is always ink.
3. **The solids are the same in both themes.** Only the six body colours change, like one instrument in a light or a dark case.
4. **Each kind of part has one shape.** A well has an edge. A read-only value is dashed. A key is filled and moves when pressed. A status is a tab with its own mark. No state depends on hue.
5. **The total is the largest reading.** The cost summary is a display, so the price is seen before the pay key.

## What it gives up

- Sturdy, obvious controls even over density.
- One fixed accent tone even over a brighter key in the dark theme.
- Ink text even over the familiar red error sentence.

## What a system built this way would need

14 colour roles (6 body, 4 solid, 4 status). 4 surfaces (ground, panel, key, display). 2 corner radii. 0 shadows. 4 type sizes. 6 spacing steps.

## Where it would strain

- **Chat.** A long assistant answer is running text, not a part. A panel around every message would be heavy. It needs an unboxed text style, not shown here.
- **Dense tools.** Tables and toolbars cannot afford 48 pixel controls.
- **Re-branding.** The accent must keep 3 to 1 against the dark panel and 4.5 to 1 under white text, so the dark body must stay nearly black.

## Measured

CSS: 6,975 bytes uncompressed. Lowest text contrast: 5.05 to 1, the white label on the accent pay key, in both themes.
