# Changelog

Versions follow semver. While the version is below 1.0.0, a minor release may contain breaking changes; each one is listed under "Breaking".

- **Major** (breaking): a token or class is renamed or removed, or a component's required markup changes.
- **Minor**: a new token, component, variant or theme.
- **Patch**: a value or style fix that needs no change from people using the system.

## 0.1.0 (2026-11-12)

First release.

### Added

- Tokens in DTCG 2025.10 format: palette, space, radius and font primitives; semantic colour, size, shape, border, motion and elevation tokens; light and dark themes.
- Build to CSS custom properties, a resolved JSON token list, and a generated docs data file.
- Components: Button, Field, Callout, each with usage, accessibility and content guidance.
- Checks: colour contrast for 36 pairings in both themes; CSS lint for raw colours, palette tokens and unknown tokens.
- Reference page, `AGENTS.md`, `llms.txt`.
