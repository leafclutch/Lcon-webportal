import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { AnnouncementsClient } from '@/components/announcements/announcements-client'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const { data: raw } = await supabase
    .from('announcements')
    .select('id, title, content, created_at, created_by')
    .order('created_at', { ascending: false })

  // Resolve authors
  const creatorIds = [...new Set((raw ?? []).map(a => a.created_by))]
  const { data: authors } = creatorIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', creatorIds)
    : { data: [] }
  const authorMap = Object.fromEntries((authors ?? []).map(u => [u.id, u]))

  const announcements = (raw ?? []).map(a => ({
    ...a,
    author: authorMap[a.created_by] ?? { id: a.created_by, name: 'Unknown', avatar_url: null },
  }))

  return (
    <DashboardShell title="Announcements">
      <AnnouncementsClient
        announcements={announcements}
        canCreate={user?.permissions.includes('send_announcement') ?? false}
        currentUserId={user?.id ?? ''}
        canUpload={user?.permissions.includes('upload_attachments') ?? false}
      />
    </DashboardShell>
  )
}
