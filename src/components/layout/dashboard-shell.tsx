'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardShellProps {
  children: React.ReactNode
  title?: string
}

export function DashboardShell({ children, title = 'Dashboard' }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
