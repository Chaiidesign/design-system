# Systems Notebook: source summary

Date: 2026-11-13. Altitude: system. Label: brick.

## What this is and how I read it

The "Systems Notebook" is a working notebook for Hugh Dubberly's Systems Design Studio (CCA, MDes Interaction Design, IXDGR 6400, Spring 2026). It holds a 15-week course map, a lecture library and three built modules: Week 01 (models), a Platforms lecture module and Week 08 (system dynamics, "built ahead"). Its footer names three sources: the Spring 2026 syllabus v1, "Core models for systems designers" (Dubberly Design Office, Nov 15 2023) and "Systems Theory in Design — Platforms" (Dubberly, Oct 20 2020).

I read the full saved HTML copy (931 lines, including the script section with the course map, library, bench data and example text). I did not open the live artifact URL. I read the interactive outputs from the code and did not run them.

## The course's definition of a system and the ladder of system capabilities

The course description reads: "A system is a set of elements that someone sees as related — organized in some way (i.e., creating patterns of behavior), often with a purpose, perhaps with unpredictable results." The observer is part of the definition. The concept-map example adds that someone draws a boundary, which separates the system from its environment.

Week 08 adds Meadows's definition, which "lines up with the course's": things interconnected so that they produce their own pattern of behavior over time. Elements are the easiest part to see and usually the least important to change. Interconnections are physical flows and information flows. Purpose is inferred from behavior, not from stated intent. It is the hardest part to see and the most powerful to change.

The course has three objectives: understand, represent and design systems. The notebook names "Dubberly's ladder of system capabilities" as Measure, Monitor, Control, Model, Automate, Converse. It lists the rungs but does not define them.

## The iceberg model (including the notebook's own "design system drift" example, quoted)

The model has four levels, and the deeper the level, the more leverage it gives:

1. Events ("What just happened?"): react. Fixes this instance only.
2. Patterns and trends ("What trends have there been over time?"): anticipate.
3. Underlying structures ("What has influenced the patterns? What are the relationships between the parts?"): design. "This is where design works."
4. Mental models ("What assumptions, beliefs and values do people hold about the system? What beliefs keep it in place?"): transform. Most leverage, hardest to move.

The notebook's design-system drift example:

- Events: "A release ships with three different primary buttons."
- Patterns: "Each sprint a few more one-off components appear, mostly right before deadlines."
- Structures: "Design and code libraries aren’t aligned, no one owns the system, and teams are rewarded for shipping features rather than reuse."
- Mental models: "“The design system slows us down.” “Consistency is design’s problem, not engineering’s.”"

## Concept maps and propositions

The unit is a proposition: two concepts joined by a linking phrase, read as a sentence (Subject, predicate, Object). A map is a set of propositions that share concepts. "If you can't read a link aloud as a sentence, it isn't finished." That is why every link must be labeled.

From Novak and Gowin: a concept is a perceived regularity designated by a label. Maps run from general concepts at the top to specific ones below. Cross-links between branches often mark the most creative insight. Each weekly map also needs a headline written as a sentence.

## The analysis-synthesis bridge

Designers cannot jump straight from what is to what could be. They go "up and over" through models. The bridge has two axes: concrete to abstract, and current (existing, implicit) to future (preferred, explicit). Its steps are:

1. What is, distilled to a model of what is. This is analysis.
2. That model suggests a model of what could be. This step happens at the abstract level, "where it's cheap to change things."
3. That model manifests as what could be. This is synthesis, back to the concrete.
4. Once implemented, it becomes the new what is: "a loop, not a line."

Weeks 12 to 15 of the final project walk the bridge in order.

## Platforms (API, layer and stack, platform, the five attributes, the five kinds, product thinking versus platform thinking)

An API is the rules for connecting programs, "a kind of valence: a potential for connecting." It sets who can make a request, how, and for what. Layers are independent units that build on one another to form a stack. APIs govern traffic between layers, so each layer can be developed separately or swapped out. A platform, quoting Andreessen, is "a system that can be programmed and therefore customized by outside developers." It has two levels: Level 1 holds the core services and Level 2 holds outside developers' apps.

