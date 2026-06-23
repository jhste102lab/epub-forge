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

## Secrets and env
- Do not print, commit, or document the real value of tokens, API keys, passwords, cookies, or other secrets.
- If a user asks to input, replace, rotate, sync, or apply a token/API key/secret, perform the operation when the workflow is otherwise allowed; do not refuse merely because the task touches a secret.
- Keep the secret value itself out of responses, logs, commits, and docs. When confirmation is needed, report only the key name, destination, status, or a masked hint.
