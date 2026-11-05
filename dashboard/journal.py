"""Experimental adapter. Read actual journal events, never derive activity from mtime."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import time

TERMINAL = {"completed", "failed", "interrupted"}
MAX_INCREMENT = 8 * 1024 * 1024
MAX_RECORD = 1024 * 1024


def epoch(value):
    if isinstance(value, (int, float)):
        return value / 1000 if value > 1e12 else value
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError, AttributeError):
        return None


def clean_text(value):
    # Treat all source content as data; the browser renders this with textContent.
    value = re.sub(r"<oai-mem-citation>.*?</oai-mem-citation>", "", str(value or ""), flags=re.S)
    value = re.sub(r"</?proposed_plan>", "", value)
    value = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", value)
    value = value.replace("**", "").replace("`", "")
    return " ".join(value.replace("\x00", "").split())[:600]


def local_unread_threads(global_state):
    """Read the desktop's blue-dot state; never merge different users or hosts."""
    state = global_state.get("electron-thread-read-state-v1", {})
    if not isinstance(state, dict):
        return None
    identities = state.get("unreadByIdentity", {})
    if state.get("version") != 1 or not isinstance(identities, dict) or len(identities) != 1:
        return None
    hosts = next(iter(identities.values()))
    if not isinstance(hosts, dict):
        return None
    local = [ids for host, ids in hosts.items() if host.startswith("local:")]
    if len(local) != 1 or not isinstance(local[0], list) or not all(isinstance(id, str) for id in local[0]):
        return None
    return set(local[0])


