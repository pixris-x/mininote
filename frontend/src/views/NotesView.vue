<template>
  <div class="notes-page">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-top">
          <div>
            <h1 class="page-title">
              <NotebookText class="title-icon" :size="20" />
              <span>我的记事</span>
            </h1>
            <p class="page-sub">
              <span>{{ greeting }}，{{ userStore.user?.nickname }}</span>
              <Sparkles class="sub-icon" :size="14" />
            </p>
          </div>
          <button class="btn btn-primary create-btn" @click="showCreateModal = true">
            <Plus :size="16" />
            <span>新建</span>
          </button>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
          <Search class="search-icon" :size="15" />
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="搜索记事标题或内容..."
            @input="handleSearch"
          />
          <button v-if="searchQuery" class="clear-search" aria-label="清空搜索" @click="searchQuery = ''; fetchData({ resetPage: true })">
            <X :size="14" />
          </button>
        </div>

        <!-- 过滤标签 -->
        <div class="filter-tags">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-btn"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value; fetchData({ resetPage: true })"
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
        <ListTodo class="empty-icon" :size="42" />
        <h3>{{ searchQuery ? '没有找到相关记事' : '还没有记事哦~' }}</h3>
        <p>{{ searchQuery ? '换个关键词试试吧' : '点击右上角「新建」创建你的第一条记事' }}</p>
      </div>

      <!-- 置顶记事区 -->
      <template v-else>
        <div v-if="pinnedNotes.length > 0" class="notes-section">
          <div class="section-label">
            <Pin :size="14" />
            <span>置顶</span>
          </div>
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
          <div v-if="pinnedNotes.length > 0" class="section-label">
            <MessageCircle :size="14" />
            <span>其他</span>
          </div>
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
        共 {{ totalNotes }} 条记事
      </div>

      <div v-if="notesStore.notes.length > 0" class="pagination-area">
        <div class="page-size-control" role="group" aria-label="每页条数">
          <span class="page-size-label">每页</span>
          <div class="page-size-buttons">
            <button
              v-for="size in pageSizeOptions"
              :key="size"
              type="button"
              class="page-size-btn"
              :class="{ active: pageSize === size }"
              @click="setPageSize(size)"
            >
              {{ size }}
            </button>
          </div>
          <span class="page-size-label">条</span>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button class="btn btn-ghost btn-sm" :disabled="notesStore.loading || currentPage <= 1" @click="changePage(currentPage - 1)">
            ‹ 上一页
          </button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button class="btn btn-ghost btn-sm" :disabled="notesStore.loading || currentPage >= totalPages" @click="changePage(currentPage + 1)">
            下一页 ›
          </button>
        </div>
      </div>
    </div>

    <!-- 新建记事弹窗 -->
    <Transition name="notes-back-top-fade">
      <button
        v-if="showBackToTop"
        class="notes-back-to-top"
        @click="scrollToTop"
        title="返回顶部"
      >
        <ArrowUp :size="18" />
      </button>
    </Transition>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-card card">
          <div class="modal-header">
            <h2>
              <SquarePen :size="18" />
              <span>新建记事</span>
            </h2>
            <button class="btn btn-ghost btn-icon modal-close-btn" aria-label="关闭" @click="showCreateModal = false">
              <X :size="16" />
            </button>
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
                  <button type="button" aria-label="移除标签" @click="removeTag(i)">
                    <X :size="12" />
                  </button>
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
                <span v-else class="save-btn-content">
                  <Save :size="14" />
                  <span>保存</span>
                </span>
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
          <div class="confirm-icon">
            <Trash2 :size="44" />
          </div>
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
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NoteCard from '@/components/NoteCard.vue'
import { useUserStore } from '@/stores/user'
import { useNotesStore } from '@/stores/notes'
import { toast } from '@/utils/toast'
import {
  ArrowUp,
  ListTodo,
  MessageCircle,
  NotebookText,
  Pin,
  Plus,
  Save,
  Search,
  Sparkles,
  SquarePen,
  Trash2,
  X
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const notesStore = useNotesStore()

const searchQuery = ref('')
const activeFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(20)
const defaultPageSize = 20
const pageSizeOptions = [20, 50, 100]
const showCreateModal = ref(false)
const deleteTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)
const tagInput = ref('')
const showBackToTop = ref(false)

