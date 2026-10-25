#!/usr/bin/env python3
"""Fetch podcast RSS feeds and publish same-origin JSON for the GitHub Pages News panel."""
import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

FEEDS = {
    "english": {
        "source": "BBC Global News Podcast",
        "url": "https://podcasts.files.bbci.co.uk/p02nq0gn.rss",
    },
    "japanese": {
        "source": "Chronicle · News Connect",
        "url": "https://rss.listen.style/p/smbslbmi/rss",
    },
}

class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, value):
        self.parts.append(value)

    def result(self):
        return re.sub(r"\\s+", " ", " ".join(self.parts)).strip()

def local_name(tag):
    return tag.rsplit("}", 1)[-1].split(":")[-1].lower()

def plain_text(value):
    parser = TextOnly()
    try:
        parser.feed(html.unescape(value or ""))
        return parser.result()
    except Exception:
        return re.sub(r"\\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()

def child_text(node, names):
    wanted = {name.lower() for name in names}
    for child in list(node):
        if local_name(child.tag) in wanted:
            value = "".join(child.itertext()).strip()
            if value:
                return value
    return ""

def item_link(node):
    for child in list(node):
        if local_name(child.tag) != "link":
            continue
        link = child.attrib.get("href", "").strip() or (child.text or "").strip()
        if link.startswith(("http://", "https://")):
            return link
    guid = child_text(node, {"guid", "id"})
    return guid if guid.startswith(("http://", "https://")) else ""

def read_feed(feed):
    req = urllib.request.Request(
        feed["url"],
        headers={"User-Agent": "PersonalLibraryNewsFeed/1.0 (GitHub Actions; RSS reader)"},
    )
    with urllib.request.urlopen(req, timeout=25) as response:
        payload = response.read()
    root = ET.fromstring(payload)
    items = []
    for node in root.iter():
        if local_name(node.tag) not in ("item", "entry"):
            continue
        title = plain_text(child_text(node, {"title"}))
        link = item_link(node)
        summary = plain_text(child_text(node, {"encoded", "content", "description", "summary"}))
        date = child_text(node, {"pubdate", "published", "updated", "date"})
        if title and link:
            items.append({
                "title": title,
                "summary": summary,
                "link": link,
                "date": date,
                "source": feed["source"],
            })
        if len(items) >= 5:
            break
    if not items:
        raise ValueError("No usable RSS items found: " + feed["url"])
    return items

def main():
    path = "assets/data/news.json"
    try:
        with open(path, encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        data = {}
    data.setdefault("english", [])
    data.setdefault("japanese", [])
    data["sources"] = {key: feed["source"] for key, feed in FEEDS.items()}
    for key, feed in FEEDS.items():
        try:
            data[key] = read_feed(feed)
            print(f"Updated {key}: {len(data[key])} episodes")
        except Exception as exc:
            # Preserve the last good cache so a temporary feed outage does not blank News.
            print(f"WARNING: {key} refresh failed; keeping previous cache: {exc}")
    from datetime import datetime, timezone
    data["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\\n")

if __name__ == "__main__":
    main()
