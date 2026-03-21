<template>
  <div class="global-search-page">
      <div class="page-header">
        <h1 class="page-title">
          <Search class="title-icon" :size="20" />
          <span>全局搜索</span>
        </h1>
        <p class="page-sub">一页查看记事、计划、记账结果</p>
      </div>

      <section class="search-panel card">
        <div class="search-input-wrap">
          <Search class="search-input-icon" :size="16" />
          <input
            v-model="keyword"
            type="text"
            class="search-input"
            placeholder="输入关键词（标题、内容、备注）"
            @input="scheduleSearch(380)"
          />
          <button
            v-if="keyword"
            type="button"
            class="clear-btn"
            aria-label="清空关键词"
            @click="clearKeyword"
          >
            <X :size="14" />
          </button>
        </div>
        <p class="search-hint">支持跨模块搜索：记事、计划、记账会在同一页统一返回</p>

        <div class="filter-grid">
          <label class="filter-field">
            <span class="field-label">
              <Tags :size="14" />
              标签
            </span>
            <input
              v-model="filters.tags"
              type="text"
              class="input"
              placeholder="多个标签用逗号分隔"
              @input="scheduleSearch(380)"
            />
          </label>

          <label class="filter-field">
            <span class="field-label">
              <Filter :size="14" />
              状态
            </span>
            <AppSelect
              v-model="filters.status"
              class="field-select"
              :options="statusOptions"
              placeholder="全部状态"
              @change="scheduleSearch(100)"
            />
          </label>

          <label class="filter-field">
            <span class="field-label">
              <CalendarRange :size="14" />
              开始日期
            </span>
            <AppDatePicker
              v-model="filters.date_from"
              class="date-picker-field"
              placeholder="选择开始日期"
              @update:modelValue="scheduleSearch(100)"
            />
          </label>

          <label class="filter-field">
            <span class="field-label">
              <CalendarRange :size="14" />
              结束日期
            </span>
            <AppDatePicker
              v-model="filters.date_to"
              class="date-picker-field"
              placeholder="选择结束日期"
              @update:modelValue="scheduleSearch(100)"
            />
          </label>

          <label class="filter-field filter-switch">
            <span class="field-label">
              <Pin :size="14" />
              仅置顶记事
            </span>
            <button
              type="button"
              class="switch-toggle"
              :class="{ active: filters.pinned }"
              :aria-pressed="filters.pinned ? 'true' : 'false'"
              aria-label="仅置顶记事"
              @click="togglePinned"
            >
              <span class="toggle-thumb"></span>
            </button>
          </label>

          <div class="filter-actions">
            <button type="button" class="btn btn-outline btn-sm icon-text-btn" @click="resetFilters">
              <RotateCcw class="btn-inline-icon" />
              <span>重置筛选</span>
            </button>
            <button type="button" class="btn btn-primary btn-sm icon-text-btn" @click="runSearch">
              <Search class="btn-inline-icon" />
              <span>立即搜索</span>
            </button>
          </div>
        </div>
      </section>

      <section class="summary-strip" role="tablist" aria-label="结果类型筛选">
        <button
          type="button"
          class="summary-pill"
          :class="{ active: activeScope === 'notes' }"
          @click="setScope('notes')"
        >
          <StickyNote :size="14" />
          <span>记事 {{ summary.notes }}</span>
        </button>
        <button
          type="button"
          class="summary-pill"
          :class="{ active: activeScope === 'plans' }"
          @click="setScope('plans')"
        >
          <Target :size="14" />
          <span>计划 {{ summary.plans }}</span>
        </button>
        <button
          type="button"
          class="summary-pill"
          :class="{ active: activeScope === 'expenses' }"
          @click="setScope('expenses')"
        >
          <Wallet :size="14" />
          <span>记账 {{ summary.expenses }}</span>
        </button>
        <button
          type="button"
          class="summary-pill total-pill"
          :class="{ active: activeScope === 'all' }"
          @click="setScope('all')"
        >
          总计 {{ summary.total }}
        </button>
      </section>

      <p v-if="scopeTips" class="scope-tips">{{ scopeTips }}</p>

      <div v-if="loading" class="loading-center">
        <div class="loading-spinner"></div>
        <p>搜索中...</p>
      </div>

      <div v-else-if="!summary.total" class="empty-state card">
        <Search class="empty-icon" :size="38" />
        <h3>暂无匹配结果</h3>
        <p>你可以换个关键词，或放宽筛选条件后再试</p>
      </div>

      <div v-else class="result-sections">
        <section v-if="showNotesSection" class="result-section card">
          <header class="section-header">
            <h2>
              <StickyNote :size="16" />
              <span>记事</span>
            </h2>
            <span class="section-count">{{ summary.notes }}</span>
          </header>

          <div v-if="results.notes.length" class="result-list">
            <button
              v-for="note in results.notes"
              :key="`note-${note.id}`"
              type="button"
              class="result-card"
              @click="openNote(note.id)"
            >
              <div class="result-main">
                <div class="result-title-row">
                  <h3 class="result-title">{{ note.title || '无标题' }}</h3>
                  <span v-if="note.is_pinned" class="chip chip-pin">置顶</span>
                  <span v-if="note.is_archived" class="chip chip-muted">已归档</span>
                </div>
                <p class="result-desc">{{ excerpt(note.content, 120) }}</p>
                <div v-if="note.tags?.length" class="tag-list">
                  <span v-for="tag in note.tags" :key="tag" class="tag-chip">#{{ tag }}</span>
                </div>
              </div>
              <div class="result-meta">
                <span>{{ formatDate(note.updated_at) }}</span>
                <ArrowRight :size="14" />
              </div>
            </button>
          </div>
          <p v-else class="section-empty">当前筛选下没有记事结果</p>
        </section>

        <section v-if="showPlansSection" class="result-section card">
          <header class="section-header">
            <h2>
              <Target :size="16" />
              <span>计划</span>
            </h2>
            <span class="section-count">{{ summary.plans }}</span>
          </header>

          <div v-if="results.plans.length" class="result-list">
            <button
              v-for="plan in results.plans"
              :key="`plan-${plan.id}`"
              type="button"
              class="result-card"
              @click="openPlan(plan.id)"
            >
              <div class="result-main">
                <div class="result-title-row">
                  <h3 class="result-title">{{ plan.title }}</h3>
                  <span class="chip chip-status">{{ planStatusText(plan.status) }}</span>
                </div>
                <p class="result-desc">{{ excerpt(plan.description, 120) }}</p>
                <p class="result-sub">
                  {{ plan.role === 'collaborator' ? `协作计划 · 来自 ${plan.owner_name}` : '我的计划' }}
                  · 进度 {{ plan.done_steps }}/{{ plan.total_steps }}
                </p>
              </div>
              <div class="result-meta">
                <span>{{ formatDate(plan.updated_at) }}</span>
                <ArrowRight :size="14" />
              </div>
            </button>
          </div>
          <p v-else class="section-empty">当前筛选下没有计划结果</p>
        </section>

        <section v-if="showExpensesSection" class="result-section card">
          <header class="section-header">
            <h2>
              <Wallet :size="16" />
              <span>记账</span>
            </h2>
            <span class="section-count">{{ summary.expenses }}</span>
          </header>

          <div v-if="results.expenses.length" class="result-list">
            <button
              v-for="expense in results.expenses"
              :key="`expense-${expense.id}`"
              type="button"
              class="result-card"
              @click="openExpense()"
            >
              <div class="result-main">
                <div class="result-title-row">
                  <h3 class="result-title">{{ expense.category_name || '未分类' }}</h3>
                  <span class="expense-amount">-¥{{ Number(expense.amount || 0).toFixed(2) }}</span>
                </div>
                <p class="result-desc">{{ excerpt(expense.note || '无备注', 120) }}</p>
                <p class="result-sub">{{ formatDate(expense.expense_date) }}</p>
              </div>
              <div class="result-meta">
                <span>查看账单</span>
                <ArrowRight :size="14" />
              </div>
            </button>
          </div>
          <p v-else class="section-empty">当前筛选下没有记账结果</p>
        </section>
      </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppDatePicker from '@/components/AppDatePicker.vue'
