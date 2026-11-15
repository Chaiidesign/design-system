// <sv-error-summary for="form-id">: wraps div.sv-error-summary and enhances it. Light DOM, no styles, no dependencies.
// The form is the one named by for=, else the form it is inside, else the form directly after it.
// On a submit of that form with invalid fields it stops the submit, asks each <sv-field> for its error,
// lists them as links to their controls, shows itself and takes focus (role="alert" announces it).
// While it shows, a listed link follows its field: new words when the field's message changes, gone when it is valid;
// it hides when every field is valid. It listens in the capture phase on the document, so it runs before
// <sv-field>'s own submit handler, and marks the event so that handler leaves focus alone.
// A summary the server rendered takes focus on load only when nothing else has it.
// It sets itself up when its children arrive, if it is connected before them.
// With no script nothing here runs: the summary keeps whatever the server rendered.

class SvErrorSummary extends HTMLElement {
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

  // Returns true once the summary is set up (now or before).
  setup() {
    if (this.onSubmit) return true;
    this.box = this.querySelector(".sv-error-summary");
    this.list = this.querySelector(".sv-error-summary__list");
    if (!this.box || !this.list) return false;

    this.onSubmit = (event) => {
      if (event.target !== this.form) return;
      if (event.submitter && event.submitter.formNoValidate) return;
      event.svChecked = true;
      const invalid = [...event.target.querySelectorAll("sv-field")].filter((f) => f.check && !f.check());
      this.list.replaceChildren(...invalid.map((field) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#" + field.control.id;
        link.textContent = field.error;
        item.append(link);
        return item;
      }));
      this.box.hidden = !invalid.length;
      if (invalid.length) {
        event.preventDefault();
        this.box.focus();
      }
    };

    // A field checked again: its link takes the new words, or goes when the field is valid.
    this.onCheck = (event) => {
      const control = event.target.control;
      if (this.box.hidden || !control || control.form !== this.form) return;
      for (const link of this.list.querySelectorAll("a")) {
        if (link.hash !== "#" + control.id) continue;
        if (event.type === "sv-field-valid") link.closest("li").remove();
        else if (link.textContent !== event.detail.message) link.textContent = event.detail.message;
      }
      if (!this.list.querySelector("a")) this.box.hidden = true;
    };

    document.addEventListener("submit", this.onSubmit, true);
    document.addEventListener("sv-field-valid", this.onCheck);
    document.addEventListener("sv-field-invalid", this.onCheck);
    this.list.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      const control = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!control) return;
      event.preventDefault();
      (control.labels?.[0] || control).scrollIntoView({ block: "start" });
      control.focus({ preventScroll: true });
    });

    // A summary the server rendered is shown on load: move focus to it, as after a failed submit,
    // unless the person is already somewhere (the script arrived late and they are typing).
    const active = document.activeElement;
    if (!this.box.hidden && (!active || active === document.body)) this.box.focus();
    return true;
  }

  disconnectedCallback() {
    this.unwatch();
    if (!this.onSubmit) return;
    document.removeEventListener("submit", this.onSubmit, true);
    document.removeEventListener("sv-field-valid", this.onCheck);
    document.removeEventListener("sv-field-invalid", this.onCheck);
    this.onSubmit = null;
  }

  get form() {
    const id = this.getAttribute("for");
    if (id) return document.getElementById(id);
    const next = this.nextElementSibling;
    return this.closest("form") || (next && next.tagName === "FORM" ? next : null);
  }
}

if (!customElements.get("sv-error-summary")) customElements.define("sv-error-summary", SvErrorSummary);
