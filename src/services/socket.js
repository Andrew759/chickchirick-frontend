let socket = null
let listeners = []
let reconnectTimer = null

/**
 * Подключение к WebSocket messages-сервиса.
 * Авторизация — cookie access_token (браузер шлёт на localhost:* сам).
 * Подключаемся напрямую на :8085, минуя Vite-прокси (upgrade через proxy часто ломается).
 */
export function connectSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return
    }

    // Важно: hostname = "localhost", не "127.0.0.1"
    // Cookie выставляется на host localhost и не уходит на 127.0.0.1
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//localhost:8085/ws`

    socket = new WebSocket(url)

    socket.onopen = () => {
        console.log('WS connected')
    }

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            if (data.error) {
                console.error('WS server error:', data.error)
                return
            }
            listeners.forEach(cb => cb(data))
        } catch (error) {
            console.error('Invalid WS message:', error)
        }
    }

    socket.onerror = (err) => {
        console.error('WS error:', err)
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
        listeners = listeners.filter(listener => listener !== cb)
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

export function sendMessage(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data))
    } else {
        console.warn('WS not open, message not sent:', data)
    }
}

export function disconnectSocket() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
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
