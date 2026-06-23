'use client'

import { useState, memo, useMemo } from 'react'
import { useAuthStore, useSessionStore, SessionPhase } from '@/lib/store'
import { VideoGrid } from '@/components/video-grid'
import { SpeakingQueue } from '@/components/speaking-queue'
import { ArgumentBoard } from '@/components/argument-board'
import { ConsensusPanel } from '@/components/consensus-panel'
import { TranscriptPanel } from '@/components/transcript-panel'
import { SessionControls } from '@/components/session-controls'
import { SessionReplay } from '@/components/session-replay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassButton } from '@/components/ui/glass-button'
import { useRouter } from 'next/navigation'
import { sessionsAPI } from '@/lib/api'
import { changePhase, pauseSession, resumeSession } from '@/lib/socket'
import { useMutation } from 'react-query'
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Users, 
  Clock, 
  Trash2, 
  Share2, 
  Check, 
  Pause, 
  ChevronRight,
  Scale,
  BarChart3,
  AlertCircle,
  Settings,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

const PHASE_LABELS: Record<SessionPhase, string> = {
  lobby: 'Lobby',
  opening: 'Opening Statements',
  argument: 'Argument Phase',
  rebuttal: 'Rebuttal',
  open_discussion: 'Open Discussion',
  conclusion: 'Conclusion',
}

const PHASE_ORDER: SessionPhase[] = ['lobby', 'opening', 'argument', 'rebuttal', 'open_discussion', 'conclusion']

// Phase colors for dynamic atmosphere
const PHASE_COLORS: Record<SessionPhase, { primary: string; glow: string; border: string }> = {
  lobby: { primary: 'text-gray-400', glow: 'shadow-gray-500/20', border: 'border-gray-500/30' },
  opening: { primary: 'text-debate-opening', glow: 'shadow-phase-opening', border: 'border-debate-opening/40' },
  argument: { primary: 'text-debate-argument', glow: 'shadow-phase-argument', border: 'border-debate-argument/40' },
  rebuttal: { primary: 'text-debate-rebuttal', glow: 'shadow-phase-rebuttal', border: 'border-debate-rebuttal/40' },
  open_discussion: { primary: 'text-debate-accent', glow: 'shadow-glow-primary', border: 'border-primary-500/40' },
  conclusion: { primary: 'text-debate-conclusion', glow: 'shadow-phase-conclusion', border: 'border-debate-conclusion/40' },
}

interface SessionRoomProps {
  session: any
  chatMessages?: any[]
  extensionRequests?: Array<{ user_id: string; timestamp?: string }>
  onClearExtensionRequest?: (userId: string) => void
}

