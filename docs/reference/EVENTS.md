# 事件契约

实现：`lib/plugins/event-match.js`（`PluginsLoader` 薄封装）。冲突以代码为准。

关联：[ADAPTER_AND_ROUTING.md](./ADAPTER_AND_ROUTING.md) · [base-classes.md](../base-classes.md)

---

## 框架立场

- **没有协议注册表**，不强制 `myproto` 或任何固定名。
- `protocol`、`e.events`、Bot.em 名、plugin.event：**开发者自己起字符串**。
- 内置 `onebot` / `device` / `stdin` 只是**本仓库实现选的名字**，不是框架保留字。

| 你想要的 | 怎么写 |
|----------|--------|
| 所有通道都响应 | `event: 'message'` |
| 只跟某一个入站源 | `event: '<你起的 protocol>.message'`，或 `e.events` 里塞任意别名再监听它 |
| 完全自定义业务事件 | 入站时 `e.events: ['shop.paid']`，插件 `event: 'shop.paid'` |

---

## 三条常用约定（约定 ≠ 写死）

1. **`message`**：全通道消息（推荐跨端命令：`#日志` / `#重启`）
2. **`<protocol>.message`**：只跑该协议；内置 OneBotv11 用了 `protocol: 'onebot'`，故常见写法是 `onebot.message`
3. **自由别名**：`e.events = ['任意.名字']`，插件 `event` 写成同样字符串即可

---

## 字段（都可选、都自由）

| 字段 | 说明 |
|------|------|
| `e.protocol` | 任意短名；缺省时回落 `e.adapter` / `adapter_id`。Adapter 类上可写 `protocol = '…'`，由 `prepareEvent` 带上 |
| `e.adapter` | 适配器 id（字符串）；对象只在 `e.bot.adapter` |
| `e.events` / `e.eventAliases` | **自由别名**（string 或 string[]），原样进入匹配集合，无格式要求 |
| `e.post_type` | 参与路径拼装；自定义值可用 `registerEventMap`（可选） |
| `e.caps` | 通道能力，见 ADAPTER_AND_ROUTING |

---

## 开发者怎么扩展（三种，任选）

### A. 只换 protocol（最简单）

```javascript
Bot.adapter.push(new class {
  id = 'TG'
  protocol = 'telegram'   // 你起的，不是保留字
  async load() { /* 挂 WS */ }
  onMsg(data) {
    Bot.em('message.private.friend', {
      ...data,
      adapter: this.id,
      protocol: this.protocol, // 或不写，prepareEvent 会从 bot.adapter.protocol 补
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
    })
  }
})
```

```javascript
super({ event: 'message' })            // 和 QQ/Web 一起收
super({ event: 'telegram.message' })   // 只要 Telegram
```

### B. 自由别名（不绑 `*.message` 形态）

```javascript
Bot.PluginsLoader.deal({
  post_type: 'message',
  adapter: 'shop',
  protocol: 'shop',
  events: ['order.created', 'shop.ping'],  // 随便起
  message: [{ type: 'text', text: '#x' }],
  raw_message: '#x',
  user_id: '1',
  self_id: 'shop',
  reply: async () => {},
})
```

```javascript
super({ event: 'order.created', rule: [...] })
```

### C. 自定义 Bot 总线（EventListener）

```javascript
// events/Hook.js — 听你 emit 的任意名
export default class Hook extends EventListener {
  constructor() { super({ event: 'billing.invoice' }) }
  async execute(e) { /* … */ }
}
// adapter: Bot.em('billing.invoice', data)
```

`registerEventMap(postType, keys)` **仅**在你要让自定义 `post_type` 生成 `a.b.c` 路径时才需要；用 `e.events` 时不必。

---

## 两层名字

| 层 | 用途 |
|----|------|
| `Bot.em(name)` / EventListener | 总线；name 任意 |
| `plugin.event` | 是否进入该消息插件；匹配下方集合 |

---

## 匹配集合怎么来的

1. `eventMap` 路径及前缀  
2. 消息类 → 加入 `message`（及 group/private 形态）  
3. 有 `protocol` → 加入 `protocol.post_type`、`protocol.message` 等  
4. **`e.events` 原样加入**  
5. `filtEvent`：命中集合，或 `foo.*` 通配 path  

内置实现当前选用的 protocol（可改、可不用）：`onebot` / `opq` / `wechat` / `gsuid` / `device` / `stdin` / `api`。
