#!/usr/bin/env python3
"""Delete draft GitHub releases for a tag so softprops/action-gh-release
can re-publish without already_exists on tag_name.

Env:
  GH_TOKEN  — GitHub token
  TAG       — release tag, e.g. v1.2.0-rc.1
  GITHUB_REPOSITORY — owner/repo
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

TOKEN = os.environ["GH_TOKEN"]
TAG = os.environ["TAG"]
REPO = os.environ["GITHUB_REPOSITORY"]
API = f"https://api.github.com/repos/{REPO}"


def request(method: str, url: str):
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "puzzle-sekai-release",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        print(f"HTTP {e.code} {method} {url}: {body}", file=sys.stderr)
        raise


def main() -> int:
    _, releases = request("GET", f"{API}/releases?per_page=50")
    if not releases:
        print("no releases")
        return 0
    for r in releases:
        if r.get("tag_name") != TAG:
            continue
        rid = r["id"]
        if r.get("draft"):
            print(f"deleting draft release id={rid} tag={TAG}")
            request("DELETE", f"{API}/releases/{rid}")
        else:
            print(f"keep published release id={rid} tag={TAG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
