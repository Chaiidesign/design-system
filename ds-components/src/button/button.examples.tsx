// Button examples: one entry per example id in ds-components/specs/button.spec.json, with exactly the props and
// content the spec gives. The gallery renders each one, and v2/tools/test-components.mjs tests each one.
//
// How tests see a press: every example passes onClick={record("<example id>")}, which adds one to
// window.__buttonClicks["<example id>"]. button.tests.mjs reads that counter. Nothing else is recorded.
import { Button } from "./button";
import { Icon } from "../../gallery/icons";

type ClickLog = { __buttonClicks?: Record<string, number> };

const record = (id: string) => () => {
  const log = ((window as unknown as ClickLog).__buttonClicks ??= {});
  log[id] = (log[id] ?? 0) + 1;
};

export const examples = {
  secondary: () => <Button onClick={record("secondary")}>Cancel</Button>,
  primary: () => (
    <Button variant="primary" onClick={record("primary")}>
      Save changes
    </Button>
  ),
  neutral: () => (
    <Button variant="neutral" onClick={record("neutral")}>
      Continue
    </Button>
  ),
  ghost: () => (
    <Button variant="ghost" onClick={record("ghost")}>
      Skip
    </Button>
  ),
  danger: () => (
    <Button variant="danger" onClick={record("danger")}>
      Delete project
    </Button>
  ),
  "danger-soft": () => (
    <Button variant="dangerSoft" onClick={record("danger-soft")}>
      Remove member
    </Button>
  ),
  outline: () => (
    <Button variant="outline" onClick={record("outline")}>
      Export
    </Button>
  ),
  success: () => (
    <Button variant="success" onClick={record("success")}>
      Approve
    </Button>
  ),
  warning: () => (
    <Button variant="warning" onClick={record("warning")}>
      Archive
    </Button>
  ),
  small: () => (
    <Button size="sm" onClick={record("small")}>
      Edit
    </Button>
  ),
  large: () => (
    <Button variant="primary" size="lg" onClick={record("large")}>
      Get started
    </Button>
  ),
  "with-icons": () => (
    <Button variant="primary" iconStart={<Icon name="plus" />} iconEnd={<Icon name="arrow-right" />} onClick={record("with-icons")}>
      New chat
    </Button>
  ),
  "icon-only": () => (
    <Button variant="primary" iconOnly ariaLabel="Send message" iconStart={<Icon name="arrow-up" />} onClick={record("icon-only")} />
  ),
  loading: () => (
    <Button variant="primary" loading onClick={record("loading")}>
      Saving…
    </Button>
  ),
  disabled: () => (
    <Button variant="primary" disabled onClick={record("disabled")}>
      Save changes
    </Button>
  ),
  "full-width": () => (
    <Button variant="primary" fullWidth onClick={record("full-width")}>
      Continue
    </Button>
  ),
  "long-label": () => (
    <Button variant="primary" onClick={record("long-label")}>
      Move the event to Thursday and send the message to Priya
    </Button>
  ),
  "as-link": () => (
    <Button asChild variant="secondary" onClick={record("as-link")}>
      <a href="#settings">Open settings</a>
    </Button>
  ),
};
