<template>
  <div class="notes-page">
    <div class="page-header">
      <div class="header-top">
        <div>
          <h1 class="page-title">
            <NotebookText class="title-icon" :size="20" />
            <span>我的记事</span>
          </h1>
          <p class="page-sub">
            <span>{{ greeting }}，{{ nickname }}</span>
            <Sparkles class="sub-icon" :size="14" />
          </p>
        </div>
        <button class="btn btn-primary create-btn" type="button" @click="showCreateModal = true">
          <Plus :size="16" />
          <span>新建</span>
        </button>
      </div>

      <div class="search-bar">
        <Search class="search-icon" :size="15" />
        <input
          v-model.trim="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索记事标题或内容..."
          @input="handleSearch"
        />
        <button v-if="searchQuery" class="clear-search" aria-label="清空搜索" type="button" @click="clearSearch">
          <X :size="14" />
        </button>
      </div>

      <div class="filter-tags">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeFilter === f.value }"
          type="button"
          @click="activeFilter = f.value; fetchData({ resetPage: true })"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>
    <p v-if="infoMessage" class="info-msg">{{ infoMessage }}</p>

    <div v-if="loading" class="loading-center">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="notes.length === 0" class="empty-state">
      <ListTodo class="empty-icon" :size="42" />
      <h3>{{ searchQuery ? '没有找到相关记事' : '还没有记事哦~' }}</h3>
      <p>{{ searchQuery ? '换个关键词试试吧' : '点击右上角「新建」创建你的第一条记事' }}</p>
    </div>

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
            @click="openDetail"
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
            @click="openDetail"
            @pin="handlePin"
            @delete="handleDelete"
          />
        </div>
      </div>
    </template>

    <div v-if="notes.length > 0" class="notes-count">
      共 {{ totalNotes }} 条记事
    </div>

    <div v-if="notes.length > 0" class="pagination-area">
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
        <button class="btn btn-ghost btn-sm" :disabled="loading || currentPage <= 1" type="button" @click="changePage(currentPage - 1)">
          ‹ 上一页
        </button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button class="btn btn-ghost btn-sm" :disabled="loading || currentPage >= totalPages" type="button" @click="changePage(currentPage + 1)">
          下一页 ›
        </button>
      </div>
    </div>

    <Transition name="notes-back-top-fade">
      <button v-if="showBackToTop" class="notes-back-to-top" type="button" title="返回顶部" @click="scrollToTop">
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
            <button class="btn btn-ghost btn-icon modal-close-btn" type="button" aria-label="关闭" @click="showCreateModal = false">
              <X :size="16" />
            </button>
          </div>

          <form class="create-form" @submit.prevent="handleCreate">
            <input v-model.trim="createForm.title" type="text" class="input title-input" placeholder="记事标题" autofocus />
            <textarea v-model="createForm.content" class="input content-input" placeholder="写点什么..." rows="4"></textarea>

            <div class="color-picker">
              <span class="form-label">选择颜色</span>
              <div class="color-options">
                <button
                  v-for="color in noteColors"
                  :key="color.value"
                  type="button"
                  class="color-btn"
                  :class="{ active: createForm.color === color.value }"
                  :style="{ background: color.value }"
                  :title="color.label"
                  @click="createForm.color = color.value"
                ></button>
              </div>
            </div>

            <div class="tag-input-area">
              <span class="form-label">添加标签</span>
              <div class="tag-list">
                <span v-for="(tag, index) in createForm.tags" :key="`${tag}-${index}`" class="tag tag-removable">
                  {{ tag }}
                  <button type="button" aria-label="移除标签" @click="removeTag(index)">
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
                <span v-if="creating" class="loading-spinner tiny-loader"></span>
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

    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
        <div class="modal-card card confirm-modal">
          <div class="confirm-icon">
            <Trash2 :size="44" />
          </div>
          <h3>删除记事</h3>
          <p>确定要删除「{{ deleteTarget.title || '无标题' }}」吗？此操作不可恢复</p>
          <div class="modal-actions">
            <button class="btn btn-outline" type="button" @click="deleteTarget = null">取消</button>
            <button class="btn btn-danger" type="button" :disabled="deleting" @click="confirmDelete">
              {{ deleting ? '删除中...' : '确定删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
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
import NoteCard from '~/components/NoteCard.vue'
import { notesRepository } from '~/repositories'
import { readSessionUser } from '~/utils/session'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '我的记事' })

type NoteItem = {
  id: number
  title?: string
  content?: string
  color?: string
  tags?: string[] | string | null
  updated_at?: string
  is_pinned?: boolean
  is_archived?: boolean
}

const { getErrorMessage } = useApiMessage()

const notes = ref<NoteItem[]>([])
const loading = ref(false)
const creating = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const searchQuery = ref('')
const activeFilter = ref<'all' | 'pinned' | 'archived'>('all')
const currentPage = ref(1)
const pageSize = ref(20)
const showCreateModal = ref(false)
const deleteTarget = ref<NoteItem | null>(null)
const tagInput = ref('')
const showBackToTop = ref(false)

const total = ref(0)
const pages = ref(1)
const pageSizeOptions = [20, 50, 100]

