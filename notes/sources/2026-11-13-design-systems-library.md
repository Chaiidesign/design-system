# Source summary: Design Systems Library: Learning Resources, Reads & Tools

Date of summary: 2026-11-13. Altitude: system. Label: brick.
Source: https://docs.superhuman.com/d/_dtmg5MfafTI/Start-here_suOttF7J (doc id tmg5MfafTI). It has 15 pages, written by Chaitanya Landge. It says its links were checked in November 2026.

## What this is and how I read it

The library describes itself as "a curated, link-checked library for anyone learning design systems". It started as notes on the InVision *Design Systems Handbook* (2017) and was updated for 2026. It defines a design system as reusable components plus the rules, context and instructions that let people *and* AI agents assemble them. It splits every system into standards (the why) and components (the what), connected by design tokens.

I read the document with the Superhuman Docs tools and did not edit it. I read these pages in full, including their tables: Start here, What makes a design system, Visual map (text only), AI & the future of design systems, and Learning path. I skimmed the Tools table (43 rows), the Reference design systems tables, and the directory's summary table, filters and views. I did not go through the directory's 353 rows one by one, and I opened no external links.

## What makes a design system

**Seven layers** (What makes a design system page). The page says "Most 'design systems' online only have layers 2–3; the great ones have all seven."
1. Principles & vision.
2. Foundations (tokens).
3. Components.
4. Patterns, "Where most UX quality actually lives".
5. Guidance: when to use something, accessibility, content and voice.
6. Tooling & distribution, including MCP servers.
7. Governance & operations: "Without it, systems decay into design debt."

**Five types of system:** a full design system, a component library, guidelines only, a CSS framework, and a UI kit. The page's advice: to learn how a system is built, study full systems; to start a product fast, a component library plus your own tokens is often the right base.

**Ten traits of great systems:**
1. Tokens are named by purpose ("`color.text.danger`, not `red-500`"), layered from primitive to semantic to component.
2. Every component documents when *not* to use it ("Guidance beats inventory").
3. Accessibility is built into the components.
4. Design and code are one source of truth.
5. Content is part of the system.
6. It is versioned like software.
7. Governance is visible.
8. It is backed by research.
9. It is adopted, and its usage is measured.
10. It is machine-readable: W3C tokens, MCP or llms.txt, and rules an AI can follow.

**Failure modes:** the component dump, Figma and code drifting apart, launch and leave, no path for change, accessibility as an afterthought, and rules that are "Not written down".

**Directory rubric:** tier A (reference-grade), B (solid) or C (basic or abandoned), plus filters for type, status, tokens, accessibility docs, AI-readiness and more.

## The visual map

**I could not get the process steps.** The process loop appears only as an image. My attempt to view the page in a browser failed because the extension did not respond. So I cannot list the steps in order, and I have not substituted steps from anywhere else. The caption says only: "Teal steps build the system; coral steps run and maintain it," and "Improving feeds the next audit, so the loop never closes for good."

The other diagrams are also images, so I have only their captions:
- **Structure: "six layers".** An agent layer that "makes the layers beneath it readable and checkable by AI". Patterns, voice and accessibility "sit inside Guidelines and Components". **This does not match** the seven layers on the previous page.
- **Tokens.** "Components should only reference semantic tokens, never primitives."
- **Sync.** Tokens come from one source file, components are linked rather than copied, and "CI catches drift."
- **Agent loop.** The author calls it "my reading of the loop Brad Frost describes, simplified". Gates reject off-system output, and usage data flows back.

## AI and the future of design systems

**Core claim:** generating UI is cheap. Keeping it "consistent, accessible and on-brand" is the hard part, so the design system becomes the context and guardrails for agents.

