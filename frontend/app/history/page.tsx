'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useAuthStore } from '@/lib/store'
import { sessionsAPI } from '@/lib/api'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { SessionCard } from '@/components/session-card'
import { Loader2, History } from 'lucide-react'

export default function HistoryPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  const { data: sessions, isLoading } = useQuery(
    'pastSessions',
    () => sessionsAPI.list({ status: 'ended' }),
    { enabled: isAuthenticated }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary-50 rounded-lg">
                <History className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
                <p className="text-gray-500">Your past debates and roundtables</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : sessions?.data?.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">No history yet</h3>
                <p className="text-sm text-gray-500">Completed sessions will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions?.data?.map((session: any) => (
                  <SessionCard key={(session as any).id ?? (session as any)._id} session={session} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
