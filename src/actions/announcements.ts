'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function createAnnouncement(input: {
  title: string
  content: string
}): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('send_announcement')) {
    return { success: false, error: 'You do not have permission to send announcements' }
  }

  const { error } = await supabase.from('announcements').insert({
    ...input,
    created_by: user.id,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/announcements')
  return { success: true, data: undefined }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('send_announcement')) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/announcements')
  return { success: true, data: undefined }
}
