import { majorCards, tarotCards, type Orientation, type TarotCard } from './deck';

export interface DrawInput {
  question: string;
  includeMinor: boolean;
  date?: Date;
}

export interface DrawResult {
  card: TarotCard;
  orientation: Orientation;
  seed: number;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seededRandom(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function drawCard({ question, includeMinor, date = new Date() }: DrawInput): DrawResult {
  const pool = includeMinor ? tarotCards : majorCards;
  const normalizedQuestion = question.trim() || '今日猫咪塔罗';
  const seed = hashString(`${normalizedQuestion}|${formatDate(date)}|${includeMinor ? 'all' : 'major'}`);
  const random = seededRandom(seed);
  const card = pool[Math.floor(random() * pool.length)];
  const orientation: Orientation = random() > 0.5 ? 'upright' : 'reversed';

  return { card, orientation, seed };
}
