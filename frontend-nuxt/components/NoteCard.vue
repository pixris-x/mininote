<template>
  <article class="note-card" :style="{ background: note.color || '#FFFFFF' }" @click="$emit('click', note)">
    <div class="note-card-header">
      <h3 class="note-title">{{ note.title || '无标题' }}</h3>
      <div class="note-actions" @click.stop>
        <button
          class="action-btn"
          :class="{ active: note.is_pinned }"
          type="button"
          :title="note.is_pinned ? '取消置顶' : '置顶'"
          @click="$emit('pin', note)"
        >
          <Pin class="action-icon" :size="14" />
        </button>
        <button class="action-btn" type="button" title="删除" @click="$emit('delete', note)">
          <Trash2 class="action-icon" :size="14" />
        </button>
      </div>
    </div>

    <p v-if="note.content" class="note-content">{{ truncate(stripHtml(note.content), 80) }}</p>

    <div class="note-footer">
      <div class="note-tags">
        <span v-for="tag in (note.tags || []).slice(0, 3)" :key="`${note.id}-${tag}`" class="tag">
          {{ tag }}
        </span>
      </div>
      <span class="note-date">{{ formatDate(note.updated_at) }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Pin, Trash2 } from 'lucide-vue-next'

type NoteCardItem = {
  id: number
  title?: string
  content?: string
  color?: string
  tags?: string[]
  updated_at?: string
  is_pinned?: boolean
}

defineProps<{ note: NoteCardItem }>()
defineEmits<{
  click: [note: NoteCardItem]
  pin: [note: NoteCardItem]
  delete: [note: NoteCardItem]
}>()

function truncate(str: string, maxLen: number) {
  if (!str) return ''
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str
}

function stripHtml(str: string) {
  if (!str) return ''
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const oneDay = 24 * 60 * 60 * 1000

  if (target === today) return '今天'
  if (target === today - oneDay) return '昨天'
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped lang="scss" src="~/assets/styles/components/note-card.scss"></style>
