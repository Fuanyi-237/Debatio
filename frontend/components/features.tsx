'use client'

import { 
  CheckCircle2, 
  Shield, 
  Zap, 
  BarChart3, 
  Lock, 
  Globe, 
  Clock, 
  Users, 
  MessageSquare,
  Gavel,
  Mic2,
  Video,
  FileText
} from 'lucide-react'
import { memo } from 'react'

interface Feature {
  name: string
  description: string
  icon: React.ElementType
  gradient: string
}

const features: Feature[] = [
  {
    name: 'Structured Speaking System',
    description: 'Raised hands, moderator-controlled turns, and automatic time limits keep discussions orderly and fair.',
    icon: Mic2,
    gradient: 'from-primary-500 to-primary-600',
  },
  {
    name: 'Rule Enforcement Engine',
    description: 'Customizable debate rules that are automatically enforced by the system, eliminating moderator bias.',
    icon: Gavel,
    gradient: 'from-debate-con to-rose-600',
  },
  {
    name: 'Real-Time Transcription',
    description: 'Speech-to-text transcription creates searchable discussion logs for post-session analysis.',
    icon: FileText,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    name: 'Consensus Tracking',
    description: 'Participants vote on statements to track agreement levels and identify areas of consensus.',
    icon: BarChart3,
    gradient: 'from-debate-pro to-emerald-600',
  },
  {
    name: 'Enterprise Security',
    description: 'End-to-end encryption for video and full control over session visibility and access.',
    icon: Lock,
    gradient: 'from-debate-accent to-violet-600',
  },
  {
    name: 'Global Accessibility',
    description: 'Join debates from anywhere. Built-in language support for cross-cultural discussions.',
    icon: Globe,
    gradient: 'from-cyan-500 to-blue-600',
  },
]

// Debate rules infographic data
const debatePhases = [
  { phase: 'Opening', duration: '5 min', color: 'bg-debate-opening', description: 'Present your stance' },
  { phase: 'Argument', duration: '10 min', color: 'bg-debate-argument', description: 'Build your case' },
  { phase: 'Rebuttal', duration: '8 min', color: 'bg-debate-rebuttal', description: 'Counter opponents' },
  { phase: 'Conclusion', duration: '3 min', color: 'bg-debate-conclusion', description: 'Summarize key points' },
]

const FeatureCard = memo(function FeatureCard({ 
  feature, 
  index 
}: { 
  feature: Feature
  index: number 
}) {
  return (
    <div 
      className="group glass-card rounded-2xl p-6 hover:bg-white/[0.08] transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`p-3 rounded-xl w-fit mb-4 bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <feature.icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
    </div>
  )
})

export function Features() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-sm text-white/70 mb-6">
            <Shield className="h-4 w-4 text-primary-400" />
            <span>Built for Truth, Not Ego</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
            Professional Debate Tools
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Every feature is designed to facilitate meaningful intellectual exchange with 
            automated fairness enforcement
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <FeatureCard key={feature.name} feature={feature} index={index} />
          ))}
        </div>

        {/* Debate Rules Infographic */}
        <div className="glass-panel rounded-3xl p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left side - explanation */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm text-white/70 mb-4">
                <Clock className="h-4 w-4 text-primary-400" />
                <span>Standardized Format</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Structured Debate Flow
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Debatio enforces a structured debate format that ensures every participant 
                has equal opportunity to present their arguments. The system automatically 
                manages timing, transitions, and turn-taking.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Users className="h-4 w-4" />
                  <span>2-8 participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Clock className="h-4 w-4" />
                  <span>26 min per round</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <MessageSquare className="h-4 w-4" />
                  <span>Unlimited rounds</span>
                </div>
              </div>
            </div>

            {/* Right side - phase visualization */}
            <div className="flex-1 w-full max-w-md">
              <div className="relative">
                {/* Connection line */}
                <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-debate-opening via-debate-argument via-debate-rebuttal to-debate-conclusion opacity-30" />
                
                {/* Phase items */}
                <div className="space-y-4">
                  {debatePhases.map((phase, index) => (
                    <div 
                      key={phase.phase}
                      className="flex items-center gap-4 group"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {/* Phase indicator */}
                      <div className={`w-16 h-16 rounded-2xl ${phase.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform z-10`}>
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      
                      {/* Phase details */}
                      <div className="flex-1 glass-card rounded-xl p-4 group-hover:bg-white/[0.08] transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{phase.phase}</span>
                          <span className="text-sm text-white/50 font-mono">{phase.duration}</span>
                        </div>
                        <p className="text-sm text-white/40">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
