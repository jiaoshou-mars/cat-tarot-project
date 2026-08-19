# 猫咪塔罗项目状态

> 这是当前实现阶段的总入口文档。未来如果更换 agent / 模型，优先先读这个文件，再看 [README.md](README.md) 和相关模块。

## 当前阶段

- 位置：`D:\AI Projects\cat tarot\app`
- 阶段：**AI API 接入（M3）已完成本地真实联调：DeepSeek `deepseek-v4-flash` 真实调用成功、全故障路径回退验证通过，等待用户浏览器端主观验收**
- 当前状态：前端（Vite + React）与本地 API 服务（Express，端口 8787）已联通；抽牌仍由确定性 `drawCard()` 决定，AI 只负责解读，失败自动回退本地结果。Key 从 `app/` 外部 TXT 读取，不进入代码、日志、响应或构建产物。

## 当前已完成

1. **项目骨架**：已在 `app/` 内建立独立的 Vite + React + TypeScript 应用。
2. **资源封装**：已把运行所需的牌面、卡背、Extra 艺术卡、牌阵图与数据文件复制到 `app/` 内部，避免未来依赖外层研究目录。
3. **核心模块**：
   - [src/modules/deck.ts](src/modules/deck.ts)
   - [src/modules/draw.ts](src/modules/draw.ts)
   - [src/modules/promptBuilder.ts](src/modules/promptBuilder.ts)
   - [src/modules/reading.ts](src/modules/reading.ts)
4. **页面模块**：
   - [src/components/Home.tsx](src/components/Home.tsx)
   - [src/components/TarotReading.tsx](src/components/TarotReading.tsx)
   - [src/components/Gallery.tsx](src/components/Gallery.tsx)
   - [src/components/CardDetailModal.tsx](src/components/CardDetailModal.tsx)
5. **结果页优化**：已把抽卡结果改为更紧凑的左图右信息布局，并补上正/逆位官方牌义展示。
6. **动效优化**：翻牌前增加了旋转/浮动的仪式感动画。
7. **构建验证**：`npm run build` 已成功通过。
8. **运行验证准备**：已整理本地验证的检查重点，下一步优先确认 dev server、首页、塔罗测算、图鉴和结果页是否可完整跑通。
9. **抽卡过渡体验优化**：提问态持续展示明显的猫咪塔罗卡背；点击抽卡后用固定视口仪式层把卡牌放到屏幕中央。流程扩展为 `flipping → revealing → revealed → result`：前五圈通过双面卡背遮蔽真实牌面，最后半圈才翻到实际猫咪塔罗牌，稳定停留后进入结果页。仪式阶段锁定页面滚动并在退出时恢复； reduced-motion 用户使用短等待且仍能看到卡背、牌面和结果。
10. **图鉴密度与质感优化**：宽屏桌面固定 5 列，依次响应式降为 4/3/2 列；横纵间距增大，卡牌增加暖金双层边框、图片内框、内侧高光、多层投影及清晰的 hover/focus 状态。

## 运行验证记录

- 验证目标：先把本地服务启动起来，再完整走一遍首页 → 塔罗测算 → 右侧卡背 → 中央仪式位 → 牌面出现 → 结果页 → 图鉴筛选/详情的闭环。
- 当前进度：开发服务器和首页已通过初步验证；抽卡过渡优化已写入代码，正在进行构建与浏览器逐阶段验收。
- 当前关注问题：
  - 需要确认提问态右侧卡背图片可见且不会塌缩为空白。
  - 需要确认抽卡后卡背持续可见、卡牌确实进入中央仪式位并旋转。
  - 需要确认 1.25 秒后牌面翻开、短暂停留后进入结果页，且结果页卡牌和摘要有衔接入场。
  - 需要确认 React 输入、再测一次/换个问题、图鉴弹窗在浏览器内真实可用。
- 下一步：运行 npm run build；随后用独立浏览器标签完成输入、抽卡三个阶段、结果操作和图鉴闭环验证，并把证据与失败项继续记录在本文档。

## 当前产品边界

- 只做 4 个模块：
  1. 首页 / 导航
  2. 塔罗测算
  3. 图鉴
  4. 内置 PromptBuilder
