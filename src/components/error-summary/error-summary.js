// <sv-error-summary for="form-id">: wraps div.sv-error-summary and enhances it. Light DOM, no styles, no dependencies.
// The form is the one named by for=, else the form it is inside, else the form directly after it.
// On a submit of that form with invalid fields it stops the submit, asks each <sv-field> for its error,
// lists them as links to their controls, shows itself and takes focus (role="alert" announces it).
// It hides when every field is valid. It listens in the capture phase on the document, so it runs before
// <sv-field>'s own submit handler, and marks the event so that handler leaves focus alone.
// With no script nothing here runs: the summary keeps whatever the server rendered.

class SvErrorSummary extends HTMLElement {
  connectedCallback() {
    this.box = this.querySelector(".sv-error-summary");
    this.list = this.querySelector(".sv-error-summary__list");
    if (!this.box || !this.list || this.onSubmit) return;

    this.onSubmit = (event) => {
      if (event.target !== this.form) return;
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

    this.onValid = (event) => {
      const control = event.target.control;
      if (this.box.hidden || !control || control.form !== this.form) return;
      for (const link of this.list.querySelectorAll("a")) {
        if (link.hash === "#" + control.id) link.closest("li").remove();
      }
      if (!this.list.querySelector("a")) this.box.hidden = true;
    };

    document.addEventListener("submit", this.onSubmit, true);
    document.addEventListener("sv-field-valid", this.onValid);
    this.list.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      const control = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!control) return;
      event.preventDefault();
      (control.labels?.[0] || control).scrollIntoView({ block: "start" });
      control.focus({ preventScroll: true });
    });

    // A summary the server rendered is shown on load: move focus to it, as after a failed submit.
    if (!this.box.hidden) this.box.focus();
  }

  disconnectedCallback() {
    if (!this.onSubmit) return;
    document.removeEventListener("submit", this.onSubmit, true);
    document.removeEventListener("sv-field-valid", this.onValid);
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
