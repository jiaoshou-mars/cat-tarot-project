# 猫咪塔罗 v1.0 部署归档

| 项目 | 已确认值 |
|---|---|
| 线上地址 | http://jiaoshoumars.com/personal-project/cat-tarot/ |
| 备用域名访问 | http://www.jiaoshoumars.com/personal-project/cat-tarot/ |
| 部署日期 | 2026-08-21 |
| 代码基线 | GitHub `main`，v1.0 及后续部署修复提交 |
| 服务器系统 | Ubuntu 24.04 |
| 网关 | Docker Nginx，现有容器 `vibe-stack-nginx` |
| 网关配置 | `/opt/vibe-stack/nginx.conf` |
| 静态根挂载 | `/opt/vibe-stack/frontend-html/` |
| 前端目录 | `/opt/vibe-stack/frontend-html/personal-project/cat-tarot/` |
| API 目录 | `/opt/cat-tarot-api/` |
| API 容器 | `cat-tarot-api`，加入现有 `vibe-stack_default` 网络 |
| API 内部端口 | 8787（仅 Docker 网络暴露，不映射宿主端口） |
| API 配置 | 独立服务器文件挂载为容器只读 secret；不进入仓库、静态包或日志 |

## 已执行变更

1. 静态发布包上传并安装到独立项目目录；旧目录存在时按时间戳备份。
2. API 源码以独立 Docker Compose 文件运行，复用现有 Docker 网络，不改现有 Compose 服务定义。
3. Nginx 配置按时间戳备份，仅追加猫咪塔罗 API、静态目录和尾斜杠入口规则。
4. 执行容器内 `nginx -t` 通过后 reload，未重启网关。
5. API 容器生产监听地址设为 `0.0.0.0`，仅供 Docker 网络内的 Nginx 访问；本地开发默认仍为回环地址。
6. 生产镜像使用 `npm install --omit=dev`；此前 `npm ci` 因 lockfile 与 npm 当前依赖解析不一致失败，已改为可重复验证通过的安装方式，后续应单独整理 lockfile 后再恢复 `npm ci`。

## 验收结果

- `http://jiaoshoumars.com/personal-project/cat-tarot/`：200
- `http://www.jiaoshoumars.com/personal-project/cat-tarot/`：200
- HTML、CSS、JS、卡背 PNG：全部 200
- `/personal-project/cat-tarot/api/health`：200，configured=true，模型名正常，无 Key 泄露
- 公网真实 AI 占卜：success / ai，6 个结构化字段，指定牌头一致
- 非法空问题：400 invalid_request
- 现有 Nginx 配置测试：successful
- API 容器日志敏感信息扫描：未发现 Key/secret 内容

## 回滚

- 静态目录：使用部署前生成的 `cat-tarot.bak.<timestamp>` 目录恢复。
- API Compose：使用 `/opt/cat-tarot-api/docker-compose.cat-tarot.yml.bak.<timestamp>` 恢复。
- Nginx：使用 `/opt/vibe-stack/nginx.conf.bak.<timestamp>` 恢复，随后执行容器内 `nginx -t` 与 reload。
- API 容器：`cd /opt/cat-tarot-api && sudo docker compose -f docker-compose.cat-tarot.yml down`。

## 后续更新方式

- 仅前端变更：本地 `npm run build`，上传新的 `dist` 单包，覆盖静态目录，不需要改 Nginx。
- API 变更：更新 API 包后在服务器执行 Docker Compose build/up，先看 health 与日志，再做公网 API 验收。
- 新增版本需求：在 `docs/` 新增对应版本需求文档，同时同步到 GitHub；不修改 v1.0 需求基线。
- API 配置调整：只修改服务器独立 TXT 文件，重启 API 容器；不得把内容复制回 Git 或静态目录。
