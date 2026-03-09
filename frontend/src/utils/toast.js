import { ref } from 'vue'

const toasts = ref([])
let idCounter = 0

function show(message, type = 'info', duration = 3000) {
  const id = ++idCounter
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export const toast = {
  success: (msg, dur) => show(msg, 'success', dur),
  error: (msg, dur) => show(msg, 'error', dur),
  info: (msg, dur) => show(msg, 'info', dur)
}

export { toasts }
