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

export async function markAttendance(code: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

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

export async function getAllAttendanceLogs(filters?: {
  userId?: string
  startDate?: string
  endDate?: string
  status?: string
}) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('view_all_attendance')) return []

  let query = supabase
    .from('attendance_logs')
    .select('*, users(id, name, email, avatar_url)')
    .order('date', { ascending: false })

  type Status = 'present' | 'late' | 'absent' | 'half_day'

  if (filters?.userId) query = query.eq('user_id', filters.userId)
  if (filters?.startDate) query = query.gte('date', filters.startDate)
  if (filters?.endDate) query = query.lte('date', filters.endDate)
  if (filters?.status) query = query.eq('status', filters.status as Status)

  // Cast via unknown — the join is valid at runtime but the SDK types lack the relationship mapping
  const { data } = await query.limit(200)
  const logs = (data ?? []) as unknown as AllLog[]

  if (logs.length === 0) return logs

  const logIds = logs.map(l => l.id)
  const { data: breaks } = await supabase
    .from('attendance_breaks')
    .select('id, log_id, start_time, end_time')
    .in('log_id', logIds)

  const breakMap = (breaks ?? []).reduce<Record<string, AllLogBreak[]>>((acc, b) => {
    if (!acc[b.log_id]) acc[b.log_id] = []
    acc[b.log_id].push(b)
    return acc
  }, {})

  return logs.map(l => ({ ...l, breaks: breakMap[l.id] ?? [] }))
}

export interface AllLogBreak {
  id: string; log_id: string; start_time: string; end_time: string | null
}

export interface AllLog {
  id: string; user_id: string; date: string; status: string; type: string;
  tap_in_time: string | null; tap_out_time: string | null;
  created_at: string; updated_at: string;
  breaks: AllLogBreak[];
  users?: { id: string; name: string; email: string; avatar_url: string | null } | null
}

export async function clockIn(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('use_remote_attendance')) {
    return { success: false, error: 'You do not have permission for remote attendance' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { data: existingLog } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existingLog?.tap_in_time) return { success: false, error: 'Already clocked in today' }

  const hour = new Date().getHours()
  const status = hour >= 9 ? 'late' : 'present'

  if (existingLog) {
    await supabase
      .from('attendance_logs')
      .update({ tap_in_time: now, status, type: 'remote' })
      .eq('id', existingLog.id)
  } else {
    await supabase.from('attendance_logs').insert({
      user_id: user.id,
      tap_in_time: now,
      date: today,
      status,
      type: 'remote',
    })
  }

  revalidatePath('/attendance')
  return { success: true, data: undefined }
}

