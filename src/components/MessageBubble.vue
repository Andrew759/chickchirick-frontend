<template>
  <div :class="['bubble', msg.fromMe ? 'me' : '']">
    <div class="bubble-row">
      <div class="content">
        <div v-if="msg.fileUuid" class="attachment">
          <button
            v-if="msg.isImage"
            type="button"
            class="img-link"
            @click.stop="$emit('open-photo', msg)"
          >
            <img
              :src="fileUrl"
              :alt="msg.fileName || 'image'"
              class="msg-image"
              loading="lazy"
            />
          </button>
          <VideoNotePlayer
            v-else-if="msg.isVideoNote"
            :src="fileUrl"
            @click.stop
          />
          <button
            v-else-if="msg.isVideo"
            type="button"
            class="video-link"
            @click.stop="$emit('open-video', msg)"
          >
            <video
              :src="fileUrl"
              class="msg-video-preview"
              muted
              preload="metadata"
              playsinline
            />
            <span class="video-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
          <VoiceMessagePlayer
            v-else-if="msg.isVoiceMessage"
            :src="fileUrl"
            :from-me="msg.fromMe"
            :queue="queue"
          />
          <AudioPlayer
            v-else-if="msg.isAudio"
            :src="fileUrl"
            :file-name="msg.fileName || 'audio'"
            :from-me="msg.fromMe"
          />
          <a
            v-else
            :href="fileUrl"
            :download="msg.fileName || 'file'"
            target="_blank"
            rel="noopener"
            class="file-link"
          >
            📄 {{ msg.fileName || 'Файл' }}
          </a>
        </div>
        <div v-if="msg.text" class="text">{{ msg.text }}</div>
      </div>
      <button
        v-if="msg.fromMe"
        type="button"
        class="btn-delete"
        title="Удалить сообщение"
        @click.stop="$emit('delete', msg)"
      >
        ×
      </button>
    </div>
    <div class="time">{{ timeLabel }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMessageTime } from '../stores/chat'
import { getFileUrl } from '../services/files'
import AudioPlayer from './AudioPlayer.vue'
import VoiceMessagePlayer from './VoiceMessagePlayer.vue'
import VideoNotePlayer from './VideoNotePlayer.vue'

const props = defineProps({
  msg: { type: Object, required: true },
  queue: { type: Array, default: () => [] }
})

defineEmits(['open-photo', 'open-video', 'delete'])

const fileUrl = computed(() => getFileUrl(props.msg.fileUuid))
const timeLabel = computed(() => formatMessageTime(props.msg.createdAt) || '·')
</script>

<style scoped>
.bubble {
  position: relative;
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .06);
  align-self: flex-start;
  word-break: break-word;
}

.bubble.me {
  align-self: flex-end;
  background: linear-gradient(135deg, #dff6ff, #c9efff);
}

.bubble-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.content {
  min-width: 0;
  flex: 1;
}

.text {
  font-size: 14.5px;
  line-height: 1.35;
  color: #163247;
  white-space: pre-wrap;
}

.time {
  font-size: 11px;
  color: #6d8796;
  text-align: right;
  margin-top: 2px;
}

.btn-delete {
  opacity: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #8aa1ae;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;
}

.bubble:hover .btn-delete,
.bubble:focus-within .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #e11d48;
}

.msg-image {
  max-width: min(100%, 320px);
  border-radius: 10px;
  display: block;
}

.img-link,
.video-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: block;
}

.msg-video-preview {
  max-width: min(100%, 320px);
  border-radius: 10px;
  display: block;
}

.video-link {
  position: relative;
}

.video-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, .25);
  border-radius: 10px;
}

.file-link {
  color: #168dcc;
  text-decoration: none;
  font-size: 14px;
  word-break: break-all;
}

.file-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .bubble {
    max-width: 88%;
  }
  .msg-image,
  .msg-video-preview {
    max-width: min(100%, 280px);
  }
  .bubble.me .btn-delete {
    opacity: 0.55;
  }
}
</style>
