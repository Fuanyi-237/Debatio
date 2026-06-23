'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'react-query'
import { recordingAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mic, Video, Monitor, Circle, Square, Clock, Download } from 'lucide-react'

interface RecordingPanelProps {
  sessionId: string
  isHost: boolean
  isModerator: boolean
  canControl?: boolean
  isRecording?: boolean
  currentRecordingId?: string | null
}

export function RecordingPanel({
  sessionId,
  canControl = false,
  isRecording: initialRecording = false,
  currentRecordingId: initialRecordingId = null
}: RecordingPanelProps) {
  const [isRecording, setIsRecording] = useState(initialRecording)
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(initialRecordingId)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [includeVideo, setIncludeVideo] = useState(true)
  const [includeScreen, setIncludeScreen] = useState(false)

  const { data: recordings, refetch } = useQuery(
    ['recordings', sessionId],
    () => recordingAPI.getAll(sessionId),
    { enabled: !!sessionId }
  )

  const startMutation = useMutation(
    () => recordingAPI.start(sessionId, { include_audio: includeAudio, include_video: includeVideo, include_screen: includeScreen }),
    {
      onSuccess: (response) => {
        setIsRecording(true)
        setCurrentRecordingId(response.data.recording_id)
        refetch()
      }
    }
  )

  const stopMutation = useMutation(
    () => recordingAPI.stop(sessionId, currentRecordingId!),
    {
      onSuccess: () => {
        setIsRecording(false)
        setCurrentRecordingId(null)
        refetch()
      }
    }
  )

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      {canControl && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-white">Recording Controls</h3>
          </CardHeader>
          <CardContent>
            {isRecording ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-red-400">
                  <Circle className="h-4 w-4 fill-current animate-pulse" />
                  <span className="font-medium">Recording in progress...</span>
                </div>
                <Button
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isLoading}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {stopMutation.isLoading ? 'Stopping...' : 'Stop Recording'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rec_audio" className="text-sm text-gray-300 flex items-center">
                      <Mic className="h-4 w-4 mr-2" />
                      Include Audio
                    </Label>
                    <Switch
                      id="rec_audio"
                      checked={includeAudio}
                      onCheckedChange={setIncludeAudio}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rec_video" className="text-sm text-gray-300 flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      Include Video
                    </Label>
                    <Switch
                      id="rec_video"
                      checked={includeVideo}
                      onCheckedChange={setIncludeVideo}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rec_screen" className="text-sm text-gray-300 flex items-center">
                      <Monitor className="h-4 w-4 mr-2" />
                      Include Screen
                    </Label>
                    <Switch
                      id="rec_screen"
                      checked={includeScreen}
                      onCheckedChange={setIncludeScreen}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isLoading}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Circle className="h-4 w-4 mr-2 fill-current" />
                  {startMutation.isLoading ? 'Starting...' : 'Start Recording'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recordings List */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-white">Session Recordings</h3>
        </CardHeader>
        <CardContent>
          {!recordings?.data || recordings.data.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recordings yet</p>
          ) : (
            <div className="space-y-3">
              {recordings.data.map((recording: any) => (
                <div
                  key={recording._id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        Recording {formatDate(recording.started_at)}
                      </span>
                      <Badge variant={recording.status === 'completed' ? 'default' : 'secondary'}>
                        {recording.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(recording.duration_seconds || 0)}
                      </span>
                      {recording.include_audio && <span>Audio</span>}
                      {recording.include_video && <span>Video</span>}
                      {recording.include_screen && <span>Screen</span>}
                    </div>
                  </div>
                  {recording.recording_url && (
                    <a
                      href={recording.recording_url}
                      download
                      className="text-primary-400 hover:text-primary-300"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
