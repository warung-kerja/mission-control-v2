import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
      ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token
      : null
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error - API server may be unavailable')
      return Promise.reject({
        message: 'Network error. Please check your connection and try again.',
        isNetworkError: true,
      })
    }

    const status = error.response?.status
    const data = error.response?.data

    // Handle specific HTTP status codes
    switch (status) {
      case 401:
        // Handle unauthorized - clear auth and redirect to login
        localStorage.removeItem('auth-storage')
        window.location.href = '/login'
        break
      case 403:
        console.error('Forbidden - insufficient permissions')
        break
      case 404:
        console.error('Resource not found:', error.config?.url)
        break
      case 422:
        console.error('Validation error:', data)
        break
      case 429:
        console.error('Rate limit exceeded')
        break
      case 500:
      case 502:
      case 503:
      case 504:
        console.error('Server error:', status, data)
        break
      default:
        console.error('API error:', status, data)
    }

    // Enhance error object with user-friendly message
    const enhancedError = {
      ...error,
      userMessage: data?.message || data?.error || getDefaultErrorMessage(status),
      status,
      isApiError: true,
    }

    return Promise.reject(enhancedError)
  }
)

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 422:
      return 'Validation failed. Please check your input.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'An unexpected error occurred. Please try again later.'
    case 503:
      return 'Service temporarily unavailable. Please try again later.'
    default:
      return 'An error occurred. Please try again.'
  }
}

// API endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: { email: string; name: string; password: string }) =>
    apiClient.post('/auth/register', data),
  me: () => apiClient.get('/auth/me'),
  refresh: () => apiClient.post('/auth/refresh'),
}

export const projectsApi = {
  list: () => apiClient.get('/projects'),
  get: (id: string) => apiClient.get(`/projects/${id}`),
  create: (data: unknown) => apiClient.post('/projects', data),
  update: (id: string, data: unknown) => apiClient.put(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
}

export const tasksApi = {
  list: (params?: { projectId?: string; assigneeId?: string; status?: string }) =>
    apiClient.get('/tasks', { params }),
  get: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: unknown) => apiClient.post('/tasks', data),
  update: (id: string, data: unknown) => apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
}

export const teamApi = {
  list: () => apiClient.get('/users'),
  get: (id: string) => apiClient.get(`/users/${id}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/users/${id}/status`, { status }),
  activityFeed: () => apiClient.get('/team/activity-feed'),
}

export const dashboardApi = {
  stats: () => apiClient.get('/dashboard/stats'),
  activity: () => apiClient.get('/dashboard/activity'),
}

export const notificationsApi = {
  list: () => apiClient.get('/notifications'),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
}

export const teamAnalyticsApi = {
  analytics: () => apiClient.get('/team/analytics'),
  members: () => apiClient.get('/team/members'),
  productivity: () => apiClient.get('/team/productivity'),
  activityFeed: () => apiClient.get('/team/activity-feed'),
}

export const calendarApi = {
  events: (params?: { startDate?: string; endDate?: string; projectId?: string }) =>
    apiClient.get('/calendar/events', { params }),
  summary: (params?: { year?: number; month?: number; projectId?: string }) =>
    apiClient.get('/calendar/summary', { params }),
}

export const messagesApi = {
  getByProject: (projectId: string, params?: { limit?: number; before?: string }) =>
    apiClient.get(`/messages/project/${projectId}`, { params }),
  send: (projectId: string, content: string) =>
    apiClient.post(`/messages/project/${projectId}`, { content }),
  getRecent: (params?: { limit?: number }) =>
    apiClient.get('/messages/recent', { params }),
  delete: (id: string) => apiClient.delete(`/messages/${id}`),
}

export const memoriesApi = {
  list: (params?: { category?: string; search?: string; archived?: boolean; tags?: string[] }) =>
    apiClient.get('/memories', { params }),
  get: (id: string) => apiClient.get(`/memories/${id}`),
  create: (data: unknown) => apiClient.post('/memories', data),
  update: (id: string, data: unknown) => apiClient.put(`/memories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/memories/${id}`),
  categories: () => apiClient.get('/memories/categories'),
  stats: () => apiClient.get('/memories/stats'),
  search: (query: string) => apiClient.get(`/memories/search/${query}`),
}
