#!/usr/bin/env python3
"""A loopback-only, GET-only dashboard. No Codex control or inference endpoints."""
import argparse
import fcntl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import signal
import threading
import time
import uuid

from dashboard.journal import JournalSource

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / ".runtime"
PUBLIC = ROOT / "public"
FILES = {"/": ("index.html", "text/html"), "/app.js": ("app.js", "text/javascript"),
         "/alerts.js": ("alerts.js", "text/javascript"), "/style.css": ("style.css", "text/css"),
         "/sequence.js": ("sequence.js", "text/javascript"),
         "/mascot.js": ("mascot.js", "text/javascript"),
         "/roles.js": ("roles.js", "text/javascript"),
         "/outfits.js": ("outfits.js", "text/javascript"),
         "/variants": ("variants.html", "text/html"),
         "/variants.js": ("variants.js", "text/javascript"),
         "/assets/sleeping-agent.png": ("assets/sleeping-agent.png", "image/png")}


class Monitor:
    def __init__(self, source=None):
        self.source = source if source is not None else JournalSource(cache_path=RUNTIME / "journal-state.json")
        self.snapshot = {"chats": [], "refreshedAt": None, "connection": {"ok": False, "problem": "Reading local journals…"}}
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.last_states = {}
        self.post_run_since = None
        self.post_run_polls = 0

    def persistence_check(self, snapshot):
        target_path = RUNTIME / "persistence-target.json"
        proof_path = RUNTIME / "persistence-proof.json"
        if proof_path.exists():
            return json.loads(proof_path.read_text())
        if not target_path.exists():
            return None
        target = json.loads(target_path.read_text())
        chat = next((c for c in snapshot.get("chats", []) if c["id"] == target["threadId"]), None)
        if (snapshot.get("connection", {}).get("ok") and chat and
                chat.get("runId") == target["runId"] and
                chat.get("status") in {"completed", "interrupted", "failed"} and not chat.get("stale")):
            self.post_run_since = self.post_run_since or time.monotonic()
            self.post_run_polls += 1
            if self.post_run_polls >= 4 and time.monotonic() - self.post_run_since >= 15:
                proof = {"verified": True, "verifiedAt": time.time(), "threadId": target["threadId"],
                         "runId": target["runId"], "terminalStatus": chat["status"],
                         "completedAt": chat.get("finishedAt"), "postRunPolls": self.post_run_polls,
                         "meaning": "Independent reader continued polling after the initiating run stopped. This does not validate missing source capabilities."}
                proof_path.write_text(json.dumps(proof, indent=2))
                os.chmod(proof_path, 0o600)
                return proof
        else:
            self.post_run_since = None
            self.post_run_polls = 0
        return {"verified": False, "postRunPolls": self.post_run_polls}

    def run(self):
        while not self.stop.is_set():
            try:
                snapshot = self.source.poll()
                snapshot["persistenceCheck"] = self.persistence_check(snapshot)
            except Exception as error:
                # Preserve the last good data and mark ALL of it stale on source failure.
                with self.lock:
                    snapshot = dict(self.snapshot)
                snapshot["connection"] = {"ok": False, "problem": "Source read failed (%s). Retrying every 5 seconds." % type(error).__name__}
                snapshot["chats"] = [dict(chat, stale=True) for chat in snapshot.get("chats", [])]
            with self.lock:
                self.snapshot = snapshot
            states = {c["id"]: (c.get("runId"), c["status"], c.get("updateAt"), c.get("stale"))
                      for c in snapshot.get("chats", [])}
            changes = [{"id": key, "runId": value[0], "status": value[1], "updateAt": value[2], "stale": value[3]}
                       for key, value in states.items() if self.last_states.get(key) != value]
            # Small local audit for the after-idle persistence check. Never save message text.
            if changes or self.source.polls % 12 == 0:
                self.audit({"at": time.time(), "poll": self.source.polls,
                            "sourceOk": snapshot.get("connection", {}).get("ok"), "changes": changes})
            self.last_states = states
            self.stop.wait(5)

    @staticmethod
    def audit(record):
        try:
            path = RUNTIME / "observations.jsonl"
            if path.exists() and path.stat().st_size > 1024 * 1024:
                os.replace(path, RUNTIME / "observations.previous.jsonl")
            descriptor = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(descriptor, "a") as stream:
                stream.write(json.dumps(record) + "\n")
        except OSError:
            pass


def main():
    global RUNTIME
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4317)
    parser.add_argument("--demo", action="store_true", help="Show fictional agents without reading Codex data")
    parser.add_argument("--codex-home", type=Path, help="Read a different Codex data directory (default: ~/.codex)")
    args = parser.parse_args()
    if args.demo:
        RUNTIME = ROOT / ".runtime-demo"
    RUNTIME.mkdir(mode=0o700, exist_ok=True)
    os.chmod(RUNTIME, 0o700)
    lock = (RUNTIME / "dashboard.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit("Dashboard is already running.")
    if args.demo:
        from dashboard.demo import DemoSource
        monitor = Monitor(source=DemoSource())
    else:
        monitor = Monitor(source=JournalSource(codex_home=args.codex_home, cache_path=RUNTIME / "journal-state.json"))
    instance = str(uuid.uuid4())
    hosts = {"127.0.0.1:%d" % args.port, "localhost:%d" % args.port}
    origins = {"http://" + host for host in hosts}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            if self.headers.get("Host") not in hosts:
                self.send_error(403)
                return
            path = self.path.split("?", 1)[0]
            origin = self.headers.get("Origin")
            if (origin and origin not in origins) or (path in {"/api/status", "/health"} and self.headers.get("Sec-Fetch-Site") == "cross-site"):
                self.send_error(403)
                return
            if path == "/api/status":
                with monitor.lock:
                    payload = json.dumps(monitor.snapshot).encode()
                mime = "application/json"
            elif path == "/health":
                payload = json.dumps({"service": "local-codex-activity", "instance": instance,
                                      "pid": os.getpid()}).encode()
                mime = "application/json"
            elif path in FILES:
                filename, mime = FILES[path]
                payload = (PUBLIC / filename).read_bytes()
            elif path == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
                return
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", mime + ("; charset=utf-8" if not mime.startswith("image/") else ""))
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_POST(self):
            self.send_error(405, "Read-only dashboard")

        do_PUT = do_DELETE = do_PATCH = do_POST

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.daemon_threads = True
    state_path = RUNTIME / "server.json"
    state_path.write_text(json.dumps({"pid": os.getpid(), "port": args.port, "instance": instance}))
    os.chmod(state_path, 0o600)
    thread = threading.Thread(target=monitor.run, name="journal-monitor", daemon=True)
    thread.start()

    def stop(_signal, _frame):
        monitor.stop.set()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        monitor.stop.set()
        thread.join(timeout=5)
        server.server_close()
        if state_path.exists():
            state_path.unlink()
        lock.close()


if __name__ == "__main__":
    main()