class RunState:
    def __init__(self):
        self.run_id = None
        self.status = "idle"
        self.started_at = None
        self.finished_at = None
        self.last_event_at = None
        self.update = ""
        self.update_at = None
        self.issue = None
        self.request_id = None
        self.pending_input = {}

    def input_request(self, payload, stamp):
        if payload.get("name") != "request_user_input_async" or not payload.get("call_id"):
            return
        try:
            questions = json.loads(payload.get("arguments", "{}")).get("questions", [])
        except (ValueError, AttributeError, TypeError):
            return
        for index, question in enumerate(questions):
            title = clean_text(question.get("title")) if isinstance(question, dict) else ""
            if title:
                key = json.dumps(["request_user_input_async", payload["call_id"], index], separators=(",", ":"))
                self.pending_input[key] = {"text": title, "at": stamp}

    def input_reply(self, content):
        for part in content:
            if not isinstance(part, dict):
                continue
            value = part.get("text", "")
            match = re.fullmatch(r"\s*<send_user_message_question_reply>\s*(.*?)\s*</send_user_message_question_reply>\s*", value, re.S)
            if not match:
                continue
            try:
                replies = json.loads(match[1])
                for reply in replies if isinstance(replies, list) else [replies]:
                    key = json.dumps(json.loads(reply["questionItemId"]), separators=(",", ":"))
                    self.pending_input.pop(key, None)
            except (ValueError, TypeError, KeyError):
                continue

    def apply(self, record):
        stamp = epoch(record.get("timestamp"))
        payload = record.get("payload")
        if not isinstance(payload, dict):
            return
        kind = record.get("type")
        event = payload.get("type")
        if kind == "event_msg":
            if event == "task_started":
                run_id = payload.get("turn_id")
                if not run_id:
                    return
                if run_id != self.run_id:
                    self.update = ""
                    self.update_at = None
                    self.issue = None
                    self.finished_at = None
                    self.pending_input = {}
                self.run_id = run_id
                self.started_at = epoch(payload.get("started_at")) or stamp
                self.status = "working"
                self.request_id = None
            elif event in ("task_complete", "turn_aborted"):
                run_id = payload.get("turn_id")
                if not run_id or (self.run_id and run_id != self.run_id):
                    return  # Late terminal event from an older run.
                self.run_id = run_id
                self.started_at = self.started_at or epoch(payload.get("started_at"))
                self.finished_at = epoch(payload.get("completed_at")) or stamp
                if event == "turn_aborted":
                    reason = payload.get("reason")
                    if reason == "interrupted":
                        self.status = "interrupted"
                    elif reason == "failed":
                        self.status = "failed"
                    else:
                        self.status = "unknown"
                        self.issue = "Run aborted; outcome is not recognized."
                elif payload.get("status") == "failed":
                    self.status = "failed"
                elif self.status == "error":
                    self.status = "unknown"
                    self.issue = "An error preceded the stop; terminal outcome is unconfirmed."
                else:
                    self.status = "completed"
                self.request_id = None
                self.pending_input = {}
            elif event == "error":
                # A tool failure or transient stream error must never become a failed RUN.
                # Even ErrorEvent terminal semantics are unverified for this adapter.
                if self.status not in TERMINAL:
                    self.status = "error"
                    self.issue = "Runtime error observed; terminal outcome is unconfirmed."
            elif event == "item_completed":
                # Commands, tool arguments, outputs and reasoning are intentionally ignored.
                item = payload.get("item", {})
                if item.get("type") == "AgentMessage":
                    texts = [part.get("text", "") for part in item.get("content", [])
                             if isinstance(part, dict) and part.get("type") == "Text"]
                    self.set_update(" ".join(texts), stamp)
                elif item.get("type") == "UserMessage":
                    self.input_reply(item.get("content", []))
            else:
                return
            self.last_event_at = stamp or self.last_event_at
        elif kind == "response_item":
            if event == "function_call":
                self.input_request(payload, stamp)
            elif event == "message" and payload.get("role") == "user":
                self.input_reply(payload.get("content", []))
            elif event == "message" and payload.get("role") == "assistant":
                texts = [part.get("text", "") for part in payload.get("content", [])
                         if isinstance(part, dict) and part.get("type") == "output_text"]
                self.set_update(" ".join(texts), stamp)
                self.last_event_at = stamp or self.last_event_at

    def set_update(self, text, stamp):
        text = clean_text(text)
        if text:
            self.update, self.update_at = text, stamp

    def public(self, now, desktop):
        status = self.status
        issue = self.issue
        stale = False
        request_id = next(reversed(self.pending_input), None)
        request = self.pending_input.get(request_id)
        if request and self.status == "working":
            status = "waitingInput"
        if status in {"working", "error", "unknown", "waitingInput"}:
            if not desktop["running"]:
                stale, issue = True, "Codex desktop is not running; current run state is unknown."
            elif self.started_at and self.started_at < desktop["startedAt"]:
                stale, issue = True, "This unfinished run predates the current Codex desktop session."
            elif status != "waitingInput" and (not self.last_event_at or now - self.last_event_at > 180):
                stale, issue = True, "No relevant journal event for 3 minutes. Run state may be stale."
        return {
            "runId": self.run_id, "status": status, "stale": stale,
            "startedAt": self.started_at, "finishedAt": self.finished_at,
            "lastEventAt": self.last_event_at, "update": self.update,
            "updateAt": self.update_at, "issue": issue,
            "runStatus": self.status,
            "requestId": request_id,
            "requestIds": list(self.pending_input),
            "requestText": request["text"] if request else None,
            "requestAt": request["at"] if request else None,
        }


