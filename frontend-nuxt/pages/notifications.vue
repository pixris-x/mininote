<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">通知中心</h1>
        <div class="flex gap-2">
          <button class="btn px-3 py-1.5 text-xs" type="button" @click="fetchList">刷新</button>
          <button class="btn btn-primary px-3 py-1.5 text-xs" type="button" @click="markAllRead">全部已读</button>
        </div>
      </div>
      <p class="text-sm text-[var(--color-text-secondary)]">
        未读总数：{{ summary.unread_total }}（push: {{ summary.unread_push }} / 提醒: {{ summary.unread_due_reminder }} / 系统: {{ summary.unread_system }}）
      </p>
    </section>

    <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
    <p v-if="infoMessage" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ infoMessage }}</p>

    <section class="space-y-2">
      <article
        v-for="item in items"
        :key="item.id"
        class="card space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ item.title }}</h2>
          <span class="text-xs" :class="item.is_read ? 'text-[var(--color-text-light)]' : 'text-rose-600'">
            {{ item.is_read ? '已读' : '未读' }}
          </span>
        </div>
        <p class="text-sm text-[var(--color-text-secondary)]">{{ item.content }}</p>
        <div class="flex items-center justify-between text-xs text-[var(--color-text-light)]">
          <span>{{ item.type }}</span>
          <span>{{ item.created_at }}</span>
        </div>
        <div class="flex gap-2">
          <button v-if="!item.is_read" class="btn px-3 py-1.5 text-xs" type="button" @click="markRead(item.id)">标记已读</button>
          <NuxtLink v-if="item.link_url" :to="item.link_url" class="btn px-3 py-1.5 text-xs">前往</NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { notificationsRepository } from '~/repositories'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '通知中心 - Mini Note' })

type NotificationItem = {
  id: number
  title: string
  content: string
  type: string
  link_url?: string
  is_read: boolean
  created_at?: string
}

const { getErrorMessage } = useApiMessage()

const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const items = ref<NotificationItem[]>([])
const summary = reactive({
  unread_total: 0,
  unread_push: 0,
  unread_due_reminder: 0,
  unread_system: 0
})

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function applySummary(data: Partial<typeof summary> | undefined) {
  summary.unread_total = Number(data?.unread_total || 0)
  summary.unread_push = Number(data?.unread_push || 0)
  summary.unread_due_reminder = Number(data?.unread_due_reminder || 0)
  summary.unread_system = Number(data?.unread_system || 0)
}

async function fetchList() {
  clearMessages()
  loading.value = true
  try {
    const res = await notificationsRepository.getList({ page: 1, limit: 30 }) as {
      success?: boolean
      data?: { items?: NotificationItem[]; summary?: Partial<typeof summary> }
    }
    if (res?.success) {
      items.value = Array.isArray(res.data?.items) ? res.data.items : []
      applySummary(res.data?.summary)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载通知失败')
  } finally {
    loading.value = false
  }
}

async function markRead(id: number) {
  clearMessages()
  loading.value = true
  try {
    await notificationsRepository.markRead(id)
    await fetchList()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '标记已读失败')
  } finally {
    loading.value = false
  }
}

async function markAllRead() {
  clearMessages()
  loading.value = true
  try {
    const res = await notificationsRepository.markAllRead('all') as { success?: boolean; message?: string }
    if (res?.success) infoMessage.value = res.message || '已全部标记为已读'
    await fetchList()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '批量已读失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>
