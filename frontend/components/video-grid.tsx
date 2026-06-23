'use client'

import { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react'
import { useAuthStore, useSessionStore, SessionPhase } from '@/lib/store'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MonitorUp, 
  MonitorX,
  MoreVertical,
  Hand,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoGridProps {
  session: any
  phase?: SessionPhase
}

// Phase-based ring colors
const PHASE_RING_COLORS: Record<SessionPhase, string> = {
  lobby: 'ring-white/30',
  opening: 'ring-debate-opening',
  argument: 'ring-debate-argument',
  rebuttal: 'ring-debate-rebuttal',
  open_discussion: 'ring-primary-500',
  conclusion: 'ring-debate-conclusion',
}

// Video participant card - memoized for performance
const VideoCard = memo(function VideoCard({
  participant,
  isLocal = false,
  isCurrentSpeaker = false,
  isScreenShare = false,
  stream,
  phase = 'lobby',
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
  children
}: {
  participant?: any
  isLocal?: boolean
  isCurrentSpeaker?: boolean
  isScreenShare?: boolean
  stream?: MediaStream | null
  phase?: SessionPhase
  onToggleMute?: () => void
  onToggleVideo?: () => void
  isMuted?: boolean
  isVideoOff?: boolean
  children?: React.ReactNode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const ringColor = PHASE_RING_COLORS[phase]

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (isScreenShare) {
    return (
      <div className="relative glass-card rounded-2xl overflow-hidden col-span-full row-span-2 animate-scale-in">
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="w-full h-full object-contain bg-black/50"
        />
        <div className="absolute top-4 left-4 glass-card rounded-lg px-3 py-1.5">
          <span className="text-sm text-white font-medium flex items-center gap-2">
            <MonitorUp className="h-4 w-4 text-debate-pro" />
            Screen Sharing
          </span>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'relative glass-card rounded-2xl overflow-hidden transition-all duration-300',
        isCurrentSpeaker && `ring-4 ${ringColor} ring-offset-2 ring-offset-[hsl(222,47%,4%)] speaking-active`,
        isLocal && 'z-10'
      )}
    >
      {/* Video or Avatar */}
      {isLocal && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
          <div className="text-center">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3',
              isCurrentSpeaker 
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow-primary' 
                : 'bg-white/10'
            )}>
              <span className="text-3xl text-white font-semibold">
                {participant?.username?.[0]?.toUpperCase() || (isLocal ? 'Y' : '?')}
              </span>
            </div>
            <p className="text-white font-medium">{isLocal ? 'You' : participant?.username}</p>
            <p className="text-white/50 text-sm capitalize">{participant?.role || 'Participant'}</p>
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {isCurrentSpeaker && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-debate-pro animate-pulse" />
            <span className="text-xs text-white font-medium">Speaking</span>
          </div>
        </div>
      )}

      {/* Hand raised indicator */}
      {participant?.has_raised_hand && !isCurrentSpeaker && (
        <div className="absolute top-3 right-3">
          <div className="glass-card rounded-full p-2">
            <Hand className="h-4 w-4 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Controls overlay for local video */}
      {isLocal && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">
              You {isCurrentSpeaker && '(Speaking)'}
            </span>
            <div className="flex items-center gap-2">
              <GlassButton
                onClick={onToggleMute}
                variant={isMuted ? 'con' : 'default'}
                size="icon-sm"
                className={!isMuted ? 'bg-debate-pro/20 border-debate-pro/40' : ''}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </GlassButton>
              <GlassButton
                onClick={onToggleVideo}
                variant={isVideoOff ? 'con' : 'default'}
                size="icon-sm"
                className={!isVideoOff ? 'bg-debate-pro/20 border-debate-pro/40' : ''}
              >
                {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Participant info overlay for remote */}
      {!isLocal && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">
              {participant?.username}
            </span>
            {participant?.is_speaking && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-debate-pro animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-debate-pro animate-pulse animation-delay-100" />
                <div className="w-1.5 h-1.5 rounded-full bg-debate-pro animate-pulse animation-delay-200" />
              </div>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  )
})

export const VideoGrid = memo(function VideoGrid({ session, phase = 'lobby' }: VideoGridProps) {
  const { user } = useAuthStore()
  const { participants, currentSpeaker } = useSessionStore()
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const participantList = useMemo(() =>
    Array.isArray(participants) ? participants : [],
    [participants]
  )
  const currentUserParticipant = useMemo(
    () => participantList.find((p: any) => p.user_id === user?.id),
    [participantList, user?.id]
  )

  // Initialize local stream
  useEffect(() => {
    let isMounted = true

    if (!navigator.mediaDevices) {
      console.error('getUserMedia is not supported')
      return
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      console.error('Camera access requires HTTPS')
      return
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        setLocalStream(stream)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Media error:', err)
        }
      })

    return () => {
      isMounted = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (currentUserParticipant?.is_muted) return
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }, [currentUserParticipant?.is_muted, localStream, isMuted])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }, [localStream, isVideoOff])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
      setScreenStream(null)
      setIsScreenSharing(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        screenStreamRef.current = stream
        setScreenStream(stream)
        setIsScreenSharing(true)
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          setScreenStream(null)
          screenStreamRef.current = null
        }
      } catch (err) {
        console.error('Screen share error:', err)
      }
    }
  }, [isScreenSharing])

  // Memoized participant filtering
  const activeParticipants = useMemo(() => 
    participantList.filter((p: any) => p.is_active),
    [participantList]
  )
  
  const remoteParticipants = useMemo(() => 
    activeParticipants.filter((p: any) => p.user_id !== user?.id),
    [activeParticipants, user?.id]
  )

  // Calculate grid layout based on participant count
  const activeCount = useMemo(() => activeParticipants.length, [activeParticipants])
  
  const totalVideos = 1 + remoteParticipants.length
  
  const gridConfig = useMemo(() => {
    if (totalVideos <= 2) return 'grid-cols-1 md:grid-cols-2'
    if (totalVideos <= 4) return 'grid-cols-2'
    if (totalVideos <= 6) return 'grid-cols-2 md:grid-cols-3'
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }, [totalVideos])

  // Mobile: stack to single column
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const mobileGrid = isMobile ? 'grid-cols-1' : gridConfig

  useEffect(() => {
    if (!localStream) return
    const forceMuted = !!currentUserParticipant?.is_muted
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !forceMuted && !isMuted
    })
  }, [currentUserParticipant?.is_muted, isMuted, localStream])

  return (
    <div className="h-full flex flex-col">
      {/* Main Video Grid */}
      <div className={cn('flex-1 grid gap-3 md:gap-4 min-h-0', mobileGrid)}>

        {/* Local video - highlighted if speaking */}
        <VideoCard
          isLocal
          isCurrentSpeaker={currentSpeaker === user?.id}
          stream={isScreenSharing ? screenStream : localStream}
          isScreenShare={isScreenSharing}
          phase={phase}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          isMuted={isMuted || !!currentUserParticipant?.is_muted}
          isVideoOff={isVideoOff}
        >
          {/* Screen share button */}
          <GlassButton
            onClick={toggleScreenShare}
            variant={isScreenSharing ? 'pro' : 'default'}
            size="icon-sm"
            className="absolute top-3 left-3"
          >
            {isScreenSharing ? <MonitorX className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
          </GlassButton>
        </VideoCard>

        {/* Remote participants */}
        {remoteParticipants.map((participant: any) => (
          <VideoCard
            key={participant.user_id}
            participant={participant}
            isCurrentSpeaker={currentSpeaker === participant.user_id}
            phase={phase}
          />
        ))}
      </div>

      {/* Bottom info bar */}
      <div className="mt-4 flex items-center justify-between glass-card rounded-xl px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-white/40" />
            <span className="text-sm">
              <span className="text-white font-medium">{activeCount}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/40">{participants.length}</span>
              <span className="text-white/40 ml-1">active</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">Session Code:</span>
          <code className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">
            {session.session_code}
          </code>
        </div>
      </div>
    </div>
  )
})
