import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationApi } from '@/api'

const EMPTY_SUMMARY = {
  unread_total: 0,
  unread_push: 0,
  unread_due_reminder: 0,
  unread_birthday_reminder: 0,
  unread_system: 0
}

function normalizeSummary(data = {}) {
  return {
    unread_total: Number(data.unread_total || 0),
    unread_push: Number(data.unread_push || 0),
    unread_due_reminder: Number(data.unread_due_reminder || 0),
    unread_birthday_reminder: Number(data.unread_birthday_reminder || 0),
    unread_system: Number(data.unread_system || 0)
  }
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref([])
  const loading = ref(false)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  })
  const summary = ref({ ...EMPTY_SUMMARY })

  async function fetchNotifications(params = {}) {
    loading.value = true
    try {
      const res = await notificationApi.getList(params)
      if (res.success) {
        items.value = Array.isArray(res.data?.items) ? res.data.items : []
        pagination.value = {
          total: Number(res.data?.total || 0),
          page: Number(res.data?.page || params.page || 1),
          limit: Number(res.data?.limit || params.limit || 20),
          pages: Number(res.data?.pages || 1)
        }
        summary.value = normalizeSummary(res.data?.summary || {})
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    const res = await notificationApi.getSummary()
    if (res.success) {
      summary.value = normalizeSummary(res.data || {})
    }
    return res
  }

  async function markRead(id) {
    const res = await notificationApi.markRead(id)
    if (res.success) {
      const target = items.value.find(item => item.id === Number(id))
      if (target) {
        target.is_read = true
        target.read_at = res.data?.read_at || new Date().toISOString()
      }
    }
    return res
  }

  async function markBatchRead(ids = []) {
    return notificationApi.markBatchRead(ids)
  }

  async function markAllRead(type = 'all') {
    return notificationApi.markAllRead(type)
  }

  return {
    items,
    loading,
    pagination,
    summary,
    fetchNotifications,
    fetchSummary,
    markRead,
    markBatchRead,
    markAllRead
  }
})
