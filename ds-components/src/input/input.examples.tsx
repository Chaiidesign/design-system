// Input examples: one entry per example id in ds-components/specs/input.spec.json, with exactly the props the
// spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
// No example records events: the tests read the DOM (ids, aria attributes, focus) and wrap the field in a form
// where they need a submit.
import { Input } from "./input";
import { Icon } from "../../gallery/icons";

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
