<template>
  <AppLayout>
    <div class="detail-page">
      <!-- 顶部工具栏 -->
      <div class="detail-toolbar">
        <button class="btn btn-ghost" @click="$router.back()">
          <span class="btn-with-icon">
            <ArrowLeft class="btn-icon-sm" />
            返回
          </span>
        </button>
        <div class="toolbar-actions">
          <!-- 已归档标识 -->
          <span v-if="note?.is_archived" class="archived-badge">
            <Archive class="badge-icon" />
            已归档
          </span>

          <!-- 预览/编辑切换 -->
          <button
            v-if="!note?.is_archived"
            class="btn btn-ghost btn-icon"
            :class="{ 'preview-active': previewMode }"
            @click="previewMode = !previewMode"
            :title="previewMode ? '切换编辑' : '切换预览'"
          >
            <SquarePen v-if="previewMode" class="toolbar-icon" />
            <Eye v-else class="toolbar-icon" />
          </button>

          <button class="btn btn-ghost btn-icon" :class="{ 'pin-active': note?.is_pinned }" @click="togglePin"
            title="置顶">
            <Pin class="toolbar-icon" />
          </button>
          <button class="btn btn-ghost btn-icon" @click="toggleArchive" title="归档">
            <Undo2 v-if="note?.is_archived" class="toolbar-icon" />
            <Archive v-else class="toolbar-icon" />
          </button>
          <button class="btn btn-ghost btn-icon delete-btn" @click="showDeleteConfirm = true" title="删除">
            <Trash2 class="toolbar-icon" />
          </button>
          <button v-if="!isReadOnly" class="btn btn-primary" @click="saveNote" :disabled="saving || !isDirty">
            <span v-if="saving" class="loading-spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else class="btn-with-icon">
              <Save v-if="isDirty" class="btn-icon-sm" />
              <Check v-else class="btn-icon-sm" />
              {{ isDirty ? '保存' : '已保存' }}
            </span>
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-center">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 记事内容 -->
      <div v-else-if="note" class="detail-content" :style="{ background: note.color }">
        <!-- 颜色选择（编辑模式） -->
        <div v-if="!isReadOnly" class="color-bar">
          <button v-for="c in notesStore.NOTE_COLORS" :key="c.value" class="color-dot"
            :class="{ active: note.color === c.value }" :style="{ background: c.value || '#eee' }" :title="c.label"
            @click="changeColor(c.value)"></button>

          <!-- 标签管理 -->
          <div class="tag-section">
            <div class="tag-list-inline">
              <span v-for="(tag, i) in note.tags" :key="i" class="tag tag-removable">
                {{ tag }}
                <button @click="removeTag(i)" title="移除标签">
                  <X class="tag-remove-icon" />
                </button>
              </span>
              <input v-model="tagInput" type="text" class="inline-tag-input" placeholder="＋ 标签"
                @keydown.enter.prevent="addTag" />
            </div>
          </div>
        </div>

        <!-- 只读时的标签展示 -->
        <div v-else-if="note.tags?.length" class="color-bar readonly-tags">
          <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <!-- 标题 -->
        <input v-if="!isReadOnly" v-model="note.title" type="text" class="note-title-input" placeholder="标题" @input="markDirty" />
        <h1 v-else class="note-title-preview">{{ note.title || '无标题' }}</h1>

        <!-- 内容 -->
        <TiptapEditor v-model="note.content" placeholder="写点什么..." :editable="!isReadOnly" @change="markDirty" />

        <!-- 底部信息 -->
        <div class="note-meta">
          <span class="meta-item">
            <Clock3 class="meta-icon" />
            {{ formatFullDate(note.updated_at) }}
          </span>
          <span class="meta-item">
            <NotebookText class="meta-icon" />
            {{ wordCount }} 字
          </span>
        </div>

        <!-- 关联日历 -->
        <div class="calendar-links">
          <div class="cal-link-header">
            <span class="cal-label">
              <CalendarDays class="meta-icon" />
              日历关联
            </span>
            <button class="btn btn-ghost btn-sm" @click="showCalPicker = !showCalPicker">
              {{ showCalPicker ? '收起' : '＋ 添加日期' }}
            </button>
          </div>

          <div class="linked-dates">
            <span v-for="date in note.calendar_dates" :key="date" class="linked-date">
              {{ formatCalDate(date) }}
              <button @click="removeCalDate(date)">✕</button>
            </span>
            <span v-if="note.calendar_dates?.length === 0" class="no-dates">暂未关联日期</span>
          </div>

          <!-- 简单日期选择器 -->
          <div v-if="showCalPicker" class="date-picker">
            <AppDatePicker v-model="newCalDate" placeholder="选择日期" :min-date="todayStr" />
            <button class="btn btn-primary btn-sm" @click="addCalDate" :disabled="!newCalDate">
              确认
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <Search class="empty-icon" />
        <p>记事不存在</p>
        <button class="btn btn-primary" @click="$router.push('/notes')">返回记事</button>
      </div>

      <!-- 删除确认 -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-card card" style="max-width:360px;text-align:center;padding:32px 24px">
            <Trash2 class="modal-delete-icon" />
            <h3 style="font-size:18px;margin-bottom:8px">删除记事</h3>
            <p style="font-size:14px;color:var(--color-text-secondary);margin-bottom:24px">
              此操作不可恢复，确定删除吗？
            </p>
            <div style="display:flex;gap:10px;justify-content:center">
              <button class="btn btn-outline" @click="showDeleteConfirm = false">取消</button>
              <button class="btn btn-danger" @click="deleteNote">确认删除</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Archive, ArrowLeft, CalendarDays, Check, Clock3, Eye, NotebookText, Pin, Save, Search, SquarePen, Trash2, Undo2, X } from 'lucide-vue-next'
