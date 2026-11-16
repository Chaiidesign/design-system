// Examples for the test fixture. Not shipped.
// "clean" and "disabled" are correct. Every other example plants exactly one fault for
// v2/tools/test-components.mjs --self-test, named in its comment. The spec also lists an example
// "not-written" that is deliberately missing here.
import { Fixture } from "./fixture";

const PICTURE = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="gray"/></svg>');

export const examples = {
  clean: () => <Fixture>Continue</Fixture>,

  disabled: () => <Fixture disabled>Unavailable</Fixture>,

  // Fault: text at low contrast. A surface colour used as a text colour, faint in light and in dark.
  "low-contrast": () => (
    <div>
      <Fixture>Continue</Fixture>
      <p style={{ color: "var(--color-surface-secondary)" }}>Faint helper text</p>
    </div>
  ),

  // Fault: two controls 16 pixels tall, edge to edge. One alone would pass WCAG 2.5.8 by its spacing exception;
  // stacked with no gap, each one's 24 pixel circle meets the other control.
  "small-target": () => (
    <div style={{ display: "grid" }}>
      <Fixture style={{ minBlockSize: 0, blockSize: "16px", paddingBlock: 0 }}>Tiny</Fixture>
      <Fixture style={{ minBlockSize: 0, blockSize: "16px", paddingBlock: 0 }}>Tiny too</Fixture>
    </div>
  ),

  // Fault: a control with no focus outline (see fixture.css).
  "no-outline": () => <Fixture className="fixture-no-outline">No ring</Fixture>,

  // Fault: an element wider than the viewport.
  "too-wide": () => <div style={{ inlineSize: "2000px" }}>A strip wider than any screen</div>,

  // Fault: an image with no alt attribute.
  "image-no-alt": () => <img src={PICTURE} width={48} height={48} />,

  // Fault: on hover the fill is interactive/error/hover, but the spec says interactive/primary/hover.
  "state-colour": () => <Fixture tone="off">Retry</Fixture>,

  // Fault: an element carries a data-slot the spec does not list.
  "stray-slot": () => (
    <div>
      <Fixture>Continue</Fixture>
      <span data-slot="fixture-extra">Extra part</span>
    </div>
  ),
};
