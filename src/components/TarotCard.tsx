import { getOrientationLabel } from '../modules/promptBuilder';
import type { Orientation, TarotCard as TarotCardType } from '../modules/deck';

interface TarotCardProps {
  card?: TarotCardType;
  orientation?: Orientation;
  flipped: boolean;
  compact?: boolean;
  concealed?: boolean;
  showCaption?: boolean;
}

export function TarotCard({
  card,
  orientation = 'upright',
  flipped,
  compact = false,
  concealed = false,
  showCaption = true,
}: TarotCardProps) {
  const frontClassName = [
    'tarot-card-face',
    'tarot-card-front',
    concealed ? 'is-concealed' : '',
    !concealed && orientation === 'reversed' ? 'reversed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`tarot-card-shell ${flipped ? 'is-flipped' : ''} ${compact ? 'compact' : ''}`}>
      <div className="tarot-card-inner">
        <div className="tarot-card-face tarot-card-back">
          <img src="/assets/cat-tarot/cover_optimized.png" alt="猫咪塔罗卡背" />
        </div>
        <div className={frontClassName}>
          {card ? (
            <>
              <img className="tarot-card-image" src={card.image} alt={card.displayName} />
              {concealed ? (
                <img
                  className="tarot-card-concealment"
                  src="/assets/cat-tarot/cover_optimized.png"
                  alt=""
                  aria-hidden="true"
                />
              ) : null}
            </>
          ) : (
            <span className="tarot-card-placeholder">等待牌面出现</span>
          )}
        </div>
      </div>
      {card && flipped && showCaption ? (
        <div className="card-caption">
          <strong>{card.displayName}</strong>
          <span>{getOrientationLabel(orientation)}</span>
        </div>
      ) : null}
    </div>
  );
}
