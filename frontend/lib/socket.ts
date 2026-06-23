import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = () => {
  if (!socket) {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export const connectSocket = (token: string) => {
  const s = getSocket()
  if (!s.connected) {
    s.auth = { token }
    s.connect()
  }
  return s
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const joinSessionRoom = (sessionId: string, token: string) => {
  const s = connectSocket(token)

  // Wait for connection before emitting events
  const onConnect = () => {
    s.emit('authenticate', { token, session_id: sessionId })
    s.emit('join_session', { session_id: sessionId })
  }

  if (s.connected) {
    onConnect()
  } else {
    s.once('connect', onConnect)
  }
  return s
}

export const leaveSessionRoom = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('leave_session', { session_id: sessionId })
  }
}

export const raiseHand = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('raise_hand', { session_id: sessionId })
  }
}

export const lowerHand = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('lower_hand', { session_id: sessionId })
  }
}

export const assignSpeakingTurn = (sessionId: string, userId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('assign_speaking_turn', { session_id: sessionId, user_id: userId })
  }
}

export const endSpeakingTurn = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('end_speaking_turn', { session_id: sessionId })
  }
}

export const sendChatMessage = (sessionId: string, message: string) => {
  const s = getSocket()
  if (s) {
    s.emit('send_chat_message', { session_id: sessionId, message })
  }
}

export const muteUser = (sessionId: string, userId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('mute_user', { session_id: sessionId, user_id: userId })
  }
}

export const unmuteUser = (sessionId: string, userId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('unmute_user', { session_id: sessionId, user_id: userId })
  }
}

export const updateParticipantRole = (sessionId: string, userId: string, role: string) => {
  const s = getSocket()
  if (s) {
    s.emit('update_participant_role', { session_id: sessionId, user_id: userId, role })
  }
}

// ==================== PHASE & SESSION CONTROL ====================

export const changePhase = (sessionId: string, phase: string) => {
  const s = getSocket()
  if (s) {
    s.emit('change_phase', { session_id: sessionId, phase })
  }
}

export const pauseSession = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('pause_session', { session_id: sessionId })
  }
}

export const resumeSession = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('resume_session', { session_id: sessionId })
  }
}

// ==================== TIMER & EXTENSIONS ====================

export const requestExtension = (sessionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('request_extension', { session_id: sessionId })
  }
}

export const grantExtension = (sessionId: string, userId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('grant_extension', { session_id: sessionId, user_id: userId })
  }
}

// ==================== CHALLENGE ====================

export const issueChallenge = (sessionId: string, userId: string, reason?: string) => {
  const s = getSocket()
  if (s) {
    s.emit('issue_challenge', { session_id: sessionId, user_id: userId, reason })
  }
}

// ==================== REACTIONS ====================

export const sendReaction = (sessionId: string, type: string) => {
  const s = getSocket()
  if (s) {
    s.emit('send_reaction', { session_id: sessionId, type })
  }
}

// ==================== QUESTIONS ====================

export const submitQuestion = (sessionId: string, text: string) => {
  const s = getSocket()
  if (s) {
    s.emit('submit_question', { session_id: sessionId, text })
  }
}

export const upvoteQuestion = (sessionId: string, questionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('upvote_question', { session_id: sessionId, question_id: questionId })
  }
}

export const answerQuestion = (sessionId: string, questionId: string) => {
  const s = getSocket()
  if (s) {
    s.emit('answer_question', { session_id: sessionId, question_id: questionId })
  }
}

// ==================== VIOLATIONS ====================

export const issueViolation = (sessionId: string, userId: string, type: string, reason?: string) => {
  const s = getSocket()
  if (s) {
    s.emit('issue_violation', { session_id: sessionId, user_id: userId, type, reason })
  }
}
