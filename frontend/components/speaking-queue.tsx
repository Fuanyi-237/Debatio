'use client'

import { memo, useMemo } from 'react'
import { useAuthStore, SessionPhase } from '@/lib/store'
import { raiseHand, lowerHand, assignSpeakingTurn, endSpeakingTurn, requestExtension, issueChallenge } from '@/lib/socket'
import { GlassButton } from '@/components/ui/glass-button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Hand, 
  Mic, 
  MicOff, 
  X, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  Zap,
  Users,
  Crown,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimerInfo {
  timeRemaining: number
  isRunning: boolean
  warningIssued: boolean
  speakerId: string | null
  startedAt: string | null
}

interface SpeakingQueueProps {
  participants: any[]
  speakingQueue: string[]
  currentSpeaker: string | null
  isModerator: boolean
  timer?: TimerInfo
  isPaused?: boolean
  sessionId?: string
  phase?: SessionPhase
}

// Phase-based accent colors
const PHASE_ACCENT: Record<SessionPhase, { bg: string; text: string; glow: string }> = {
  lobby: { bg: 'bg-gray-500/20', text: 'text-gray-400', glow: 'shadow-gray-500/20' },
  opening: { bg: 'bg-debate-opening/20', text: 'text-debate-opening', glow: 'shadow-debate-opening/30' },
  argument: { bg: 'bg-debate-argument/20', text: 'text-debate-argument', glow: 'shadow-debate-argument/30' },
  rebuttal: { bg: 'bg-debate-rebuttal/20', text: 'text-debate-rebuttal', glow: 'shadow-debate-rebuttal/30' },
  open_discussion: { bg: 'bg-primary-500/20', text: 'text-primary-400', glow: 'shadow-primary-500/30' },
  conclusion: { bg: 'bg-debate-conclusion/20', text: 'text-debate-conclusion', glow: 'shadow-debate-conclusion/30' },
}

// Participant avatar component
const ParticipantAvatar = memo(function ParticipantAvatar({ 
  username, 
  isSpeaking = false,
  isModerator = false,
  size = 'md'
}: { 
  username: string
  isSpeaking?: boolean
  isModerator?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl'
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold text-white relative',
      sizeClasses[size],
      isSpeaking 
        ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-primary' 
        : 'bg-white/10'
    )}>
      {username?.[0]?.toUpperCase() || '?'}
      {isModerator && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-debate-accent rounded-full flex items-center justify-center">
          <Crown className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </div>
  )
})

