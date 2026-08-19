# 猫咪塔罗 AI API 接入、调试与部署推进计划

> 本文只定义本地体验验收完成后的推进路线，不代表已接入 AI 或已部署。实施前需要单独确认 AI Provider、预算和素材授权状态。

## 1. 目标与门禁

### 目标

把当前确定性抽牌与本地解读升级为：

```text
前端完成抽牌
  → POST /api/divination
  → 服务端 PromptBuilder + AI Provider
  → 校验结构化解读
  → 前端展示
  → 超时/失败时回退本地解读
```

### 开始实施前门禁

- [ ] 当前抽卡动画和图鉴响应式体验完成最终人工验收。
- [ ] 选定 AI Provider、模型、单次成本和月度预算上限。
- [ ] 确认当前猫咪塔罗素材的公开使用授权；无法确认则先替换为自有素材。
- [ ] 确认代码仓库只以 `app/` 为根，不提交外层研究资料和原始抓取文件。
- [ ] 确认 `.env`、日志和错误响应都不会泄露 API Key、完整 Prompt 或用户敏感问题。

## 2. 推荐架构

继续使用现有 Vite + React 前端，不为接入 API 重写为 Next.js。新增一个轻量 Node 服务端，与前端共同维护在 `app/`：

```text
app/
  src/                         # 现有 React 前端
    api/divinationClient.ts    # 浏览器请求封装
    modules/promptBuilder.ts   # 现有 PromptBuilder
    modules/reading.ts         # 现有本地 fallback
  server/
    index.ts                   # HTTP 服务入口
    routes/divination.ts       # POST /api/divination
    providers/                 # Provider adapter
    schemas/divination.ts      # 请求/响应校验
    services/divination.ts     # 编排、超时、错误映射、fallback 决策
  .env.example                 # 只列变量名，不放真实值
```

部署时采用同源结构：

- `/personal-project/cat-tarot/`：Vite 静态产物。
- `/personal-project/cat-tarot/api/`：Nginx 反向代理到本机 Node 服务。
- 浏览器只请求同源相对地址，不接触 Provider URL 或 Key。

## 3. API 契约

### 请求

```ts
interface DivinationRequest {
  question: string;
  cardId: string;
  orientation: 'upright' | 'reversed';
  includeMinor: boolean;
  drawSeed: number;
}
```

服务端必须根据 `cardId` 从本地牌库重新取牌义，不能相信前端提交的任意牌义或 Prompt。

### 成功响应

复用当前 `LocalReadingResult` 的用户可见字段，去掉 `debugPrompt`：

```ts
interface DivinationReading {
  cardHeader: string;
  energyScore: number;
  petVision: string;
  situationAnalysis: string;
  actionAdvice: string;
  comfortLine: string;
}

interface DivinationSuccess {
  status: 'success';
  source: 'ai';
  result: DivinationReading;
  requestId: string;
}
```

### 可恢复响应

```ts
interface DivinationFallback {
  status: 'fallback';
  source: 'local';
  reason: 'timeout' | 'provider_error' | 'invalid_response' | 'rate_limited';
  result: DivinationReading;
  requestId: string;
}
```

浏览器只展示温和的恢复提示，不展示 Provider 名、原始异常栈、Prompt 或 Key。

## 4. 服务端实现顺序

1. **契约与校验**
   - 为请求与响应建立运行时 Schema。
   - 问题去首尾空格，限制 1–120 字。
   - 校验 `cardId`、方向、布尔值和 seed。
   - 拒绝额外超大字段，限制请求体大小。

2. **复用现有能力**
   - 复用 `src/modules/promptBuilder.ts` 的 `buildPrompt()`，必要时移动到前后端共享目录，不复制两份逻辑。
   - 复用牌库的 `getCardMeaning()`、`getCardKeywords()` 和方向标签。
   - 保留 `generateLocalReading()`，用于超时、无额度、结构校验失败和 Provider 故障。

3. **Provider adapter**
   - 定义与具体厂商无关的 `generateDivination()` 接口。
   - 只有 adapter 知道 SDK、模型 ID、认证头和 Provider 错误格式。
   - 选定 Provider 后，必须以当时最新官方文档为实现依据；若使用 Claude API，则启用 Prompt Caching，并遵循项目的 Claude API skill。

4. **结构化输出**
   - 优先使用 Provider 原生结构化输出/JSON Schema 能力。
   - 对所有字段进行二次校验：能量值范围、字符串非空、最大长度、禁止额外字段。
   - 只允许一次受控修复或重试；仍不合法立即 fallback，避免延迟失控。

