<template>
  <div class="notification-page">
    <PageHeader :icon="BellRing" title="通知中心" subtitle="统一查看推送、到期提醒、生日提醒和系统消息">
      <template #actions>
        <button
          class="btn btn-outline btn-sm"
          :disabled="batchLoading || summary.unread_total <= 0"
          @click="markAllReadByType"
        >
          <CheckCheck :size="14" />
          <span>全部已读</span>
        </button>
      </template>

      <div class="filter-wrap">
        <div class="filter-row">
          <button
            v-for="item in statusFilters"
            :key="item.value"
            class="filter-btn"
            :class="{ active: statusFilter === item.value }"
            @click="setStatusFilter(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="filter-row">
          <button
            v-for="item in typeFilters"
            :key="item.value"
            class="filter-btn"
            :class="{ active: typeFilter === item.value }"
            @click="setTypeFilter(item.value)"
          >
            {{ item.label }}
            <span v-if="item.value !== 'all'" class="filter-count">
              {{ typeUnreadCount(item.value) }}
            </span>
          </button>
        </div>
      </div>
    </PageHeader>

    <div v-if="notificationStore.loading && notificationStore.items.length === 0" class="loading-center">
      <div class="loading-spinner"></div>
      <p>加载通知中...</p>
    </div>

    <div v-else-if="notificationStore.items.length === 0" class="empty-state">
      <BellOff class="empty-icon" :size="44" />
      <h3>暂无通知</h3>
      <p>有新的推送、到期提醒、生日提醒或系统消息时，会在这里出现</p>
    </div>

    <template v-else>
      <div class="batch-bar">
        <label class="batch-check">
          <input
            type="checkbox"
            :checked="allSelectableChecked"
            :disabled="selectableIds.length === 0 || batchLoading"
            @change="toggleSelectAll($event.target.checked)"
          />
          <span>全选当前页未读</span>
        </label>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="selectedIds.length === 0 || batchLoading"
          @click="markSelectedAsRead"
        >
          标记选中为已读
        </button>
      </div>

      <div class="notice-list">
        <article
          v-for="item in notificationStore.items"
          :key="item.id"
          class="notice-card"
          :class="{ unread: !item.is_read }"
        >
          <label class="notice-select">
            <input
              type="checkbox"
              :disabled="item.is_read || batchLoading"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id, $event.target.checked)"
            />
          </label>

          <button class="notice-main" @click="openNotification(item)">
            <div class="notice-top">
              <span class="notice-type" :class="`type-${item.type}`">
                {{ typeLabel(item.type) }}
              </span>
              <h3 class="notice-title">{{ item.title }}</h3>
              <span class="notice-time">{{ formatTime(item.created_at) }}</span>
            </div>
            <p class="notice-content">{{ item.content }}</p>
          </button>

          <div class="notice-actions">
            <button
              v-if="!item.is_read"
              class="btn btn-ghost btn-sm"
              :disabled="batchLoading"
              @click="markOneRead(item)"
            >
              设为已读
            </button>
            <button
              v-if="item.link_url"
              class="btn btn-ghost btn-sm"
              @click="openLink(item)"
            >
              查看
            </button>
          </div>
        </article>
      </div>

      <div class="notification-count">
        共 {{ notificationStore.pagination.total }} 条通知
      </div>

      <div class="pagination-area">
        <div class="page-size-control" role="group" aria-label="每页条数">
          <span class="page-size-label">每页</span>
          <div class="page-size-buttons">
            <button
              v-for="size in pageSizeOptions"
              :key="size"
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
          <button class="btn btn-ghost btn-sm" :disabled="notificationStore.loading || currentPage <= 1" @click="changePage(currentPage - 1)">
            ← 上一页
          </button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
          <button class="btn btn-ghost btn-sm" :disabled="notificationStore.loading || currentPage >= totalPages" @click="changePage(currentPage + 1)">
            下一页 →
          </button>
        </div>
      </div>
    </template>
  </div>

  <Transition name="notifications-back-top-fade">
    <button
      v-if="showBackToTop"
      class="notifications-back-to-top"
      @click="scrollToTop"
      title="返回顶部"
    >
      <ArrowUp :size="18" />
    </button>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { toast } from '@/utils/toast'
import { useNotificationStore } from '@/stores/notifications'
import PageHeader from '@/components/PageHeader.vue'
import {
  ArrowUp,
  BellOff,
  BellRing,
  CheckCheck
} from 'lucide-vue-next'

const router = useRouter()
const notificationStore = useNotificationStore()

const currentPage = ref(1)
const pageSize = ref(20)
const pageSizeOptions = [20, 50, 100]
const statusFilter = ref('all')
const typeFilter = ref('all')
const batchLoading = ref(false)
const selectedIds = ref([])
const showBackToTop = ref(false)

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' }
]

