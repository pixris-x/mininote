// ====== 日历 API ======
import { api } from './client'

export const calendarApi = {
  getMonth: (year, month) => api.get('/calendar/month', { params: { year, month } }),
  getDay: (date) => api.get('/calendar/day', { params: { date } }),
  linkNote: (noteId, date) => api.post('/calendar/link', { note_id: noteId, date }),
  unlinkNote: (noteId, date) => api.delete('/calendar/link', { data: { note_id: noteId, date } }),
  getPlanSteps: (year, month) => api.get('/calendar/plan-steps', { params: { year, month } }),
  getBirthdays: () => api.get('/calendar/birthdays'),
  createBirthday: (data) => api.post('/calendar/birthdays', data),
  updateBirthday: (id, data) => api.put(`/calendar/birthdays/${id}`, data),
  deleteBirthday: (id) => api.delete(`/calendar/birthdays/${id}`)
}
