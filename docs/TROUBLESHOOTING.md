# Troubleshooting

Start with:

```sh
python3 scripts/doctor.py
python3 scripts/dashboardctl.py status
```

Review output before sharing it publicly. Do not upload `.runtime/`, your Codex database, or session journals.

## The compatibility checker fails

Open the Codex desktop app and make sure local conversations have been created. The reader expects the file layout described in [Monitoring](MONITORING.md#compatibility). A different Codex version may use another schema.

For a custom data folder:

```sh
python3 scripts/doctor.py --codex-home /path/to/codex-data
python3 server.py --codex-home /path/to/codex-data
```

Do not rename, migrate, or repair Codex files to satisfy this reader. You can still try the interface with `python3 server.py --demo --port 4318`.

## The page does not open

Check that Python 3.9+ is installed, then start the reader again. Open `http://127.0.0.1:4317` directly. If startup reports a port conflict, check what already owns that port; do not stop an unrelated process. A foreground instance can use another port with `python3 server.py --port 4319`.

If a prior process is still shutting down, wait briefly and check status. The launcher verifies process identity before stopping its own server. It will refuse to signal an unexpected process.

## An agent is stale

Stale means the reader cannot confidently confirm current activity. The desktop may be closed, the run may predate its current session, a read may have failed, or no relevant event may have appeared for three minutes. A long tool wait can also trigger the timeout.

Open Codex to inspect the actual run. Do not treat stale as completed or failed. The dashboard retries source reads automatically.

## Needs attention differs from Codex

Current coverage includes explicit async input questions and saved local unread-result flags. It excludes permission approval dialogs and other input mechanisms. Plain assistant text such as “May I proceed?” is not enough to infer a pending request.

The count follows your current filters. An input question disappears when answered, when its run ends, or when a new run begins. An unread result clears after Codex saves its read state. An unknown unread metadata version or ambiguous identities make that capability unavailable.

## Some agents are missing

Only up to 100 recently updated local, non-subagent index records are considered. Missing journal paths, archived threads, and remote/cloud conversations are not shown. The source note in Settings reports missing journal records.

## No sound

Click the speaker to enable audio for the current page. Check mute, volume, browser sound permissions, and your Mac output device. Use the completion/attention bell tests in Settings.

Old alerts intentionally do not replay when you open the page, unmute, or reload. Reading a previously completed result does not ring a new bell.

## Fullscreen or animations do not behave as expected

Browser fullscreen may require a direct click; on macOS, Control-Command-F also toggles window fullscreen. Check Animate agent thumbnails in Settings and your system reduced-motion preference. The latter takes precedence over the dashboard toggle.

## The thumbnail role looks wrong

Auto matching is a local heuristic based on the title, then the latest assistant update. Pick another role from the working card's dropdown. That choice stays in this browser and does not change the Codex agent or its instructions.

## The desktop shortcut stopped working

The shortcut points to the folder and Python executable used when it was created. Keep that folder in place. If you move the checkout or change Python installations, recreate the shortcut. The installer will leave an existing shortcut with different contents unchanged; remove or rename your old shortcut yourself first.

## Demo screenshots versus live data

Demo mode has a visible banner, fictional names, and no working Open in Codex links. It does not read your Codex files. Its separate `.runtime-demo/` directory lets it run beside the real reader when you choose another port.

## Reset preferences or uninstall

Browser settings live in local storage for the dashboard origin. You can clear that site's data using your browser controls to reset them. To uninstall, stop Agent Monitor, then remove its desktop shortcut and checkout. No login item or Codex hook needs removal.
