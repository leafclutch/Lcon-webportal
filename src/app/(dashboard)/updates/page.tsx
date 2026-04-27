import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeedClient } from '@/components/shared/feed-client'

export default async function UpdatesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const { data: rawUpdates } = await supabase
    .from('daily_updates')
    .select('id, user_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

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
        emptyText="No updates posted today"
        canUpload={user?.permissions.includes('upload_attachments') ?? false}
      />
    </DashboardShell>
  )
}
