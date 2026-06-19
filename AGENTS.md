<!-- jhste-skills:start -->

## Agent skills

This repo uses jhste skills as shared guidance.
Repo-local instructions in this file remain authoritative.
See `.jhste/profile.yaml` for local skill preferences.
Before non-trivial code changes, use the `jhste-engineering-judgment` skill to check scope, seams, failure paths, and assumptions.
After code changes, run `jhste-skills guard --scope changed --format text --fail-on error` when available.
Report guard warnings/errors; do not treat guard runtime/config failures as validation success.
Before declaring non-trivial code work complete, use the `jhste-red-team-review` skill.
Skip red-team review for docs-only, comment-only, formatting-only, or trivial rename-only changes.
Do not enter an unbounded fix/review loop; stop after at most two fix + re-review cycles and report remaining risks.

<!-- jhste-skills:end -->
