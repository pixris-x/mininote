export const uploadRepository = {
  image: (file: File) => {
    const form = new FormData()
    form.append('file', file)

    return useApiClient()('/upload/image', {
      method: 'POST',
      body: form
    })
  }
}

