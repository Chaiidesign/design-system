# Proposed tokens

Tokens the five components need that the Figma files do not hold yet: 25 in `tokens.json`, in six collections
(Border 4, Size 10, Motion 4, Elevation 2, Themes 3, Layer 2). The one-pager says border widths, motion and elevation
"aren't started"; a button cannot be built without a border width, a focus ring and a height, and a dialog or menu
needs a stacking level so a page header with its own z-index cannot paint over it.

They live here, not in Figma, because the Figma files must not be changed. Each carries a description, a reason
(`why`) and the Figma scopes it should get (`scopes`; none for Motion and Layer, because no Figma scope fits a
duration, an easing or a stacking level). The diff tool lists them as "Proposed in the repo, not in Figma" until
someone adds them to Figma or rejects them, and `../audit/figma-patch-list.md` lists each one with its value, scopes
and reason, after the collections they need (Size, Motion, Elevation and Layer do not exist in Figma; Border exists
and is empty). Nothing here overrides a value Figma holds; that is what `../overrides.json` is for.

## Which rule of the naming standard they do not meet

Rule 6, "Every alias points at a primitive", is not met by 23 of the 25. They hold a raw value: border widths,
control and icon sizes, dialog and menu widths, durations, the easing, the two shadows, the two stacking levels and
the overlay colour (`#00000080` light, `#000000b3` dark). Only `border/strong/default` and `border/strong/hover`
alias a primitive.

Why: the primitives they would alias do not exist. Figma has no primitive collection for widths, sizes, durations,
easings, shadows or stacking levels, and no translucent black. Where a raw number equals an existing Space or Radius
primitive (2, 16, 20, 32, 40, 44: nine tokens), that is a coincidence of value, not that primitive's meaning, so the repo does not
point at it. Adding the primitives is the owner's step in Figma; the repo does not invent them. When they exist,
each proposed token becomes an alias and meets rule 6.

The other nine rules: the names follow rules 1 to 5 and 7 (the naming lint reports none of them on the sandbox copy,
where 23 of the 25 exist as variables); every one has a description (rule 9) and scopes where Figma has one that
fits (rule 10). The collections Size, Motion, Elevation and Layer are not in the standard's category list (rule 8);
the lint reports that as a decision for the owner, not a breach. It also lists `border/strong/default` among the
62 tokens whose CSS name drops the word default, a decision the owner's own tokens share.

Check it: `SOUVENIR_SNAPSHOT_DIR=v2/figma/sandbox node v2/tools/lint-tokens.mjs --report-only` (the alias rule lists
21 of them; the two shadows are not variables in the sandbox).
