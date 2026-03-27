<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <h1 class="text-xl font-bold">记账本</h1>

      <form class="grid gap-2 md:grid-cols-5" @submit.prevent="createExpense">
        <select v-model.number="createForm.category_id" class="input md:col-span-2">
          <option :value="0">未分类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input v-model.number="createForm.amount" class="input" type="number" min="0.01" step="0.01" placeholder="金额" required />
        <input v-model="createForm.expense_date" class="input" type="date" />
        <button class="btn btn-primary px-4 py-2 text-sm" :disabled="loading" type="submit">
          {{ loading ? '保存中...' : '新增' }}
        </button>
      </form>

      <input v-model.trim="createForm.note" class="input" type="text" placeholder="备注（可选）" />
    </section>

    <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
    <p v-if="infoMessage" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ infoMessage }}</p>

    <section class="card space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span>记录数：{{ total }}</span>
        <button class="btn px-3 py-1.5 text-xs" type="button" @click="fetchExpenses">刷新</button>
      </div>
      <div class="space-y-2">
        <article
          v-for="item in expenses"
          :key="item.id"
          class="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3"
        >
          <div>
            <p class="font-medium">{{ item.category_name || '未分类' }} · ¥{{ Number(item.amount || 0).toFixed(2) }}</p>
            <p class="text-xs text-[var(--color-text-secondary)]">{{ item.expense_date }} {{ item.note || '' }}</p>
          </div>
          <button class="btn px-3 py-1.5 text-xs text-rose-600" type="button" @click="removeExpense(item.id)">删除</button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { expenseCategoryRepository, expenseRepository } from '~/repositories'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '记账本' })

type Category = { id: number; name: string }
type ExpenseItem = {
  id: number
  amount: number
  note?: string
  expense_date: string
  category_name?: string
}

const { getErrorMessage } = useApiMessage()
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const categories = ref<Category[]>([])
const expenses = ref<ExpenseItem[]>([])
const total = ref(0)

const createForm = reactive({
  category_id: 0,
  amount: 0,
  note: '',
  expense_date: new Date().toISOString().slice(0, 10)
})

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

async function fetchCategories() {
  const res = await expenseCategoryRepository.getAll() as { success?: boolean; data?: Category[] }
  if (res?.success) categories.value = Array.isArray(res.data) ? res.data : []
}

async function fetchExpenses() {
  clearMessages()
  loading.value = true
  try {
    const now = new Date()
    const res = await expenseRepository.getList({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      page: 1,
      limit: 50
    }) as { success?: boolean; data?: ExpenseItem[]; total?: number }

    if (res?.success) {
      expenses.value = Array.isArray(res.data) ? res.data : []
      total.value = Number(res.total || expenses.value.length)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载记账记录失败')
  } finally {
    loading.value = false
  }
}

async function createExpense() {
  clearMessages()
  if (!createForm.amount || createForm.amount <= 0) {
    errorMessage.value = '请输入正确金额'
    return
  }

  loading.value = true
  try {
    const res = await expenseRepository.create({
      category_id: createForm.category_id || null,
      amount: createForm.amount,
      note: createForm.note,
      expense_date: createForm.expense_date
    }) as { success?: boolean }
    if (res?.success) {
      infoMessage.value = '记账成功'
      createForm.amount = 0
      createForm.note = ''
      await fetchExpenses()
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '新增记账失败')
  } finally {
    loading.value = false
  }
}

async function removeExpense(id: number) {
  if (!import.meta.client) return
  if (!window.confirm('确定删除该记录吗？')) return

  clearMessages()
  loading.value = true
  try {
    await expenseRepository.delete(id)
    await fetchExpenses()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '删除失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchCategories()
  await fetchExpenses()
})
</script>