const typeFilters = [
  { label: '全部类型', value: 'all' },
  { label: '推送', value: 'push' },
  { label: '到期提醒', value: 'due_reminder' },
  { label: '生日提醒', value: 'birthday_reminder' },
  { label: '系统消息', value: 'system' }
]

const totalPages = computed(() => Math.max(1, Number(notificationStore.pagination.pages || 1)))
const summary = computed(() => notificationStore.summary || {})
const selectableIds = computed(() =>
  notificationStore.items
    .filter(item => !item.is_read)
    .map(item => item.id)
)

const allSelectableChecked = computed(() => {
  if (selectableIds.value.length === 0) return false
  return selectableIds.value.every(id => selectedIds.value.includes(id))
})

function typeLabel(type) {
  if (type === 'push') return '推送'
  if (type === 'due_reminder') return '到期提醒'
  if (type === 'birthday_reminder') return '生日提醒'
  return '系统消息'
}

function typeUnreadCount(type) {
  if (type === 'push') return Number(summary.value.unread_push || 0)
  if (type === 'due_reminder') return Number(summary.value.unread_due_reminder || 0)
  if (type === 'birthday_reminder') return Number(summary.value.unread_birthday_reminder || 0)
  if (type === 'system') return Number(summary.value.unread_system || 0)
  return 0
}

function formatTime(dateTime) {
  const value = dayjs(dateTime)
  if (!value.isValid()) return '-'
  const now = dayjs()
  if (now.diff(value, 'day') <= 1) {
    return value.format('HH:mm')
  }
  return value.format('MM-DD HH:mm')
}

function clearSelection() {
  selectedIds.value = []
}

function setStatusFilter(value) {
  if (statusFilter.value === value) return
  statusFilter.value = value
  fetchNotifications(true)
}

function setTypeFilter(value) {
  if (typeFilter.value === value) return
  typeFilter.value = value
  fetchNotifications(true)
}

function toggleSelect(id, checked) {
  if (!checked) {
    selectedIds.value = selectedIds.value.filter(item => item !== id)
    return
  }
  if (!selectedIds.value.includes(id)) {
    selectedIds.value.push(id)
  }
}

function toggleSelectAll(checked) {
  if (!checked) {
    selectedIds.value = []
    return
  }
  selectedIds.value = [...selectableIds.value]
}

async function fetchNotifications(resetPage = false) {
  if (resetPage) currentPage.value = 1
  clearSelection()
  await notificationStore.fetchNotifications({
    status: statusFilter.value,
    type: typeFilter.value,
    page: currentPage.value,
    limit: pageSize.value
  })

  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
    await notificationStore.fetchNotifications({
      status: statusFilter.value,
      type: typeFilter.value,
      page: currentPage.value,
      limit: pageSize.value
    })
  }
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || notificationStore.loading) return
  currentPage.value = nextPage
  fetchNotifications()
}

function setPageSize(size) {
  if (size === pageSize.value) return
  pageSize.value = size
  fetchNotifications(true)
}

async function markOneRead(item) {
  if (item.is_read) return
  try {
    await notificationStore.markRead(item.id)
    await fetchNotifications()
    await notificationStore.fetchSummary()
  } catch (err) {
    toast.error(err.message)
  }
}

async function markSelectedAsRead() {
  if (selectedIds.value.length === 0) return
  batchLoading.value = true
  try {
    await notificationStore.markBatchRead(selectedIds.value)
    await fetchNotifications()
    await notificationStore.fetchSummary()
    toast.success('已批量标记为已读')
  } catch (err) {
    toast.error(err.message)
  } finally {
    batchLoading.value = false
  }
}

async function markAllReadByType() {
  batchLoading.value = true
  try {
    await notificationStore.markAllRead(typeFilter.value)
    await fetchNotifications()
    await notificationStore.fetchSummary()
    toast.success('通知已标记为已读')
  } catch (err) {
    toast.error(err.message)
  } finally {
    batchLoading.value = false
  }
}

async function openNotification(item) {
  if (!item.is_read) {
    await markOneRead(item)
  }
}

function openLink(item) {
  if (!item?.link_url) return
  if (/^https?:\/\//i.test(item.link_url)) {
    window.open(item.link_url, '_blank', 'noopener,noreferrer')
    return
  }
  router.push(item.link_url)
}

function handleWindowScroll() {
  showBackToTop.value = window.scrollY > 280
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  await fetchNotifications()
  await notificationStore.fetchSummary()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  handleWindowScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleWindowScroll)
})
</script>

<style scoped lang="scss" src="@/assets/styles/views/NotificationView.scss"></style>
