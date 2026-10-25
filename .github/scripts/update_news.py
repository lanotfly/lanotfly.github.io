#!/usr/bin/env python3
"""Fetch all available News podcast RSS episodes into the static JSON cache."""
import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from datetime import datetime, timezone

FEEDS = {
    "bbc": {"source": "BBC Global News Podcast", "url": "https://podcasts.files.bbci.co.uk/p02nq0gn.rss"},
    "chronicle": {"source": "Chronicle · News Connect", "url": "https://rss.listen.style/p/smbslbmi/rss"},
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

def feed_artwork(root):
    channel = next((node for node in root.iter() if local_name(node.tag) == "channel"), root)
    for node in channel.iter():
        if local_name(node.tag) == "image":
            for child in list(node):
                if local_name(child.tag) == "url" and (child.text or "").strip().startswith(("http://", "https://")):
                    return child.text.strip()
            href = node.attrib.get("href", "").strip()
            if href.startswith(("http://", "https://")):
                return href
    return ""

def item_audio(node):
    for child in list(node):
        if local_name(child.tag) == "enclosure":
            media_url = child.attrib.get("url", "").strip()
            if media_url.startswith(("http://", "https://")):
                return media_url
    for child in list(node):
        if local_name(child.tag) == "link" and child.attrib.get("rel", "").lower() == "enclosure":
            media_url = child.attrib.get("href", "").strip()
            if media_url.startswith(("http://", "https://")):
                return media_url
    return ""

def item_link(node):
    for attr, value in node.attrib.items():
        if local_name(attr) in ("about", "href", "link") and value.strip().startswith(("http://", "https://")):
            return value.strip()
    for child in list(node):
        if local_name(child.tag) == "link":
            link = child.attrib.get("href", "").strip() or (child.text or "").strip()
            if link.startswith(("http://", "https://")):
                return link
    guid = child_text(node, {"guid", "id"})
    if guid.startswith(("http://", "https://")):
        return guid
    for child in list(node):
        if local_name(child.tag) == "enclosure":
            media_url = child.attrib.get("url", "").strip()
            if media_url.startswith(("http://", "https://")):
                return media_url
    return ""

def read_feed(feed):
    req = urllib.request.Request(feed["url"], headers={"User-Agent": "PersonalLibraryNewsFeed/1.0 (GitHub Actions; RSS reader)"})
    with urllib.request.urlopen(req, timeout=25) as response:
        payload = response.read()
    root = ET.fromstring(payload)
    artwork = feed_artwork(root)
    if feed["source"] == "BBC Global News Podcast" and artwork.startswith("http://"):
        artwork = "https://" + artwork[len("http://"):]
    items = []
    for node in root.iter():
        if local_name(node.tag) not in ("item", "entry"):
            continue
        title = plain_text(child_text(node, {"title"}))
        link = item_link(node)
        audio_url = item_audio(node)
        if feed["source"] == "BBC Global News Podcast":
            if link.startswith("http://"):
                link = "https://" + link[len("http://"):]
            if audio_url.startswith("http://"):
                audio_url = "https://" + audio_url[len("http://"):]
        summary = plain_text(child_text(node, {"encoded", "content", "description", "summary"}))
        date = child_text(node, {"pubdate", "published", "updated", "date"})
        duration = child_text(node, {"duration"})
        if title and link:
            items.append({
                "title": title, "summary": summary, "link": link,
                "audioUrl": audio_url, "date": date, "duration": duration,
                "source": feed["source"]
            })
    if not items:
        item_nodes = [node for node in root.iter() if local_name(node.tag) in ("item", "entry")]
        sample_tags = [local_name(child.tag) for child in list(item_nodes[0])] if item_nodes else []
        raise ValueError(f"No usable RSS items found (root={local_name(root.tag)}, item_nodes={len(item_nodes)}, first_item_children={sample_tags})")
    return {"items": items, "artwork": artwork}

def main():
    path = "assets/data/news.json"
    try:
        with open(path, encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        data = {}
    for key in ("guardian", "nhk"):
        data.pop(key, None)
    for key in FEEDS:
        data.setdefault(key, [])
    data["sources"] = {key: feed["source"] for key, feed in FEEDS.items()}
    data["artwork"] = data.get("artwork", {})
    data["feedStatus"] = {}
    for key, feed in FEEDS.items():
        checked = datetime.now(timezone.utc).isoformat(timespec="seconds")
        try:
            result = read_feed(feed)
            data[key] = result["items"]
            if result["artwork"]:
                data["artwork"][key] = result["artwork"]
            data["feedStatus"][key] = {"ok": True, "count": len(data[key]), "checkedAt": checked}
            print(f"OK {key}: {len(data[key])} episodes — {feed['url']}")
        except Exception as exc:
            data["feedStatus"][key] = {"ok": False, "error": str(exc), "checkedAt": checked}
            print(f"FAILED {key}: {feed['url']} — {type(exc).__name__}: {exc}")
    data["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\\n")

if __name__ == "__main__":
    main()
