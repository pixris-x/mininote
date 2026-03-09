<template>
  <AppLayout>
    <div class="detail-page">
      <!-- 顶部工具栏 -->
      <div class="detail-toolbar">
        <button class="btn btn-ghost" @click="$router.back()">
          ‹ 返回
        </button>
        <div class="toolbar-actions">
          <button
            class="btn btn-ghost btn-icon"
            :class="{ 'pin-active': note?.is_pinned }"
            @click="togglePin"
            title="置顶"
          >📌</button>
          <button class="btn btn-ghost btn-icon" @click="toggleArchive" title="归档">
            {{ note?.is_archived ? '📤' : '📦' }}
          </button>
          <button class="btn btn-ghost btn-icon delete-btn" @click="showDeleteConfirm = true" title="删除">
            🗑️
          </button>
          <button
            class="btn btn-primary"
            @click="saveNote"
            :disabled="saving || !isDirty"
          >
            <span v-if="saving" class="loading-spinner" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else>{{ isDirty ? '保存 ✨' : '已保存 ✅' }}</span>
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
        <!-- 颜色选择 -->
        <div class="color-bar">
          <button
            v-for="c in notesStore.NOTE_COLORS"
            :key="c.value"
            class="color-dot"
            :class="{ active: note.color === c.value }"
            :style="{ background: c.value || '#eee' }"
            :title="c.label"
            @click="changeColor(c.value)"
          ></button>

          <!-- 标签管理 -->
          <div class="tag-section">
            <div class="tag-list-inline">
              <span v-for="(tag, i) in note.tags" :key="i" class="tag tag-removable">
                {{ tag }}
                <button @click="removeTag(i)">✕</button>
              </span>
              <input
                v-model="tagInput"
                type="text"
                class="inline-tag-input"
                placeholder="＋ 标签"
                @keydown.enter.prevent="addTag"
              />
            </div>
          </div>
        </div>

        <!-- 标题 -->
        <input
          v-model="note.title"
          type="text"
          class="note-title-input"
          placeholder="标题"
          @input="markDirty"
        />

        <!-- 内容 -->
        <textarea
          v-model="note.content"
          class="note-textarea"
          placeholder="写点什么..."
          @input="markDirty"
        />

        <!-- 底部信息 -->
        <div class="note-meta">
          <span>🕐 {{ formatFullDate(note.updated_at) }}</span>
          <span>📝 {{ wordCount }} 字</span>
        </div>

        <!-- 关联日历 -->
        <div class="calendar-links">
          <div class="cal-link-header">
            <span class="cal-label">📅 日历关联</span>
            <button class="btn btn-ghost btn-sm" @click="showCalPicker = !showCalPicker">
              {{ showCalPicker ? '收起' : '＋ 添加日期' }}
            </button>
          </div>

          <div class="linked-dates">
            <span
              v-for="date in note.calendar_dates"
              :key="date"
              class="linked-date"
            >
              {{ formatCalDate(date) }}
              <button @click="removeCalDate(date)">✕</button>
            </span>
            <span v-if="note.calendar_dates?.length === 0" class="no-dates">暂未关联日期</span>
          </div>

          <!-- 简单日期选择器 -->
          <div v-if="showCalPicker" class="date-picker">
            <input
              v-model="newCalDate"
              type="date"
              class="input"
              :min="todayStr"
            />
            <button class="btn btn-primary btn-sm" @click="addCalDate" :disabled="!newCalDate">
              确认
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>记事不存在</p>
        <button class="btn btn-primary" @click="$router.push('/notes')">返回记事</button>
      </div>

      <!-- 删除确认 -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-card card" style="max-width:360px;text-align:center;padding:32px 24px">
            <div style="font-size:48px;margin-bottom:12px">🗑️</div>
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
import AppLayout from '@/components/AppLayout.vue'
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

const wordCount = computed(() => {
  if (!note.value?.content) return 0
  return note.value.content.replace(/\s/g, '').length
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
    toast.success('已保存 ✅')
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
    toast.success(note.value.is_pinned ? '已置顶 📌' : '已取消置顶')
  } catch (err) {
    toast.error(err.message)
  }
}

async function toggleArchive() {
  try {
    await notesStore.updateNote(note.value.id, { is_archived: !note.value.is_archived })
    note.value.is_archived = !note.value.is_archived
    toast.success(note.value.is_archived ? '已归档 📦' : '已取消归档')
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
    toast.success('日期已关联 📅')
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

<style scoped>
.detail-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 50;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pin-active {
  color: var(--theme-primary-dark);
}

.delete-btn:hover {
  background: #FFE0E0;
  color: #C0392B;
}

.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.detail-content {
  flex: 1;
  padding: 24px 24px 40px;
  transition: background var(--transition);
  min-height: calc(100vh - 64px);
}

/* 颜色条 */
.color-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.color-dot:hover, .color-dot.active {
  transform: scale(1.25);
  border-color: var(--theme-primary-dark);
}

.tag-section {
  margin-left: 8px;
  flex: 1;
}

.tag-list-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-removable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag-removable button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--theme-primary-dark);
  padding: 0;
  line-height: 1;
}

.inline-tag-input {
  border: none;
  border-bottom: 1px dashed var(--color-border);
  outline: none;
  font-size: 13px;
  width: 80px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  padding: 2px 4px;
}

/* 标题输入 */
.note-title-input {
  width: 100%;
  font-size: 26px;
  font-weight: 800;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  margin-bottom: 12px;
  font-family: inherit;
  line-height: 1.3;
}

.note-title-input::placeholder {
  color: var(--color-text-light);
}

/* Markdown 编辑器适配 */
.note-textarea {
  width: 100%;
  min-height: 400px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.55);
  padding: 16px;
  font-size: 15px;
  line-height: 1.8;
  font-family: inherit;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 24px;
  transition: border-color 0.2s;
}

.note-textarea:focus {
  border-color: rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.75);
}

/* 底部信息 */
.note-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  margin-bottom: 20px;
}

/* 日历关联 */
.calendar-links {
  padding: 16px;
  background: rgba(255,255,255,0.5);
  border-radius: var(--radius-md);
}

.cal-link-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cal-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.linked-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.linked-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--theme-primary-light);
  color: var(--theme-primary-dark);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.linked-date button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 10px;
  color: var(--theme-primary-dark);
  padding: 0;
  line-height: 1;
}

.no-dates {
  font-size: 12px;
  color: var(--color-text-light);
}

.date-picker {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 8px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.18);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  animation: popIn 0.2s ease;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.btn-danger {
  background: #FF7B8A;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
