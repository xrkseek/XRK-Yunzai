# XRK-Yunzai 开发指引

> **读者**：AI Agent · 插件作者 · 二次开发 / 改框架的人  
> **原则**：这里是**入口地图**；细则进文档与 skill，冲突时以**代码 + `pnpm test`** 为准。

## 按角色怎么读

| 你是… | 先读 | 再读 | 动手时用 |
|-------|------|------|----------|
| **插件作者** | [coding-style](docs/coding-style.md) · [EVENTS](docs/reference/EVENTS.md) | [base-classes](docs/base-classes.md)（plugin）· [PLUGIN_BASE_CLASS](docs/PLUGIN_BASE_CLASS.md) | skill `xrk-plugin-development` · 规则 `plugin-development.mdc` |
| **写 HTTP / 工作流 / 配置** | 同上写法 + [AISTREAM_AND_MCP](docs/reference/AISTREAM_AND_MCP.md) | [base-classes](docs/base-classes.md) 对应段 | `xrk-http-api` / `xrk-workflow-stream` / `xrk-config-commonconfig` |
| **改 `lib/` / Loader / 多端口** | [ARCHITECTURE](docs/ARCHITECTURE.md) · [VS_YUNZAI](docs/VS_YUNZAI.md) | [runtime-surface](docs/runtime-surface.md) · 规则 `xrk-yunzai-core` | skill `xrk-base-layer` · `xrk-coding-style` |
| **AI / Cursor** | 本文 + [SKILL_INDEX](.cursor/skills/SKILL_INDEX.md) | 始终生效规则（下表） | 按任务打开对应 skill，勿一次塞全仓 |

内置能力说明：[plugins/system-plugin/SYSTEM-PLUGIN.md](plugins/system-plugin/SYSTEM-PLUGIN.md)。

## 三层「给 AI / 开发者」的东西（勿混）

| 层 | 路径 | 给谁 | 写什么 |
|----|------|------|--------|
| **Cursor 规则** | `.cursor/rules/*.mdc` | IDE 会话（常 alwaysApply 或按 glob） | 硬约束：放码位置、兼容 shim、constructor、工具 |
| **Cursor 技能** | `.cursor/skills/*/SKILL.md` | Agent 按任务加载 | 场景化流程与权威文档指针 |
| **运行时 Agent 种子** | `agents/` → 复制到 `data/ai-workspace/{id}/` | 对话 Bot 工作区 | AGENTS/SOUL、标准技能种子；**不是** Cursor skill |

- 技能**唯一维护目录**：`.cursor/skills/`（勿复制到 `.claude/` / `.trae/`）。
- 运行时记忆与改过的技能在 **`data/ai-workspace/`**，不要往仓库根再堆 `memory/` / `skills/` / `rules/`。
- 详见 [agents/README.md](agents/README.md)、[`.cursor/skills/README.md`](.cursor/skills/README.md)。

## 始终生效的规则（摘要）

| 规则 | 要点 |
|------|------|
| `xrk-yunzai-core` | 业务 `plugins/`、基建 `lib/`；**勿删** `lib/puppeteer/puppeteer.js`、`lib/plugins/config.js`；`Bot.makeLog` 绑定 |
| `xrk-dev-requirements` | constructor 不建 Map；裸名 `Bot`/`segment`；`FileUtils`/`ObjectUtils`；`destroy`/`cleanup` |
| `xrk-dev-workspace` | 「加入工作区」≠ 往框架仓登记插件；自有插件各为独立 git |
| `karpathy-guidelines` | 先想清楚、最小改动、目标可验证 |

按文件触发：`plugin-development.mdc`（`plugins/**`）、`commonconfig-schema.mdc`、`javascript-standards.mdc`。

## 项目一句话

Node.js **24+** 多平台 Agent 框架：Bot、插件、AIStream 工作流、HTTP/WebSocket、CommonConfig、控制台。业务在 `plugins/<名>/`，基础设施在 `lib/`，入口 `app.js` → `lib/bot.js`。

| 扩展 | 目录 | 基类 |
|------|------|------|
| 消息插件 | `plugins/<名>/`（或 `plugin/`） | `lib/plugins/plugin.js` |
| 工作流 | **仅** `plugins/<名>/workflow/`（不扫 `streams/`） | `lib/ai-workflow/aistream.js` |
| HTTP | `plugins/<名>/http/` | `lib/http/http.js` |
| 事件监听 | `plugins/<名>/events/` | `lib/listener/listener.js` |
| 配置 UI | `plugins/<名>/commonconfig/` | CommonConfig schema |

- **工具**：`FileUtils`、`ObjectUtils`、`getServerConfigPath`
- **`lib/` 读 aistream**：`getAiWorkflowConfigOptional()`（见 [AISTREAM_AND_MCP](docs/reference/AISTREAM_AND_MCP.md)）
- **端口配置**：`data/server_bots/<port>/` · 默认 `config/default_config/`
- **事件**：跨端用 `event: 'message'`；协议限定用 `'<protocol>.message'` 或 `e.events`（见 [EVENTS](docs/reference/EVENTS.md)）

## 文档地图

| 文档 | 用途 |
|------|------|
| [docs/coding-style.md](docs/coding-style.md) | 写法速查 |
| [docs/runtime-surface.md](docs/runtime-surface.md) | Bot / segment / cfg 挂载面 |
| [docs/base-classes.md](docs/base-classes.md) | 基类短契约 |
| [docs/BASE_CLASSES.md](docs/BASE_CLASSES.md) | 基类详述 |
| [docs/reference/EVENTS.md](docs/reference/EVENTS.md) | plugin.event 语义 |
| [docs/reference/ADAPTER_AND_ROUTING.md](docs/reference/ADAPTER_AND_ROUTING.md) | 适配器与路由 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构 |
| [docs/VS_YUNZAI.md](docs/VS_YUNZAI.md) | 相对 Yunzai：多端口、入口、基类 |
| [docs/框架测试指南.md](docs/框架测试指南.md) | 测试命令与基准 |
| [docs/文档审查清单.md](docs/文档审查清单.md) | 发版前文档审计 |

## 验证

```bash
pnpm lint
pnpm test
node scripts/validate-skills.mjs
```

增删 `system-plugin` 内置模块时，同步 `tests/helpers/system-plugin-baseline.mjs`。

## 与 XRK-AGT

借鉴：配置三件套测试、模块基准、coding-style 速查、skill 索引。  
勿照搬：`core/`、`src/infrastructure/`、Node 26 专项 API、Tasker 路径。  
长期演进见 **[XRK-AGT](https://github.com/sunflowermm/XRK-AGT)**。
