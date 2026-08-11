import EventListener from "../../../lib/listener/listener.js"
import cfg from "../../../lib/config/config.js"
import Renderer from "../../../lib/renderer/loader.js"
import { toBuffer } from "../../../lib/renderer/screenshot-utils.js"
import path from 'path'
import { FileUtils } from '../../../lib/utils/file-utils.js'
import { resolveProjectPath, DATA_DIR } from "../../../lib/config/config-constants.js"

/** [compat] connect — 仅由 ListenerLoader 绑定 Bot.on('connect') */
const RESTART_KEY = 'Yz:restart'

/** 事件上的适配器 id（字符串）；对象只应在 e.bot.adapter */
function adapterId(e) {
  if (typeof e?.adapter === 'string' && e.adapter) return e.adapter
  if (e?.adapter_id) return String(e.adapter_id)
  if (e?.bot?.adapter?.id) return String(e.bot.adapter.id)
  return ''
}

export default class connectEvent extends EventListener {
  dataDir = resolveProjectPath(DATA_DIR)

  constructor() {
    super({ event: "connect" })
    this.renderer = Renderer.getRenderer()
  }

  async execute(e) {
    if (!Bot.uin.includes(e.self_id)) Bot.uin.push(e.self_id)
    const currentUin = e?.self_id || Bot.uin[0]
    if (!currentUin) return

    const id = adapterId(e)
    const restart = await this.getRestartInfo(currentUin)
    if (restart && (!restart.adapter || restart.adapter === id)) {
      await this.handleRestart(currentUin, restart, e)
    }
    await this.handleNormalStart(e)
  }

