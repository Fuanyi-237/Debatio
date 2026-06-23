import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  username: string
  full_name?: string
  avatar_url?: string
  role: string
}

interface Session {
  id: string
  title: string
  topic: string
  description?: string
  session_type: 'debate' | 'roundtable'
  status: 'scheduled' | 'live' | 'paused' | 'ended'
  visibility: 'public' | 'private' | 'community'
  host_id: string
  session_code: string
  participants: any[]
  current_speaker?: string
  speaking_queue: string[]
  is_live: boolean
  participant_count: number
  created_at: string
  rules?: any
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token)
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false })
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export type SessionPhase = 'lobby' | 'opening' | 'argument' | 'rebuttal' | 'open_discussion' | 'conclusion'

interface TimerState {
  timeRemaining: number
  isRunning: boolean
  warningIssued: boolean
  speakerId: string | null
  startedAt: string | null
}

interface Reaction {
  type: string
  user_id: string
  username?: string
  timestamp: string
}

interface Question {
  id: string
  text: string
  asked_by: string
  asked_by_username?: string
  upvotes: number
  upvoted_by: string[]
  is_answered: boolean
  answered_by?: string
  created_at: string
}

interface Violation {
  type: string
  action: string
  issued_by: string
  issued_at: string
  reason?: string
}

interface FairnessData {
  total_speaking_time: number
  participant_times: Record<string, number>
  dominant_speakers: string[]
  underrepresented_speakers: string[]
  fairness_score: number
}

interface SessionState {
  currentSession: Session | null
  setCurrentSession: (session: Session | null) => void
  participants: any[]
  setParticipants: (participants: any[] | ((prev: any[]) => any[])) => void
  speakingQueue: string[]
  setSpeakingQueue: (queue: string[] | ((prev: string[]) => string[])) => void
  currentSpeaker: string | null
  setCurrentSpeaker: (speaker: string | null) => void
  phase: SessionPhase
  setPhase: (phase: SessionPhase) => void
  currentRound: number
  setCurrentRound: (round: number) => void
  timer: TimerState
  setTimer: (timer: TimerState | ((prev: TimerState) => TimerState)) => void
  reactions: Reaction[]
  addReaction: (reaction: Reaction) => void
  questions: Question[]
  setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void
  addQuestion: (question: Question) => void
  updateQuestion: (questionId: string, updates: Partial<Question>) => void
  violations: Violation[]
  addViolation: (violation: Violation & { user_id: string }) => void
  fairness: FairnessData | null
  setFairness: (fairness: FairnessData) => void
  isPaused: boolean
  setIsPaused: (paused: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  participants: [],
  setParticipants: (participants) => set((state) => ({
    participants: typeof participants === 'function' ? participants(state.participants) : participants
  })),
  speakingQueue: [],
  setSpeakingQueue: (queue) => set((state) => ({
    speakingQueue: typeof queue === 'function' ? queue(state.speakingQueue) : queue
  })),
  currentSpeaker: null,
  setCurrentSpeaker: (speaker) => set({ currentSpeaker: speaker }),
  phase: 'lobby' as SessionPhase,
  setPhase: (phase) => set({ phase }),
  currentRound: 0,
  setCurrentRound: (round) => set({ currentRound: round }),
  timer: {
    timeRemaining: 0,
    isRunning: false,
    warningIssued: false,
    speakerId: null,
    startedAt: null,
  },
  setTimer: (timer) => set((state) => ({
    timer: typeof timer === 'function' ? timer(state.timer) : timer
  })),
  reactions: [],
  addReaction: (reaction) => set((state) => ({
    reactions: [...state.reactions.slice(-49), reaction]
  })),
  questions: [],
  setQuestions: (questions) => set((state) => ({
    questions: typeof questions === 'function' ? questions(state.questions) : questions
  })),
  addQuestion: (question) => set((state) => {
    const exists = state.questions.some((q) => q.id === question.id)
    if (exists) {
      return {
        questions: state.questions.map((q) => q.id === question.id ? { ...q, ...question } : q)
      }
    }
    return { questions: [...state.questions, question] }
  }),
  updateQuestion: (questionId, updates) => set((state) => ({
    questions: state.questions.map(q => q.id === questionId ? { ...q, ...updates } : q)
  })),
  violations: [],
  addViolation: (violation) => set((state) => ({
    violations: [...state.violations, violation]
  })),
  fairness: null,
  setFairness: (fairness) => set({ fairness }),
  isPaused: false,
  setIsPaused: (paused) => set({ isPaused: paused }),
}))

interface UIState {
  isCreateModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activeTab: 'video' | 'arguments' | 'consensus' | 'transcript'
  setActiveTab: (tab: 'video' | 'arguments' | 'consensus' | 'transcript') => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeTab: 'video',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
