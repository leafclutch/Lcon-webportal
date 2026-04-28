'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  if (userId === user?.id) {
    return { success: false, error: 'Cannot delete your own account' }
  }

  // Check if the target is a pending (unapproved) user
  const { data: target } = await supabase
    .from('users')
    .select('is_approved')
    .eq('id', userId)
    .single()

  const canDeleteApproved = user?.permissions.includes('delete_user')
  const canDeletePending = user?.permissions.includes('approve_users') || user?.permissions.includes('delete_user')

  if (target?.is_approved && !canDeleteApproved) {
    return { success: false, error: 'Permission denied' }
  }
  if (!target?.is_approved && !canDeletePending) {
    return { success: false, error: 'Permission denied' }
  }

  // Also remove from auth.users so they can't sign in again
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(userId)

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

export async function resetUserPassword(userId: string, newPassword: string): Promise<ActionResult<void>> {
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_users')) {
    return { success: false, error: 'Permission denied' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { success: false, error: error.message }

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
