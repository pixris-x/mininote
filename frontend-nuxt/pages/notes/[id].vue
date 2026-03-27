<template>
  <div class="space-y-4">
    <section class="card space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">记事详情</h1>
        <button class="btn px-3 py-1.5 text-sm" type="button" @click="navigateTo('/notes')">返回列表</button>
      </div>

      <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
      <p v-if="infoMessage" class="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ infoMessage }}</p>

      <div class="grid gap-2 md:grid-cols-2">
        <div class="space-y-1">
          <label class="text-sm font-medium">标题</label>
          <input v-model.trim="form.title" class="input" type="text" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">颜色</label>
          <input v-model.trim="form.color" class="input" type="text" />
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">标签（逗号分隔）</label>
        <input v-model.trim="form.tagsText" class="input" type="text" />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">内容</label>
        <textarea v-model="form.content" class="input min-h-72"></textarea>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="btn btn-primary px-4 py-2 text-sm" :disabled="loading" type="button" @click="saveNote">
          {{ loading ? '保存中...' : '保存修改' }}
        </button>
        <button class="btn px-4 py-2 text-sm" :disabled="loading" type="button" @click="togglePin">
          {{ form.isPinned ? '取消置顶' : '置顶' }}
        </button>
        <button class="btn px-4 py-2 text-sm" :disabled="loading" type="button" @click="toggleArchive">
          {{ form.isArchived ? '取消归档' : '归档' }}
        </button>
        <button class="btn px-4 py-2 text-sm text-rose-600" :disabled="loading" type="button" @click="deleteNote">
          删除记事
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { notesRepository } from '~/repositories'

definePageMeta({ middleware: ['auth'] })
useHead({ title: '记事详情' })

type NoteDetail = {
  id: number
  title?: string
  content?: string
  color?: string
  tags?: string[]
  is_pinned?: boolean
  is_archived?: boolean
}

const route = useRoute()
const { getErrorMessage } = useApiMessage()

const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const form = reactive({
  title: '',
  content: '',
  color: '#FFFFFF',
  tagsText: '',
  isPinned: false,
  isArchived: false
})

const noteId = computed(() => Number(route.params.id))

function normalizeTags(tagsText: string) {
  return [...new Set(tagsText.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 10)
}

function clearMessages() {
  errorMessage.value = ''
  infoMessage.value = ''
}

function applyFormFromNote(note: NoteDetail) {
  form.title = note.title || ''
  form.content = note.content || ''
  form.color = note.color || '#FFFFFF'
  form.tagsText = Array.isArray(note.tags) ? note.tags.join(', ') : ''
  form.isPinned = Boolean(note.is_pinned)
  form.isArchived = Boolean(note.is_archived)
}

async function fetchNote() {
  clearMessages()
  loading.value = true
  try {
    const res = await notesRepository.getById(noteId.value) as { success?: boolean; data?: NoteDetail }
    if (res?.success && res.data) {
      applyFormFromNote(res.data)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '加载记事详情失败')
  } finally {
    loading.value = false
  }
}

async function saveNote() {
  clearMessages()
  loading.value = true
  try {
    const res = await notesRepository.update(noteId.value, {
      title: form.title.trim() || '无标题',
      content: form.content,
      color: form.color || '#FFFFFF',
      tags: normalizeTags(form.tagsText),
      is_pinned: form.isPinned,
      is_archived: form.isArchived
    }) as { success?: boolean; message?: string; data?: NoteDetail }

    if (res?.success) {
      infoMessage.value = res.message || '保存成功'
      if (res.data) applyFormFromNote(res.data)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '保存失败')
  } finally {
    loading.value = false
  }
}

async function togglePin() {
  form.isPinned = !form.isPinned
  await saveNote()
}

async function toggleArchive() {
  form.isArchived = !form.isArchived
  await saveNote()
}

async function deleteNote() {
  if (!import.meta.client) return
  if (!window.confirm('确定删除这条记事吗？')) return

  clearMessages()
  loading.value = true
  try {
    const res = await notesRepository.delete(noteId.value) as { success?: boolean; message?: string }
    if (res?.success) {
      await navigateTo('/notes')
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '删除失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchNote)
</script>
