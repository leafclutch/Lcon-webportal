'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import type { PermissionName } from '@/types'

export function useAuth() {
  const { user, isLoading, setUser, setLoading, clearUser, hasPermission, hasAnyPermission } =
    useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    const fetchUser = async (userId: string) => {
      const { data: profile } = await supabase
        .from('users')
        .select('id, name, email, role_id, avatar_url')
        .eq('id', userId)
        .single()

      if (!profile) { clearUser(); return }

      // Fetch role
      let role: { id: string; name: string } | null = null
      if (profile.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id, name')
          .eq('id', profile.role_id)
          .single()
        role = roleData
      }

      // Fetch permissions via role_id
      let permissions: PermissionName[] = []
      if (profile.role_id) {
        const { data: rp } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', profile.role_id)

        if (rp && rp.length > 0) {
          const permIds = rp.map(r => r.permission_id)
          const { data: perms } = await supabase
            .from('permissions')
            .select('name')
            .in('id', permIds)
          permissions = (perms ?? []).map(p => p.name as PermissionName)
        }
      }

      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role,
        permissions,
        avatar_url: profile.avatar_url,
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUser(session.user.id)
      else clearUser()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUser(session.user.id)
      else clearUser()
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, isLoading, hasPermission, hasAnyPermission }
}

export function usePermission(permission: PermissionName) {
  const { hasPermission } = useAuthStore()
  return hasPermission(permission)
}
