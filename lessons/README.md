# Lessons

One lesson per file, named `YYYY-MM-DD-short-name.md`. Each lesson says:

- **What happened:** the failure or rework, with a pointer to the evidence.
- **Cause:** the thing that produced it (a skill, a brief template, a docs page, a lint rule, a missing check).
- **Change made:** what was changed, and where.
- **Scope and reason:** when this lesson applies, and why.
- **Delete when:** the condition under which the lesson no longer holds.

A lesson is kept only if the benchmark score held or improved after the change. Lessons whose reason no longer holds are deleted in the nightly routine.
