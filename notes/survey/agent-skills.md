Checked: 2026-11-13

Method note: each page was read through a fetch tool that returns a summary of the page, not the raw page. Skill file contents (SKILL.md) were not opened. Lengths are therefore mostly "not verified". Nothing was installed or run.

## Emil Kowalski skills (aiforui.dev/skills)
- What it is: a list of 18 skills, from Animation Vocabulary to Learn Taste, installed with `npx skills@latest add emilkowalski/skills`. The site says the repo has 56,674 stars and 3.5M installs. Source: https://aiforui.dev/skills
- Prototyping: builds several meaningfully different variants of one UI piece, shows each full size on its own route, offers a picker with number keys and a replay key, can keep the choice in the URL, then implements the winner and removes the prototype code. Source: https://aiforui.dev/skills/prototype
- Break UI: maps each UI field to how long its values can get, builds a worst-case dataset (long, short, missing, huge, empty, non-Latin, emoji), shows it behind a "Demo data / Worst case" toggle, and reports each broken element with a cause and fix. Source: https://aiforui.dev/skills/break-ui
- Review Animations: checks motion against rules for easing, duration, origin, properties, interruption and reduced motion. It reports file:line with Before, After and Why, and ends with Approve or Block. The approve/block threshold is not defined on the page. Source: https://aiforui.dev/skills/review-animations
- Learn Taste: at session end it gathers corrections (including file edits and reverts), generalises each into a rule with a reason, asks you to confirm, and writes them to `DESIGN.md`. It may suggest a lint rule instead, and `/learn-taste prune` keeps the file short. Source: https://aiforui.dev/skills/learn-taste
- Format: the skill pages are documentation pages. The repo has a `skills/` folder plus two cheatsheet files; the SKILL.md format was not shown (not verified). Source: https://github.com/emilkowalski/skills
- Licence: MIT for the repo. Source: https://github.com/emilkowalski/skills. The aiforui.dev pages state no licence. The pages also promote a paid course.
- Length: not stated (not verified).
- Recommendation: adapt. The workflows (variants, worst-case data, evidence-backed rules) are reusable, but they are motion- and taste-led, with no WCAG content in the pages read.

## Vercel Web Interface Guidelines (vercel.com/design/guidelines)
- Contents: a "living", non-exhaustive list in sections for Interactions, Animations, Layout, Content, Forms, Performance, Design, Vercel-specific copy, and a section on integrating with agents. Examples: visible, unobscured focus rings; icon-only buttons need labels; prefer native elements over ARIA; tap targets at least 24px, or 44px on mobile; a reduced-motion variant; never disable paste; never `transition: all`. Source: https://vercel.com/design/guidelines
- Agents: the page recommends a `web-design-guidelines` skill for review and an `AGENTS.md` so agents apply the guidelines while generating. Source: https://vercel.com/design/guidelines
- Format and length: Markdown, one bold-labelled bullet per rule. The repo contains AGENTS.md, command.md, README.md, LICENSE and install.sh. A count from the README gives about 130 rules (29 interactions, 10 animations, 7 layout, 24 content, 19 forms, 16 performance, 11 design, 14 Vercel-specific). That count came from a page summary, so treat it as approximate. Source: https://github.com/vercel-labs/web-interface-guidelines
- Licence: MIT for the repo. Source: https://github.com/vercel-labs/web-interface-guidelines. The design page itself states none.
- WCAG: the README links to WCAG 2.2 understanding documents and tells readers to prefer APCA over WCAG 2 for contrast. That conflicts with a WCAG 2.2 AA requirement. Source: https://github.com/vercel-labs/web-interface-guidelines
- Recommendation: adapt. It is the closest match in form (short rules, agent-readable). Reuse the structure and the rules that match WCAG 2.2 AA. Replace the APCA advice, and drop the Vercel-only copy rules.

