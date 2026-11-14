# A pass criterion that says "every" cannot be passed with certainty

- **What happened:** Gate 1 failed three times on criteria 5, 8 and 10. Each run the list of faults was shorter and different: by the third, two sentences, one table row and a dozen terms. Evidence: `gates/gate-1.md`.
- **Cause:** The lead wrote those criteria as "every claim points to a reviewed file", "every claim about people is labelled" and "every special term is defined", with no limit on what counts as a claim or a special term and no rule for how much a reviewer checks. A careful fresh reviewer will always find one more. The criteria described a wish, not a test.
- **Change made:** From phase 2 on, each pass criterion names what decides it: a script's exit status, a count, or a stated sample (for example "a reviewer checks fifteen claims chosen across all sections; none may be unsupported"). Criteria for work that only a person can judge say so and name the person. The three Gate 1 criteria are left as written, because the lead may not loosen a test to pass it; the gate is recorded as blocked.
- **Scope and reason:** Applies to every gate and every component "definition of done". A gate that cannot be passed stops being a gate and becomes a negotiation.
- **Delete when:** Gates 2 to 4 have each been decided in at most two runs.
