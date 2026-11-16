# Changes to make by hand in Figma

## Alias changes from overrides

- Themes, text/secondary, light: change alias from neutral/light/700 to neutral/light/800. Contrast: worst pair was 3.79 to 1 (text/secondary on surface/tertiary/active (text-on-base)); with this step the worst is 5.81 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/placeholder, light: change alias from neutral/light/500 to neutral/light/700. Contrast: worst pair was 3.05 to 1 (text/placeholder on surface/secondary/default (placeholder-on-base)); with this step the worst is 4.8 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/placeholder, dark: change alias from neutral/dark/500 to neutral/dark/600. Contrast: worst pair was 3.93 to 1 (text/placeholder on surface/secondary/default (placeholder-on-base)); with this step the worst is 5.36 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/link/default, light: change alias from pink/600 to pink/800. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/link/default, dark: change alias from pink/400 to pink/300. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/link/hover, light: change alias from pink/700 to pink/900. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/link/hover, dark: change alias from pink/300 to pink/200. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/link/active, light: change alias from pink/800 to pink/950. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/link/active, dark: change alias from pink/300 to pink/100. Links must pass on all three surface tiers; the one-pager lists 'pink links on secondary and tertiary surfaces' as an open failure. Default, hover and active stay three different steps.
- Themes, text/error, light: change alias from red/600 to red/700. Contrast: worst pair was 3.59 to 1 (text/error on surface/tertiary/active (text-on-base)); with this step the worst is 4.81 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/error, dark: change alias from red/400 to red/300. Contrast: worst pair was 3.81 to 1 (text/error on surface/tertiary/active (text-on-base)); with this step the worst is 5.56 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/success, light: change alias from green/600 to green/800. Contrast: worst pair was 2.45 to 1 (text/success on surface/tertiary/active (text-on-base)); with this step the worst is 5.3 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/warning, light: change alias from amber/600 to amber/800. Contrast: worst pair was 2.37 to 1 (text/warning on surface/tertiary/active (text-on-base)); with this step the worst is 5.27 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/info, light: change alias from blue/600 to blue/700. Contrast: worst pair was 3.84 to 1 (text/info on surface/tertiary/active (text-on-base)); with this step the worst is 4.98 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/info, dark: change alias from blue/400 to blue/300. Contrast: worst pair was 4.15 to 1 (text/info on surface/tertiary/active (text-on-base)); with this step the worst is 5.85 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/success, light: change alias from green/600 to green/700. Contrast: worst pair was 2.91 to 1 (icon/success on surface/tertiary/default (icon-on-base)); with this step the worst is 4.44 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/warning, light: change alias from amber/600 to amber/700. Contrast: worst pair was 2.82 to 1 (icon/warning on surface/tertiary/default (icon-on-base)); with this step the worst is 4.44 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, interactive/primary/active, light: change alias from pink/900 to pink/950. One job per token: pressed was the same colour as hover, so a press gave no feedback.
- Themes, interactive/primary/active, dark: change alias from pink/700 to pink/800. One job per token: pressed was the same colour as hover, so a press gave no feedback.
- Themes, border/success, light: change alias from green/600 to green/700. The edge of a success message or field must reach 3 to 1 on all three surface tiers. green/600 is 2.91 to 1 on the third tier; green/700 is the nearest step that passes.
- Themes, border/warning, light: change alias from amber/600 to amber/700. Contrast: worst pair was 3 to 1 (border/warning on surface/secondary/default (status-and-brand-borders)); with this step the worst is 4.73 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/teal/default, light: change alias from teal/600 to teal/800. Contrast: worst pair was 2.97 to 1 (text/accent/teal/default on surface/accent/teal/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 6.02 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/teal/default, dark: change alias from teal/700 to teal/300. Contrast: worst pair was 1.39 to 1 (text/accent/teal/default on surface/accent/teal/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.13 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/teal/default, dark: change alias from teal/700 to teal/500. Contrast: worst pair was 1.73 to 1 (icon/accent/teal/default on surface/accent/teal/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 3.81 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/teal/bold, dark: change alias from teal/900 to teal/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/blue/default, light: change alias from blue/600 to blue/700. Contrast: worst pair was 3.64 to 1 (text/accent/blue/default on surface/accent/blue/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 4.72 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/blue/default, dark: change alias from blue/700 to blue/300. Contrast: worst pair was 1.3 to 1 (text/accent/blue/default on surface/accent/blue/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 4.84 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/blue/default, dark: change alias from blue/700 to blue/400. Contrast: worst pair was 1.55 to 1 (icon/accent/blue/default on surface/accent/blue/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 4.07 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/blue/bold, dark: change alias from blue/900 to blue/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/violet/default, light: change alias from violet/600 to violet/700. Contrast: worst pair was 4.1 to 1 (text/accent/violet/default on surface/accent/violet/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.12 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/violet/default, dark: change alias from violet/700 to violet/300. Contrast: worst pair was 1.26 to 1 (text/accent/violet/default on surface/accent/violet/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 4.87 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/violet/default, dark: change alias from violet/700 to violet/400. Contrast: worst pair was 1.54 to 1 (icon/accent/violet/default on surface/accent/violet/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 4.03 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/violet/bold, dark: change alias from violet/900 to violet/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/amber/default, light: change alias from amber/600 to amber/800. Contrast: worst pair was 2.56 to 1 (text/accent/amber/default on surface/accent/amber/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.69 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/amber/default, dark: change alias from amber/700 to amber/300. Contrast: worst pair was 1.41 to 1 (text/accent/amber/default on surface/accent/amber/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 4.92 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/amber/default, light: change alias from amber/600 to amber/700. Contrast: worst pair was 2.86 to 1 (icon/accent/amber/default on surface/accent/amber/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 4.51 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/amber/default, dark: change alias from amber/700 to amber/500. Contrast: worst pair was 1.81 to 1 (icon/accent/amber/default on surface/accent/amber/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 4.22 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/amber/bold, dark: change alias from amber/900 to amber/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/pink/default, light: change alias from pink/600 to pink/800. Contrast: worst pair was 3.33 to 1 (text/accent/pink/default on surface/accent/pink/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.7 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/pink/default, dark: change alias from pink/700 to pink/200. Contrast: worst pair was 1.31 to 1 (text/accent/pink/default on surface/accent/pink/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.7 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/pink/default, dark: change alias from pink/700 to pink/400. Contrast: worst pair was 1.6 to 1 (icon/accent/pink/default on surface/accent/pink/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 3.64 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/pink/bold, dark: change alias from pink/900 to pink/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/green/default, light: change alias from green/600 to green/800. Contrast: worst pair was 2.72 to 1 (text/accent/green/default on surface/accent/green/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.88 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/green/default, dark: change alias from green/700 to green/300. Contrast: worst pair was 1.42 to 1 (text/accent/green/default on surface/accent/green/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.08 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/green/default, dark: change alias from green/700 to green/500. Contrast: worst pair was 1.82 to 1 (icon/accent/green/default on surface/accent/green/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 4 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/green/bold, dark: change alias from green/900 to green/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/orange/default, light: change alias from orange/600 to orange/800. Contrast: worst pair was 2.63 to 1 (text/accent/orange/default on surface/accent/orange/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.4 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/orange/default, dark: change alias from orange/700 to orange/200. Contrast: worst pair was 1.41 to 1 (text/accent/orange/default on surface/accent/orange/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.4 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/orange/default, dark: change alias from orange/700 to orange/500. Contrast: worst pair was 1.81 to 1 (icon/accent/orange/default on surface/accent/orange/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 3.34 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/orange/bold, dark: change alias from orange/900 to orange/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/red/default, light: change alias from red/600 to red/800. Contrast: worst pair was 3.34 to 1 (text/accent/red/default on surface/accent/red/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.74 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/red/default, dark: change alias from red/700 to red/200. Contrast: worst pair was 1.28 to 1 (text/accent/red/default on surface/accent/red/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 5.74 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/red/default, dark: change alias from red/700 to red/400. Contrast: worst pair was 1.55 to 1 (icon/accent/red/default on surface/accent/red/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 3.62 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/red/bold, dark: change alias from red/900 to red/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, text/accent/rose/default, light: change alias from rose/600 to rose/800. Contrast: worst pair was 2.94 to 1 (text/accent/rose/default on surface/accent/rose/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 6.06 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, text/accent/rose/default, dark: change alias from rose/700 to rose/200. Contrast: worst pair was 1.46 to 1 (text/accent/rose/default on surface/accent/rose/subtle/hover (accent-text-on-accent-surface)); with this step the worst is 6.06 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/rose/default, dark: change alias from rose/700 to rose/500. Contrast: worst pair was 2.02 to 1 (icon/accent/rose/default on surface/accent/rose/subtle/default (accent-icon-on-accent-surface)); with this step the worst is 3.44 to 1. Nearest step on the same ramp that passes every declared pair.
- Themes, icon/accent/rose/bold, dark: change alias from rose/900 to rose/300. The bold surface is the same in both modes, so the icon on it must be too. In dark it was the 900 step on a 700 or 900 surface, as low as 1 to 1. It now takes the value light already has.
- Themes, surface/accent/teal/bold/default, light: change alias from teal/700 to teal/800. teal/100 text on the teal/600 hover surface fails 4.5 to 1. The surface moves one step darker at rest (800) and hover takes the old resting step (700), so hover still goes lighter, as in the other eight accent families.
- Themes, surface/accent/teal/bold/default, dark: change alias from teal/700 to teal/800. teal/100 text on the teal/600 hover surface fails 4.5 to 1. The surface moves one step darker at rest (800) and hover takes the old resting step (700), so hover still goes lighter, as in the other eight accent families.
- Themes, surface/accent/teal/bold/hover, light: change alias from teal/600 to teal/700. Hover of the bold teal surface: one step lighter than rest, as in the other accent families.
- Themes, surface/accent/teal/bold/hover, dark: change alias from teal/600 to teal/700. Hover of the bold teal surface: one step lighter than rest, as in the other accent families.
- Themes, surface/accent/blue/bold/default, light: change alias from blue/700 to blue/800. blue/100 text on the blue/600 hover surface fails 4.5 to 1. The surface moves one step darker at rest (800) and hover takes the old resting step (700), so hover still goes lighter, as in the other eight accent families.
- Themes, surface/accent/blue/bold/default, dark: change alias from blue/700 to blue/800. blue/100 text on the blue/600 hover surface fails 4.5 to 1. The surface moves one step darker at rest (800) and hover takes the old resting step (700), so hover still goes lighter, as in the other eight accent families.
- Themes, surface/accent/blue/bold/hover, light: change alias from blue/600 to blue/700. Hover of the bold blue surface: one step lighter than rest, as in the other accent families.
- Themes, surface/accent/blue/bold/hover, dark: change alias from blue/600 to blue/700. Hover of the bold blue surface: one step lighter than rest, as in the other accent families.
- Themes, surface/accent/neutral/subtle/default, dark: change alias from neutral/dark/700 to neutral/dark/300. In dark the subtle neutral surface was neutral/dark/700, a light grey, with text of the same step on it: 1 to 1. The surface now mirrors light (a low step) and the text and icon sit high on the ramp.
- Themes, surface/accent/neutral/subtle/hover, dark: change alias from neutral/dark/600 to neutral/dark/350. In dark the subtle neutral surface was neutral/dark/700, a light grey, with text of the same step on it: 1 to 1. The surface now mirrors light (a low step) and the text and icon sit high on the ramp.
- Themes, text/accent/neutral/default, light: change alias from neutral/light/600 to neutral/light/900. Contrast on the subtle neutral surfaces.
- Themes, text/accent/neutral/default, dark: change alias from neutral/dark/700 to neutral/dark/900. In dark the subtle neutral surface was neutral/dark/700, a light grey, with text of the same step on it: 1 to 1. The surface now mirrors light (a low step) and the text and icon sit high on the ramp.
- Themes, icon/accent/neutral/default, light: change alias from neutral/light/600 to neutral/light/700. Contrast on the subtle neutral surfaces.
- Themes, icon/accent/neutral/default, dark: change alias from neutral/dark/700 to neutral/dark/800. In dark the subtle neutral surface was neutral/dark/700, a light grey, with text of the same step on it: 1 to 1. The surface now mirrors light (a low step) and the text and icon sit high on the ramp.
- Themes, text/brand, dark: change alias from pink/600 to pink/300. Contrast: worst pair was 2.3 to 1 (text/brand on surface/tertiary/active (text-on-base)); with this step the worst is 5.82 to 1. Nearest step on the same ramp that passes every declared pair.

## Variables to add

Tokens the repo proposes that Figma does not hold as variables. The snapshot reads variables only: a token Figma already keeps as a style (for example a shadow kept as an effect style) is listed here too; for those, check the style and add a variable only if one is wanted.

Collections these variables go in. Create the missing ones first, each with one mode called default unless the rows below give light and dark.

| Collection | In Figma | Variables to add |
| --- | --- | --- |
| Border | exists, empty | 4 |
| Size | create it | 10 |
| Motion | create it | 4 |
| Elevation | create it | 2 |
| Themes | exists (171 variables) | 3 |
| Layer | create it | 2 |

| Collection | Name | Value per mode | Scopes | Why |
| --- | --- | --- | --- | --- |
| Border | width/sm | default: 1 | STROKE_FLOAT | The Border collection is empty. Every control needs an edge width. |
| Border | width/md | default: 2 | STROKE_FLOAT | A state shown only by a colour change of a 1 pixel line is easy to miss. |
| Border | ring/width | default: 2 | STROKE_FLOAT | WCAG 2.4.13 measures a focus indicator against a 2 pixel perimeter. |
| Border | ring/offset | default: 2 | GAP | The gap keeps the blue ring readable beside a pink or black fill. |
| Size | control/sm | default: 32 | WIDTH_HEIGHT | Radius has height/32, so a 32 pixel control exists in the design; nothing names its height. |
| Size | control/md | default: 40 | WIDTH_HEIGHT | Radius has height/40. |
| Size | control/lg | default: 44 | WIDTH_HEIGHT | Radius has height/44. |
| Size | target/min | default: 44 | WIDTH_HEIGHT | 32 and 40 pixel controls are small for a thumb. WCAG 2.2 AA asks 24; Apple and WCAG AAA ask 44. |
| Size | icon/sm | default: 16 | WIDTH_HEIGHT | No icon size token exists. |
| Size | icon/md | default: 20 | WIDTH_HEIGHT | No icon size token exists. |
| Size | dialog/sm | default: 400 | WIDTH_HEIGHT | A dialog needs a maximum width. |
| Size | dialog/md | default: 560 | WIDTH_HEIGHT | A dialog needs a maximum width. |
| Size | menu/min | default: 192 | WIDTH_HEIGHT | A menu narrower than its trigger looks broken. |
| Size | menu/max | default: 320 | WIDTH_HEIGHT | Long item text must wrap, not run off the screen. |
| Motion | duration/fast | default: 100ms | none (no Figma scope fits) | Motion is not started in Figma. |
| Motion | duration/enter | default: 160ms | none (no Figma scope fits) | Motion is not started in Figma. Named for its job, because the standard keeps size words such as base out of names. |
| Motion | duration/spin | default: 800ms | none (no Figma scope fits) | The Button pilot had to multiply another duration by five to turn its spinner. A loop needs its own token. |
| Motion | ease/standard | default: cubic-bezier(0.2, 0, 0, 1) | none (no Figma scope fits) | Motion is not started in Figma. |
| Elevation | shadow/md | light: 0 4px 16px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.08); dark: 0 4px 16px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.4) | EFFECT_FLOAT | Elevation is not started in Figma. A menu on a white page needs more than a faint border to read as above it. |
| Elevation | shadow/lg | light: 0 16px 48px rgb(0 0 0 / 0.18), 0 2px 8px rgb(0 0 0 / 0.08); dark: 0 16px 48px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.4) | EFFECT_FLOAT | Elevation is not started in Figma. |
| Themes | surface/overlay | light: #00000080; dark: #000000b3 | FRAME_FILL, SHAPE_FILL | No token dims the page behind a dialog. |
| Themes | border/strong/default | light: neutral/light/600 (#7d818a); dark: neutral/dark/500 (#7e8188) | STROKE_COLOR | border/primary is 1.35 to 1 against the page in light. WCAG 1.4.11 asks 3 to 1 for the edge of a control. This step reaches 3 to 1 on all three surface tiers, not only the first two. The naming standard's own example is 'add border/strong at 3:1'. |
| Themes | border/strong/hover | light: neutral/light/700 (#6b6e76); dark: neutral/dark/700 (#a9abaf) | STROKE_COLOR | Goes with border/strong/default. |
| Layer | overlay | default: 1000 | none (no Figma scope fits) | A page element with any z-index painted over an open dialog: nothing set the dialog's level. |
| Layer | popover | default: 1100 | none (no Figma scope fits) | A page element with any z-index painted over an open menu. |

## Descriptions to set

290 Figma variables have an empty description. Paste the text into each variable's description field. Source is where the text comes from (ds-tokens/descriptions.json): owner, drafted or proposed.

### Themes (171)

| Name | Description to paste | Source |
| --- | --- | --- |
| text/primary | Body text and headings on any surface. | drafted |
| text/secondary | Supporting text, such as hints and details, on any surface. | drafted |
| text/placeholder | Placeholder text inside an empty field. | drafted |
| text/disabled | Text of a control that cannot be used. | drafted |
| text/inverse | Text on an inverse surface, such as a tooltip. | drafted |
| text/on | Text on a bold brand or action fill, such as a primary button. | drafted |
| text/link/default | A link at rest. | drafted |
| text/link/hover | A link under the pointer. | drafted |
| text/link/active | A link while it is pressed. | drafted |
| text/error | Text that reports an error, such as a field message. | drafted |
| text/success | Text that confirms something worked. | drafted |
| text/warning | Text that warns before something goes wrong. | drafted |
| text/info | Text that gives neutral information or a tip. | drafted |
| icon/primary | Icons that sit beside body text. | drafted |
| icon/secondary | Supporting icons, such as a chevron or a hint. | drafted |
| icon/disabled | An icon in a control that cannot be used. | drafted |
| icon/inverse | An icon on an inverse surface, such as a tooltip. | drafted |
| icon/on | An icon on a bold brand or action fill. | drafted |
| icon/brand | An icon in the brand colour. | drafted |
| icon/error | An icon that marks an error. | drafted |
| icon/success | An icon that marks success. | drafted |
| icon/warning | An icon that marks a warning. | drafted |
| icon/info | An icon that marks information. | drafted |
| surface/primary/default | The page and card background. | drafted |
| surface/primary/hover | A row or item on the page under the pointer. | drafted |
| surface/primary/active | A row or item on the page while it is pressed. | drafted |
| surface/primary/disabled | A row or item on the page when it cannot be used. | drafted |
| surface/secondary/default | A grouped area on the page, such as a field or a panel. | drafted |
| surface/secondary/hover | A grouped area under the pointer. | drafted |
| surface/secondary/active | A grouped area while it is pressed. | drafted |
| surface/secondary/disabled | A grouped area when it cannot be used. | drafted |
| surface/tertiary/default | A nested area inside a grouped area, such as a chip. | drafted |
| surface/tertiary/hover | A nested area under the pointer. | drafted |
| surface/tertiary/active | A nested area while it is pressed. | drafted |
| surface/tertiary/disabled | A nested area when it cannot be used. | drafted |
| surface/error | The background of an error message or banner. | drafted |
| surface/success | The background of a success message or banner. | drafted |
| surface/warning | The background of a warning message or banner. | drafted |
| surface/info | The background of an information message or banner. | drafted |
| interactive/primary/default | The fill of the main action button. | drafted |
| interactive/primary/hover | The main action button under the pointer. | drafted |
| interactive/primary/active | The main action button while it is pressed. | drafted |
| interactive/primary/disabled | The main action button when it cannot be used. | drafted |
| interactive/neutral/default | The fill of a neutral button, such as Cancel. | drafted |
| interactive/neutral/hover | A neutral button under the pointer. | drafted |
| interactive/neutral/active | A neutral button while it is pressed. | drafted |
| interactive/neutral/disabled | A neutral button when it cannot be used. | drafted |
| interactive/secondary/default | The fill of a secondary button. | drafted |
| interactive/secondary/hover | A secondary button under the pointer. | drafted |
| interactive/secondary/active | A secondary button while it is pressed. | drafted |
| interactive/secondary/disabled | A secondary button when it cannot be used. | drafted |
| interactive/error/default | The fill of a destructive action button, such as Delete. | drafted |
| interactive/error/hover | A destructive action button under the pointer. | drafted |
| interactive/success/default | The fill of a confirming action button. | drafted |
| interactive/success/hover | A confirming action button under the pointer. | drafted |
| interactive/warning/default | The fill of a button for an action that needs care. | drafted |
| interactive/warning/hover | A button for an action that needs care under the pointer. | drafted |
| border/primary/default | The edge of a card, divider or container. | drafted |
| border/secondary | A quieter edge, such as a divider inside a card. | drafted |
| border/primary/hover | The edge of a card or container under the pointer. | drafted |
| border/primary/active | The edge of a card or container while it is pressed. | drafted |
| border/primary/disabled | The edge of a card or container when it cannot be used. | drafted |
| border/focus | The ring around whatever has keyboard focus. | drafted |
| border/info | The edge of an information message. | drafted |
| border/error | The edge of a field with an error, or of an error message. | drafted |
| border/success | The edge of a success message. | drafted |
| border/warning | The edge of a warning message. | drafted |
| text/accent/teal/default | Teal text on a teal accent surface, such as a tag. | drafted |
| text/accent/teal/bold | Stronger teal text, for emphasis on a teal accent surface. | drafted |
| icon/accent/teal/default | A teal icon on a teal accent surface. | drafted |
| icon/accent/teal/bold | A stronger teal icon on a teal accent surface. | drafted |
| text/accent/blue/default | Blue text on a blue accent surface, such as a tag. | drafted |
| text/accent/blue/bold | Stronger blue text, for emphasis on a blue accent surface. | drafted |
| icon/accent/blue/default | A blue icon on a blue accent surface. | drafted |
| icon/accent/blue/bold | A stronger blue icon on a blue accent surface. | drafted |
| text/accent/violet/default | Violet text on a violet accent surface, such as a tag. | drafted |
| text/accent/violet/bold | Stronger violet text, for emphasis on a violet accent surface. | drafted |
| icon/accent/violet/default | A violet icon on a violet accent surface. | drafted |
| icon/accent/violet/bold | A stronger violet icon on a violet accent surface. | drafted |
| text/accent/amber/default | Amber text on an amber accent surface, such as a tag. | drafted |
| text/accent/amber/bold | Stronger amber text, for emphasis on an amber accent surface. | drafted |
| icon/accent/amber/default | An amber icon on an amber accent surface. | drafted |
| icon/accent/amber/bold | A stronger amber icon on an amber accent surface. | drafted |
| text/accent/pink/default | Pink text on a pink accent surface, such as a tag. | drafted |
| text/accent/pink/bold | Stronger pink text, for emphasis on a pink accent surface. | drafted |
| icon/accent/pink/default | A pink icon on a pink accent surface. | drafted |
| icon/accent/pink/bold | A stronger pink icon on a pink accent surface. | drafted |
| text/accent/green/default | Green text on a green accent surface, such as a tag. | drafted |
| text/accent/green/bold | Stronger green text, for emphasis on a green accent surface. | drafted |
| icon/accent/green/default | A green icon on a green accent surface. | drafted |
| icon/accent/green/bold | A stronger green icon on a green accent surface. | drafted |
| text/accent/orange/default | Orange text on an orange accent surface, such as a tag. | drafted |
| text/accent/orange/bold | Stronger orange text, for emphasis on an orange accent surface. | drafted |
| icon/accent/orange/default | An orange icon on an orange accent surface. | drafted |
| icon/accent/orange/bold | A stronger orange icon on an orange accent surface. | drafted |
| text/accent/red/default | Red text on a red accent surface, such as a tag. | drafted |
| text/accent/red/bold | Stronger red text, for emphasis on a red accent surface. | drafted |
| icon/accent/red/default | A red icon on a red accent surface. | drafted |
| icon/accent/red/bold | A stronger red icon on a red accent surface. | drafted |
| text/accent/rose/default | Rose text on a rose accent surface, such as a tag. | drafted |
| text/accent/rose/bold | Stronger rose text, for emphasis on a rose accent surface. | drafted |
| icon/accent/rose/default | A rose icon on a rose accent surface. | drafted |
| icon/accent/rose/bold | A stronger rose icon on a rose accent surface. | drafted |
| surface/accent/teal/subtlest/default | The faintest teal background, for a large tinted area. | drafted |
| surface/accent/teal/subtlest/hover | The faintest teal background under the pointer. | drafted |
| surface/accent/teal/subtle/default | A light teal background, such as a tag or badge. | drafted |
| surface/accent/teal/subtle/hover | A light teal background under the pointer. | drafted |
| surface/accent/teal/bold/default | A strong teal background, such as a solid tag. | drafted |
| surface/accent/teal/bold/hover | A strong teal background under the pointer. | drafted |
| surface/accent/blue/subtlest/default | The faintest blue background, for a large tinted area. | drafted |
| surface/accent/blue/subtlest/hover | The faintest blue background under the pointer. | drafted |
| surface/accent/blue/subtle/default | A light blue background, such as a tag or badge. | drafted |
| surface/accent/blue/subtle/hover | A light blue background under the pointer. | drafted |
| surface/accent/blue/bold/default | A strong blue background, such as a solid tag. | drafted |
| surface/accent/blue/bold/hover | A strong blue background under the pointer. | drafted |
| surface/accent/violet/subtlest/default | The faintest violet background, for a large tinted area. | drafted |
| surface/accent/violet/subtlest/hover | The faintest violet background under the pointer. | drafted |
| surface/accent/violet/subtle/default | A light violet background, such as a tag or badge. | drafted |
| surface/accent/violet/subtle/hover | A light violet background under the pointer. | drafted |
| surface/accent/violet/bold/default | A strong violet background, such as a solid tag. | drafted |
| surface/accent/violet/bold/hover | A strong violet background under the pointer. | drafted |
| surface/accent/amber/subtlest/default | The faintest amber background, for a large tinted area. | drafted |
| surface/accent/amber/subtlest/hover | The faintest amber background under the pointer. | drafted |
| surface/accent/amber/subtle/default | A light amber background, such as a tag or badge. | drafted |
| surface/accent/amber/subtle/hover | A light amber background under the pointer. | drafted |
| surface/accent/amber/bold/default | A strong amber background, such as a solid tag. | drafted |
| surface/accent/amber/bold/hover | A strong amber background under the pointer. | drafted |
| surface/accent/pink/subtlest/default | The faintest pink background, for a large tinted area. | drafted |
| surface/accent/pink/subtlest/hover | The faintest pink background under the pointer. | drafted |
| surface/accent/pink/subtle/default | A light pink background, such as a tag or badge. | drafted |
| surface/accent/pink/subtle/hover | A light pink background under the pointer. | drafted |
| surface/accent/pink/bold/default | A strong pink background, such as a solid tag. | drafted |
| surface/accent/pink/bold/hover | A strong pink background under the pointer. | drafted |
| surface/accent/green/subtlest/default | The faintest green background, for a large tinted area. | drafted |
| surface/accent/green/subtlest/hover | The faintest green background under the pointer. | drafted |
| surface/accent/green/subtle/default | A light green background, such as a tag or badge. | drafted |
| surface/accent/green/subtle/hover | A light green background under the pointer. | drafted |
| surface/accent/green/bold/default | A strong green background, such as a solid tag. | drafted |
| surface/accent/green/bold/hover | A strong green background under the pointer. | drafted |
| surface/accent/orange/subtlest/default | The faintest orange background, for a large tinted area. | drafted |
| surface/accent/orange/subtlest/hover | The faintest orange background under the pointer. | drafted |
| surface/accent/orange/subtle/default | A light orange background, such as a tag or badge. | drafted |
| surface/accent/orange/subtle/hover | A light orange background under the pointer. | drafted |
| surface/accent/orange/bold/default | A strong orange background, such as a solid tag. | drafted |
| surface/accent/orange/bold/hover | A strong orange background under the pointer. | drafted |
| surface/accent/red/subtlest/default | The faintest red background, for a large tinted area. | drafted |
| surface/accent/red/subtlest/hover | The faintest red background under the pointer. | drafted |
| surface/accent/red/subtle/default | A light red background, such as a tag or badge. | drafted |
| surface/accent/red/subtle/hover | A light red background under the pointer. | drafted |
| surface/accent/red/bold/default | A strong red background, such as a solid tag. | drafted |
| surface/accent/red/bold/hover | A strong red background under the pointer. | drafted |
| surface/accent/rose/subtlest/default | The faintest rose background, for a large tinted area. | drafted |
| surface/accent/rose/subtlest/hover | The faintest rose background under the pointer. | drafted |
| surface/accent/rose/subtle/default | A light rose background, such as a tag or badge. | drafted |
| surface/accent/rose/subtle/hover | A light rose background under the pointer. | drafted |
| surface/accent/rose/bold/default | A strong rose background, such as a solid tag. | drafted |
| surface/accent/rose/bold/hover | A strong rose background under the pointer. | drafted |
| surface/accent/neutral/subtlest/default | The faintest neutral background, for a large tinted area. | drafted |
| surface/accent/neutral/subtlest/hover | The faintest neutral background under the pointer. | drafted |
| surface/accent/neutral/subtle/default | A light neutral background, such as a tag or badge. | drafted |
| surface/accent/neutral/subtle/hover | A light neutral background under the pointer. | drafted |
| surface/accent/neutral/bold/default | A strong neutral background, such as a solid tag. | drafted |
| surface/accent/neutral/bold/hover | A strong neutral background under the pointer. | drafted |
| text/accent/neutral/default | Neutral text on a neutral accent surface, such as a tag. | drafted |
| text/accent/neutral/bold | Stronger neutral text, for emphasis on a neutral accent surface. | drafted |
| icon/accent/neutral/default | A neutral icon on a neutral accent surface. | drafted |
| icon/accent/neutral/bold | A stronger neutral icon on a neutral accent surface. | drafted |
| text/brand | Text in the brand colour, such as a highlighted word. | drafted |
| border/brand | A brand edge, such as a selected card. | drafted |
| surface/brand/subtle | A light brand background, such as a selected item or a promotion. | drafted |
| surface/brand/bold | A strong brand background, such as a banner. | drafted |

### Typography (36)

| Name | Description to paste | Source |
| --- | --- | --- |
| font-size/heading-1 | Font size of a level 1 heading, the page title. | drafted |
| font-size/heading-2 | Font size of a level 2 heading. | drafted |
| font-size/heading-3 | Font size of a level 3 heading. | drafted |
| font-size/heading-4 | Font size of a level 4 heading. | drafted |
| font-size/heading-5 | Font size of a level 5 heading. | drafted |
| font-size/heading-6 | Font size of a level 6 heading, the smallest. | drafted |
| font-size/section-label-base | Font size of a section label, the small heading above a group of items. | drafted |
| font-size/label-large | Font size of a label on a large control. | drafted |
| font-size/label-base | Font size of a label on a default control. | drafted |
| font-size/label-small | Font size of a label on a small control or tag. | drafted |
| font-size/label-xsmall | Font size of the smallest labels, such as a badge count. | drafted |
| font-size/body-large | Font size of large body text, such as an introduction. | drafted |
| font-size/body-base | Font size of body text. | drafted |
| font-size/body-small | Font size of small body text, such as help text or a caption. | drafted |
| font-size/body-xsmall | Font size of the smallest body text, such as a legal note. | drafted |
| line-height/heading-1 | Line height of a level 1 heading, the page title. | drafted |
| line-height/heading-2 | Line height of a level 2 heading. | drafted |
| line-height/heading-3 | Line height of a level 3 heading. | drafted |
| line-height/heading-4 | Line height of a level 4 heading. | drafted |
| line-height/heading-5 | Line height of a level 5 heading. | drafted |
| line-height/heading-6 | Line height of a level 6 heading, the smallest. | drafted |
| line-height/section-label-base | Line height of a section label, the small heading above a group of items. | drafted |
| line-height/label-large | Line height of a label on a large control. | drafted |
| line-height/label-base | Line height of a label on a default control. | drafted |
| line-height/label-small | Line height of a label on a small control or tag. | drafted |
| line-height/label-xsmall | Line height of the smallest labels, such as a badge count. | drafted |
| line-height/body-large | Line height of large body text, such as an introduction. | drafted |
| line-height/body-base | Line height of body text. | drafted |
| line-height/body-small | Line height of small body text, such as help text or a caption. | drafted |
| line-height/body-xsmall | Line height of the smallest body text, such as a legal note. | drafted |
| font-weight/heading | Weight of every heading. | drafted |
| font-weight/section-label-base | Weight of a section label. | drafted |
| font-weight/label | Weight of labels on controls. | drafted |
| font-weight/body | Weight of body text. | drafted |
| font-weight/emphasis | Weight of emphasised words inside body text. | drafted |
| font-family/sans | The typeface for all interface text. | drafted |

### Radius (12)

| Name | Description to paste | Source |
| --- | --- | --- |
| height/16 | Corners of a control 16 pixels tall. | drafted |
| height/20 | Corners of a control 20 pixels tall. | drafted |
| height/24 | Corners of a control 24 pixels tall. | drafted |
| height/28 | Corners of a control 28 pixels tall. | drafted |
| height/36 | Corners of a control 36 pixels tall. | drafted |
| height/44 | Corners of a control 44 pixels tall. | drafted |
| container/small | Corners of a small container, such as a tag or tooltip. | drafted |
| container/medium | Corners of a card or menu. | drafted |
| container/large | Corners of a dialog or sheet. | drafted |
| round/full | A fully round corner, for pills and circles. | drafted |
| height/32 | Corners of a control 32 pixels tall. | drafted |
| height/40 | Corners of a control 40 pixels tall. | drafted |

### Density (26)

| Name | Description to paste | Source |
| --- | --- | --- |
| scaled/400 | Step 400 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/320 | Step 320 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/280 | Step 280 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/240 | Step 240 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/200 | Step 200 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/160 | Step 160 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/120 | Step 120 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/100 | Step 100 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/80 | Step 80 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/60 | Step 60 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/40 | Step 40 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/20 | Step 20 of the spacing that tightens in compact density, for padding and gaps inside components. | drafted |
| scaled/0 | No space, in any density. | drafted |
| static/400 | Step 400 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/320 | Step 320 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/280 | Step 280 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/240 | Step 240 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/200 | Step 200 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/160 | Step 160 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/120 | Step 120 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/100 | Step 100 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/80 | Step 80 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/60 | Step 60 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/40 | Step 40 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/20 | Step 20 of the spacing that stays the same in every density, for layout between components. | drafted |
| static/0 | No space, in any density. | drafted |

### Surface Gradients (45)

| Name | Description to paste | Source |
| --- | --- | --- |
| red/base-start | Start colour of the red gradient background. | drafted |
| red/base-end | End colour of the red gradient background. | drafted |
| red/glow-warm | The warm glow laid over the red gradient. | drafted |
| red/glow | The main glow laid over the red gradient. | drafted |
| red/text | Text on the red gradient. | drafted |
| orange/base-start | Start colour of the orange gradient background. | drafted |
| orange/base-end | End colour of the orange gradient background. | drafted |
| orange/glow-warm | The warm glow laid over the orange gradient. | drafted |
| orange/glow | The main glow laid over the orange gradient. | drafted |
| orange/text | Text on the orange gradient. | drafted |
| amber/base-start | Start colour of the amber gradient background. | drafted |
| amber/base-end | End colour of the amber gradient background. | drafted |
| amber/glow-warm | The warm glow laid over the amber gradient. | drafted |
| amber/glow | The main glow laid over the amber gradient. | drafted |
| amber/text | Text on the amber gradient. | drafted |
| green/base-start | Start colour of the green gradient background. | drafted |
| green/base-end | End colour of the green gradient background. | drafted |
| green/glow-warm | The warm glow laid over the green gradient. | drafted |
| green/glow | The main glow laid over the green gradient. | drafted |
| green/text | Text on the green gradient. | drafted |
| teal/base-start | Start colour of the teal gradient background. | drafted |
| teal/base-end | End colour of the teal gradient background. | drafted |
| teal/glow-warm | The warm glow laid over the teal gradient. | drafted |
| teal/glow | The main glow laid over the teal gradient. | drafted |
| teal/text | Text on the teal gradient. | drafted |
| blue/base-start | Start colour of the blue gradient background. | drafted |
| blue/base-end | End colour of the blue gradient background. | drafted |
| blue/glow-warm | The warm glow laid over the blue gradient. | drafted |
| blue/glow | The main glow laid over the blue gradient. | drafted |
| blue/text | Text on the blue gradient. | drafted |
| violet/base-start | Start colour of the violet gradient background. | drafted |
| violet/base-end | End colour of the violet gradient background. | drafted |
| violet/glow-warm | The warm glow laid over the violet gradient. | drafted |
| violet/glow | The main glow laid over the violet gradient. | drafted |
| violet/text | Text on the violet gradient. | drafted |
| pink/base-start | Start colour of the pink gradient background. | drafted |
| pink/base-end | End colour of the pink gradient background. | drafted |
| pink/glow-warm | The warm glow laid over the pink gradient. | drafted |
| pink/glow | The main glow laid over the pink gradient. | drafted |
| pink/text | Text on the pink gradient. | drafted |
| rose/base-start | Start colour of the rose gradient background. | drafted |
| rose/base-end | End colour of the rose gradient background. | drafted |
| rose/glow-warm | The warm glow laid over the rose gradient. | drafted |
| rose/glow | The main glow laid over the rose gradient. | drafted |
| rose/text | Text on the rose gradient. | drafted |