## /rams (rams.ai)
- Contents: a design review for UI code written by agents, using 365 rules, giving a score out of 100 and severity-rated findings. The page's category counts (accessibility 36, colour 28, typography 43, spacing 30, components 23, UX 77, motion 59, craft 47) add up to 343, not 365, so the 365 is not verified. The page also says "9 categories" but names only eight, and elsewhere says "Eight reviewers". Accessibility is tied to WCAG 2.1 AA and 2.2, and to WAI-ARIA and APG. Source: https://www.rams.ai
- Form: a free `/rams` skill, described as "a free taste of the engine" and listed against the limits "manual, one file at a time", "surface-level checks" and "no score" (the page labels these "Not included", so whether the free skill gives surface-level checks is unclear; not verified); an MCP server; a GitHub App; a CI Action on the Team plan. Source: https://www.rams.ai
- Terms: paid tiers (Solo $33/month, Studio $149/month, Team $399/month, all billed yearly; the same page also says "Flat monthly tiers from $39", which does not match); Terms and Privacy pages are linked but were not read; no open-source licence is stated. The rules themselves are not published on the page, so their text was not read. Source: https://www.rams.ai
- Length: not stated.
- Recommendation: skip as a dependency. It is a commercial, closed service, and the full engine is paid. Its category list is useful only as a coverage checklist.

## UI Skills (ui-skills.com)
- Contents: a catalogue, not one rule set. It lists skills by many authors (ibelick, emilkowalski, anthropics, shadcn, addyosmani and others), grouped as routing and audits, visual design, motion, and engineering. It has a short playbook of tips, for example `aspect-ratio` to reserve space and 44 by 44px touch targets. Source: https://www.ui-skills.com
- Format: install with `npx ui-skills`, or through an MCP server. It mentions `/skills/registry.txt` and `llms.txt`. The skill file format is not described. Source: https://www.ui-skills.com
- Licence: not stated on the page; it points to the GitHub repo ibelick/ui-skills (10.4k stars). Source: https://www.ui-skills.com. Repo licence not checked (not verified).
- Length: not stated.
- Recommendation: skip as a source of rules. It is a directory with mixed authors and licences. Use it only to discover patterns, such as read-only audit skills that write plans without editing code.

## skills.sh
- Contents: the "Agent Skills Directory". Skills are identified as owner/repo plus skill name and installed with `npx skills add <owner/repo>`. It lists about 20 supported agents, a leaderboard (1,376,465 all-time installs shown), and a "Security audits" page whose coverage is not described. Source: https://skills.sh
- Format: the internal skill format is not described on the page (not verified). Licence: skills are said to be open source on GitHub, no licence named; each skill may differ. Source: https://skills.sh
- Length: not stated; it is a directory, so it has no single length.
- Recommendation: adapt, as a distribution channel only. Publishing there could help reach agents, but it gives no rules, and third-party skills are not vetted by the page's own account.

## For Souvenir
- Learn from Vercel's guidelines: one short, bold-labelled rule per bullet in Markdown, plus an `AGENTS.md` for generation and a review command. Reuse only rules that agree with WCAG 2.2 AA.
- Learn from Break UI: test with a worst-case dataset (long, empty, non-Latin, emoji values), because a universal system must survive other languages.
- Learn from Learn Taste: record each correction as a rule with evidence and a reason, in a file agents read, and prune it.
- Stay away from APCA-instead-of-WCAG advice, from copying Vercel's brand copy rules, and from any paid or closed engine as a required check.
- Stay away from importing third-party skills wholesale. Licences are unclear on most pages read, and none of the sources shown here sets accessibility as its core.

## Review 2026-11-13
Six claims were checked against their URLs, again through a summarising fetch tool: Emil's 18 skills, 56,674 stars, 3.5M installs and MIT licence (confirmed); Vercel's 24px / 44px target rule, focus-ring, paste and `transition: all` rules and agent section (confirmed); the Vercel repo's MIT licence, root files, section rule counts and the "Prefer APCA over WCAG 2" line (confirmed); rams.ai's 365-rule claim and category counts summing to 343 (confirmed); rams.ai pricing and free-skill description (corrected below); skills.sh's 1,376,465 all-time installs and 20 agents (confirmed).
- rams.ai free skill: the file stated as fact that it gives surface-level checks and no score; the page lists those items under "Not included", so the claim was softened and marked not verified.
- rams.ai pricing: added that Studio and Team are also per month billed yearly, and that the page also says "from $39", which conflicts with $33.
- rams.ai categories: added that the page claims nine categories but names eight.
- skills.sh: the requested length line was missing; added.