class Tail:
    def __init__(self, path, checkpoint=None):
        self.path = Path(path)
        self.identity = None
        self.offset = 0
        self.state = RunState()
        self.truncated = False
        self.error = None
        if checkpoint:
            try:
                stat = self.path.stat()
                offset = checkpoint["offset"]
                if (checkpoint["path"] == str(self.path) and
                        checkpoint["identity"] == [stat.st_dev, stat.st_ino] and
                        0 <= offset <= stat.st_size and self.fingerprint(offset) == checkpoint["fingerprint"]):
                    self.identity = (stat.st_dev, stat.st_ino)
                    self.offset = offset
                    for key in vars(self.state):
                        if key in checkpoint["state"]:
                            setattr(self.state, key, checkpoint["state"][key])
            except (OSError, KeyError, TypeError, ValueError):
                pass

    def fingerprint(self, offset):
        with self.path.open("rb") as stream:
            stream.seek(max(0, offset - 256))
            return hashlib.sha256(stream.read(min(256, offset))).hexdigest()

    def checkpoint(self):
        return {"path": str(self.path), "identity": list(self.identity), "offset": self.offset,
                "fingerprint": self.fingerprint(self.offset), "state": vars(self.state)}

    def poll(self):
        stat = self.path.stat()
        identity = (stat.st_dev, stat.st_ino)
        reset = identity != self.identity or stat.st_size < self.offset
        with self.path.open("rb") as stream:
            if reset:
                self.state = RunState()
                self.identity = identity
                self.offset = 0
            stream.seek(self.offset)
            # One streaming bootstrap, then checkpointed incremental reads. Memory stays
            # bounded even when a run-start or unanswered question is far back in a file.
            limit = stat.st_size if reset else min(stat.st_size, self.offset + MAX_INCREMENT)
            while stream.tell() < limit:
                line = stream.readline(MAX_RECORD)
                oversized = len(line) == MAX_RECORD and not line.endswith(b"\n")
                if oversized:
                    monitoring_record = any(token in line[:600] for token in
                                            (b'"AgentMessage"', b'"UserMessage"', b'"request_user_input_async"',
                                             b'"role": "assistant"', b'"role": "user"', b'"task_started"',
                                             b'"task_complete"', b'"turn_aborted"'))
                    while line and not line.endswith(b"\n"):
                        line = stream.readline(MAX_RECORD)
                    if not line.endswith(b"\n"):
                        break
                    if monitoring_record:
                        self.error = "Skipped an oversized monitoring record; information may be incomplete."
                elif not line.endswith(b"\n"):
                    break  # Retry a partial write from its starting offset next poll.
                else:
                    for record in self.records(line):
                        self.state.apply(record)
                self.offset = stream.tell()

    @staticmethod
    def records(data):
        result = []
        for line in data.splitlines(keepends=True):
            if not line.endswith(b"\n"):
                continue
            # Avoid parsing giant tool results and reasoning that cannot affect state.
            if not (b'"event_msg"' in line[:150] or b'"response_item"' in line[:150]):
                continue
            prefix = line[:600]
            if b'"event_msg"' in prefix and not any(token in prefix for token in
                    (b'"task_started"', b'"task_complete"', b'"turn_aborted"', b'"error"',
                     b'"AgentMessage"', b'"UserMessage"', b'"item_completed"')):
                continue
            if b'"response_item"' in prefix and not (b'"message"' in prefix or
                    (b'"function_call"' in prefix and b'"request_user_input_async"' in prefix)):
                continue
            try:
                record = json.loads(line)
                if isinstance(record, dict):
                    result.append(record)
            except (ValueError, UnicodeDecodeError):
                continue
        return result


def desktop_process():
    result = subprocess.run(["/bin/ps", "-axo", "pid,lstart,comm"], capture_output=True,
                            text=True, timeout=3, check=True)
    for line in result.stdout.splitlines()[1:]:
        parts = line.strip().split(None, 6)
        if len(parts) == 7 and parts[6].endswith(("/ChatGPT.app/Contents/MacOS/ChatGPT", "/Codex.app/Contents/MacOS/Codex")):
            started = time.mktime(time.strptime(" ".join(parts[1:6]), "%a %b %d %H:%M:%S %Y"))
            return {"running": True, "pid": int(parts[0]), "startedAt": started}
    return {"running": False, "pid": None, "startedAt": 0}


