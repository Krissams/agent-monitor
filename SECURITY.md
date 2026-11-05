# Security and privacy

Agent Monitor is a local, read-only monitor for Codex users. It reads files that can contain private work information, so changes to data handling deserve careful review.

## Current boundaries

- The HTTP server binds only to `127.0.0.1`.
- Host/Origin checks reject unexpected origins; API reads also reject cross-site requests.
- The server has an explicit static-file allowlist, security headers, and no application mutation endpoints.
- Codex SQLite connections use read-only mode. Monitoring does not install hooks or modify Codex configuration.
- Browser content is rendered as text. SVG artwork comes from project-controlled definitions.
- The application does not read `auth.json`, request an API key, or contact remote analytics/storage services.

This is not an authentication boundary against other software already running as your user. Anyone able to use your local browser or access your files may be able to view local monitoring information. Do not expose the server through a tunnel, proxy, public bind address, or shared host.

## What stays on disk

`.runtime/` contains process information, a minimized journal checkpoint, and rotating state-change audits. The checkpoint can contain short assistant progress snippets and pending question titles. It is created privately and excluded from Git. `.runtime-demo/` contains separate process/demo state. Browser local storage contains display preferences, per-agent role choices, outfit reservations, and consumed alert identities.

The project does not intentionally retain reasoning, user answers, command output, or tool arguments as monitoring content, apart from parsing explicit input-question fields. Internal source files can change; see the compatibility limits in `docs/MONITORING.md`.

Public screenshots and examples must use fictional data. Never include personal journals, database files, runtime directories, access tokens, or private chat screenshots in a public report.

## Secret scanning

The **Secret scan** GitHub Actions workflow scans all fetched Git history on
pushes and pull requests, using a pinned Gitleaks release and verified binary
checksum. Findings are redacted in logs. The workflow adds no project-specific
allowlist or baseline. CI runs after code is pushed, so it does not prevent a secret from
being uploaded in the first place.

For a local history scan, install [Gitleaks](https://github.com/gitleaks/gitleaks)
and run:

```sh
gitleaks git . --log-opts=--all --redact=100 --ignore-gitleaks-allow
```

To opt into the included local pre-commit guard on macOS:

```sh
brew install gitleaks
git config core.hooksPath .githooks
```

The hook scans staged changes before committing and fails closed when Gitleaks
is missing. It is not enabled automatically and does not alter Codex hooks.
Check whether you already use a different Git hook setup before changing
`core.hooksPath`. To remove this setting, use `git config --unset core.hooksPath`
and restore any previous configuration as appropriate.

Scanners cannot prove the absence of every possible secret, especially inside
images or unusual encodings. Review staged files and screenshots before
publishing. If a real credential is exposed, revoke or rotate it with its
provider promptly; deleting a file in a later commit does not erase earlier
Git history.

## Report a vulnerability

Please avoid public disclosure of sensitive details while a fix is being prepared. If this repository has GitHub private vulnerability reporting enabled, use its **Security → Report a vulnerability** flow. Otherwise, open a minimal issue asking the maintainer for a private reporting channel, without exploit details or private data.

No response-time or supported-version guarantee is currently offered. Prefer a recent version of the project and its documented, loopback-only setup.
