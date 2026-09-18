"""GitHub client — issue creation via PyGithub."""

from __future__ import annotations

import logging

from github import Auth, Github

from app.config import settings

logger = logging.getLogger(__name__)


def _github() -> Github:
    auth = Auth.Token(settings.github_token)
    return Github(auth=auth)


def _ensure_labels_exist(repo, labels: list[str]) -> None:
    """Create any labels that don't already exist in the repo."""
    existing = {lbl.name for lbl in repo.get_labels()}
    colors = {
        "incident": "d73a4a",
        "critical": "b60205",
        "high": "d93f0b",
        "medium": "fbca04",
        "low": "0e8a16",
        "informational": "c5def5",
        "ai-generated": "7057ff",
    }
    for label in labels:
        if label not in existing:
            color = colors.get(label, "ededed")
            repo.create_label(name=label, color=color)
            logger.info("Created label '%s' in repo", label)


async def create_issue(
    title: str,
    body: str,
    labels: list[str] | None = None,
) -> str:
    """Create a GitHub issue and return its HTML URL."""
    gh = _github()
    repo = gh.get_repo(settings.github_repo)
    if labels:
        _ensure_labels_exist(repo, labels)
    issue = repo.create_issue(
        title=title,
        body=body,
        labels=labels or [],
    )
    logger.info("Created GitHub issue #%s: %s", issue.number, issue.html_url)
    return issue.html_url


async def get_recent_commits(
    service_name: str | None = None,
    hours: int = 24,
) -> list[dict]:
    """Fetch recent commits from the configured repo (optionally filtered by path)."""
    from datetime import datetime, timedelta, timezone

    gh = _github()
    repo = gh.get_repo(settings.github_repo)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    commits = repo.get_commits(since=since)
    results = []
    for c in commits[:20]:  # cap to avoid huge payloads
        entry = {
            "sha": c.sha[:8],
            "message": c.commit.message.split("\n")[0],
            "author": c.commit.author.name if c.commit.author else "unknown",
            "date": c.commit.author.date.isoformat() if c.commit.author else None,
            "url": c.html_url,
        }
        # If a service name is provided, check if any changed file path contains it
        if service_name:
            try:
                files_changed = [f.filename for f in c.files or []]
                if not any(service_name.lower() in f.lower() for f in files_changed):
                    continue
            except Exception:
                pass  # files list may be unavailable
        results.append(entry)
    return results
