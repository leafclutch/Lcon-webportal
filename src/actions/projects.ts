'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function createProject(input: {
  name: string
  description?: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('manage_projects')) {
    return { success: false, error: 'You do not have permission to create projects' }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, created_by: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  await supabase.from('project_members').insert({ project_id: data.id, user_id: user.id })
  revalidatePath('/projects')
  return { success: true, data: { id: data.id } }
}

export async function addProjectMember(projectId: string, userId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_projects')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: userId })
  if (error) return { success: false, error: error.message }

  revalidatePath('/projects')
  return { success: true, data: undefined }
}

export async function updateProjectStatus(
  projectId: string,
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_projects')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('projects').update({ status }).eq('id', projectId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/projects')
  return { success: true, data: undefined }
}
