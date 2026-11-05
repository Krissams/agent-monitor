# Monitoring: what the dashboard knows

Agent Monitor observes existing local Codex desktop conversations through an experimental journal adapter. It is a separate process from the assistant conversation that helped launch it. It polls every five seconds and does not need a continuing Codex tool call to refresh.

## Signal coverage

| Signal | Current behavior | Important boundary |
| --- | --- | --- |
| Title and project | Read from the local thread index and desktop project metadata. | Local indexed conversations only; some journal paths may be missing. |
| Working | Explicit `task_started` event with a turn/run ID. | A last-observed state can become stale. File activity alone never implies working. |
| Completed | A recognized normal `task_complete` lifecycle event. | A run ended normally; this does not prove the whole project or every requested acceptance test is complete. |
| Interrupted | An explicit interruption reason in `turn_aborted`. | Unknown abort reasons remain uncertain. |
| Failed | Explicit failed terminal fields can be represented. | Complete real-world failure/crash coverage is unverified. A failed tool command does not fail a run. |
| Needs input | An explicit `request_user_input_async` question in the current run. | Other input mechanisms and plain-text questions are not covered. |
| Input resolved | A structured reply referencing the exact question ID. | Completion, interruption, and a new run also clear that run's pending questions. |
| Unread result | Codex's saved local unread/blue-dot metadata. | Multiple ambiguous account/host identities or an unknown metadata version make coverage unavailable. |
| Permission approvals | Not detected. | Check Codex itself for permission/approval dialogs. |
| Latest progress | Completed assistant message snippets, minimized to 600 characters. | A streaming partial message may not be available yet. Tool output and reasoning are excluded. |
| Open in Codex | Local `codex://threads/<id>` link. | Requires the installed desktop app to handle that link. |

Waiting-input cards take priority over ordinary working cards. Finished unread results also enter Needs attention and keep their completed/failed/interrupted outcome. Reading an agent in Codex clears its unread result when the saved metadata is updated. The dashboard does not mark it read.

## Stale and disconnected information

An unfinished run becomes stale when the desktop closes, when it predates the current desktop process, or after three minutes without a relevant journal event. An explicit input wait is exempt from the inactivity timeout while the current desktop session remains available.

A long-running tool can therefore make a genuinely active run look stale. A crash can remain undetected until the timeout. The dashboard shows uncertainty rather than inventing a failure, success, or new activity.

A source read failure keeps the last snapshot, marks it stale, and retries every five seconds. Short-lived intermediate states can be missed between polls. Cached state is not a live connection.

## Compatibility

The initial macOS verification used Codex journal/index files associated with CLI version `0.166.0-alpha.5.1`. This is a tested observation, not a universal minimum or maximum version.

The adapter currently expects:

- `~/.codex/state_5.sqlite`, including the required `threads` columns checked by `scripts/doctor.py`.
- Local rollout JSONL files indexed inside `sessions/` or `archived_sessions/`.
- `~/.codex/.codex-global-state.json` for project and unread metadata.
- Recognized macOS Codex/ChatGPT desktop process names for session-liveness checks.

Up to 100 recent local, non-subagent records are considered. Missing paths are excluded and counted in the interface. Remote/cloud agents and exhaustive history are outside the current scope. A different data directory can be supplied through `server.py --codex-home PATH`.

These are internal files, not a supported public status contract. A Codex update may change schemas, event names, metadata, or persistence timing. Run the compatibility checker and report a sanitized reproduction instead of modifying Codex's database.

## Why journals?

An independently started app-server process did not observe the desktop runtime that owned already-running conversations in the original investigation. Conversation-scoped tools could see live state, but did not provide an external persistent endpoint. A supported persistent observer connection to that existing runtime was not established.

The journal reader was chosen as a limited local prototype. It does not bypass desktop IPC authentication or code-signing protections. No hooks are installed. A supported observer/event adapter with stronger coverage would be a valuable contribution.

The original installation recorded successful reader polls after the initiating run had ended, validating independence from that run. Parser tests, real local lifecycle comparisons, and question/unread observations informed the adapter. Private transcript evidence and identifying thread IDs are intentionally absent from this public repository.

## Checkpoints and bounded memory

Initial history is streamed with a per-record memory limit rather than loaded as one large document. Oversized unrelated tool records are skipped. If an oversized monitoring record prevents reliable reconstruction, the affected card is marked uncertain/stale.

The private checkpoint stores only monitoring state and offsets. On restart, file identity, size, and boundary bytes are checked before reusing an offset. Rotation and truncation trigger a rebuild. Later polls read bounded increments and use explicit events to detect new runs.

## Alerts

Opening the page establishes a baseline and does not replay historical results. Completion and confirmed input transitions have stable identities; repeated polls do not generate a new transition. A local alert ledger and browser locks coordinate audible alerts across tabs when supported.

An unread completion uses the existing completion bell, without an extra attention bell. Reading it does not create a new alert. Muting consumes observed transitions. Browser audio needs an initial user click after each page load.

Logic tests establish transition handling. Physical speaker audibility and every timing combination across browsers are not guaranteed by those tests.

## Still useful to test

Contributions are especially helpful for real permission/input lifecycle adapters, failed model runs, restart/close cycles across Codex versions, multiple account identities, large journals, physical audio behavior, and longer resource-use measurements. Keep unknowns explicit in reports and pull requests.
