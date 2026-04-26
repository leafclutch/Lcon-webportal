'use client'

import { Menu, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/avatar'

interface HeaderProps {
  onMenuToggle: () => void
  title: string
}

export function Header({ onMenuToggle, title }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <Bell size={20} />
        </button>
        {user && <Avatar name={user.name} src={user.avatar_url} size="sm" />}
      </div>
    </header>
  )
}