import AppSelect from '@/components/AppSelect.vue'
import { searchApi } from '@/api'
import { toast } from '@/utils/toast'
import {
  ArrowRight,
  CalendarRange,
  Filter,
  Pin,
  RotateCcw,
  Search,
  StickyNote,
  Tags,
  Target,
  Wallet,
  X
} from 'lucide-vue-next'

const router = useRouter()

const loading = ref(false)
const keyword = ref('')
const activeScope = ref('all')
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '计划进行中' },
  { value: 'completed', label: '计划已完成' },
  { value: 'step_completed', label: '步骤已完成' },
  { value: 'paused', label: '计划已暂停' },
  { value: 'pending', label: '步骤待开始' },
  { value: 'in_progress', label: '步骤进行中' },
  { value: 'skipped', label: '步骤已跳过' },
  { value: 'archived', label: '记事已归档' },
  { value: 'unarchived', label: '记事未归档' }
]
const filters = reactive({
  tags: '',
  status: '',
  date_from: '',
  date_to: '',
  pinned: false
})

const results = reactive({
  notes: [],
  plans: [],
  expenses: [],
  summary: {
    notes: 0,
    plans: 0,
    expenses: 0,
    total: 0
  },
  scope: ['notes', 'plans', 'expenses']
})

let searchTimer = null