let searchTimer = null
let ignoreNextQueryWatch = false

const filters = [
  { label: '全部', value: 'all' },
  { label: '置顶', value: 'pinned' },
  { label: '已归档', value: 'archived' }
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
const totalNotes = computed(() => notesStore.pagination.total || notesStore.notes.length)
const totalPages = computed(() => Math.max(1, notesStore.pagination.pages || 1))

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
  searchTimer = setTimeout(() => {
    fetchData({ resetPage: true })
  }, 400)
}

function handleNotesScroll() {
  showBackToTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function normalizePage(val) {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function normalizePageSize(val) {
  const n = parseInt(val, 10)
  return pageSizeOptions.includes(n) ? n : defaultPageSize
}

function applyPaginationFromQuery() {
  const nextPage = normalizePage(route.query.page)
  const nextPageSize = normalizePageSize(route.query.limit)

  const changed = currentPage.value !== nextPage || pageSize.value !== nextPageSize
  currentPage.value = nextPage
  pageSize.value = nextPageSize

  return changed
}

async function syncPaginationQuery() {
  const nextQuery = { ...route.query }

  if (currentPage.value > 1) {
    nextQuery.page = String(currentPage.value)
  } else {
    delete nextQuery.page
  }

  if (pageSize.value !== defaultPageSize) {
    nextQuery.limit = String(pageSize.value)
  } else {
    delete nextQuery.limit
  }

  const samePage = (route.query.page ?? '') === (nextQuery.page ?? '')
  const sameLimit = (route.query.limit ?? '') === (nextQuery.limit ?? '')
  if (samePage && sameLimit) return

  ignoreNextQueryWatch = true
  await router.replace({ query: nextQuery })
}

async function fetchData(options = {}) {
  const { resetPage = false } = options
  if (resetPage) currentPage.value = 1

  const params = {}
  if (activeFilter.value === 'archived') {
    params.archived = true
  } else {
    params.archived = false
    if (activeFilter.value === 'pinned') params.pinned = true
  }
  if (searchQuery.value) params.search = searchQuery.value

  params.page = currentPage.value
  params.limit = pageSize.value

  await syncPaginationQuery()

  await notesStore.fetchNotes(params)

  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
    params.page = currentPage.value
    await syncPaginationQuery()
    await notesStore.fetchNotes(params)
  }
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || notesStore.loading) return
  currentPage.value = nextPage
  fetchData()
}

function setPageSize(size) {
  if (pageSize.value === size) return
  pageSize.value = size
  fetchData({ resetPage: true })
}

function goDetail(note) {
  router.push(`/notes/${note.id}`)
}

async function handlePin(note) {
  try {
    await notesStore.togglePin(note.id, note.is_pinned)
    await fetchData()
    toast.success(note.is_pinned ? '已取消置顶' : '已置顶')
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
    await fetchData()
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
    currentPage.value = 1
    await fetchData()
    toast.success('记事创建成功')
    showCreateModal.value = false
    resetCreateForm()
  } catch (err) {
    toast.error(err.message)
  } finally {
    creating.value = false
  }
}

watch(
  () => [route.query.page, route.query.limit],
  async () => {
    if (ignoreNextQueryWatch) {
      ignoreNextQueryWatch = false
      return
    }

    const changed = applyPaginationFromQuery()
    if (changed) {
      await fetchData()
    }
  }
)

onMounted(async () => {
  applyPaginationFromQuery()
  await fetchData()
  window.addEventListener('scroll', handleNotesScroll, { passive: true })
  handleNotesScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleNotesScroll)
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/NotesView.scss"></style>
