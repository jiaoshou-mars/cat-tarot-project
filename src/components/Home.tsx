import type { Page } from '../App';

const cardBackImage = `${(import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}assets/cat-tarot/cover_optimized.png`;

interface HomeProps {
  onNavigate: (page: Page) => void;
}

export function Home({ onNavigate }: HomeProps) {
  return (
    <main className="home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">猫咪塔罗 · 灵感测算</p>
          <h1>让猫咪替你翻开今天的那张牌</h1>
          <p className="hero-text">
            写下此刻最想确认的问题，抽出一张猫咪塔罗。牌面会以温柔的猫咪视角，给你一份关于当下状态、行动方向与内心提醒的灵感解读。
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => onNavigate('reading')}>
              开始塔罗测算
            </button>
            <button className="btn ghost" onClick={() => onNavigate('gallery')}>
              查看猫咪图鉴
            </button>
          </div>
        </div>
        <div className="hero-card-stack" aria-hidden="true">
          <img src={cardBackImage} alt="猫咪塔罗卡背" />
          <div className="glow-orb" />
        </div>
      </section>
      <section className="feature-grid">
        <article>
          <span>01</span>
          <h3>写下你的问题</h3>
          <p>可以是正在犹豫的选择、最近的情绪，也可以是一件想获得启发的小事。</p>
        </article>
        <article>
          <span>02</span>
          <h3>抽出一张猫咪牌</h3>
          <p>猫咪会从牌组中替你翻开一张牌，用正位或逆位回应此刻的能量。</p>
        </article>
        <article>
          <span>03</span>
          <h3>获得温柔提醒</h3>
          <p>结果不会替你决定未来，而是帮你换一个角度，看清下一步可以怎么走。</p>
        </article>
      </section>
    </main>
  );
}
