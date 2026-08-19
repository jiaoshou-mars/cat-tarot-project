import type { AiConfig } from '../config';
import { divinationReadingSchema, type DivinationReading, type FallbackReason } from '../schemas/divination';

interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: DeepSeekUsage;
}

export interface ProviderSuccess {
  ok: true;
  result: DivinationReading;
  usage?: DeepSeekUsage;
}

export interface ProviderFailure {
  ok: false;
  reason: FallbackReason;
  providerStatus?: number;
}

export type ProviderResult = ProviderSuccess | ProviderFailure;

function stripCodeFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function mapProviderError(status: number, body: string): FallbackReason {
  if (status === 429) return 'rate_limited';
  if (status === 404 || /model[^\n]*(not found|does not exist|invalid)/i.test(body)) return 'model_not_found';
  return 'provider_error';
}

export async function requestDeepSeekReading(
  config: AiConfig,
  prompt: string,
  timeoutMs = 15_000,
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content:
              '你是猫咪塔罗解读服务。严格遵守用户提供的指定牌面和方向，只输出合法 JSON，不输出 Markdown。',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        stream: false,
        temperature: 0.7,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        reason: mapProviderError(response.status, rawBody.slice(0, 1000)),
        providerStatus: response.status,
      };
    }

    let payload: DeepSeekResponse;
    try {
      payload = JSON.parse(rawBody) as DeepSeekResponse;
    } catch {
      return { ok: false, reason: 'invalid_response', providerStatus: response.status };
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: 'invalid_response', providerStatus: response.status };

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(content));
    } catch {
      console.warn(`[divination] provider=json_parse_failed content_length=${content.length}`);
      return { ok: false, reason: 'invalid_response', providerStatus: response.status };
    }

    const validated = divinationReadingSchema.safeParse(parsed);
    if (!validated.success) {
      const issues = validated.error.issues.map((issue) => `${issue.path.join('.')}:${issue.code}`).join(',');
      console.warn(`[divination] provider=schema_failed issues=${issues}`);
      return { ok: false, reason: 'invalid_response', providerStatus: response.status };
    }

    return { ok: true, result: validated.data, usage: payload.usage };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'provider_error' };
  } finally {
    clearTimeout(timer);
  }
}
