# 猫咪塔罗 MVP

猫咪塔罗应用：Vite + React 前端 + 本地 Node API 服务，已接入 DeepSeek AI 生成真实解读。代码与运行资源都限制在 `app/` 子目录内，便于后续把 `app/` 单独同步到 GitHub。

## 当前模块

1. 首页/导航
2. 塔罗测算：填写问题 → 右侧卡背预览 → 视口中央洗牌（前几圈只显示卡背）→ 最后一转揭晓牌面 → 牌面进入结果位 → AI 解读（失败自动回退本地牌义）
3. 图鉴：78 张标准牌 + 5 张艺术卡筛选浏览；桌面 5 列，并按屏幕宽度响应式切换为 4/3/2 列
4. AI 解读服务：本地 Express 服务端调用 DeepSeek Chat Completions，结构化输出 + 严格校验 + 本地兜底

## AI 配置（必须）

API Key 不进入代码、前端或构建产物，从外部 TXT 文件读取：

```text
默认路径：D:\AI Projects\cat tarot\API key.txt
```

文件格式（中英文冒号均可）：

```text
model type：deepseek
api key：sk-xxxx
model：deepseek-v4-flash
```

- `model` 可改为 DeepSeek 当前提供的其他模型名。
- 换机器/部署时用环境变量 `CAT_TAROT_CONFIG_PATH` 指定新的配置文件绝对路径。
- `DEEPSEEK_BASE_URL` 可覆盖默认 `https://api.deepseek.com/v1`（仅服务端环境变量，不使用 `VITE_*`）。
- 配置缺失或错误不阻止页面启动：占卜自动回退本地解读，`/api/health` 显示 `configured: false`。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 同时启动前端（Vite）和 API 服务（`server/index.ts`，端口 8787）。

当前本地验证地址：

```text
http://127.0.0.1:5173/
```

健康检查：

```text
http://127.0.0.1:8787/api/health
```

## 构建

```bash
npm run build
```

包含前端生产构建（`tsc -b && vite build`）和服务端类型检查（`tsc -p tsconfig.server.json`）。

## AI API 架构

```text
浏览器 → /api/divination（同源，Vite 代理或 Nginx 反代）
       → server/services/divination.ts
           ├─ Zod 请求校验（问题 1–120 字、cardId、方向、seed）
           ├─ 服务端从本地牌库重新取牌义（不信任前端牌义）
           ├─ buildPrompt()（src/modules/promptBuilder.ts，前后端共享）
           ├─ server/providers/deepseek.ts（原生 fetch，JSON 输出，15s 超时）
           ├─ Zod 结构化结果校验（字段/范围/长度）
           └─ 失败 → generateLocalReading() 本地兜底，HTTP 200 可恢复响应
```

响应契约：

```ts
type DivinationResponse = {
  status: 'success' | 'fallback';
  source: 'ai' | 'local';
  result: {
    cardHeader: string;
    energyScore: number;   // 0-100
    petVision: string;
    situationAnalysis: string;
    actionAdvice: string;
    comfortLine: string;
  };
  requestId: string;
  reason?: 'timeout' | 'rate_limited' | 'model_not_found' | 'provider_error' | 'invalid_response' | 'configuration_error';
};
```

安全边界：

- Key 只存在于服务端内存，不进入日志（日志仅记录 requestId、状态、模型、耗时、token 数）、错误响应和前端。
- 服务端以 IP 限流（默认 12 次/分钟）+ 并发上限（默认 3），可用 `CAT_TAROT_RATE_LIMIT` / `CAT_TAROT_MAX_CONCURRENT` 调整。
- 请求体限制 16KB；`cardId` 不存在返回 400。
- AI 返回的 `cardHeader` 由服务端按真实牌面覆写，模型无法声称抽到别的牌。
- 前端 20 秒超时兜底；“再测一次/换个问题/重新抽牌”都会 abort 旧请求，防止迟到响应覆盖新结果。

完整的 API 契约、调试、部署、回滚与素材授权门禁见 [AI_API_DEPLOYMENT_PLAN.md](AI_API_DEPLOYMENT_PLAN.md)。

## 素材说明

当前素材来自原站逆向分析阶段下载的猫咪塔罗资源，仅建议用于本地原型和兜底。公开上线前建议替换为自有或已授权素材。
