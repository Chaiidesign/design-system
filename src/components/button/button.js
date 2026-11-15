// <sv-button> wraps one submit button. When its form is submitted and valid, the button shows that it is busy:
// aria-busy="true", the label from data-busy-label, and further presses do nothing until the page is shown again.
// It never sets disabled, so the button stays in the keyboard order and its name and value are still submitted.
// Loaded late or never, the plain button still submits.

class SvButton extends HTMLElement {
  connectedCallback() {
    if (this.form) return;
    const button = this.querySelector('button[type="submit"], button:not([type])');
    if (!button || !button.form) return;
    this.button = button;
    this.form = button.form;
    this.form.addEventListener("submit", this);
    button.addEventListener("click", this);
    addEventListener("pageshow", this);
  }

  disconnectedCallback() {
    if (!this.form) return;
    this.form.removeEventListener("submit", this);
    this.button.removeEventListener("click", this);
    removeEventListener("pageshow", this);
    this.form = null;
  }

  get busy() {
    return this.button.getAttribute("aria-busy") === "true";
  }

  handleEvent(e) {
    if (e.type === "pageshow") {
      if (e.persisted) this.restore();
      return;
    }
    // A second press, or Enter in a field, while busy: ignore it.
    if (this.busy) {
      e.preventDefault();
      return;
    }
    if (e.type !== "submit" || (e.submitter && e.submitter !== this.button)) return;
    // Wait until every other submit listener has run: one of them may cancel the submission.
    setTimeout(() => {
      if (e.defaultPrevented || !this.form.matches(":valid")) return;
      this.start();
    });
  }

  start() {
    const b = this.button;
    b.setAttribute("aria-busy", "true");
    const label = b.dataset.busyLabel;
    if (label) {
      this.idle = [...b.childNodes];
      b.replaceChildren(label);
    }
  }

  restore() {
    const b = this.button;
    b.removeAttribute("aria-busy");
    if (this.idle) b.replaceChildren(...this.idle);
    this.idle = null;
  }
}

if (!customElements.get("sv-button")) customElements.define("sv-button", SvButton);
