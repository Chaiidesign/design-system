# Retired instructions can still reach subagents

- **What happened:** Two survey files written by Sonnet subagents on 13 November referred to "our token files" and "the repo's 32px". Neither exists in this repository. The subagents had been handed the AGENTS.md of the archived 0.1.0 by the tooling, because it was loaded when the conversation began and the tooling passes the same instructions to subagents.
- **Cause:** The first brief template said "do not read the archive tag" but did not say that the repository is empty, so a subagent had no reason to distrust instructions that described a working system.
- **Change made:** The brief template now opens with a clean-slate paragraph: the repository has no tokens, components or build scripts, and any AGENTS.md text describing them is retired and must be ignored. The stray remarks were removed from the survey files.
- **Scope and reason:** Applies to every subagent brief written in a conversation that began before the repository was cleared. A subagent trusts what it is given; it cannot know an instruction is stale unless told.
- **Delete when:** The run continues in a conversation started after the clear, and a new AGENTS.md written for this system exists (item 4.2).