- 当前不做：三灵共鸣、账号系统、支付、复杂分享图、多语言。
- 当前不把 AI API 暴露给前端；`PromptBuilder` 只作为内部能力保留。

## 资产与数据

### 已接入到 app 内的运行资源

- 78 张标准牌：`public/assets/cat-tarot/cards_optimized/`
- 5 张 Extra 艺术卡：`public/assets/cat-tarot/gallery-extra/`
- 卡背：`public/assets/cat-tarot/cover_optimized.png`
- 牌义数据：`src/data/tarot_meanings_modern_fixed.json`
- 牌阵数据：`src/data/spreads_library.json`

### 外层研究资料

这些资料用于研究和追溯，不作为运行时依赖：

- `research/`
- `design/`
- `assets/source-cat-tarot/`
- `assets/reference/weibo/`

## 当前运行方式

```bash
npm install
npm run dev
```

本地地址：

```text
http://127.0.0.1:5173/
```

## 本轮体验问题与实现记录（2026-08-13）

### 用户反馈

1. 提问界面右侧缺少明显的塔罗卡背，用户难以感知核心牌卡元素。
2. 点击抽卡后，过程阶段可能出现空画面，缺少明确的卡牌翻转反馈。
3. 抽卡期间牌卡应从右侧移动到页面中央并转动；牌面出现后，再衔接到结果页的卡牌位置，最后展示完整答案。

### 实现结果

- `TarotCard` 的无牌状态也保留卡背结构，避免输入态出现空卡牌区域。
- 抽卡流程增加 `flipping` → `revealed` → `result` 三阶段：
  - `flipping`：输入区域淡出，卡牌进入中央仪式位，执行多周旋转和浮动。
  - `revealed`：卡背翻开，展示具体猫咪塔罗牌面并短暂停留。
  - `result`：牌面进入结果页左侧卡位，右侧结果摘要延迟淡入。
- 抽卡定时器使用 `useRef` 管理，并在阶段变化/组件卸载时清理。
- 增加 `prefers-reduced-motion` 兜底，降低动效时仍保证卡背、牌面和结果内容可见。
- 保留官方正/逆位牌义、猫咪视角、局势分析、行动建议、再测一次和换个问题。

### 本轮验证状态

- 生产构建已再次通过：`tsc -b && vite build`，Vite 8.1.3 共转换 28 个模块；最后一次复核构建耗时 553ms。
- 浏览器确认提问态卡背资源加载成功（原图宽 519px），修复布局宽度传递后卡牌实际显示为 320 × 571px，不再是 0 × 0 的空区域。
- 浏览器确认 React 受控 textarea 可以通过原生 value setter + `input` 事件更新，字符计数从 0/120 变为 35/120；此前“无法输入”属于自动化触发方式问题，不是输入组件本身失效。
- 浏览器确认抽卡可进入结果页，结果卡牌、正/逆位、官方牌义、猫咪视角、局势分析、行动建议、再测一次和换个问题均有渲染；卡背和具体牌面图片均加载成功。
- 浏览器确认图鉴默认展示 78 张牌，筛选器包含全部/大阿卡纳/四花色/艺术卡；逐次状态读取受浏览器脚本同步时序影响，最终艺术卡状态确认是 5 张。详情弹窗仍需一次稳定的独立重载验证。
- 本轮发现并修复一项真实代码问题：`.draw-ritual` 在 grid `place-items:center` 下没有固有宽度，导致子元素 `width: 100%` 解析为 0，正是提问页右侧卡牌“空白”的根因；现已为仪式容器增加明确宽度。
- 由于 CDP 请求本身存在命令往返延迟，无法通过延迟后的单次 DOM 快照完整证明 1.25 秒旋转和 0.72 秒牌面停留的视觉连续性；代码阶段类与构建已验证，但最终动画观感仍建议用户在本地页面亲自体验。
- 之前的验证标签页曾出现旧结果态，刷新后已恢复首页；该现象暂按验证环境状态残留记录，不视为产品持久化逻辑。

## 第二轮体验优化记录（2026-08-17）

