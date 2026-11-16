// A tiny test-only component for the gallery and v2/tools/test-components.mjs. Not shipped.
// Its spec is fixture.spec.json beside it. The faults it is tested with are planted in
// fixture.examples.tsx and fixture.css, never here, so the component itself is clean.
import type { CSSProperties, ReactNode } from "react";
import "./fixture.css";

export type FixtureProps = {
  tone?: "calm" | "off";
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children: ReactNode;
};

export function Fixture({ tone = "calm", disabled = false, busy = false, className, style, onClick, children }: FixtureProps) {
  return (
    <div data-slot="fixture">
      <button
        type="button"
        data-slot="fixture-control"
        data-tone={tone}
        data-busy={busy ? "" : undefined}
        disabled={disabled}
        className={className}
        style={style}
        onClick={onClick}
      >
        <span data-slot="fixture-label">{children}</span>
      </button>
    </div>
  );
}