**What an AI-ready system needs** (the page's checklist):
- W3C-format tokens named by purpose.
- Components linked between Figma and code.
- Written rules with reasons, plus do/don't examples.
- An MCP server.
- A short AGENTS.md in each repo ("never hardcode colors").
- Automated guardrails: Stylelint, axe and Chromatic.
- Measuring off-system UI as drift.

**Cited studies and numbers:**
- **W3C Design Tokens Community Group, spec 2025.10** (Oct 28, 2025). The library notes it is "not a full W3C Recommendation."
- **zeroheight, State of AI in Design Systems 2026.** A vendor survey with 123 respondents; the full report is behind a form. Findings: 82% of teams use AI, 17% rate their docs very AI-ready, and 59% see UI generated outside the system.
- **Gloaguen et al., ETH Zurich and LogicStar.ai, Feb 2026, arXiv 2602.11988.** **The library gives this result two ways.** The page body says costs rise "by over 20%". The reading list says "no significant gain in success and about 20% more cost", and that human-written files did "about 7% better" than generated ones. The library's lesson: "Write only what an agent can't work out on its own."
- **Figma MCP.** About 1 million weekly users, usage up 3x in a quarter, and agent writes up 4x. These are secondhand: "Figma earnings, as discussed on Dive Radio".
- **Kaelig Deloumeau-Prigent's report (Jul 2026).** 21 systems, 165 techniques, 6 platforms; about $2,500 in tokens and about a week to build. It had 6,000+ visitors, with about 10% going past the first page.

**Field notes**, labelled "practitioner views, not settled facts":
- Fix foundations first, or AI "just scales the mess".
- Brad Frost's ladder: from rules files to an MCP server, then patterns, specs, a CI "steel curtain", and a feedback loop.
- MCP is table stakes; Meta runs nightly evals.
- Docs should be mirrored in markdown, llms.txt and JSON.
- Rules files hide new design debt.

**Open questions:** how to test that an agent followed the system, whether agent and human docs should share one source, how much freedom agents get to propose new components, and "Where does taste live".

## The learning path

The path has six stages, each with readings, a task and a "you're ready when" test:
1. **Understand:** a UI audit.
2. **Foundations:** primitive and semantic tokens with light and dark modes. You're ready when you can explain why `color.text.danger` beats `red-500`.
3. **Components:** a button in Figma and code, in Storybook, with CSS generated by Style Dictionary. You're ready when one token change updates both.
4. **Accessibility:** passes axe, and works fully by keyboard.
5. **Running a system:** a semver changelog entry, 3 principles and a voice note.
6. **AI-ready:** an AGENTS.md plus an MCP connection. You're ready when an agent "can build a screen with your system without inventing new styles."

**A mismatch:** Stage 6 assigns Brad Frost's "Agentic Design Systems in 2026", which the reading list describes as "a short pointer… not a full essay".

## Tools and systems the library points to most

**Starter toolkit:** Figma Variables, the W3C token format with Tokens Studio, Style Dictionary or Terrazzo, Storybook, shadcn/ui on Radix or Base UI, axe and Lighthouse, Chromatic, and Figma or Storybook MCP plus AGENTS.md.

**Retired tools:** Backlight (closed June 2025) and Specify (closed Nov 2024) are marked "don't use".

**Systems to study first:**
1. GOV.UK: accessibility and governance.
2. IBM Carbon: tokens and theming.
3. GitHub Primer: versioning and deprecation.
4. Shopify Polaris: content and voice.
5. Material 3: visual language and motion.

**Directory counts** (the library's own figures, all approximate): about 350 systems, about 110 at Tier A, about 70 verified AI-ready, and about 35 gone or stale.

## What the library says that a builder should treat as a rule versus as opinion

**Stated as rules:**
- Components reference only semantic tokens.
- Tokens are named by purpose.
- Never hardcode colours.
- Accessibility is handled inside the components.
- Changes are versioned with semver.
- Do not use Backlight or Specify.

**Marked as opinion or provisional by the library itself:**
- The field notes ("not settled facts").
- The agent loop ("my reading… simplified").
- "Historical" resources ("ideas, not instructions").
- The token spec (not a W3C Recommendation).
- The directory tiers ("a guide").
- Storybook MCP (still labelled preview).

The ETH study is evidence, not a rule, and the library quotes it inconsistently.

## Gaps: what it does not cover

- **Pages I did not read:** Books & courses; Articles; Design engineering; InVision further reading; 2x2; Data gaps; and the Glossary (a keyword search matched nothing, but I did not read it).
- **Process loop:** the step names are unavailable as text.
- **Internal inconsistencies:** six versus seven layers, the ETH cost figure, and the Brad Frost reading.
- **Not addressed** in the pages I read:
  - Adoption metrics beyond "Usage is measured".
  - How to test agent compliance (the library leaves it as an open question).
  - Staffing models.
  - Guidance specific to chat or AI-native interfaces.