### 用户反馈

1. 抽卡动画在电脑短屏中位置偏下，可能被屏幕裁掉一半，需要以真实视口而非页面内容区居中，并兼顾移动端。
2. 多周旋转期间不应提前暴露结果，前几圈必须持续显示卡背，仅在最后一次旋转中翻到真实牌面。
3. 图鉴桌面一行约 7 张过密，应改为 5 张并增加间距、放大牌面。
4. 图鉴卡牌需要更明确的边框、投影和实体牌质感。

### 实现结果

- 仪式区域改为 `position: fixed; inset: 0; min-height: 100dvh` 的独立视口层，卡牌使用 `top/left: 50%` 居中，不再受页面滚动位置和输入区高度影响。
- 卡牌宽度同时受 `vw`、`dvh` 和短屏断点约束；桌面短屏与横屏进一步缩小牌面，提示文案独立定位，避免参与卡牌居中。
- `ReadingStage` 增加 `revealing`：`flipping` 前五圈使用正反两面卡背，`revealing` 最后半圈才允许实际牌面出现，`revealed` 稳定停留 0.8 秒后进入结果页。
- 仪式阶段锁定 `body` 滚动并在清理时还原；定时器继续在阶段变化与卸载时清理。减少动态效果时前两个阶段缩短到 80ms、牌面停留 240ms，避免无动画空等。
- 图鉴宽屏固定 5 列，1040px 以下 4 列、820px 以下 3 列、560px 以下 2 列；标准牌和艺术卡使用同一响应式规则。
- 图鉴卡牌新增暖金外框、内侧高光、图片内框、渐变牌身、多层投影，以及 hover 抬升和 `:focus-visible`。

### 当前验证证据

- 生产构建持续通过；最终复核构建为 Vite 8.1.3、28 个模块、168ms，TypeScript 目录诊断为 0 errors / 0 warnings。
- 浏览器在 1707 × 817 视口确认：图鉴为 5 列，横向间距 24px，单卡约 217px 宽；边框、22px 圆角、渐变牌身和四层投影均由运行时计算样式确认生效。
- 浏览器确认默认图鉴仍为 78 张，说明样式调整未改变默认数据集合。
- 用户常用 Chrome 未开启远程调试，因此最终验收改用独立、无登录态的 Headless Chrome，只访问 `127.0.0.1`；未触碰用户标签页和账号。
- 桌面仪式验收（1707 × 817）：仪式层完整覆盖视口；卡牌中心为 (853.49, 408.5)，与视口中心 (853.5, 408.5) 误差小于 0.01px。`flipping` 阶段遮蔽卡背存在且显示，动画名为 `ritual-spin-back`；到 `revealing` 才移除遮蔽并执行 `ritual-final-reveal`。最终进入“战车（The Chariot）·逆位”，标题为“逆位牌义解读”，`body` 滚动锁已恢复。
- 移动端仪式验收（390 × 844）：三个阶段卡牌横向中心均为 195px，牌面完整落在视口内；约 1.5 秒进入最后揭晓、2.08 秒稳定显示牌面、2.92 秒进入结果。
- reduced-motion 验收（1000 × 680）：约 103ms 进入揭晓、188ms 显示牌面、455ms 进入结果，没有等待完整动画时长。
- “再测一次”保留问题并回到输入态；第二次抽卡能完成；“换个问题”清空为 0/120；两条路径结束后 `body` 滚动锁均为空，无状态残留。
- 图鉴全部筛选稳定数量已确认：78 / 22 / 14 / 14 / 14 / 14 / 5。首张牌图片加载完成（naturalWidth 520）；标准牌详情弹窗显示牌名、两个正逆位 meaning block 和已加载图片，并可正常关闭。
- 响应式运行证据：1707px 为 5 列、1000px 为 4 列、760px 为 3 列、390px 为 2 列；均保留实体边框、渐变与投影，无数据集合变化。
- 自动验收产物：`verification-runtime.json`、`verification-probes.json` 和 `verification-gallery.png`。验证脚本仅用于本地验收，不属于生产运行路径。

## 第三轮轻量体验优化记录（2026-08-17）

