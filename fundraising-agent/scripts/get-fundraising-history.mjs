import { readRuntimeConfig } from './lib/config.mjs';

async function main() {
  const config = readRuntimeConfig();
  const response = await fetch(config.googleAppsScriptWebAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'history',
      token: config.fundraisingAgentToken,
      maxChars: process.argv[2] || '50000'
    })
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script returned non-JSON response: ${text.slice(0, 300)}`);
  }

  if (!response.ok || !payload.ok) {
    throw new Error(`Apps Script read failed: ${payload.error || response.statusText}`);
  }

  process.stdout.write(payload.text || '');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
