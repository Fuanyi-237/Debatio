'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'react-query'
import { useAuthStore } from '@/lib/store'
import { sessionsAPI } from '@/lib/api'
import { Navbar } from '@/components/navbar'
import { Sidebar } from '@/components/sidebar'
import { SessionCard } from '@/components/session-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, Compass, X } from 'lucide-react'

export default function DiscoverPage() {
  const router = useRouter()
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [_hasHydrated, isAuthenticated, router])

  const { data: sessions, isLoading } = useQuery(
    ['discover-sessions', search, category, type],
    () => sessionsAPI.list({
      visibility: 'public',
      search: search || undefined,
      category: category !== 'all' ? category : undefined,
      session_type: type !== 'all' ? type : undefined,
    }),
    {
      enabled: isAuthenticated,
      staleTime: 30000, // Cache for 30 seconds
      cacheTime: 60000, // Keep in cache for 1 minute
    }
  )

  const hasFilters = search !== '' || category !== 'all' || type !== 'all'

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setType('all')
  }

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
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Compass className="h-5 w-5 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Discover Sessions</h1>
              </div>
              <p className="text-gray-500 ml-12">Find and join public debates and roundtables</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by title, topic, or tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 text-gray-900"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-40 h-11">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="debate">Debates</SelectItem>
                      <SelectItem value="roundtable">Roundtables</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-40 h-11">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Politics">Politics</SelectItem>
                      <SelectItem value="Philosophy">Philosophy</SelectItem>
                      <SelectItem value="Religion">Religion</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Ethics">Ethics</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-11 text-gray-500">
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : sessions?.data?.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">No sessions found</h3>
                <p className="text-sm text-gray-500 mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions?.data?.map((session: any) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
