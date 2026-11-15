# Review of the three visual directions on two screens

Fresh-context Fable reviewer, run on 14 to 15 November 2026 for work item 2.1. The reviewer drove the browser itself; every number is its own measurement from the rendered pages. Method adapted from the ui-review skill the CEO supplied: measured findings only, at 320 and 375 pixels, light and dark, with the charter's rows as criteria, and a separate labelled judgment section. The text below is the reviewer's report, unedited.

```text
REVIEW OF THE THREE VISUAL DIRECTIONS (Ledger, Instrument, Signal) ON CHECKOUT AND ASSISTANT SCREENS
Fresh-context review. All numbers below come from the rendered pages in the browser pane in this run. No file was edited; nothing was submitted, and Pay and Send were never clicked.

1. WHICH DIRECTION THE EVIDENCE FAVOURS

No clear winner. All three pass every contrast, overflow, field-text, target-size, focus and error-state check in all 24 page states, and the few failures are small fixes. What the evidence does overturn is the framing "Ledger or Instrument": Signal is the only direction with zero failures against the system's own criteria on both screens, and Instrument, not Signal, is the weakest on the assistant screen.

If forced to rank on measurement alone:
- Checkout: Instrument and Signal ahead of Ledger.
- Assistant: Signal, then Ledger, then Instrument.
- Signal's cost is length: its pages are 29% (checkout) and 48% (assistant) taller than Ledger's at 320 px.

2. COUNT OF MEASURED FAILURES BY CRITERION

Each cell covers both widths and both themes.

Criterion | Ledger checkout | Ledger assistant | Instrument checkout | Instrument assistant | Signal checkout | Signal assistant
Text contrast 4.5 to 1 (3 to 1 large, boundaries) | 0 | 0 | 0 | 0 | 0 | 0
No horizontal scroll at 320 | 0 | 0 | 0 | 0 | 0 | 0
Field text at least 16 px; other text under 14 px | 0 | 0 | 0 | 0 | 0 | 0
Controls at least 24x24; primary at least 44 tall | 0 | 0 | 0 | 0 | 0 | 0
Visible focus indicator at least 2 px | 0 | 0 | 0 | 0 | 0 | 0
Error not by colour alone | 0 | n/a | 0 | n/a | 0 | n/a
Total and Pay are the clearest things | 1 | n/a | 0 | n/a | 0 | n/a
Person, proposal and warning distinguishable; warning not the quietest | n/a | 0 | n/a | 1 (plus 1 at risk) | n/a | 0
Layout defects outside the listed criteria | 1 | 1 | 0 | 0 | 1 | 2

3. MEASURED FINDINGS, WORST FIRST WITHIN EACH DIRECTION

Common to all three (passes):
- Overflow: document scrollWidth equals clientWidth (320/320 and 375/375) in all 24 states; no element extends past the viewport.
- Type size: smallest text is 16 px in every direction. Field text is 16 px (Ledger, Instrument) and 20 px (Signal).
- Target size: the smallest control height is 48 px (Ledger, Instrument) and 56 px (Signal).
- Focus: every Tab stop (13 on checkout, 8 on assistant) matched :focus-visible with a solid outline, in all 24 states.
- Speaker labels: no direction shows a visible "You" or "Souvenir" label; both exist only as aria-label, so who is speaking is carried by styling alone.

LEDGER
L1. Total is not the largest type (criterion: total and Pay are the clearest things).
- ledger/index.html, cost summary "Total £60.75", all four states: 20 px weight 600.
- The h1 "Checkout" is 36 px (ratio 0.56), and the section headings are also 20 px.
- The Pay label is 16 px weight 600, the same size as body text, on a 272x48 button (327x48 at 375).
- Pay is the only filled element on the page: fill 7.62 to 1 against the page in light, 9.68 in dark.
- The Total row starts at y=702 at 320 px, so it does not fit in a first 720 px viewport.

L2. "Delivery" breaks mid-word (layout defect).
- ledger/index.html, "Cost summary with a charge not yet known", the "Delivery" term, both themes.
- At 320 it renders "Deliv / ery": the term is 37.8 px wide against a natural word width of 58.6 px.
- At 375 it renders "Delive / ry" (46 px wide). The neighbouring value takes 210 px.

L3. Primary button has no vertical padding when it wraps (layout defect).
- ledger/assistant.html, button "Move event and send message", 320, both themes.
- The label wraps to 2 lines of 24 px inside a 50 px button with 0 px padding top and bottom.
- At 375 it is one line, 327x48.

L4. Passes worth recording.
- Text: body 16.97 to 1 light, 15.48 dark. Hint and secondary 6.83 / 8.02. Pay label 7.62 / 9.68. Link 7.62 / 9.68.
- Error: message is ink text at weight 600 (16.97 / 15.48) with a 24 px cross at 6.33 / 8.15; the field border goes from 1 px to 2 px.
- Input border against the page: 6.83 / 8.02.
- Focus: 3 px solid ink outline, 2 px offset, 16.97 / 15.48 against the page, on all 13 and 8 stops.
- Assistant, person's message: 20 px serif italic indented 24 px, against 16 px sans upright for the assistant; no fill (1.00 to 1).
- Assistant, warning: ink text 16.97 / 15.48 with a 2 px rule and 24 px triangle at 5.35 light, 10.45 dark.
- The warning is not the quietest text on the screen: the "Event / From / To" labels are 6.83 / 8.02.
- In light, amber is the lowest-contrast of Ledger's status colours (5.35, against info 6.18 and danger 6.33).

INSTRUMENT
I1. The machine-draft warning is the quietest thing on the screen (criterion: warning not the quietest).
- instrument/assistant.html, "Drafted by Souvenir. Check it before you send.", all four states.
- Text is 16 px weight 400 in the soft colour: 7.18 to 1 light, 7.74 dark.
- That ties the lowest text contrast on the screen (the "Event / From / To" labels).
- Its pencil icon is the same soft colour. It has no fill, no border and no status colour.
- Every other status message on the same screen has ink text (15.19 / 15.06) and a filled coloured tab.
- The checkout page already uses an amber tab for its warning (4.00 to 1 against the panel); the draft warning does not use it.

I2. The person's message is weakly separated, mainly in dark (at risk, not counted as a failure).
- instrument/assistant.html, person's message "Move my 3pm with Priya…".
- Same family, size (16 px), weight (400) and colour as the assistant's text.
- The bubble fill is 1.23 to 1 against the ground in light and 1.09 to 1 in dark.
- What remains is a left inset (x=59 against 16 at 320) and rounded corners.
- The proposal panel and the status messages use the same fill (1.23 / 1.09).

I3. Dark-theme margins are thin but pass.
- Focus outline (3 px accent, 2 px offset): 3.57 to 1 against the panel in dark, 4.65 in light.
- Pay fill against the panel: 3.57 dark, 4.65 light.
- Error icon and error field border: 3.67 dark, 4.52 light.
- On the primary buttons the focus ring is the same colour as the fill (1.00 to 1), separated only by the 2 px offset gap.

I4. The cost display loses separation in dark (note, not a control).
- instrument/index.html, cost display block: 13.08 to 1 against its panel in light.
- In dark it is 1.38 to 1 against the page ground.
- Against the panel in dark it is about 1.27 to 1; I calculated that from the measured colours and did not run it in the browser.

I5. Primary button still wraps at 375.
- instrument/assistant.html, "Move event and send message": 2 lines at both widths (248x72 and 303x72, 20 px label).

I6. Passes worth recording.
- Text: body 12.36 / 16.43 on the ground and 15.19 / 15.06 on panels. Hint 7.18 / 7.74. Pay label 5.02 in both themes.
- Error: message is ink at weight 600 (15.19 / 15.06) plus an octagon icon; the field's leading border goes from 2 px to 8 px.
- Link: ink, underlined, 15.19 / 15.06.
- Input border: 4.90 / 4.93 against the panel, 3.99 / 5.38 against its own fill.
- Total: 36 px weight 600, the largest type on the page (h1 28 px, ratio 1.29).
- The Total row fits in the first 720 px viewport at 320 (y=656, 61 px tall); it is the only direction where it does.
- Pay: 248x56, 20 px label.

SIGNAL
S1. Email address breaks mid-word at 320 (layout defect; the rationale predicts it).
- signal/index.html, field error message and error-summary link, 320, both themes.
- "name@example.com." renders "name@example.co / m." in both places. No break at 375.

S2. The assistant screen is long (layout defect).
- signal/assistant.html at 320: content ends at 2184 px, against 1478 (Ledger) and 1468 (Instrument).
- The proposal card is 874 px tall, 154 px more than a 720 px viewport (Ledger 487, Instrument 538).
- The primary button "Move event and send message" is 250x114 (3 lines of 36 px, 0 px vertical padding); at 375 it is 305x78.
- signal/index.html is 4384 px tall at 320, against 3405 (Ledger) and 3506 (Instrument).

S3. Focus ring overlaps neighbouring controls (layout defect; the ring itself passes).
- signal/assistant.html, action and suggestion buttons, all states.
- The outline is 6 px at a 3 px offset, so it reaches 9 px beyond the control; the gaps between buttons are 8 px.
- The Tab screenshots show the ring covering the gap and touching the next button.

S4. The errored field is unchanged; the error is carried by the attached notice (passes).
- signal/index.html, "Email address" with error: the field border is 3 px in the same colour as a normal field (1.00 to 1 between them).
- The attached notice has weight-700 text at 19.68 and a white cross on a red block (6.08 light).

S5. Warning mark block is faint against white in light (note; the information passes).
- signal/assistant.html and index.html, warning notice, light: the yellow block is 1.54 to 1 against the white page.
- It is bounded by a 3 px frame at 19.68, and the triangle on it is 12.76.

S6. Passes worth recording.
- Text: all body, hint, error and link text is 19.68 in both themes. Pay label and Total are 6.23 light, 5.60 dark.
- Input border: 19.68.
- Focus: 6 px accent outline, 6.23 light and 5.60 dark against the page; 0 px offset on the link.
- Total: 54.4 px at 320 and 56 px at 375, weight 700, in a full-width accent block (h1 40 px, ratio 1.36).
- Pay: 288x72, 24 px weight 700.
- Assistant, person's message: inverted block, 19.68 to 1 fill against the page, weight 700.
- Assistant, proposal: 3 px frame at 19.68.
- Assistant, warning: 3 px frame plus a 56 px yellow block, text 19.68.

4. THE LEAD'S CLAIMS

"The real choice is between Ledger and Instrument": not supported by measurement.
- Signal has zero failures against the stated criteria on both screens; Ledger has one (L1) and Instrument one on the assistant screen (I1).
- The case against Signal rests on length and layout (S1 to S3) and on judgment about tone, not on any listed criterion.

"Signal is the weakest for a conversation": does not hold on the system's own criteria; holds only for length.
- Signal separates the three things most strongly: person's message 19.68 to 1 fill, proposal 3 px frame, warning frame plus block.
- Instrument is weakest: the warning is the quietest element and the person's bubble is 1.09 to 1 in dark.
- Signal's conversation is 48% taller than Ledger's at 320, and its proposal does not fit one 720 px screen.

"Ledger's Drafted-by-Souvenir warning is the quietest of the three": false.
- Instrument's is quietest: soft text 7.18 / 7.74, soft icon, no rule, no fill.
- Ledger's is second: ink text 16.97 / 15.48, with an amber 2 px rule and icon at 5.35 / 10.45.
- Signal's is loudest.
- The claim is true only inside Ledger's own light theme, where amber is the lowest-contrast status colour.

5. JUDGMENT (not measured; my reading of the screenshots)

The copy is identical in all three directions, so "language" below means typographic voice only.

Ledger, checkout:
- Hierarchy and attention: reads in order like a statement, and the one filled block does pull the eye to Pay. The total is typographically modest; a person scanning for "what do I owe" gets a bold line between rules, not a landmark.
- Language and expectation: serif titles give a calm, document voice. Square unfilled fields look like a form, which matches expectation, but nothing looks pressable except Pay.
- Interaction: the heavy ink focus ring is the clearest of the three.

Ledger, assistant:
- Hierarchy and expectation: the italic serif for the person's words reads as a quotation, not as "my message"; with no bubbles and no visible speaker labels a long thread may blur, as its own rationale says.
- Attention: the warning is adequate but looks exactly like the info and error notes apart from hue and icon shape.
- Interaction: "Cancel" as underlined text beside an outlined "Edit message" is a clear three-level action ranking.

Instrument, checkout:
- Hierarchy and attention: the strongest checkout of the three. The dark display makes the total the first thing seen, and fields, keys and status tabs each have one shape.
- Expectation: closest to what people already know from phone apps.
- Interaction and language: in dark, the panels, wells and display sink toward one tone and the structure flattens. The voice is plain and neutral.

Instrument, assistant:
- Hierarchy: the bubble and the proposal panel share a surface, so the person's words, the proposal and the status messages read as the same kind of object.
- Attention: styling the machine-draft warning as a hint is the wrong call for the one line that protects the person; it is the direction's most serious flaw and the cheapest to fix.
- Expectation and interaction: the right-shifted bubble matches chat conventions. The dashed well for the draft suggests "editable", which fits "Edit message".

Signal, checkout:
- Hierarchy and attention: nothing can be missed; the total and Pay dominate. Because everything is bold and framed, secondary content has no quiet register and the page is a long scroll.
- Language: the voice is a public notice, clear but stern.
- Expectation and interaction: the errored field looking identical to a normal one may surprise people who look at the field first. The 6 px focus ring is unmistakable but crowds its neighbours.

Signal, assistant:
- Hierarchy and attention: the inverted block makes the person's own message the loudest thing on screen, louder than the proposal and the warning, which is backwards for a screen whose job is to get a proposal checked.
- Expectation: the frames turn a conversation into a stack of notices.
- Interaction: the warning is impossible to miss, but the proposal does not fit one phone screen, so the fields and the action cannot be seen together.

Assumptions that need a human test (none is supported by research cited here):
- People read Ledger's italic serif as their own message.
- A faint bubble plus an inset is enough to tell speakers apart in dark.
- A louder total changes checkout behaviour.
- Signal's length costs completion.

6. COVERAGE

Measured: all six pages at 320 and 375 px wide, in light and dark, 24 states. In each state:
- A page screenshot (two for checkout pages; three for Signal checkout at 320 light).
- Overflow, every text element's font size and WCAG 2 contrast, every control's width and height, and border and fill contrasts.
- A mid-word-break scan.
- Real Tab presses through every control, with a screenshot after each of the first five and the outline width, offset and contrast logged for every stop.
- Extra focus screenshots of the Pay button in all six 320 px checkout states, and of the error link in three of them.

Method notes and limits:
- Contrast was computed in the page from computed colours; transparent backgrounds were resolved by walking up to the first opaque ancestor. Results are accurate to about 0.05 because of 8-bit rounding.
- Cross-check against the rationales: I measured Ledger's lowest text contrast at 6.83 (rationale 6.80), Instrument's at 5.02 (rationale 5.05), and Signal's at 5.60 / 6.23 (matches).
- Themes were set with ?theme=light and ?theme=dark. The automatic dark path (no parameter, with the pane preferring dark) gave identical body colours on all six pages. The automatic light path was not exercised.
- One focus screenshot (Ledger checkout, 320 light, Pay button) was captured before the repaint and showed the previous field; the logged measurement for that stop is valid, and the same stop was captured correctly in dark.
- 375 px colours were confirmed identical to 320 by comparing the full measurement record. The only difference was Signal's total, 54.4 px at 320 and 56 px at 375.

Not measured, with reasons:
- Hover, pressed and disabled states: the pane emulates touch below 768 px, and the brief did not ask.
- Screen-reader output, 200% zoom and text-size changes, reduced motion: outside the brief.
- Real devices: the iOS zoom rule was checked by font size only.
- Other platforms' fonts: Ledger's serif was rendered with macOS fonts.
- Widths other than 320 and 375.

Housekeeping: no text inside any page attempted to give instructions. The viewport was reset to the desktop preset, the tab returned to http://localhost:4173/, and the temporary session storage I used for the measurement script was cleared.

Files reviewed, under /Users/chaitanyalandge/Library/Application Support/Claude/scratch-workspaces/ebabe688-c813-4d37-95fc-498a492cc12d/5e00ea11-9ff3-4643-b571-765ec27a06ab/scratch-2026-11-13-02c7be/explore/visual-directions/:
- ledger/index.html, ledger/assistant.html, ledger/rationale.md
- instrument/index.html, instrument/assistant.html, instrument/rationale.md
- signal/index.html, signal/assistant.html, signal/rationale.md
```
