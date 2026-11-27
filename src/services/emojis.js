let cache = null

export function getAllEmojis() {
    if (cache) return cache

    const emojis = []

    // Функция добавления диапазона
    const addRange = (start, end) => {
        for (let i = start; i <= end; i++) {
            try {
                // Пропускаем невалидные суррогатные пары, если они попадутся
                emojis.push(String.fromCodePoint(i))
            } catch (e) {
                // ignore
            }
        }
    }

    // Основные блоки эмодзи
    addRange(0x1F600, 0x1F64F) // Смайлики (Emoticons)
    addRange(0x1F300, 0x1F5FF) // Символы и пиктограммы
    addRange(0x1F680, 0x1F6FF) // Транспорт и карты
    addRange(0x1F700, 0x1F77F) // Алхимические символы
    addRange(0x1F780, 0x1F7FF) // Геометрические фигуры extended
    addRange(0x1F800, 0x1F8FF) // Дополнительные стрелки-C
    addRange(0x1F900, 0x1F9FF) // Дополнительные символы и пиктограммы
    addRange(0x1FA00, 0x1FA6F) // Шахматы
    addRange(0x1FA70, 0x1FAFF) // Символы и пиктограммы extended-A
    addRange(0x2600, 0x26FF)   // Разные символы
    addRange(0x2700, 0x27BF)   // Дингбаты
    addRange(0x1F1E6, 0x1F1FF) // Флаги (региональные индикаторы)

    // Фильтруем пустые/невидимые символы
    cache = emojis.filter(Boolean)
    return cache
}