const filters = [
  { label: '全部', value: 'all' },
  { label: '置顶', value: 'pinned' },
  { label: '已归档', value: 'archived' }
] as const

const noteColors = [
  { value: '#FFFFFF', label: '白' },
  { value: '#FFD6E0', label: '粉' },
  { value: '#D4F5E9', label: '薄荷' },
  { value: '#E4E8F8', label: '薰衣草' },
  { value: '#FFE8D6', label: '桃' },
  { value: '#FFF8D6', label: '黄' },
  { value: '#D6EEFF', label: '蓝' }
]

const createForm = reactive({
  title: '',
  content: '',
  color: '#FFFFFF',
  tags: [] as string[]
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const nickname = computed(() => {
  if (!import.meta.client) return '你'
  const user = readSessionUser<{ nickname?: string; username?: string }>()
  return user?.nickname || user?.username || '你'
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '深夜了还在努力'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const pinnedNotes = computed(() => notes.value.filter((n) => Boolean(n.is_pinned)))
const normalNotes = computed(() => notes.value.filter((n) => !n.is_pinned))
const totalNotes = computed(() => total.value || notes.value.length)
const totalPages = computed(() => Math.max(1, pages.value || 1))

function normalizeTagsValue(tags: NoteItem['tags']) {
  if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean)
  if (typeof tags === 'string') {
    return tags.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function buildQuery() {
  const params: Record<string, unknown> = {
    page: currentPage.value,
    limit: pageSize.value
  }
  if (searchQuery.value) params.search = searchQuery.value
  if (activeFilter.value === 'pinned') params.pinned = true
  if (activeFilter.value === 'archived') params.archived = true
  if (activeFilter.value !== 'archived') params.archived = false
  return params
}

async function fetchData(options: { resetPage?: boolean } = {}) {
  if (options.resetPage) currentPage.value = 1
  loading.value = true
  try {
    const res = await notesRepository.getAll(buildQuery()) as {
      success?: boolean
      data?: NoteItem[]
      total?: number
      page?: number
      pages?: number
    }

    if (!res?.success) return

    notes.value = Array.isArray(res.data)
      ? res.data.map((note) => ({ ...note, tags: normalizeTagsValue(note.tags) }))
      : []
    total.value = Number(res.total || notes.value.length || 0)
    currentPage.value = Number(res.page || currentPage.value)
    pages.value = Math.max(1, Number(res.pages || 1))
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载记事失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchData({ resetPage: true })
  }, 350)
}

function clearSearch() {
  searchQuery.value = ''
  fetchData({ resetPage: true })
}

function addTag() {
  const value = tagInput.value.trim().replace(',', '')
  if (value && !createForm.tags.includes(value) && createForm.tags.length < 5) {
    createForm.tags.push(value)
  }
  tagInput.value = ''
}

function removeTag(index: number) {
  createForm.tags.splice(index, 1)
}

function resetCreateForm() {
  createForm.title = ''
  createForm.content = ''
  createForm.color = '#FFFFFF'
  createForm.tags = []
  tagInput.value = ''
}

function openDetail(note: NoteItem) {
  navigateTo(`/notes/${note.id}`)
}

async function handleCreate() {
  clearMessages()
  creating.value = true
  try {
    const res = await notesRepository.create({
      title: createForm.title.trim() || '无标题',
      content: createForm.content,
      color: createForm.color || '#FFFFFF',
      tags: createForm.tags
    }) as { success?: boolean; message?: string }

    if (res?.success) {
      infoMessage.value = res.message || '记事创建成功'
      showCreateModal.value = false
      resetCreateForm()
      await fetchData({ resetPage: true })
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '创建记事失败')
  } finally {
    creating.value = false
  }
}

async function handlePin(note: NoteItem) {
  clearMessages()
  loading.value = true
  try {
    await notesRepository.update(note.id, { is_pinned: !note.is_pinned })
    infoMessage.value = note.is_pinned ? '已取消置顶' : '已置顶'
    await fetchData()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '更新置顶状态失败')
  } finally {
    loading.value = false
  }
}

function handleDelete(note: NoteItem) {
  deleteTarget.value = note
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  clearMessages()
  deleting.value = true
  try {
    const res = await notesRepository.delete(deleteTarget.value.id) as { success?: boolean; message?: string }
    if (res?.success) infoMessage.value = res.message || '记事已删除'
    deleteTarget.value = null
    await fetchData()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '删除记事失败')
  } finally {
    deleting.value = false
  }
}

async function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || loading.value) return
  currentPage.value = nextPage
  await fetchData()
}

async function setPageSize(size: number) {
  if (pageSize.value === size) return
  pageSize.value = size
  await fetchData({ resetPage: true })
}

function handleNotesScroll() {
  if (!import.meta.client) return
  showBackToTop.value = window.scrollY > 300
}

function scrollToTop() {
  if (!import.meta.client) return
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  await fetchData()
  window.addEventListener('scroll', handleNotesScroll, { passive: true })
  handleNotesScroll()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (import.meta.client) {
    window.removeEventListener('scroll', handleNotesScroll)
  }
})
</script>

<style scoped lang="scss" src="~/assets/styles/views/notes-view.scss"></style>
