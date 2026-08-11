# 业务扩展基类契约

业务放 `plugins/<插件名>/`。权威短契约以本文为准；冲突时以代码与 `pnpm test` 为准。

| 文档 | 用途 |
|------|------|
| [coding-style.md](./coding-style.md) | 写法速查 |
| [runtime-surface.md](./runtime-surface.md) | Bot / segment / cfg 挂载 |
| [reference/EVENTS.md](./reference/EVENTS.md) | **事件名与跨通道插件** |
| [reference/ADAPTER_AND_ROUTING.md](./reference/ADAPTER_AND_ROUTING.md) | Adapter / `e.caps` |
| [BASE_CLASSES.md](./BASE_CLASSES.md) | 总览与关系图 |
| [VS_YUNZAI.md](./VS_YUNZAI.md) | 与经典 Yunzai / 多端口 |

**compat**：`plugin` / `EventListener` / `Handler` / `Runtime` / `makeConfig`  
**ext**：`AiWorkflow` / `HttpApi` / `CommonConfig` / `LLMFactory` / `HotReloadBase` / Adapter 约定

---

## 通用约定

- 状态用**类字段**（`cache = new Map()`），禁止 constructor 内 `new Map()`。
- 全局裸名：`Bot`、`segment`、`cfg`；新插件 `import plugin from '../../lib/plugins/plugin.js'`。
- 文件：`FileUtils`；对象：`ObjectUtils`；配置路径：`getServerConfigPath(port, name)`。
- 日志：`Bot.makeLog(level, msg, tag[, err])`；禁止空 `catch`。

---

## 1. plugin（`lib/plugins/plugin.js`）— compat + ext

目录：`plugins/<名>/*.js` 或内置合集 `plugins/<名>/plugin/`。

### 构造参数

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `name` | string | `your-plugin` | 插件名 |
| `dsc` | string | `无` | 描述 |
| `event` | string \| string[] | `message` | **跨端用 `message`**；仅 OneBot 用 `onebot.message`。见 [EVENTS.md](./reference/EVENTS.md) |
| `priority` | number | `5000` | 越小越先；`'extended'` 进扩展队列 |
| `rule` | array | `[]` | `{ reg, fnc, permission?, log?, event? }` |
| `task` | object \| array | — | `{ name, cron, fnc, log? }` |
| `bypassThrottle` | boolean | `false` | [ext] 跳过节流 |
| `handler` / `namespace` | — | — | [compat] Handler 注册 |
| `eventSubscribe` | object | — | [ext] 实例字段 `{ [botEvent]: handler }`，非 static |

### 实例属性（Loader 注入 / 自有）

| 属性 | 说明 |
|------|------|
| `this.e` | 当前事件（deal 时注入） |
| `this.name` / `dsc` / `event` / `priority` / `rule` / `task` | 构造写入 |
| `this.bypassThrottle` | [ext] |
| `this.handler` / `namespace` | Handler 用 |

### 实例方法

| 方法 | 说明 |
|------|------|
| `reply(msg?, quote?, data?)` | 调 `this.e.reply` |
| `markNeedReparse()` | 标记需重新解析消息 |
| `conKey(isGroup?)` | 上下文 key |
| `setContext` / `getContext` / `finish` | 多轮上下文 |
| `awaitContext` / `resolveContext` | Promise 式上下文 |
| `getWorkflow(name)` | [ext] 取工作流 |
| `getAllWorkflows()` | [ext] Map |
| `getWorkflowManager()` | [ext] WorkflowManager |
| `callWorkflow(name, params?, context?)` | [ext] |
| `callWorkflows` / `callWorkflowsSequential` | [ext] 并行 / 串行 |
| `executeWorkflow(name, question, config?)` | [ext] |
| `renderImg(plugin, tpl, data, cfg?)` | 可选 #miao 渲染 |
| `async init()` | 可选，加载后调用 |
| `async destroy()` | 可选，释放 watcher/定时器 |

### 静态方法

| 方法 | 说明 |
|------|------|
| `bindUserContext(pluginName, selfId, userId, type, refE, time?)` | 挂他人上下文 |
| `finishUserContext(...)` | 结束他人上下文 |
| `hasActiveContextForEvent(e)` | 供 Loader 跳过 CD |

### 最小示例

```javascript
import plugin from '../../lib/plugins/plugin.js';

export default class MyPlugin extends plugin {
  constructor() {
    super({
      name: 'my-plugin',
      dsc: '说明',
      event: 'message',
      priority: 5000,
      rule: [{ reg: '^#命令$', fnc: 'run' }],
    });
  }
  async run() {
    await this.reply('ok');
  }
}
```

---

## 2. EventListener（`lib/listener/listener.js`）— compat

目录：`plugins/<名>/events/`（ListenerLoader 扫描，可热更）。

| 成员 | 说明 |
|------|------|
| `constructor({ event, prefix?, once? })` | `event` 为 **Bot.em 名**（必填） |
| `prefix` / `event` / `once` | 绑定 `Bot.on/once(prefix+event)` |
| `get plugins` | `Bot.PluginsLoader` |
| `execute(e)` | 默认 → `PluginsLoader.deal(e)`；可覆写 |

