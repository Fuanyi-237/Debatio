'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { sessionsAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Calendar,
  ChevronRight,
  Bookmark
} from 'lucide-react'

interface SessionReplayProps {
  sessionId: string
}

interface TimelineEntry {
  type: string
  timestamp: string
  user_id: string
  username?: string
  data: any
  phase: string
}

export function SessionReplay({ sessionId }: SessionReplayProps) {
  const [activeTab, setActiveTab] = useState('timeline')
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null)

  const { data: replayData, isLoading: replayLoading } = useQuery(
    ['session-replay', sessionId],
    () => sessionsAPI.getReplay(sessionId),
    { enabled: !!sessionId }
  )

  const { data: summaryData, isLoading: summaryLoading } = useQuery(
    ['session-summary', sessionId],
    () => sessionsAPI.getSummary(sessionId),
    { enabled: !!sessionId }
  )

  const formatTime = (timestamp: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hrs = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'argument': return <FileText className="h-4 w-4 text-blue-400" />
      case 'chat': return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'phase_change': return <Bookmark className="h-4 w-4 text-yellow-400" />
      case 'speaking_turn_assigned': return <Play className="h-4 w-4 text-primary-400" />
      case 'speaking_turn_ended': return <Pause className="h-4 w-4 text-red-400" />
      default: return <ChevronRight className="h-4 w-4 text-gray-400" />
    }
  }

  const timeline: TimelineEntry[] = replayData?.data?.timeline || []
  const speakers = replayData?.data?.speakers || []
  const keyMoments = replayData?.data?.key_moments || []
  const summary = summaryData?.data

  if (replayLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Session Replay</h2>
        <p className="text-sm text-gray-400">{replayData?.data?.title}</p>
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {replayData?.data?.started_at && new Date(replayData.data.started_at).toLocaleDateString()}
          </span>
          <span className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(replayData?.data?.duration_minutes)}
          </span>
          <span className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {speakers.length} speakers
          </span>
          <span className="flex items-center">
            <MessageSquare className="h-3 w-3 mr-1" />
            {replayData?.data?.total_entries} entries
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 bg-gray-800">
          <TabsTrigger value="timeline" className="data-[state=active]:bg-gray-700">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="summary" className="data-[state=active]:bg-gray-700">
            <BarChart3 className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="speakers" className="data-[state=active]:bg-gray-700">
            <Users className="h-4 w-4 mr-2" />
            Speakers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 m-0 p-4">
          <div className="flex h-full space-x-4">
            {/* Timeline List */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No timeline data available</p>
                ) : (
                  timeline.map((entry, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedEntry(entry)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEntry === entry
                          ? 'bg-primary-900/50 border border-primary-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="mt-0.5">{getEntryIcon(entry.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {entry.phase}
                            </Badge>
                          </div>
                          <p className="text-sm text-white font-medium truncate">
                            {entry.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {entry.type === 'argument'
                              ? `Argument: ${entry.data?.content?.substring(0, 60)}...`
                              : entry.type === 'chat'
                              ? entry.data
                              : entry.type}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Selected Entry Detail */}
            <div className="w-80 bg-gray-800 rounded-lg p-4">
              {selectedEntry ? (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    {getEntryIcon(selectedEntry.type)}
                    <span className="text-lg font-semibold text-white capitalize">
                      {selectedEntry.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    {formatTime(selectedEntry.timestamp)} • {selectedEntry.username}
                  </p>
                  <Badge className="mb-4">{selectedEntry.phase}</Badge>

                  {selectedEntry.type === 'argument' && selectedEntry.data && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-300">{selectedEntry.data.content}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Type: {selectedEntry.data.type}</span>
                        <span>Quality: {selectedEntry.data.quality_score?.toFixed(1)}%</span>
                      </div>
                      {selectedEntry.data.evidence?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 uppercase mb-2">Evidence</p>
                          {selectedEntry.data.evidence.map((item: any, i: number) => (
                            <div key={i} className="text-sm text-gray-400 mb-1">
                              • {item.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedEntry.type === 'chat' && (
                    <p className="text-sm text-gray-300">{selectedEntry.data}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center">Select an entry to view details</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="flex-1 m-0 p-4">
          {summary && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{summary.summary?.total_arguments}</p>
                    <p className="text-xs text-gray-400">Total Arguments</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{summary.summary?.active_participants}</p>
                    <p className="text-xs text-gray-400">Active Speakers</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{summary.summary?.accepted_statements_count}</p>
                    <p className="text-xs text-gray-400">Consensus Points</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary-400">{summary.fairness_score?.toFixed(0)}%</p>
                    <p className="text-xs text-gray-400">Fairness Score</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Arguments */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-semibold text-white">Top Arguments</h3>
                </CardHeader>
                <CardContent>
                  {summary.top_arguments?.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No arguments with votes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.top_arguments?.map((arg: any, index: number) => (
                        <div key={arg.id} className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded">
                          <span className="text-primary-400 font-bold">#{index + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-300">{arg.content}</p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                              <Badge variant="outline" className="capitalize">{arg.type}</Badge>
                              <span>Quality: {arg.quality_score?.toFixed(1)}%</span>
                              <span>Upvotes: {arg.upvotes}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Consensus Statements */}
              {summary.accepted_statements?.length > 0 && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-white">Consensus Reached</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.accepted_statements?.map((s: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800 rounded">
                          <p className="text-sm text-gray-300">{s.statement}</p>
                          <Badge className="bg-green-600">{s.agreement_percentage?.toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="speakers" className="flex-1 m-0 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {speakers.length === 0 ? (
              <p className="text-gray-500 text-center col-span-2 py-8">No speaker data available</p>
            ) : (
              speakers.map((speaker: any) => (
                <Card key={speaker.user_id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-lg text-white font-medium">
                          {speaker.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{speaker.username || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{speaker.entry_count} contributions</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>First spoke: {formatTime(speaker.first_speaking_time)}</span>
                      <span>Last spoke: {formatTime(speaker.last_speaking_time)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
