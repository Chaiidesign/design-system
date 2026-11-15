// <sv-button> wraps one submit button. When its form is submitted and valid, the button shows that it is busy:
// aria-busy="true", the label from data-busy-label, and further presses do nothing.
// It never sets disabled, so the button stays in the keyboard order and its name and value are still submitted.
// It does not go busy when the form opens in another window or frame: this page is not replaced.
// It lets go of the busy state when the page is shown again (back, forward), and when the page is still here
// after RELEASE_MS (the server answered with nothing to show, or the navigation was stopped), so the person can retry.
// It sets itself up when its button arrives, if it is connected before it.
// Loaded late or never, the plain button still submits.

const RELEASE_MS = 10000;

class SvButton extends HTMLElement {
  connectedCallback() {
    if (this.setup()) return;
    queueMicrotask(() => {
      if (this.setup() || !this.isConnected || this.watch) return;
      this.watch = new MutationObserver(() => { if (this.setup()) this.unwatch(); });
      this.watch.observe(this, { childList: true, subtree: true });
    });
  }

  unwatch() {
    if (this.watch) this.watch.disconnect();
    this.watch = null;
  }

  // Returns true once the button is set up (now or before).
  setup() {
    if (this.form) return true;
    const button = this.querySelector('button[type="submit"], button:not([type])');
    if (!button || !button.form) return false;
    this.button = button;
    this.form = button.form;
    this.form.addEventListener("submit", this);
    button.addEventListener("click", this);
    addEventListener("pageshow", this);
    return true;
  }

  disconnectedCallback() {
    this.unwatch();
    if (!this.form) return;
    this.form.removeEventListener("submit", this);
    this.button.removeEventListener("click", this);
    removeEventListener("pageshow", this);
    this.form = null;
  }

  get busy() {
    return this.button.getAttribute("aria-busy") === "true";
  }

  // True when submitting by this button replaces this page.
  get replacesPage() {
    const t = (this.button.getAttribute("formtarget") || this.form.getAttribute("target") || "").toLowerCase();
    return !t || t === "_self" || ((t === "_top" || t === "_parent") && window.top === window);
  }

  handleEvent(e) {
    if (e.type === "pageshow") {
      this.restore();
      return;
    }
    // A second press, or Enter in a field, while busy: ignore it.
    if (this.busy) {
      e.preventDefault();
      return;
    }
    if (e.type !== "submit" || (e.submitter && e.submitter !== this.button) || !this.replacesPage) return;
    // Wait until every other submit listener has run: one of them may cancel the submission.
    setTimeout(() => {
      if (e.defaultPrevented || !this.form.matches(":valid")) return;
      this.start();
    });
  }

  start() {
    const b = this.button;
    this.started = true;
    b.setAttribute("aria-busy", "true");
    const label = b.dataset.busyLabel;
    if (label) {
      this.idle = [...b.childNodes];
      b.replaceChildren(label);
    }
    this.timer = setTimeout(() => this.restore(), RELEASE_MS);
  }

  // Undoes only a busy state this element started; a busy state written in the markup stays.
  restore() {
    if (!this.started) return;
    clearTimeout(this.timer);
    this.started = false;
    const b = this.button;
    b.removeAttribute("aria-busy");
    if (this.idle) b.replaceChildren(...this.idle);
    this.idle = null;
  }
}

if (!customElements.get("sv-button")) customElements.define("sv-button", SvButton);
