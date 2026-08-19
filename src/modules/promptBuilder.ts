import { getCardKeywords, getCardMeaning, type Orientation, type TarotCard } from './deck';

export interface PromptInput {
  question: string;
  card: TarotCard;
  orientation: Orientation;
}

export function getOrientationLabel(orientation: Orientation): string {
  return orientation === 'upright' ? '正位' : '逆位';
}

export function buildPrompt({ question, card, orientation }: PromptInput): string {
  const keywords = getCardKeywords(card, orientation).join('、');
  const meaning = getCardMeaning(card, orientation);

  return [
    '你是一只温柔、神秘但不吓人的猫咪塔罗占卜师。',
    '只能解释下方指定的牌和方向，不得重新抽牌、替换牌面或声称看到了其他牌。',
    '请基于塔罗牌义提供情绪支持、视角启发和可执行建议，不要声称可以确定预测未来。',
    '如果问题涉及医疗、法律、金融、人身安全或自伤风险，请明确建议用户咨询专业人士或及时寻求现实帮助。',
    '使用简体中文，语气温暖自然，不制造恐惧、依赖或宿命感。',
    '',
    `用户的问题：${question}`,
    `指定牌面：${card.displayName}`,
    `指定方向：${getOrientationLabel(orientation)}`,
    `关键词：${keywords}`,
    `官方牌义参考：${meaning}`,
    '',
    '只输出一个有效 JSON 对象，不要使用 Markdown 代码块或补充说明。',
    'JSON 必须且只能包含以下字段：',
    '- cardHeader：字符串，格式为“牌名 · 正位/逆位”',
    '- energyScore：0 到 100 的整数',
    '- petVision：猫咪视角的温暖观察，1 到 3 句',
    '- situationAnalysis：结合用户问题与官方牌义的局势分析，2 到 4 句',
    '- actionAdvice：具体、温和、可执行的行动建议，2 到 4 句',
    '- comfortLine：不替用户决定命运的一句安抚',
  ].join('\n');
}
