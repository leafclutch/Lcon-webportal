'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function createGroup(
  name: string,
  memberIds: string[]
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, created_by: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Add creator + all selected members
  const allMembers = [...new Set([user.id, ...memberIds])]
  await supabase.from('group_members').insert(
    allMembers.map(uid => ({ group_id: group.id, user_id: uid, added_by: user.id }))
  )

  revalidatePath('/messages')
  return { success: true, data: { id: group.id } }
}

export async function sendGroupMessage(
  groupId: string,
  content?: string,
  voiceUrl?: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: msg, error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, sender_id: user.id, content: content ?? null, voice_url: voiceUrl ?? null })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: { id: msg.id } }
}

export async function markGroupMessagesRead(
  messageIds: string[]
): Promise<ActionResult<void>> {
  if (!messageIds.length) return { success: true, data: undefined }
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  await supabase
    .from('group_message_reads')
    .upsert(messageIds.map(id => ({ message_id: id, user_id: user.id })), { onConflict: 'message_id,user_id' })

  return { success: true, data: undefined }
}

export async function deleteGroup(groupId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: group } = await supabase.from('groups').select('created_by').eq('id', groupId).single()
  if (group?.created_by !== user.id) return { success: false, error: 'Only the group creator can delete it' }

  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/messages')
  return { success: true, data: undefined }
}
