/**
 * 启动 CLI：server / stop 与端口解析（app.js 引导与 start.js 共用）
 */

/**
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ command: string | null, port: number | null }}
 */
export function resolveStartCommand(argv = process.argv, env = process.env) {
  const envPort = env.XRK_SERVER_PORT
  let command = argv[2] || null

  if (
    !command &&
    envPort &&
    !Number.isNaN(Number.parseInt(envPort, 10)) &&
    (env.DISABLE_CONSOLE === 'true' || !process.stdin.isTTY)
  ) {
    command = 'server'
  }

  const portRaw = argv[3] || envPort
  const port = portRaw != null && String(portRaw).trim() !== ''
    ? Number.parseInt(String(portRaw), 10)
    : NaN

  return {
    command,
    port: Number.isFinite(port) ? port : null,
  }
}

/** 是否走 server 引导（查依赖） */
export function isServerBootstrap(argv = process.argv, env = process.env) {
  return resolveStartCommand(argv, env).command === 'server'
}
