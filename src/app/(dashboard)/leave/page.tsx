import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { LeaveClient } from '@/components/leave/leave-client'

export default async function LeavePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const canApprove = user?.permissions.includes('approve_leave') ?? false

  let query = supabase
    .from('leave_requests')
    .select('id, reason, start_date, end_date, status, approved_by, approved_at, created_at, user_id')
    .order('created_at', { ascending: false })

  if (!canApprove) query = query.eq('user_id', user?.id ?? '')

  const { data: rawRequests } = await query

  const allUserIds = [
    ...new Set([
      ...(rawRequests ?? []).map(r => r.user_id),
      ...(rawRequests ?? []).filter(r => r.approved_by).map(r => r.approved_by!),
    ])
  ]
  const { data: reqUsers } = allUserIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', allUserIds)
    : { data: [] }
  const userMap = Object.fromEntries((reqUsers ?? []).map(u => [u.id, u]))

  const requests = (rawRequests ?? []).map(r => ({
    ...r,
    user: userMap[r.user_id] ?? { id: r.user_id, name: 'Unknown', avatar_url: null },
    approver: r.approved_by ? (userMap[r.approved_by] ?? null) : null,
  }))

  return (
    <DashboardShell title="Leave Management">
      <LeaveClient requests={requests} canApprove={canApprove} currentUserId={user?.id ?? ''} />
    </DashboardShell>
  )
}
