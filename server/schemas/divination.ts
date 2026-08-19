import { z } from 'zod';

export const orientationSchema = z.enum(['upright', 'reversed']);

export const divinationRequestSchema = z
  .object({
    question: z.string().trim().min(1).max(120),
    cardId: z.string().regex(/^\d{2}$/),
    orientation: orientationSchema,
    includeMinor: z.boolean(),
    drawSeed: z.number().int().nonnegative(),
  })
  .strict();

const safeText = (max: number) => z.string().trim().min(1).max(max);

export const divinationReadingSchema = z
  .object({
    cardHeader: safeText(120),
    energyScore: z.number().int().min(0).max(100),
    petVision: safeText(600),
    situationAnalysis: safeText(1000),
    actionAdvice: safeText(800),
    comfortLine: safeText(300),
  })
  .strict();

export type DivinationRequest = z.infer<typeof divinationRequestSchema>;
export type DivinationReading = z.infer<typeof divinationReadingSchema>;

export const fallbackReasons = [
  'timeout',
  'rate_limited',
  'model_not_found',
  'provider_error',
  'invalid_response',
  'configuration_error',
] as const;

export type FallbackReason = (typeof fallbackReasons)[number];

export interface DivinationApiResponse {
  status: 'success' | 'fallback';
  source: 'ai' | 'local';
  result: DivinationReading;
  requestId: string;
  reason?: FallbackReason;
}
