<template>
  <Transition name="global-player">
    <div v-if="player.hasTrack" class="global-player" :class="[player.kind === 'voice' ? 'is-voice' : 'is-music', { playing: player.playing }]">
      <div class="player-glow" aria-hidden="true"></div>

      <button
        type="button"
        class="btn-toggle"
        :title="player.playing ? 'Пауза' : 'Воспроизвести'"
        @click="player.toggle()"
      >
        <svg v-if="!player.playing" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <path fill="currentColor" d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
        </svg>
      </button>

      <div class="track-kind-icon" aria-hidden="true">
        <svg v-if="player.kind === 'voice'" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H8v2h8v-2h-3v-3.08A7 7 0 0 0 19 11h-2Z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M14 4v11.1A4 4 0 1 1 12 12V6h8V4h-6Z"/>
        </svg>
      </div>

      <div class="track-info">
        <div class="eyebrow">{{ player.kind === 'voice' ? 'Голосовое сообщение' : 'Музыка' }}</div>
        <div class="title" :title="player.title">{{ player.title || (player.kind === 'voice' ? 'Голосовое сообщение' : 'Трек') }}</div>
      </div>

      <div class="visualizer" aria-hidden="true">
        <span v-for="(band, i) in player.bands" :key="i" :style="{ height: `${Math.max(4, band * 24)}px` }"></span>
      </div>

      <div class="timeline" @click="seekBar">
        <div class="bar"><div class="fill" :style="{ width: pct + '%' }"></div></div>
        <div class="time">{{ formatTime(player.currentTime) }} / {{ formatTime(player.duration) }}</div>
      </div>

      <button
        type="button"
        class="btn-next"
        :disabled="!player.hasNext"
        :title="player.hasNext ? 'Следующее' : 'Нет следующего элемента'"
        @click="player.next()"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path fill="currentColor" d="M5 5v14l10-7L5 5zm11 0h3v14h-3V5z" />
        </svg>
      </button>

      <button
        type="button"
        class="btn-repeat"
        :class="{ active: player.repeat }"
        :title="player.repeat ? 'Повтор включён' : 'Повторить трек'"
        :aria-pressed="player.repeat"
        @click="player.toggleRepeat()"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 0 0-7.75 6h2.06A6 6 0 0 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4zM6.35 17.65A7.96 7.96 0 0 0 12 20a8 8 0 0 0 7.75-6h-2.06A6 6 0 0 1 12 18c-1.66 0-3.14-.69-4.22-1.78L11 13H4v7z"/>
        </svg>
      </button>

      <button type="button" class="btn-stop" title="Закрыть плеер" @click="player.stop()">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path fill="currentColor" d="M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'

const player = usePlayerStore()

const pct = computed(() => {
  if (!player.duration) return 0
  return Math.min(100, (player.currentTime / player.duration) * 100)
})

function seekBar(e) {
  const bar = e.currentTarget.querySelector('.bar')
  if (!bar || !player.duration) return
  const rect = bar.getBoundingClientRect()
  player.seek((e.clientX - rect.left) / rect.width)
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.global-player {
  position: relative;
  z-index: 50;
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  overflow: hidden;
  color: #fff;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 14px 40px rgba(15, 23, 42, .26), 0 2px 10px rgba(15,23,42,.16);
  backdrop-filter: blur(16px);
}

.player-glow {
  position: absolute;
  inset: auto 15% -45px 15%;
  height: 80px;
  border-radius: 50%;
  background: transparent;
  filter: none;
  pointer-events: none;
}

.btn-toggle, 
.btn-repeat {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: rgba(42,171,238,.7);
  background: rgba(42,171,238,.08);
  transition: transform .15s ease, background .15s ease, color .15s ease;
}

.btn-next {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: rgba(42,171,238,.7);
  background: rgba(42,171,238,.08);
  transition: transform .15s ease, background .15s ease, color .15s ease, opacity .15s ease;
}

.btn-next:hover:not(:disabled) {
  transform: scale(1.04);
  color: #2aabee;
  background: rgba(42,171,238,.14);
}

.btn-next:disabled {
  cursor: default;
  opacity: .35;
}

.btn-repeat:hover {
  transform: scale(1.04);
  color: #2aabee;
  background: rgba(42,171,238,.14);
}

.btn-repeat.active {
  color: #fff;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  box-shadow: 0 5px 16px rgba(42,171,238,.22);
}

.btn-stop {
  position: relative;
  z-index: 1;
  border: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #fff;
}

.btn-toggle {
  color: #fff;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  box-shadow: 0 6px 18px rgba(42,171,238,.28);
}

.btn-toggle:hover { transform: scale(1.04); }


.btn-repeat {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: rgba(42,171,238,.7);
  background: rgba(42,171,238,.08);
  transition: transform .15s ease, background .15s ease, color .15s ease;
}

.btn-repeat:hover {
  transform: scale(1.04);
  color: #2aabee;
  background: rgba(42,171,238,.14);
}

.btn-repeat.active {
  color: #fff;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  box-shadow: 0 5px 16px rgba(42,171,238,.22);
}

.btn-stop {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #38bdf8, #2aabee);
  color: rgba(255,255,255,.65);
}

.btn-stop:hover { background:#ea0038; color: gray; }

.track-kind-icon {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
}

.is-music .track-kind-icon {
  color: #2aabee;
  background: rgba(42,171,238,.11);
}

.is-voice .track-kind-icon {
  color: #7c3aed;
  background: rgba(124,58,237,.11);
}

.is-voice .btn-toggle {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 6px 18px rgba(124,58,237,.25);
}

.is-voice .visualizer span {
  background: linear-gradient(to top, #7c3aed, #c4b5fd);
}

.is-voice .fill {
  background: linear-gradient(90deg, #7c3aed, #a78bfa);
}

.is-voice .eyebrow {
  color: #7c3aed;
}

.track-info {
  position: relative;
  z-index: 1;
  width: min(250px, 24vw);
  min-width: 120px;
}

.eyebrow {
  margin-bottom: 2px;
  color: black;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
  color: gray;
}

.visualizer {
  position: relative;
  z-index: 1;
  width: 68px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.visualizer span {
  width: 3px;
  min-height: 4px;
  border-radius: 5px;
  background: linear-gradient(to top, #2aabee, #7dd3fc);
  opacity: .9;
  transition: height .08s linear;
}

.timeline {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 80px;
  cursor: pointer;
}

.bar {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,.13);
}

.fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2aabee, #7dd3fc);
}

.time {
  margin-top: 4px;
  color: gray;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.global-player-enter-active, .global-player-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.global-player-enter-from, .global-player-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

@media (max-width: 760px) {
  .global-player {
    width: 100%;
  }
  .track-info { width: 30vw; }
  .visualizer { display: none; }
}
</style>
