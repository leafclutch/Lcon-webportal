'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function assignRole(userId: string, roleId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_users')) {
    return { success: false, error: 'Permission denied' }
  }

  const update = roleId ? { role_id: roleId } : { role_id: null as unknown as string }
  const { error } = await supabase.from('users').update(update).eq('id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}

export async function approveUser(userId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('approve_users')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_approved: true })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}

export async function rejectUser(userId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('approve_users')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_approved: false })
    .eq('id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}

export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('delete_user')) {
    return { success: false, error: 'Permission denied' }
  }
  if (userId === user.id) {
    return { success: false, error: 'Cannot delete your own account' }
  }

  // Deleting from public.users cascades to all related data.
  // The auth.users entry is orphaned — user cannot access the system
  // because getCurrentUser returns null without a public.users profile.
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}

export async function createRole(input: { name: string; description: string }): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_roles')) {
    return { success: false, error: 'Permission denied' }
  }

  const { data, error } = await supabase
    .from('roles')
    .insert(input)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/roles')
  return { success: true, data: { id: data.id } }
}

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_roles')) {
    return { success: false, error: 'Permission denied' }
  }

  await supabase.from('role_permissions').delete().eq('role_id', roleId)

  if (permissionIds.length > 0) {
    const { error } = await supabase.from('role_permissions').insert(
      permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }))
    )
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/admin/roles')
  return { success: true, data: undefined }
}

export async function deleteRole(roleId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_roles')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('roles').delete().eq('id', roleId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/roles')
  return { success: true, data: undefined }
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatar_url?: string }
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  if (userId !== user.id && !user.permissions.includes('manage_users')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('users').update(data).eq('id', userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}
