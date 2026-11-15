/* Stand-in for the built script, used only by the lint self-test. Written the way esbuild minifies: the error
   messages are read through an alias of the dataset object, and errorLine is a property, not a data attribute. */
class e extends HTMLElement{connectedCallback(){let t=this.querySelector("input"),i=t&&t.dataset;this.errorLine=this.querySelector("p"),this.message=i&&(i.errorRequired||i.errorType),this.label=this.querySelector("button")?.dataset.busyLabel}}customElements.get("sv-demo")||customElements.define("sv-demo",e);
