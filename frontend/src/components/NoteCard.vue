<template>
  <div
    class="note-card"
    :style="{ background: note.color }"
    @click="$emit('click', note)"
  >
    <div class="note-card-header">
      <h3 class="note-title">{{ note.title || '无标题' }}</h3>
      <div class="note-actions" @click.stop>
        <button
          class="action-btn"
          :class="{ active: note.is_pinned }"
          @click="$emit('pin', note)"
          :title="note.is_pinned ? '取消置顶' : '置顶'"
        >
          📌
        </button>
        <button class="action-btn" @click="$emit('delete', note)" title="删除">
          🗑️
        </button>
      </div>
    </div>

    <p v-if="note.content" class="note-content">{{ truncate(stripHtml(note.content), 80) }}</p>

    <div class="note-footer">
      <div class="note-tags">
        <span v-for="tag in (note.tags || []).slice(0, 3)" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
      <span class="note-date">{{ formatDate(note.updated_at) }}</span>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

defineProps({
  note: { type: Object, required: true }
})

defineEmits(['click', 'pin', 'delete'])

function truncate(str, maxLen) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

function stripHtml(str) {
  if (!str) return ''
  return str
    .replace(/<[^>]+>/g, ' ')  // 去除 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(date) {
  if (!date) return ''
  const d = dayjs(date)
  const now = dayjs()
  if (d.isSame(now, 'day')) return '今天'
  if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(now, 'year')) return d.format('M月D日')
  return d.format('YYYY/M/D')
}
</script>

<style scoped>
.note-card {
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.note-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
  border-color: var(--theme-primary-light);
}

.note-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.note-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
  flex: 1;
  word-break: break-all;
}

.note-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition);
  flex-shrink: 0;
}

.note-card:hover .note-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  line-height: 1;
  transition: all var(--transition);
  opacity: 0.6;
}

.action-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
  transform: scale(1.1);
}

.action-btn.active {
  opacity: 1;
}

.note-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  word-break: break-all;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.note-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.note-date {
  font-size: 11px;
  color: var(--color-text-light);
  flex-shrink: 0;
}
</style>
