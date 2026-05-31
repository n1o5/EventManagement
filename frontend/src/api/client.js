import axios from 'axios'
import { useAuthStore } from '../store/useStore'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(r => r, (err) => {
  if (err.response?.status === 401 && useAuthStore.getState().user) { useAuthStore.getState().logout(); window.location.href = '/login' }
  return Promise.reject(err)
})
export default api

export const authAPI = {
  register: (d)    => api.post('/auth/register', d),
  login:    (d)    => api.post('/auth/login', d),
  me:       ()     => api.get('/auth/me'),
}
export const eventsAPI = {
  list:     (p)    => api.get('/events', { params: p }),
  get:      (id)   => api.get(`/events/${id}`),
  create:   (d)    => api.post('/events', d),
  update:   (id,d) => api.put(`/events/${id}`, d),
  delete:   (id)   => api.delete(`/events/${id}`),
  seatMap:  (id)   => api.get(`/events/${id}/seats`),
  myEvents: ()     => api.get('/events/my'),
  reviews: (id) => api.get(`/events/${id}/reviews`),
  createReview: (id, data) => api.post(`/events/${id}/reviews`, data),
}
export const bookingsAPI = {
  create: (d)  => api.post('/bookings', d),
  list:   ()   => api.get('/bookings'),
  get:    (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.delete(`/bookings/${id}`),
}
export const recommendationsAPI = {
  get: (limit = 6) => api.get('/recommendations', { params: { limit } }),
}
export const organizerAPI = {
  analytics:   ()   => api.get('/organizer/analytics'),
  eventDetail: (id) => api.get(`/organizer/analytics/events/${id}`),
  events:      ()   => api.get('/organizer/events'),
}
export const adminAPI = {
  analytics:       ()   => api.get('/admin/analytics'),
  organizers:      ()   => api.get('/admin/organizers'),
  organizerDetail: (id) => api.get(`/admin/organizers/${id}`),
}
