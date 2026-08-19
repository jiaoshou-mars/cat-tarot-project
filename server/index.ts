import { randomUUID } from 'node:crypto';
import express from 'express';
import { tarotCards } from '../src/modules/deck';
import { generateLocalReading } from '../src/modules/reading';
import { loadAiConfig } from './config';
import { divinationRequestSchema } from './schemas/divination';
import { createDivination } from './services/divination';

const app = express();
const port = Number(process.env.CAT_TAROT_API_PORT || 8787);
const maxConcurrent = Number(process.env.CAT_TAROT_MAX_CONCURRENT || 3);
const rateWindowMs = 60_000;
const maxRequestsPerWindow = Number(process.env.CAT_TAROT_RATE_LIMIT || 12);

let activeRequests = 0;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb', strict: true }));

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const existing = requestBuckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + rateWindowMs });
    return false;
  }

  existing.count += 1;
  return existing.count > maxRequestsPerWindow;
}

app.get('/api/health', async (_request, response) => {
  const configResult = await loadAiConfig();
  response.json({
    status: 'ok',
    provider: configResult.ok ? configResult.config.provider : 'deepseek',
    model: configResult.ok ? configResult.config.model : null,
    configured: configResult.ok,
    configStatus: configResult.ok ? 'ready' : configResult.reason,
  });
});

app.post('/api/divination', async (request, response) => {
  const parsed = divinationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      status: 'error',
      code: 'invalid_request',
      message: '请求内容不完整，请检查问题和牌面信息。',
    });
    return;
  }

  const card = tarotCards.find((candidate) => candidate.id === parsed.data.cardId);
  if (!card) {
    response.status(400).json({ status: 'error', code: 'invalid_card', message: '没有找到这张牌。' });
    return;
  }

  const ip = request.ip || request.socket.remoteAddress || 'local';
  if (isRateLimited(ip) || activeRequests >= maxConcurrent) {
    response.json({
      status: 'fallback',
      source: 'local',
      reason: 'rate_limited',
      requestId: randomUUID(),
      result: generateLocalReading({
        question: parsed.data.question,
        card,
        orientation: parsed.data.orientation,
        seed: parsed.data.drawSeed,
      }),
    });
    return;
  }

  activeRequests += 1;
  try {
    const result = await createDivination(parsed.data);
    response.json(result);
  } catch {
    response.status(500).json({
      status: 'error',
      code: 'internal_error',
      message: '猫咪暂时没有整理好牌面，请稍后再试。',
    });
  } finally {
    activeRequests -= 1;
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ status: 'error', code: 'invalid_json', message: '请求格式不正确。' });
    return;
  }

  response.status(500).json({ status: 'error', code: 'internal_error', message: '服务暂时不可用。' });
});

app.listen(port, '127.0.0.1', () => {
  console.info(`[api] cat tarot server listening on http://127.0.0.1:${port}`);
});
