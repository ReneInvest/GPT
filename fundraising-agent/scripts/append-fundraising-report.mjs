import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeConfig } from './lib/config.mjs';

async function readInput() {
  const fileArg = process.argv[2];
  if (fileArg) {
    return fs.readFileSync(path.resolve(process.cwd(), fileArg), 'utf8');
  }

  if (process.stdin.isTTY) {
    throw new Error('Pass a report file path or pipe report text into stdin.');
  }

  return await new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const config = readRuntimeConfig();
  const content = (await readInput()).trim();

  if (!content) {
    throw new Error('Report content is empty.');
  }

  const response = await fetch(config.googleAppsScriptWebAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: config.fundraisingAgentToken,
      content
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
    throw new Error(`Apps Script write failed: ${payload.error || response.statusText}`);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
