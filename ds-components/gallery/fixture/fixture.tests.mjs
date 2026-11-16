// Named tests for the test fixture. Not shipped.
// The spec asks for three tests. "fixture-native-button" passes, "fixture-planted-failure" fails on
// purpose, and "fixture-enter-activates" is deliberately absent so the runner reports it as not implemented.
export const tests = {
  "fixture-native-button": async ({ page, open, expect }) => {
    await open("clean", { theme: "light", width: 375 });
    const tag = await page.locator('[data-slot="fixture-control"]').first().evaluate((el) => el.tagName);
    expect.equal(tag, "BUTTON", "the control is a button element");
    const type = await page.locator('[data-slot="fixture-control"]').first().getAttribute("type");
    expect.equal(type, "button", "the control's type is button");
  },

  // PLANTED FAULT: asserts something false, so the runner must record a failure with this message.
  "fixture-planted-failure": async ({ page, open, expect }) => {
    await open("clean");
    const text = await page.locator('[data-slot="fixture-label"]').first().textContent();
    expect.equal(text, "Not the label", "planted: the label is checked against the wrong words");
  },
};
