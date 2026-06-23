'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useAuthStore, useSessionStore } from '@/lib/store'
import { sessionsAPI, waitingRoomAPI } from '@/lib/api'
import { joinSessionRoom, leaveSessionRoom, getSocket } from '@/lib/socket'
import { SessionRoom } from '@/components/session-room'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface ChatMessage {
  user_id: string
  username: string
  message: string
  timestamp: string
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const { isAuthenticated, token, user, _hasHydrated } = useAuthStore()
  const {
    setCurrentSession, setParticipants, setSpeakingQueue, setCurrentSpeaker,
    setPhase, setCurrentRound, setTimer, addReaction, addQuestion, setQuestions, updateQuestion,
    addViolation, setFairness, setIsPaused
  } = useSessionStore()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [joinGate, setJoinGate] = useState<'checking' | 'joining' | 'waiting' | 'approved'>('checking')
  const [joinGateMessage, setJoinGateMessage] = useState('Checking session access...')
  const [extensionRequests, setExtensionRequests] = useState<Array<{ user_id: string; timestamp?: string }>>([])

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  const { data: sessionData, isLoading, error } = useQuery(
    ['session', sessionId],
    () => sessionsAPI.get(sessionId),
    {
      enabled: isAuthenticated && !!sessionId,
      refetchInterval: false, // Don't auto-refetch - handle manually
      retry: 3, // More retries for mobile
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Longer backoff
      staleTime: 30000, // Consider data fresh for 30s
      cacheTime: 60000, // Keep in cache for 1min
      onError: (err: any) => {
        console.error('Session query error:', err)
        if (err.message?.includes('Network Error') || err.code === 'NETWORK_ERROR') {
          setJoinGateMessage('Network error. Check connection and retry.')
        } else {
          setJoinGateMessage('Failed to load session. Please refresh.')
        }
      },
    }
  )

  useEffect(() => {
    if (sessionId && token && joinGate === 'approved') {
      joinSessionRoom(sessionId, token)

      const socket = getSocket()

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id)
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      socket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data)
      })

      socket.on('auth_error', (data) => {
        console.error('Socket auth error:', data)
      })

      socket.on('joined', (data) => {
        console.log('Joined session:', data)
        setJoinGate('approved')
        // Update participants with server's active count
        if (data.participant && data.active_count !== undefined) {
          setParticipants((prev: any[]) => {
            const exists = prev.find((p: any) => p.user_id === data.participant.user_id)
            if (exists) {
              return prev.map((p: any) =>
                p.user_id === data.participant.user_id ? { ...p, is_active: true, username: data.participant?.username || p.username } : p
              )
            }
            return [...prev, { ...data.participant, is_active: true }]
          })
        }
      })

      socket.on('error', (data) => {
        console.error('Socket error:', data)
      })

      socket.on('waiting_room_required', async () => {
        setJoinGate('waiting')
        setJoinGateMessage('Waiting for host approval...')
        try {
          await waitingRoomAPI.join(sessionId, {
            message: 'Requesting to join session',
            device_info: { platform: navigator.platform, userAgent: navigator.userAgent }
          })
        } catch (err) {
          console.error('Failed to join waiting room', err)
          setJoinGateMessage('Failed to join waiting room. Please retry.')
        }
      })

      socket.on('user_joined', (data) => {
        console.log('User joined:', data)
        // Add new participant if not already in list
        if (data.participant) {
          setParticipants((prev: any[]) => {
            const exists = prev.find((p: any) => p.user_id === data.user_id)
            if (exists) {
              return prev.map((p: any) =>
                p.user_id === data.user_id ? { ...p, is_active: true, username: data.participant?.username || p.username } : p
              )
            }
            return [...prev, { ...data.participant, is_active: true }]
          })
        }
      })

      socket.on('user_left', (data) => {
        console.log('User left:', data)
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id ? { ...p, is_active: false } : p
          )
        )
      })

      socket.on('hand_raised', (data) => {
        console.log('Hand raised:', data)
        setSpeakingQueue((prev: string[]) =>
          prev.includes(data.user_id) ? prev : [...prev, data.user_id]
        )
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id ? { ...p, has_raised_hand: true } : p
          )
        )
      })

      socket.on('hand_lowered', (data) => {
        console.log('Hand lowered:', data)
        setSpeakingQueue((prev: string[]) =>
          prev.filter((id: string) => id !== data.user_id)
        )
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id ? { ...p, has_raised_hand: false } : p
          )
        )
      })

      socket.on('role_updated', (data) => {
        console.log('Role updated:', data)
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id ? { ...p, role: data.new_role } : p
          )
        )
      })

      socket.on('chat_message', (data: ChatMessage) => {
        console.log('Chat message:', data)
        setChatMessages((prev) => [...prev, data])
      })

      // Phase changes
      socket.on('phase_changed', (data) => {
        console.log('Phase changed:', data)
        setPhase(data.phase)
        if (data.current_round) setCurrentRound(data.current_round)
      })

      // Pause / Resume
      socket.on('session_paused', (data) => {
        console.log('Session paused:', data)
        setIsPaused(true)
        setTimer((prev) => ({ ...prev, isRunning: false }))
      })

      socket.on('session_resumed', (data) => {
        console.log('Session resumed:', data)
        setIsPaused(false)
        setTimer((prev) => ({ ...prev, isRunning: true }))
      })

      // Timer events
      socket.on('timer_tick', (data) => {
        setTimer((prev) => ({ ...prev, timeRemaining: data.time_remaining }))
      })

      socket.on('timer_warning', (data) => {
        console.log('Timer warning:', data)
        setTimer((prev) => ({ ...prev, warningIssued: true, timeRemaining: data.time_remaining }))
      })

      socket.on('timer_expired', (data) => {
        console.log('Timer expired:', data)
        setTimer({ timeRemaining: 0, isRunning: false, warningIssued: false, speakerId: null, startedAt: null })
      })

      // Extensions
      socket.on('extension_requested', (data) => {
        console.log('Extension requested:', data)
        setExtensionRequests((prev) => {
          if (prev.some((r) => r.user_id === data.user_id)) return prev
          return [...prev, { user_id: data.user_id, timestamp: data.timestamp }]
        })
      })

      socket.on('extension_granted', (data) => {
        console.log('Extension granted:', data)
        setExtensionRequests((prev) => prev.filter((r) => r.user_id !== data.user_id))
        setTimer((prev) => ({ ...prev, timeRemaining: data.new_time_remaining, warningIssued: false }))
      })

      // Challenges
      socket.on('challenge_issued', (data) => {
        console.log('Challenge issued:', data)
        setCurrentSpeaker(data.challenger_id)
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.challenger_id
              ? { ...p, is_speaking: true, is_muted: false }
              : { ...p, is_speaking: false }
          )
        )
      })

      // Reactions
      socket.on('reaction', (data) => {
        addReaction(data)
      })

      // Questions
      socket.on('question_submitted', (data) => {
        addQuestion(data)
      })

      socket.on('question_upvoted', (data) => {
        updateQuestion(data.question_id, { upvotes: data.upvotes })
      })

      socket.on('question_answered', (data) => {
        updateQuestion(data.question_id, { is_answered: true, answered_by: data.answered_by })
      })

      // Violations
      socket.on('violation_issued', (data) => {
        console.log('Violation issued:', data)
        addViolation(data)
        if (data.action === 'mute') {
          setParticipants((prev: any[]) =>
            prev.map((p: any) =>
              p.user_id === data.user_id ? { ...p, is_muted: true } : p
            )
          )
        }
        if (data.action === 'temp_ban') {
          setParticipants((prev: any[]) =>
            prev.map((p: any) =>
              p.user_id === data.user_id ? { ...p, is_temp_banned: true } : p
            )
          )
        }
      })

      // Fairness alerts
      socket.on('fairness_alert', (data) => {
        console.log('Fairness alert:', data)
        setFairness({
          total_speaking_time: 0,
          participant_times: {},
          dominant_speakers: data.dominant_speakers,
          underrepresented_speakers: data.underrepresented_speakers,
          fairness_score: 0,
        })
      })

      // Speaking turn assigned (enhanced with timer)
      socket.on('speaking_turn_assigned', (data) => {
        console.log('Speaking turn assigned:', data)
        setCurrentSpeaker(data.user_id)
        setTimer({
          timeRemaining: data.max_speaking_time || 180,
          isRunning: true,
          warningIssued: false,
          speakerId: data.user_id,
          startedAt: new Date().toISOString(),
        })
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id
              ? { ...p, is_speaking: true, is_muted: false, speaking_time_remaining: data.max_speaking_time }
              : { ...p, is_speaking: false }
          )
        )
        setSpeakingQueue((prev: string[]) => prev.filter((id: string) => id !== data.user_id))
      })

      // Speaking turn ended (enhanced)
      socket.on('speaking_turn_ended', (data) => {
        console.log('Speaking turn ended:', data)
        setCurrentSpeaker(null)
        setTimer({ timeRemaining: 0, isRunning: false, warningIssued: false, speakerId: null, startedAt: null })
        setParticipants((prev: any[]) =>
          prev.map((p: any) =>
            p.user_id === data.user_id
              ? { ...p, is_speaking: false, is_muted: true, has_raised_hand: false }
              : p
          )
        )
      })

      return () => {
        leaveSessionRoom(sessionId)
        socket.off('connect')
        socket.off('disconnect')
        socket.off('authenticated')
        socket.off('auth_error')
        socket.off('joined')
        socket.off('error')
        socket.off('waiting_room_required')
        socket.off('user_joined')
        socket.off('user_left')
        socket.off('hand_raised')
        socket.off('hand_lowered')
        socket.off('speaking_turn_assigned')
        socket.off('speaking_turn_ended')
        socket.off('role_updated')
        socket.off('chat_message')
        socket.off('phase_changed')
        socket.off('session_paused')
        socket.off('session_resumed')
        socket.off('timer_tick')
        socket.off('timer_warning')
        socket.off('timer_expired')
        socket.off('extension_requested')
        socket.off('extension_granted')
        socket.off('challenge_issued')
        socket.off('reaction')
        socket.off('question_submitted')
        socket.off('question_upvoted')
        socket.off('question_answered')
        socket.off('violation_issued')
        socket.off('fairness_alert')
      }
    }
  }, [joinGate, sessionId, token, setCurrentSpeaker, setParticipants, setSpeakingQueue, setPhase, setCurrentRound, setTimer, addReaction, addQuestion, updateQuestion, addViolation, setFairness, setIsPaused])

  useEffect(() => {
    if (!sessionData?.data || !user?.id) return
    
    // Add timeout to prevent infinite checking
    const timeoutId = setTimeout(() => {
      if (joinGate === 'checking') {
        setJoinGateMessage('Session check timed out. Please refresh.')
      }
    }, 10000) // 10 second timeout
    
    const session = sessionData.data
    const isParticipant = (session.participants || []).some((p: any) => p.user_id === user.id)
    const isHost = session.host_id === user.id

    if (isHost || isParticipant) {
      clearTimeout(timeoutId)
      setJoinGate('approved')
      setJoinGateMessage('Joining session...')
      return
    }

    clearTimeout(timeoutId)
    setJoinGate('waiting')
    setJoinGateMessage('Requesting access to waiting room...')
    waitingRoomAPI.join(sessionId, {
      message: 'Requesting to join session',
      device_info: { platform: navigator.platform, userAgent: navigator.userAgent }
    }).then(() => {
      setJoinGateMessage('Waiting for host approval...')
    }).catch((err: any) => {
      console.error('Waiting room request failed', err)
      if (err.message?.includes('Network Error')) {
        setJoinGateMessage('Network error. Check connection and retry.')
      } else {
        setJoinGateMessage('Could not request join. Please retry.')
      }
    })
    
    return () => clearTimeout(timeoutId)
  }, [sessionData, sessionId, user?.id, joinGate])

  useEffect(() => {
    if (joinGate !== 'waiting' || !sessionId || !user?.id) return
    
    let pollCount = 0
    const maxPolls = 30 // 2 minutes max wait (30 * 4s)
    
    const id = window.setInterval(async () => {
      pollCount++
      
      try {
        const next = await sessionsAPI.get(sessionId)
        const isParticipant = (next.data?.participants || []).some((p: any) => p.user_id === user.id)
        if (isParticipant) {
          setJoinGate('approved')
          setJoinGateMessage('Approved. Joining...')
          return
        }
        
        // Timeout after max polls
        if (pollCount >= maxPolls) {
          window.clearInterval(id)
          setJoinGateMessage('Request timed out. Please refresh and try again.')
          return
        }
        
        // Update message periodically
        if (pollCount % 5 === 0) {
          setJoinGateMessage(`Waiting for host approval... (${Math.floor(pollCount * 4 / 60)}min)`)
        }
      } catch (err: any) {
        console.error('Waiting room poll failed', err)
        if (err.message?.includes('Network Error')) {
          setJoinGateMessage('Network error. Check connection and retry.')
        } else if (pollCount >= maxPolls - 5) {
          setJoinGateMessage('Connection issues. Please refresh.')
        }
      }
    }, 4000)
    
    return () => window.clearInterval(id)
  }, [joinGate, sessionId, user?.id])

  useEffect(() => {
    if (sessionData?.data) {
      setCurrentSession(sessionData.data)
      setParticipants(sessionData.data.participants || [])
      setSpeakingQueue(sessionData.data.speaking_queue || [])
      setCurrentSpeaker(sessionData.data.current_speaker || null)
      if (sessionData.data.phase) setPhase(sessionData.data.phase)
      if (sessionData.data.current_round) setCurrentRound(sessionData.data.current_round)
      if (sessionData.data.timer) setTimer(sessionData.data.timer)
      setQuestions(sessionData.data.questions || [])
      if (sessionData.data.fairness) setFairness(sessionData.data.fairness)
      if (sessionData.data.status === 'paused') setIsPaused(true)
    }
  }, [sessionData, setCurrentSession, setParticipants, setSpeakingQueue, setCurrentSpeaker, setPhase, setCurrentRound, setTimer, setQuestions, setFairness, setIsPaused])

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500">Loading session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <div className="mx-auto w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-5">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Session not found</h1>
          <p className="text-gray-500 text-sm mb-6">
            The session you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link href="/dashboard">
            <Button className="shadow-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (joinGate !== 'approved') {
    const isFailed = joinGateMessage.includes('error') || joinGateMessage.includes('timed out') || joinGateMessage.includes('failed')
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-4">
        {isFailed ? (
          <div className="text-center max-w-md">
            <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Issue</h2>
            <p className="text-sm text-gray-600 mb-6">{joinGateMessage}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
              <Button onClick={() => {
                setJoinGate('checking')
                setJoinGateMessage('Checking session access...')
                window.location.reload()
              }}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            <div className="text-center max-w-md">
              <p className="text-sm text-gray-600 mb-2">{joinGateMessage}</p>
              {joinGate === 'waiting' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="text-gray-500"
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return <SessionRoom session={sessionData?.data} chatMessages={chatMessages} extensionRequests={extensionRequests} onClearExtensionRequest={(userId) => setExtensionRequests((prev) => prev.filter((r) => r.user_id !== userId))} />
}
