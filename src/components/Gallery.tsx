import { useMemo, useState } from 'react';
import { getCardsBySuit, majorCards, suitLabels, tarotCards, type Suit, type TarotCard } from '../modules/deck';
import { CardDetailModal } from './CardDetailModal';

const galleryAssetBase = `${(import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}assets/cat-tarot/`;

type GalleryFilter = 'all' | 'major' | Suit | 'extra';

const filters: Array<{ id: GalleryFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'major', label: '大阿卡纳' },
  { id: 'wands', label: '权杖' },
  { id: 'cups', label: '圣杯' },
  { id: 'swords', label: '宝剑' },
  { id: 'pentacles', label: '星币' },
  { id: 'extra', label: '艺术卡' },
];

interface ExtraCard {
  id: string;
  title: string;
  image: string;
}

const extraCards: ExtraCard[] = Array.from({ length: 5 }, (_, index) => ({
  id: `extra-${index}`,
  title: `猫咪灵感卡 ${index + 1}`,
  image: `${galleryAssetBase}gallery-extra/Extra_${String(index).padStart(2, '0')}_optimized.jpg`,
}));

function ExtraCardModal({ card, onClose }: { card: ExtraCard; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card extra-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <img src={card.image} alt={card.title} />
        <div className="extra-modal-caption">
          <h2>{card.title}</h2>
          <p>适合收藏和冥想的猫咪画面</p>
        </div>
      </div>
    </div>
  );
}

export function Gallery() {
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [selectedCard, setSelectedCard] = useState<TarotCard | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<ExtraCard | null>(null);

  const cards = useMemo(() => {
    if (filter === 'all') return tarotCards;
    if (filter === 'major') return majorCards;
    if (filter === 'extra') return [];
    return getCardsBySuit(filter);
  }, [filter]);

  const showExtra = filter === 'all' || filter === 'extra';

  return (
    <main className="gallery-page">
      <section className="page-heading">
        <p className="eyebrow">图鉴</p>
        <h1>猫咪塔罗图鉴</h1>
        <p className="muted">在这里查看每张猫咪塔罗的名字、牌义与关键词。抽到某张牌后，也可以回来慢慢读懂它想提醒你的事。</p>
      </section>

      <div className="filter-bar" role="tablist" aria-label="图鉴筛选">
        {filters.map((item) => (
          <button key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="gallery-grid">
        {cards.map((card) => (
          <button className="gallery-card" key={card.id} onClick={() => setSelectedCard(card)}>
            <img src={card.image} alt={card.displayName} loading="lazy" />
            <div>
              <strong>{card.nameCn}</strong>
              <span>{card.arcana === 'major' ? '大阿卡纳' : card.suit ? suitLabels[card.suit] : '小阿卡纳'}</span>
            </div>
          </button>
        ))}
        {showExtra
          ? extraCards.map((card) => (
              <button className="gallery-card" key={card.id} onClick={() => setSelectedExtra(card)}>
                <img src={card.image} alt={card.title} loading="lazy" />
                <div>
                  <strong>{card.title}</strong>
                  <span>适合收藏和冥想的猫咪画面</span>
                </div>
              </button>
            ))
          : null}
      </section>

      {selectedCard ? <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} /> : null}
      {selectedExtra ? <ExtraCardModal card={selectedExtra} onClose={() => setSelectedExtra(null)} /> : null}
    </main>
  );
}
