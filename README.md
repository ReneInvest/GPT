# CASPYAN Weekly Report Agent

This repository contains the automation background for the weekly CASPYAN / real estate / financial markets report.

## Manual test

Create a local preview:

```bash
python weekly_report_agent.py --dry-run
```

Write a short Google Docs test section:

```bash
python weekly_report_agent.py --test-write
```

Write a generated report file:

```bash
python weekly_report_agent.py --write --content-file /tmp/weekly-report.md
```

The script writes through the Google Apps Script Web App endpoint configured in the script, `GOOGLE_APPS_SCRIPT_WEB_APP_URL`, or `config.local.json`.

## Google Docs setup

Recommended setup with Google Apps Script:

1. Open https://script.google.com/ and create a new project.
2. Copy `google_apps_script/Code.gs` into `Code.gs`.
3. Copy `google_apps_script/appsscript.json` into the Apps Script manifest.
4. Optional but recommended: add a script property named `WEBHOOK_TOKEN`.
5. Click Deploy -> New deployment -> Web app.
6. Set "Execute as" to "Me".
7. Set access to "Anyone with the link" if using `WEBHOOK_TOKEN`, or restrict it according to your Google Workspace policy.
8. Authorize the requested Google Docs access.
9. Store the deployed Web App URL as `GOOGLE_APPS_SCRIPT_WEB_APP_URL` in the Codex automation environment if you do not want to use the default endpoint in the script.
10. If `WEBHOOK_TOKEN` is set, store the same value as `GOOGLE_APPS_SCRIPT_TOKEN`.

Do not commit secrets or credentials to this repository.

Target document:

https://docs.google.com/document/d/1Kw8TqFBuDzPknCsW5tRKQRjcTD5JWRchPyC3nE-P5AU/edit
