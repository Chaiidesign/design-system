Checked: 2026-11-13

Method: fetched primary pages where they opened. Marked "(not verified)" means no primary page confirmed it. Could not open: Curtis's Medium/EightShapes team-model and documentation pages (403/500; the team-model text was read from a Center Centre mirror).

## Dieter Rams
Ten principles, exact headings (https://www.vitsoe.com/gb/about/good-design): innovative; makes a product useful; aesthetic; makes a product understandable; unobtrusive; honest; long-lasting; thorough down to the last detail; environmentally-friendly; as little design as possible. Each is prefixed "Good design is" (or "makes a product").
- Understandable: "It clarifies the product's structure."
- Honest: "does not make a product more innovative, powerful or valuable than it really is."
- Thorough: "Nothing must be arbitrary or left to chance."
- Least design: "Less, but better."

## Nathan Curtis
- Three team models (https://articles.centercentre.com/?p=860, Curtis's 2015 article). Solitary: one team builds for its own product, so priorities fit others poorly. Centralized: a dedicated team, free of one product's agenda, but may lack product context. Federated: designers from product teams decide together; broader relevance, but slower and loyalties split.
- He later retracted the preference for federated: central teams are needed, federation is "a facet", and across 80+ systems he reports no case of federated-only success without investment in central capacity (https://nathanacurtis.substack.com/p/the-fallacy-of-federated-design-systems-23b9a9a05542).
- Token names: namespace, object, base, modifier levels; use a controlled vocabulary; include only needed levels; keep a decision local until about three components need it; alias rather than duplicate values (https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676).
- Component documentation: he has a series covering intros, examples, design guidelines, code, authoring and myths. Only titles seen in search results; content not verified. (https://eightshapes.com/articles/documenting-components/ did not open.)

## Brad Frost
- Atomic design: atoms, molecules, organisms, templates, pages. It is "not a linear process"; work at page level exposes flaws in small parts; stage names can be renamed (https://atomicdesign.bradfrost.com/chapter-2/).
- Interface inventory: screenshot the distinct treatments of each component, sort them by type, and compare side by side. It shows stakeholders inconsistency and is a starting point for a system (https://bradfrost.com/blog/post/interface-inventory/).
- AI: "DS+AI" means generating UI from a design system's own components, via Storybook MCP. He says constraint to the system's materials "distinguishes DS+AI from vibe coding" (https://bradfrost.com/blog/post/agentic-design-systems-in-2026/, dated 16 December 2025 on the page). The post is short and does not discuss autonomous agents in depth.

## Jina Anne
- Tokens are named, data-based representations of visual decisions (colour, type, spacing), converted by tools into each platform's format. Benefits: one source of truth, cross-platform consistency, theming. She cautions a simple site may only need CSS variables (https://smashingmagazine.com/2019/11/smashing-podcast-episode-3/).
- Central plus federated: the Salesforce article, bylined Jina Bolton (same person as Jina Anne is not confirmed on a primary page), pairs a small central core team with federated contributors and calls the result cyclical. The system informs product design and product design informs the system (https://articles.centercentre.com/?p=1980).

## Alla Kholmatova
All from the publisher's book page (https://www.smashingmagazine.com/design-systems-book/) and the free chapter 2 (https://smashingmagazine.com/provide/design-systems-chapter-2.pdf).
- Functional patterns are the concrete, interactive parts of an interface. Perceptual patterns are descriptive: iconography, colour, typography. The "nouns and adjectives" analogy appears only in a secondary source (not verified).
- Shared language is its own chapter; patterns "form the language of your product's interface".
- Principles: effective ones are authentic, practical and actionable, have a point of view, and are relatable and memorable. Generic ones like "Simple. Useful. Enjoyable." do not guide decisions, because such qualities can be interpreted in many ways; good principles ground them in a specific product.
- Separate principle sets per team can contribute to a system's fragmentation, though she notes this works for some companies.

## Harry Roberts
All from https://cssguidelin.es/ unless noted.
- Naming: hyphen-delimited class names that show type, usage and relationships.
- BEM-like: block, element (`__`), modifier (`--`). Elements do not mirror DOM depth: `.person__eye`, not `.person__head__eye`.
- Specificity: keep it low; avoid IDs in CSS, nesting, qualifying and chaining; `!important` only proactively for utilities.
- Namespacing: prefixes `o-` object, `c-` component, `u-` utility, `t-` theme, `s-` scope, `is-`/`has-` state, `js-`, `qa-`, so a class name says what is reusable and what is safe to change (https://csswizardry.com/2015/03/more-transparent-ui-code-with-namespaces/).
- ITCSS: cssguidelin.es does not name it. His own post only says his Skillshare class covers it (https://csswizardry.com/2018/11/itcss-and-skillshare/). Layer order (settings to trumps), and "low to high specificity" ordering: not verified on a primary page.

## Hugh Dubberly
- Analysis-synthesis bridge: observe the current situation, analyse it into a model, model alternatives, then make. Models carry the move from analysis to synthesis; shared models build trust across disciplines (https://www.dubberly.com/articles/interactions-the-analysis-synthesis-bridge-model.html).
- Feedback: a single loop is "a useful first approximation" (iteration, error correction) but a "gross simplification". Feedback only measures distance from a goal, so goals themselves need to be examined, through conversation (https://www.dubberly.com/wp-content/uploads/2021/04/Cybernetics-and-Design.pdf, authored with Paul Pangaro).
- Models of process: his compendium collects over one hundred process models. Processes shape product quality; ad hoc processes are inefficient (https://dubberly.com/articles/how-do-you-design.html).

## For Souvenir
- Learn from Rams and Kholmatova: write principles that say what they mean for this product; "simple, useful" alone guides nothing.
- Learn from Curtis: central team first; invite contribution without depending on it; keep decisions local until about three uses need them.
- Learn from Frost: inventory what exists before designing; constraining AI to system components is his stated route, so documentation must be machine-readable.
- Learn from Roberts and Anne: names should carry meaning (prefixes, token levels); keep tokens only as heavy as the project needs.
- Stay away from: copying Roberts's namespace prefixes or ITCSS layers wholesale (layers unverified), and treating Dubberly's bridge as a strict sequence.

## Review 2026-11-13
Six claims checked against their cited pages: Rams's ten principles and quotes (vitsoe.com, confirmed); Curtis's three team models (Center Centre mirror, confirmed, originally Medium, 17 Sep 2015); Curtis's federated retraction (Substack); Curtis's token naming, including the "3 or more" rule (Substack, confirmed); Frost's DS+AI post; Kholmatova's principles (chapter 2 PDF, text extracted).
- Frost: post date corrected from "8 Dec 2025 per a search result" to 16 December 2025, as shown on the page.
- Curtis: "federated-only success as rare" understated the source; he reports none ("Zero") among 80+ systems without central investment.
- Kholmatova: "because each team reads them differently" was stronger than the source; it says such qualities "can be interpreted in a variety of ways". The fragmentation point now keeps her hedge that separate sets work for some.
- Still missing from the brief: Curtis on component documentation (content not verified, source did not open) and the ITCSS layer order (not verified). Frost's post does not use the word "agents"; no other primary Frost source on AI agents was found by the survey.
