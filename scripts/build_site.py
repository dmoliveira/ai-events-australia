from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "docs" / "data"
EVENTS_PATH = DATA_DIR / "events.json"
META_PATH = DATA_DIR / "meta.json"
GENERATED_DIR = DATA_DIR / "generated"
ICS_PATH = DATA_DIR / "all-events.ics"


def load_events() -> list[dict]:
    return json.loads(EVENTS_PATH.read_text())


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


def build_meta(events: list[dict]) -> dict:
    now = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    sorted_events = sorted(events, key=lambda item: item["start"])
    current_time = datetime.now(UTC)
    upcoming_events = [
        event
        for event in sorted_events
        if event.get("status") == "upcoming"
        and parse_dt(event["start"]).astimezone(UTC) >= current_time
    ]
    city_counts = Counter(event["city"] for event in events)
    topic_counts = Counter(topic for event in events for topic in event["topics"])
    source_counts = Counter(event["source_platform"] for event in events)
    return {
        "site_name": "AI Events Australia",
        "updated_at": now,
        "event_count": len(events),
        "city_count": len(city_counts),
        "topic_count": len(topic_counts),
        "featured_scope": "Australia-wide",
        "city_counts": dict(city_counts),
        "topic_counts": dict(topic_counts),
        "source_counts": dict(source_counts),
        "next_event": upcoming_events[0] if upcoming_events else None,
    }


def build_indexes(events: list[dict]) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    by_city: dict[str, list[dict]] = defaultdict(list)
    by_topic: dict[str, list[dict]] = defaultdict(list)
    by_month: dict[str, list[dict]] = defaultdict(list)

    for event in sorted(events, key=lambda item: item["start"]):
        by_city[event["city"]].append(event)
        by_month[event["start"][:7]].append(event)
        for topic in event["topics"]:
            by_topic[topic].append(event)

    (GENERATED_DIR / "cities.json").write_text(json.dumps(by_city, indent=2))
    (GENERATED_DIR / "topics.json").write_text(json.dumps(by_topic, indent=2))
    (GENERATED_DIR / "months.json").write_text(json.dumps(by_month, indent=2))


def esc(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def build_ics(events: list[dict]) -> None:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Events Australia//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    for event in sorted(events, key=lambda item: item["start"]):
        dtstart = parse_dt(event["start"]).astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
        dtend = (
            parse_dt(event.get("end") or event["start"])
            .astimezone(UTC)
            .strftime("%Y%m%dT%H%M%SZ")
        )
        location = ", ".join(
            part
            for part in [event.get("venue_name"), event["city"], event["state"]]
            if part
        )
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{event['id']}@ai-events-australia",
                f"DTSTAMP:{stamp}",
                f"DTSTART:{dtstart}",
                f"DTEND:{dtend}",
                f"SUMMARY:{esc(event['title'])}",
                f"DESCRIPTION:{esc(event['summary'] + ' Source: ' + event['canonical_url'])}",
                f"LOCATION:{esc(location)}",
                f"URL:{event['canonical_url']}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    ICS_PATH.write_text("\n".join(lines) + "\n")


def main() -> None:
    events = load_events()
    META_PATH.write_text(json.dumps(build_meta(events), indent=2))
    build_indexes(events)
    build_ics(events)


if __name__ == "__main__":
    main()
