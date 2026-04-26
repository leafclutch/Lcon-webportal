import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { MessagesClient } from '@/components/messages/messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const [{ data: users }, { data: rawMessages }] = await Promise.all([
    supabase.from('users').select('id, name, avatar_url').neq('id', user?.id ?? '').order('name'),
    supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, voice_url, is_read, created_at')
      .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const senderIds = [...new Set((rawMessages ?? []).map(m => m.sender_id))]
  const { data: senders } = senderIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', senderIds)
    : { data: [] }
  const senderMap = Object.fromEntries((senders ?? []).map(u => [u.id, u]))

  const messages = (rawMessages ?? []).map(m => ({
    ...m,
    sender: senderMap[m.sender_id] ?? { id: m.sender_id, name: 'Unknown', avatar_url: null },
  }))

  return (
    <DashboardShell title="Messages">
      <MessagesClient users={users ?? []} messages={messages} currentUserId={user?.id ?? ''} />
    </DashboardShell>
  )
}
