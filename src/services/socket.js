let socket = null
let listeners = []
let reconnectTimer = null
/** @type {object[]} */
const outboundQueue = []

function wsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // same-origin через Vite proxy (/messages-ws → :8085/ws)
  return `${protocol}//${window.location.host}/messages-ws`
}

function flushQueue() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  while (outboundQueue.length) {
    const data = outboundQueue.shift()
    try {
      socket.send(JSON.stringify(data))
    } catch (e) {
      console.error('WS send failed:', e)
      outboundQueue.unshift(data)
      break
    }
  }
}

/**
 * Подключение к WebSocket messages-сервиса.
 * URL same-origin → Vite proxy → :8085/ws.
 * Авторизация только cookie access_token.
 */
export function connectSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  const url = wsUrl()
  console.log('WS connecting…', url)
  socket = new WebSocket(url)

  socket.onopen = () => {
    console.log('WS connected', url)
    flushQueue()
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.error) {
        console.error('WS server error:', data.error)
        return
      }
      listeners.forEach((cb) => cb(data))
    } catch (error) {
      console.error('Invalid WS message:', error)
    }
  }

  socket.onerror = (err) => {
    console.error('WS error (проверьте api-messages :8085 и proxy Vite):', err)
  }

  socket.onclose = (event) => {
    console.log('WS disconnected', event.code, event.reason || '')
    socket = null
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connectSocket()
      }, 2000)
    }
  }
}

export function subscribe(cb) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((listener) => listener !== cb)
  }
}

export function sendTyping(recipientId, typing) {
  const id = Number(recipientId)
  if (!id) return
  sendMessage({
    type: 'typing',
    recipientId: id,
    text: typing ? '1' : '0'
  })
}

/**
 * Отправка. Если сокет ещё не OPEN — кадр в очередь и connect.
 * @returns {boolean} true если ушло сразу или поставлено в очередь
 */
export function sendMessage(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data))
    return true
  }

  // typing не копятся
  if (data?.type === 'typing') {
    connectSocket()
    return false
  }

  outboundQueue.push(data)
  connectSocket()
  console.warn('WS not open yet, message queued:', data)
  return true
}

export function disconnectSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  outboundQueue.length = 0
  if (socket) {
    socket.close()
    socket = null
  }
}

/**
 * Запрос на удаление сообщения через REST messages-сервиса.
 * @param {number|string} messageId
 * @returns {Promise<boolean>}
 */
export async function requestDeleteMessage(messageId) {
  const id = Number(messageId)
  if (!id) {
    console.warn('requestDeleteMessage: invalid id', messageId)
    return false
  }

  const res = await fetch(`/api/messages/message/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = data.error || data.errors?.[0]?.message || `Delete failed: ${res.status}`
    throw new Error(msg)
  }
  return true
}
