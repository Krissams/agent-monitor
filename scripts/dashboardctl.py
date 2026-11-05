#!/usr/bin/env python3
"""Start/stop only this dashboard's server, without touching Codex."""
import argparse
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / ".runtime" / "server.json"


def state():
    try:
        value = json.loads(STATE.read_text())
        with urllib.request.urlopen("http://127.0.0.1:%d/health" % value["port"], timeout=1) as response:
            health = json.load(response)
        if health.get("service") == "local-codex-activity" and health.get("instance") == value.get("instance") and health.get("pid") == value.get("pid"):
            return value
    except (OSError, ValueError, KeyError):
        pass
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop", "status", "open"])
    args = parser.parse_args()
    value = state()
    if args.action in {"start", "open"}:
        if not value:
            runtime = ROOT / ".runtime"
            runtime.mkdir(mode=0o700, exist_ok=True)
            os.chmod(runtime, 0o700)
            descriptor = os.open(str(runtime / "server.log"), os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(descriptor, "a") as log:
                child = subprocess.Popen([sys.executable, str(ROOT / "server.py")], cwd=str(ROOT),
                                         stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                         start_new_session=True, close_fds=True,
                                         env={key: val for key, val in os.environ.items()
                                              if key in {"HOME", "PATH", "LANG", "LC_ALL", "TMPDIR", "TZ"}})
            for _ in range(40):
                value = state()
                if value:
                    break
                if child.poll() is not None:
                    raise SystemExit("Could not start dashboard. See .runtime/server.log; port 4317 may be in use.")
                time.sleep(0.1)
            if not value:
                raise SystemExit("Dashboard did not become ready. See .runtime/server.log.")
        url = "http://127.0.0.1:%d" % value["port"]
        print(url)
        if args.action == "open":
            subprocess.run(["/usr/bin/open", url], check=True)
    elif args.action == "status":
        print("Running: http://127.0.0.1:%d (PID %d)" % (value["port"], value["pid"]) if value else "Stopped")
    elif args.action == "stop":
        if not value:
            print("Dashboard is stopped or its health check is unavailable.")
            return
        # Guard against PID reuse, even if a stale state file exists.
        result = subprocess.run(["/bin/ps", "-p", str(value["pid"]), "-o", "command="],
                                capture_output=True, text=True, check=True)
        if str(ROOT / "server.py") not in result.stdout:
            raise SystemExit("Process identity changed; refusing to signal it.")
        os.kill(value["pid"], signal.SIGTERM)
        for _ in range(30):
            if state() is None:
                print("Dashboard stopped. Codex is unaffected.")
                return
            time.sleep(0.1)
        print("Dashboard is still shutting down. Codex is unaffected.")


if __name__ == "__main__":
    main()
