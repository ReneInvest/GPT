import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const configPath = path.join(rootDir, 'config.local.json');

export function readRuntimeConfig(options = {}) {
  const localConfig = readLocalConfig();
  const config = {
    googleAppsScriptWebAppUrl:
      process.env.GOOGLE_APPS_SCRIPT_WEB_APP_URL ||
      localConfig.googleAppsScriptWebAppUrl,
    fundraisingAgentToken:
      process.env.FUNDRAISING_AGENT_TOKEN ||
      localConfig.fundraisingAgentToken,
    openaiApiKey:
      process.env.OPENAI_API_KEY ||
      localConfig.openaiApiKey,
    openaiModel:
      process.env.OPENAI_MODEL ||
      localConfig.openaiModel ||
      'gpt-5',
    openaiReasoningEffort:
      process.env.OPENAI_REASONING_EFFORT ||
      localConfig.openaiReasoningEffort ||
      'medium'
  };

  requireValue(config.googleAppsScriptWebAppUrl, 'GOOGLE_APPS_SCRIPT_WEB_APP_URL or config.googleAppsScriptWebAppUrl');
  requireValue(config.fundraisingAgentToken, 'FUNDRAISING_AGENT_TOKEN or config.fundraisingAgentToken');

  if (options.requireOpenAI) {
    requireValue(config.openaiApiKey, 'OPENAI_API_KEY or config.openaiApiKey');
  }

  return config;
}

function readLocalConfig() {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function requireValue(value, name) {
  if (!value) {
    throw new Error(`Missing required configuration: ${name}.`);
  }
}
