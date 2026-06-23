'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { waitingRoomAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, UserCheck, UserX, Monitor, Loader2 } from 'lucide-react'

interface WaitingRoomProps {
  sessionId: string
}

export function WaitingRoom({ sessionId }: WaitingRoomProps) {
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})

  const { data: entries, isLoading } = useQuery(
    ['waiting-room', sessionId],
    () => waitingRoomAPI.getAll(sessionId),
    {
      enabled: !!sessionId,
      refetchInterval: 5000 // Poll every 5 seconds
    }
  )

  const approveMutation = useMutation(
    ({ entryId, role }: { entryId: string; role: string }) =>
      waitingRoomAPI.approve(sessionId, entryId, role),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['waiting-room', sessionId])
      }
    }
  )

  const rejectMutation = useMutation(
    (entryId: string) => waitingRoomAPI.reject(sessionId, entryId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['waiting-room', sessionId])
      }
    }
  )

  const handleApprove = (entryId: string) => {
    const role = selectedRoles[entryId] || 'observer'
    approveMutation.mutate({ entryId, role })
  }

  const handleRoleChange = (entryId: string, role: string) => {
    setSelectedRoles(prev => ({ ...prev, [entryId]: role }))
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const waitingList = entries?.data || []

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Waiting Room</h3>
          {waitingList.length > 0 && (
            <Badge className="bg-yellow-600">
              {waitingList.length} waiting
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Review and approve participants before they join the session.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : waitingList.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No one is waiting to join</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {waitingList.map((entry: any) => (
                <div
                  key={entry._id}
                  className="p-4 bg-gray-700/50 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {entry.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{entry.username}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting since {formatTime(entry.requested_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                      Waiting
                    </Badge>
                  </div>

                  {entry.message && (
                    <p className="text-gray-400 text-sm bg-gray-800 p-2 rounded">
                      &ldquo;{entry.message}&rdquo;
                    </p>
                  )}

                  {entry.device_info && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Monitor className="h-3 w-3 mr-1" />
                      {entry.device_info.platform || 'Unknown device'}
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-2">
                    <Select
                      value={selectedRoles[entry._id] || 'observer'}
                      onValueChange={(value) => handleRoleChange(entry._id, value)}
                    >
                      <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="observer">Observer</SelectItem>
                        <SelectItem value="speaker">Speaker</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={() => handleApprove(entry._id)}
                      disabled={approveMutation.isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(entry._id)}
                      disabled={rejectMutation.isLoading}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
