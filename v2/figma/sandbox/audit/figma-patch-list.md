# Changes to make by hand in Figma

## Alias changes from overrides

None: no override is ahead of Figma.

## Variables to add

Tokens the repo proposes that Figma does not hold as variables. The snapshot reads variables only: a token Figma already keeps as a style (for example a shadow kept as an effect style) is listed here too; for those, check the style and add a variable only if one is wanted.

Collections these variables go in. Create the missing ones first, each with one mode called default unless the rows below give light and dark.

| Collection | In Figma | Variables to add |
| --- | --- | --- |
| Elevation | create it | 2 |

| Collection | Name | Value per mode | Scopes | Why |
| --- | --- | --- | --- | --- |
| Elevation | shadow/md | light: 0 4px 16px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.08); dark: 0 4px 16px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.4) | EFFECT_FLOAT | Elevation is not started in Figma. A menu on a white page needs more than a faint border to read as above it. |
| Elevation | shadow/lg | light: 0 16px 48px rgb(0 0 0 / 0.18), 0 2px 8px rgb(0 0 0 / 0.08); dark: 0 16px 48px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.4) | EFFECT_FLOAT | Elevation is not started in Figma. |

## Descriptions to set

None: every Figma variable already has a description.
