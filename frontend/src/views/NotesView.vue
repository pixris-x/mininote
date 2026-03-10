<template>
  <AppLayout>
    <div class="notes-page">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-top">
          <div>
            <h1 class="page-title">我的记事 📝</h1>
            <p class="page-sub">{{ greeting }}，{{ userStore.user?.nickname }} ✨</p>
          </div>
          <button class="btn btn-primary" @click="showCreateModal = true">
            ＋ 新建
          </button>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索记事标题或内容..."
            @input="handleSearch"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''; fetchData()">✕</button>
        </div>

        <!-- 过滤标签 -->
        <div class="filter-tags">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-btn"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value; fetchData()"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="notesStore.loading" class="loading-center">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="notesStore.notes.length === 0" class="empty-state">
        <span class="empty-icon">📋</span>
        <h3>{{ searchQuery ? '没有找到相关记事' : '还没有记事哦~' }}</h3>
        <p>{{ searchQuery ? '换个关键词试试吧' : '点击右上角「新建」创建你的第一条记事 🌸' }}</p>
      </div>

      <!-- 置顶记事区 -->
      <template v-else>
        <div v-if="pinnedNotes.length > 0" class="notes-section">
          <div class="section-label">📌 置顶</div>
          <div class="notes-grid">
            <NoteCard
              v-for="note in pinnedNotes"
              :key="note.id"
              :note="note"
              @click="goDetail"
              @pin="handlePin"
              @delete="handleDelete"
            />
          </div>
        </div>

        <div v-if="normalNotes.length > 0" class="notes-section">
          <div v-if="pinnedNotes.length > 0" class="section-label">💬 其他</div>
          <div class="notes-grid">
            <NoteCard
              v-for="note in normalNotes"
              :key="note.id"
              :note="note"
              @click="goDetail"
              @pin="handlePin"
              @delete="handleDelete"
            />
          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <div v-if="notesStore.notes.length > 0" class="notes-count">
        共 {{ notesStore.notes.length }} 条记事
      </div>
    </div>

    <!-- 新建记事弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-card card">
          <div class="modal-header">
            <h2>✨ 新建记事</h2>
            <button class="btn btn-ghost btn-icon" @click="showCreateModal = false">✕</button>
          </div>

          <form @submit.prevent="handleCreate" class="create-form">
            <input
              v-model="createForm.title"
              type="text"
              class="input title-input"
              placeholder="记事标题"
              autofocus
            />
            <textarea
              v-model="createForm.content"
              class="input content-input"
              placeholder="写点什么..."
              rows="4"
            ></textarea>

            <!-- 颜色选择 -->
            <div class="color-picker">
              <span class="form-label">选择颜色</span>
              <div class="color-options">
                <button
                  v-for="c in notesStore.NOTE_COLORS"
                  :key="c.value"
                  type="button"
                  class="color-btn"
                  :class="{ active: createForm.color === c.value }"
                  :style="{ background: c.value }"
                  :title="c.label"
                  @click="createForm.color = c.value"
                ></button>
              </div>
            </div>

            <!-- 标签输入 -->
            <div class="tag-input-area">
              <span class="form-label">添加标签</span>
              <div class="tag-list">
                <span
                  v-for="(tag, i) in createForm.tags"
                  :key="i"
                  class="tag tag-removable"
                >
                  {{ tag }}
                  <button type="button" @click="removeTag(i)">✕</button>
                </span>
                <input
                  v-model="tagInput"
                  type="text"
                  class="tag-input"
                  placeholder="输入标签按 Enter"
                  @keydown.enter.prevent="addTag"
                  @keydown.comma.prevent="addTag"
                />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" @click="showCreateModal = false">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="creating">
                <span v-if="creating" class="loading-spinner" style="width:14px;height:14px;border-width:2px"></span>
                <span v-else>保存 💾</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-card card confirm-modal">
          <div class="confirm-icon">🗑️</div>
          <h3>删除记事</h3>
          <p>确定要删除「{{ deleteTarget.title }}」吗？此操作不可恢复</p>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="deleteTarget = null">取消</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting">
              {{ deleting ? '删除中...' : '确定删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import NoteCard from '@/components/NoteCard.vue'
import { useUserStore } from '@/stores/user'
import { useNotesStore } from '@/stores/notes'
import { toast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()
const notesStore = useNotesStore()

const searchQuery = ref('')
const activeFilter = ref('all')
const showCreateModal = ref(false)
const deleteTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)
const tagInput = ref('')

let searchTimer = null

const filters = [
  { label: '全部', value: 'all' },
  { label: '置顶', value: 'pinned' },
  { label: '已归档 📦', value: 'archived' }
]

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '深夜了还在努力'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const pinnedNotes = computed(() => notesStore.notes.filter(n => n.is_pinned))
const normalNotes = computed(() => notesStore.notes.filter(n => !n.is_pinned))

const createForm = reactive({
  title: '',
  content: '',
  color: '#FFFFFF',
  tags: []
})

function resetCreateForm() {
  createForm.title = ''
  createForm.content = ''
  createForm.color = '#FFFFFF'
  createForm.tags = []
  tagInput.value = ''
}

function addTag() {
  const v = tagInput.value.trim().replace(',', '')
  if (v && !createForm.tags.includes(v) && createForm.tags.length < 5) {
    createForm.tags.push(v)
  }
  tagInput.value = ''
}

function removeTag(idx) {
  createForm.tags.splice(idx, 1)
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchData, 400)
}

async function fetchData() {
  const params = {}
  if (activeFilter.value === 'archived') {
    params.archived = true
  } else {
    params.archived = false
    if (activeFilter.value === 'pinned') params.pinned = true
  }
  if (searchQuery.value) params.search = searchQuery.value
  await notesStore.fetchNotes(params)
}

function goDetail(note) {
  router.push(`/notes/${note.id}`)
}

async function handlePin(note) {
  try {
    await notesStore.togglePin(note.id, note.is_pinned)
    toast.success(note.is_pinned ? '已取消置顶' : '已置顶 📌')
  } catch (err) {
    toast.error(err.message)
  }
}

function handleDelete(note) {
  deleteTarget.value = note
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await notesStore.deleteNote(deleteTarget.value.id)
    toast.success('记事已删除')
    deleteTarget.value = null
  } catch (err) {
    toast.error(err.message)
  } finally {
    deleting.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    await notesStore.createNote({ ...createForm })
    toast.success('记事创建成功 ✨')
    showCreateModal.value = false
    resetCreateForm()
  } catch (err) {
    toast.error(err.message)
  } finally {
    creating.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.notes-page {
  padding: 24px 20px;
  max-width: 900px;
  margin: 0 auto;
}

.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

/* 搜索 */
.search-bar {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
}

.search-input {
  width: 100%;
  padding: 11px 36px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 14px;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition);
  font-family: inherit;
}

.search-input:focus {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 3px var(--theme-primary-light);
}

.clear-search {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 2px;
}

/* 过滤 */
.filter-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 笔记区块 */
.notes-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-left: 2px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.notes-count {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-light);
  padding: 16px 0;
}

