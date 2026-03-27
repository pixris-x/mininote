export const calendarRepository = {
  getMonth: (year: number, month: number) => useApiClient()('/calendar/month', { query: { year, month } }),
  getDay: (date: string) => useApiClient()('/calendar/day', { query: { date } }),
  linkNote: (noteId: number | string, date: string) =>
    useApiClient()('/calendar/link', { method: 'POST', body: { note_id: noteId, date } }),
  unlinkNote: (noteId: number | string, date: string) =>
    useApiClient()('/calendar/link', { method: 'DELETE', body: { note_id: noteId, date } }),
  getPlanSteps: (year: number, month: number) =>
    useApiClient()('/calendar/plan-steps', { query: { year, month } })
}

