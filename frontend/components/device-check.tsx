'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Video, VideoOff, Volume2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface DeviceCheckProps {
  onComplete: (devices: { audio: boolean; video: boolean }) => void
  onSkip?: () => void
}

export function DeviceCheck({ onComplete, onSkip }: DeviceCheckProps) {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null)
  const [hasMicrophone, setHasMicrophone] = useState<boolean | null>(null)
  const [hasSpeaker, setHasSpeaker] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [testStream, setTestStream] = useState<MediaStream | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    checkDevices()
    return () => {
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (testStream && videoRef.current) {
      videoRef.current.srcObject = testStream
    }
  }, [testStream])

  const checkDevices = async () => {
    setIsLoading(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      const microphones = devices.filter(d => d.kind === 'audioinput')
      const speakers = devices.filter(d => d.kind === 'audiooutput')

      setHasCamera(cameras.length > 0)
      setHasMicrophone(microphones.length > 0)
      setHasSpeaker(speakers.length > 0 || devices.length > 0)

      if (cameras.length > 0 || microphones.length > 0) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: cameras.length > 0,
            audio: microphones.length > 0
          })
          setTestStream(stream)

          if (microphones.length > 0) {
            setupAudioMonitoring(stream)
          }
        } catch (err: any) {
          if (cameras.length > 0) setCameraError('Camera access denied')
          if (microphones.length > 0) setMicError('Microphone access denied')
        }
      }
    } catch (err) {
      console.error('Device check failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const setupAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average)
        animationRef.current = requestAnimationFrame(updateAudioLevel)
      }

      updateAudioLevel()
    } catch (err) {
      console.error('Audio monitoring setup failed:', err)
    }
  }

  const toggleVideo = () => {
    if (testStream) {
      testStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  const toggleAudio = () => {
    if (testStream) {
      testStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsAudioEnabled(!isAudioEnabled)
    }
  }

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Loader2 className="h-5 w-5 animate-spin" />
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    )
  }

  const canProceed = hasCamera !== false || hasMicrophone !== false

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <h2 className="text-xl font-semibold text-white">Device Check</h2>
          <p className="text-sm text-gray-400">
            Verify your camera and microphone are working properly before joining.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : testStream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <VideoOff className="h-12 w-12 text-gray-600 mb-2" />
                <p className="text-gray-500">Camera not available</p>
              </div>
            )}

            {/* Controls Overlay */}
            {testStream && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-full ${isAudioEnabled ? 'bg-gray-700' : 'bg-red-500'} text-white`}
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full ${isVideoEnabled ? 'bg-gray-700' : 'bg-red-500'} text-white`}
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                </div>
                {isAudioEnabled && audioLevel > 0 && (
                  <div className="flex items-center space-x-2 bg-gray-900/80 px-3 py-1 rounded-full">
                    <Volume2 className="h-4 w-4 text-green-400" />
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(audioLevel, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              {getStatusIcon(hasCamera)}
              <div>
                <p className="text-sm font-medium text-white">Camera</p>
                <p className="text-xs text-gray-400">
                  {hasCamera === null ? 'Checking...' : hasCamera ? 'Working' : 'Not found'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              {getStatusIcon(hasMicrophone)}
              <div>
                <p className="text-sm font-medium text-white">Microphone</p>
                <p className="text-xs text-gray-400">
                  {hasMicrophone === null ? 'Checking...' : hasMicrophone ? 'Working' : 'Not found'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              {getStatusIcon(hasSpeaker)}
              <div>
                <p className="text-sm font-medium text-white">Speaker</p>
                <p className="text-xs text-gray-400">
                  {hasSpeaker === null ? 'Checking...' : hasSpeaker ? 'Working' : 'Not found'}
                </p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {(cameraError || micError) && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-1">Access Denied</p>
              {cameraError && <p className="text-red-300 text-xs">{cameraError}</p>}
              {micError && <p className="text-red-300 text-xs">{micError}</p>}
              <p className="text-gray-400 text-xs mt-2">
                Please allow access in your browser settings to use all features.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={checkDevices} disabled={isLoading}>
              <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Recheck
            </Button>
            <div className="flex items-center space-x-3">
              {onSkip && (
                <Button variant="ghost" onClick={onSkip}>
                  Skip Check
                </Button>
              )}
              <Button
                onClick={() => onComplete({ audio: hasMicrophone === true, video: hasCamera === true })}
                disabled={!canProceed || isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Join Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
