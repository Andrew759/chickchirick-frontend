import { defineStore } from 'pinia'

/**
 * Глобальный аудиоплеер: музыка из профиля играет в фоне
 * при переходе в чаты и т.д.
 */
export const usePlayerStore = defineStore('player', {
  state: () => ({
    /** @type {string|null} */
    src: null,
    title: '',
    kind: 'music',
    playing: false,
    repeat: false,
    currentTime: 0,
    duration: 0,
    /** уровни 0..1 для визуализатора (обновляются ~30–60 fps) */
    bands: [0, 0, 0, 0, 0, 0, 0, 0],
    /** Очередь текущего контекста: музыка профиля или голосовые сообщения чата. */
    queue: [],
    queueIndex: -1
  }),

  getters: {
    hasTrack: (s) => !!s.src,
    hasNext: (s) => s.queue.length > 1 && s.queueIndex >= 0
  },

  actions: {
    /**
     * Внутренние ссылки на DOM/WebAudio (не в state — не реактивны).
     * Инициализируются лениво.
     */
    _ensureEngine() {
      if (this._audio) return

      const audio = new Audio()
      // same-origin через vite proxy — без crossOrigin, иначе нужен CORS на files
      audio.preload = 'metadata'

      audio.addEventListener('timeupdate', () => {
        this.currentTime = audio.currentTime || 0
      })
      audio.addEventListener('loadedmetadata', () => {
        const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0
        if (d > 0) {
          this.duration = d
          if (this.src) this._durationCache?.set(this.src, d)
        }
      })
      const syncDuration = () => {
        const d = Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity
          ? audio.duration
          : 0
        if (d > 0 && this.src) {
          this.duration = d
          this._durationCache?.set(this.src, d)
        }
      }
      audio.addEventListener('durationchange', syncDuration)
      audio.addEventListener('loadeddata', syncDuration)
      audio.addEventListener('canplay', syncDuration)
      audio.addEventListener('play', () => {
        this.playing = true
        // Playback is intentionally independent from Web Audio analysis.
        // The analyser is optional and must never be able to interfere with playback.
      })
      audio.addEventListener('pause', () => {
        this.playing = false
      })
      audio.addEventListener('ended', async () => {
        if (this.repeat && this.src) {
          try {
            audio.currentTime = 0
            this.currentTime = 0
            await audio.play()
          } catch (e) {
            console.warn('repeat play failed:', e)
            this.playing = false
            this._stopAnalyserLoop()
          }
          return
        }

        this.playing = false
        // Не сбрасываем duration: глобальный плеер должен продолжать показывать
        // полную длительность после завершения сообщения. Следующее нажатие
        // Play в toggle() начнёт трек заново с 0:00.
        this.currentTime = Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : this.duration
        this.bands = this.bands.map(() => 0)
        this._stopAnalyserLoop()
      })

      this._audio = audio
      this._ctx = null
      this._analyser = null
      this._source = null
      this._raf = 0
      this._data = null
      this._durationCache = new Map()
      this._durationPromises = new Map()
    },

    _startAnalyser() {
      this._ensureEngine()
      try {
        if (!this._ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext
          if (!Ctx) return
          this._ctx = new Ctx()
          this._analyser = this._ctx.createAnalyser()
          this._analyser.fftSize = 256
          this._analyser.smoothingTimeConstant = 0.75
          this._source = this._ctx.createMediaElementSource(this._audio)
          this._source.connect(this._analyser)
          this._analyser.connect(this._ctx.destination)
          this._data = new Uint8Array(this._analyser.frequencyBinCount)
        }
        if (this._ctx.state === 'suspended') {
          this._ctx.resume()
        }
        this._stopAnalyserLoop()
        const tick = () => {
          if (!this.playing || !this._analyser || !this._data) {
            this._raf = 0
            return
          }
          this._analyser.getByteFrequencyData(this._data)
          const bins = this._data
          const n = 8
          const chunk = Math.floor(bins.length / n)
          const next = []
          for (let i = 0; i < n; i++) {
            let sum = 0
            const start = i * chunk
            for (let j = start; j < start + chunk; j++) sum += bins[j] || 0
            // 0..1 с лёгким усилением средних
            next.push(Math.min(1, (sum / chunk / 255) * 1.35))
          }
          this.bands = next
          this._raf = requestAnimationFrame(tick)
        }
        this._raf = requestAnimationFrame(tick)
      } catch (e) {
        console.warn('analyser init failed:', e)
      }
    },

    _stopAnalyserLoop() {
      if (this._raf) {
        cancelAnimationFrame(this._raf)
        this._raf = 0
      }
    },

    /**
     * Надёжно определяет длительность удалённого голосового сообщения.
     * У MediaRecorder/WebM часто отсутствует duration в контейнере, поэтому
     * loadedmetadata может вернуть 0/Infinity. В таком случае декодируем Blob
     * через Web Audio и получаем точную длительность без изменения файла.
     * @param {string} src
     * @returns {Promise<number>}
     */
    async loadDuration(src) {
      if (!src) return 0
      this._ensureEngine()

      const cached = this._durationCache.get(src)
      if (Number.isFinite(cached) && cached > 0) return cached

      const pending = this._durationPromises.get(src)
      if (pending) return pending

      const promise = (async () => {
        // Сначала используем обычные media metadata — это дешёвая ветка.
        if (this.src === src && Number.isFinite(this._audio?.duration) && this._audio.duration > 0) {
          const d = this._audio.duration
          this._durationCache.set(src, d)
          this.duration = d
          return d
        }

        try {
          const response = await fetch(src, { credentials: 'include' })
          if (!response.ok) throw new Error(`Duration fetch failed: ${response.status}`)

          const blob = await response.blob()
          if (!blob.size) throw new Error('Empty audio response')

          // Первый fallback: отдельный media element иногда получает duration
          // из контейнера даже тогда, когда основной элемент ещё её не знает.
          const objectUrl = URL.createObjectURL(blob)
          try {
            const probe = document.createElement('audio')
            probe.preload = 'metadata'
            const metadataDuration = await new Promise((resolve) => {
              let settled = false
              const finish = (value) => {
                if (settled) return
                settled = true
                probe.removeAttribute('src')
                probe.load()
                resolve(value)
              }
              probe.addEventListener('loadedmetadata', () => {
                const d = Number(probe.duration)
                finish(Number.isFinite(d) && d > 0 ? d : 0)
              }, { once: true })
              probe.addEventListener('error', () => finish(0), { once: true })
              probe.src = objectUrl
            })
            if (metadataDuration > 0) {
              this._durationCache.set(src, metadataDuration)
              if (this.src === src) this.duration = metadataDuration
              return metadataDuration
            }
          } finally {
            URL.revokeObjectURL(objectUrl)
          }

          // Второй fallback: декодирование даёт точную длительность для WebM/Opus,
          // где duration может отсутствовать в metadata.
          const Ctx = window.AudioContext || window.webkitAudioContext
          if (!Ctx) throw new Error('Web Audio is unavailable')
          const buffer = await blob.arrayBuffer()
          const ctx = new Ctx()
          try {
            const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
            const d = Number(audioBuffer.duration)
            if (!Number.isFinite(d) || d <= 0) throw new Error('Decoded duration is invalid')

            this._durationCache.set(src, d)
            if (this.src === src) this.duration = d
            return d
          } finally {
            try { await ctx.close() } catch {}
          }
        } catch (e) {
          console.warn('voice duration detection failed:', e)
          return 0
        }
      })()

      this._durationPromises.set(src, promise)
      try {
        return await promise
      } finally {
        this._durationPromises.delete(src)
      }
    },

    /**
     * Сохранить длительность конкретного источника. Если этот источник
     * сейчас играет в глобальном плеере — обновляем и отображаемую длительность.
     * @param {string} src
     * @param {number} duration
     */
    setDuration(src, duration) {
      if (!src) return 0
      const d = Number(duration)
      if (!Number.isFinite(d) || d <= 0) return 0
      this._ensureEngine()
      this._durationCache.set(src, d)
      if (this.src === src) this.duration = d
      return d
    },

    /**
     * @param {{ src: string, title?: string, kind?: string, duration?: number, queue?: Array }} track
     */
    async play(track) {
      if (!track?.src) return
      this._ensureEngine()

      if (Array.isArray(track.queue) && track.queue.length) {
        this.queue = track.queue.filter((item) => item?.src)
        this.queueIndex = this.queue.findIndex((item) => item.src === track.src)
      } else if (!this.queue.length || !this.queue.some((item) => item.src === track.src)) {
        this.queue = [{
          src: track.src,
          title: track.title || 'Трек',
          kind: track.kind || 'music',
          duration: track.duration
        }]
        this.queueIndex = 0
      }

      const same = this.src === track.src
      const explicitDuration = Number(track.duration)
      const cachedDuration = this._durationCache.get(track.src)
      const knownDuration = Number.isFinite(explicitDuration) && explicitDuration > 0
        ? explicitDuration
        : (Number.isFinite(cachedDuration) && cachedDuration > 0 ? cachedDuration : 0)

      this.src = track.src
      this.title = track.title || 'Трек'
      this.kind = track.kind || this.kind || 'music'

      if (!same) {
        this._audio.pause()
        this._audio.src = track.src
        this.currentTime = 0
        // Do not let a new source erase a duration already known by the
        // voice-message component. It will be replaced if the browser
        // reports a better value through metadata/durationchange.
        this.duration = knownDuration
      } else if (knownDuration > 0) {
        this.duration = knownDuration
      }

      if (knownDuration > 0) {
        this._durationCache.set(track.src, knownDuration)
      } else if (this.kind === 'voice') {
        this.loadDuration(track.src).catch(() => {})
      }

      // A finished track must restart from the beginning when Play is pressed.
      if (same && this._audio.ended) {
        this._audio.currentTime = 0
        this.currentTime = 0
      }

      try {
        await this._audio.play()
        // The avatar equalizer is driven by the same global audio element.
        // Start the analyser only after playback has successfully started so
        // it can never block or replace the actual audio playback.
        this._startAnalyser()
      } catch (e) {
        console.warn('play failed:', e)
        this.playing = false
      }
    },

    pause() {
      this._ensureEngine()
      this._audio.pause()
    },

    async toggle(track) {
      this._ensureEngine()
      if (track?.src && track.src !== this.src) {
        await this.play(track)
        return
      }
      if (this.playing) {
        this.pause()
      } else if (this.src) {
        if (this.duration > 0 && this.currentTime >= this.duration - 0.15) {
          this._audio.currentTime = 0
          this.currentTime = 0
        }
        await this.play({ src: this.src, title: this.title, kind: this.kind, duration: this.duration })
      } else if (track?.src) {
        await this.play(track)
      }
    },

    /** Перейти к следующему элементу текущей очереди. Очередь циклическая. */
    async next() {
      this._ensureEngine()
      if (!this.queue.length) return

      let index = this.queueIndex
      if (index < 0 || index >= this.queue.length) {
        index = this.queue.findIndex((item) => item?.src === this.src)
        if (index < 0) index = 0
      }

      if (this.queue.length === 1) return

      const nextIndex = (index + 1) % this.queue.length
      const nextTrack = this.queue[nextIndex]
      this.queueIndex = nextIndex
      await this.play({ ...nextTrack, queue: this.queue })
    },

    toggleRepeat() {
      this.repeat = !this.repeat
    },

    seek(ratio) {
      this._ensureEngine()
      if (!this.duration) return
      const t = Math.min(1, Math.max(0, ratio)) * this.duration
      this._audio.currentTime = t
      this.currentTime = t
    },

    stop() {
      this._ensureEngine()
      this._audio.pause()
      this._audio.removeAttribute('src')
      this._audio.load()
      this.src = null
      this.title = ''
      this.kind = 'music'
      this.playing = false
      this.currentTime = 0
      this.duration = 0
      this.bands = this.bands.map(() => 0)
      this.queue = []
      this.queueIndex = -1
      this._stopAnalyserLoop()
    }
  }
})
