import json
from pathlib import Path
import tempfile
import time
import unittest
from dashboard.journal import RunState, Tail, local_unread_threads


def event(kind, run="a", stamp="2026-11-05T08:00:00Z", **fields):
    return {"timestamp": stamp, "type": "event_msg", "payload": {"type": kind, "turn_id": run, **fields}}


class JournalTests(unittest.TestCase):
    def test_unread_state_uses_local_host_and_does_not_merge_accounts(self):
        state = {"version": 1, "unreadByIdentity": {"user": {"local:host": ["one"], "remote-control:host": ["remote"]}}}
        self.assertEqual(local_unread_threads({"electron-thread-read-state-v1": state}), {"one"})
        state["unreadByIdentity"]["user"]["local:host"] = []
        self.assertEqual(local_unread_threads({"electron-thread-read-state-v1": state}), set())
        state["unreadByIdentity"]["other-user"] = {"local:host": ["other"]}
        self.assertIsNone(local_unread_threads({"electron-thread-read-state-v1": state}))
        self.assertIsNone(local_unread_threads({}))

    def ask(self, state, call="request", questions=None):
        state.apply({"timestamp": "2026-11-05T08:00:01Z", "type": "response_item", "payload": {
            "type": "function_call", "name": "request_user_input_async", "call_id": call,
            "arguments": json.dumps({"questions": questions or [{"title": "Please sign in."}]})}})

    def reply(self, state, call="request", index=0):
        value = [{"questionItemId": json.dumps(["request_user_input_async", call, index]), "question": "Please sign in.", "answer": "Done"}]
        state.apply({"type": "response_item", "payload": {"type": "message", "role": "user", "content": [{
            "type": "input_text", "text": "<send_user_message_question_reply>\n" + json.dumps(value) + "\n</send_user_message_question_reply>"}]}})

    def test_request_stays_pending_during_work_and_clears_only_matching_reply(self):
        state = RunState(); state.apply(event("task_started"))
        self.ask(state, questions=[{"title": "One"}, {"title": "Two"}])
        state.apply(event("item_completed", item={"type": "CommandExecution"}))
        result = state.public(state.started_at + 600, {"running": True, "startedAt": 0})
        self.assertEqual(result["status"], "waitingInput")
        self.assertFalse(result["stale"])  # A deliberate input wait is not inactivity.
        self.reply(state, "other"); self.assertEqual(len(state.pending_input), 2)
        self.reply(state); self.assertEqual(len(state.pending_input), 1)
        self.reply(state, index=1); self.assertFalse(state.pending_input)
        self.assertEqual(state.status, "working")

    def test_finished_aborted_and_new_runs_clear_old_questions(self):
        for ending in (event("task_complete"), event("turn_aborted", reason="interrupted"), event("task_started", "b")):
            state = RunState(); state.apply(event("task_started")); self.ask(state)
            state.apply(ending)
            self.assertFalse(state.pending_input)

    def test_question_text_or_tool_arguments_do_not_invent_attention(self):
        state = RunState(); state.apply(event("task_started"))
        state.apply({"type": "response_item", "payload": {"type": "message", "role": "assistant", "content": [{"type":"output_text", "text":"Please approve?"}]}})
        state.apply({"type": "response_item", "payload": {"type": "function_call", "name": "exec", "call_id": "x", "arguments": '{"questions":[{"title":"PRIVATE"}]}'}})
        self.assertFalse(state.pending_input)
        self.assertNotIn("PRIVATE", repr(state.__dict__))

    def test_bootstrap_finds_distant_lifecycle_and_checkpoint_restores_pending_request(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "journal.jsonl"
            state = RunState(); self.ask(state)
            request = {"type": "response_item", "payload": {"type": "function_call", "name": "request_user_input_async", "call_id": "request", "arguments": '{"questions":[{"title":"Please sign in."}]}'}}
            with path.open("w") as stream:
                stream.write(json.dumps(event("task_started")) + "\n")
                # Large unrelated output must not obscure the lifecycle or allocate it all.
                stream.write(json.dumps({"type":"response_item", "payload":{"type":"function_call_output", "output":"x" * (17*1024*1024)}}) + "\n")
                stream.write(json.dumps(request) + "\n")
            tail = Tail(path); tail.poll()
            self.assertEqual(tail.state.status, "working")
            self.assertTrue(tail.state.pending_input)
            self.assertIsNone(tail.error)
            saved = json.loads(json.dumps(tail.checkpoint()))
            restored = Tail(path, saved); restored.poll()
            self.assertEqual(restored.state.pending_input, tail.state.pending_input)
            self.assertEqual(restored.offset, path.stat().st_size)
            # A changed checkpoint boundary must force a rebuild, not trust old state.
            with path.open("r+b") as stream:
                stream.seek(-2, 2); stream.write(b" \n")
            rejected = Tail(path, saved)
            self.assertIsNone(rejected.identity)

    def test_new_run_and_late_terminal_record(self):
        state = RunState()
        state.apply(event("task_started", "a"))
        state.apply(event("task_complete", "a"))
        state.apply(event("task_started", "b"))
        state.apply(event("task_complete", "a"))
        self.assertEqual((state.run_id, state.status), ("b", "working"))

    def test_interruption_is_not_completion(self):
        state = RunState()
        state.apply(event("task_started"))
        state.apply(event("turn_aborted", reason="interrupted"))
        self.assertEqual(state.status, "interrupted")

    def test_tool_failure_does_not_fail_run(self):
        state = RunState()
        state.apply(event("task_started"))
        state.apply(event("item_completed", item={"type": "CommandExecution", "status": "failed", "exit_code": 1, "aggregated_output": "PRIVATE"}))
        self.assertEqual(state.status, "working")
        self.assertNotIn("PRIVATE", repr(state.__dict__))
        state.apply(event("task_complete"))
        self.assertEqual(state.status, "completed")

    def test_unconfirmed_runtime_error_is_not_success(self):
        state = RunState()
        state.apply(event("task_started"))
        state.apply(event("error", message="Do not expose raw runtime details"))
        state.apply(event("task_complete"))
        self.assertEqual(state.status, "unknown")

    def test_only_explicit_failure_is_failed(self):
        state = RunState()
        state.apply(event("task_started"))
        state.apply(event("task_complete", status="failed"))
        self.assertEqual(state.status, "failed")

    def test_progress_is_minimized_and_does_not_copy_reasoning(self):
        state = RunState()
        state.apply(event("item_completed", item={"type": "Reasoning", "summary_text": ["PRIVATE"]}))
        state.apply({"timestamp": "2026-11-05T08:00:01Z", "type": "response_item", "payload": {"type": "message", "role": "assistant", "phase": "commentary", "content": [{"type": "output_text", "text": "**Checking** [local tests](/private/path). <oai-mem-citation>PRIVATE</oai-mem-citation>"}]}})
        self.assertEqual(state.update, "Checking local tests.")
        self.assertNotIn("PRIVATE", repr(state.__dict__))

    def test_stale_when_source_process_stops(self):
        state = RunState()
        state.apply(event("task_started"))
        result = state.public(time.time(), {"running": False, "startedAt": 0})
        self.assertTrue(result["stale"])
        self.assertEqual(result["status"], "working")  # Last observed, not invented interruption.

    def test_old_unfinished_run_is_stale_after_restart(self):
        state = RunState()
        state.apply(event("task_started"))
        result = state.public(state.started_at + 5, {"running": True, "startedAt": state.started_at + 1})
        self.assertTrue(result["stale"])

    def test_partial_utf8_write_is_applied_only_when_complete(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "journal.jsonl"
            path.write_text(json.dumps(event("task_started")) + "\n")
            tail = Tail(path); tail.poll()
            record = json.dumps(event("item_completed", item={"type": "AgentMessage", "content": [{"type": "Text", "text": "Checking café"}]}), ensure_ascii=False).encode() + b"\n"
            cut = record.index("é".encode()) + 1
            with path.open("ab") as stream: stream.write(record[:cut])
            tail.poll(); self.assertEqual(tail.state.update, "")
            with path.open("ab") as stream: stream.write(record[cut:])
            tail.poll(); self.assertEqual(tail.state.update, "Checking café")
            tail.poll(); self.assertEqual(tail.state.update, "Checking café")

    def test_rotation_and_truncation_reset_offsets(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "journal.jsonl"
            path.write_text(json.dumps(event("task_started", "old")) + "\n")
            tail = Tail(path); tail.poll()
            replacement = path.with_suffix(".new")
            replacement.write_text(json.dumps(event("task_started", "new")) + "\n")
            replacement.replace(path)
            tail.poll(); self.assertEqual(tail.state.run_id, "new")
            path.write_text("{}\n")
            tail.poll(); self.assertIsNone(tail.state.run_id)

    def test_malformed_line_does_not_break_following_events(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "journal.jsonl"
            path.write_text('not-json\n' + json.dumps(event("task_started")) + '\n' + json.dumps(event("task_complete")) + '\n')
            tail = Tail(path); tail.poll()
            self.assertEqual(tail.state.status, "completed")


if __name__ == "__main__":
    unittest.main()
