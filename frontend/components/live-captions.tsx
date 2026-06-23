'use client'

import { useEffect, useState, useRef } from 'react'
import { useSessionStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Subtitles } from 'lucide-react'

interface Caption {
  id: string
  text: string
  speaker: string
  timestamp: number
  isFinal: boolean
}

interface LiveCaptionsProps {
  sessionId: string
  isEnabled?: boolean
}

export function LiveCaptions({ sessionId, isEnabled = false }: LiveCaptionsProps) {
  const { currentSpeaker, participants } = useSessionStore()
  const [captions, setCaptions] = useState<Caption[]>([])
  const [isActive, setIsActive] = useState(isEnabled)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [captions])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        const speaker = participants.find(p => p.user_id === currentSpeaker)?.username || 'Unknown'
        setCaptions(prev => [...prev.slice(-19), {
          id: Date.now().toString(),
          text: finalTranscript,
          speaker,
          timestamp: Date.now(),
          isFinal: true
        }])
      }

      if (interimTranscript) {
        setCaptions(prev => {
          const last = prev[prev.length - 1]
          if (last && !last.isFinal) {
            return [...prev.slice(0, -1), { ...last, text: interimTranscript }]
          }
          return [...prev, {
            id: Date.now().toString(),
            text: interimTranscript,
            speaker: participants.find(p => p.user_id === currentSpeaker)?.username || 'Unknown',
            timestamp: Date.now(),
            isFinal: false
          }]
        })
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [currentSpeaker, participants])

  const toggleCaptions = () => {
    if (isActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsActive(false)
    } else {
      setIsActive(true)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          console.error('Failed to start recognition:', e)
        }
      }
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Subtitles className="h-5 w-5 mr-2" />
          Live Captions
        </h3>
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={toggleCaptions}
          className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isActive ? (
            <><MicOff className="h-4 w-4 mr-1" /> Stop</>
          ) : (
            <><Mic className="h-4 w-4 mr-1" /> Start</>
          )}
        </Button>
      </div>

      {isActive && (
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-400">Real-time transcription</span>
            {isListening ? (
              <Badge variant="outline" className="text-green-400 border-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                Listening
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                Standby
              </Badge>
            )}
          </div>
          <div
            ref={scrollRef}
            className="h-48 overflow-y-auto p-4 space-y-3"
          >
            {captions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {isListening ? 'Listening for speech...' : 'Click Start to begin captions'}
              </p>
            ) : (
              captions.map((caption) => (
                <div
                  key={caption.id}
                  className={`space-y-1 ${caption.isFinal ? '' : 'opacity-70'}`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-primary-400 font-medium">{caption.speaker}</span>
                    <span className="text-xs text-gray-500">{formatTime(caption.timestamp)}</span>
                  </div>
                  <p className={`text-gray-300 ${caption.isFinal ? '' : 'italic'}`}>
                    {caption.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {!isActive && (
        <Card className="bg-gray-800 border-gray-700">
          <div className="p-6 text-center">
            <Subtitles className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              Live captions are currently disabled. Enable them to see real-time speech transcription during the session.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
