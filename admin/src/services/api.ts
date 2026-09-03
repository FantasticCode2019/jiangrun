import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
	const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 0 && data.code !== undefined) {
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return data
  },
  (error) => {
    if (error.response?.status === 401) {
	  sessionStorage.removeItem('token')
	  sessionStorage.removeItem('user')
	  window.location.href = '/admin/login'
    }
	return Promise.reject(new Error(error.response?.data?.message || error.message || '请求失败'))
  }
)

// 认证
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/login', data),
  getProfile: () => api.get('/admin/profile'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.put('/admin/password', data),
}

// 仪表盘
export const dashboardAPI = {
  getData: () => api.get('/admin/dashboard'),
}

// 案例
export const caseAPI = {
  getList: (params?: any) => api.get('/admin/cases', { params }),
  getById: (id: number) => api.get(`/admin/cases/${id}`),
  create: (data: any) => api.post('/admin/cases', data),
  update: (id: number, data: any) => api.put(`/admin/cases/${id}`, data),
  delete: (id: number) => api.delete(`/admin/cases/${id}`),
}

// 视频
export const videoAPI = {
  getList: (params?: any) => api.get('/admin/videos', { params }),
  getById: (id: number) => api.get(`/admin/videos/${id}`),
  create: (data: any) => api.post('/admin/videos', data),
  update: (id: number, data: any) => api.put(`/admin/videos/${id}`, data),
  delete: (id: number) => api.delete(`/admin/videos/${id}`),
}

// 新闻
export const newsAPI = {
  getList: (params?: any) => api.get('/admin/news', { params }),
  getById: (id: number) => api.get(`/admin/news/${id}`),
  create: (data: any) => api.post('/admin/news', data),
  update: (id: number, data: any) => api.put(`/admin/news/${id}`, data),
  delete: (id: number) => api.delete(`/admin/news/${id}`),
}

// 服务
export const serviceAPI = {
  getList: (params?: any) => api.get('/admin/services', { params }),
  getById: (id: number) => api.get(`/admin/services/${id}`),
  create: (data: any) => api.post('/admin/services', data),
  update: (id: number, data: any) => api.put(`/admin/services/${id}`, data),
  delete: (id: number) => api.delete(`/admin/services/${id}`),
}

// 分类
export const categoryAPI = {
  getList: (params?: any) => api.get('/admin/categories', { params }),
  create: (data: any) => api.post('/admin/categories', data),
  update: (id: number, data: any) => api.put(`/admin/categories/${id}`, data),
  delete: (id: number) => api.delete(`/admin/categories/${id}`),
}

// 轮播图
export const bannerAPI = {
  getList: () => api.get('/admin/banners'),
  create: (data: any) => api.post('/admin/banners', data),
  update: (id: number, data: any) => api.put(`/admin/banners/${id}`, data),
  delete: (id: number) => api.delete(`/admin/banners/${id}`),
}

// 设置
export const settingAPI = {
  get: () => api.get('/admin/settings'),
  update: (data: Record<string, string>) => api.put('/admin/settings', data),
}

// 留言
export const contactAPI = {
  getList: () => api.get('/admin/contacts'),
  markRead: (id: number) => api.put(`/admin/contacts/${id}/read`),
  delete: (id: number) => api.delete(`/admin/contacts/${id}`),
}

// 文件上传
export const uploadAPI = {
  image: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/admin/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },
  /**
   * 大文件分片上传（断点续传）。
   * @param file 待上传文件
   * @param subdir images | videos
   * @param onProgress 进度回调（0-100）
   * @param opts.onUploadId 每片上传前可选回调（如续传文件命中时使用本地已存的 upload_id）
   * @returns { url } 最终可访问路径
   */
  chunkUpload: async (
    file: File,
    subdir: 'images' | 'videos',
    onProgress?: (percent: number) => void,
  ) => {
    const resumeKey = `upload_${subdir}_${file.name}_${file.size}`

    // 断点续传：从 localStorage 恢复上次的 upload_id（分片临时目录仍在后端）
    let uploadId = localStorage.getItem(resumeKey) || ''

    // 1. 初始化
    const initRes: any = await api.post('/admin/upload/chunk/init', {
      filename: file.name,
      size: file.size,
      subdir,
      upload_id: uploadId || undefined, // 复用或新建
    })
    const initData = initRes.data?.data || initRes.data
    uploadId = initData.upload_id
	const chunkSize = Number(initData.chunk_size)
	const chunkCount = Number(initData.chunk_count) || Math.ceil(file.size / chunkSize)
	if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0 || !Number.isSafeInteger(chunkCount) || chunkCount <= 0) {
	  throw new Error('服务端返回的分片参数无效')
	}
    localStorage.setItem(resumeKey, uploadId)

    // 2. 查询已上传分片
    const uploaded = new Set<number>()
    try {
      const st: any = await api.get('/admin/upload/chunk/status', { params: { upload_id: uploadId } })
	  const done = st.data?.uploaded || []
      done.forEach((i: number) => uploaded.add(i))
    } catch {}

    // 3. 并发上传缺失分片（3 并发）
    let completedRef = uploaded.size
    let cursor = 0
    const uploadChunk = async (i: number) => {
      if (uploaded.has(i)) return
	  const blob = file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size))
      const fd = new FormData()
      fd.append('upload_id', uploadId)
      fd.append('index', String(i))
      fd.append('file', blob, file.name)
      await api.post('/admin/upload/chunk', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      })
      completedRef += 1
      onProgress?.(Math.round((completedRef / chunkCount) * 100))
    }

    const concurrency = Math.min(3, chunkCount)
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < chunkCount) {
        const i = cursor++
        await uploadChunk(i)
      }
    })
    await Promise.all(workers)
    onProgress?.(100)

    // 4. 合并完成
    const fd = new FormData()
    fd.append('upload_id', uploadId)
    const comp: any = await api.post('/admin/upload/chunk/complete', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const result = comp.data?.data || comp.data
    localStorage.removeItem(resumeKey) // 上传成功，清理续传记录
    return result.url || result
  },
}

export default api
