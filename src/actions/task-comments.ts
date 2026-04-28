'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/notifications'
import type { ActionResult } from '@/types'

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user: { id: string; name: string; avatar_url: string | null }
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return []

  const { data } = await supabase
    .from('task_comments')
    .select('id, task_id, user_id, content, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (!data?.length) return []

  const userIds = [...new Set(data.map(c => c.user_id))]
  const { data: users } = await supabase
    .from('users')
    .select('id, name, avatar_url')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))

  return data.map(c => ({
    ...c,
    user: userMap[c.user_id] ?? { id: c.user_id, name: 'Unknown', avatar_url: null },
  }))
}

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('comment_on_tasks')) {
    return { success: false, error: 'You do not have permission to comment on tasks' }
  }

  const trimmed = content.trim()
  if (!trimmed) return { success: false, error: 'Comment cannot be empty' }

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: user.id, content: trimmed })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to, assigned_by, title')
    .eq('id', taskId)
    .single()

  if (task) {
    const recipients = [...new Set([task.assigned_to, task.assigned_by])].filter(id => id !== user.id)
    await Promise.all(
      recipients.map(uid =>
        createNotification({
          user_id: uid,
          title: `New comment on "${task.title}"`,
          body: `${user.name}: "${trimmed.slice(0, 80)}"`,
          type: 'task',
          entity_type: 'task',
          entity_id: taskId,
        })
      )
    )
  }

  return { success: true, data: { id: comment.id } }
}

export async function deleteTaskComment(commentId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: comment } = await supabase
    .from('task_comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment) return { success: false, error: 'Comment not found' }
  if (comment.user_id !== user.id) return { success: false, error: 'Cannot delete this comment' }

  const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
  if (error) return { success: false, error: error.message }

  return { success: true, data: undefined }
}
