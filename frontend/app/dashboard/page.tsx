'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useAuthStore } from '@/lib/store'
import { sessionsAPI } from '@/lib/api'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { SessionCard } from '@/components/session-card'
import { CreateSessionModal } from '@/components/create-session-modal'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Scale, Users, Radio, Calendar } from 'lucide-react'
import { useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery(
    'mySessions',
    () => sessionsAPI.mySessions(),
    {
      enabled: isAuthenticated,
      staleTime: 30000,
      cacheTime: 60000,
    }
  )

  const { data: publicSessions, isLoading: publicSessionsLoading } = useQuery(
    'publicSessions',
    () => sessionsAPI.list({ visibility: 'public', status: 'live' }),
    {
      enabled: isAuthenticated,
      staleTime: 30000,
      cacheTime: 60000,
    }
  )

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const mySessionsCount = mySessions?.data?.length || 0
  const liveCount = publicSessions?.data?.length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">
                  Welcome back, {user?.full_name || user?.username}
                </p>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Scale className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{mySessionsCount}</p>
                    <p className="text-sm text-gray-500">My Sessions</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Radio className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{liveCount}</p>
                    <p className="text-sm text-gray-500">Live Now</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Participants</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-500">Scheduled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Sessions */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Sessions</h2>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  View all
                </Button>
              </div>
              {mySessionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : mySessions?.data?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Scale className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">No sessions yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Create your first session to get started</p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Session
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mySessions?.data?.map((session: any) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>

            {/* Live Public Sessions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Live Public Sessions</h2>
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => router.push('/discover')}>
                  Browse all
                </Button>
              </div>
              {publicSessionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : publicSessions?.data?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Radio className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">No live sessions</h3>
                  <p className="text-sm text-gray-500">Check back later or create your own</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicSessions?.data?.map((session: any) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
