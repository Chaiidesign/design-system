# Survey synthesis

Altitude: system and patterns. Status: draft until Gate 1. Gathered by Sonnet 5.5, each file checked by Opus 5.5, synthesised by Opus 5.5. Date: 2026-11-13.

File names in brackets are in `notes/survey/` unless they start with `sources/`, which means `notes/sources/`.

## Purpose and method

This document lets the lead decide from the survey. It draws on the twelve survey files (six systems, DTCG 2025.10, agent skills, craft, thinkers, libraries, checkout evidence), the three source summaries in `sources/`, and the Why and Constraints sections of CLAUDE.md.

All survey files were checked on 2026-11-13, mostly through a summarising fetch tool, so wording is often paraphrase [apple-hig.md and material-design-3.md used page JSON and a browser]. Each file's closing review re-checked about six claims and logged corrections. The survey files were written by Sonnet 5.5 subagents and each was reviewed by a fresh Opus 5.5 subagent; one of the twelve passed review with no corrections. This synthesis was written by Opus 5.5 without browsing, since no two survey files contradict each other on substance (see Risks).

Labels for claims about behaviour:
- **[R]** means supported by cited research.
- **[P]** means inferred from established patterns.
- **[A]** means an assumption that needs a human test.

## What the strong systems have in common

- **Purpose names.** Five of the six name colours by purpose, not value; Apple does it through platform colour APIs, not tokens [ibm-carbon.md, atlassian-design-system.md, material-design-3.md, govuk-design-system.md, apple-hig.md].
- **One name, per-theme values** for light and dark [atlassian-design-system.md, ibm-carbon.md, material-design-3.md, apple-hig.md].
- **Errors say how to fix it** [apple-hig.md, ibm-carbon.md, atlassian-design-system.md, shopify-polaris.md, govuk-design-system.md]. Apple adds "avoid blame" [apple-hig.md]; GOV.UK and Polaris reject "invalid" [govuk-design-system.md, shopify-polaris.md]. [P]
- **Sentence-case verb button labels** [atlassian-design-system.md, ibm-carbon.md, shopify-polaris.md, apple-hig.md]. [P]
- **Automated plus manual accessibility testing,** wherever testing is described [govuk-design-system.md, ibm-carbon.md, atlassian-design-system.md].

## Where they differ, and the reason each gives

- **Accessibility floor.** GOV.UK: WCAG 2.2 AA, backed by external audits. Atlassian 2.1 AA, Carbon a WCAG AA checklist, Material no level with "minimum 3:1" pairs, Apple WCAG AA values plus APCA. Apple's reason for system colours: they adapt to Increase Contrast and dark mode. Others state no reason [govuk-design-system.md, atlassian-design-system.md, ibm-carbon.md, material-design-3.md, apple-hig.md].
- **Token format and branding.** None publishes DTCG JSON: Sass in GOV.UK and Carbon, a code API in Atlassian, CSS properties in Material [govuk-design-system.md, ibm-carbon.md, atlassian-design-system.md, material-design-3.md]. GOV.UK says it does not support custom branding [govuk-design-system.md].
- **"When not to use".** Carbon and GOV.UK document it; Apple and Polaris lack it (no reason stated) [ibm-carbon.md, govuk-design-system.md, apple-hig.md, shopify-polaris.md].
- **Flexibility.** Atlassian rejects both "consistency for the sake of consistency" and "infinite flexibility" [atlassian-design-system.md]. Polaris seals components; staff call web components "the future of the admin" [shopify-polaris.md]. Material moves features to Compose only [material-design-3.md].
- **Versioning.** GOV.UK semver; Carbon "aims to follow" semver; Polaris immutable channels; Atlassian release phases, saying breaking changes "should be infrequent"; Apple per-page change logs. Otherwise no reason stated [govuk-design-system.md, ibm-carbon.md, shopify-polaris.md, atlassian-design-system.md, apple-hig.md].
- **When to validate.** Apple, Atlassian, Baymard and NN/g: on leaving the field. Carbon: real-time "helps", otherwise on submit [apple-hig.md, atlassian-design-system.md, checkout-evidence.md, ibm-carbon.md].
- **Error summary.** GOV.UK always shows one; NN/g warns against relying on it alone (no reasons stated) [govuk-design-system.md, checkout-evidence.md].
- **Motion.** Rauno 200ms or less, Kowalski under 300ms, Krehel's example 800ms; none gives evidence [craft-and-taste.md].

## What to adopt, adapt and avoid for Souvenir

