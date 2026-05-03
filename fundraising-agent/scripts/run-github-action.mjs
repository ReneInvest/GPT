import fs from 'node:fs';
import { readRuntimeConfig } from './lib/config.mjs';

const PRAGUE_TIMEZONE = 'Europe/Prague';
const HISTORY_PATH = process.env.FUNDRAISING_HISTORY_PATH || '/tmp/fundraising-history.txt';
const REPORT_PATH = process.env.FUNDRAISING_REPORT_PATH || '/tmp/fundraising-report.md';

const BLACKLIST = [
  '4fin', 'RUBIKONFIN', 'eDO finance', 'OK KLIENT', 'In Investments',
  'Broker Trust', 'Swiss Life Select', 'SAB servis', 'SMS finance',
  'KZ FINANCE', 'Partners', 'Broker Consulting', 'MONECO', 'ZFP akademie',
  'AMISTA', 'BP BrokerPool', 'Czech Investment Services', 'Holver',
  'Astra Ponte', 'JPL Servis', 'VT Consulting', 'Argyle', 'AXELOR',
  'Freedom FS', 'BePlan', 'K a partneři', 'Chytrý Honza', 'Long Capital',
  'AMUNDI', 'OVB', 'Kapitol', 'Fingo', 'Prosperity Financial Services',
  'SIRIUS FINANCE', 'Alternative Investment Advisory', 'Finvox', 'I-ČM',
  'Moder Wealth Management', 'Kunz & Partneři', 'Sirius IS', 'SPM Invest',
  'EMUN', 'J&T', 'Investhy', 'NWD IS', 'Cornerstone', 'TBGF', 'CONSEQ',
  'Residento', 'CYRRUS'
];

async function main() {
  if (!shouldRunNow()) {
    console.log('Skipping: current Prague time is outside the Sunday 12:00 run window.');
    return;
  }

  const config = readRuntimeConfig({ requireOpenAI: true });
  const history = await readHistory(config);
  fs.writeFileSync(HISTORY_PATH, history, 'utf8');

  const today = formatPragueDate(new Date());
  if (history.includes(`Fundraising / Distributor Intelligence report – ${today}`) ||
      history.includes(`Fundraising / Distributor Intelligence report - ${today}`)) {
    console.log(`Skipping: report for ${today} already exists in Google Docs.`);
    return;
  }

  const report = cleanupReport(await generateReport(config, history, today));
  validateReport(report, today);
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  const writeResult = await appendReport(config, report);
  console.log(JSON.stringify({
    ok: true,
    reportPath: REPORT_PATH,
    appendedCharacters: writeResult.appendedCharacters,
    appendedAt: writeResult.appendedAt
  }, null, 2));
}

function shouldRunNow() {
  if (process.env.BYPASS_SCHEDULE_GUARD === '1') {
    return true;
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: PRAGUE_TIMEZONE,
      weekday: 'short',
      hour: '2-digit',
      hour12: false
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  );

  return parts.weekday === 'Sun' && Number(parts.hour) === 12;
}

function formatPragueDate(date) {
  return new Intl.DateTimeFormat('cs-CZ', {
    timeZone: PRAGUE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

async function readHistory(config) {
  const payload = await callAppsScript(config, {
    action: 'history',
    token: config.fundraisingAgentToken,
    maxChars: 50000
  });

  return payload.text || '';
}

async function appendReport(config, content) {
  return callAppsScript(config, {
    token: config.fundraisingAgentToken,
    content
  });
}

async function callAppsScript(config, body) {
  const response = await fetch(config.googleAppsScriptWebAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const payload = parseJson(text, 'Apps Script');

  if (!response.ok || !payload.ok) {
    throw new Error(`Apps Script request failed: ${payload.error || response.statusText}`);
  }

  return payload;
}

async function generateReport(config, history, today) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openaiModel,
      reasoning: { effort: config.openaiReasoningEffort },
      tools: [{
        type: 'web_search',
        user_location: {
          type: 'approximate',
          country: 'CZ',
          city: 'Prague',
          region: 'Prague',
          timezone: PRAGUE_TIMEZONE
        }
      }],
      tool_choice: 'auto',
      input: buildPrompt(history, today)
    })
  });

  const text = await response.text();
  const payload = parseJson(text, 'OpenAI');

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${payload.error?.message || response.statusText}`);
  }

  const output = extractOutputText(payload).trim();
  if (!output) {
    throw new Error('OpenAI returned an empty report.');
  }

  return output;
}

function buildPrompt(history, today) {
  return `
Jsi senior fundraising a business development specialista s 20 lety zkušeností v oblasti FKI, wealth managementu, investičního zprostředkování, family office kapitálu a alternativních investic.

