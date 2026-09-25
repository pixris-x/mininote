// ====== 上传 API ======
import { api } from './client'

export const uploadApi = {
  image: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/image', form)
  }
}
