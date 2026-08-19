import { useCallback, useEffect, useRef, useState } from 'react';
import { requestDivination, type DivinationResponse } from '../api/divinationClient';
import { drawCard, type DrawResult } from '../modules/draw';
import { generateLocalReading, type DivinationReading } from '../modules/reading';
import { getCardKeywords, getCardMeaning } from '../modules/deck';
import { getOrientationLabel } from '../modules/promptBuilder';
import { TarotCard } from './TarotCard';

type ReadingStage = 'input' | 'flipping' | 'revealing' | 'revealed' | 'result';
type AiStatus = 'idle' | 'loading' | 'success' | 'fallback';

const RITUAL_TIMINGS = {
  spinning: 1500,
  revealing: 560,
  revealed: 800,
} as const;

export function TarotReading() {
  const [question, setQuestion] = useState('');
  const [includeMinor, setIncludeMinor] = useState(true);
  const [stage, setStage] = useState<ReadingStage>('input');
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [reading, setReading] = useState<DivinationReading | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const ritualTimerRef = useRef<number | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const canDraw = question.trim().length > 0;
  const isRitual = stage === 'flipping' || stage === 'revealing' || stage === 'revealed';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isRitual) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isRitual]);

  const loadAiReading = useCallback(
    async (nextDraw: DrawResult) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      const sequence = ++requestSequenceRef.current;
      requestControllerRef.current = controller;
      setAiStatus('loading');

      const localReading = generateLocalReading({ question: question.trim(), ...nextDraw });
      const timeoutId = window.setTimeout(() => controller.abort(), 20_000);

      try {
        const response: DivinationResponse = await requestDivination(
          {
            question: question.trim(),
            cardId: nextDraw.card.id,
            orientation: nextDraw.orientation,
            includeMinor,
            drawSeed: nextDraw.seed,
          },
          controller.signal,
        );

        if (sequence !== requestSequenceRef.current) return;
        setReading(response.result);
        setAiStatus(response.source === 'ai' ? 'success' : 'fallback');
      } catch {
        if (sequence !== requestSequenceRef.current) return;
        setReading(localReading);
        setAiStatus('fallback');
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [question, includeMinor],
  );

  useEffect(() => {
    if (!drawResult) return;

    const nextStage =
      stage === 'flipping' ? 'revealing' : stage === 'revealing' ? 'revealed' : stage === 'revealed' ? 'result' : null;

    if (!nextStage) return;

    const duration = prefersReducedMotion
      ? stage === 'revealed'
        ? 240
        : 80
      : stage === 'flipping'
        ? RITUAL_TIMINGS.spinning
        : stage === 'revealing'
          ? RITUAL_TIMINGS.revealing
          : RITUAL_TIMINGS.revealed;

    ritualTimerRef.current = window.setTimeout(() => {
      if (nextStage === 'result') {
        const localReading = generateLocalReading({ question: question.trim(), ...drawResult });
        setReading((current) => current ?? localReading);
      }
      setStage(nextStage);
    }, duration);

    return () => {
      if (ritualTimerRef.current !== null) {
        window.clearTimeout(ritualTimerRef.current);
        ritualTimerRef.current = null;
      }
    };
  }, [stage, question, drawResult, prefersReducedMotion]);

  useEffect(() => {
    if (stage === 'revealed' && drawResult && aiStatus === 'idle') {
      void loadAiReading(drawResult);
    }
  }, [stage, drawResult, aiStatus, loadAiReading]);

  useEffect(() => {
    return () => {
      if (ritualTimerRef.current !== null) {
        window.clearTimeout(ritualTimerRef.current);
      }
      requestSequenceRef.current += 1;
      requestControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (stage === 'result') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [stage]);

  function startReading() {
    if (!canDraw || isRitual) return;
    requestSequenceRef.current += 1;
    requestControllerRef.current?.abort();
    const nextDraw = drawCard({ question, includeMinor });
    setDrawResult(nextDraw);
    setReading(null);
    setAiStatus('idle');
    setStage('flipping');
  }

  function resetAll() {
    requestSequenceRef.current += 1;
    requestControllerRef.current?.abort();
    setQuestion('');
    setDrawResult(null);
    setReading(null);
    setAiStatus('idle');
    setStage('input');
  }

  function redrawSameQuestion() {
    requestSequenceRef.current += 1;
    requestControllerRef.current?.abort();
    setDrawResult(null);
    setReading(null);
    setAiStatus('idle');
    setStage('input');
  }

  const keywords = drawResult ? getCardKeywords(drawResult.card, drawResult.orientation) : [];
  const officialMeaning = drawResult ? getCardMeaning(drawResult.card, drawResult.orientation) : '';

  if (stage === 'result' && drawResult && reading) {
    return (
      <main className="reading-page result-page">
        <section className="result-hero glass-panel compact-result-hero result-enter">
          <div className="result-card-spotlight">
            <TarotCard card={drawResult.card} orientation={drawResult.orientation} flipped compact />
          </div>
          <div className="result-summary compact-result-summary">
            <p className="eyebrow">猫咪已经翻开这张牌</p>
            <h1>{drawResult.card.displayName}</h1>
            <p className="result-orientation">{getOrientationLabel(drawResult.orientation)}</p>
            <p className="question-recap">你问的是：{question}</p>
            <div className="result-meta-row">
              <div className="energy-badge large">
                <span>{aiStatus === 'loading' ? '…' : reading.energyScore}</span>
                <small>今日能量</small>
              </div>
              <div className="keyword-row compact-tags">
                {keywords.slice(0, 6).map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </div>
            <article className="official-meaning-card">
              <h3>{getOrientationLabel(drawResult.orientation)}牌义解读</h3>
              <p>{officialMeaning}</p>
            </article>
          </div>
        </section>

        <section className="result-panel glass-panel ritual-result-panel compact-reading-panel">
          {aiStatus === 'loading' ? (
            <div className="ai-pending" aria-live="polite">
              <span className="ai-pending-paw" aria-hidden="true">
                🐾
              </span>
              <p>猫咪正在细读牌面，为你整理专属解读…</p>
            </div>
          ) : (
            <>
              {aiStatus === 'fallback' ? <p className="ai-fallback-note">本次先使用本地牌义为你解读。</p> : null}
              <div className="reading-sections compact-reading-sections">
                <article>
                  <h3>猫咪视角</h3>
                  <p>{reading.petVision}</p>
                </article>
                <article>
                  <h3>局势分析</h3>
                  <p>{reading.situationAnalysis}</p>
                </article>
                <article>
                  <h3>行动建议</h3>
                  <p>{reading.actionAdvice}</p>
                </article>
              </div>

              <blockquote>{reading.comfortLine}</blockquote>
            </>
          )}

          <div className="button-row centered">
            {aiStatus === 'fallback' && drawResult ? (
              <button className="btn ghost" onClick={() => void loadAiReading(drawResult)}>
                重新获取解读
              </button>
            ) : null}
            <button className="btn primary" onClick={redrawSameQuestion}>
              再测一次
            </button>
            <button className="btn ghost" onClick={resetAll}>
              换个问题
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`reading-page ${isRitual ? 'ritual-page' : ''}`}>
      <section className="reading-layout">
        <div className={`reading-input-panel glass-panel ${isRitual ? 'ritual-input-hidden' : ''}`}>
          <p className="eyebrow">塔罗测算</p>
          <h1>先把问题说给猫咪听</h1>
          <p className="muted">
            适合询问此刻的状态、一个正在犹豫的选择，或你想获得灵感提醒的小事。猫咪不会替你决定答案，但会帮你看见另一种角度。
          </p>

          <label className="field-label" htmlFor="question">
            你的问题或困惑
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={120}
            placeholder="例如：我的个人项目近期应该如何推进？"
            disabled={isRitual}
          />
          <div className="input-meta">
            <label className="switch-row">
              <input
                type="checkbox"
                checked={includeMinor}
                onChange={(event) => setIncludeMinor(event.target.checked)}
                disabled={isRitual}
              />
              <span>加入小阿卡纳，让提醒更贴近日常细节</span>
            </label>
            <span>{question.length}/120</span>
          </div>

          <div className="button-row">
            <button className="btn primary" onClick={startReading} disabled={!canDraw || isRitual}>
              {isRitual ? '猫咪正在翻牌…' : '抽一张猫咪塔罗'}
            </button>
            <button className="btn ghost" onClick={resetAll} disabled={isRitual}>
              清空问题
            </button>
          </div>
        </div>

        <div className={`reading-card-panel glass-panel ${isRitual ? 'ritual-card-panel' : ''}`}>
          <div
            className={`draw-ritual ${stage === 'flipping' ? 'is-spinning' : ''} ${stage === 'revealing' ? 'is-revealing' : ''} ${stage === 'revealed' ? 'is-revealed' : ''}`}
          >
            <TarotCard
              card={drawResult?.card}
              orientation={drawResult?.orientation}
              flipped={stage === 'revealing' || stage === 'revealed'}
              concealed={stage === 'flipping'}
              showCaption={stage === 'result'}
            />
          </div>
          {stage === 'input' ? <p className="hint-text">写下问题后，猫咪会为你翻开一张牌。</p> : null}
          <span className="sr-only" aria-live="polite">
            {stage === 'flipping' ? '猫咪正在洗牌。' : null}
            {stage === 'revealing' ? '正在揭开牌面。' : null}
            {stage === 'revealed' ? '牌面已经翻开，正在生成解读。' : null}
          </span>
        </div>
      </section>
    </main>
  );
}