Platforms win through a reinforcing loop. The platform attracts developers, who make applications. Applications attract users, and users validate the platform. The loop is virtuous when it grows and vicious when it shrinks.

There are five attributes: core services, rules, open access, discoverability and platform thinkers. Each can be dialed up or down. For example, iOS gates developer access.

There are five kinds, and they are not mutually exclusive (Facebook is all five):

- Technology: stacks and layers.
- Business: markets and matchmaking.
- Content: story-worlds.
- Combinatorial: a palette of options users configure, such as Starbucks or Lego.
- Engagement: knowing users, with a CRM at the core.

Product thinking versus platform thinking runs across the marketing P's:

- Proprietary versus open and co-created.
- One-off transactions versus ongoing relationships.
- Mass broadcast versus individual conversations.
- Periodic sampling versus real-time feedback.
- Manager as commander versus manager as mentor.
- Central control and stage gates versus distributed responsibility.
- A big idea versus a big ideal.

The platform-thinking values include openness and a whole-systems view. Evidence: 46 of the 1995 Fortune 100 were not on the 2015 list, and 9 of 46 newcomers were built around platforms. The close ties to Engelbart's "bootstrapping."

## System dynamics (stocks, flows, dynamic equilibrium, reinforcing and balancing loops, delays, anything on feedback, goals, sensors, actuators, variety or cybernetics)

A stock is an accumulation that can be measured at one instant. Flows fill it from a source and drain it to a sink. When inflow equals outflow, the stock holds steady while material moves through it. This is dynamic equilibrium.

Causal loop diagrams link quantities with plus signs (same direction) or minus signs (opposite direction). A reinforcing loop (R) runs toward explosion or collapse. A balancing loop (B) pulls toward a level. To tell them apart, count the minuses: an even count means R and an odd count means B. The lecture's example is eggs and chickens (R) and chickens and road crossings (B). Which loop dominates decides the outcome.

Lag is "a main cause of overshoot." A balancing loop that corrects using old information oscillates, which Week 9 calls "hunting."

Feedback, goals, sensors and actuators appear only as a library entry ("Goal, sensor, comparator, actuator") and as Week 9 on the course map. The glossary says negative feedback "dampens toward a goal." Variety appears only as a library entry (Ashby, requisite variety). Cybernetics is not covered beyond these entries.

## Any other modules or weeks covered

Other weeks appear only as course-map entries: scale and pace (2), user conceptual models (3), information and stacks (4), variation and information structures (5), design systems with an Audubon guides poster (6), measuring and monitoring with a Figma component library (7), control and feedback (9), learning and conversation (10), feedforward and digital twins (11), and the final project (12 to 15). Library entries such as second-order ("a control loop inside a control loop") carry one-line notes only.

## Models a design-system builder can apply directly, each with one sentence on how

- Iceberg: trace each inconsistency down to the structure and belief that produce it, and act at the structure level.
- Propositions: write the system's vocabulary as labeled sentences and rewrite any that do not read aloud.
- Bridge: model the current system before proposing the future one, and treat each release as the new "what is."
- Layers and APIs: keep the contract between layers stable so a layer can change without disturbing those above it.
- Five attributes: check core services, rules, open access, discoverability and platform thinkers for the weakest dial.
- Platform loop: watch whether contributors and adopters feed each other or churn away.
- Stocks and flows: treat components as a stock and compare the rates at which they are added and retired.
- Lag: shorten the delay between drift and correction to avoid overshoot.
- Combinations: "Each row multiplies; it doesn't add," so each new option enlarges the space to support.

## What the notebook marks as its own additions or illustrative numbers

- The design-system drift example is the author's addition. The colds example is from the lecture slide.
- The platform simulation's "numbers are illustrative, not from the lecture."
- Week 08 was "built before the syllabus arrived," then aligned with the lecture.
- The Microsoft PC stack is from the lecture. The web-app stack is from the core-models deck.
- The "about 200 million" Starbucks drinks figure is attributed to the lecture. The per-row option counts are unsourced.
- The bench defaults are not labeled as either sourced or illustrative: a reservoir with inflow 6, outflow 4 and a starting stock of 50, and a loop that starts at 20 with a goal of 100.
