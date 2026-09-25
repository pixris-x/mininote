import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notesApi } from '@/api'
import { NOTE_COLORS } from '@/constants/colors'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const loading = ref(false)
  const currentNote = ref(null)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  })

  async function fetchNotes(params = {}) {
    loading.value = true
    try {
      const res = await notesApi.getAll(params)
      if (res.success) {
        notes.value = Array.isArray(res.data) ? res.data : []

        const total = Number.isFinite(Number(res.total))
          ? Number(res.total)
          : notes.value.length
        const page = Number.isFinite(Number(res.page))
          ? Number(res.page)
          : (Number(params.page) || 1)
        const limit = Number.isFinite(Number(res.limit))
          ? Number(res.limit)
          : (Number(params.limit) || Math.max(notes.value.length, 1))
        const pages = Number.isFinite(Number(res.pages))
          ? Number(res.pages)
          : Math.max(1, Math.ceil(total / Math.max(limit, 1)))

        pagination.value = { total, page, limit, pages }
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchNote(id) {
    loading.value = true
    try {
      const res = await notesApi.getById(id)
      if (res.success) {
        currentNote.value = res.data
      }
      return res
    } finally {
      loading.value = false
    }
  }

  async function createNote(data) {
    const res = await notesApi.create(data)
    if (res.success) {
      notes.value.unshift(res.data)
      pagination.value.total += 1
      pagination.value.pages = Math.max(
        1,
        Math.ceil(pagination.value.total / Math.max(pagination.value.limit, 1))
      )
    }
    return res
  }

  async function updateNote(id, data) {
    const res = await notesApi.update(id, data)
    if (res.success) {
      const idx = notes.value.findIndex(n => n.id === parseInt(id))
      if (idx !== -1) {
        notes.value[idx] = res.data
      }
      if (currentNote.value?.id === parseInt(id)) {
        currentNote.value = { ...currentNote.value, ...res.data }
      }
    }
    return res
  }

  async function deleteNote(id) {
    const res = await notesApi.delete(id)
    if (res.success) {
      notes.value = notes.value.filter(n => n.id !== parseInt(id))
      pagination.value.total = Math.max(0, pagination.value.total - 1)
      pagination.value.pages = Math.max(
        1,
        Math.ceil(pagination.value.total / Math.max(pagination.value.limit, 1))
      )
      if (currentNote.value?.id === parseInt(id)) {
        currentNote.value = null
      }
    }
    return res
  }

  async function togglePin(id, current) {
    return updateNote(id, { is_pinned: !current })
  }

  return { notes, loading, currentNote, pagination, NOTE_COLORS, fetchNotes, fetchNote, createNote, updateNote, deleteNote, togglePin }
})
