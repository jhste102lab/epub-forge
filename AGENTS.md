## Secrets and env

- Do not print, commit, or document the real value of tokens, API keys, passwords, cookies, or other secrets.
- If a user asks to input, replace, rotate, sync, or apply a token/API key/secret, perform the operation when the workflow is otherwise allowed; do not refuse merely because the task touches a secret.
- Keep the secret value itself out of responses, logs, commits, and docs. When confirmation is needed, report only the key name, destination, status, or a masked hint.