/* 弹窗 */
.modal-card {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  animation: popIn 0.2s ease;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title-input {
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-bottom: 2px solid var(--color-border);
  border-radius: 0;
  padding: 8px 0;
}

.title-input:focus {
  border-color: var(--theme-primary);
  box-shadow: none;
}

.content-input {
  resize: none;
  line-height: 1.6;
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 3px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.color-btn:hover, .color-btn.active {
  transform: scale(1.2);
  border-color: var(--theme-primary-dark);
}

/* 标签输入 */
.tag-input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 36px;
  padding: 6px 10px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: border-color var(--transition);
}

.tag-list:focus-within {
  border-color: var(--theme-primary);
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

.tag-input {
  border: none;
  outline: none;
  font-size: 13px;
  flex: 1;
  min-width: 80px;
  font-family: inherit;
  color: var(--color-text);
  background: transparent;
}

.modal-actions {
  margin-top: 4px;
}

/* 确认弹窗 */
.confirm-modal {
  max-width: 360px;
  text-align: center;
  padding: 32px 24px;
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-modal h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.btn-danger {
  box-shadow: 0 4px 12px rgba(255, 80, 100, 0.25);
}

.form-label {
  font-size: 12px; /* 此处比全局 13px 略小，保留 */
  flex-shrink: 0;
}
</style>
