'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function postDailyUpdate(content: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('daily_updates').insert({ user_id: user.id, content })
  if (error) return { success: false, error: error.message }

  revalidatePath('/updates')
  return { success: true, data: undefined }
}

export async function postIdea(content: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('ideas').insert({ user_id: user.id, content })
  if (error) return { success: false, error: error.message }

  revalidatePath('/ideas')
  return { success: true, data: undefined }
}

export async function deleteUpdate(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: update } = await supabase.from('daily_updates').select('user_id').eq('id', id).single()
  if (update?.user_id !== user.id && !user.permissions.includes('manage_users')) {
    return { success: false, error: 'Permission denied' }
  }

  await supabase.from('daily_updates').delete().eq('id', id)
  revalidatePath('/updates')
  return { success: true, data: undefined }
}

export async function deleteIdea(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: idea } = await supabase.from('ideas').select('user_id').eq('id', id).single()
  if (idea?.user_id !== user.id && !user.permissions.includes('manage_users')) {
    return { success: false, error: 'Permission denied' }
  }

  await supabase.from('ideas').delete().eq('id', id)
  revalidatePath('/ideas')
  return { success: true, data: undefined }
}
