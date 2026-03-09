import { defineStore } from 'pinia'
import { ref } from 'vue'
import { expenseApi, expenseCategoryApi } from '@/api'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref([])
  const categories = ref([])
  const stats = ref(null)
  const loading = ref(false)
  const total = ref(0)

  // 获取分类列表
  async function fetchCategories() {
    try {
      const res = await expenseCategoryApi.getAll()
      if (res.success) categories.value = res.data
    } catch (e) {
      console.error('获取分类失败', e)
    }
  }

  // 获取消费记录
  async function fetchExpenses(params = {}) {
    loading.value = true
    try {
      const res = await expenseApi.getList(params)
      if (res.success) {
        expenses.value = res.data
        total.value = res.total
      }
    } catch (e) {
      console.error('获取消费记录失败', e)
    } finally {
      loading.value = false
    }
  }

  // 获取统计
  async function fetchStats(year, month) {
    try {
      const res = await expenseApi.getStats(year, month)
      if (res.success) stats.value = res.data
    } catch (e) {
      console.error('获取统计失败', e)
    }
  }

  // 新增记录
  async function createExpense(data) {
    const res = await expenseApi.create(data)
    if (res.success) {
      expenses.value.unshift(res.data)
      total.value++
    }
    return res
  }

  // 修改记录
  async function updateExpense(id, data) {
    const res = await expenseApi.update(id, data)
    if (res.success) {
      const idx = expenses.value.findIndex(e => e.id === id)
      if (idx !== -1) expenses.value[idx] = res.data
    }
    return res
  }

  // 删除记录
  async function deleteExpense(id) {
    const res = await expenseApi.delete(id)
    if (res.success) {
      expenses.value = expenses.value.filter(e => e.id !== id)
      total.value--
    }
    return res
  }

  // 新增自定义分类
  async function createCategory(data) {
    const res = await expenseCategoryApi.create(data)
    if (res.success) categories.value.push(res.data)
    return res
  }

  // 删除自定义分类
  async function deleteCategory(id) {
    const res = await expenseCategoryApi.delete(id)
    if (res.success) categories.value = categories.value.filter(c => c.id !== id)
    return res
  }

  return {
    expenses, categories, stats, loading, total,
    fetchCategories, fetchExpenses, fetchStats,
    createExpense, updateExpense, deleteExpense,
    createCategory, deleteCategory
  }
})
