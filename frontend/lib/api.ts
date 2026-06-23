import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: Partial<{ full_name: string; bio: string; avatar_url: string }>) =>
    api.put('/auth/me', data),
}

export const sessionsAPI = {
  create: (data: any) => api.post('/sessions/', data),
  list: (params?: any) => api.get('/sessions/', { params }),
  mySessions: () => api.get('/sessions/my-sessions'),
  get: (id: string) => api.get(`/sessions/${id}`),
  join: (id: string, data?: any) => api.post(`/sessions/${id}/join`, data),
  leave: (id: string) => api.post(`/sessions/${id}/leave`),
  start: (id: string) => api.post(`/sessions/${id}/start`),
  end: (id: string) => api.post(`/sessions/${id}/end`),
  handleRequest: (sessionId: string, userId: string, action: { action: string; role?: string }) =>
    api.post(`/sessions/${sessionId}/requests/${userId}`, action),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  getReplay: (id: string) => api.get(`/sessions/${id}/replay`),
  getSummary: (id: string) => api.get(`/sessions/${id}/summary`),
}

export const argumentsAPI = {
  create: (data: any) => api.post('/arguments/', data),
  getBySession: (sessionId: string, parentId?: string) =>
    api.get(`/arguments/session/${sessionId}`, { params: { parent_id: parentId } }),
  get: (id: string) => api.get(`/arguments/${id}`),
  vote: (id: string, voteType: 'upvote' | 'downvote') =>
    api.post(`/arguments/${id}/vote`, null, { params: { vote_type: voteType } }),
  delete: (id: string) => api.delete(`/arguments/${id}`),
}

export const votesAPI = {
  proposeStatement: (sessionId: string, statement: string) => api.post(`/votes/sessions/${sessionId}/statements`, { statement }),
  voteStatement: (sessionId: string, statementId: string, vote: string) => api.post(`/votes/sessions/${sessionId}/statements/${statementId}/vote`, { vote }),
  getStatements: (sessionId: string) => api.get(`/votes/sessions/${sessionId}/statements`),
  getConsensusReport: (sessionId: string) => api.get(`/votes/sessions/${sessionId}/consensus-report`),
}

export const sessionControlAPI = {
  pause: (sessionId: string) => api.post(`/sessions/${sessionId}/pause`),
  resume: (sessionId: string) => api.post(`/sessions/${sessionId}/resume`),
  changePhase: (sessionId: string, phase: string) => api.post(`/sessions/${sessionId}/phase`, { phase }),
  getQuestions: (sessionId: string) => api.get(`/sessions/${sessionId}/questions`),
  createQuestion: (sessionId: string, text: string) => api.post(`/sessions/${sessionId}/questions`, { text }),
  voteQuestion: (sessionId: string, questionId: string, vote: number) => api.post(`/sessions/${sessionId}/questions/${questionId}/vote`, { vote }),
  answerQuestion: (sessionId: string, questionId: string) => api.post(`/sessions/${sessionId}/questions/${questionId}/answer`),
  createReaction: (sessionId: string, type: string) => api.post(`/sessions/${sessionId}/reactions`, { type }),
  getFairness: (sessionId: string) => api.get(`/sessions/${sessionId}/fairness`),
  issueViolation: (sessionId: string, userId: string, type: string, reason?: string) => api.post(`/sessions/${sessionId}/violations`, { user_id: userId, type, reason }),
}

export const recordingAPI = {
  start: (sessionId: string, data: { include_audio?: boolean; include_video?: boolean; include_screen?: boolean }) =>
    api.post(`/sessions/${sessionId}/recordings/start`, data),
  stop: (sessionId: string, recordingId: string) =>
    api.post(`/sessions/${sessionId}/recordings/${recordingId}/stop`),
  getAll: (sessionId: string) => api.get(`/sessions/${sessionId}/recordings`),
}

export const notesAPI = {
  create: (sessionId: string, data: { content: string; is_private?: boolean }) =>
    api.post(`/sessions/${sessionId}/notes`, data),
  getAll: (sessionId: string) => api.get(`/sessions/${sessionId}/notes`),
  update: (sessionId: string, noteId: string, data: Partial<{ content: string; is_private: boolean }>) =>
    api.put(`/sessions/${sessionId}/notes/${noteId}`, data),
  delete: (sessionId: string, noteId: string) =>
    api.delete(`/sessions/${sessionId}/notes/${noteId}`),
}

export const waitingRoomAPI = {
  join: (sessionId: string, data: { message?: string; device_info?: any }) =>
    api.post(`/sessions/${sessionId}/waiting-room/join`, data),
  getAll: (sessionId: string) => api.get(`/sessions/${sessionId}/waiting-room`),
  approve: (sessionId: string, entryId: string, role?: string) =>
    api.post(`/sessions/${sessionId}/waiting-room/${entryId}/approve`, { role }),
  reject: (sessionId: string, entryId: string) =>
    api.post(`/sessions/${sessionId}/waiting-room/${entryId}/reject`),
}

export const breakoutRoomAPI = {
  create: (sessionId: string, data: { name: string; topic: string; participant_ids: string[]; duration_minutes?: number }) =>
    api.post(`/sessions/${sessionId}/breakout-rooms`, data),
  getAll: (sessionId: string) => api.get(`/sessions/${sessionId}/breakout-rooms`),
  join: (sessionId: string, breakoutId: string) =>
    api.post(`/sessions/${sessionId}/breakout-rooms/${breakoutId}/join`),
  end: (sessionId: string, breakoutId: string) =>
    api.post(`/sessions/${sessionId}/breakout-rooms/${breakoutId}/end`),
}