| Practice | Source | Decision | Reason | Supports |
|---|---|---|---|---|
| Purpose-named semantic tokens; light and dark as one resolver modifier | DTCG, Material, Carbon | Adopt | Fits the required primitive, semantic and component layers | dtcg-2025-10.md, material-design-3.md, ibm-carbon.md |
| Colour role pairs, used only in their intended pairs | Material | Adapt | Keeps contrast safe across themes. Raise Material's 3:1 minimum to WCAG 2.2 AA | material-design-3.md |
| Component page with when to use, when not to use, research and recent changes | GOV.UK, Carbon | Adopt | Shows why each rule exists | govuk-design-system.md, ibm-carbon.md |
| Accessibility-status tag on each component | Carbon | Adopt | States honestly what has been tested | ibm-carbon.md |
| Same wording in the error message and the error summary; banned words | GOV.UK | Adopt | Specific and public | govuk-design-system.md |
| Error text replaces helper text; a message that dismisses itself also appears inline | Material | Adopt | No layout shift; message not lost [P] | material-design-3.md |
| Never disable the submit button | Atlassian, web.dev | Adopt | Instructions beat a dead control [P] | atlassian-design-system.md, checkout-evidence.md |
| Short line items, business name on the total, disclose later costs | Apple Pay | Adapt | The only guidance on cost summaries found | apple-hig.md |
| llms.txt index with topic files, plus MCP hosted and local; not one ~640k-character full file | Atlassian, Carbon | Adopt | Agents load only what they need | atlassian-design-system.md, ibm-carbon.md |
| Short bold-led rules, AGENTS.md and a review command | Vercel | Adapt | Right form for agents. Drop the APCA advice and the brand copy | agent-skills.md |
| Worst-case data testing | Break UI | Adopt | Long, empty, non-Latin and emoji values test universality | agent-skills.md |
| Deprecate before removing; release phases | Atlassian, GOV.UK | Adopt | Predictable for consumers [P] | atlassian-design-system.md, govuk-design-system.md |
| Motion duration and frequency bands | Kowalski | Adapt | Testable, but we set our own ranges | craft-and-taste.md |
| Sealed, unstyleable components | Polaris | Avoid | Blocks ADAPT | shopify-polaris.md |
| Deprecating the old system before the new one reaches parity | Polaris, Material Web | Avoid | Developer complaints; one former engineer's account of weak adoption (anecdotes) | shopify-polaris.md, material-design-3.md |
| Leaving the decider unstated | Carbon, Atlassian, Material, Apple | Avoid | Who decides is already an open gap here | ibm-carbon.md, atlassian-design-system.md, material-design-3.md, apple-hig.md |
| Central team first; contribution invited, not relied on | Curtis | Adopt | Curtis reports no federated-only success among 80+ systems | thinkers.md |
| Copying visual recipes (shadow, blur, glass) | Krehel, Apple | Avoid | Visual style, not principle; we start from a clean slate | craft-and-taste.md, apple-hig.md |

## What the systems give AI agents today, and what is still missing everywhere

**Today:** Atlassian has llms.txt with topic files and an MCP server; its skill is staff-only [atlassian-design-system.md]. Carbon has a hosted MCP server, llms.txt, and named install locations for AGENTS.md and skills [ibm-carbon.md]. Polaris has an early-access local MCP server and Markdown pages [shopify-polaris.md]. Material has only Google's Design MCP (colour, icons, fonts) and a migration skill [material-design-3.md]. Apple and GOV.UK have nothing official [apple-hig.md, govuk-design-system.md].

**Still missing.** These hold across the six systems, on the pages the survey read:
- **No published method to test that an agent followed the system.** Atlassian reports eval gains without describing a method [atlassian-design-system.md]. The library leaves this as an open question [sources/2026-11-13-design-systems-library.md].
- **No cost-summary or order-summary component.** Apple Pay offers guidance only [govuk-design-system.md, ibm-carbon.md, shopify-polaris.md, material-design-3.md, atlassian-design-system.md, apple-hig.md].
- **Almost no guidance for chat or AI-native interfaces.** The library flags the gap [sources/2026-11-13-design-systems-library.md]. Carbon has an "AI presence" section that the survey did not read in depth [ibm-carbon.md].
- **Mixed evidence on agent context files.** The library reports Gloaguen et al. (2026) two ways: costs up "by over 20%", and "no significant gain in success" with human-written files about 7% better [sources/2026-11-13-design-systems-library.md]. [R, reported inconsistently]

## Evidence a checkout slice can cite

**How people behave**
- **Costs.** "Extra costs too high" was 40%, and "couldn't see total up front" 12%, among shoppers who meant to buy. The 42% who were just browsing are excluded, and no sample size is given. **[R]** A 2017 figure of 21% comes from a different survey, so 21% against 12% is not a trend. **[R, dated]** [checkout-evidence.md]
- **New costs at review.** One tester felt "duped" by a late fee rise. 65% of 60 sites rated poor to just acceptable [checkout-evidence.md]. **[R, 2019]**
- **Field count.** The average checkout has 11.3 fields, while 8 usually suffice. 42% of testers typed a full name into "First Name" [checkout-evidence.md]. **[R]**
- **Labels.** Keep labels visible rather than using placeholders [checkout-evidence.md]. **[R, 2013, dated]**
- **Validation.** Validate when the user leaves the field. Baymard benchmarks this, and NN/g's guideline gives no data [checkout-evidence.md]. **[P]**
- **Start buttons.** Green start buttons improved click-through, according to GOV.UK's own testing [govuk-design-system.md]. **[R, the system's own research]**
- **Untested.** Show the total before payment details, and mark required and optional fields. Both come from search snippets only [checkout-evidence.md]. **[A]**
- **Error recovery.** People recover from errors without starting over. No controlled study was found [checkout-evidence.md]. **[A]** This is H2/E2 [sources/2026-11-13-figjam-board.md].
- **Honest totals.** People understand an honest total before paying. **[A]** This is H1/E1 [sources/2026-11-13-figjam-board.md].

