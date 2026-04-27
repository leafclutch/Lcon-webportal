'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function createTodo(input: {
  title: string
  description?: string
  user_id: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Can only create todo for others if has view_all_todos permission
  if (input.user_id !== user.id && !user.permissions.includes('view_all_todos')) {
    return { success: false, error: 'Permission denied' }
  }

  const { data: todo, error } = await supabase.from('todos').insert({
    ...input,
    created_by: user.id,
    status: 'pending',
  }).select('id').single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/todos')
  return { success: true, data: { id: todo.id } }
}

export async function updateTodoStatus(
  todoId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: todo } = await supabase.from('todos').select('user_id').eq('id', todoId).single()
  if (!todo) return { success: false, error: 'Todo not found' }
  if (todo.user_id !== user.id && !user.permissions.includes('view_all_todos')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('todos').update({ status }).eq('id', todoId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/todos')
  return { success: true, data: undefined }
}

export async function deleteTodo(todoId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: todo } = await supabase.from('todos').select('user_id').eq('id', todoId).single()
  if (!todo) return { success: false, error: 'Not found' }
  if (todo.user_id !== user.id && !user.permissions.includes('view_all_todos')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('todos').delete().eq('id', todoId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/todos')
  return { success: true, data: undefined }
}

export async function uploadTodoAttachment(todoId: string, file: FormData): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const fileData = file.get('file') as File
  if (!fileData) return { success: false, error: 'No file provided' }

  const ext = fileData.name.split('.').pop()
  const path = `todo-attachments/${user.id}/${todoId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, fileData, { upsert: true })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)

  await supabase.from('todos').update({ attachment_url: publicUrl }).eq('id', todoId)

  revalidatePath('/todos')
  return { success: true, data: { url: publicUrl } }
}
