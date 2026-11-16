// Input: the React renderer of ds-components/specs/input.spec.json.
// Hand-written. The look comes from the generated input.css (it styles the data attributes set here) and
// input.extensions.css, both loaded by ds-components/src/styles.css; this file sets no style and no class.
// Names, defaults, slots and reflected attributes all come from the generated input.contract.ts.
// Radix has no input part: this is one component around the native input element.
//
//   import { Input } from "@souvenir/ds-components";
//   <Input label="Email address" type="email" autoComplete="email" />
//   <Input label="Email address" invalid errorMessage="Enter an email address, such as name@example.com." />
//   <Input ariaLabel="Search products" type="search" prefix={<SearchIcon />} />
//
// Where things go: native input attributes (maxLength, pattern, onBlur, aria-*...) and ref go to the <input>.
// className goes to the root, so a layout can place or size the whole field.
import * as React from "react";
import {
  INPUT_DEFAULTS,
  INPUT_REFLECTS,
  INPUT_SLOTS,
  type InputProps as InputContractProps,
} from "./input.contract";

// esbuild replaces process.env.NODE_ENV at build time; this declaration only tells TypeScript it exists.
declare const process: { env: { NODE_ENV?: string } };

// Native input attributes pass through to the input, except those the contract owns, so each has one way to be
// set. "size" and "prefix" are native names the spec uses for its own props. aria-describedby is merged: the
// component's ids come first, then the caller's.
type NativeInputAttributes = Omit<
  React.ComponentPropsWithoutRef<"input">,
  | "size"
  | "prefix"
  | "type"
  | "disabled"
  | "readOnly"
  | "required"
  | "value"
  | "defaultValue"
  | "onChange"
  | "placeholder"
  | "name"
  | "autoComplete"
  | "inputMode"
  | "id"
  | "aria-label"
  | "aria-invalid"
  | "children"
>;

// The contract's InputProps holds every spec'd prop (Input is single-piece). Those the unions below decide
// (label, ariaLabel, invalid, errorMessage) and the handler, which the contract cannot type callably, are taken out.
type InputBaseProps = NativeInputAttributes &
  Omit<InputContractProps, "label" | "ariaLabel" | "invalid" | "errorMessage" | "onChange"> & {
    /** Called with the change event on every edit. Not called while disabled or read-only. */
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    /** React 19 passes ref as a prop. It reaches the native input element. */
    ref?: React.Ref<HTMLInputElement>;
  };

/** A field named by its visible label. */
export type InputLabelledProps = {
  /** The visible name of the field, in a few words, in sentence case. */
  label: React.ReactNode;
  /** Overrides the name. When given, the label is not rendered. */
  ariaLabel?: string;
};

/** A field with no visible label, such as a search field whose purpose the page already shows. */
export type InputAriaLabelledProps = {
  label?: undefined;
  /** The accessible name. */
  ariaLabel: string;
};

/** A field that is not marked invalid. */
export type InputValidProps = {
  invalid?: false;
  /** Shown only while invalid is true. */
  errorMessage?: React.ReactNode;
};

/** A field marked invalid: errorMessage is required, so the error is always said in words. */
export type InputInvalidProps = {
  invalid: true;
  /** What is wrong and how to fix it, in one sentence. Never null, undefined or a boolean. */
  errorMessage: Exclude<React.ReactNode, null | undefined | boolean>;
};

/**
 * Every prop Input takes. Neither label nor ariaLabel is a type error (requirement input-label-or-aria-label), and
 * so is invalid without errorMessage (requirement input-invalid-needs-message).
 */
export type InputProps = InputBaseProps &
  (InputLabelledProps | InputAriaLabelledProps) &
  (InputValidProps | InputInvalidProps);

// Proofs checked by tsc: if the unions ever accepted these props, the directive would be unused and the type check
// would fail. The test runner counts each requirement as passed only while tsc exits 0 and a directive line names
// the requirement's id.
// @ts-expect-error input-label-or-aria-label: neither label nor ariaLabel must not type-check
const _needsName: InputProps = { type: "email" };
// @ts-expect-error input-invalid-needs-message: invalid without errorMessage must not type-check
const _invalidNeedsMessage: InputProps = { label: "Email address", invalid: true };
void _needsName;
void _invalidNeedsMessage;

