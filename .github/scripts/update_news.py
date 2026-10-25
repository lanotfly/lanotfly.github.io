#!/usr/bin/env python3
"""Fetch public RSS feeds and publish same-origin JSON for the GitHub Pages news panel."""
import json
import os
import urllib.request
import xml.etree.ElementTree as ET

FEEDS = {
    "english": {
        "source": "The Guardian",
        "url": "https://www.theguardian.com/international/rss",
        "lang": "en",
    },
    "japanese": {
        "source": "NHK NEWS WEB",
        "url": "https://www.nhk.or.jp/rss/news/cat0.xml",
        "lang": "ja",
    },
}

def local_name(tag):
    return tag.rsplit("}", 1)[-1].lower()

def text_of(node, names):
    for child in list(node):
        if local_name(child.tag) in names:
            value = "".join(child.itertext()).strip()
            if value:
                return value
    return ""

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
        title = text_of(node, {"title"})
        link = text_of(node, {"link"})
        if not link:
            for child in list(node):
                if local_name(child.tag) == "link":
                    link = child.attrib.get("href", "").strip()
                    if link:
                        break
        summary = text_of(node, {"encoded", "content", "description", "summary"})
        date = text_of(node, {"pubdate", "published", "updated", "date"})
        if title and link.startswith(("http://", "https://")):
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
        raise ValueError("No usable items found in " + feed["url"])
    return items

def main():
    path = "assets/data/news.json"
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        data = {}
    for key, feed in FEEDS.items():
        try:
            data[key] = read_feed(feed)
            data.setdefault("sources", {})[key] = feed["source"]
            print(f"Updated {key}: {len(data[key])} items")
        except Exception as exc:
            print(f"WARNING: {key} feed failed: {exc}")
            if not data.get(key):
                data[key] = []
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

if __name__ == "__main__":
    main()
