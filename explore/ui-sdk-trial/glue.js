// Clay: the glue the UI SDK page needs and the native page does not.
// ui-select and ui-checkbox replace the native control instead of wrapping it, so the page carries a native
// <select> and <input type="checkbox"> for scripts off. Once UI SDK has defined its element, this moves the
// person's choice across (valid input is never lost) and removes the fallback, so each name submits once.
customElements.whenDefined("ui-select").then(() => {
  for (const sdk of document.querySelectorAll("ui-select")) {
    const native = sdk.querySelector(":scope > select");
    if (!native) continue;
    if (native.value) sdk.value = native.value;
    native.remove();
  }
});
customElements.whenDefined("ui-checkbox").then(() => {
  for (const sdk of document.querySelectorAll("ui-checkbox")) {
    const native = sdk.parentElement.querySelector(':scope > input[type="checkbox"]');
    if (!native) continue;
    sdk.checked = native.checked;
    native.remove();
  }
});
