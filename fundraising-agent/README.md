# FUNDRAISING_AGENT setup

Tento adresar obsahuje zapisovaci vrstvu pro automatizaci `FUNDRAISING_AGENT`.

## Apps Script

1. Otevri [script.google.com](https://script.google.com/) a vytvor novy projekt.
2. Obsah souboru `apps-script/fundraising-agent/Code.gs` vloz do souboru `Code.gs`.
3. V nastaveni projektu zapni zobrazeni souboru manifestu a obsah `apps-script/fundraising-agent/appsscript.json` vloz do `appsscript.json`.
4. V `Project Settings` nastav Script property:
   - `FUNDRAISING_AGENT_TOKEN`
   - hodnota: dlouhy nahodny token, stejny pak vlozis do `config.local.json`.
5. Deploy -> New deployment -> Web app:
   - Execute as: Me
   - Who has access: Anyone
6. Zkopiruj Web app URL koncici `/exec`.

## Lokalni konfigurace

Zkopiruj `config.example.json` na `config.local.json` a dopln:

```json
{
  "googleAppsScriptWebAppUrl": "https://script.google.com/macros/s/.../exec",
  "fundraisingAgentToken": "stejny-token-jako-ve-script-property"
}
```

`config.local.json` je ignorovany Gitem, protoze obsahuje soukromy token.

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

## Automatizace ve worktree

Codex automatizace ma bezet v rezimu `worktree`, aby nebyla zavisla na zapnutem pocitaci. Ve worktree behu se soukrome hodnoty predaji jako environment promenne primo v prikazu:

```bash
GOOGLE_APPS_SCRIPT_WEB_APP_URL="..." FUNDRAISING_AGENT_TOKEN="..." node fundraising-agent/scripts/get-fundraising-history.mjs > /tmp/fundraising-history.txt
GOOGLE_APPS_SCRIPT_WEB_APP_URL="..." FUNDRAISING_AGENT_TOKEN="..." node fundraising-agent/scripts/append-fundraising-report.mjs /tmp/fundraising-report.md
```

Skript nacte historii, Codex vytvori report podle zadani, zapise ho do Google Docs a uspesny beh se uzna jen pri `"ok": true`.
