import { getCardKeywords, getCardMeaning, type Orientation, type TarotCard } from './deck';
import { getOrientationLabel } from './promptBuilder';

export interface LocalReadingInput {
  question: string;
  card: TarotCard;
  orientation: Orientation;
  seed: number;
}

export interface DivinationReading {
  cardHeader: string;
  energyScore: number;
  petVision: string;
  situationAnalysis: string;
  actionAdvice: string;
  comfortLine: string;
}

export type LocalReadingResult = DivinationReading;

function clampEnergy(seed: number): number {
  return 62 + (seed % 34);
}

export function generateLocalReading(input: LocalReadingInput): LocalReadingResult {
  const { question, card, orientation, seed } = input;
  const orientationLabel = getOrientationLabel(orientation);
  const keywords = getCardKeywords(card, orientation);
  const meaning = getCardMeaning(card, orientation);
  const firstKeyword = keywords[0] ?? '直觉';
  const secondKeyword = keywords[1] ?? '变化';
  const shortMeaning = meaning.length > 150 ? `${meaning.slice(0, 150)}……` : meaning;

  return {
    cardHeader: `${card.displayName} · ${orientationLabel}`,
    energyScore: clampEnergy(seed),
    petVision: `喵呜，猫咪把爪子轻轻按在「${firstKeyword}」这条线索上。这个问题现在最需要的不是立刻下结论，而是先看清你真正牵挂的部分。`,
    situationAnalysis: `围绕「${question}」，这张牌提示的核心是「${keywords.slice(0, 3).join(' / ')}」。${shortMeaning}`,
    actionAdvice: `接下来可以先做一个小动作：把问题拆成今天能推进的一步，并用「${secondKeyword}」提醒自己保持节奏。猫咪建议你先照顾好当下，再慢慢靠近更大的答案。`,
    comfortLine: '本测算只是猫咪视角的灵感提醒，不替你决定命运；真正有力量的选择，还是会回到你手里。',
  };
}