### 用户反馈

1. 抽卡动画下方文案与卡牌发生重叠，且短暂仪式本身不需要额外可见解释文字。
2. 图鉴卡片同时使用牌面、渐变底色、内外边框、白/金/紫多套颜色，视觉层级过多，不够简洁统一。

### 实现与验证

- 抽卡的 `flipping`、`revealing`、`revealed` 三个阶段已移除全部可见过程文案，彻底消除文字和卡牌重叠；保留 1 × 1px 的 `.sr-only` `aria-live` 状态供屏幕阅读器识别。
- 隔离浏览器逐阶段确认三个动画状态的 `visibleTexts` 均为空；隐藏状态分别为“猫咪正在洗牌”“正在揭开牌面”“牌面已经翻开，正在生成解读”。
- 图鉴卡片收敛为单一 `#1b1424` 牌身和文字区底色，取消紫色渐变、白色内描边、图片独立边框与图片投影。
- 标题统一为暖金 `rgb(223, 197, 143)`，副标题使用同色 62% 透明度；仅保留一层低对比暖金外框、轻微内高光和中性黑色投影。
- 运行时确认图鉴仍为 78 张、桌面 5 列，详情弹窗可正常打开和关闭；最终生产构建通过（Vite 8.1.3，28 个模块，693ms）。

## AI API 接入记录（2026-08-19）

### 实现内容

1. **服务端**（`server/`，端口 8787，`tsx watch` 热重载）：
   - [server/config.ts](server/config.ts)：从 `D:\AI Projects\cat tarot\API key.txt` 安全解析 provider/key/model，支持 `CAT_TAROT_CONFIG_PATH`、`DEEPSEEK_BASE_URL` 覆盖；默认模型 `deepseek-v4-flash`，TXT 中 `model` 优先。
   - [server/schemas/divination.ts](server/schemas/divination.ts)：Zod 请求/结果 Schema（问题 1–120 字、cardId 两位数字、方向枚举、seed 非负整数；结果字段齐全 + 范围 + 最大长度）。
   - [server/providers/deepseek.ts](server/providers/deepseek.ts)：原生 `fetch` 调用 OpenAI 兼容 `chat/completions`，`response_format: json_object`，15 秒 AbortSignal 超时；区分 JSON 解析失败与 Schema 校验失败的安全诊断日志（只记录 issue path/code 与内容长度，不记录内容）。
   - [server/services/divination.ts](server/services/divination.ts)：牌库重查、Prompt 编排、AI 结果的 `cardHeader` 服务端覆写（模型无法声称抽到别的牌）、本地 fallback、requestId/耗时/token 日志。
   - [server/index.ts](server/index.ts)：`GET /api/health`（仅 provider/model/configured/configStatus）、`POST /api/divination`（16KB 请求体限制、IP 限流默认 12 次/分钟、并发上限默认 3、限流直接本地结果）。
2. **共享模块调整**：
   - [src/modules/reading.ts](src/modules/reading.ts)：抽出共享 `DivinationReading` 类型；`debugPrompt` 已从结果中移除（不再向前端暴露完整 Prompt）。
   - [src/modules/promptBuilder.ts](src/modules/promptBuilder.ts)：Prompt 强化——锁定指定牌面/方向、禁止重新抽牌、风险问题专业求助提醒、简体中文、只输出规定 JSON 字段。
3. **前端**：
   - [src/api/divinationClient.ts](src/api/divinationClient.ts)：同源 `/api/divination` 请求封装 + 响应运行时校验。
   - [src/components/TarotReading.tsx](src/components/TarotReading.tsx)：`revealed` 阶段即发起 AI 请求（与 0.8 秒停留并行）；结果页 AI 加载中显示"猫咪正在细读牌面"骨架（官方牌义/关键词始终立即可见），AI 成功后渲染，失败/超时显示本地结果 + 克制提示 + "重新获取解读"按钮（不重新抽牌）；20 秒客户端超时；`requestSequenceRef` + `AbortController` 防止旧请求覆盖新结果（再测一次/换个问题/重抽/卸载均 abort）。
   - [vite.config.ts](vite.config.ts)：`/api` 代理到 127.0.0.1:8787。
   - [result-optimizations.css](src/result-optimizations.css)：`.ai-pending` 加载态与 `.ai-fallback-note` 提示样式（含 reduced-motion 适配）。
   - `.gitignore`：追加 `API key.txt` / `*API*key*.txt` 防误提交。
   - `package.json`：`dev` 并行启动 web+api，`build` 附加服务端类型检查；新增 `express`、`zod`、`tsx`、`concurrently`。

