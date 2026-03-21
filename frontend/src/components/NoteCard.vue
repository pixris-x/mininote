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
          <Pin class="action-icon" />
        </button>
        <button class="action-btn" @click="$emit('delete', note)" title="删除">
          <Trash2 class="action-icon" />
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
import { Pin, Trash2 } from 'lucide-vue-next'

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

<style scoped lang="scss" src="@/assets/styles/components/NoteCard.scss"></style>
