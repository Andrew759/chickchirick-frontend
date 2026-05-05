let socket = null
let listeners = []

export function connectSocket(token) {
    socket = new WebSocket(`ws://localhost:8085/ws?token=${token}`)

    socket.onopen = () => {
        console.log('WS connected')
    }

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        listeners.forEach(cb => cb(data))
    }

    socket.onclose = () => {
        console.log('WS reconnect...')
        setTimeout(() => connectSocket(token), 2000)
    }
}

export function subscribe(cb) {
    listeners.push(cb)
}

export function sendMessage(data) {
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(data))
    }
}