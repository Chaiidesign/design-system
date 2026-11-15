// <sv-field>: wraps div.sv-field and enhances it. Light DOM, no styles, no dependencies.
// - gives the control, hint and error ids if they have none, and joins them with aria-describedby (hint, then error)
// - checks on blur once the person has typed, and on the form's submit; never on load, so server errors stay
// - shows the author's message (data-error-required, -type, -pattern) or else the browser's validationMessage
// - never touches the value
// - adds novalidate to the form only once this script runs, so with no script the browser still validates
// - dispatches a bubbling "sv-field-invalid" or "sv-field-valid" event after each check
// An <sv-error-summary> for the same form marks the submit event (svChecked) and handles it itself.

let count = 0;
const idFor = (el, part) => el.id || (el.id = `sv-field-${++count}-${part}`);
const forms = new WeakSet();

function onSubmit(event) {
  if (event.svChecked) return;
  let first = null;
  for (const field of event.target.querySelectorAll("sv-field")) {
    if (field.check && !field.check() && !first) first = field;
  }
  if (first) {
    event.preventDefault();
    // Bring the label (and so the error line) into view, not only the control.
    const control = first.control;
    (control.labels?.[0] || control).scrollIntoView({ block: "start" });
    control.focus({ preventScroll: true });
  }
}

class SvField extends HTMLElement {
  connectedCallback() {
    const control = this.querySelector(".sv-field__control");
    if (!control || this.control) return;
    this.control = control;
    this.errorLine = this.querySelector(".sv-field__error");
    const label = this.querySelector(".sv-field__label");
    const hint = this.querySelector(".sv-field__hint");
    const id = idFor(control, "control");
    if (label && !label.htmlFor && !label.contains(control)) label.htmlFor = id;

    const ours = [hint && idFor(hint, "hint"), this.errorLine && idFor(this.errorLine, "error")].filter(Boolean);
    const theirs = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && !ours.includes(x));
    if (ours.length || theirs.length) control.setAttribute("aria-describedby", [...ours, ...theirs].join(" "));

    // An error already in the markup (rendered by the server) is the current error until the next check.
    const shown = this.errorLine && !this.errorLine.hidden && control.getAttribute("aria-invalid") === "true";
    this.message = shown ? this.errorLine.textContent.trim() : "";

    control.addEventListener("input", () => {
      this.typed = true;
      if (this.message && control.validity.valid) this.check();
    });
    control.addEventListener("blur", () => {
      if (this.typed) this.check();
    });

    const form = control.form;
    if (form) {
      form.noValidate = true;
      if (!forms.has(form)) {
        forms.add(form);
        form.addEventListener("submit", onSubmit);
      }
    }
  }

  // The error now shown for this field, or "" when there is none.
  get error() {
    return this.message || "";
  }

  // Reads the browser's validity, shows or clears the message, and returns true when the field is valid.
  check() {
    const control = this.control;
    if (!control) return true;
    const v = control.validity;
    const d = control.dataset;
    const message = v.valid ? "" :
      (v.valueMissing && d.errorRequired) || (v.typeMismatch && d.errorType) ||
      (v.patternMismatch && d.errorPattern) || control.validationMessage;
    this.message = message;
    if (this.errorLine) {
      this.errorLine.textContent = message;
      this.errorLine.hidden = !message;
    }
    if (message) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
    this.dispatchEvent(new CustomEvent(message ? "sv-field-invalid" : "sv-field-valid", {
      bubbles: true, detail: { message, control },
    }));
    return !message;
  }
}

if (!customElements.get("sv-field")) customElements.define("sv-field", SvField);
