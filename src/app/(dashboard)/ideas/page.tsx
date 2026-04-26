import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeedClient } from '@/components/shared/feed-client'

export default async function IdeasPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const { data: rawIdeas } = await supabase
    .from('ideas')
    .select('id, user_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const authorIds = [...new Set((rawIdeas ?? []).map(i => i.user_id))]
  const { data: authors } = authorIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', authorIds)
    : { data: [] }
  const authorMap = Object.fromEntries((authors ?? []).map(u => [u.id, u]))

  const ideas = (rawIdeas ?? []).map(i => ({
    ...i,
    users: authorMap[i.user_id] ?? null,
  }))

  return (
    <DashboardShell title="Ideas Channel">
      <FeedClient
        items={ideas}
        currentUserId={user?.id ?? ''}
        type="idea"
        placeholder="Share a new idea with the team..."
        emptyText="No ideas yet — share your first one!"
      />
    </DashboardShell>
  )
}
