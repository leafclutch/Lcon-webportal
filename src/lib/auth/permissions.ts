import type { PermissionName, AuthUser } from '@/types'
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role_id, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  let role: { id: string; name: string } | null = null
  if (profile.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, name')
      .eq('id', profile.role_id)
      .single()
    role = roleData
  }

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

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role,
    permissions,
    avatar_url: profile.avatar_url,
  }
}

export function hasPermission(user: AuthUser | null, permission: PermissionName): boolean {
  if (!user) return false
  return user.permissions.includes(permission)
}

export function hasAnyPermission(user: AuthUser | null, permissions: PermissionName[]): boolean {
  if (!user) return false
  return permissions.some(p => user.permissions.includes(p))
}
