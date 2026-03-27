export function useApiMessage() {
  function getErrorMessage(error: unknown, fallback = '请求失败，请稍后重试') {
    if (error && typeof error === 'object') {
      const e = error as {
        statusMessage?: string
        message?: string
        data?: { message?: string }
      }
      return e.data?.message || e.statusMessage || e.message || fallback
    }
    return fallback
  }

  return { getErrorMessage }
}

