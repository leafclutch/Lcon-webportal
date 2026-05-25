import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeedClient } from '@/components/shared/feed-client'

export default async function UpdatesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const canViewAll = user?.permissions.includes('view_daily_updates') ?? false

  let query = supabase
    .from('daily_updates')
    .select('id, user_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // Members without the permission only see their own updates
  if (!canViewAll && user?.id) {
    query = query.eq('user_id', user.id)
  }

  const { data: rawUpdates } = await query

  const authorIds = [...new Set((rawUpdates ?? []).map(u => u.user_id))]
  const { data: authors } = authorIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', authorIds)
    : { data: [] }
  const authorMap = Object.fromEntries((authors ?? []).map(u => [u.id, u]))

  const updates = (rawUpdates ?? []).map(u => ({
    ...u,
    users: authorMap[u.user_id] ?? null,
  }))

  return (
    <DashboardShell title="Daily Updates">
      <FeedClient
        items={updates}
        currentUserId={user?.id ?? ''}
        type="update"
        placeholder="What did you work on today?"
        emptyText={canViewAll ? 'No updates posted yet' : 'You have not posted an update today'}
        canUpload={user?.permissions.includes('upload_attachments') ?? false}
        canViewAll={canViewAll}
      />
    </DashboardShell>
  )
}
