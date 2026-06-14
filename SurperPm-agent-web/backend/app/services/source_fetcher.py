"""External source fetchers for the Learnings distillation pipeline.

Supports GitHub (commits/issues/PRs), RSS feeds, and webpage scraping.
All use httpx which is already in the dependency tree.
"""
from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from xml.etree import ElementTree

import httpx

_logger = logging.getLogger(__name__)

_CLIENT = httpx.AsyncClient(
    follow_redirects=True,
    timeout=20.0,
    headers={"User-Agent": "SuperPmAgent-Learner/1.0"},
)


async def fetch_github(
    repo_url: str,
    token: str | None = None,
    since: str | None = None,
    max_items: int = 20,
) -> list[dict]:
    """Fetch recent commits + merged PRs from a GitHub repo."""
    match = re.match(r"https?://github\.com/([^/]+)/([^/]+)", repo_url)
    if not match:
        _logger.warning("source_fetcher: invalid GitHub URL %s", repo_url)
        return []

    owner, repo = match.group(1), match.group(2).rstrip(".git")
    headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    items: list[dict] = []

    params: dict[str, str | int] = {"per_page": max_items}
    if since:
        params["since"] = since
    try:
        resp = await _CLIENT.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            headers=headers,
            params=params,
        )
        if resp.status_code == 200:
            for c in resp.json()[:max_items]:
                msg = c.get("commit", {}).get("message", "")
                items.append({
                    "type": "github_commit",
                    "title": msg.split("\n")[0][:120],
                    "content": msg,
                    "url": c.get("html_url", ""),
                    "date": c.get("commit", {}).get("author", {}).get("date", ""),
                })
    except httpx.RequestError:
        _logger.warning("source_fetcher: GitHub commits request failed", exc_info=True)

    try:
        pr_params: dict[str, str | int] = {
            "state": "closed",
            "sort": "updated",
            "direction": "desc",
            "per_page": min(max_items, 10),
        }
        resp = await _CLIENT.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            params=pr_params,
        )
        if resp.status_code == 200:
            for pr in resp.json():
                if not pr.get("merged_at"):
                    continue
                if since and pr["merged_at"] < since:
                    continue
                items.append({
                    "type": "github_pr",
                    "title": pr.get("title", ""),
                    "content": (pr.get("body") or "")[:2000],
                    "url": pr.get("html_url", ""),
                    "date": pr["merged_at"],
                })
    except httpx.RequestError:
        _logger.warning("source_fetcher: GitHub PRs request failed", exc_info=True)

    return items


async def fetch_rss(feed_url: str, max_items: int = 10) -> list[dict]:
    """Parse an RSS/Atom feed and return recent entries."""
    try:
        resp = await _CLIENT.get(feed_url)
        resp.raise_for_status()
    except httpx.RequestError:
        _logger.warning("source_fetcher: RSS fetch failed for %s", feed_url, exc_info=True)
        return []

    items: list[dict] = []
    try:
        root = ElementTree.fromstring(resp.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        for item in root.findall(".//item")[:max_items]:
            title = (item.findtext("title") or "").strip()
            desc = (item.findtext("description") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            items.append({
                "type": "rss",
                "title": title[:200],
                "content": _strip_html(desc)[:3000],
                "url": link,
                "date": pub_date,
            })

        if not items:
            for entry in root.findall(".//atom:entry", ns)[:max_items]:
                title = (entry.findtext("atom:title", namespaces=ns) or "").strip()
                summary = (entry.findtext("atom:summary", namespaces=ns) or "").strip()
                content_el = entry.find("atom:content", ns)
                content = content_el.text.strip() if content_el is not None and content_el.text else summary
                link_el = entry.find("atom:link", ns)
                link = link_el.get("href", "") if link_el is not None else ""
                updated = (entry.findtext("atom:updated", namespaces=ns) or "").strip()
                items.append({
                    "type": "rss",
                    "title": title[:200],
                    "content": _strip_html(content)[:3000],
                    "url": link,
                    "date": updated,
                })
    except ElementTree.ParseError:
        _logger.warning("source_fetcher: RSS XML parse failed for %s", feed_url, exc_info=True)

    return items


async def fetch_webpage(url: str) -> list[dict]:
    """Fetch a webpage and extract its text content."""
    try:
        resp = await _CLIENT.get(url)
        resp.raise_for_status()
    except httpx.RequestError:
        _logger.warning("source_fetcher: webpage fetch failed for %s", url, exc_info=True)
        return []

    content_type = resp.headers.get("content-type", "")
    if "text/html" not in content_type and "text/plain" not in content_type:
        return []

    text = _strip_html(resp.text)[:5000]
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", resp.text, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else url

    return [{
        "type": "webpage",
        "title": title[:200],
        "content": text,
        "url": url,
        "date": datetime.now(UTC).isoformat(),
    }]


def _strip_html(html: str) -> str:
    """Rough HTML tag removal."""
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
