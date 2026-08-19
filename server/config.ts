import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_MODEL = 'deepseek-v4-flash';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export interface AiConfig {
  provider: 'deepseek';
  apiKey: string;
  model: string;
  baseUrl: string;
  configPath: string;
}

export type AiConfigResult =
  | { ok: true; config: AiConfig }
  | { ok: false; reason: 'file_missing' | 'file_unreadable' | 'missing_field' | 'unsupported_provider'; detail?: string };

function normalizeLine(line: string): string {
  return line.replace(/：/g, ':').trim();
}

export function resolveConfigPath(): string {
  const configured = process.env.CAT_TAROT_CONFIG_PATH;
  if (configured && configured.trim()) return path.resolve(configured.trim());
  return 'D:\\AI Projects\\cat tarot\\API key.txt';
}

export function parseConfigText(text: string): { provider?: string; apiKey?: string; model?: string } {
  const parsed: { provider?: string; apiKey?: string; model?: string } = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = normalizeLine(rawLine);
    if (!line) continue;

    const [rawKey, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const key = rawKey.toLowerCase().replace(/\s+/g, ' ').trim();

    if (key === 'model type' || key === 'modeltype' || key === 'provider') parsed.provider = value;
    else if (key === 'api key' || key === 'apikey' || key === 'key') parsed.apiKey = value;
    else if (key === 'model' || key === 'model name') parsed.model = value;
  }

  return parsed;
}

export async function loadAiConfig(): Promise<AiConfigResult> {
  const configPath = resolveConfigPath();

  let text: string;
  try {
    text = await readFile(configPath, 'utf8');
  } catch {
    return { ok: false, reason: 'file_missing' };
  }

  const parsed = parseConfigText(text);

  if (!parsed.apiKey || !parsed.provider) {
    return { ok: false, reason: 'missing_field' };
  }

  if (parsed.provider.toLowerCase() !== 'deepseek') {
    return { ok: false, reason: 'unsupported_provider' };
  }

  return {
    ok: true,
    config: {
      provider: 'deepseek',
      apiKey: parsed.apiKey,
      model: parsed.model || DEFAULT_MODEL,
      baseUrl: (process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, ''),
      configPath,
    },
  };
}
