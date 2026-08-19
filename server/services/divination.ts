import { randomUUID } from 'node:crypto';
import { tarotCards } from '../../src/modules/deck';
import { buildPrompt } from '../../src/modules/promptBuilder';
import { generateLocalReading } from '../../src/modules/reading';
import { loadAiConfig } from '../config';
import { requestDeepSeekReading } from '../providers/deepseek';
import type { DivinationApiResponse, DivinationRequest, FallbackReason } from '../schemas/divination';

function createFallback(
  input: DivinationRequest,
  reason: FallbackReason,
  requestId: string,
): DivinationApiResponse {
  const card = tarotCards.find((candidate) => candidate.id === input.cardId);
  if (!card) throw new Error('Validated card was not found');

  return {
    status: 'fallback',
    source: 'local',
    reason,
    requestId,
    result: generateLocalReading({
      question: input.question,
      card,
      orientation: input.orientation,
      seed: input.drawSeed,
    }),
  };
}

export async function createDivination(input: DivinationRequest): Promise<DivinationApiResponse> {
  const requestId = randomUUID();
  const startedAt = performance.now();
  const card = tarotCards.find((candidate) => candidate.id === input.cardId);

  if (!card) throw new Error('Validated card was not found');

  const configResult = await loadAiConfig();
  if (!configResult.ok) {
    console.warn(`[divination] request=${requestId} status=fallback reason=configuration_error`);
    return createFallback(input, 'configuration_error', requestId);
  }

  const prompt = buildPrompt({ question: input.question, card, orientation: input.orientation });
  const providerResult = await requestDeepSeekReading(configResult.config, prompt);
  const elapsedMs = Math.round(performance.now() - startedAt);

  if (!providerResult.ok) {
    console.warn(
      `[divination] request=${requestId} status=fallback reason=${providerResult.reason} model=${configResult.config.model} elapsed_ms=${elapsedMs}`,
    );
    return createFallback(input, providerResult.reason, requestId);
  }

  const expectedHeader = `${card.displayName} · ${input.orientation === 'upright' ? '正位' : '逆位'}`;
  const safeResult = {
    ...providerResult.result,
    cardHeader: expectedHeader,
  };

  const totalTokens = providerResult.usage?.total_tokens;
  console.info(
    `[divination] request=${requestId} status=success model=${configResult.config.model} elapsed_ms=${elapsedMs}${typeof totalTokens === 'number' ? ` total_tokens=${totalTokens}` : ''}`,
  );

  return {
    status: 'success',
    source: 'ai',
    result: safeResult,
    requestId,
  };
}
