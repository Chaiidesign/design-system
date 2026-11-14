# Gathering facts from the web is not checklist work

- **What happened:** Twelve survey files were gathered by Sonnet subagents. An Opus reviewer checked about six claims in each against the cited pages. Eleven of the twelve needed corrections: overstated claims, wrong attributions, and missing caveats. Evidence: the "Review 2026-11-13" section at the end of each file in `notes/survey/`.
- **Cause:** The routing rule sends work to Sonnet when "a test or checklist fully verifies it". Fact gathering looked like that kind of work, but nothing verifies a claim except reading the source again. The fetch tool also summarises pages, so the gatherer was paraphrasing a paraphrase. And each brief asked for about ten topics in 1,000 words, which pushes towards compression.
- **Change made:** In the brief template for gathering: every claim that a later decision could rest on must carry a short direct quote from the page as well as the URL; a claim with no quote is marked "(not verified)". A tier-up check of every gathered file stays mandatory. Briefs ask for fewer topics each.
- **Scope and reason:** Applies to any task whose output is facts about the outside world. Does not apply to work with a real test, such as token files checked by a validator.
- **Delete when:** Three gathering runs in a row pass review first time at a rate above one half.
