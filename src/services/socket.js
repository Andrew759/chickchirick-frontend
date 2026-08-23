let socket = null
let listeners = []
let reconnectTimer = null
let currentToken = null

/**
 * Подключение к WebSocket.
 * @param {string} [token] — access_token (передаётся в query, т.к. cookie с другого origin часто не уходит)
 */
export function connectSocket(token) {
    if (token) {
        currentToken = token
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return
    }

    const params = new URLSearchParams()
    if (currentToken && currentToken !== 'cookie-session') {
        params.set('token', currentToken)
    }

    const qs = params.toString()
    const url = qs ? `ws://localhost:83/ws?${qs}` : 'ws://localhost:83/ws'

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

    socket.onclose = () => {
        console.log('WS disconnected')
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