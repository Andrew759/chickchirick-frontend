const API = '/api/messages'

/**
 * @param {{ peerId?: number, groupUuid?: string, channelUuid?: string }} scope
 */
export async function fetchPins(scope = {}) {
  const qs = new URLSearchParams()
  if (scope.peerId) qs.set('peer_id', String(scope.peerId))
  if (scope.groupUuid) qs.set('group_uuid', scope.groupUuid)
  if (scope.channelUuid) qs.set('channel_uuid', scope.channelUuid)
  const res = await fetch(`${API}/messages/pins?${qs}`, { credentials: 'include' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `fetch pins failed: ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data.pins) ? data.pins : []
}

export async function pinMessage(messageId) {
  const id = encodeURIComponent(String(messageId))
  const res = await fetch(`${API}/messages/${id}/pin`, {
    method: 'PUT',
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `pin failed: ${res.status}`)
  }
  return res.json()
}

export async function unpinMessage(messageId, scope = {}) {
  const id = encodeURIComponent(String(messageId))
  const qs = new URLSearchParams()
  if (scope.peerId) qs.set('peer_id', String(scope.peerId))
  if (scope.groupUuid) qs.set('group_uuid', scope.groupUuid)
  if (scope.channelUuid) qs.set('channel_uuid', scope.channelUuid)
  const q = qs.toString()
  const res = await fetch(`${API}/messages/${id}/pin${q ? `?${q}` : ''}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `unpin failed: ${res.status}`)
  }
  return res.json()
}
