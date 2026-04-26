import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { WarningsClient } from '@/components/warnings/warnings-client'

export default async function WarningsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const canIssue = user?.permissions.includes('issue_warning') ?? false

  const [{ data: rawWarnings }, { data: allTeam }] = await Promise.all([
    supabase.from('warnings').select('id, user_id, issued_by, reason, created_at').order('created_at', { ascending: false }),
    canIssue ? supabase.from('users').select('id, name, avatar_url').neq('id', user?.id ?? '').order('name') : { data: [] },
  ])

  const warnUserIds = [...new Set([
    ...(rawWarnings ?? []).map(w => w.user_id),
    ...(rawWarnings ?? []).map(w => w.issued_by),
  ])]
  const { data: warnUsers } = warnUserIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', warnUserIds)
    : { data: [] }
  const warnUserMap = Object.fromEntries((warnUsers ?? []).map(u => [u.id, u]))

  const warnings = (rawWarnings ?? []).map(w => ({
    ...w,
    user: warnUserMap[w.user_id] ?? { id: w.user_id, name: 'Unknown', avatar_url: null },
    issuer: warnUserMap[w.issued_by] ?? { id: w.issued_by, name: 'Unknown', avatar_url: null },
  }))

  return (
    <DashboardShell title="Warnings">
      <WarningsClient warnings={warnings} users={allTeam ?? []} canIssue={canIssue} currentUserId={user?.id ?? ''} />
    </DashboardShell>
  )
}