export async function clockOut(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('use_remote_attendance')) {
    return { success: false, error: 'You do not have permission for remote attendance' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { data: existingLog } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (!existingLog?.tap_in_time) {
    return { success: false, error: 'Must clock in before clocking out' }
  }
  if (existingLog?.tap_out_time) {
    return { success: false, error: 'Already clocked out today' }
  }

  await supabase
    .from('attendance_logs')
    .update({ tap_out_time: now })
    .eq('id', existingLog.id)

  revalidatePath('/attendance')
  return { success: true, data: undefined }
}

export async function startBreak(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const today = new Date().toISOString().slice(0, 10)

  const { data: log } = await supabase
    .from('attendance_logs')
    .select('id, tap_in_time, tap_out_time')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (!log?.tap_in_time) return { success: false, error: 'Must clock in first' }
  if (log.tap_out_time) return { success: false, error: 'Already clocked out' }

  const { data: openBreak } = await supabase
    .from('attendance_breaks')
    .select('id')
    .eq('user_id', user.id)
    .eq('log_id', log.id)
    .is('end_time', null)
    .single()

  if (openBreak) return { success: false, error: 'Already on break' }

  const { error } = await supabase.from('attendance_breaks').insert({
    log_id: log.id,
    user_id: user.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/attendance')
  return { success: true, data: undefined }
}

export async function endBreak(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const today = new Date().toISOString().slice(0, 10)

  const { data: log } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (!log) return { success: false, error: 'No attendance log found' }

  const { data: openBreak } = await supabase
    .from('attendance_breaks')
    .select('id')
    .eq('user_id', user.id)
    .eq('log_id', log.id)
    .is('end_time', null)
    .single()

  if (!openBreak) return { success: false, error: 'Not on break' }

  const { error } = await supabase
    .from('attendance_breaks')
    .update({ end_time: new Date().toISOString() })
    .eq('id', openBreak.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/attendance')
  return { success: true, data: undefined }
}

export async function exportAttendanceCsv(filters?: {
  userId?: string
  startDate?: string
  endDate?: string
  status?: string
}): Promise<ActionResult<{ csv: string; filename: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user?.permissions.includes('export_attendance')) {
    return { success: false, error: 'Permission denied' }
  }

  type Status = 'present' | 'late' | 'absent' | 'half_day'
  let query = supabase
    .from('attendance_logs')
    .select('id, date, status, type, tap_in_time, tap_out_time, user_id')
    .order('date', { ascending: false })

  if (filters?.userId) query = query.eq('user_id', filters.userId)
  if (filters?.startDate) query = query.gte('date', filters.startDate)
  if (filters?.endDate) query = query.lte('date', filters.endDate)
  if (filters?.status) query = query.eq('status', filters.status as Status)

  const { data: logs, error } = await query.limit(2000)
  if (error) return { success: false, error: error.message }

  const rows = logs ?? []

  // Fetch user names separately to avoid join type issues
  const userIds = [...new Set(rows.map(l => l.user_id))]
  const userMap: Record<string, { name: string; email: string }> = {}
  if (userIds.length) {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds)
    for (const u of usersData ?? []) userMap[u.id] = u
  }

  // Fetch breaks for all logs
  const logIds = rows.map(l => l.id)
  const breakMap: Record<string, { start_time: string; end_time: string | null }[]> = {}
  if (logIds.length) {
    const { data: breaksData } = await supabase
      .from('attendance_breaks')
      .select('log_id, start_time, end_time')
      .in('log_id', logIds)
    for (const b of breaksData ?? []) {
      if (!breakMap[b.log_id]) breakMap[b.log_id] = []
      breakMap[b.log_id].push(b)
    }
  }

  const fmtDuration = (ms: number) => {
    const total = Math.floor(Math.max(0, ms) / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const headers = ['Date', 'Name', 'Email', 'Tap In', 'Tap Out', 'Working Hours', 'Break Hours', 'Type', 'Status']

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`

  const csvRows = rows.map(log => {
    const u = userMap[log.user_id]
    const logBreaks = breakMap[log.id] ?? []
    const breakMs = logBreaks.reduce((sum, b) => {
      if (!b.end_time) return sum
      return sum + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime())
    }, 0)
    const workingHrs = log.tap_in_time && log.tap_out_time
      ? fmtDuration(new Date(log.tap_out_time).getTime() - new Date(log.tap_in_time).getTime() - breakMs)
      : ''
    const breakHrs = logBreaks.some(b => b.end_time) ? fmtDuration(breakMs) : ''
    return [
      log.date,
      u?.name ?? '',
      u?.email ?? '',
      log.tap_in_time ? new Date(log.tap_in_time).toLocaleTimeString() : '',
      log.tap_out_time ? new Date(log.tap_out_time).toLocaleTimeString() : '',
      workingHrs,
      breakHrs,
      log.type ?? '',
      log.status,
    ].map(escape).join(',')
  })

  const csv = [headers.map(escape).join(','), ...csvRows].join('\n')
  const start = filters?.startDate ?? 'all'
  const end = filters?.endDate ?? 'all'
  const filename = `LCON - Attendance _${start}_to_${end}.csv`

  return { success: true, data: { csv, filename } }
}
