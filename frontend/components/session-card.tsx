'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from 'react-query'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/store'
import { sessionsAPI } from '@/lib/api'
import { Users, Clock, Scale, Circle, Trash2, Play } from 'lucide-react'

interface Session {
  id: string
  title: string
  topic: string
  description?: string
  session_type: 'debate' | 'roundtable'
  status: 'scheduled' | 'live' | 'paused' | 'ended'
  visibility: 'public' | 'private' | 'community'
  participant_count: number
  is_live: boolean
  created_at: string
  host_id: string
}

export function SessionCard({ session }: { session: Session }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const isHost = session.host_id === user?.id

  const deleteMutation = useMutation(
    () => sessionsAPI.delete(session.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('mySessions')
        queryClient.invalidateQueries('publicSessions')
        setShowConfirm(false)
      },
    }
  )

  const getStatusBadge = () => {
    if (session.is_live) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1.5">
          <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
          Live
        </Badge>
      )
    }
    if (session.status === 'scheduled') {
      return <Badge variant="secondary">Scheduled</Badge>
    }
    if (session.status === 'ended') {
      return <Badge variant="outline">Ended</Badge>
    }
    return <Badge>{session.status}</Badge>
  }

  const sessionId = (session as any).id ?? (session as any)._id

  if (!sessionId) {
    return null
  }

  return (
    <div className="relative group">
      <Link href={`/sessions/${sessionId}`}>
        <Card className="hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer h-full border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded ${session.session_type === 'debate' ? 'bg-primary-50' : 'bg-purple-50'}`}>
                    <Scale className={`h-3 w-3 ${session.session_type === 'debate' ? 'text-primary-600' : 'text-purple-600'}`} />
                  </div>
                  <span className={`text-xs font-medium ${session.session_type === 'debate' ? 'text-primary-600' : 'text-purple-600'}`}>
                    {session.session_type === 'debate' ? 'Debate' : 'Roundtable'}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                  {session.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{session.topic}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {getStatusBadge()}
                <div className="flex items-center gap-1">
                  {session.status === 'ended' && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClickCapture={(e) => e.stopPropagation()}
                      type="button"
                      onDoubleClick={(e) => e.stopPropagation()}
                      onAuxClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        router.push(`/sessions/${sessionId}?tab=replay`)
                      }}
                      className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors"
                      title="View replay"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isHost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setShowConfirm(true)
                      }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.participant_count}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
              </span>
              {session.visibility === 'private' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Private</Badge>
              )}
            </div>
            {session.description && (
              <p className="text-sm text-gray-500 mt-3 line-clamp-2 leading-relaxed">{session.description}</p>
            )}
          </CardContent>
        </Card>
      </Link>

      {isHost && showConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-20 p-4">
          <p className="text-sm font-medium text-gray-900 text-center">Delete this session?</p>
          <p className="text-xs text-gray-500 text-center">This action cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
