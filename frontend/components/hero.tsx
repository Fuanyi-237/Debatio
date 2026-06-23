'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassButton } from '@/components/ui/glass-button'
import { 
  ArrowRight, 
  MessageCircle, 
  Users, 
  Scale, 
  Sparkles, 
  Mic,
  Target,
  Zap,
  ChevronRight
} from 'lucide-react'
import { memo } from 'react'

// Floating debate element component for background
const FloatingElement = memo(function FloatingElement({
  icon: Icon,
  className,
  delay = 0,
}: {
  icon: React.ElementType
  className: string
  delay?: number
}) {
  return (
    <div
      className={`absolute glass-card p-4 rounded-2xl animate-float ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="w-6 h-6 text-white/80" />
    </div>
  )
})

// Animated stat card
const StatCard = memo(function StatCard({
  value,
  label,
  delay = 0,
}: {
  value: string
  label: string
  delay?: number
}) {
  return (
    <div 
      className="glass-card rounded-2xl p-6 text-center animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-sm text-white/50 mt-1">{label}</div>
    </div>
  )
})

// Feature card with glassmorphism
const FeatureCard = memo(function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: string
  delay?: number
}) {
  return (
    <div
      className="group glass-card rounded-2xl p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={`p-3 rounded-xl w-fit mb-4 ${color} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  )
})

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Animated background gradient mesh */}
      <div className="absolute inset-0 gradient-mesh" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-debate-accent/20 rounded-full blur-[100px] animate-pulse-slow animation-delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-debate-pro/10 rounded-full blur-[80px] animate-pulse-slow animation-delay-2000" />

      {/* Floating debate elements */}
      <FloatingElement 
        icon={Mic} 
        className="top-20 left-[10%] hidden lg:block" 
        delay={0}
      />
      <FloatingElement 
        icon={Target} 
        className="top-40 right-[15%] hidden lg:block" 
        delay={500}
      />
      <FloatingElement 
        icon={Zap} 
        className="bottom-40 left-[8%] hidden lg:block" 
        delay={1000}
      />
      <FloatingElement 
        icon={Scale} 
        className="bottom-32 right-[12%] hidden lg:block" 
        delay={1500}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 rounded-full glass-card px-5 py-2 text-sm font-medium text-white/90 mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary-400" />
            <span>Where ideas meet structure</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-in animation-delay-100">
            <span className="text-gradient">Discover Truth Through</span>
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-debate-accent to-debate-pro-light bg-clip-text text-transparent">
              Structured Debate
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto animate-fade-in animation-delay-200">
            A premium platform designed for intellectual discourse. Engage in structured 
            debates with automated rule enforcement, real-time consensus tracking, and 
            professional video conferencing.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in animation-delay-300">
            <Link href="/register">
              <GlassButton 
                size="lg" 
                className="text-base px-8 h-14 bg-primary-600 hover:bg-primary-500 hover:shadow-glow-primary group"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </GlassButton>
            </Link>
            <Link href="/discover">
              <GlassButton 
                size="lg" 
                variant="outline"
                className="text-base px-8 h-14 group"
              >
                Browse Sessions
                <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </GlassButton>
            </Link>
          </div>

          {/* Stats grid */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <StatCard value="1K+" label="Active Debates" delay={400} />
            <StatCard value="5K+" label="Participants" delay={500} />
            <StatCard value="89%" label="Consensus Rate" delay={600} />
          </div>
        </div>

        {/* Feature cards grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon={Scale}
            title="Structured Format"
            description="Predefined rules and speaking turns ensure fairness and equal participation for all debaters."
            color="bg-gradient-to-br from-primary-500 to-primary-600"
            delay={700}
          />
          <FeatureCard
            icon={MessageCircle}
            title="Argument Threading"
            description="Visual tree structure for tracking reasoning chains, rebuttals, and supporting evidence."
            color="bg-gradient-to-br from-debate-pro to-emerald-600"
            delay={800}
          />
          <FeatureCard
            icon={Users}
            title="Consensus Engine"
            description="Real-time agreement tracking that highlights common ground between opposing viewpoints."
            color="bg-gradient-to-br from-debate-accent to-violet-600"
            delay={900}
          />
        </div>

        {/* Trust indicators */}
        <div className="mt-20 text-center animate-fade-in animation-delay-1000">
          <p className="text-sm text-white/40 mb-4">Trusted by academic institutions worldwide</p>
          <div className="flex items-center justify-center gap-8 opacity-50">
            {['Harvard', 'Stanford', 'MIT', 'Oxford'].map((institution) => (
              <span key={institution} className="text-white/30 font-semibold text-lg">
                {institution}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

