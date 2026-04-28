import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { MessagesClient } from '@/components/messages/messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const [
    { data: users },
    { data: rawMessages },
    { data: rawGroups },
    { data: groupMemberships },
  ] = await Promise.all([
    supabase.from('users').select('id, name, avatar_url').neq('id', user?.id ?? '').order('name'),
    supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, voice_url, is_read, created_at')
      .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('groups').select('id, name, description, created_by, created_at'),
    supabase.from('group_members').select('group_id, user_id'),
  ])

  // Resolve message senders
  const senderIds = [...new Set((rawMessages ?? []).map(m => m.sender_id))]
  const { data: senders } = senderIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', senderIds)
    : { data: [] }
  const senderMap = Object.fromEntries((senders ?? []).map(u => [u.id, u]))

  const messageIds = (rawMessages ?? []).map(m => m.id)
  const { data: attachments } = messageIds.length
    ? await supabase.from('attachments').select('id, entity_id, type, name, url, mime_type').eq('entity_type', 'message').in('entity_id', messageIds)
    : { data: [] }

  type MsgAttachRow = { id: string; entity_id: string; type: string; name: string | null; url: string; mime_type: string | null }
  const attachmentsByMsgId: Record<string, MsgAttachRow[]> = {}
  for (const a of (attachments ?? []) as MsgAttachRow[]) {
    if (!attachmentsByMsgId[a.entity_id]) attachmentsByMsgId[a.entity_id] = []
    attachmentsByMsgId[a.entity_id]!.push(a)
  }

  const messages = (rawMessages ?? []).map(m => ({
    ...m,
    sender: senderMap[m.sender_id] ?? { id: m.sender_id, name: 'Unknown', avatar_url: null },
    attachments: attachmentsByMsgId[m.id] ?? [],
  }))

  // Groups the current user belongs to
  const myGroupIds = (groupMemberships ?? []).filter(gm => gm.user_id === user?.id).map(gm => gm.group_id)
  const myGroups = (rawGroups ?? []).filter(g => myGroupIds.includes(g.id))

  // Fetch recent group messages for all my groups
  const allUsers = [
    ...(users ?? []),
    ...(senders ?? []).filter(s => !users?.some(u => u.id === s.id)),
  ]

  const { data: rawGroupMessages } = myGroupIds.length
    ? await supabase
        .from('group_messages')
        .select('id, group_id, sender_id, content, voice_url, created_at')
        .in('group_id', myGroupIds)
        .order('created_at', { ascending: false })
        .limit(500)
    : { data: [] }

  // Fetch read receipts for those messages
  const groupMsgIds = (rawGroupMessages ?? []).map(m => m.id)
  const { data: rawReads } = groupMsgIds.length
    ? await supabase.from('group_message_reads').select('message_id, user_id').in('message_id', groupMsgIds)
    : { data: [] }

  // Fetch group message attachments
  const { data: groupAttachments } = groupMsgIds.length
    ? await supabase.from('attachments').select('id, entity_id, type, name, url, mime_type').eq('entity_type', 'group_message').in('entity_id', groupMsgIds)
    : { data: [] }

  const groupAttachmentsByMsgId: Record<string, MsgAttachRow[]> = {}
  for (const a of (groupAttachments ?? []) as MsgAttachRow[]) {
    if (!groupAttachmentsByMsgId[a.entity_id]) groupAttachmentsByMsgId[a.entity_id] = []
    groupAttachmentsByMsgId[a.entity_id]!.push(a)
  }

  // Group reads by message_id
  const readsByMsgId: Record<string, string[]> = {}
  for (const r of rawReads ?? []) {
    if (!readsByMsgId[r.message_id]) readsByMsgId[r.message_id] = []
    readsByMsgId[r.message_id].push(r.user_id)
  }

  // Build all users map (everyone) for group member resolution
  const { data: allUsersRaw } = await supabase.from('users').select('id, name, avatar_url')
  const allUsersMap = Object.fromEntries((allUsersRaw ?? []).map(u => [u.id, u]))

  const groupMessages = (rawGroupMessages ?? []).map(m => ({
    ...m,
    sender: allUsersMap[m.sender_id] ?? { id: m.sender_id, name: 'Unknown', avatar_url: null },
    readBy: readsByMsgId[m.id] ?? [],
    attachments: groupAttachmentsByMsgId[m.id] ?? [],
  }))

  // Attach member lists to groups
  const groups = myGroups.map(g => ({
    ...g,
    members: (groupMemberships ?? [])
      .filter(gm => gm.group_id === g.id)
      .map(gm => allUsersMap[gm.user_id])
      .filter(Boolean),
  }))

  return (
    <DashboardShell title="Messages">
      <MessagesClient
        users={users ?? []}
        allUsers={allUsersRaw ?? []}
        messages={messages}
        groups={groups}
        groupMessages={groupMessages}
        currentUserId={user?.id ?? ''}
        canUpload={user?.permissions.includes('upload_attachments') ?? false}
        canCreateGroup={user?.permissions.includes('create_group') ?? false}
      />
    </DashboardShell>
  )
}