**Regulation (legal facts, not behaviour)** [checkout-evidence.md]
- **UK:** DMCC s.230 (in force 6 April 2025) and CMA guidance put unavoidable charges in the total.
- **US:** the FTC fees rule covers only live-event tickets and short-term lodging.
- **EU:** Article 6(1)(e) text unconfirmed; the Digital Fairness Act is a proposal.

**Standards.** WCAG 2.2: 1.3.5, 1.4.3, 1.4.11, 2.4.7, 2.4.11, 2.5.8, 3.3.1 to 3.3.3, 3.3.7, 3.3.8, 4.1.3; paraphrased in the survey, so quote W3C for wording [checkout-evidence.md].

## Technology options for phases 2 to 4

Options are grouped by layer. The lead chooses, and the choices are recorded in DECISIONS.md.

- **Token build.** Style Dictionary (Apache-2.0; 2025.10 support incomplete), Terrazzo (MIT; resolver planned for 2.0), or our own build step, which costs maintenance [dtcg-2025-10.md, behaviour-and-distribution.md].
- **Behaviour layer.** Native HTML (dialog, popover, inert, `:user-invalid`) plus custom elements: no framework, but we build what the platform lacks. Radix or React Aria: React only, maturity not surveyed. UI SDK: multi-framework and agent-oriented, but beta with no version shown [behaviour-and-distribution.md].
- **Distribution.** A package (fixes propagate) or a shadcn-style registry (agents edit copies easily, but copies drift) [behaviour-and-distribution.md].
- **Testing.** axe through Storybook (can fail CI) or Playwright, plus manual review: axe claims about 57% coverage [behaviour-and-distribution.md], GOV.UK cites about 30% [govuk-design-system.md].
- **Agent delivery.** Combinable: llms.txt with topic files, MCP (hosted, local or both), AGENTS.md and skills, Markdown mirrors [atlassian-design-system.md, ibm-carbon.md, shopify-polaris.md, agent-skills.md].
- **Versioning.** Semver (deprecate in a minor, remove in the next major) or immutable channels (stable, pinned, release candidate) [govuk-design-system.md, shopify-polaris.md].

## Risks

- **Beta dependencies.** UI SDK is in beta [behaviour-and-distribution.md]. Polaris Dev MCP is in early access [shopify-polaris.md]. Storybook MCP is in preview [sources/2026-11-13-design-systems-library.md].
- **Format status.** DTCG 2025.10 is a Community Group report, not a W3C Standard; its pages contradict themselves on Candidate Recommendation status, and tool claims of DTCG support are unproven against 2025.10 [dtcg-2025-10.md].
- **Version facts.** One survey file says Style Dictionary's version is "not shown"; another gives v5.8.0. Both agree that 2025.10 support is incomplete [behaviour-and-distribution.md, dtcg-2025-10.md].
- **Not verified.** Most facts come from summarising fetches. Radix, React Aria and Terrazzo versions are unknown; popover light dismiss is unconfirmed, and popover and `@scope` are only newly available [behaviour-and-distribution.md]. Carbon's principles are unread [ibm-carbon.md].
- **Conflicting advice.** Vercel prefers APCA, which conflicts with the WCAG 2.2 AA floor [agent-skills.md].
- **Licences.** Third-party skill licences are mostly unstated [agent-skills.md].
- **Coverage gap.** GitHub Primer, which the library ranks third for versioning, was not surveyed [sources/2026-11-13-design-systems-library.md].

## Open questions for the lead

1. Touch target floor on mobile: WCAG's 24px, or Apple's and Vercel's 44px? [checkout-evidence.md, apple-hig.md, agent-skills.md]
2. Is a React-only behaviour layer acceptable under "universal"? [behaviour-and-distribution.md]
3. Accept UI SDK's beta churn, or only watch it? [behaviour-and-distribution.md]
4. What browser policy covers newly available features (popover, `@scope`)? [behaviour-and-distribution.md]
5. Semver or immutable channels? [govuk-design-system.md, shopify-polaris.md]
6. Package, copy-in registry, or both? [behaviour-and-distribution.md]
7. Always show an error summary, as GOV.UK does? [govuk-design-system.md, checkout-evidence.md]
8. Who defines and measures "checkout comprehension" before E1? [sources/2026-11-13-figjam-board.md]
9. Who is the steward, and who owns E1 and E2? [sources/2026-11-13-figjam-board.md]
10. How is agent compliance tested beyond the benchmark? No surveyed system publishes a method [atlassian-design-system.md].
11. Survey Primer's deprecation practice before Gate 2? [sources/2026-11-13-design-systems-library.md]
