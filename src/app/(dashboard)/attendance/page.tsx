import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AttendanceClient } from '@/components/attendance/attendance-client'
import type { AllLog } from '@/actions/attendance'

export default async function AttendancePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const canViewAll = user?.permissions.includes('view_all_attendance') ?? false
  const canExport = user?.permissions.includes('export_attendance') ?? false

  const [{ data: logs }, { data: activeCodes }, usersResult, allLogsResult] = await Promise.all([
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
          .eq('date', new Date().toISOString().slice(0, 10))
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
      : Promise.resolve({ data: [] }),
    canViewAll
      ? supabase.from('users').select('id, name, email, avatar_url').order('name')
      : Promise.resolve({ data: [] }),
    canViewAll
      ? supabase
          .from('attendance_logs')
          .select('id, user_id, date, status, tap_in_time, tap_out_time, created_at, updated_at')
          .order('date', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <DashboardShell title="Attendance">
      <AttendanceClient
        logs={logs ?? []}
        activeCodes={activeCodes ?? []}
        allLogs={allLogsResult.data ?? []}
        allUsers={usersResult.data ?? []}
        canGenerateCode={user?.permissions.includes('generate_attendance_code') ?? false}
        canViewAll={canViewAll}
        canExport={canExport}
      />
    </DashboardShell>
  )
}
