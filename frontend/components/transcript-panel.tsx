'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { MessageSquare, Mic, FileText } from 'lucide-react'

interface TranscriptEntry {
  type: string
  user_id: string
  username?: string
  message?: string
  argument_id?: string
  timestamp: string
}

interface TranscriptPanelProps {
  transcript: TranscriptEntry[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const entries: TranscriptEntry[] = Array.isArray(transcript) ? transcript : []
  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">Transcript will appear here once the session begins</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <TranscriptEntry key={index} entry={entry} />
        ))}
      </div>
    </ScrollArea>
  )
}

function TranscriptEntry({ entry }: { entry: TranscriptEntry }) {
  const getIcon = () => {
    switch (entry.type) {
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-blue-400" />
      case 'argument':
        return <FileText className="h-4 w-4 text-green-400" />
      case 'speaking':
        return <Mic className="h-4 w-4 text-yellow-400" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-400" />
    }
  }

  const getContent = () => {
    switch (entry.type) {
      case 'chat':
        return entry.message
      case 'argument':
        return 'Submitted an argument'
      case 'speaking':
        return 'Started speaking'
      default:
        return entry.message || 'Unknown entry'
    }
  }

  const displayName = entry.username || `User ${entry.user_id.slice(-6)}`

  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">
            {displayName}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(entry.timestamp), 'HH:mm')}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{getContent()}</p>
      </div>
    </div>
  )
}
