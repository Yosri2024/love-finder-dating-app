// API service - talks to Spring Boot backend
import axios from 'axios'

// Overridable at build time (APK/prod): VITE_API_URL=https://mon-backend.com/api npm run build
// Defaults to local backend for web dev.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============ AUTH ============

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const verifyLoginCode = (data) => api.post('/auth/login/verify', data)
export const verifyEmail = (data) => api.post('/auth/verify', data)
export const checkEmail = (email) => api.get('/auth/check-email', { params: { email } })
export const forgotPassword = (email) => api.post('/auth/forgot', { email })
export const resetPassword = (data) => api.post('/auth/reset', data)
export const changePassword = (data) => api.post('/auth/change-password', data)

// ============ USER ============

export const getMyProfile = () => api.get('/users/me')
export const updateProfile = (data) => api.put('/users/me', data)
export const getUserById = (id) => api.get(`/users/${id}`)
export const searchUsers = (q) => api.get('/users/search', { params: { q } })

// ============ MATCHES ============

export const getRecommendations = () => api.get('/matches/recommendations')
export const likeUser = (userId) => api.post(`/matches/like/${userId}`)
export const passUser = (userId) => api.post(`/matches/pass/${userId}`)
export const getMyMatches = () => api.get('/matches')
export const getInvites = () => api.get('/matches/invites')
export const acceptInvite = (userId) => api.post(`/matches/like/${userId}`)
export const declineInvite = (userId) => api.post(`/matches/pass/${userId}`)

// ============ MESSAGES ============

export const getMessages = (matchId) => api.get(`/messages/${matchId}`)
export const sendMessage = (matchId, content) =>
  api.post(`/messages/${matchId}`, { content })
export const editMessage = (messageId, content) =>
  api.put(`/messages/${messageId}`, { content })
export const deleteMessage = (messageId) =>
  api.delete(`/messages/${messageId}`)

export default api
