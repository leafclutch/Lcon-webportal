'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, PermissionName } from '@/types'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: PermissionName) => boolean
  hasAnyPermission: (permissions: PermissionName[]) => boolean
  clearUser: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      clearUser: () => set({ user: null, isLoading: false }),
      hasPermission: (permission) => {
        const { user } = get()
        return user?.permissions.includes(permission) ?? false
      },
      hasAnyPermission: (permissions) => {
        const { user } = get()
        if (!user) return false
        return permissions.some(p => user.permissions.includes(p))
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
