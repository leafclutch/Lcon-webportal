import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AttendanceClient } from '@/components/attendance/attendance-client'

export default async function AttendancePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const [{ data: logs }, { data: activeCodes }] = await Promise.all([
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
      : { data: [] },
  ])

  return (
    <DashboardShell title="Attendance">
      <AttendanceClient
        logs={logs ?? []}
        activeCodes={activeCodes ?? []}
        canGenerateCode={user?.permissions.includes('generate_attendance_code') ?? false}
        canViewAll={user?.permissions.includes('view_all_attendance') ?? false}
      />
    </DashboardShell>
  )
}
