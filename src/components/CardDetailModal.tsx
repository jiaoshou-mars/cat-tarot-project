import { getCardKeywords, getCardMeaning, type Orientation, type TarotCard } from '../modules/deck';

interface CardDetailModalProps {
  card: TarotCard;
  onClose: () => void;
}

function MeaningBlock({ card, orientation }: { card: TarotCard; orientation: Orientation }) {
  const title = orientation === 'upright' ? '正位' : '逆位';
  return (
    <article className="meaning-block">
      <h3>{title}</h3>
      <div className="keyword-row compact">
        {getCardKeywords(card, orientation).slice(0, 8).map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>
      <p>{getCardMeaning(card, orientation)}</p>
    </article>
  );
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className="modal-grid">
          <img src={card.image} alt={card.displayName} />
          <div>
            <p className="eyebrow">{card.arcana === 'major' ? '大阿卡纳' : '小阿卡纳'}</p>
            <h2>{card.displayName}</h2>
            <MeaningBlock card={card} orientation="upright" />
            <MeaningBlock card={card} orientation="reversed" />
          </div>
        </div>
      </div>
    </div>
  );
}
