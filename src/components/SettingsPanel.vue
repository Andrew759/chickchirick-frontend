<template>
  <section class="settings-drawer" role="region" aria-label="Настройки">
    <header class="settings-head">
      <button class="settings-back" type="button" @click="$emit('close')" aria-label="Назад">← Назад</button>
      <h2>Настройки</h2>
      <button class="settings-close" type="button" @click="$emit('close')" aria-label="Закрыть">×</button>
    </header>

    <div class="settings-content">
      <div class="appearance-content">
        <div class="appearance-label">Тема интерфейса</div>
        <div class="theme-choice">
          <button type="button" class="theme-card" :class="{ selected: theme === 'light' }"
            :aria-pressed="theme === 'light'" @click="$emit('change-theme', 'light')">
            <span class="theme-preview light-preview">☼</span>
            <span>Светлая</span>
            <span v-if="theme === 'light'" class="theme-check">✓</span>
          </button>
          <button type="button" class="theme-card" :class="{ selected: theme === 'dark' }"
            :aria-pressed="theme === 'dark'" @click="$emit('change-theme', 'dark')">
            <span class="theme-preview dark-preview">☾</span>
            <span>Тёмная</span>
            <span v-if="theme === 'dark'" class="theme-check">✓</span>
          </button>
        </div>
        <p class="appearance-help">Выберите оформление, которое будет использоваться во всём мессенджере.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({ theme: { type: String, default: 'light' } })
defineEmits(['close', 'change-theme'])
</script>

<style scoped>
.settings-drawer{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;min-height:0;background:#fff;color:#203244}
.settings-head{height:58px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid #e4edf4;background:#f8fbfe}
.settings-back,.settings-close{border:0;background:transparent;color:#2aabee;cursor:pointer;font:inherit}
.settings-back{font-size:13px;font-weight:600;white-space:nowrap}
.settings-head h2{flex:1;text-align:center;font-size:17px;margin:0}
.settings-close{font-size:25px;width:30px}
.settings-content{overflow:auto;min-height:0;padding:14px 14px 24px}
.settings-profile{display:flex;align-items:center;gap:12px;padding:8px 2px 18px;border-bottom:1px solid #e6edf3}
.settings-avatar{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#2aabee;color:#fff;font-size:23px;font-weight:700}
.settings-profile strong{font-size:14px}.settings-profile p{margin:5px 0 0;color:#718397;font-size:12px}
.settings-section{width:100%;display:flex;align-items:center;gap:12px;padding:14px 10px;border:0;border-radius:10px;background:#eaf6fd;color:#168dcc;text-align:left;font:inherit;font-weight:700;margin-top:14px}
.settings-section-icon{font-size:19px}.settings-chevron{margin-left:auto}
.appearance-content{padding:16px 8px 18px}
.appearance-label{font-size:13px;font-weight:700;margin-bottom:12px}
.theme-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.theme-card{position:relative;min-height:92px;border:1px solid #dce6ee;border-radius:12px;background:#f8fafc;color:#526579;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:13px;cursor:pointer}
.theme-card.selected{border:2px solid #2aabee;background:#edf8ff;color:#168dcc;font-weight:700}
.theme-preview{font-size:25px;line-height:1}.dark-preview{color:#2aabee}.theme-check{position:absolute;right:7px;top:6px;color:#fff;background:#2aabee;border-radius:50%;width:19px;height:19px;display:grid;place-items:center;font-size:12px}
.appearance-help{font-size:12px;line-height:1.5;color:#8293a3;margin:12px 0 0}
.settings-row{display:flex;align-items:center;gap:13px;padding:15px 10px;border-top:1px solid #e6edf3;font-size:14px}
.settings-row>span{font-size:21px;color:#8293a3}.settings-row div{display:flex;flex-direction:column;gap:4px;flex:1}.settings-row small{color:#8293a3}.settings-row b{font-size:20px;color:#8293a3}
:global(html[data-theme="dark"]) .settings-drawer{background:#1a222c;color:#e6edf3}
:global(html[data-theme="dark"]) .settings-head{background:#14202b;border-color:#2a333e}
:global(html[data-theme="dark"]) .settings-head h2,:global(html[data-theme="dark"]) .settings-profile strong,:global(html[data-theme="dark"]) .appearance-label,:global(html[data-theme="dark"]) .settings-row strong{color:#e6edf3}
:global(html[data-theme="dark"]) .settings-profile{border-color:#2a333e}
:global(html[data-theme="dark"]) .settings-profile p,:global(html[data-theme="dark"]) .appearance-help,:global(html[data-theme="dark"]) .settings-row small{color:#b4c2ce}
:global(html[data-theme="dark"]) .settings-section{background:#203747;color:#75ccf8}
:global(html[data-theme="dark"]) .theme-card{background:#1c2c39;color:#c5d1dc;border-color:#3a4d5c}
:global(html[data-theme="dark"]) .theme-card.selected{background:#173b50;color:#75ccf8;border-color:#2aabee}
:global(html[data-theme="dark"]) .settings-row{border-color:#2a333e}
</style>
