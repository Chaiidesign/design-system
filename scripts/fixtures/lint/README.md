# Lint fixtures

A miniature repository. `node scripts/lint.mjs --self-test` lints every file here with this folder as the root.
A file named after a rule (`css-unit.css`, `html-style-attr.html`; a suffix after `--` tells variants apart) must produce that rule and no other.
A file whose name begins `clean` must produce nothing. `dist/souvenir.css` stands in for the built CSS.
`src/base/icons.css` keeps its real name (the data-URI exemption depends on it) and is a clean fixture.
This README is not linted (only `docs/components/*.md`, `docs/layout.md`, `docs/patterns.md` and `AGENTS.md` are).
`docs/layout.md`, `docs/patterns.md` and `AGENTS.md` keep their real names (the lint reads them by name), so each states
what it must produce in a comment: `<!-- lint-expect: <rule> -->`, or `<!-- lint-expect: nothing -->` for a clean one.
A file whose name begins `demo-` must produce nothing: it proves demo pages are exempt from `html-many-primary`.