```javascript
import EventListener from '../../lib/listener/listener.js';

export default class MyListener extends EventListener {
  constructor() {
    super({ event: 'message' }); // Bot 总线，不是 onebot.message
  }
}
```

---

## 3. Adapter 约定（无基类）— ext

目录：`plugins/<名>/adapter/` 或 `plugins/adapter/`。侧效注册，无统一基类。

| 约定 | 说明 |
|------|------|
| `Bot.adapter.push(instance)` | 模块顶层注册 |
| `id` / `name` / `path` | 身份与 WS 路径 |
| `protocol` | **任意字符串**（无注册表）；决定 `<protocol>.message` 等收窄名 |
| `async load()` | 挂 `Bot.wsf[path]`；可选 `registerEventMap` |
| 入站 | `Bot.em(..., { adapter, protocol, events?, ... })` 或 `deal` + `caps` |
| `e.events` | 自由别名数组，插件可 `event: '你起的名'` |

详述：[ADAPTER_AND_ROUTING.md](./reference/ADAPTER_AND_ROUTING.md)。

---

## 4. HttpApi（`lib/http/http.js`）— ext

目录：`plugins/<名>/http/`。推荐对象导出；亦可 `extends HttpApi`。

### 导出 / 构造字段

| 字段 | 说明 |
|------|------|
| `name` / `dsc` | 标识与描述 |
| `priority` | **越大越先**（与插件相反） |
| `enable` | 默认 true |
| `routes` | `{ method, path, handler, middleware? }[]`；handler `(req, res, Bot)` |
| `ws` | `{ '/path': handler }` |
| `middleware` | 全局中间件 |
| `init(app, Bot)` | 可选初始化 |

### 实例要点

| 成员 | 说明 |
|------|------|
| `this.loader` | ApiLoader |
| `register(app)` / 卸载 Router | 由 Loader 调用 |

---

## 5. AiWorkflow（`lib/ai-workflow/ai-workflow.js`）— ext

目录：**仅** `plugins/<名>/workflow/`（不扫 `streams/`）。

### 构造参数

| 字段 | 说明 |
|------|------|
| `name` / `description` / `version` / `author` | 元信息 |
| `priority` | 越小越先 |
| `config` | LLM/行为；与 `ai-workflow.yaml` 合并 |
| `functionToggles` | 功能开关 |

### 常用方法（子类可覆写）

| 方法 | 说明 |
|------|------|
| `async init()` | 注册 MCP/功能；只调用一次 |
| `registerMCPTool(name, { description, inputSchema, handler })` | MCP 工具 |
| `registerFunction(name, options)` | 文本功能 |
| `buildSystemPrompt(context)` | 系统提示 |
| `async buildChatContext(e, question)` | 消息数组 |
| `callAI` / 重试与错误分类 | 基类提供 |
| `successResponse` / `errorResponse` | 统一返回 |
| `async cleanup()` | 释放连接/缓存 |

详述：[WORKFLOW_BASE_CLASS.md](./WORKFLOW_BASE_CLASS.md)、[AISTREAM_AND_MCP.md](./reference/AISTREAM_AND_MCP.md)。

---

## 6. CommonConfig / ConfigBase（`lib/commonconfig/commonconfig.js`）— ext

注册：`plugins/<名>/commonconfig/`。键名多为 `插件名_文件名`（system-plugin 的 `system.js` → `system`）。

| 成员 | 说明 |
|------|------|
| `name` / `displayName` / `description` | 元信息 |
| `filePath` / `fileType` / `schema` | 路径与校验 |
| `read()` / `write(data)` | 读写 |
| `multiFile` | 多文件配置（如 renderer） |

规则见 `.cursor/rules/commonconfig-schema.mdc`。

---

## 7. 历史 makeConfig（`lib/plugins/config.js`）— compat

`makeConfig(name, defaults)` → `config/<name>.yaml`。**禁止删除**。新插件用 CommonConfig。

---

## 8. Renderer / LLMFactory / HotReloadBase

| 模块 | 路径 | 要点 |
|------|------|------|
| Renderer | `lib/renderer/Renderer.js` | `renderers/`、`plugins/*/renderer/` |
| LLMFactory | `lib/factory/llm/` | `getAiWorkflowConfigOptional().llm` |
| HotReloadBase | `lib/utils/hot-reload-base.js` | Loader 统一监视；业务勿直连 chokidar |

---

## 9. 加载器与目录对照

| 扩展点 | 基类/约定 | Loader | 扫描 |
|--------|-----------|--------|------|
| 消息插件 | `plugin` | PluginsLoader | `plugins/**`（跳过 adapter 等子树由约定） |
| 事件 | `EventListener` | ListenerLoader | `plugins/*/events/` |
| Adapter | 无基类 + `Bot.adapter.push` | `Bot.loadAdapters` + `ListenerLoader.loadAdapters` | `adapter/` |
| HTTP | `HttpApi` / 对象 | ApiLoader | `plugins/*/http/` |
| 工作流 | `AiWorkflow` | AiWorkflowLoader | `plugins/*/workflow/` |
| 配置 | CommonConfig | ConfigLoader | `commonconfig/` |
