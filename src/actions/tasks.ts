'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

interface CreateTaskInput {
  title: string
  description?: string
  assigned_to: string
  deadline?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export async function createTask(input: CreateTaskInput): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('assign_task')) {
    return { success: false, error: 'You do not have permission to assign tasks' }
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...input, assigned_by: user.id, status: 'pending' })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Notify assignee if different from assigner
  if (input.assigned_to !== user.id) {
    await createNotification({
      user_id: input.assigned_to,
      title: 'New task assigned',
      body: `${user.name} assigned you: "${input.title}"`,
      type: 'task',
      entity_type: 'task',
      entity_id: task.id,
    })
  }

  revalidatePath('/tasks')
  return { success: true, data: undefined }
}

export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single()
  if (!task) return { success: false, error: 'Task not found' }

  const canUpdate =
    task.assigned_to === user.id ||
    task.assigned_by === user.id ||
    user.permissions.includes('assign_task')

  if (!canUpdate) return { success: false, error: 'Access denied' }

  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/tasks')
  return { success: true, data: undefined }
}

export async function deleteTask(taskId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('assign_task')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/tasks')
  return { success: true, data: undefined }
}