// Consensus Dashboard Component
const ConsensusDashboard = memo(function ConsensusDashboard({ 
  agreementRate = 72,
  participants = 6,
  statements = 12
}: { 
  agreementRate?: number
  participants?: number
  statements?: number
}) {
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (agreementRate / 100) * circumference

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-debate-pro" />
          <span className="text-sm font-medium text-white">Consensus</span>
        </div>
        <Badge variant="outline" className="text-xs bg-debate-pro/10 border-debate-pro/30 text-debate-pro">
          Live
        </Badge>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Animated ring chart */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{agreementRate}%</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Participants</span>
            <span className="text-white font-medium">{participants}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Statements</span>
            <span className="text-white font-medium">{statements}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Agreements</span>
            <span className="text-debate-pro font-medium">{Math.round(statements * agreementRate / 100)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// Phase Progress Indicator
const PhaseProgress = memo(function PhaseProgress({ 
  currentPhase, 
  currentRound 
}: { 
  currentPhase: SessionPhase
  currentRound: number 
}) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)
  const colors = PHASE_COLORS[currentPhase]

  return (
    <div className="flex items-center gap-1">
      {PHASE_ORDER.map((p, index) => {
        const isActive = index === currentIndex
        const isCompleted = index < currentIndex
        const isPending = index > currentIndex

        return (
          <div key={p} className="flex items-center">
            <div
              className={`h-2 w-8 rounded-full transition-all duration-500 ${
                isActive 
                  ? `bg-current ${colors.primary} animate-pulse` 
                  : isCompleted 
                    ? 'bg-white/40' 
                    : 'bg-white/10'
              }`}
              title={PHASE_LABELS[p]}
            />
            {index < PHASE_ORDER.length - 1 && (
              <div 
                className={`w-2 h-px mx-1 ${
                  isCompleted ? 'bg-white/30' : 'bg-white/5'
                }`} 
              />
            )}
          </div>
        )
      })}
      <span className={`text-sm ml-3 font-medium ${colors.primary}`}>
        {PHASE_LABELS[currentPhase]}
        {currentRound > 0 && (
          <span className="text-white/50 ml-2">Round {currentRound}</span>
        )}
      </span>
    </div>
  )
})

export function SessionRoom({ session, chatMessages = [], extensionRequests = [], onClearExtensionRequest }: SessionRoomProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const {
    participants, currentSpeaker, speakingQueue, phase, currentRound,
    timer, isPaused
  } = useSessionStore()
  const [activeTab, setActiveTab] = useState('video')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const isHost = session?.host_id === user?.id
  const participantList: any[] = useMemo(() => Array.isArray(participants) ? participants : [], [participants])
  const activeParticipants = useMemo(() => participantList.filter((p: any) => p.is_active), [participantList])
  const activeCount = activeParticipants.length
  const userParticipant = useMemo(() => participantList.find((p: any) => p.user_id === user?.id), [participantList, user?.id])
  const isModerator = userParticipant?.role === 'moderator' || false
  const canControl = isHost || isModerator

  const phaseColors = PHASE_COLORS[phase]

  const startMutation = useMutation(() => sessionsAPI.start(session.id), {
    onSuccess: () => window.location.reload(),
  })

  const endMutation = useMutation(() => sessionsAPI.end(session.id), {
    onSuccess: () => router.push('/dashboard'),
  })

  const deleteMutation = useMutation(() => sessionsAPI.delete(session.id), {
    onSuccess: () => router.push('/dashboard'),
  })

  const handleShare = () => {
    const url = `${window.location.origin}/sessions/${session.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNextPhase = () => {
    const currentIndex = PHASE_ORDER.indexOf(phase)
    if (currentIndex < PHASE_ORDER.length - 1) {
      changePhase(session.id, PHASE_ORDER[currentIndex + 1])
    }
  }

  const handlePauseResume = () => {
    isPaused ? resumeSession(session.id) : pauseSession(session.id)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const isLive = session?.is_live || session?.status === 'live'
  const isScheduled = session?.status === 'scheduled'

  if (!session) return null

  return (
    <div className="min-h-screen bg-[hsl(222,47%,4%)] flex flex-col">
      {/* Premium Header with Glassmorphism */}
      <header className="glass-panel border-b border-white/10 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          {/* Left: Back & Session Info */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <GlassButton variant="ghost" size="icon-sm">
                <ArrowLeft className="h-4 w-4" />
              </GlassButton>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${phaseColors.border} border`}>
                <Scale className={`h-5 w-5 ${phaseColors.primary}`} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{session.title}</h1>
                <p className="text-sm text-white/50">{session.topic}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2">
              {isLive && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                  LIVE
                </Badge>
              )}
              {isPaused && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Pause className="h-3 w-3 mr-1" />
                  PAUSED
                </Badge>
              )}
            </div>
          </div>

          {/* Center: Phase Progress & Timer */}
          <div className="hidden lg:flex items-center gap-6">
            {isLive && (
              <>
                <PhaseProgress currentPhase={phase} currentRound={currentRound} />
                
                {timer.isRunning && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl glass-card ${
                    timer.warningIssued ? 'animate-pulse border-red-500/50' : ''
                  }`}>
                    <Clock className={`h-4 w-4 ${timer.warningIssued ? 'text-red-400' : 'text-primary-400'}`} />
                    <span className={`font-mono text-lg font-bold ${
                      timer.warningIssued ? 'text-red-400' : 'text-white'
                    }`}>
                      {formatTime(timer.timeRemaining)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Participants count */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card">
              <Users className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white font-medium">{activeCount}</span>
              <span className="text-white/30">/</span>
              <span className="text-sm text-white/50">{participants.length}</span>
            </div>

            {/* Consensus Dashboard - Quick View */}
            {isLive && (
              <div className="hidden xl:block">
                <ConsensusDashboard 
                  agreementRate={session.consensus_rate || 72}
                  participants={activeCount}
                  statements={session.statement_count || 12}
                />
              </div>
            )}

            {/* Rules toggle */}
            <GlassButton 
              variant="ghost" 
              size="icon-sm"
              onClick={() => setShowRules(!showRules)}
              className={showRules ? 'bg-white/10' : ''}
            >
              <AlertCircle className="h-4 w-4" />
            </GlassButton>

            {/* Share */}
            <GlassButton
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              {copied ? (
                <Check className="h-4 w-4 text-debate-pro" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-1">{copied ? 'Copied!' : 'Share'}</span>
            </GlassButton>

            {/* Host controls */}
            {isHost && isScheduled && (
              <GlassButton
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isLoading}
                className="bg-debate-pro hover:bg-debate-pro-dark text-white"
              >
                <Play className="h-4 w-4 mr-1.5" />
                Start
              </GlassButton>
            )}

            {canControl && isLive && (
              <>
                <GlassButton
                  onClick={handlePauseResume}
                  variant="outline"
                  size="sm"
                >
                  <Pause className="h-4 w-4 mr-1.5" />
                  {isPaused ? 'Resume' : 'Pause'}
                </GlassButton>
                
                {PHASE_ORDER.indexOf(phase) < PHASE_ORDER.length - 1 && (
                  <GlassButton
                    onClick={handleNextPhase}
                    variant="outline"
                    size="sm"
                    className={`${phaseColors.primary} ${phaseColors.border}`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </GlassButton>
                )}
              </>
            )}

            {isHost && isLive && (
              <GlassButton
                onClick={() => endMutation.mutate()}
                disabled={endMutation.isLoading}
                variant="con"
                size="sm"
              >
                <Square className="h-4 w-4 mr-1.5" />
                End
              </GlassButton>
            )}

            {/* Delete confirmation */}
            {isHost && (
              <>
                {!showDeleteConfirm ? (
                  <GlassButton
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="ghost"
                    size="icon-sm"
                    className="text-white/50 hover:text-debate-con"
                  >
                    <Trash2 className="h-4 w-4" />
                  </GlassButton>
                ) : (
                  <div className="flex items-center gap-2 glass-card rounded-lg px-3 py-1.5">
                    <span className="text-xs text-white/70">Delete?</span>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="con"
                      className="h-7 px-2 text-xs"
                      disabled={deleteMutation.isLoading}
                      onClick={() => deleteMutation.mutate()}
                    >
                      {deleteMutation.isLoading ? '...' : 'Confirm'}
                    </GlassButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rules Panel - Collapsible */}
        {showRules && (
          <div className="mt-3 pt-3 border-t border-white/10 animate-slide-down">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white/40" />
                <span className="text-white/70">Speaking time: <span className="text-white">5 min max</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/40" />
                <span className="text-white/70">Format: <span className="text-white">Lincoln-Douglas</span></span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-white/40" />
                <span className="text-white/70">Consensus: <span className="text-debate-pro">Required for conclusion</span></span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content with Phase Atmosphere */}
      <div className={`flex-1 flex overflow-hidden transition-all duration-500 ${phaseColors.glow}`}>
        {/* Left Panel - Video & Controls */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="glass-panel border-b border-white/10 rounded-none px-4 h-12">
              <TabsTrigger 
                value="video" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                Video
              </TabsTrigger>
              <TabsTrigger 
                value="arguments" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                Arguments
              </TabsTrigger>
              <TabsTrigger 
                value="consensus" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                Consensus
              </TabsTrigger>
              <TabsTrigger 
                value="transcript" 
                className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
              >
                Transcript
              </TabsTrigger>
              {!isLive && session?.status === 'ended' && (
                <TabsTrigger 
                  value="replay" 
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
                >
                  Replay
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="video" className="flex-1 m-0 p-4">
              <VideoGrid session={session} phase={phase} />
            </TabsContent>

            <TabsContent value="arguments" className="flex-1 m-0 p-4 overflow-auto">
              <ArgumentBoard sessionId={session.id} />
            </TabsContent>

            <TabsContent value="consensus" className="flex-1 m-0 p-4 overflow-auto">
              <ConsensusPanel sessionId={session.id} />
            </TabsContent>

            <TabsContent value="transcript" className="flex-1 m-0 p-4 overflow-auto">
              <TranscriptPanel transcript={[...(session.transcript || []), ...chatMessages]} />
            </TabsContent>

            {!isLive && session?.status === 'ended' && (
              <TabsContent value="replay" className="flex-1 m-0 overflow-auto">
                <SessionReplay sessionId={session.id} />
              </TabsContent>
            )}
          </Tabs>

          {/* Session Controls */}
          <SessionControls
            session={session}
            isHost={isHost}
            isModerator={isModerator}
            isSpeaker={userParticipant?.role === 'speaker'}
            canControl={canControl}
            extensionRequests={extensionRequests}
            onClearExtensionRequest={onClearExtensionRequest}
          />
        </div>

        {/* Right Panel - Speaking Queue & Participants */}
        <div className="w-80 glass-panel border-l border-white/10 flex flex-col">
          <SpeakingQueue
            participants={participants}
            speakingQueue={speakingQueue}
            currentSpeaker={currentSpeaker}
            isModerator={isHost || isModerator}
            timer={timer}
            isPaused={isPaused}
            sessionId={session.id}
            phase={phase}
          />
        </div>
      </div>
    </div>
  )
}