Dnes je ${today}. Vytvoř stručný týdenní fundraisingový report pro CASPYAN FUND.

CASPYAN je butikový real estate fond zaměřený na developerské projekty v Praze. Fond je určený pro kvalifikované investory. Cílem je najít nové relevantní potenciální leady pro distribuci nebo investici do fondu.

Hledej pouze:
- samostatné investiční zprostředkovatele,
- menší a střední wealth management firmy,
- multi-family office / family office,
- fondy fondů,
- investiční platformy pro kvalifikované investory,
- menší investiční skupiny,
- samostatné investory, podnikatele nebo privátní investiční osoby,
- relevantní osoby s rozhodovací pravomocí.

Striktně vynech:
- vázané zástupce, zaměstnance a pobočky blacklistovaných společností,
- banky,
- pojišťovny,
- velké komerční instituce bez reálné šance zařadit butikový fond,
- čistě retailové poradce bez rozhodovací pravomoci,
- osoby bez jasné vazby na investice, kapitál, wealth management, real estate, FKI, development nebo kvalifikované investory,
- běžné SICAV/FKI fondy, real estate fondy, developerské fondy a správce vlastních FKI produktů, protože jsou ve většině případů konkurence CASPYAN, ne investor ani distribuční partner.

Výjimka pro SICAV/FKI fondy:
SICAV/FKI subjekt zařaď pouze tehdy, pokud najdeš výslovnou a konkrétní zmínku, že investuje do externích FKI, funguje jako fond fondů, investiční platforma, family office, alokátor kapitálu nebo distribuuje produkty třetích stran. Nestačí, že subjekt sám je FKI, SICAV, nemovitostní fond nebo správce vlastního fondu.

Nikdy znovu neuváděj tyto společnosti ani jejich vázané zástupce, zaměstnance či osoby, které pod ně zjevně spadají:
${BLACKLIST.join(', ')}.

Historie minulých reportů pro kontrolu duplicit:
"""${history.slice(-50000)}"""

Před zařazením leadu zkontroluj, zda se subjekt nebo osoba už nevyskytuje v historii. Pokud ano, vynech ho.

Postup:
- Prohledej veřejné zdroje, weby firem, registry ČNB, oborové články, investiční platformy a veřejně dostupné profily.
- Ověř, že lead není na blacklistu a není jen další SICAV/FKI fond nebo správce vlastního fondu bez jasné role investora, fondu fondů, platformy nebo distributora externích fondů.
- Vyber pouze 3 nejsilnější leady.
- Pokud nenajdeš 3 kvalitní nové leady, uveď méně leadů.

Formát výstupu musí být přesně:
**Fundraising / Distributor Intelligence report – ${today}**

**Název společnosti / investora / osoby**
**Typ:** samostatný IZ / wealth management / family office / fond fondů / investiční skupina / samostatný investor.
**Relevance:** velmi stručně proč by mohl být zajímavý pro CASPYAN.
**Klientela / kapitál:** zda má vazbu na kvalifikované investory, HNWI, podnikatele, privátní kapitál nebo vlastní investiční kapitál.
**Úhel oslovení:** jedna věta, jak ho oslovit nebo čím může být fond zajímavý.
**Riziko:** jedna stručná slabina nebo věc k ověření.
**Další krok:** konkrétní akce.

Formátování je povinné:
- hlavní nadpis reportu musí být tučně,
- názvy leadů musí být tučně,
- štítky Typ, Relevance, Klientela / kapitál, Úhel oslovení, Riziko a Další krok musí být tučně,
- ostatní text nech běžným písmem,
- nepoužívej tabulky.

Do finálního výstupu nepiš zdroje, URL, citace, skóre, závěr, obecný komentář ani dlouhé odstavce. Piš česky, profesionálně, stručně a obchodně. Nepoužívej emoji.
`.trim();
}

function extractOutputText(payload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('\n');
}

function cleanupReport(report) {
  return report
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateReport(report, today) {
  if (!report.includes(`Fundraising / Distributor Intelligence report – ${today}`)) {
    throw new Error(`Generated report does not include the required date heading for ${today}.`);
  }

  const lowerReport = report.toLocaleLowerCase('cs-CZ');
  const forbiddenMatch = BLACKLIST.find((name) => lowerReport.includes(name.toLocaleLowerCase('cs-CZ')));
  if (forbiddenMatch) {
    throw new Error(`Generated report contains blacklisted name: ${forbiddenMatch}`);
  }

  if (/https?:\/\//i.test(report)) {
    throw new Error('Generated report contains a URL, which is not allowed in the final Google Docs output.');
  }
}

function parseJson(text, serviceName) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${serviceName} returned non-JSON response: ${text.slice(0, 300)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