5. **可靠性与安全**
   - 单请求设置明确超时，例如 12–15 秒。
   - 按请求生成 `requestId`；日志记录耗时、状态、错误分类和 token/成本，不记录完整问题与完整 Prompt。
   - 基于 IP/匿名会话做基础频率限制和并发上限。
   - 对医疗、法律、金融、自伤/伤害风险问题保留专业求助提醒，不做确定性预测。
   - 不向前端返回 `debugPrompt`。

## 5. 前端接入顺序

1. 新增 `requestDivination()`，只负责调用相对路径 `/api/divination`、超时和解析契约。
2. 保留当前抽牌与动画流程：抽中的牌、正逆位和 seed 仍由现有确定性逻辑决定，AI 只负责解释，不重新抽牌。
3. 在牌面揭晓后发起 API，结果页增加：
   - 正在解读状态；
   - 成功结果；
   - 本地 fallback 的轻提示；
   - 可重试但不重复抽牌。
4. 即使 API 失败，也必须显示官方正/逆位牌义和本地三段解读，不允许结果页空白。
5. “再测一次”和“换个问题”继续沿用当前语义；避免旧请求晚到后覆盖新一次结果，使用 `AbortController` 或 requestId 防竞态。

## 6. 本地调试与验收

### 固定回归样本

至少准备以下类别的问题，并固定牌与方向，以便比较版本：

- 普通决策：个人项目下一步如何推进。
- 情绪支持：最近有些焦虑，如何调整节奏。
- 关系视角：如何更好地沟通当前分歧。
- 医疗/法律/金融边界问题。
- 空白、超长、特殊字符和重复提交。

### 必测路径

- [ ] AI 正常返回且字段完整。
- [ ] Provider 超时 → 本地 fallback。
- [ ] 429/额度不足 → 本地 fallback。
- [ ] 返回非 JSON、缺字段、超长内容 → Schema 拒绝并 fallback。
- [ ] 快速点击重试、切页面、重新抽牌 → 旧请求不会覆盖新状态。
- [ ] 前端构建产物和浏览器网络请求中无 Key。
- [ ] 日志无完整 Prompt、无用户敏感原文、无认证信息。
- [ ] 官方牌义与抽中方向一致，AI 不得声称抽到了另一张牌。

完成上述路径后，再进行一轮真实浏览器端到端验收和成本统计。

## 7. 部署预案

目标服务器预期为 `jiaoshoumars.com`，但实际部署前必须只读核验，不依赖旧记录直接写入：

1. 确认 SSH、磁盘、Node 版本、进程管理方式、Nginx 配置路径、Compose 服务和现有路由。
2. 备份现有 Nginx 配置；只追加猫咪塔罗所需 location，不覆盖其他项目。
3. 前端生产构建后以单个压缩包上传到 `/tmp`，再解包至独立静态目录；避免递归上传卡住。
4. Node API 使用独立目录、独立系统用户/进程名和 `.env`；真实 Key 只存服务器，不进入压缩包、Git 或前端静态目录。
5. Nginx 同源代理 API，并设置请求体大小、超时和安全响应头。
6. 先验证：
   - 静态首页、JS、CSS、牌面资源 200；
   - `/api/health` 200；
   - 一次测试占卜成功；
   - 一次模拟 Provider 失败正确 fallback；
   - 浏览器控制台无错误。
7. 灰度确认后再开放导航入口或正式链接。

## 8. 回滚与上线后观测

### 回滚

- 保留上一版前端构建包和服务端包。
- Nginx 修改前保留带时间戳备份。
- Provider 故障时可通过服务端开关强制所有请求走本地 fallback，无需回滚前端。
- 新版本异常时先切回上一版 API，再切回前端静态包；reload Nginx，不直接 restart 整个网关。

### 观测指标

- 请求成功率、fallback 比例和原因分布。
- P50/P95 响应时间。
- 输入/输出 token 与估算成本。
- 429、超时、无效结构化响应比例。
- 前端结果页到达率和重试率。
- 日志保留周期与脱敏抽查。

## 9. GitHub 与发布边界

未来 GitHub 仓库只包含 `app/`：

- 包含运行代码、经授权的运行资源、README、`.env.example`、测试与部署说明。
- 排除 `.env*` 真实配置、日志、`node_modules/`、构建缓存、外层 `research/`、`design/`、逆向抓取文件和未授权源素材。
- 在公开仓库或公开部署前再次执行素材授权检查和 secrets 扫描。

## 10. 推荐里程碑

1. **M1：体验闭环**——完成当前动画与图鉴最终浏览器验收。
2. **M2：API 骨架**——契约、Schema、Provider adapter、健康检查、本地 fallback。
3. **M3：真实 AI 联调**——结构化输出、安全边界、错误路径和成本验证。
4. **M4：前端接入**——加载、成功、fallback、重试、竞态处理。
5. **M5：部署演练**——服务器只读核验、打包、测试路径、回滚演练。
6. **M6：上线**——授权门禁通过后灰度发布与监控。