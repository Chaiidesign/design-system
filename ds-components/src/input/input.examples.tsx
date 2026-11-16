// Input examples: one entry per example id in ds-components/specs/input.spec.json, with exactly the props the
// spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
// No example records events: the tests read the DOM (ids, aria attributes, focus) and wrap the field in a form
// where they need a submit.
//
// Test hook (not an example): window.__inputFixtures.mountInvalidWithoutMessage(kind) mounts, inside the example's
// section, a field marked invalid whose errorMessage is "" (kind "empty", which the type accepts, as a form library
// may pass), "   " ("blank") or absent ("missing", which the type forbids and only a cast or plain JavaScript can
// reach). No spec example may show it: the requirement input-invalid-needs-message makes it a misuse. The host
// carries data-input-fixture="<kind>".
import { createRoot } from "react-dom/client";
import { Input, type InputProps } from "./input";
import { Icon } from "../../gallery/icons";

type InvalidKind = "empty" | "blank" | "missing";
type InputWindow = { __inputFixtures?: { mountInvalidWithoutMessage: (kind: InvalidKind) => void } };

function mountInvalidWithoutMessage(kind: InvalidKind) {
  const host = document.createElement("div");
  host.setAttribute("data-input-fixture", kind);
  (document.querySelector("section[data-example]") ?? document.body).appendChild(host);
  const props =
    kind === "missing"
      ? ({ label: "Email address", invalid: true } as unknown as InputProps)
      : ({ label: "Email address", invalid: true, errorMessage: kind === "empty" ? "" : "   " } as InputProps);
  createRoot(host).render(<Input {...props} />);
}

if (typeof window !== "undefined") (window as unknown as InputWindow).__inputFixtures = { mountInvalidWithoutMessage };

export const examples = {
  default: () => <Input label="Full name" autoComplete="name" />,
  "with-description": () => (
    <Input label="Phone number" type="tel" autoComplete="tel" description="Only used to tell you about your delivery." />
  ),
  placeholder: () => <Input label="Email address" type="email" autoComplete="email" placeholder="name@example.com" />,
  required: () => <Input label="Email address" type="email" autoComplete="email" required />,
  invalid: () => (
    <Input
      label="Email address"
      type="email"
      autoComplete="email"
      defaultValue="name@example"
      invalid
      errorMessage="Enter an email address, such as name@example.com."
    />
  ),
  disabled: () => <Input label="Country" defaultValue="United Kingdom" disabled />,
  "read-only": () => <Input label="Order number" defaultValue="SV-20481" readOnly />,
  small: () => <Input label="Discount code" size="sm" autoComplete="off" />,
  large: () => <Input label="Card number" size="lg" inputMode="numeric" autoComplete="cc-number" />,
  "prefix-text": () => <Input label="Tip amount in dollars" prefix="$" inputMode="decimal" />,
  "suffix-text": () => <Input label="Weight in kilograms" suffix="kg" inputMode="decimal" />,
  search: () => (
    <Input ariaLabel="Search products" type="search" prefix={<Icon name="search" />} placeholder="Shoes, bags, gifts" />
  ),
  password: () => <Input label="Password" type="password" autoComplete="current-password" required />,
  url: () => <Input label="Website" type="url" autoComplete="url" placeholder="https://example.com" />,
  number: () => <Input label="Quantity" type="number" defaultValue="1" />,
  hover: () => <Input label="Full name" />,
  focus: () => <Input label="Full name" />,
  "long-text": () => (
    <Input
      label="Name of the person who will collect the parcel from the pickup point"
      description="They will need to show photo identification that matches this name exactly, including any middle names."
      required
      invalid
      errorMessage="Enter the collector's full name as it appears on their photo identification, including any middle names."
    />
  ),
  "worst-case-320": () => (
    <Input
      label="Billing postal code for the card ending in 4242"
      size="lg"
      required
      inputMode="numeric"
      autoComplete="postal-code"
      prefix={<Icon name="location" />}
      suffix="UK"
      placeholder="SW1A 1AA"
      description="Must match the address your bank holds for this card, or the payment will be declined."
      invalid
      errorMessage="Enter the postal code your bank holds for this card. It has between 5 and 8 characters."
    />
  ),
};
