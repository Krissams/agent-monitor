"""Fictional, static sample agents. This module never opens Codex data."""
import time


class DemoSource:
    def __init__(self):
        self.polls = 0
        self.started = time.time()

    def poll(self):
        self.polls += 1
        now, origin = time.time(), self.started
        specs = [
            ("Scientist · Compare experiment results", "Research Lab", "waitingInput",
             "The comparison is ready. Which dataset should I use for the final report?", False, None),
            ("Artist · Prepare launch artwork", "Launch Studio", "completed",
             "The artwork is ready for your review, including square and landscape versions.", True, origin - 45),
            ("Developer · Build account settings", "Sample App", "working",
             "The settings screen is connected. Checking validation and keyboard navigation.", False, None),
            ("Tester · Check the sign-in flow", "Sample App", "working",
             "Checking sign-in, password reset, and the session-expiry edge cases.", False, None),
            ("Designer · Polish the dashboard", "Launch Studio", "working",
             "Refining the card spacing and checking contrast in light and dark mode.", False, None),
            ("Security Engineer · Review dependencies", "Sample App", "completed",
             "The dependency review is finished. Findings and suggested updates are ready.", False, origin - 120),
        ]
        agents = []
        for index, (title, project, status, update, unread, finished) in enumerate(specs, 1):
            agents.append({
                "id": "00000000-0000-4000-8000-%012d" % index,
                "title": title, "project": project, "projectId": project,
                "location": "demo", "runId": "demo-run-%d" % index,
                "status": status, "runStatus": "working" if status == "waitingInput" else status,
                "stale": False, "unread": unread,
                "startedAt": origin - 620 - index * 95, "finishedAt": finished,
                "lastEventAt": origin - 15, "updateAt": origin - 15,
                "update": update, "issue": None, "openUrl": None,
                "requestId": "demo-question" if status == "waitingInput" else None,
                "requestIds": ["demo-question"] if status == "waitingInput" else [],
                "requestText": update if status == "waitingInput" else None,
                "requestAt": origin - 30 if status == "waitingInput" else None,
            })
        return {"schemaVersion": 1, "adapter": "demo", "demo": True,
                "refreshedAt": now, "pollCount": self.polls, "uptimeSeconds": round(now - origin),
                "pollMilliseconds": 0,
                "connection": {"ok": True, "problem": None, "unavailableJournals": 0},
                "capabilities": {"pendingInput": True, "pendingApprovals": False,
                                 "completedUnread": True, "failureCoverage": "demo-only", "allChats": False},
                "chats": agents}
