'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { sendChatMessage, getSocket, sendReaction, submitQuestion, upvoteQuestion, answerQuestion, issueViolation, grantExtension } from '@/lib/socket'
import { useAuthStore, useSessionStore } from '@/lib/store'
import { RecordingPanel } from '@/components/recording-panel'
import { NotesPanel } from '@/components/notes-panel'
import { LiveCaptions } from '@/components/live-captions'
import { WaitingRoom } from '@/components/waiting-room'
import { BreakoutRooms } from '@/components/breakout-rooms'
import { MessageSquare, Users, Settings, Volume2, VolumeX, ThumbsUp, HelpCircle, AlertTriangle, Shield, ChevronUp, Video, FileText, Subtitles, DoorOpen, Users2, Clock } from 'lucide-react'

interface SessionControlsProps {
  session: any
  isHost: boolean
  isModerator: boolean
  isSpeaker: boolean
  canControl?: boolean
  extensionRequests?: Array<{ user_id: string; timestamp?: string }>
  onClearExtensionRequest?: (userId: string) => void
}

interface ChatMsg {
  user_id: string
  username?: string
  message: string
  timestamp: string
}

const REACTION_TYPES = [
  { type: 'agree', emoji: '👍', label: 'Agree' },
  { type: 'disagree', emoji: '👎', label: 'Disagree' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'surprised', emoji: '😮', label: 'Surprised' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
]

const VIOLATION_TYPES = [
  { type: 'interruption', label: 'Interruption' },
  { type: 'time_exceeded', label: 'Time Exceeded' },
  { type: 'rule_break', label: 'Rule Break' },
  { type: 'inappropriate', label: 'Inappropriate' },
]

export function SessionControls({ session, isHost, isModerator, canControl, extensionRequests = [], onClearExtensionRequest }: SessionControlsProps) {
  const { participants, questions, reactions } = useSessionStore()
  const { user } = useAuthStore()
  const participantList: any[] = Array.isArray(participants) ? participants : []
  const [chatMessage, setChatMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false)
  const [isViolationsOpen, setIsViolationsOpen] = useState(false)
  const [isRecordingOpen, setIsRecordingOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isCaptionsOpen, setIsCaptionsOpen] = useState(false)
  const [isWaitingRoomOpen, setIsWaitingRoomOpen] = useState(false)
  const [isBreakoutOpen, setIsBreakoutOpen] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onChatMessage = (data: ChatMsg) => {
      setChatMessages((prev) => [...prev, data])
    }

    socket.on('chat_message', onChatMessage)
    return () => {
      socket.off('chat_message', onChatMessage)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return
    sendChatMessage(session.id, chatMessage)
    setChatMessages((prev) => [...prev, {
      user_id: user?.id || '',
      username: user?.username || 'You',
      message: chatMessage,
      timestamp: new Date().toISOString()
    }])
    setChatMessage('')
  }

  const handleReaction = (type: string) => {
    sendReaction(session.id, type)
  }

  const handleSubmitQuestion = () => {
    if (!questionText.trim()) return
    submitQuestion(session.id, questionText)
    setQuestionText('')
  }

  const handleUpvoteQuestion = (questionId: string) => {
    upvoteQuestion(session.id, questionId)
  }

  const handleAnswerQuestion = (questionId: string) => {
    answerQuestion(session.id, questionId)
  }

  const handleIssueViolation = (userId: string, type: string) => {
    issueViolation(session.id, userId, type)
    setIsViolationsOpen(false)
  }

  const handleGrantExtension = (userId: string) => {
    grantExtension(session.id, userId)
    onClearExtensionRequest?.(userId)
  }

  const getParticipantName = (userId: string, username?: string) => {
    if (username) return username
    const p = participantList.find((p: any) => p.user_id === userId)
    return p?.username || `User ${userId.slice(-6)}`
  }

  const unansweredQuestions = questions.filter(q => !q.is_answered)

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Chat Toggle */}
          <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Session Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="h-64 bg-gray-800 rounded-lg p-4 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-500 text-center">No messages yet. Say hello!</p>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="mb-2">
                        <span className="text-primary-400 text-xs font-medium">
                          {getParticipantName(msg.user_id, msg.username)}
                        </span>
                        <p className="text-white text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border-gray-700 text-white rounded px-3 py-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>Send</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Questions Toggle */}
          <Dialog open={isQuestionsOpen} onOpenChange={setIsQuestionsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300 relative">
                <HelpCircle className="h-5 w-5 mr-2" />
                Questions
                {unansweredQuestions.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unansweredQuestions.length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Questions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Submit Question */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-gray-800 border-gray-700 text-white rounded px-3 py-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitQuestion()}
                  />
                  <Button onClick={handleSubmitQuestion} size="sm">Ask</Button>
                </div>
                {/* Question List */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {questions.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">No questions yet</p>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className={`p-3 rounded-lg ${q.is_answered ? 'bg-gray-800/50' : 'bg-gray-800 border border-gray-600'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm ${q.is_answered ? 'text-gray-500 line-through' : 'text-white'}`}>{q.text}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {q.asked_by_username || getParticipantName(q.asked_by)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {!q.is_answered && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpvoteQuestion(q.id)}
                                  className="text-blue-400 hover:text-blue-300 h-7 px-2"
                                >
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  {q.upvotes}
                                </Button>
                                {(isHost || isModerator) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAnswerQuestion(q.id)}
                                    className="text-green-400 hover:text-green-300 h-7 px-2"
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            {q.is_answered && (
                              <span className="text-green-500 text-xs">Answered</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Participants Toggle */}
          <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <Users className="h-5 w-5 mr-2" />
                Participants ({participantList.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Participants</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participantList.map((participant: any) => (
                  <div
                    key={participant.user_id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm text-white">
                          {participant.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{participant.username}</p>
                        <p className="text-gray-400 text-sm capitalize">{participant.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.is_muted ? (
                        <VolumeX className="h-4 w-4 text-red-400" />
                      ) : (
                        <Volume2 className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          {canControl && extensionRequests.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-amber-300">
                  <Clock className="h-5 w-5 mr-2" />
                  Extensions ({extensionRequests.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Extension Requests</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {extensionRequests.map((req) => (
                    <div key={req.user_id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{getParticipantName(req.user_id)}</p>
                        <p className="text-xs text-gray-400">Requested more speaking time</p>
                      </div>
                      <Button size="sm" onClick={() => handleGrantExtension(req.user_id)} className="bg-amber-600 hover:bg-amber-700">
                        Grant
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Reactions Bar */}
          <div className="flex items-center space-x-1 bg-gray-700/50 rounded-lg px-2 py-1">
            {REACTION_TYPES.map((r) => (
              <button
                key={r.type}
                onClick={() => handleReaction(r.type)}
                className="hover:bg-gray-600 rounded p-1 transition-colors text-lg"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>

          {/* Moderator Violation Controls */}
          {canControl && (
            <Dialog open={isViolationsOpen} onOpenChange={setIsViolationsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300">
                  <Shield className="h-5 w-5 mr-2" />
                  Violations
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Issue Violation</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">Select a participant and violation type:</p>
                  {participantList.filter((p: any) => p.user_id !== user?.id && p.is_active).map((participant: any) => (
                    <div key={participant.user_id} className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-medium mb-2">{participant.username}</p>
                      <div className="flex flex-wrap gap-2">
                        {VIOLATION_TYPES.map((v) => (
                          <Button
                            key={v.type}
                            size="sm"
                            variant="outline"
                            onClick={() => handleIssueViolation(participant.user_id, v.type)}
                            className="text-orange-400 border-orange-700 hover:bg-orange-900/30 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Waiting Room - Host/Moderator only */}
          {canControl && (
            <Dialog open={isWaitingRoomOpen} onOpenChange={setIsWaitingRoomOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-300">
                  <DoorOpen className="h-5 w-5 mr-2" />
                  Waiting Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Waiting Room</DialogTitle>
                </DialogHeader>
                <WaitingRoom sessionId={session.id} />
              </DialogContent>
            </Dialog>
          )}

          {/* Recording */}
          <Dialog open={isRecordingOpen} onOpenChange={setIsRecordingOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <Video className="h-5 w-5 mr-2" />
                Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Session Recording</DialogTitle>
              </DialogHeader>
              <RecordingPanel
                sessionId={session.id}
                isHost={isHost}
                isModerator={isModerator}
                canControl={canControl}
              />
            </DialogContent>
          </Dialog>

          {/* Notes */}
          <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <FileText className="h-5 w-5 mr-2" />
                Notes
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-white">My Notes</DialogTitle>
              </DialogHeader>
              <NotesPanel sessionId={session.id} />
            </DialogContent>
          </Dialog>

          {/* Live Captions */}
          <Dialog open={isCaptionsOpen} onOpenChange={setIsCaptionsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <Subtitles className="h-5 w-5 mr-2" />
                Captions
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Live Captions</DialogTitle>
              </DialogHeader>
              <LiveCaptions sessionId={session.id} />
            </DialogContent>
          </Dialog>

          {/* Breakout Rooms */}
          <Dialog open={isBreakoutOpen} onOpenChange={setIsBreakoutOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300">
                <Users2 className="h-5 w-5 mr-2" />
                Breakouts
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-white">Breakout Rooms</DialogTitle>
              </DialogHeader>
              <BreakoutRooms sessionId={session.id} canControl={canControl} />
            </DialogContent>
          </Dialog>

          {/* Settings */}
          {(isHost || isModerator) && (
            <Button variant="ghost" size="sm" className="text-gray-300">
              <Settings className="h-5 w-5 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
