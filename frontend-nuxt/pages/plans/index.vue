<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">我的计划</h1>
        <button class="btn btn-primary px-4 py-2 text-sm" type="button" @click="showCreate = !showCreate">
          {{ showCreate ? '收起' : '新建计划' }}
        </button>
      </div>

      <form v-if="showCreate" class="space-y-2 rounded-xl border border-[var(--color-border)] p-3" @submit.prevent="createPlan">
        <input v-model.trim="createForm.title" class="input" type="text" placeholder="计划标题" required />
        <textarea v-model="createForm.description" class="input min-h-24" placeholder="计划描述"></textarea>
        <div class="grid grid-cols-2 gap-2">
          <input v-model.trim="createForm.color" class="input" type="text" placeholder="#FFFFFF" />
          <select v-model="createForm.status" class="input">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <button class="btn btn-primary px-4 py-2 text-sm" :disabled="loading" type="submit">
          {{ loading ? '创建中...' : '保存计划' }}
        </button>
      </form>
    </section>

    <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
    <p v-if="infoMessage" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ infoMessage }}</p>

    <section class="grid gap-3 md:grid-cols-2">
      <article v-for="plan in plans" :key="plan.id" class="card space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ plan.title }}</h2>
          <span class="rounded-full bg-[var(--theme-primary-light)] px-2 py-0.5 text-xs text-[var(--theme-primary-dark)]">
            {{ plan.status }}
          </span>
        </div>
        <p class="text-sm text-[var(--color-text-secondary)]">{{ plan.description || '（无描述）' }}</p>
        <p class="text-xs text-[var(--color-text-light)]">
          进度 {{ Number(plan.done_steps || 0) }} / {{ Number(plan.total_steps || 0) }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button class="btn px-3 py-1.5 text-xs" type="button" @click="removePlan(plan.id)">删除</button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { plansRepository } from '~/repositories'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '我的计划 - Mini Note' })

type PlanItem = {
  id: number
  title: string
  description?: string
  status?: string
  total_steps?: number
  done_steps?: number
}

const { getErrorMessage } = useApiMessage()
const loading = ref(false)
const showCreate = ref(false)
const plans = ref<PlanItem[]>([])
const errorMessage = ref('')
const infoMessage = ref('')

const createForm = reactive({
  title: '',
  description: '',
  color: '#FFFFFF',
  status: 'active'
})

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

async function fetchPlans() {
  clearMessages()
  loading.value = true
  try {
    const res = await plansRepository.getAll() as { success?: boolean; data?: PlanItem[] }
    if (res?.success) plans.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载计划失败')
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  clearMessages()
  loading.value = true
  try {
    const res = await plansRepository.create({
      title: createForm.title.trim(),
      description: createForm.description,
      color: createForm.color || '#FFFFFF',
      status: createForm.status
    }) as { success?: boolean }

    if (res?.success) {
      infoMessage.value = '计划创建成功'
      createForm.title = ''
      createForm.description = ''
      createForm.color = '#FFFFFF'
      createForm.status = 'active'
      showCreate.value = false
      await fetchPlans()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '创建计划失败')
  } finally {
    loading.value = false
  }
}

async function removePlan(id: number) {
  if (!import.meta.client) return
  if (!window.confirm('确定删除该计划吗？')) return

  clearMessages()
  loading.value = true
  try {
    const res = await plansRepository.delete(id) as { success?: boolean; message?: string }
    if (res?.success) infoMessage.value = res.message || '计划已删除'
    await fetchPlans()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '删除计划失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchPlans)
</script>