let warnedMissingName = false;
let warnedInvalidWithoutMessage = false;

const hasContent = (node: React.ReactNode) => node != null && node !== false && node !== true && node !== "";

export function Input(props: InputProps) {
  const {
    label,
    ariaLabel,
    description,
    errorMessage,
    invalid = INPUT_DEFAULTS.invalid,
    required = INPUT_DEFAULTS.required,
    disabled = INPUT_DEFAULTS.disabled,
    readOnly = INPUT_DEFAULTS.readOnly,
    size = INPUT_DEFAULTS.size,
    type = INPUT_DEFAULTS.type,
    inputMode,
    prefix,
    suffix,
    id: idProp,
    className,
    "aria-describedby": describedByProp,
    ref,
    ...native
  } = props;

  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const showLabel = ariaLabel == null && hasContent(label);
  const showDescription = hasContent(description);
  const showError = Boolean(invalid) && hasContent(errorMessage);

  if (process.env.NODE_ENV !== "production") {
    if (!ariaLabel && !hasContent(label) && !warnedMissingName) {
      warnedMissingName = true;
      console.warn("Input: give label or ariaLabel, or the field has no accessible name.");
    }
    if (invalid && !hasContent(errorMessage) && !warnedInvalidWithoutMessage) {
      warnedInvalidWithoutMessage = true;
      console.warn("Input: invalid needs errorMessage. Without it the field is not marked invalid.");
    }
  }

  // The error first, then the description, then any ids the caller gave. Only ids of parts that are rendered.
  const describedBy =
    [showError ? errorId : null, showDescription ? descriptionId : null, describedByProp || null]
      .filter(Boolean)
      .join(" ") || undefined;

  const reflected = {
    [INPUT_REFLECTS.size]: size,
    // Invalid is reflected only while the error message is shown, so the look and aria-invalid always agree.
    [INPUT_REFLECTS.invalid]: showError ? "" : undefined,
    [INPUT_REFLECTS.required]: required ? "" : undefined,
    [INPUT_REFLECTS.disabled]: disabled ? "" : undefined,
    [INPUT_REFLECTS.readOnly]: readOnly ? "" : undefined,
  };

  // A press on the control outside the input (padding, prefix, suffix) moves focus to the input. preventDefault
  // keeps the press from blurring the input first, so focus lands once and stays.
  const handleControlMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const field = event.currentTarget.querySelector<HTMLInputElement>(`[data-slot~="${INPUT_SLOTS.input}"]`);
    if (!field || disabled || event.target === field) return;
    event.preventDefault();
    field.focus();
  };

  return (
    <div {...reflected} data-slot={INPUT_SLOTS.root} className={className}>
      {showLabel ? (
        <label data-slot={INPUT_SLOTS.label} htmlFor={id}>
          {label}
          {required ? (
            <>
              {" "}
              <span data-slot={INPUT_SLOTS.requiredMark} aria-hidden="true">
                Required
              </span>
            </>
          ) : null}
        </label>
      ) : null}
      <div data-slot={INPUT_SLOTS.control} onMouseDown={handleControlMouseDown}>
        {hasContent(prefix) ? (
          <span data-slot={INPUT_SLOTS.prefix} aria-hidden="true">
            {prefix}
          </span>
        ) : null}
        <input
          {...native}
          ref={ref}
          data-slot={INPUT_SLOTS.input}
          id={id}
          type={type}
          inputMode={inputMode}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={showError ? true : undefined}
          aria-describedby={describedBy}
        />
        {hasContent(suffix) ? (
          <span data-slot={INPUT_SLOTS.suffix} aria-hidden="true">
            {suffix}
          </span>
        ) : null}
      </div>
      {showDescription ? (
        <p data-slot={INPUT_SLOTS.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {showError ? (
        <p data-slot={INPUT_SLOTS.errorMessage} id={errorId}>
          <span data-slot={INPUT_SLOTS.errorIcon} aria-hidden="true">
            <ErrorIcon />
          </span>
          <span data-slot={INPUT_SLOTS.errorText}>{errorMessage}</span>
        </p>
      ) : null}
    </div>
  );
}

// The error icon: a circle with an exclamation mark, drawn in the current colour. Sized by the errorIcon part.
function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}
