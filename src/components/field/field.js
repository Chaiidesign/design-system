// <sv-field>: wraps div.sv-field and enhances it. Light DOM, no styles, no dependencies.
// - gives the control, hint and error ids if they have none, and joins them with aria-describedby (hint, then error)
// - creates the error line when the author left it out, so a failed check always has words
// - makes the error line a polite live region, so an error that appears when the person leaves the field is announced
// - checks on blur once the person has typed, and on the form's submit; never on load, so server errors stay
// - shows the author's message (data-error-required, -type, -pattern) or else the browser's validationMessage
// - never touches the value
// - adds novalidate to the form only once this script runs, so with no script the browser still validates;
//   on submit it then checks every other control of the form the browser would have checked (a required
//   checkbox, say), and if one is invalid stops the submit and lets the browser say why (reportValidity)
// - dispatches a bubbling "sv-field-invalid" or "sv-field-valid" event after each check
// - sets itself up when its children arrive, if it is connected before them
// An <sv-error-summary> for the same form marks the submit event (svChecked) and handles the fields itself.

let count = 0;
const idFor = (el, part) => el.id || (el.id = `sv-field-${++count}-${part}`);
const forms = new WeakSet();

function onSubmit(event) {
  // A button marked formnovalidate (such as "Apply code") skips our checks, as it skips the browser's.
  if (event.submitter && event.submitter.formNoValidate) return;
  const form = event.target;
  if (!event.svChecked) {
    let first = null;
    for (const field of form.querySelectorAll("sv-field")) {
      if (field.check && !field.check() && !first) first = field;
    }
    if (first) {
      event.preventDefault();
      // Bring the label (and so the error line) into view, not only the control.
      const control = first.control;
      (control.labels?.[0] || control).scrollIntoView({ block: "start" });
      control.focus({ preventScroll: true });
      return;
    }
  }
  if (event.defaultPrevented) return;
  // novalidate is on: nothing else checks the controls that are not inside a working sv-field.
  for (const el of form.elements) {
    if (el.closest("sv-field")?.control === el) continue;
    if (el.willValidate && !el.checkValidity()) {
      event.preventDefault();
      el.reportValidity();
      return;
    }
  }
}

class SvField extends HTMLElement {
  connectedCallback() {
    if (this.setup()) return;
    // Connected before its children (made by script, or parsed after the module ran): try again when they arrive.
    queueMicrotask(() => {
      if (this.setup() || !this.isConnected || this.watch) return;
      this.watch = new MutationObserver(() => { if (this.setup()) this.unwatch(); });
      this.watch.observe(this, { childList: true, subtree: true });
    });
  }

  disconnectedCallback() {
    this.unwatch();
  }

  unwatch() {
    if (this.watch) this.watch.disconnect();
    this.watch = null;
  }

  // Returns true once the field is set up (now or before).
  setup() {
    if (this.control) return true;
    const control = this.querySelector(".sv-field__control");
    if (!control) return false;
    this.control = control;
    let line = this.querySelector(".sv-field__error");
    if (!line && control.willValidate) {
      line = document.createElement("p");
      line.className = "sv-field__error";
      line.hidden = true;
      control.before(line);
    }
    this.errorLine = line;
    if (line) line.setAttribute("aria-live", "polite");
    const label = this.querySelector(".sv-field__label");
    const hint = this.querySelector(".sv-field__hint");
    const id = idFor(control, "control");
    if (label && !label.htmlFor && !label.contains(control)) label.htmlFor = id;

    const ours = [hint && idFor(hint, "hint"), line && idFor(line, "error")].filter(Boolean);
    const theirs = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && !ours.includes(x));
    if (ours.length || theirs.length) control.setAttribute("aria-describedby", [...ours, ...theirs].join(" "));

    // An error already in the markup (rendered by the server) is the current error until the next check.
    const shown = line && !line.hidden && control.getAttribute("aria-invalid") === "true";
    this.message = shown ? line.textContent.trim() : "";

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
    return true;
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
      // Shown first, then filled, so the live region is in the page when its words change.
      if (message) this.errorLine.hidden = false;
      this.errorLine.textContent = message;
      if (!message) this.errorLine.hidden = true;
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
