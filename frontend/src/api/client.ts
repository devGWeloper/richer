import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Extract error message
    const status = error.response?.status
    const detail = error.response?.data?.detail

    console.error('[API Error]', { status, detail, error })

    // Handle 401 - Unauthorized
    if (status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return client(error.config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }

    // Show toast for all other errors
    if (status !== 401) {
      let message = '요청 처리 중 오류가 발생했습니다'

      if (status === 422) {
        message = detail || '입력 데이터가 올바르지 않습니다'
      } else if (status === 404) {
        message = detail || '요청한 리소스를 찾을 수 없습니다'
      } else if (status === 500) {
        message = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        if (detail) {
          message = `서버 오류: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
        }
      } else if (status === 400) {
        message = detail || '잘못된 요청입니다'
      } else if (!error.response) {
        message = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
      }

      // Dynamic import to avoid circular dependency
      import('@/stores/toastStore').then(({ toast }) => {
        toast.error(message)
      })
    }

    return Promise.reject(error)
  }
)

export default client
