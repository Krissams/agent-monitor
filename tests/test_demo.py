import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

from dashboard.demo import DemoSource

ROOT = Path(__file__).resolve().parents[1]


class DemoTests(unittest.TestCase):
    def test_static_demo_does_not_make_new_transitions_or_real_links(self):
        source = DemoSource()
        first, second = source.poll(), source.poll()
        self.assertTrue(first["demo"])
        self.assertEqual(first["chats"], second["chats"])
        self.assertGreater(second["pollCount"], first["pollCount"])
        self.assertTrue(all(agent["openUrl"] is None for agent in first["chats"]))

    def test_demo_server_works_in_a_home_without_codex_and_rejects_unsafe_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copy(ROOT / "server.py", root / "server.py")
            shutil.copytree(ROOT / "dashboard", root / "dashboard", ignore=shutil.ignore_patterns("__pycache__"))
            (root / "public").mkdir()
            (root / "public/index.html").write_text("<h1>Agent Monitor test</h1>")
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", 0))
                port = probe.getsockname()[1]
            url = "http://127.0.0.1:%d" % port
            env = {"HOME": str(root), "PATH": os.environ.get("PATH", ""), "LANG": "en_US.UTF-8"}
            process = subprocess.Popen([sys.executable, str(root / "server.py"), "--demo", "--port", str(port)],
                                       cwd=root, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            try:
                snapshot = None
                for _ in range(100):
                    try:
                        snapshot = json.load(urllib.request.urlopen(url + "/api/status", timeout=1))
                        if snapshot.get("demo"):
                            break
                    except (OSError, ValueError):
                        pass
                    if process.poll() is not None:
                        self.fail("Demo server exited: " + process.stderr.read().decode())
                    time.sleep(0.05)
                self.assertTrue(snapshot and snapshot.get("demo"))
                self.assertTrue(snapshot["connection"]["ok"])
                self.assertFalse((root / ".codex").exists())
                self.assertFalse((root / ".runtime").exists())
                with urllib.request.urlopen(url) as response:
                    self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])
                requests = [
                    (urllib.request.Request(url + "/api/status", headers={"Origin": "https://example.com"}), 403),
                    (urllib.request.Request(url + "/api/status", headers={"Sec-Fetch-Site": "cross-site"}), 403),
                    (urllib.request.Request(url, headers={"Host": "example.com"}), 403),
                    (urllib.request.Request(url + "/api/status", data=b"{}", method="POST"), 405),
                    (urllib.request.Request(url + "/server.py"), 404),
                ]
                for request, expected in requests:
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(request)
                    self.assertEqual(error.exception.code, expected)
            finally:
                process.terminate()
                process.communicate(timeout=5)


if __name__ == "__main__":
    unittest.main()
