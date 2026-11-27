/**
 * Тема интерфейса: light | dark | system
 * system / отсутствие ключа → prefers-color-scheme
 */

export const THEME_KEY = 'messenger-theme'

/** @returns {'light'|'dark'|'system'} */
export function getThemePreference() {
  const raw = localStorage.getItem(THEME_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

/** @returns {'light'|'dark'} */
export function resolveTheme(preference = getThemePreference()) {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/** @param {'light'|'dark'|'system'} preference */
export function applyTheme(preference) {
  const resolved = resolveTheme(preference)
  document.documentElement.dataset.theme = resolved
  return resolved
}

/** Применить сохранённую / системную тему (до mount). */
export function initTheme() {
  const pref = getThemePreference()
  return applyTheme(pref)
}

/**
 * Следить за сменой системной темы, пока preference === 'system'.
 * @returns {() => void} unsubscribe
 */
export function watchSystemTheme(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getThemePreference() === 'system') {
      const resolved = applyTheme('system')
      onChange?.(resolved)
    }
  }
  if (mq.addEventListener) mq.addEventListener('change', handler)
  else mq.addListener(handler)
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', handler)
    else mq.removeListener(handler)
  }
}
