'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { notesAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Trash2, Edit2, Save, X, Lock, Unlock } from 'lucide-react'

interface NotesPanelProps {
  sessionId: string
}

export function NotesPanel({ sessionId }: NotesPanelProps) {
  const queryClient = useQueryClient()
  const [newNote, setNewNote] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data: notes, isLoading } = useQuery(
    ['notes', sessionId],
    () => notesAPI.getAll(sessionId),
    { enabled: !!sessionId }
  )

  const createMutation = useMutation(
    () => notesAPI.create(sessionId, { content: newNote, is_private: isPrivate }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notes', sessionId])
        setNewNote('')
      }
    }
  )

  const updateMutation = useMutation(
    ({ noteId, content }: { noteId: string; content: string }) =>
      notesAPI.update(sessionId, noteId, { content }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notes', sessionId])
        setEditingNote(null)
        setEditContent('')
      }
    }
  )

  const deleteMutation = useMutation(
    (noteId: string) => notesAPI.delete(sessionId, noteId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notes', sessionId])
      }
    }
  )

  const handleStartEdit = (note: any) => {
    setEditingNote(note._id)
    setEditContent(note.content)
  }

  const handleSaveEdit = (noteId: string) => {
    if (editContent.trim()) {
      updateMutation.mutate({ noteId, content: editContent })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* New Note Form */}
      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Notes
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Take a note about this session..."
              className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="note_private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="note_private" className="text-sm text-gray-300 flex items-center cursor-pointer">
                  {isPrivate ? (
                    <><Lock className="h-3 w-3 mr-1" /> Private</>
                  ) : (
                    <><Unlock className="h-3 w-3 mr-1" /> Public</>
                  )}
                </Label>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newNote.trim() || createMutation.isLoading}
                size="sm"
              >
                {createMutation.isLoading ? 'Saving...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-500 text-center py-4">Loading notes...</p>
          ) : !notes?.data || notes.data.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No notes yet. Start taking notes above!</p>
          ) : (
            notes.data.map((note: any) => (
              <Card key={note._id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  {editingNote === note._id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNote(null)
                            setEditContent('')
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note._id)}
                          disabled={updateMutation.isLoading}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatDate(note.created_at)}</span>
                          {note.is_private && (
                            <span className="flex items-center">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </span>
                          )}
                          {note.updated_at && (
                            <span>(edited)</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => handleStartEdit(note)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-400"
                            onClick={() => deleteMutation.mutate(note._id)}
                            disabled={deleteMutation.isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
