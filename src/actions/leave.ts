'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function applyForLeave(input: {
  reason: string
  start_date: string
  end_date: string
}): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  if (new Date(input.start_date) > new Date(input.end_date)) {
    return { success: false, error: 'Start date must be before end date' }
  }

  const { error } = await supabase.from('leave_requests').insert({
    ...input,
    user_id: user.id,
    status: 'pending',
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/leave')
  return { success: true, data: undefined }
}

export async function reviewLeaveRequest(
  leaveId: string,
  status: 'approved' | 'rejected'
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('approve_leave')) {
    return { success: false, error: 'You do not have permission to approve leave requests' }
  }

  const { error } = await supabase.from('leave_requests').update({
    status,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).eq('id', leaveId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/leave')
  return { success: true, data: undefined }
}
