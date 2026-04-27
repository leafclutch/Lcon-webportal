'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { updateLastActive } from '@/actions/activity'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Ping last_active_at on load and every 5 minutes while the tab is open
  useEffect(() => {
    if (!user) return
    updateLastActive()
    const timer = setInterval(() => { updateLastActive() }, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
