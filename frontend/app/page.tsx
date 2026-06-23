'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Scale, ArrowUpRight } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(222,47%,4%)]">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <footer className="relative border-t border-white/10 py-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary-500/20">
                  <Scale className="h-6 w-6 text-primary-400" />
                </div>
                <span className="text-2xl font-bold text-white">Debatio</span>
              </div>
              <p className="text-white/50 leading-relaxed max-w-md mb-6">
                A premium platform designed for intellectual discourse. Engage in structured 
                debates with automated rule enforcement and real-time consensus tracking.
              </p>
              <div className="flex gap-3">
                <GlassButton size="sm" variant="outline">
                  Contact Support
                </GlassButton>
                <GlassButton size="sm" variant="ghost">
                  Documentation
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </GlassButton>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Platform
              </h4>
              <ul className="space-y-3 text-sm">
                {['Discover Sessions', 'Host a Debate', 'How It Works', 'Pricing', 'API'].map((item) => (
                  <li key={item}>
                    <a 
                      href="#" 
                      className="text-white/50 hover:text-white transition-colors inline-flex items-center gap-1 group"
                    >
                      {item}
                      <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-3 text-sm">
                {['Privacy Policy', 'Terms of Service', 'Community Guidelines', 'Cookie Policy'].map((item) => (
                  <li key={item}>
                    <a 
                      href="#" 
                      className="text-white/50 hover:text-white transition-colors inline-flex items-center gap-1 group"
                    >
                      {item}
                      <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} Debatio. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
