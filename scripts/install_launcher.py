#!/usr/bin/env python3
"""Create a desktop shortcut pointing to this checkout; does not start at login."""
import argparse
from pathlib import Path
import shlex
import sys

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path.home() / "Desktop")
    args = parser.parse_args()
    directory = args.directory.expanduser()
    if not directory.is_dir():
        raise SystemExit("Shortcut directory does not exist. Use --directory PATH.")
    path = directory / "Agent Monitor.command"
    content = "#!/bin/zsh\n# Agent Monitor desktop shortcut\ncd -- %s\nexec %s %s open\n" % (
        shlex.quote(str(ROOT)), shlex.quote(sys.executable), shlex.quote(str(ROOT / "scripts/dashboardctl.py")))
    if path.is_symlink() or (path.exists() and path.read_text() != content):
        raise SystemExit("An existing shortcut has different contents; leaving it unchanged.")
    path.write_text(content)
    path.chmod(0o755)
    print("Created: " + str(path))
    print("Keep this project folder in place; the shortcut points to it.")


if __name__ == "__main__":
    main()
