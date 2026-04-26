'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { generateCode } from '@/lib/utils'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function generateAttendanceCode(
  type: 'tap_in' | 'tap_out',
  expiryMinutes: number = 15
): Promise<ActionResult<{ code: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('generate_attendance_code')) {
    return { success: false, error: 'You do not have permission to generate attendance codes' }
  }

  // Deactivate previous active code of same type for today
  await supabase
    .from('attendance_codes')
    .update({ is_active: false })
    .eq('type', type)
    .eq('date', new Date().toISOString().slice(0, 10))
    .eq('is_active', true)

  const code = generateCode(6)
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()

  const { error } = await supabase.from('attendance_codes').insert({
    code,
    type,
    created_by: user.id,
    expires_at: expiresAt,
    date: new Date().toISOString().slice(0, 10),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/attendance')
  return { success: true, data: { code } }
}

export async function markAttendance(
  code: string
): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Validate code
  const { data: attendanceCode } = await supabase
    .from('attendance_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!attendanceCode) return { success: false, error: 'Invalid or expired code' }

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { data: existingLog } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (attendanceCode.type === 'tap_in') {
    if (existingLog?.tap_in_time) return { success: false, error: 'Already tapped in today' }

    const hour = new Date().getHours()
    const status = hour >= 9 ? 'late' : 'present'

    if (existingLog) {
      await supabase.from('attendance_logs').update({ tap_in_time: now, status }).eq('id', existingLog.id)
    } else {
      await supabase.from('attendance_logs').insert({ user_id: user.id, tap_in_time: now, date: today, status })
    }
  } else {
    if (!existingLog?.tap_in_time) return { success: false, error: 'Must tap in before tapping out' }
    if (existingLog?.tap_out_time) return { success: false, error: 'Already tapped out today' }

    await supabase.from('attendance_logs').update({ tap_out_time: now }).eq('id', existingLog.id)
  }

  revalidatePath('/attendance')
  return { success: true, data: undefined }
}

export async function getAttendanceLogs(userId?: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return []

  const targetId = userId && user.permissions.includes('view_all_attendance') ? userId : user.id

  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', targetId)
    .order('date', { ascending: false })
    .limit(60)

  return data ?? []
}

export async function getAllAttendanceLogs(date?: string) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('view_all_attendance')) return []

  let query = supabase
    .from('attendance_logs')
    .select('*, users(name, email, avatar_url)')
    .order('date', { ascending: false })

  if (date) query = query.eq('date', date)

  const { data } = await query.limit(100)
  return data ?? []
}
