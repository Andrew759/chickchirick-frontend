const API = '/api/messages'

/**
 * @param {number[]} messageIds
 * @returns {Promise<Record<number, Array<{emoji:string,count:number,me:boolean}>>>}
 */
export async function fetchReactionsBatch(messageIds) {
  const ids = [...new Set((messageIds || []).map(Number).filter((n) => n > 0))]
  if (!ids.length) return {}
  const res = await fetch(`${API}/messages/reactions?ids=${ids.join(',')}`, {
    credentials: 'include'
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `reactions batch failed: ${res.status}`)
  }
  const data = await res.json()
  const map = {}
  for (const item of data.items || []) {
    const mid = Number(item.messageId)
    if (mid) map[mid] = item.reactions || []
  }
  return map
}

/**
 * Toggle reaction on message.
 * @returns {Promise<{messageId:number,action:string,emoji:string,reactions:Array}>}
 */
export async function toggleReaction(messageId, emoji) {
  const id = encodeURIComponent(String(messageId))
  const res = await fetch(`${API}/messages/${id}/reactions`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `toggle reaction failed: ${res.status}`)
  }
  return res.json()
}

export const QUICK_REACTION_EMOJIS = [
  // реакции
  '👍', '👎', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕',
  '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '🤗', '🤔', '🤨',
  '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱',
  '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲',
  '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯',
  '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒',
  '🤢', '🤮', '🥴', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽',
  // жесты
  '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
  '👈', '👉', '👆', '👇', '☝️', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
  '🙏', '✍️', '💅', '🤳', '💪',
  // символы / статус
  '🔥', '✨', '⭐', '🌟', '💥', '💯', '✅', '❌', '⚠️', '🚀', '🎉', '🎊', '🏆',
  '🥇', '🎯', '💡', '📌', '🔔', '💤', '🍻', '☕', '🍕', '🎂', '🌹', '🍀', '🌈'
]
