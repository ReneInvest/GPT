# Agent Instructions

This repository supports an automated weekly report for CASPYAN / real estate / financial markets.

The agent must:

- Write in Czech.
- Produce a brief report that fits roughly on one A4 page.
- Use bold section headings and short non-bold bullet points.
- Do not include a source section, URL list, or Source Log in the final Google Docs output.
- Use sources internally to verify factual claims.
- Prefer primary sources for factual claims.
- Avoid investment advice phrased as buy/sell recommendations.
- Never commit credentials, API keys, Google service account JSON, or endpoint tokens.
- Fail clearly if Google Docs write access is not configured or cannot be verified.
- Write generated reports with `python weekly_report_agent.py --write --content-file /tmp/weekly-report.md`.