### 验证证据（2026-08-19）

- 构建与类型：`npm run build` 通过（web 构建 + `tsc -p tsconfig.server.json`，0 errors）。
- 真实 AI 调用：`deepseek-v4-flash` 有效——愚者正位 92 分、战车逆位 35 分、魔术师正位 90 分均 `source=ai` 返回完整结构化字段；耗时约 3.7–6.6 秒，单次约 1067 tokens；经 Vite 5173 代理链路同样成功。
- 故障注入（8788 测试实例，错误配置路径 + 限流 2/分钟）：
  - 配置缺失 → health `configured:false, configStatus:file_missing`；占卜返回完整本地结果 `reason=configuration_error`。
  - 超限流 → 完整本地结果 `reason=rate_limited`，无 AI 消耗。
  - 无效 cardId（99）→ 400 `invalid_card`；空问题 → 400 `invalid_request`。
- 一次 `invalid_response` 回退发生过：根因是 Windows curl 以 GBK 编码发送问题文本导致模型输出异常；UTF-8（浏览器/PowerShell）路径稳定成功。provider 已增加区分 parse/schema 失败的诊断日志。
- Secrets 扫描：`src`、`server`、`dist`、docs 中无任何 `sk-` Key 材料（dist 中一处 JPG 二进制巧合命中已人工排除）；`server/config.ts` 仅含配置文件路径字符串（服务端代码，不进浏览器）。

### 安全提醒

- API Key 曾出现在本次会话的对话与工具结果中，建议在 DeepSeek 控制台轮换一次 Key，更新 TXT 即可，无需改代码。

### 遗留项

- 用户浏览器端主观验收（AI 加载态观感、真实解读质量、fallback 提示文案）。
- 部署（M5+）未开始：服务器核验、Nginx 同源反代、素材授权门禁仍阻断公开上线。

## 已知问题 / 待确认

1. **动画主观观感待用户确认**：桌面/移动端定位、卡背遮蔽、最后一转揭晓、reduced-motion、结果内容和重置路径均已通过独立浏览器运行验收；仍建议用户亲自体验旋转速度、牌面停留和结果入场是否符合审美预期。
2. **验证方式约束**：常用 Chrome 是否开启远程调试不影响本地产品；自动验收可用独立 Headless Chrome。长异步 eval 曾超时，后续优先使用独立实例和小粒度状态读取。
3. **资源版权**：当前下载素材仅建议用于本地原型和研究，公开上线前需要替换或确认授权；这是进入公开部署的阻断门禁。

## 下一步计划

### 1. 先完成运行验证

- 启动 dev server
- 打开首页
- 验证塔罗测算流程
- 验证结果页左图右信息布局
- 验证图鉴筛选与详情弹窗

### 2. AI API 阶段（已完成本地联调，见上方 2026-08-19 记录）

- 剩余：用户浏览器端主观验收（AI 加载态、解读质量、fallback 提示）；建议轮换一次 API Key。
- 可选增强：AI 失败时的一次受控重试、按 requestId 的前端诊断上报。

### 3. 最后做部署准备

- 本地 AI 流程与回退策略验收通过后再部署
- 只把 `app/` 作为未来 GitHub 同步根目录，不同步外层研究材料和过程文件
- 部署前先只读核验服务器现状，再配置静态前端、Node API 与 Nginx 同源代理
- 上线前必须解决牌面素材授权/替换门禁，并准备健康检查和回滚

## 相关文档

- [README.md](README.md)
- [reverse-engineering-report.md](../research/reverse-engineering-report.md)
- [copyable-implementation-plan.md](../design/copyable-implementation-plan.md)
