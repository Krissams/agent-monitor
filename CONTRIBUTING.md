# Contributing to Agent Monitor

Thanks for helping make a useful little home for Codex agents. You do not need a large feature to contribute: a clearer error message, a keyboard fix, a new character accessory, or a reproducible compatibility report can make someone's day easier.

## Start here

1. Read the [README](README.md) and [monitoring limitations](docs/MONITORING.md).
2. Check existing issues. For a larger change, open an issue describing the problem and proposed behavior first.
3. Fork the repository and create a branch for one focused change.
4. Try the dashboard with fictional data: `python3 server.py --demo --port 4318`.
5. Run the checks below and open a pull request explaining the change and how you verified it.

Contributions use the project's MIT license. Add original or clearly licensed artwork, and document new asset provenance in [ASSETS.md](docs/ASSETS.md).

## Local development

The runtime needs Python 3.9+ and a browser. JavaScript checks need Node.js 20+. There are no runtime dependencies to install or frontend build steps.

```sh
python3 server.py --demo --port 4318
python3 -m unittest discover -s tests -v
node --test tests/*.test.mjs
```

Static files are served directly. Reload the browser after changes; restart the Python process for backend changes. Use demo data for screenshots and layout work. Real monitoring is currently tested on macOS with a specific Codex journal format.

## Project map

| Path | Responsibility |
| --- | --- |
| `dashboard/journal.py` | Run state, minimized progress, question/reply matching, unread flags, and checkpointed journal reads. |
| `dashboard/demo.py` | Fictional sample agents, with no Codex data access. |
| `server.py` | Loopback-only server, route allowlist, reader lifecycle, and security headers. |
| `public/app.js` | Cards, filters, appearance, preferences, sound, and role selection. |
| `public/mascot.js`, `public/roles.js` | Character geometry, role artwork, and local matching rules. |
| `public/outfits.js` | Garment shapes, colorways, and stable per-agent outfit allocation. |
| `public/sequence.js` | Card reorder transitions and character preservation across refreshes. |
| `public/alerts.js` | Pure transition detection and alert identities. |
| `public/variants.*` | Twenty-style preview gallery. |
| `scripts/` | Start/stop, compatibility checks, desktop launcher, and an optional connection diagnostic. |
| `tests/` | Sanitized synthetic parser and transition fixtures. |

## Add or improve a character

Role definitions, matching rules, workspace tools, and accessories live in `public/roles.js`. Shared body geometry and poses live in `public/mascot.js`; CSS controls motion.

- Keep the character recognizable at thumbnail size and in both themes.
- Give it a meaningful visual difference beyond a color change.
- Keep SVG IDs unique across every card.
- Animate transforms/opacity gently; respect reduced motion and the animation toggle.
- Preserve animation continuity through refreshes and sorting.
- Check auto matching, manual selection, saved preferences, and the `/variants` gallery.
- Add matching tests when changing classification rules. A style is a visual hint, not a runtime claim.

## Reader changes need evidence

Status accuracy matters more than making every row look active. Use explicit lifecycle or request signals. Do not infer working, failure, or approval from file modification times, command errors, or question-like assistant text.

For a new format or source adapter, include sanitized fixtures and explain what each signal does and does not prove. Cover new runs, partial writes, terminal outcomes, unanswered/resolved questions, disconnects, stale data, and restart/checkpoint behavior as applicable. Never change Codex data or resume an agent to manufacture a read-only observer connection.

## What to put in a pull request

- The problem and resulting behavior.
- Relevant validation, including any limits of that validation.
- Demo screenshots for visual changes, in light/dark mode where appropriate.
- A note about compatibility or privacy implications if they change.

Keep unrelated refactors separate. Prefer the existing standard-library/plain-JavaScript approach; discuss new dependencies before introducing them.

## Reporting bugs

Use the bug-report issue template. Include macOS, Python, Node if relevant, Codex version if available, and steps to reproduce. `scripts/doctor.py` is designed to avoid printing transcript content, but review its output before posting.

Do not attach real session JSONL files, SQLite databases, `.runtime/`, credentials, or screenshots of private work. A small synthetic fixture is much easier to review safely. Describe which states you expected and observed; a failed tool command does not necessarily mean the agent run failed.

For security issues, follow [SECURITY.md](SECURITY.md). Be kind, specific, and respectful when giving feedback.
