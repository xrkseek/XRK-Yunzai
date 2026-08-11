# XRK-Yunzai Cursor Skills

与 `.cursor/rules/`、仓库根 [AGENTS.md](../../AGENTS.md) 配套。**唯一维护目录**；勿复制到 `.claude/`、`.trae/`。

| 给谁 | 用什么 |
|------|--------|
| Cursor / 写代码的 AI | 本目录 skill + `.cursor/rules/` |
| 插件作者 / 改框架的人 | 先 [AGENTS.md](../../AGENTS.md) 角色表，再打开对应 skill |
| 运行时对话 Agent | `agents/` 种子 → `data/ai-workspace/`（**不是**本目录） |

完整索引（按任务选）：[SKILL_INDEX.md](./SKILL_INDEX.md)

## 结构

```
.cursor/skills/<skill-name>/SKILL.md
```

YAML frontmatter 必填：`name`（= 目录名）、`description`（何时触发）。  
校验：`node scripts/validate-skills.mjs`

## 技能一览

| 技能 | 说明 |
|------|------|
| xrk-project-overview | 架构、目录、与 XRK-AGT 差异 |
| xrk-coding-style | 写法（全局裸名、FileUtils、类字段、workflow 目录） |
| xrk-base-layer | `lib/` 基类、Loader、工具、审计 |
| xrk-plugin-development | 消息插件、event、调工作流 |
| xrk-workflow-stream | `workflow/`、MCP、LLM |
| xrk-http-api | HTTP / WebSocket |
| xrk-config-commonconfig | CommonConfig schema |
| xrk-framework-tests | 基准测试、配置三件套、baseline |
| xrk-docs-audit | 文档与代码一致性 |

编码行为准则在规则 `karpathy-guidelines.mdc`（无独立 skill）。

## 文档分层

| 层级 | 文件 | 用途 |
|------|------|------|
| 入口 | `AGENTS.md` | 分角色地图 |
| 写法 | `docs/coding-style.md`、`docs/runtime-surface.md` | 唯一写法与挂载面 |
| 短契约 | `docs/base-classes.md` | 开发时首选 |
| 事件 | `docs/reference/EVENTS.md` | plugin.event 语义 |
| 详述 | `docs/BASE_CLASSES.md`、`docs/*_BASE_CLASS.md` | 示例、FAQ |
| 质量 | `docs/框架测试指南.md`、`docs/文档审查清单.md` | 测试与文档审查 |

冲突时**以代码与 `pnpm test` 为准**；内容使用**简体中文**。
