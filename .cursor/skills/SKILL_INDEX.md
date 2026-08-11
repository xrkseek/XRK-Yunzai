# XRK-Yunzai Skills 索引

**唯一维护目录**：`.cursor/skills/`（勿复制到 `.claude/`、`.trae/`）。

| 概念 | 路径 | 说明 |
|------|------|------|
| Cursor Skill | 本目录 `*/SKILL.md` | 开发/审计时按任务加载 |
| Cursor Rule | `.cursor/rules/*.mdc` | 会话约束（非 skill） |
| 运行时种子 | `agents/skills/standard/` | 复制进 `data/ai-workspace/`，给对话 Agent |

总入口：[AGENTS.md](../../AGENTS.md) · 说明：[README.md](./README.md)  
校验：`node scripts/validate-skills.mjs`

每个 skill：`SKILL.md` 含 YAML `name`（与目录名一致）、`description`（触发场景）。

---

## 按任务选 skill

| 你在做… | Skill |
|---------|--------|
| 找架构 / 目录 / 与 AGT 差异 | [xrk-project-overview](xrk-project-overview/SKILL.md) |
| 写或审 `lib/`、`plugins/` 代码风格 | [xrk-coding-style](xrk-coding-style/SKILL.md) |
| 改基类 / Loader / 工具 / 审计 `lib/` | [xrk-base-layer](xrk-base-layer/SKILL.md) |
| 消息插件、`event` / rule / 调工作流 | [xrk-plugin-development](xrk-plugin-development/SKILL.md) |
| `workflow/`、MCP、LLM | [xrk-workflow-stream](xrk-workflow-stream/SKILL.md) |
| `http/` API、WebSocket | [xrk-http-api](xrk-http-api/SKILL.md) |
| CommonConfig schema | [xrk-config-commonconfig](xrk-config-commonconfig/SKILL.md) |
| 框架测试、配置三件套、baseline | [xrk-framework-tests](xrk-framework-tests/SKILL.md) |
| 文档与代码一致性 | [xrk-docs-audit](xrk-docs-audit/SKILL.md) |

## 权威文档（skills 指向，勿在 skill 里复制长文）

| 文档 | 用途 |
|------|------|
| `docs/coding-style.md` | 写法速查 |
| `docs/runtime-surface.md` | Bot / segment / cfg |
| `docs/base-classes.md` | 基类短契约 |
| `docs/reference/EVENTS.md` | `message` vs `protocol.message` |
| `docs/框架测试指南.md` | 测试命令与基准 |
| `docs/文档审查清单.md` | 发版前文档检查 |

## 规则清单（非 skill）

| 规则 | 作用 |
|------|------|
| `xrk-yunzai-core.mdc` | 架构、兼容 shim、配置路径（always） |
| `xrk-dev-requirements.mdc` | constructor / 全局 / 工具 / 红线（always） |
| `xrk-dev-workspace.mdc` | 多根工作区 vs 框架仓（always） |
| `karpathy-guidelines.mdc` | 最小改动、可验证目标（always） |
| `plugin-development.mdc` | `plugins/**/*.js` |
| `commonconfig-schema.mdc` | CommonConfig 相关 |
| `javascript-standards.mdc` | JS 惯例 |

冲突时**以代码与 `pnpm test` 为准**；正文使用**简体中文**。
