# Exceptions to principle 6

Principle 6 says nothing in brick may depend on software with a pre-release version tag or a version below 1.0, "except items on a written exception list". This is that list. Only the CEO adds to it. Each entry names the dependency, the pinned version, the conditions, and how the entry ends.

| Dependency | Pinned version | Granted | Conditions | Ends when |
|---|---|---|---|---|
| UI SDK: `@ui-sdk/core` and one adapter (github.com/vercel-labs/ui, Apache-2.0) | Exactly `0.1.0-beta.3`. An upgrade is a change like any other, with tests | By the CEO on 15 November 2026 ("Yes, add it") | A Souvenir component stands in front of every UI SDK part; products import the Souvenir component and never `@ui-sdk/*`. Every UI SDK-backed part ships native fallback markup and its core task works with scripts off. Its default stylesheet is never loaded. Our own checks decide accessibility | UI SDK reaches 1.0 (the entry is then not needed), or the CEO says "watch only" |

What this entry does not change: the JavaScript budget rows in `budget.md` (5 kilobytes per component, 15 for the checkout slice). A UI SDK-backed part that exceeds them is still blocked until the CEO changes the row.
