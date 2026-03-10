import { defineStore } from 'pinia'
import { ref } from 'vue'
import { planApi, planStepApi } from '@/api'

export const usePlanStore = defineStore('plans', () => {
  const plans = ref([])
  const currentPlan = ref(null) // 含 steps
  const loading = ref(false)

  // ── 计划 ──────────────────────────────────────────
  async function fetchPlans(params = {}) {
    loading.value = true
    try {
      const res = await planApi.getAll(params)
      if (res.success) plans.value = res.data
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchPlan(id) {
    loading.value = true
    try {
      const res = await planApi.getById(id)
      if (res.success) currentPlan.value = res.data
      return res
    } finally {
      loading.value = false
    }
  }

  async function createPlan(data) {
    const res = await planApi.create(data)
    if (res.success) plans.value.unshift(res.data)
    return res
  }

  async function updatePlan(id, data) {
    const res = await planApi.update(id, data)
    if (res.success) {
      const idx = plans.value.findIndex(p => p.id === parseInt(id))
      if (idx !== -1) plans.value[idx] = { ...plans.value[idx], ...res.data }
      if (currentPlan.value?.id === parseInt(id)) {
        currentPlan.value = { ...currentPlan.value, ...res.data }
      }
    }
    return res
  }

  async function deletePlan(id) {
    const res = await planApi.delete(id)
    if (res.success) {
      plans.value = plans.value.filter(p => p.id !== parseInt(id))
      if (currentPlan.value?.id === parseInt(id)) currentPlan.value = null
    }
    return res
  }

  // ── 步骤 ──────────────────────────────────────────
  async function createStep(data) {
    const res = await planStepApi.create(data)
    if (res.success && currentPlan.value?.id === parseInt(data.plan_id)) {
      if (!currentPlan.value.steps) currentPlan.value.steps = []
      currentPlan.value.steps.push(res.data)
      _recalcProgress()
    }
    return res
  }

  async function updateStep(id, data) {
    const res = await planStepApi.update(id, data)
    if (res.success && currentPlan.value?.steps) {
      const idx = currentPlan.value.steps.findIndex(s => s.id === parseInt(id))
      if (idx !== -1) currentPlan.value.steps[idx] = res.data
      _recalcProgress()
    }
    return res
  }

  async function deleteStep(id) {
    const res = await planStepApi.delete(id)
    if (res.success && currentPlan.value?.steps) {
      currentPlan.value.steps = currentPlan.value.steps.filter(s => s.id !== parseInt(id))
      _recalcProgress()
    }
    return res
  }

  async function reorderSteps(items) {
    const res = await planStepApi.reorder(items)
    return res
  }

  function _recalcProgress() {
    if (!currentPlan.value) return
    const steps = currentPlan.value.steps || []
    currentPlan.value.total_steps = steps.length
    currentPlan.value.done_steps = steps.filter(s => s.status === 'completed').length

    // 同步到列表
    const idx = plans.value.findIndex(p => p.id === currentPlan.value.id)
    if (idx !== -1) {
      plans.value[idx].total_steps = currentPlan.value.total_steps
      plans.value[idx].done_steps  = currentPlan.value.done_steps
    }
  }

  return {
    plans, currentPlan, loading,
    fetchPlans, fetchPlan, createPlan, updatePlan, deletePlan,
    createStep, updateStep, deleteStep, reorderSteps
  }
})
