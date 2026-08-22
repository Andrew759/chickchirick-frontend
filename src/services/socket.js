let socket = null
let listeners = []
let reconnectTimer = null

export function connectSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return
    }

    socket = new WebSocket('ws://localhost:8085/ws')

    socket.onopen = () => {
        console.log('WS connected')
    }

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data)
            listeners.forEach(cb => cb(data))
        } catch (error) {
            console.error('Invalid WS message:', error)
        }
    }

    socket.onclose = () => {
        console.log('WS disconnected')
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
    }
}
