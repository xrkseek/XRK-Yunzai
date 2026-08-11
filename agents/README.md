# agents/ — 运行时 Agent 种子（非 Cursor）

与 `lib/`（框架代码）、`.cursor/`（**IDE** 规则 / 技能）分离。本目录只放**可复制进 Bot 工作区或注入 prompt**的内容。

开发插件 / 改框架 / Cursor Agent：请看仓库根 **[AGENTS.md](../AGENTS.md)** 与 [`.cursor/skills/SKILL_INDEX.md`](../.cursor/skills/SKILL_INDEX.md)。

| 路径 | 用途 |
|------|------|
| `workspace/` | 首次创建 `data/ai-workspace/{id}/` 时复制的模板（AGENTS/SOUL/…、`memory/MEMORY.md`） |
| `skills/standard/` | 对话 Agent 技能种子；复制到工作区 `skills/`，可由 `agentWorkspace.customSkillRoots` 扫描 |
| `subagents.yaml` | Subagents 清单 |

路径常量：`lib/utils/agent-workspace-paths.js`（`PROJECT_SKILLS_STANDARD_REL` = `agents/skills/standard`）。  
注入逻辑：`lib/utils/agent-workspace.js`。

运行时记忆与改过的技能在 **`data/ai-workspace/`**，不要往项目根再放 `memory/` / `skills/` / `rules/`。
