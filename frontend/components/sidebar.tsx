'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Compass, History, Settings, Users } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Discover', href: '/discover', icon: Compass },
  { name: 'My Sessions', href: '/my-sessions', icon: Users },
  { name: 'History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)] hidden md:flex md:flex-col">
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary-600' : 'text-gray-400')} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="rounded-xl bg-gradient-to-br from-primary-50 to-indigo-50 p-4">
          <p className="text-sm font-medium text-gray-900">Start a debate</p>
          <p className="text-xs text-gray-500 mt-1">Create a session and invite others</p>
        </div>
      </div>
    </aside>
  )
}
