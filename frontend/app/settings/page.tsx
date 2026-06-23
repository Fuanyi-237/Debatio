'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { Settings as SettingsIcon, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

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
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-primary-50 rounded-lg">
                <SettingsIcon className="h-5 w-5 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={user?.full_name || ''}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