  async getRestartInfo(uin) {
    const data = await redis.get(`${RESTART_KEY}:${uin}`)
    if (!data) return null
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async handleNormalStart(e) {
    if (!cfg.bot.online_msg_exp) return
    if (adapterId(e) === 'device' || e.caps?.skipOnlineMsg) return
    const key = `Yz:connect888Msg:${e.self_id}`
    if (await redis.get(key)) return
    redis.set(key, "1", { EX: cfg.bot.online_msg_exp * 60 })
    await this.sendWelcomeMessage()
  }

  async handleRestart(currentUin, restart, e) {
    const time = ((Date.now() - restart.time) / 1000).toFixed(1)
    const target = (adapterId(e) === 'device' && typeof e.sendReply === 'function')
      ? { sendMsg: (content) => Promise.resolve(e.sendReply(content)) }
      : (restart.isGroup ? Bot[currentUin].pickGroup(restart.id) : Bot[currentUin].pickUser(restart.id))
    await target.sendMsg(`重启成功，耗时 ${time} 秒`)
    await this.sendPluginLoadReport(target)
    await redis.del(`${RESTART_KEY}:${currentUin}`)
  }

  /** 使用 renderer 截图，返回 Buffer 或路径字符串；兼容返回 { type, file, name } 的渲染器 */
  async takeScreenshot(htmlPath, name, options = {}) {
    if (!this.renderer) return false
    try {
      const raw = await this.renderer.screenshot(name, { tplFile: htmlPath, saveId: name, ...options })
      if (!raw) return false
      if (Buffer.isBuffer(raw)) return raw
      if (typeof raw === 'string') return raw
      const buf = toBuffer(raw)
      if (buf) return buf
      if (raw && typeof raw === 'object') {
        const file = raw.file ?? raw.data
        if (file != null) {
          if (Buffer.isBuffer(file)) return file
          if (typeof file === 'string') return file
          const b = toBuffer(file)
          if (b) return b
          try {
            const fromData = Buffer.from(file)
            if (fromData.length) return fromData
          } catch (err) {
            Bot.makeLog('debug', `[connect] Buffer.from 跳过: ${err?.message || err}`, 'Connect');
          }
        }
      }
      return false
    } catch (err) {
      Bot.makeLog('error', `[connect] 截图失败: ${err.message}`, 'Connect')
      return false
    }
  }

  async sendWelcomeMessage() {
    const htmlPath = await this.generateHTML('welcome', this.getWelcomeHTML())
    const img = await this.takeScreenshot(htmlPath, 'welcome_message', { width: 520, deviceScaleFactor: 3 })
    if (img) Bot.sendMasterMsg([segment.image(img)])
    this.cleanupFile(htmlPath)
  }

  async sendPluginLoadReport(target) {
    const stats = Bot.PluginsLoader?.getPluginStats?.()
    if (!stats) return
    const htmlPath = await this.generateHTML('plugin_load', this.getPluginLoadHTML(stats))
    const img = await this.takeScreenshot(htmlPath, 'plugin_load_report', { width: 800, deviceScaleFactor: 1.5 })
    if (!img) {
      Bot.makeLog('warn', '[connect] 插件加载报告: 截图未得到 img（见上方 takeScreenshot 日志），未发送', 'Connect')
      this.cleanupFile(htmlPath)
      return
    }
    await target.sendMsg([segment.image(img)])
    Bot.makeLog('mark', '[connect] 插件加载报告已 reply 发出', 'Connect')
    this.cleanupFile(htmlPath)
  }

  async generateHTML(prefix, content) {
    const htmlPath = path.join(this.dataDir, `${prefix}_${Date.now()}.html`)
    await FileUtils.writeFile(htmlPath, content, 'utf-8')
    return htmlPath
  }

  cleanupFile(filePath, delay = 5000) {
    setTimeout(
      () => FileUtils.unlink(filePath).catch((err) => {
        Bot.makeLog('debug', `[connect] 清理临时文件失败 ${filePath}: ${err?.message || err}`, 'ConnectEvent');
      }),
      delay
    );
  }

  getWelcomeHTML() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XRK-Yunzai</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Genshin';
      src: url('./fonts/Genshin.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }

    body {
      font-family: 'Genshin', -apple-system, 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #4a6cf7 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      margin: 0;
    }

    .container {
      width: 520px;
      background: rgba(255, 255, 255, 0.98);
      border-radius: 24px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      position: relative;
    }

    .header {
      background: linear-gradient(135deg, #667eea, #764ba2);
      padding: 30px 20px;
      text-align: center;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 15px;
      position: relative;
      z-index: 1;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .logo-text {
      color: #667eea;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -1px;
    }

    .title {
      font-size: 28px;
      margin-bottom: 5px;
      position: relative;
      z-index: 1;
    }

    .version {
      font-size: 14px;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }

    .commands {
      padding: 25px 20px;
    }

    .commands-title {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 15px;
      padding-left: 5px;
      font-weight: 600;
    }

    .command-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .command {
      background: #f9fafb;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .command:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
      border-color: #667eea;
    }

    .command-tag {
      font-size: 14px;
      color: #4c51bf;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
    }

    .command-tag i {
      margin-right: 6px;
      font-size: 13px;
    }

    .command-desc {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }

    .special {
      grid-column: span 2;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
    }

    .special:hover {
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
    }

    .special .command-tag,
    .special .command-desc {
      color: white;
    }

    .footer {
      padding: 15px 20px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }

    .shine-effect {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0) 100%
      );
      transform: rotate(30deg);
      animation: shine 6s infinite;
    }

    @keyframes shine {
      0% {
        transform: translateX(-100%) rotate(30deg);
      }
      100% {
        transform: translateX(100%) rotate(30deg);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="shine-effect"></div>
      <div class="logo">
        <div class="logo-text">XRK</div>
      </div>
      <h1 class="title">XRK-Yunzai</h1>
      <div class="version">Version ${cfg.package.version}</div>
    </div>
    
    <div class="commands">
      <div class="commands-title">可用命令</div>
      <div class="command-grid">
        <div class="command special">
          <div class="command-tag">
            <i class="fa fa-magic"></i>向日葵妈咪妈咪哄
          </div>
          <div class="command-desc">安装原神适配器和向日葵插件（本控制台默认主人）</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-dashboard"></i>#状态
          </div>
          <div class="command-desc">查看运行状态</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-file-text-o"></i>#日志
          </div>
          <div class="command-desc">查看运行日志</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-refresh"></i>#重启
          </div>
          <div class="command-desc">重新启动</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-pull-right"></i>#更新
          </div>
          <div class="command-desc">拉取Git更新</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-download"></i>#全部更新
          </div>
          <div class="command-desc">更新全部插件</div>
        </div>
        
        <div class="command">
          <div class="command-tag">
            <i class="fa fa-history"></i>#更新日志
          </div>
          <div class="command-desc">查看更新记录</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      Powered by XRK-Yunzai
    </div>
  </div>
</body>
</html>`
  }

  getPluginLoadHTML(stats) {
    const plugins = [...(stats?.plugins || [])].sort((a, b) => (b.loadTime || 0) - (a.loadTime || 0))
    const success = plugins.filter(p => p.success)
    const failed = plugins.filter(p => !p.success)
    const packages = this.groupPluginsByPackage(success)
    const single = success.filter(p => !p.name.includes('/'))
    const fastest = success.at(-1)
    const slowest = success[0]
    const avgMs = plugins.length ? (stats.totalLoadTime / plugins.length).toFixed(0) : '0'
    const rate = plugins.length ? ((success.length / plugins.length) * 100).toFixed(0) : '0'
    const slowCount = success.filter(p => p.loadTime > 100).length

    const section = (title, count, body) => `
      <section class="sec">
        <div class="sec-h"><h2>${title}</h2><span class="badge">${count}</span></div>
        ${body}
      </section>`

    const pkgBlocks = packages.map((pkg, i) => `
      <div class="pkg c${i % 4}">
        <div class="pkg-h"><b>${pkg.name}</b><span>${pkg.plugins.length} · ${pkg.totalTime.toFixed(0)}ms</span></div>
        <div class="list">${pkg.plugins.map(p => this.renderPlugin(p)).join('')}</div>
      </div>`).join('')

    const failBlocks = failed.map(p => `
      <div class="row fail">
        <div><div class="name">${p.name}</div>${p.error ? `<div class="err">${p.error}</div>` : ''}</div>
        <span class="ms slow">${p.loadTime.toFixed(1)}ms</span>
      </div>`).join('')

    return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>插件加载报告</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:800px;font-family:"Trebuchet MS","Segoe UI",sans-serif;color:#111;background:#FFF8E7}
.wrap{position:relative;overflow:hidden;padding:28px 28px 36px;background:
  radial-gradient(circle 14px at 40px 40px,#FF6B6B 98%,transparent) 0 0/80px 80px,
  radial-gradient(circle 8px at 70px 70px,#4ECDC4 98%,transparent) 40px 40px/80px 80px,
  repeating-linear-gradient(45deg,#FFE66D 0 6px,transparent 6px 18px) 560px 12px/120px 120px no-repeat,
  #FFF8E7}
.wrap::before,.wrap::after{content:"";position:absolute;pointer-events:none;z-index:0}
.wrap::before{width:90px;height:90px;border:5px solid #111;border-radius:50%;top:-20px;right:48px;background:#FF8FAB}
.wrap::after{width:0;height:0;border-left:36px solid transparent;border-right:36px solid transparent;border-bottom:62px solid #4ECDC4;bottom:24px;left:18px;filter:drop-shadow(4px 4px 0 #111)}
.card{position:relative;z-index:1;background:#fff;border:4px solid #111;box-shadow:10px 10px 0 #111;padding:22px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:4px solid #111}
.head h1{font-size:30px;letter-spacing:-.5px;line-height:1.1}
.head h1 span{display:inline-block;background:#FFE66D;border:3px solid #111;padding:2px 10px;transform:rotate(-2deg);box-shadow:3px 3px 0 #111}
.meta{font-size:13px;font-weight:700;text-align:right;line-height:1.5}
.meta b{background:#4ECDC4;border:2px solid #111;padding:1px 6px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat{border:3px solid #111;padding:14px 10px;text-align:center;box-shadow:4px 4px 0 #111}
.stat:nth-child(1){background:#FFE66D}.stat:nth-child(2){background:#4ECDC4}.stat:nth-child(3){background:#FF8FAB}.stat:nth-child(4){background:#A78BFA}
.stat .v{font-size:28px;font-weight:800;line-height:1.1}.stat .l{font-size:12px;font-weight:700;margin-top:4px}
.hl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
.hl .box{border:3px solid #111;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;box-shadow:4px 4px 0 #111}
.hl .fast{background:#C8F7C5}.hl .slow{background:#FFD6D6}
.hl small{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;margin-bottom:2px}
.hl .n{font-size:14px;font-weight:700;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hl .t{font-size:22px;font-weight:800}
.sec{margin-top:18px}.sec-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.sec-h h2{font-size:18px;background:#111;color:#FFE66D;padding:4px 12px;transform:rotate(-1deg)}
.badge{font-size:12px;font-weight:800;border:2px solid #111;background:#fff;padding:2px 8px;box-shadow:2px 2px 0 #111}
.pkg{border:3px solid #111;margin-bottom:12px;box-shadow:5px 5px 0 #111;overflow:hidden}
.pkg.c0{background:#FFF3B0}.pkg.c1{background:#CFFAFE}.pkg.c2{background:#FCE7F3}.pkg.c3{background:#EDE9FE}
.pkg-h{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:3px solid #111;font-size:14px;font-weight:700;background:rgba(255,255,255,.55)}
.list{padding:8px}.row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border:2px solid #111;background:#fff}
.row:last-child{margin-bottom:0}.row.fail{background:#FFE4E6}
.name{font-size:13px;font-weight:700}.err{font-size:11px;color:#B91C1C;margin-top:2px;font-weight:600}
.ms{font-size:12px;font-weight:800;border:2px solid #111;padding:2px 8px;white-space:nowrap}
.ms.fast{background:#86EFAC}.ms.mid{background:#FDE68A}.ms.slow{background:#FCA5A5}
</style>
</head><body><div class="wrap"><div class="card">
  <div class="head">
    <h1><span>插件加载报告</span></h1>
    <div class="meta">XRK-Yunzai<br><b>${rate}%</b> 成功 · 均 <b>${avgMs}ms</b> · 慢速 <b>${slowCount}</b></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="v">${(stats.totalLoadTime / 1000).toFixed(2)}</div><div class="l">总耗时(秒)</div></div>
    <div class="stat"><div class="v">${success.length}</div><div class="l">成功</div></div>
    <div class="stat"><div class="v">${failed.length}</div><div class="l">失败</div></div>
    <div class="stat"><div class="v">${stats.taskCount || 0}</div><div class="l">定时任务</div></div>
  </div>
  ${success.length ? `
  <div class="hl">
    <div class="box fast"><div><small>最快</small><div class="n">${fastest?.name || '-'}</div></div><div class="t">${fastest?.loadTime.toFixed(1) || '0'}ms</div></div>
    <div class="box slow"><div><small>最慢</small><div class="n">${slowest?.name || '-'}</div></div><div class="t">${slowest?.loadTime.toFixed(1) || '0'}ms</div></div>
  </div>` : ''}
  ${packages.length ? section('插件包', `${packages.length} 个`, pkgBlocks) : ''}
  ${single.length ? section('单 JS', `${single.length} 个`, `<div class="list">${single.map(p => this.renderPlugin(p)).join('')}</div>`) : ''}
  ${failed.length ? section('加载失败', `${failed.length} 个`, `<div class="list">${failBlocks}</div>`) : ''}
</div></div></body></html>`
  }

  renderPlugin(plugin) {
    const name = plugin.name.includes('/') ? plugin.name.split('/').pop() : plugin.name
    const tone = plugin.loadTime < 10 ? 'fast' : plugin.loadTime < 50 ? 'mid' : 'slow'
    return `<div class="row"><div class="name">${name}</div><span class="ms ${tone}">${plugin.loadTime.toFixed(1)}ms</span></div>`
  }

  groupPluginsByPackage(plugins) {
    const map = new Map()
    for (const p of plugins) {
      if (!p.name.includes('/')) continue
      const name = p.name.split('/')[0]
      let pkg = map.get(name)
      if (!pkg) {
        pkg = { name, plugins: [], totalTime: 0 }
        map.set(name, pkg)
      }
      pkg.plugins.push(p)
      pkg.totalTime += p.loadTime
    }
    return [...map.values()].sort((a, b) => b.totalTime - a.totalTime)
  }
}