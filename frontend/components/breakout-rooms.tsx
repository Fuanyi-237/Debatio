'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { breakoutRoomAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSessionStore, useAuthStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Plus, LogIn, Clock, X, Loader2 } from 'lucide-react'

interface BreakoutRoomsProps {
  sessionId: string
  canControl?: boolean
}

export function BreakoutRooms({ sessionId, canControl = false }: BreakoutRoomsProps) {
  const queryClient = useQueryClient()
  const { participants } = useSessionStore()
  const { user } = useAuthStore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomTopic, setNewRoomTopic] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [duration, setDuration] = useState('15')

  const { data: breakoutRooms, isLoading } = useQuery(
    ['breakout-rooms', sessionId],
    () => breakoutRoomAPI.getAll(sessionId),
    { enabled: !!sessionId }
  )

  const createMutation = useMutation(
    () => breakoutRoomAPI.create(sessionId, {
      name: newRoomName,
      topic: newRoomTopic,
      participant_ids: selectedParticipants,
      duration_minutes: parseInt(duration)
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['breakout-rooms', sessionId])
        setIsCreateOpen(false)
        setNewRoomName('')
        setNewRoomTopic('')
        setSelectedParticipants([])
      }
    }
  )

  const joinMutation = useMutation(
    (breakoutId: string) => breakoutRoomAPI.join(sessionId, breakoutId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['breakout-rooms', sessionId])
      }
    }
  )

  const endMutation = useMutation(
    (breakoutId: string) => breakoutRoomAPI.end(sessionId, breakoutId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['breakout-rooms', sessionId])
      }
    }
  )

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const activeParticipants = participants.filter(p => p.is_active && p.user_id !== user?.id)
  const rooms = breakoutRooms?.data || []

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Breakout Rooms
        </h3>
        {canControl && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Create Breakout Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Room Name</label>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., Group A Discussion"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Topic</label>
                  <Input
                    value={newRoomTopic}
                    onChange={(e) => setNewRoomTopic(e.target.value)}
                    placeholder="e.g., Climate Solutions"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Duration (minutes)</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Select Participants</label>
                  <ScrollArea className="h-32 border border-gray-700 rounded-md mt-2">
                    <div className="p-2 space-y-1">
                      {activeParticipants.map((p) => (
                        <label
                          key={p.user_id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(p.user_id)}
                            onChange={() => toggleParticipant(p.user_id)}
                            className="rounded border-gray-600"
                          />
                          <span className="text-white text-sm">{p.username}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedParticipants.length} participants selected
                  </p>
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newRoomName.trim() || selectedParticipants.length === 0 || createMutation.isLoading}
                  className="w-full"
                >
                  {createMutation.isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    'Create Room'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Rooms List */}
      <ScrollArea className="max-h-80">
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : rooms.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No breakout rooms yet</p>
                {canControl && (
                  <p className="text-sm text-gray-600 mt-1">
                    Create rooms to split participants into smaller groups
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            rooms.map((room: any) => (
              <Card key={room._id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-white font-medium">{room.name}</h4>
                        <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                          Active
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{room.topic}</p>
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {room.participants?.length || 0} participants
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {room.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {room.participants?.includes(user?.id) ? (
                        <Button size="sm" variant="outline" className="border-green-600 text-green-400">
                          <LogIn className="h-4 w-4 mr-1" />
                          Joined
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => joinMutation.mutate(room._id)}
                          disabled={joinMutation.isLoading}
                        >
                          <LogIn className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      )}
                      {canControl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => endMutation.mutate(room._id)}
                          disabled={endMutation.isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
