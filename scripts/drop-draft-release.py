#!/usr/bin/env python3
"""Delete draft GitHub releases for a tag so softprops/action-gh-release
can re-publish without already_exists on tag_name.

Env:
  GH_TOKEN  — GitHub token
  TAG       — release tag, e.g. v1.2.0-rc.1
  GITHUB_REPOSITORY — owner/repo
"""
from __future__ import annotations

import http.client
import json
import os
import re
import sys

TOKEN = os.environ["GH_TOKEN"]
TAG = os.environ["TAG"]
REPO = os.environ["GITHUB_REPOSITORY"]
if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", REPO):
    raise ValueError("GITHUB_REPOSITORY must be an owner/repository pair")

API_HOST = "api.github.com"
API_PREFIX = f"/repos/{REPO}"
ALLOWED_METHODS = {"GET", "DELETE"}


def request(method: str, path: str):
    if method not in ALLOWED_METHODS:
        raise ValueError(f"unsupported GitHub API method: {method}")
    if not path.startswith("/") or "://" in path:
        raise ValueError("GitHub API request path must be relative")

    request_path = f"{API_PREFIX}{path}"
    connection = http.client.HTTPSConnection(API_HOST, timeout=30)
    try:
        connection.request(
            method,
            request_path,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "puzzle-sekai-release",
            },
        )
        response = connection.getresponse()
        raw = response.read()
    finally:
        connection.close()

    if response.status >= 400:
        body = raw.decode("utf-8", "replace")
        print(
            f"HTTP {response.status} {method} {request_path}: {body}",
            file=sys.stderr,
        )
        raise RuntimeError(f"GitHub API request failed with HTTP {response.status}")
    return response.status, (json.loads(raw) if raw else None)


def main() -> int:
    _, releases = request("GET", "/releases?per_page=50")
    if not releases:
        print("no releases")
        return 0
    for r in releases:
        if r.get("tag_name") != TAG:
            continue
        rid = int(r["id"])
        if r.get("draft"):
            print(f"deleting draft release id={rid} tag={TAG}")
            request("DELETE", f"/releases/{rid}")
        else:
            print(f"keep published release id={rid} tag={TAG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
