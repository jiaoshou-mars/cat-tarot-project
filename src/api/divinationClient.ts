import type { DivinationReading } from '../modules/reading';
import type { Orientation } from '../modules/deck';

export interface DivinationRequest {
  question: string;
  cardId: string;
  orientation: Orientation;
  includeMinor: boolean;
  drawSeed: number;
}

export type FallbackReason =
  | 'timeout'
  | 'rate_limited'
  | 'model_not_found'
  | 'provider_error'
  | 'invalid_response'
  | 'configuration_error';

export interface DivinationResponse {
  status: 'success' | 'fallback';
  source: 'ai' | 'local';
  result: DivinationReading;
  requestId: string;
  reason?: FallbackReason;
}

function isReading(value: unknown): value is DivinationReading {
  if (!value || typeof value !== 'object') return false;
  const reading = value as Record<string, unknown>;
  return (
    typeof reading.cardHeader === 'string' &&
    typeof reading.energyScore === 'number' &&
    typeof reading.petVision === 'string' &&
    typeof reading.situationAnalysis === 'string' &&
    typeof reading.actionAdvice === 'string' &&
    typeof reading.comfortLine === 'string'
  );
}

function isResponse(value: unknown): value is DivinationResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return (
    (response.status === 'success' || response.status === 'fallback') &&
    (response.source === 'ai' || response.source === 'local') &&
    typeof response.requestId === 'string' &&
    isReading(response.result)
  );
}

export async function requestDivination(
  input: DivinationRequest,
  signal?: AbortSignal,
): Promise<DivinationResponse> {
  const response = await fetch('api/divination', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) throw new Error('divination_request_failed');

  const payload: unknown = await response.json();
  if (!isResponse(payload)) throw new Error('invalid_divination_response');
  return payload;
}
