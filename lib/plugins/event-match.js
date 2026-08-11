/**
 * 插件事件名匹配（与 adapter / protocol / 自由别名解耦）
 * 无协议白名单；protocol、e.events 均为开发者自由字符串。
 */

/** @param {object} e */
export function resolveEventProtocol(e) {
  if (typeof e?.protocol === 'string' && e.protocol) return e.protocol
  if (typeof e?.adapter === 'string' && e.adapter) return e.adapter
  if (e?.adapter_id != null && e.adapter_id !== '') return String(e.adapter_id)
  return ''
}

/**
 * @param {object} e
 * @param {Record<string, string[]>} [eventMap]
 */
export function buildEventTypePath(e, eventMap = {}) {
  const postType = e?.post_type || ''
  const keys = eventMap[postType] || []
  return keys.map((key) => e[key]).filter(Boolean).join('.') || ''
}

function addPathPrefixes(names, path) {
  if (!path) return
  const parts = path.split('.')
  for (let i = parts.length; i >= 1; i--) names.add(parts.slice(0, i).join('.'))
}

function addFreeAliases(names, e) {
  const raw = e?.events ?? e?.eventAliases
  if (raw == null) return
  for (const item of Array.isArray(raw) ? raw : [raw]) {
    if (typeof item === 'string' && item) names.add(item)
  }
}

/**
 * @param {object} e
 * @param {{ eventMap?: Record<string, string[]>, asMessage?: boolean }} [opts]
 * @returns {string[]}
 */
export function collectMatchedEventNames(e, opts = {}) {
  const eventMap = opts.eventMap || {}
  const names = new Set()
  const path = buildEventTypePath(e, eventMap)
  addPathPrefixes(names, path)

  const post = e?.post_type || ''
  const isMsg = post === 'message'
    || (post === 'device' && (e.event_type === 'message' || path === 'device.message' || path.endsWith('.message')))
    || (!path && opts.asMessage === true)

  if (isMsg) {
    names.add('message')
    if (e.message_type === 'group' || path.startsWith('message.group') || path === 'device.message') {
      names.add('message.group')
    }
    if (e.message_type === 'private' || path.startsWith('message.private')) {
      names.add('message.private')
    }
  } else if (post === 'notice') {
    names.add('notice')
  } else if (post === 'request') {
    names.add('request')
  }

  const protocol = resolveEventProtocol(e)
  if (protocol) {
    if (post) names.add(`${protocol}.${post}`)
    if (isMsg) names.add(`${protocol}.message`)
    if (names.has('notice')) names.add(`${protocol}.notice`)
    if (names.has('request')) names.add(`${protocol}.request`)
  }

  addFreeAliases(names, e)
  return [...names]
}

/**
 * @param {object} e
 * @param {string|string[]|undefined|null} pluginEvent
 * @param {{ eventMap?: Record<string, string[]>, asMessage?: boolean }} [opts]
 */
export function matchPluginEvent(e, pluginEvent, opts = {}) {
  if (!pluginEvent) return true
  const want = Array.isArray(pluginEvent) ? pluginEvent : [pluginEvent]
  const matched = collectMatchedEventNames(e, opts)
  const path = buildEventTypePath(e, opts.eventMap)
  return want.some((evt) => {
    if (typeof evt !== 'string' || !evt) return false
    if (matched.includes(evt)) return true
    return Boolean(path && evt.endsWith('*') && path.startsWith(evt.slice(0, -1)))
  })
}
