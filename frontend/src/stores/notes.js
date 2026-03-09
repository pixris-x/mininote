import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notesApi } from '@/api'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const loading = ref(false)
  const currentNote = ref(null)

  const NOTE_COLORS = [
    { label: '白色', value: '#FFFFFF' },
    { label: '粉色', value: '#FFD6E0' },
    { label: '薄荷', value: '#D4F5E9' },
    { label: '薰衣草', value: '#E4E8F8' },
    { label: '蜜桃', value: '#FFE8D6' },
    { label: '柠檬', value: '#FFF8D6' },
    { label: '天蓝', value: '#D6EEFF' }
  ]

  async function fetchNotes(params = {}) {
    loading.value = true
    try {
      const res = await notesApi.getAll(params)
      if (res.success) {
        notes.value = res.data
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
      if (currentNote.value?.id === parseInt(id)) {
        currentNote.value = null
      }
    }
    return res
  }

  async function togglePin(id, current) {
    return updateNote(id, { is_pinned: !current })
  }

  return { notes, loading, currentNote, NOTE_COLORS, fetchNotes, fetchNote, createNote, updateNote, deleteNote, togglePin }
})
