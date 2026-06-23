'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from 'react-query'
import { sessionsAPI } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSessionModal({ isOpen, onClose }: CreateSessionModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showRules, setShowRules] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    description: '',
    session_type: 'debate',
    visibility: 'public',
    category: '',
    tags: [] as string[],
  })
  const [rules, setRules] = useState({
    max_speaking_time: 300,
    warning_time: 30,
    allow_interruptions: false,
    allow_rebuttal: true,
    allow_challenge: false,
    challenge_time: 60,
    auto_mute_on_expiry: true,
    extension_allowed: true,
    max_extensions: 1,
    extension_time: 60,
    rounds: 3,
    time_per_round: 600,
    consensus_threshold: 0.66,
    violation_thresholds: {
      interruption: 3,
      time_exceeded: 2,
      rule_break: 2,
    },
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const createMutation = useMutation(
    (data: any) => sessionsAPI.create(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('mySessions')
        queryClient.invalidateQueries('publicSessions')
        onClose()
        const createdId = response.data?.id ?? response.data?._id
        if (createdId) {
          router.push(`/sessions/${createdId}`)
        }
      },
      onError: (error: any) => {
        const msg = error.response?.data?.detail || 'Failed to create session'
        setValidationError(Array.isArray(msg) ? msg[0].msg : msg)
      }
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (formData.title.length < 5) {
      setValidationError('Title must be at least 5 characters long')
      return
    }
    if (formData.topic.length < 5) {
      setValidationError('Topic must be at least 5 characters long')
      return
    }

    createMutation.mutate({ ...formData, rules })
  }

  const isDebate = formData.session_type === 'debate'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Set up a structured debate or roundtable discussion
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-muted-foreground text-xs">(min 5 chars)</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                if (validationError) setValidationError(null)
              }}
              placeholder="e.g., The Future of AI in Education"
              className="h-11"
              minLength={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic <span className="text-muted-foreground text-xs">(min 5 chars)</span></Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => {
                setFormData({ ...formData, topic: e.target.value })
                if (validationError) setValidationError(null)
              }}
              placeholder="e.g., Should AI replace traditional teaching methods?"
              className="h-11"
              minLength={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the scope and goals of this session..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Session Type</Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => setFormData({ ...formData, session_type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debate">Debate</SelectItem>
                  <SelectItem value="roundtable">Roundtable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Technology, Politics, Philosophy"
              className="h-11"
            />
          </div>

          {/* Rule Configuration */}
          <div className="border border-border rounded-lg">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground hover:bg-accent/50 rounded-lg transition-colors"
              onClick={() => setShowRules(!showRules)}
            >
              <span>Rule Configuration</span>
              {showRules ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showRules && (
              <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                {/* Speaking Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_speaking_time">Speaking Time (seconds)</Label>
                    <Input
                      id="max_speaking_time"
                      type="number"
                      min={30}
                      max={1800}
                      value={rules.max_speaking_time}
                      onChange={(e) => setRules({ ...rules, max_speaking_time: parseInt(e.target.value) || 300 })}
                      className=""
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning_time">Warning Time (seconds)</Label>
                    <Input
                      id="warning_time"
                      type="number"
                      min={5}
                      max={120}
                      value={rules.warning_time}
                      onChange={(e) => setRules({ ...rules, warning_time: parseInt(e.target.value) || 30 })}
                      className=""
                    />
                  </div>
                </div>

                {/* Debate-specific */}
                {isDebate && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rounds">Rounds</Label>
                      <Input
                        id="rounds"
                        type="number"
                        min={1}
                        max={10}
                        value={rules.rounds}
                        onChange={(e) => setRules({ ...rules, rounds: parseInt(e.target.value) || 3 })}
                        className=""
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time_per_round">Time per Round (seconds)</Label>
                      <Input
                        id="time_per_round"
                        type="number"
                        min={60}
                        max={3600}
                        value={rules.time_per_round}
                        onChange={(e) => setRules({ ...rules, time_per_round: parseInt(e.target.value) || 600 })}
                        className=""
                      />
                    </div>
                  </div>
                )}

                {/* Roundtable-specific */}
                {!isDebate && (
                  <div className="space-y-2">
                    <Label htmlFor="consensus_threshold">Consensus Threshold</Label>
                    <Input
                      id="consensus_threshold"
                      type="number"
                      min={0.5}
                      max={1.0}
                      step={0.01}
                      value={rules.consensus_threshold}
                      onChange={(e) => setRules({ ...rules, consensus_threshold: parseFloat(e.target.value) || 0.66 })}
                      className=""
                    />
                  </div>
                )}

                {/* Toggle Rules */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto_mute" className="text-sm">Auto-mute on time expiry</Label>
                    <Switch
                      id="auto_mute"
                      checked={rules.auto_mute_on_expiry}
                      onCheckedChange={(checked) => setRules({ ...rules, auto_mute_on_expiry: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow_interruptions" className="text-sm">Allow interruptions</Label>
                    <Switch
                      id="allow_interruptions"
                      checked={rules.allow_interruptions}
                      onCheckedChange={(checked) => setRules({ ...rules, allow_interruptions: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow_rebuttal" className="text-sm">Allow rebuttals</Label>
                    <Switch
                      id="allow_rebuttal"
                      checked={rules.allow_rebuttal}
                      onCheckedChange={(checked) => setRules({ ...rules, allow_rebuttal: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow_challenge" className="text-sm">Allow challenges</Label>
                    <Switch
                      id="allow_challenge"
                      checked={rules.allow_challenge}
                      onCheckedChange={(checked) => setRules({ ...rules, allow_challenge: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="extension_allowed" className="text-sm">Allow time extensions</Label>
                    <Switch
                      id="extension_allowed"
                      checked={rules.extension_allowed}
                      onCheckedChange={(checked) => setRules({ ...rules, extension_allowed: checked })}
                    />
                  </div>
                </div>

                {/* Extension Settings */}
                {rules.extension_allowed && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_extensions">Max Extensions</Label>
                      <Input
                        id="max_extensions"
                        type="number"
                        min={0}
                        max={5}
                        value={rules.max_extensions}
                        onChange={(e) => setRules({ ...rules, max_extensions: parseInt(e.target.value) || 1 })}
                        className=""
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extension_time">Extension Time (seconds)</Label>
                      <Input
                        id="extension_time"
                        type="number"
                        min={15}
                        max={300}
                        value={rules.extension_time}
                        onChange={(e) => setRules({ ...rules, extension_time: parseInt(e.target.value) || 60 })}
                        className=""
                      />
                    </div>
                  </div>
                )}

                {/* Challenge Settings */}
                {rules.allow_challenge && (
                  <div className="space-y-2">
                    <Label htmlFor="challenge_time">Challenge Time (seconds)</Label>
                    <Input
                      id="challenge_time"
                      type="number"
                      min={15}
                      max={300}
                      value={rules.challenge_time}
                      onChange={(e) => setRules({ ...rules, challenge_time: parseInt(e.target.value) || 60 })}
                      className=""
                    />
                  </div>
                )}

                {/* Violation Thresholds */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Violation Thresholds (warnings before action)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Interruption</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={rules.violation_thresholds.interruption}
                        onChange={(e) => setRules({
                          ...rules,
                          violation_thresholds: { ...rules.violation_thresholds, interruption: parseInt(e.target.value) || 3 }
                        })}
                        className=""
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Time Exceeded</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={rules.violation_thresholds.time_exceeded}
                        onChange={(e) => setRules({
                          ...rules,
                          violation_thresholds: { ...rules.violation_thresholds, time_exceeded: parseInt(e.target.value) || 2 }
                        })}
                        className=""
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Rule Break</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={rules.violation_thresholds.rule_break}
                        onChange={(e) => setRules({
                          ...rules,
                          violation_thresholds: { ...rules.violation_thresholds, rule_break: parseInt(e.target.value) || 2 }
                        })}
                        className=""
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
