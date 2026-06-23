'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { votesAPI } from '@/lib/api'
import { useAuthStore, useSessionStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, HelpCircle, Plus, BarChart3 } from 'lucide-react'

interface ConsensusPanelProps {
  sessionId: string
}

export function ConsensusPanel({ sessionId }: ConsensusPanelProps) {
  const { user } = useAuthStore()
  const { participants } = useSessionStore()
  const participantList: any[] = Array.isArray(participants) ? participants : []
  const queryClient = useQueryClient()
  const [newStatement, setNewStatement] = useState('')
  const [showReport, setShowReport] = useState(false)

  const { data: statementsData, isLoading: statementsLoading } = useQuery(
    ['statements', sessionId],
    () => votesAPI.getStatements(sessionId)
  )

  const { data: reportData, isLoading: reportLoading } = useQuery(
    ['consensus-report', sessionId],
    () => votesAPI.getConsensusReport(sessionId)
  )

  const createMutation = useMutation(
    (statement: string) => votesAPI.proposeStatement(sessionId, statement),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['statements', sessionId])
        setNewStatement('')
      },
    }
  )

  const voteMutation = useMutation(
    ({ statementId, vote }: { statementId: string; vote: string }) =>
      votesAPI.voteStatement(sessionId, statementId, vote),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['statements', sessionId])
        queryClient.invalidateQueries(['consensus-report', sessionId])
      },
    }
  )

  const userParticipant = participantList.find((p: any) => p.user_id === user?.id)
  const canProposeStatement = userParticipant && userParticipant.role !== 'observer'

  const statements = statementsData?.data || []
  const accepted = statements.filter((s: any) => s.is_accepted)
  const pending = statements.filter((s: any) => !s.is_accepted)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Consensus Building</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowReport(!showReport)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          {showReport ? 'Hide Report' : 'View Report'}
        </Button>
      </div>

      {/* Consensus Report */}
      {showReport && reportData?.data && (
        <Card className="mb-4 bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{reportData.data.participant_count}</p>
                <p className="text-sm text-gray-400">Participants</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{reportData.data.accepted_statements}</p>
                <p className="text-sm text-gray-400">Accepted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{reportData.data.pending_statements}</p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-400">
                  {reportData.data.average_participation.toFixed(1)}
                </p>
                <p className="text-sm text-gray-400">Avg Votes/Statement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Statement Form */}
      {canProposeStatement && (
        <div className="mb-4 flex space-x-2">
          <Input
            value={newStatement}
            onChange={(e) => setNewStatement(e.target.value)}
            placeholder="Propose a statement for consensus..."
            className="flex-1 bg-gray-800 border-gray-700 text-white"
          />
          <Button
            onClick={() => newStatement.trim() && createMutation.mutate(newStatement)}
            disabled={createMutation.isLoading || !newStatement.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Propose
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Accepted Statements */}
          {accepted.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Accepted Statements ({accepted.length})
              </h3>
              <div className="space-y-3">
                {accepted.map((statement: any) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
                    userId={user?.id}
                    onVote={(vote) => voteMutation.mutate({ statementId: statement.id, vote })}
                    isAccepted
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Statements */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                Pending Statements ({pending.length})
              </h3>
              <div className="space-y-3">
                {pending.map((statement: any) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
                    userId={user?.id}
                    onVote={(vote) => voteMutation.mutate({ statementId: statement.id, vote })}
                  />
                ))}
              </div>
            </div>
          )}

          {statements.length === 0 && !statementsLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No statements proposed yet.</p>
              {canProposeStatement && (
                <p className="text-gray-400 text-sm mt-2">
                  Be the first to propose a statement for consensus!
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface StatementCardProps {
  statement: any
  userId?: string
  onVote: (vote: string) => void
  isAccepted?: boolean
}

function StatementCard({ statement, userId, onVote, isAccepted }: StatementCardProps) {
  const userVote = statement.votes?.[userId || '']
  const totalVotes = Object.keys(statement.votes || {}).length
  const agreeCount = Object.values(statement.votes || {}).filter((v: any) => v === 'agree').length
  const disagreeCount = Object.values(statement.votes || {}).filter((v: any) => v === 'disagree').length
  const unsureCount = Object.values(statement.votes || {}).filter((v: any) => v === 'unsure').length

  return (
    <Card className={`bg-gray-800 border-gray-700 ${isAccepted ? 'border-green-600' : ''}`}>
      <CardContent className="p-4">
        <p className="text-white mb-4">{statement.statement}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-700">
            {totalVotes > 0 && (
              <>
                <div
                  className="bg-green-500"
                  style={{ width: `${(agreeCount / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(disagreeCount / totalVotes) * 100}%` }}
                />
                <div
                  className="bg-gray-500"
                  style={{ width: `${(unsureCount / totalVotes) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{agreeCount} agree</span>
            <span>{disagreeCount} disagree</span>
            <span>{unsureCount} unsure</span>
          </div>
        </div>

        {/* Agreement Percentage */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">Agreement</span>
          <span className={`text-lg font-bold ${
            statement.agreement_percentage >= 66 ? 'text-green-400' :
            statement.agreement_percentage >= 40 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {statement.agreement_percentage.toFixed(1)}%
          </span>
        </div>

        {/* Vote Buttons */}
        <div className="flex space-x-2">
          <Button
            variant={userVote === 'agree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVote('agree')}
            className={`flex-1 ${userVote === 'agree' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-400'}`}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Agree
          </Button>
          <Button
            variant={userVote === 'disagree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVote('disagree')}
            className={`flex-1 ${userVote === 'disagree' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-400'}`}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Disagree
          </Button>
          <Button
            variant={userVote === 'unsure' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onVote('unsure')}
            className={`flex-1 ${userVote === 'unsure' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-600 text-gray-400'}`}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Unsure
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
