#!/usr/bin/env python3
"""Weekly report agent for CASPYAN / real estate / markets monitoring."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


DOC_ID = "1Kw8TqFBuDzPknCsW5tRKQRjcTD5JWRchPyC3nE-P5AU"
DOC_URL = f"https://docs.google.com/document/d/{DOC_ID}/edit"
DEFAULT_APPS_SCRIPT_WEB_APP_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbycnjWM0j3mzy1KZQB8uZTIE8GlbObaqTRbdbHOnLlI0QI0rNjnQ80cyOcEKJfAzSPNYA/exec"
)
PREVIEW_PATH = Path("weekly_report_preview.md")
LOCAL_CONFIG_PATH = Path("config.local.json")


def prague_now() -> dt.datetime:
    try:
        from zoneinfo import ZoneInfo

        return dt.datetime.now(ZoneInfo("Europe/Prague"))
    except Exception:
        return dt.datetime.now()


def current_week_range(now: dt.datetime) -> tuple[dt.date, dt.date]:
    start = now.date() - dt.timedelta(days=now.weekday())
    return start, now.date()


def format_date(value: dt.date) -> str:
    return value.strftime("%d.%m.%Y")


def build_test_section(now: dt.datetime) -> str:
    return f"""────────────────────────────
TEST - Codex Cloud zapis funguje - {now.strftime("%d.%m.%Y %H:%M")}

Status: testovaci manualni beh
Dokument: {DOC_URL}

Tento oddil overuje, ze automatizace ma realny zapis do Google Docs.
────────────────────────────
"""


def build_preview_report(now: dt.datetime) -> str:
    week_start, week_end = current_week_range(now)
    return f"""**Tyden {format_date(week_start)} - {format_date(week_end)}**
- Technicky dry-run automatizace probehl.
- Tento nahled neni analyticky report; slouzi pouze k overeni behu skriptu.

**Dopad pro CASPYAN / real estate**
- Bez analytickeho obsahu v dry-run rezimu.

**Dopad pro portfolio**
- Bez analytickeho obsahu v dry-run rezimu.

**Top akce**
- Pro ostry zapis pouzij `python weekly_report_agent.py --write --content-file /tmp/weekly-report.md`.
"""


def post_to_apps_script(section: str) -> dict:
    endpoint = os.environ.get("GOOGLE_APPS_SCRIPT_WEB_APP_URL")
    token = os.environ.get("GOOGLE_APPS_SCRIPT_TOKEN")

    if LOCAL_CONFIG_PATH.exists():
        local_config = json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8"))
        endpoint = endpoint or local_config.get("google_apps_script_web_app_url")
        token = token or local_config.get("google_apps_script_token")

    endpoint = endpoint or DEFAULT_APPS_SCRIPT_WEB_APP_URL

    if not endpoint:
        raise RuntimeError(
            "Chybi GOOGLE_APPS_SCRIPT_WEB_APP_URL. Bez nej nemam kam poslat zapis do Google Docs."
        )

    payload = {
        "document_id": DOC_ID,
        "mode": "prepend",
        "content": section,
    }
    if token:
        payload["token"] = token

    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Google Apps Script vratil HTTP {exc.code}: {error_body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Nelze se pripojit k Google Apps Script endpointu: {exc}") from exc

    try:
        result = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Endpoint nevratil JSON odpoved: {body[:500]}") from exc

    if not result.get("ok"):
        raise RuntimeError(f"Endpoint nepotvrdil zapis: {json.dumps(result, ensure_ascii=False)}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Create local preview only.")
    parser.add_argument("--write", action="store_true", help="Write weekly report to Google Docs.")
    parser.add_argument("--test-write", action="store_true", help="Write a short test section to Google Docs.")
    parser.add_argument("--content-file", help="Markdown/text report file to write with --write.")
    args = parser.parse_args()

    selected = [args.dry_run, args.write, args.test_write]
    if sum(bool(item) for item in selected) != 1:
        parser.error("Choose exactly one of --dry-run, --write, or --test-write.")

    now = prague_now()

    if args.dry_run:
        PREVIEW_PATH.write_text(build_preview_report(now), encoding="utf-8")
        print(f"Dry-run preview written to {PREVIEW_PATH}")
        return 0

    if args.test_write:
        section = build_test_section(now)
        result = post_to_apps_script(section)
        print("Test section written to Google Docs.")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    if args.content_file:
        report = Path(args.content_file).read_text(encoding="utf-8")
    else:
        report = build_preview_report(now)
    result = post_to_apps_script(report)
    print("Weekly report written to Google Docs.")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
