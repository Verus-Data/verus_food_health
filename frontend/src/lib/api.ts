import axios from 'axios'
import * as mock from './mockData'
import { getToken, authHeaders } from './auth'

/** Base URL for the CGI backend */
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/cgi-bin/api'

export const IS_MOCK = process.env.NEXT_PUBLIC_IS_MOCK === 'true'

/** Axios instance configured for the CGI backend with JWT auth */
export const api = axios.create({
  baseURL: API_URL,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const headers = authHeaders()
  Object.entries(headers).forEach(([key, value]) => {
    config.headers[key] = value
  })
  return config
})

// Handle 401 responses (token expired / invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gut_health_token')
      localStorage.removeItem('gut_health_user')
      window.location.href = '/auth/signin'
    }
    return Promise.reject(error)
  }
)

// ---- Auth endpoints ----

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/auth/login`, { email, password })
  return response.data
}

export const register = async (email: string, password: string, name?: string) => {
  const response = await axios.post(`${API_URL}/auth/register`, { email, password, name })
  return response.data
}

// ---- Data endpoints ----

export const getTimeline = async () => {
  if (IS_MOCK) {
    const food = await mock.mockApi.getFoodEntries()
    const outcomes = await mock.mockApi.getHealthOutcomes()
    return [...food, ...outcomes].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
  const [foodRes, outcomesRes] = await Promise.all([
    api.get('/food-entries'),
    api.get('/health-outcomes'),
  ])
  return [...foodRes.data, ...outcomesRes.data].sort((a: any, b: any) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export const getCorrelations = async () => {
  if (IS_MOCK) {
    return {
      total_food_events: mock.mockFoodEntries.length,
      total_bm_events: mock.mockHealthOutcomes.filter(o => o.type === 'bm').length,
      ingredient_correlations: await mock.mockApi.getCorrelations(),
    }
  }
  const response = await api.get('/analysis/correlations')
  return response.data
}

export const getFoodEntries = async () => {
  if (IS_MOCK) {
    return mock.mockApi.getFoodEntries()
  }
  const response = await api.get('/food-entries')
  return response.data
}

export const getHealthOutcomes = async () => {
  if (IS_MOCK) {
    return mock.mockApi.getHealthOutcomes()
  }
  const response = await api.get('/health-outcomes')
  return response.data
}

export const createFoodEntry = async (data: any) => {
  if (IS_MOCK) {
    return mock.mockApi.createFoodEntry(data)
  }
  const response = await api.post('/food-entries', data)
  return response.data
}

export const createHealthOutcome = async (data: any) => {
  if (IS_MOCK) {
    return mock.mockApi.createHealthOutcome(data)
  }
  const response = await api.post('/health-outcomes', data)
  return response.data
}

export const uploadPhoto = async (file: File) => {
  if (IS_MOCK) {
    return { photoUrl: '/mock-photos/placeholder.jpg' }
  }
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const getPredictions = async (userId: string) => {
  if (IS_MOCK) {
    return { userId, warnings: [] }
  }
  const response = await api.get(`/analysis/predictions?userId=${userId}`)
  return response.data
}

export const getTrends = async (userId: string, days = 30) => {
  if (IS_MOCK) {
    return { userId, dailyTrends: [], weeklyTrends: [] }
  }
  const response = await api.get(`/analysis/trends?userId=${userId}&days=${days}`)
  return response.data
}

export const exportData = async (userId: string, format: 'csv' | 'json' = 'csv') => {
  if (IS_MOCK) {
    return { error: 'Export not available in mock mode' }
  }
  const response = await api.get(`/analysis/export?userId=${userId}&format=${format}`, {
    responseType: format === 'csv' ? 'blob' : 'json',
  })
  return response.data
}

export const runAnalysis = async (userId: string) => {
  if (IS_MOCK) {
    return { error: 'Analysis not available in mock mode' }
  }
  const response = await api.post(`/analysis/run?userId=${userId}`)
  return response.data
}