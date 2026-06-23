'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { argumentsAPI } from '@/lib/api'
import { useAuthStore, useSessionStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown, MessageSquare, Reply, X, ChevronRight, Link2, FileText, BookOpen, Quote, Trash2 } from 'lucide-react'

interface ArgumentBoardProps {
  sessionId: string
}

interface EvidenceItem {
  title: string
  url?: string
  description?: string
  type: 'link' | 'file' | 'scripture' | 'quote'
}

export function ArgumentBoard({ sessionId }: ArgumentBoardProps) {
  const { user } = useAuthStore()
  const { participants } = useSessionStore()
  const participantList: any[] = Array.isArray(participants) ? participants : []
  const queryClient = useQueryClient()
  const [newArgument, setNewArgument] = useState('')
  const [argumentType, setArgumentType] = useState('opening')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [newEvidence, setNewEvidence] = useState<EvidenceItem>({ title: '', url: '', description: '', type: 'link' })

  const { data: argumentsData, isLoading } = useQuery(
    ['arguments', sessionId],
    () => argumentsAPI.getBySession(sessionId)
  )

  const createMutation = useMutation(
    (data: any) => argumentsAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['arguments', sessionId])
        setNewArgument('')
        setReplyingTo(null)
      },
    }
  )

  const voteMutation = useMutation(
    ({ id, voteType }: { id: string; voteType: 'upvote' | 'downvote' }) =>
      argumentsAPI.vote(id, voteType)
  )

  const userParticipant = participantList.find((p: any) => p.user_id === user?.id)
  const canSubmitArgument = userParticipant && userParticipant.role !== 'observer'

  const handleSubmit = () => {
    if (!newArgument.trim()) return

    createMutation.mutate({
      session_id: sessionId,
      content: newArgument,
      type: argumentType,
      parent_id: replyingTo,
      evidence: evidence,
    }, {
      onSuccess: () => {
        setNewArgument('')
        setReplyingTo(null)
        setEvidence([])
      }
    })
  }

  const handleAddEvidence = () => {
    if (!newEvidence.title.trim()) return
    setEvidence([...evidence, { ...newEvidence }])
    setNewEvidence({ title: '', url: '', description: '', type: 'link' })
    setShowEvidenceForm(false)
  }

  const handleRemoveEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index))
  }

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'scripture': return <BookOpen className="h-4 w-4" />
      case 'quote': return <Quote className="h-4 w-4" />
      case 'file': return <FileText className="h-4 w-4" />
      default: return <Link2 className="h-4 w-4" />
    }
  }

  const getArgumentTypeColor = (type: string) => {
    switch (type) {
      case 'opening':
        return 'bg-blue-100 text-blue-800'
      case 'rebuttal':
        return 'bg-red-100 text-red-800'
      case 'counter':
        return 'bg-orange-100 text-orange-800'
      case 'evidence':
        return 'bg-green-100 text-green-800'
      case 'closing':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const rootArguments = argumentsData?.data?.filter((arg: any) => !arg.parent_id) || []

  return (
    <div className="h-full flex flex-col">
      {/* New Argument Form */}
      {canSubmitArgument && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          {replyingTo && (
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-700 rounded">
              <span className="text-sm text-gray-300">
                Replying to argument
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex space-x-2 mb-3">
            <Select value={argumentType} onValueChange={setArgumentType}>
              <SelectTrigger className="w-40 bg-gray-700 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opening">Opening</SelectItem>
                <SelectItem value="rebuttal">Rebuttal</SelectItem>
                <SelectItem value="counter">Counter</SelectItem>
                <SelectItem value="evidence">Evidence</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="answer">Answer</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={newArgument}
            onChange={(e) => setNewArgument(e.target.value)}
            placeholder="Present your argument..."
            className="mb-3 bg-gray-700 border-gray-600 text-white"
            rows={3}
          />

          {/* Evidence Section */}
          <div className="mb-3">
            {/* Evidence List */}
            {evidence.length > 0 && (
              <div className="space-y-2 mb-3">
                {evidence.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                    <div className="flex items-center space-x-2">
                      {getEvidenceIcon(item.type)}
                      <span className="text-sm text-gray-300">{item.title}</span>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                          Link
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveEvidence(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Evidence Button */}
            {!showEvidenceForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEvidenceForm(true)}
                className="text-gray-400 border-gray-600 hover:bg-gray-700"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Add Evidence/References
              </Button>
            ) : (
              <div className="p-3 bg-gray-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 font-medium">Add Evidence</span>
                  <button
                    onClick={() => setShowEvidenceForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Select
                  value={newEvidence.type}
                  onValueChange={(value: any) => setNewEvidence({ ...newEvidence, type: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">External Link</SelectItem>
                    <SelectItem value="scripture">Scripture/Verse</SelectItem>
                    <SelectItem value="quote">Quote/Citation</SelectItem>
                    <SelectItem value="file">File Reference</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={newEvidence.title}
                  onChange={(e) => setNewEvidence({ ...newEvidence, title: e.target.value })}
                  placeholder={newEvidence.type === 'scripture' ? 'e.g., John 3:16' : 'Title or name'}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                {newEvidence.type !== 'quote' && (
                  <Input
                    value={newEvidence.url}
                    onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
                    placeholder={newEvidence.type === 'scripture' ? 'Version (e.g., NIV)' : 'URL (optional)'}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                )}
                <Textarea
                  value={newEvidence.description}
                  onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
                  placeholder="Brief description or quote..."
                  className="bg-gray-800 border-gray-600 text-white"
                  rows={2}
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEvidenceForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddEvidence}
                    disabled={!newEvidence.title.trim()}
                    className="flex-1"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={createMutation.isLoading || !newArgument.trim()}
            className="w-full"
          >
            {createMutation.isLoading ? 'Submitting...' : 'Submit Argument'}
          </Button>
        </div>
      )}

      {/* Arguments List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Loading arguments...</p>
        ) : rootArguments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No arguments yet. Be the first to contribute!</p>
        ) : (
          <div className="space-y-4">
            {rootArguments.map((argument: any) => (
              <ArgumentCard
                key={argument.id}
                argument={argument}
                depth={0}
                onReply={setReplyingTo}
                onVote={(id, voteType) => voteMutation.mutate({ id, voteType })}
                userId={user?.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface ArgumentCardProps {
  argument: any
  depth: number
  onReply: (id: string) => void
  onVote: (id: string, voteType: 'upvote' | 'downvote') => void
  userId?: string
}

function ArgumentCard({ argument, depth, onReply, onVote, userId }: ArgumentCardProps) {
  const [showReplies, setShowReplies] = useState(false)
  const hasReplies = argument.children && argument.children.length > 0
  const hasEvidence = argument.evidence && argument.evidence.length > 0

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'scripture': return <BookOpen className="h-3 w-3" />
      case 'quote': return <Quote className="h-3 w-3" />
      case 'file': return <FileText className="h-3 w-3" />
      default: return <Link2 className="h-3 w-3" />
    }
  }

  return (
    <Card className={`bg-gray-800 border-gray-700 ${depth > 0 ? 'ml-8' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-sm text-white font-medium">
                {argument.author?.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {argument.author?.username || 'Unknown'}
              </p>
              <Badge className={getArgumentTypeColor(argument.type)}>
                {argument.type}
              </Badge>
            </div>
          </div>
          <span className="text-gray-500 text-xs">
            {new Date(argument.created_at).toLocaleTimeString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300 text-sm mb-4">{argument.content}</p>

        {/* Evidence Display */}
        {hasEvidence && (
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Evidence & References</p>
            <div className="space-y-2">
              {argument.evidence.map((item: any, index: number) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-gray-400 mt-0.5">{getEvidenceIcon(item.type)}</span>
                  <div className="flex-1">
                    <p className="text-gray-300 font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-gray-400 text-xs italic">&ldquo;{item.description}&rdquo;</p>
                    )}
                    {item.url && item.type !== 'quote' && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline"
                      >
                        {item.type === 'scripture' ? `Version: ${item.url}` : 'View source'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onVote(argument.id, 'upvote')}
              className="flex items-center space-x-1 text-gray-400 hover:text-green-400"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-sm">{argument.upvotes}</span>
            </button>
            <button
              onClick={() => onVote(argument.id, 'downvote')}
              className="flex items-center space-x-1 text-gray-400 hover:text-red-400"
            >
              <ArrowDown className="h-4 w-4" />
              <span className="text-sm">{argument.downvotes}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center text-gray-400 hover:text-white text-sm"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {argument.children.length} replies
                <ChevronRight className={`h-4 w-4 ml-1 transform transition-transform ${showReplies ? 'rotate-90' : ''}`} />
              </button>
            )}
            <button
              onClick={() => onReply(argument.id)}
              className="flex items-center text-primary-400 hover:text-primary-300 text-sm"
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </button>
          </div>
        </div>

        {/* Quality Score */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Quality Score</span>
            <span className={`font-medium ${
              argument.quality_score >= 70 ? 'text-green-400' :
              argument.quality_score >= 40 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {argument.quality_score.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getArgumentTypeColor(type: string) {
  switch (type) {
    case 'opening':
      return 'bg-blue-100 text-blue-800'
    case 'rebuttal':
      return 'bg-red-100 text-red-800'
    case 'counter':
      return 'bg-orange-100 text-orange-800'
    case 'evidence':
      return 'bg-green-100 text-green-800'
    case 'closing':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