export const SpeakingQueue = memo(function SpeakingQueue({
  participants: participantsProp,
  speakingQueue: speakingQueueProp,
  currentSpeaker,
  isModerator,
  timer,
  isPaused,
  sessionId,
  phase = 'lobby',
}: SpeakingQueueProps) {
  const { user } = useAuthStore()
  const participants = useMemo(() => Array.isArray(participantsProp) ? participantsProp : [], [participantsProp])
  const speakingQueue = useMemo(() => Array.isArray(speakingQueueProp) ? speakingQueueProp : [], [speakingQueueProp])
  const sid = sessionId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '')
  const phaseColors = PHASE_ACCENT[phase]

  const handleRaiseHand = () => raiseHand(sid)
  const handleLowerHand = () => lowerHand(sid)
  const handleAssignTurn = (userId: string) => assignSpeakingTurn(sid, userId)
  const handleEndTurn = () => endSpeakingTurn(sid)
  const handleRequestExtension = () => requestExtension(sid)
  const handleChallenge = (userId: string) => issueChallenge(sid, userId)

  const currentUserParticipant = useMemo(() => 
    participants.find((p) => p.user_id === user?.id),
    [participants, user?.id]
  )
  const isCurrentUserSpeaking = currentSpeaker === user?.id
  const hasUserRaisedHand = currentUserParticipant?.has_raised_hand

  const queuedParticipants = useMemo(() => 
    speakingQueue
      .map((userId) => participants.find((p) => p.user_id === userId))
      .filter(Boolean),
    [speakingQueue, participants]
  )

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Current Speaker - Premium Card */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <Mic className="h-3 w-3" />
            Current Speaker
          </h3>
          {currentSpeaker && (
            <Badge variant="outline" className={cn("text-xs", phaseColors.bg, phaseColors.text, "border-white/10")}>
              {phase}
            </Badge>
          )}
        </div>
        
        {currentSpeaker ? (
          <div className="space-y-3">
            {/* Speaker Card */}
            <div className={cn(
              "glass-card rounded-xl p-4 transition-all duration-300",
              phaseColors.glow
            )}>
              <div className="flex items-center gap-3">
                <ParticipantAvatar 
                  username={participants.find((p) => p.user_id === currentSpeaker)?.username || 'Unknown'}
                  isSpeaking
                  isModerator={participants.find((p) => p.user_id === currentSpeaker)?.role === 'moderator'}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {participants.find((p) => p.user_id === currentSpeaker)?.username || 'Unknown'}
                  </p>
                  <p className={cn("text-sm", phaseColors.text)}>
                    Speaking now
                  </p>
                </div>
                {(isModerator || currentSpeaker === user?.id) && (
                  <GlassButton
                    size="icon-sm"
                    variant="con"
                    onClick={handleEndTurn}
                  >
                    <MicOff className="h-4 w-4" />
                  </GlassButton>
                )}
              </div>
            </div>

            {/* Timer Display */}
            {timer && timer.isRunning && (
              <div className={cn(
                "glass-card rounded-xl p-3 flex items-center justify-center gap-3",
                timer.warningIssued ? "border-red-500/50 animate-pulse" : ""
              )}>
                <Clock className={cn(
                  "h-5 w-5",
                  timer.warningIssued ? "text-red-400" : phaseColors.text
                )} />
                <span className={cn(
                  "font-mono text-2xl font-bold",
                  timer.warningIssued ? "text-red-400" : "text-white"
                )}>
                  {formatTime(timer.timeRemaining)}
                </span>
                {timer.warningIssued && (
                  <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
                )}
              </div>
            )}

            {/* Timer Expired */}
            {timer && !timer.isRunning && timer.speakerId && timer.timeRemaining === 0 && (
              <div className="glass-card rounded-xl p-3 border-red-500/50 bg-red-500/10">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">Time expired</span>
                </div>
              </div>
            )}

            {/* Extension & Challenge Buttons */}
            {timer && timer.isRunning && (
              <div className="flex gap-2">
                {isCurrentUserSpeaking && (
                  <GlassButton
                    size="sm"
                    variant="outline"
                    onClick={handleRequestExtension}
                    className="flex-1 text-primary-400 border-primary-500/30"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Request Extension
                  </GlassButton>
                )}
                {!isCurrentUserSpeaking && isModerator && currentSpeaker && (
                  <GlassButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleChallenge(currentSpeaker)}
                    className="flex-1 text-debate-argument border-debate-argument/30"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Challenge
                  </GlassButton>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Mic className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-white/40 text-sm">No one is speaking</p>
            <p className="text-white/30 text-xs mt-1">Raise your hand to request a turn</p>
          </div>
        )}
      </div>

      {/* Speaking Queue */}
      <div className="flex-1 p-4 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Speaking Queue
          </h3>
          <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-white/50">
            {queuedParticipants.length}
          </Badge>
        </div>
        
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="space-y-2">
            {queuedParticipants.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/30 text-sm">Queue is empty</p>
              </div>
            ) : (
              queuedParticipants.map((participant, index) => (
                <div
                  key={participant.user_id}
                  className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/[0.08] transition-colors group"
                >
                  <span className="text-white/30 font-mono w-5 text-sm">{index + 1}</span>
                  <ParticipantAvatar 
                    username={participant.username} 
                    isModerator={participant.role === 'moderator'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{participant.username}</p>
                    <p className="text-white/40 text-xs capitalize">{participant.role}</p>
                  </div>
                  {isModerator && (
                    <GlassButton
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleAssignTurn(participant.user_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-debate-pro"
                    >
                      <UserCheck className="h-4 w-4" />
                    </GlassButton>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* All Participants */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-3 w-3" />
            Participants
          </h3>
          <span className="text-xs text-white/30">{participants.length}</span>
        </div>
        
        <ScrollArea className="h-28">
          <div className="flex gap-2">
            {participants.map((participant) => (
              <div
                key={participant.user_id}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 transition-colors min-w-[64px]"
              >
                <div className="relative">
                  <ParticipantAvatar 
                    username={participant.username} 
                    isModerator={participant.role === 'moderator'}
                    size="sm"
                  />
                  {participant.has_raised_hand && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Hand className="h-2.5 w-2.5 text-black" />
                    </div>
                  )}
                </div>
                <span className="text-white/60 text-xs truncate max-w-[56px]">
                  {participant.username}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Hand Controls - Premium Action Button */}
      <div className="p-4 border-t border-white/10">
        {isCurrentUserSpeaking ? (
          <GlassButton
            onClick={handleEndTurn}
            variant="con"
            className="w-full"
          >
            <MicOff className="mr-2 h-4 w-4" />
            Stop Speaking
          </GlassButton>
        ) : hasUserRaisedHand ? (
          <GlassButton
            onClick={handleLowerHand}
            variant="outline"
            className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
          >
            <X className="mr-2 h-4 w-4" />
            Lower Hand
          </GlassButton>
        ) : (
          <GlassButton
            onClick={handleRaiseHand}
            className="w-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40 text-yellow-400 hover:from-yellow-500/30 hover:to-amber-500/30"
            disabled={currentUserParticipant?.role === 'observer' || isPaused}
          >
            <Hand className="mr-2 h-4 w-4" />
            {currentUserParticipant?.role === 'observer' 
              ? 'Observers cannot speak' 
              : isPaused 
                ? 'Session paused' 
                : 'Raise Hand to Speak'
            }
          </GlassButton>
        )}
      </div>
    </div>
  )
})
