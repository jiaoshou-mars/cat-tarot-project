import rawCards from '../data/tarot_meanings_modern_fixed.json';

export type Arcana = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export type Orientation = 'upright' | 'reversed';

export interface TarotCard {
  id: string;
  index: number;
  number: number | null;
  arcana: Arcana;
  suit?: Suit;
  nameCn: string;
  nameEn: string;
  displayName: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  image: string;
}

interface RawCard {
  number: number | null;
  name_en: string;
  name_cn: string;
  upright_keywords: string;
  reversed_keywords: string;
  upright_interpretation: string;
  reversed_interpretation: string;
  image_path: string;
}

const cardEntries = Object.entries(rawCards as Record<string, RawCard>);

function splitKeywords(value: string): string[] {
  return value.split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
}

function getSuit(index: number): Suit | undefined {
  if (index >= 22 && index <= 35) return 'wands';
  if (index >= 36 && index <= 49) return 'cups';
  if (index >= 50 && index <= 63) return 'swords';
  if (index >= 64 && index <= 77) return 'pentacles';
  return undefined;
}

function toImagePath(imagePath: string): string {
  const assetBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${assetBase}assets/cat-tarot/${imagePath.replace('cards/', 'cards_optimized/')}`;
}

export const tarotCards: TarotCard[] = cardEntries.map(([id, card]) => {
  const index = Number(id);
  const nameCn = card.name_cn?.trim() || card.name_en;

  return {
    id: id.padStart(2, '0'),
    index,
    number: card.number,
    arcana: index <= 21 ? 'major' : 'minor',
    suit: getSuit(index),
    nameCn,
    nameEn: card.name_en,
    displayName: `${nameCn}（${card.name_en}）`,
    uprightKeywords: splitKeywords(card.upright_keywords),
    reversedKeywords: splitKeywords(card.reversed_keywords),
    uprightMeaning: card.upright_interpretation,
    reversedMeaning: card.reversed_interpretation,
    image: toImagePath(card.image_path),
  };
});

export const majorCards = tarotCards.filter((card) => card.arcana === 'major');
export const minorCards = tarotCards.filter((card) => card.arcana === 'minor');

export const suitLabels: Record<Suit, string> = {
  wands: '权杖',
  cups: '圣杯',
  swords: '宝剑',
  pentacles: '星币',
};

export function getCardsBySuit(suit: Suit): TarotCard[] {
  return tarotCards.filter((card) => card.suit === suit);
}

export function getCardKeywords(card: TarotCard, orientation: Orientation): string[] {
  return orientation === 'upright' ? card.uprightKeywords : card.reversedKeywords;
}

export function getCardMeaning(card: TarotCard, orientation: Orientation): string {
  return orientation === 'upright' ? card.uprightMeaning : card.reversedMeaning;
}
