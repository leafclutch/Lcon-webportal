import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AttendanceClient } from '@/components/attendance/attendance-client'
import { getAllAttendanceLogs } from '@/actions/attendance'

export default async function AttendancePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const canViewAll = user?.permissions.includes('view_all_attendance') ?? false
  const canExport = user?.permissions.includes('export_attendance') ?? false
  const canRemote = user?.permissions.includes('use_remote_attendance') ?? false
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: logs }, { data: activeCodes }, usersResult, allLogs, { data: todayBreaks }, { data: activeBreaks }, { data: allPersonalBreaks }] = await Promise.all([
    supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user?.id ?? '')
      .order('date', { ascending: false })
      .limit(60),
    user?.permissions.includes('generate_attendance_code')
      ? supabase
          .from('attendance_codes')
          .select('*')
          .eq('date', today)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
      : Promise.resolve({ data: [] }),
    canViewAll
      ? supabase.from('users').select('id, name, email, avatar_url').order('name')
      : Promise.resolve({ data: [] }),
    canViewAll
      ? getAllAttendanceLogs()
      : Promise.resolve([]),
    supabase
      .from('attendance_breaks')
      .select('*')
      .eq('user_id', user?.id ?? '')
      .gte('start_time', today + 'T00:00:00')
      .order('start_time', { ascending: true }),
    canViewAll
      ? supabase
          .from('attendance_breaks')
          .select('user_id')
          .is('end_time', null)
          .gte('start_time', today + 'T00:00:00')
      : Promise.resolve({ data: [] }),
    supabase
      .from('attendance_breaks')
      .select('*')
      .eq('user_id', user?.id ?? '')
      .order('start_time', { ascending: true }),
  ])

  return (
    <DashboardShell title="Attendance">
      <AttendanceClient
        logs={logs ?? []}
        activeCodes={activeCodes ?? []}
        allLogs={Array.isArray(allLogs) ? allLogs : []}
        allUsers={usersResult.data ?? []}
        canGenerateCode={user?.permissions.includes('generate_attendance_code') ?? false}
        canViewAll={canViewAll}
        canExport={canExport}
        canRemote={canRemote}
        todayBreaks={todayBreaks ?? []}
        activeBreaks={activeBreaks ?? []}
        allPersonalBreaks={allPersonalBreaks ?? []}
      />
    </DashboardShell>
  )
}
