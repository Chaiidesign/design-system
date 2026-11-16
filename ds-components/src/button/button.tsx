// Button: the React renderer of ds-components/specs/button.spec.json.
// Hand-written. The look comes from the generated button.css (it styles the data attributes set here) and
// button.extensions.css, both loaded by ds-components/src/styles.css; this file sets no style and no class.
// Names, defaults, slots and reflected attributes all come from the generated button.contract.ts.
//
//   import { Button } from "@souvenir/ds-components";
//   <Button variant="primary" onClick={save}>Save changes</Button>
//   <Button iconOnly ariaLabel="Send message" iconStart={<Icon name="arrow-up" />} />
//   <Button asChild><a href="/settings">Open settings</a></Button>
import type * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import {
  BUTTON_DEFAULTS,
  BUTTON_REFLECTS,
  BUTTON_SLOTS,
  type ButtonProps as ButtonContractProps,
  type ButtonIconEndProps,
  type ButtonIconStartProps,
} from "./button.contract";

// esbuild replaces process.env.NODE_ENV at build time; this declaration only tells TypeScript it exists.
declare const process: { env: { NODE_ENV?: string } };

// Native button attributes pass through, except those the contract owns, so each has one way to be set.
type NativeButtonAttributes = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "type" | "disabled" | "onClick" | "children" | "aria-label" | "aria-busy" | "aria-disabled"
>;

type ButtonBaseProps = NativeButtonAttributes &
  Omit<ButtonContractProps, "onClick" | "iconOnly" | "ariaLabel"> &
  ButtonIconStartProps &
  ButtonIconEndProps & {
    /** Called on press by pointer, Enter or Space. Not called while disabled or loading. */
    onClick?: React.MouseEventHandler<HTMLElement>;
    /** React 19 passes ref as a prop. With asChild it reaches the child element. */
    ref?: React.Ref<HTMLButtonElement>;
  };

/** A button with a visible label. ariaLabel may still override the name. */
export type ButtonWithLabelProps = ButtonBaseProps & {
  iconOnly?: false;
  ariaLabel?: string;
  /** The label. A verb that names the result, such as Save changes. */
  children: React.ReactNode;
};

/** A square button holding one icon and no visible label: ariaLabel is required. */
export type ButtonIconOnlyProps = ButtonBaseProps & {
  iconOnly: true;
  ariaLabel: string;
  children?: React.ReactNode;
};

/** Every prop Button takes. iconOnly: true without ariaLabel is a type error (requirement button-icon-only-needs-label). */
export type ButtonProps = ButtonWithLabelProps | ButtonIconOnlyProps;

// Proof for requirement button-icon-only-needs-label, checked by tsc: if the union ever accepted iconOnly
// without ariaLabel, this directive would be unused and the type check would fail.
// @ts-expect-error iconOnly without ariaLabel must not type-check
const _iconOnlyNeedsLabel: ButtonProps = { iconOnly: true, iconStart: null };
void _iconOnlyNeedsLabel;

let warnedMissingLabel = false;

export function Button(props: ButtonProps) {
  const {
    variant = BUTTON_DEFAULTS.variant,
    size = BUTTON_DEFAULTS.size,
    iconOnly = BUTTON_DEFAULTS.iconOnly,
    fullWidth = BUTTON_DEFAULTS.fullWidth,
    loading = BUTTON_DEFAULTS.loading,
    disabled = BUTTON_DEFAULTS.disabled,
    type = BUTTON_DEFAULTS.type,
    asChild = BUTTON_DEFAULTS.asChild,
    ariaLabel,
    iconStart,
    iconEnd,
    children,
    onClick,
    ref,
    ...native
  } = props;

  if (iconOnly && !ariaLabel && process.env.NODE_ENV !== "production" && !warnedMissingLabel) {
    warnedMissingLabel = true;
    console.warn("Button: iconOnly needs ariaLabel, or the button has no accessible name.");
  }

  // Loading keeps the button focusable (no native disabled) but ignores presses. preventDefault also stops a
  // submit button from submitting and a link from navigating.
  const inert = loading || (asChild && disabled);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (inert) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const reflected = {
    [BUTTON_REFLECTS.variant]: variant,
    [BUTTON_REFLECTS.size]: size,
    [BUTTON_REFLECTS.iconOnly]: iconOnly ? "" : undefined,
    [BUTTON_REFLECTS.fullWidth]: fullWidth ? "" : undefined,
    [BUTTON_REFLECTS.loading]: loading ? "" : undefined,
  };

  const lead = loading ? (
    <span data-slot={BUTTON_SLOTS.spinner} aria-hidden="true">
      <Spinner />
    </span>
  ) : iconStart != null && iconStart !== false ? (
    <span data-slot={BUTTON_SLOTS.iconStart} aria-hidden="true">
      {iconStart}
    </span>
  ) : null;
  const trail =
    iconEnd != null && iconEnd !== false ? (
      <span data-slot={BUTTON_SLOTS.iconEnd} aria-hidden="true">
        {iconEnd}
      </span>
    ) : null;
  const label = (content: React.ReactNode) =>
    content == null || content === false ? null : <span data-slot={BUTTON_SLOTS.label}>{content}</span>;

  const shared = {
    ...native,
    ...reflected,
    "data-slot": BUTTON_SLOTS.root,
    "aria-label": ariaLabel,
    "aria-busy": loading ? true : undefined,
    onClick: handleClick,
  };

  if (asChild) {
    // The child (a link) becomes the root. It cannot take the native disabled attribute or a button type,
    // so being unavailable is said with aria-disabled. The child's own content becomes the label.
    return (
      <Slot {...shared} ref={ref as React.Ref<HTMLElement>} aria-disabled={loading || disabled ? true : undefined}>
        {lead}
        <Slottable child={children}>{label}</Slottable>
        {trail}
      </Slot>
    );
  }

  return (
    <button
      {...shared}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading ? true : undefined}
    >
      {lead}
      {label(children)}
      {trail}
    </button>
  );
}

// The loading indicator: a three-quarter ring in the current text colour, turned by button.extensions.css.
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
