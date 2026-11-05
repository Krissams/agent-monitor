#!/usr/bin/env python3
"""Read-only compatibility checks. Never print chat content or credentials."""
import argparse
import json
from pathlib import Path
import platform
import sqlite3
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from dashboard.journal import desktop_process


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-home", type=Path, default=Path.home() / ".codex")
    args = parser.parse_args()
    ok = True

    def check(label, passed):
        nonlocal ok
        print(("OK   " if passed else "FAIL ") + label)
        ok = ok and passed

    check("macOS host", platform.system() == "Darwin")
    check("Python 3.9 or newer", sys.version_info >= (3, 9))
    home = args.codex_home.expanduser().resolve()
    database = home / "state_5.sqlite"
    columns = set()
    try:
        connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True, timeout=1)
        try:
            columns = {row[1] for row in connection.execute("PRAGMA table_info(threads)")}
        finally:
            connection.close()
    except sqlite3.Error:
        pass
    required = {"id", "rollout_path", "name", "title", "cwd", "updated_at", "project_id", "source", "archived", "agent_path"}
    check("Expected thread-index schema is readable", required <= columns)
    metadata_ok = False
    try:
        metadata_ok = isinstance(json.loads((home / ".codex-global-state.json").read_text()), dict)
    except (OSError, ValueError):
        pass
    check("Desktop project metadata is readable", metadata_ok)
    check("Local session directory exists", (home / "sessions").is_dir())
    running = False
    try:
        running = desktop_process()["running"]
    except (OSError, ValueError):
        pass
    check("Codex desktop is running", running)
    print("Experimental adapter: a passing check does not guarantee every status is available.")
    print("No chats, configuration, hooks, or credentials were changed.")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
