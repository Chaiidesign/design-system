Checked: 2026-11-13

Method note: each page was fetched on 2026-11-13 through a summarising fetch tool, not read raw. Wording is paraphrased. The Rauno and Jakub pages could not be checked against a second read, so a reviewer should open them directly for exact values. Nothing below describes visual style; only principles and testable rules are kept.

## Rauno Freiberg, Web Interface Guidelines
Source: https://interfaces.rauno.me
- Motion: interaction animations last no more than 200ms. Dialogs scale from about 0.8, not 0. Button press scale is about 0.96 to 0.9. Frequent, low-novelty actions (context menus, adding or deleting list items) get no extra animation. Looping animations pause when off-screen. Theme switches do not animate.
- Hit area: list items have no dead space between them; add padding to the item instead. Decorative glows set pointer-events off. The page gives no minimum pixel size for touch targets (could not find).
- Focus and keyboard: clicking a label focuses its input. Focus rings use box-shadow, not outline, so they follow the radius. Sequential lists move with up and down arrows. Icon-only controls need an aria-label. Disabled buttons carry no tooltip. Dropdown menus open on mousedown.
- Touch: hover styles sit inside @media (hover: hover). Input font size is at least 16px. Do not autofocus on touch devices.
- Feedback and typography: show feedback next to its trigger (inline checkmark for a copy, not a notification). Update optimistically and roll back with feedback on error. Use tabular numbers where layout shift is unwanted. No font weights below 400, and do not change weight on hover.

## Jakub Krehel, details that make interfaces feel better
Source: https://jakub.kr/writing/details-that-make-interfaces-feel-better
- Concentric radius: outer radius equals inner radius plus padding.
- Text: text-wrap balance on titles, pretty on paragraphs. Tabular numbers for changing digits.
- Interruptible motion: use CSS transitions for interactions because they retarget mid-flight; keyframes only for one-time staged sequences.
- Enter animation example: translateY 8px, blur 8px, opacity 0, over 800ms with cubic-bezier(0.25, 0.46, 0.45, 0.94). Stagger is 100ms between sections or 80ms between words. This is a worked example, not a general limit, and it is far longer than the limits in other sources.
- Exits are subtler than enters; the page gives a spring of 0.45s with no bounce.
- Shadows can replace borders; the page gives three-layer light values (0.06, 0.06, 0.04 opacity) and a 0.08 white ring for dark mode. Images get a 1px outline at 10% opacity.
- Optical alignment: less padding on the icon side of an icon-plus-text button. No values given.

## Emil Kowalski
- "You Don't Need Animations": https://emilkowal.ski/ui/you-dont-need-animations. UI animations generally stay under 300ms; a 180ms dropdown feels more responsive than a 400ms one. Animate less as frequency rises; keyboard-initiated actions are never animated. Every animation needs a reason. After one tooltip opens, neighbours open at once with no animation.
- "7 Practical Animation Tips": https://emilkowal.ski/ui/7-practical-animation-tips. Press feedback is scale(0.97) on :active. Entering elements do not start from scale(0); start at 0.9 or higher. Tooltip transition is 0.125s ease-out. Use ease-out for entering and leaving; avoid ease-in. Make popovers scale from their trigger, not from center. Adding blur(2px) can mask an imperfect crossfade.
- Skill standards file: https://raw.githubusercontent.com/emilkowalski/skills/main/skills/review-animations/STANDARDS.md. This is the most test-ready list. Durations: button press 100 to 160ms, tooltips 125 to 200ms, dropdowns 150 to 250ms, modals and drawers 200 to 500ms. Easing by role: ease-out for enter or exit, ease-in-out for on-screen movement, ease for hover, linear for constant motion. Frequency bands: 100+ times a day gets no animation; tens a day gets none or very little. Stagger 30 to 80ms. Animate transform and opacity, not padding, margin, height, width, top or left (clip-path and measured accordion height excepted). Reduced motion removes transform movement but keeps opacity and color. Hover transforms are gated by (hover: hover) and (pointer: fine). Springs keep bounce between 0.1 and 0.3. It says nothing on hit areas.
- animations.dev: https://animations.dev. The public page states no numbers; it describes a paid course. Could not find public rules there.
- ui.land: https://ui.land. The page describes itself as a library of interviews, links, courses and design systems, and states no rules. Could not find any checkable rules.

## design-motion-principles (Kyle Zantos)
Source: https://github.com/kylezantos/design-motion-principles
An open-source skill with Create and Audit modes. It blends three designers' public work (Kowalski for restraint, Krehel for polish, Tompkins for play). The page says the framework is the author's own synthesis and the designers did not endorse it. It gives no durations or easing values on the main page. It lists failure modes: decorative-by-default motion, scale(0) starts, bare ease, missing prefers-reduced-motion, stagger spam, bouncy springs on utility actions. Detailed recipes live in reference files that were not read (not verified).

## Flo Guo, choose your altitude
Source: https://floguo.com/ideas/choose-your-altitude
- Altitude has four levels: system (whole journey and architecture), patterns (flows and components), details (interactions, microcopy, state) and implementation (code, performance, accessibility). Skill is moving between levels on purpose.
- Clay is fast, disposable code for learning. Brick is load-bearing: reviewed, tested, secure and maintained. The risk is mixing them up.

## Figma, what is product design
Source: https://www.figma.com/resource-library/what-is-product-design/
A five-step process (set goals, research, analyze, strategize and plan, execute and launch) and five principles: user-centered, functionality over polish, consistency and coherence, collaboration, iteration over perfection. It gives no numeric rules.

## AI interaction pattern catalogues
- shapeof.ai: https://www.shapeof.ai. Six categories: Wayfinders, Inputs, Tuners, Governors, Trust builders, Identifiers. Examples: Action plan, Citations, Cost estimates, Draft mode, Verification, Consent, Disclosure, Caveat. It states no rules; content is CC-BY-NC-SA.
- aiverse.design: https://aiverse.design. Five phases: Discovering, Instructing, Observing, Refining, Adapting. It claims 300+ examples and 40+ patterns. Example patterns on the home page: Streaming, Processing steps, Citations. No rules stated on the page read.

## For Souvenir
- Worth learning: Kowalski's STANDARDS.md gives duration bands, easing by role, frequency bands and reduced-motion handling that a reviewer can test directly.
- Worth learning: Rauno's list rules (no dead space between items, box-shadow focus rings, aria-label on icon buttons, hover gated by hover media query) are checkable and map to hit area and focus.
- Stay away from: treating one author's numbers as law. Rauno says 200ms or less, Kowalski says under 300ms, and Jakub's enter example is 800ms. Souvenir should pick its own ranges.
- Stay away from: copying shadow, blur or border recipes; they are visual style, not principle.
- Use the AI catalogues as vocabulary for naming patterns (citations, action plan, draft mode), not as rules. Use clay-or-brick to label each piece of work.

## Review 2026-11-13: six claims checked, no corrections.
