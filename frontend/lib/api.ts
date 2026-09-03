const API_BASE = '/api/v1'

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`)
  }

  const data = await res.json()
  if (data.code !== 0) {
    throw new Error(data.message || '请求失败')
  }

  return data.data
}

// 公开 API
export const api = {
  // 轮播图
  getBanners: (position = 'home') => fetchAPI(`/banners?position=${position}`),

  // 案例
  getCases: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/cases?${query}`)
  },
  getCase: (id: number) => fetchAPI(`/cases/${id}`),
  getFeaturedCases: (limit = 6) => fetchAPI(`/cases/featured?limit=${limit}`),

  // 视频
  getVideos: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/videos?${query}`)
  },
  getVideo: (id: number) => fetchAPI(`/videos/${id}`),
  getFeaturedVideos: (limit = 6) => fetchAPI(`/videos/featured?limit=${limit}`),
  incrementView: (id: number) => fetchAPI(`/videos/${id}/view`, { method: 'POST' }),

  // 新闻
  getNews: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString()
    return fetchAPI(`/news?${query}`)
  },
  getNewsDetail: (id: number) => fetchAPI(`/news/${id}`),

  // 服务
  getServices: () => fetchAPI('/services'),
  getServiceBySlug: (slug: string) => fetchAPI(`/services/${slug}`),

  // 分类
  getCategories: (type: string) => fetchAPI(`/categories/${type}`),

  // 设置
  getSettings: () => fetchAPI('/settings'),

  // 联系
  submitContact: (data: { name: string; phone?: string; email?: string; content: string }) =>
    fetchAPI('/contact', { method: 'POST', body: JSON.stringify(data) }),
}
