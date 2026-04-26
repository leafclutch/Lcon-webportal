'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
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

  const { error } = await supabase.from('warnings').insert({
    user_id: input.user_id,
    issued_by: user.id,
    reason: input.reason,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/warnings')
  return { success: true, data: undefined }
}
