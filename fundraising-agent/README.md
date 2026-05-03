# FUNDRAISING_AGENT setup

Tento adresar obsahuje zapisovaci vrstvu a nezavisly GitHub Actions beh pro automatizaci `FUNDRAISING_AGENT`.

## Apps Script

1. Otevri [script.google.com](https://script.google.com/) a vytvor novy projekt.
2. Obsah souboru `apps-script/fundraising-agent/Code.gs` vloz do souboru `Code.gs`.
3. V nastaveni projektu zapni zobrazeni souboru manifestu a obsah `apps-script/fundraising-agent/appsscript.json` vloz do `appsscript.json`.
4. V `Project Settings` nastav Script property:
   - `FUNDRAISING_AGENT_TOKEN`
   - hodnota: dlouhy nahodny token, stejny pak vlozis do `config.local.json` nebo GitHub Actions secret.
5. Deploy -> New deployment -> Web app:
   - Execute as: Me
   - Who has access: Anyone
6. Zkopiruj Web app URL koncici `/exec`.

## Lokalni konfigurace

Zkopiruj `config.example.json` na `config.local.json` a dopln:

```json
{
  "googleAppsScriptWebAppUrl": "https://script.google.com/macros/s/.../exec",
  "fundraisingAgentToken": "stejny-token-jako-ve-script-property",
  "openaiApiKey": "sk-..."
}
```

`config.local.json` je ignorovany Gitem, protoze obsahuje soukrome hodnoty.

## Test cteni historie

Po doplneni `config.local.json` over, ze endpoint umi precist existujici dokument:

```bash
node scripts/get-fundraising-history.mjs
```

Vystup se pouzije jako historie minulych leadu, aby automatizace neopakovala stejna jmena.

## Test zapisu

Vytvor kratky testovaci soubor, napr. `test-report.md`, a spust:

```bash
node scripts/append-fundraising-report.mjs test-report.md
```

Uspech znamena, ze odpoved obsahuje `"ok": true` a text se pridal do Google dokumentu:
https://docs.google.com/document/d/1eW9_WvxoMLeDgUXe8nsQIQlxMLBXgnhe73539ivZNJM/edit

## GitHub Actions

Nezavisly externi beh je v `.github/workflows/fundraising-agent.yml`.

Workflow bezi kazdou nedeli kolem 12:00 Europe/Prague. Protoze GitHub planuje v UTC a Praha meni letni/zimni cas, workflow ma dva UTC casy a skript sam overi, ze v Praze je prave nedele 12:00. Rucni spusteni pres `workflow_dispatch` tento casovy guard preskoci.

V GitHub repozitari nastav Actions secrets:

- `GOOGLE_APPS_SCRIPT_WEB_APP_URL`
- `FUNDRAISING_AGENT_TOKEN`
- `OPENAI_API_KEY`

Volitelne Actions variables:

- `OPENAI_MODEL`, vychozi hodnota `gpt-5`
- `OPENAI_REASONING_EFFORT`, vychozi hodnota `medium`

Rucni lokalni beh:

```bash
BYPASS_SCHEDULE_GUARD=1 npm run fundraising:run
```

Skript nacte historii z Google Docs, pres OpenAI Responses API s `web_search` vygeneruje report, zkontroluje duplicitu datumu a blacklist, zapise vysledek do Google Docs a uspesny beh uzna jen pri `"ok": true`.

## Codex worktree fallback

Codex automatizace muze zustat jako zalozni varianta v rezimu `worktree`. Primarni nezavisly beh je ale GitHub Actions.
