'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function issueWarning(input: {
  user_id: string
  reason: string
}): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('issue_warning')) {
    return { success: false, error: 'You do not have permission to issue warnings' }
  }

  const { data: warning, error } = await supabase
    .from('warnings')
    .insert({ user_id: input.user_id, issued_by: user.id, reason: input.reason })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await createNotification({
    user_id: input.user_id,
    title: 'Warning issued',
    body: input.reason,
    type: 'warning',
    entity_type: 'warning',
    entity_id: warning.id,
  })

  revalidatePath('/warnings')
  return { success: true, data: undefined }
}