const summary = computed(() => results.summary || { notes: 0, plans: 0, expenses: 0, total: 0 })
const showNotesSection = computed(() => activeScope.value === 'all' || activeScope.value === 'notes')
const showPlansSection = computed(() => activeScope.value === 'all' || activeScope.value === 'plans')
const showExpensesSection = computed(() => activeScope.value === 'all' || activeScope.value === 'expenses')

const scopeTips = computed(() => {
  if (!Array.isArray(results.scope) || results.scope.length === 0 || results.scope.length === 3) return ''
  const map = {
    notes: '记事',
    plans: '计划',
    expenses: '记账'
  }
  return `当前筛选仅作用于：${results.scope.map(item => map[item]).filter(Boolean).join('、')}`
})

function buildParams() {
  const params = {
    q: keyword.value.trim(),
    limit: 12
  }
  if (filters.tags.trim()) params.tags = filters.tags.trim()
  if (filters.status) params.status = filters.status
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.pinned) params.pinned = true
  return params
}

function setScope(scope) {
  activeScope.value = scope
}

async function runSearch() {
  loading.value = true
  try {
    const res = await searchApi.global(buildParams())
    if (res.success) {
      results.notes = res.data?.notes || []
      results.plans = res.data?.plans || []
      results.expenses = res.data?.expenses || []
      results.summary = res.data?.summary || { notes: 0, plans: 0, expenses: 0, total: 0 }
      results.scope = res.data?.scope || ['notes', 'plans', 'expenses']
    }
  } catch (err) {
    toast.error(err.message || '搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function scheduleSearch(delay = 320) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    runSearch()
  }, delay)
}

function clearKeyword() {
  keyword.value = ''
  scheduleSearch(0)
}

function resetFilters() {
  filters.tags = ''
  filters.status = ''
  filters.date_from = ''
  filters.date_to = ''
  filters.pinned = false
  scheduleSearch(0)
}

function togglePinned() {
  filters.pinned = !filters.pinned
  scheduleSearch(100)
}

function excerpt(value, max = 100) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return '暂无内容'
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function formatDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function planStatusText(status) {
  if (status === 'active') return '进行中'
  if (status === 'completed') return '已完成'
  if (status === 'paused') return '已暂停'
  return status || '未知状态'
}

function openNote(id) {
  router.push(`/notes/${id}`)
}

function openPlan(id) {
  router.push({ path: '/plans', query: { plan: String(id) } })
}

function openExpense() {
  router.push('/expense')
}

onMounted(() => {
  runSearch()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/GlobalSearchView.scss"></style>