import AppLayout from '@/components/AppLayout.vue'
import AppDatePicker from '@/components/AppDatePicker.vue'
import TiptapEditor from '@/components/TiptapEditor.vue'
import { useNotesStore } from '@/stores/notes'
import { calendarApi } from '@/api'
import { toast } from '@/utils/toast'
import dayjs from 'dayjs'


const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()

const note = ref(null)
const loading = ref(false)
const saving = ref(false)
const isDirty = ref(false)
const tagInput = ref('')
const showDeleteConfirm = ref(false)
const showCalPicker = ref(false)
const newCalDate = ref('')
const todayStr = dayjs().format('YYYY-MM-DD')
const previewMode = ref(false)

const isReadOnly = computed(() => note.value?.is_archived || previewMode.value)

const wordCount = computed(() => {
  if (!note.value?.content) return 0
  // 去除 HTML 标签后统计字符数
  return note.value.content.replace(/<[^>]+>/g, '').replace(/\s/g, '').length
})

function markDirty() {
  isDirty.value = true
}

function changeColor(color) {
  note.value.color = color
  markDirty()
}

function addTag() {
  const v = tagInput.value.trim()
  if (v && !note.value.tags.includes(v) && note.value.tags.length < 5) {
    note.value.tags.push(v)
    markDirty()
  }
  tagInput.value = ''
}

function removeTag(idx) {
  note.value.tags.splice(idx, 1)
  markDirty()
}

function formatFullDate(date) {
  return dayjs(date).format('YYYY年M月D日 HH:mm')
}

function formatCalDate(date) {
  return dayjs(date).format('YYYY/M/D')
}

async function saveNote() {
  if (!isDirty.value) return
  if (!note.value?.id) return
  saving.value = true
  try {
    await notesStore.updateNote(note.value.id, {
      title: note.value.title,
      content: note.value.content,
      color: note.value.color,
      tags: note.value.tags
    })
    isDirty.value = false
    toast.success('已保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

async function togglePin() {
  try {
    await notesStore.togglePin(note.value.id, note.value.is_pinned)
    note.value.is_pinned = !note.value.is_pinned
    toast.success(note.value.is_pinned ? '已置顶' : '已取消置顶')
  } catch (err) {
    toast.error(err.message)
  }
}

async function toggleArchive() {
  try {
    await notesStore.updateNote(note.value.id, { is_archived: !note.value.is_archived })
    note.value.is_archived = !note.value.is_archived
    if (!note.value.is_archived) previewMode.value = false
    toast.success(note.value.is_archived ? '已归档' : '已取消归档')
  } catch (err) {
    toast.error(err.message)
  }
}

async function deleteNote() {
  try {
    await notesStore.deleteNote(route.params.id)
    toast.success('记事已删除')
    router.push('/notes')
  } catch (err) {
    toast.error(err.message)
  }
}

async function addCalDate() {
  if (!newCalDate.value) return
  try {
    await calendarApi.linkNote(note.value.id, newCalDate.value)
    if (!note.value.calendar_dates) note.value.calendar_dates = []
    if (!note.value.calendar_dates.includes(newCalDate.value)) {
      note.value.calendar_dates.push(newCalDate.value)
    }
    toast.success('日期已关联')
    newCalDate.value = ''
    showCalPicker.value = false
  } catch (err) {
    toast.error(err.message)
  }
}

async function removeCalDate(date) {
  try {
    await calendarApi.unlinkNote(note.value.id, date)
    note.value.calendar_dates = note.value.calendar_dates.filter(d => d !== date)
    toast.info('已取消关联')
  } catch (err) {
    toast.error(err.message)
  }
}

// 自动保存（定时）
let autoSaveTimer = null

function startAutoSave() {
  autoSaveTimer = setInterval(() => {
    if (isDirty.value) saveNote()
  }, 30000)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await notesStore.fetchNote(route.params.id)
    if (res.success) {
      note.value = { ...res.data, calendar_dates: res.data.calendar_dates || [] }
    }
  } finally {
    loading.value = false
  }
  startAutoSave()
})

onBeforeUnmount(() => {
  clearInterval(autoSaveTimer)
  if (isDirty.value) saveNote()
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/NoteDetailView.scss"></style>