class JournalSource:
    def __init__(self, codex_home=None, cache_path=None):
        self.home = Path(codex_home or Path.home() / ".codex")
        self.tails = {}
        self.polls = 0
        self.started = time.monotonic()
        self.previous = None
        self.cache_path = Path(cache_path) if cache_path else None
        self.cache = {}
        if self.cache_path:
            try:
                saved = json.loads(self.cache_path.read_text())
                if saved.get("version") == 2:
                    self.cache = saved["tails"]
            except (OSError, ValueError, KeyError):
                pass

    def poll(self):
        started = time.monotonic()
        now = time.time()
        # Explicit read-only connection: do not repair, migrate or checkpoint Codex's DB.
        database = self.home / "state_5.sqlite"
        connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True, timeout=1)
        connection.row_factory = sqlite3.Row
        try:
            rows = connection.execute("""
                SELECT id, rollout_path, name, title, cwd, updated_at, project_id, source
                FROM threads WHERE archived=0 AND agent_path IS NULL
                AND source NOT LIKE '%subagent%'
                ORDER BY updated_at DESC LIMIT 100
            """).fetchall()
        finally:
            connection.close()
        # Use only project metadata and saved unread flags; never expose other global-state keys.
        with (self.home / ".codex-global-state.json").open() as stream:
            global_state = json.load(stream)
        projects = global_state.get("local-projects", {})
        assignments = global_state.get("thread-project-assignments", {})
        projectless = set(global_state.get("projectless-thread-ids", []))
        membership_hosts = global_state.get("thread-project-membership-host-ids", {})
        unread_threads = local_unread_threads(global_state)
        desktop = desktop_process()
        chats, errors, unavailable = [], 0, 0
        for row in rows:
            if membership_hosts.get(row["id"], "local") != "local":
                continue
            assignment = assignments.get(row["id"], {})
            project_id = None if row["id"] in projectless else assignment.get("projectId", row["project_id"])
            project_name = projects.get(project_id, {}).get("name") if project_id else None
            path = Path(row["rollout_path"])
            # Trust only Codex's local session roots, including rollover after archive moves.
            resolved = path.resolve()
            if not any(root in resolved.parents for root in
                       ((self.home / "sessions").resolve(), (self.home / "archived_sessions").resolve())):
                continue
            tail = self.tails.get(row["id"])
            if tail is None and not path.exists():
                unavailable += 1
                continue
            if not tail or tail.path != path:
                tail = self.tails[row["id"]] = Tail(path, self.cache.get(row["id"]))
            try:
                tail.poll()
                chat = tail.state.public(now, desktop)
                if tail.error:
                    chat.update(stale=True, issue=tail.error)
            except (OSError, ValueError):
                errors += 1
                chat = tail.state.public(now, desktop)
                chat.update(stale=True, issue="Journal could not be read. Retrying automatically.")
            if not chat["runId"] and tail.truncated:
                chat.update(status="unknown", stale=True, issue="No lifecycle record in the bounded journal window.")
            chat.update(id=row["id"], title=clean_text(row["name"] or "Untitled chat"),
                        project=clean_text(project_name or "No project"),
                        projectId=project_id, location=Path(row["cwd"]).name,
                        openUrl="codex://threads/" + row["id"],
                        unread=(row["id"] in unread_threads) if unread_threads is not None else None)
            chats.append(chat)
        ids = {chat["id"] for chat in chats}
        self.tails = {key: value for key, value in self.tails.items() if key in ids}
        if self.cache_path:
            cache = {}
            for key, tail in self.tails.items():
                try:
                    if tail.identity and not tail.error:
                        cache[key] = tail.checkpoint()
                except OSError:
                    pass  # A missing journal must not take healthy cards offline.
            if cache != self.cache:
                temporary = self.cache_path.with_suffix(".tmp")
                descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(descriptor, "w") as stream:
                    json.dump({"version": 2, "tails": cache}, stream)
                temporary.replace(self.cache_path)
                self.cache = json.loads(json.dumps(cache))
        self.polls += 1
        snapshot = {
            "schemaVersion": 1, "adapter": "experimental-local-journals",
            "refreshedAt": now, "pollCount": self.polls,
            "uptimeSeconds": round(time.monotonic() - self.started),
            "pollMilliseconds": round((time.monotonic() - started) * 1000),
            "connection": {
                "ok": desktop["running"],
                "desktopRunning": desktop["running"], "readErrors": errors,
                "unavailableJournals": unavailable,
                "problem": ("Codex desktop is closed. Historical results remain visible."
                            if not desktop["running"] else
                            "Some journals could not be read; affected cards are stale." if errors else None),
            },
            "capabilities": {
                "pendingApprovals": False, "pendingInput": True,
                "inputCoverage": "explicit-async-questions-only",
                "completedUnread": unread_threads is not None,
                "failureCoverage": "partial-unverified", "allChats": False,
                "scope": "100 most recently updated local chats; journal events and explicit async questions only",
            },
            "chats": chats,
        }
        self.previous = snapshot
        return snapshot
