'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'

export async function sendMessage(input: {
  receiver_id: string
  content?: string
  voice_url?: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!input.content && !input.voice_url) {
    return { success: false, error: 'Message must have content or voice' }
  }

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      receiver_id: input.receiver_id,
      content: input.content,
      voice_url: input.voice_url,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await createNotification({
    user_id: input.receiver_id,
    title: `Message from ${user.name}`,
    body: input.content ? input.content.slice(0, 100) : '🎤 Voice message',
    type: 'message',
    entity_type: 'message',
    entity_id: msg.id,
  })

  revalidatePath('/messages')
  return { success: true, data: { id: msg.id } }
}

export async function editMessage(id: string, content: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: msg } = await supabase
    .from('messages')
    .select('sender_id, deleted_at')
    .eq('id', id)
    .single()

  if (!msg) return { success: false, error: 'Message not found' }
  if (msg.sender_id !== user.id) return { success: false, error: 'Can only edit your own messages' }
  if (msg.deleted_at) return { success: false, error: 'Cannot edit a deleted message' }

  const trimmed = content.trim()
  if (!trimmed) return { success: false, error: 'Message cannot be empty' }

  const { error } = await supabase
    .from('messages')
    .update({ content: trimmed, is_edited: true })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function deleteMessage(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: msg } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', id)
    .single()

  if (!msg) return { success: false, error: 'Message not found' }

  const canDelete =
    msg.sender_id === user.id || user.permissions.includes('delete_message')
  if (!canDelete) return { success: false, error: 'Cannot delete this message' }

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), content: null })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function markMessagesRead(senderId: string): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, is_delivered: true, is_seen: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function uploadVoiceMessage(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const file = formData.get('voice') as File
  if (!file) return { success: false, error: 'No audio file' }

  const path = `voice-messages/${user.id}/${Date.now()}.webm`
  const { error } = await supabase.storage.from('voices').upload(path, file)
  if (error) return { success: false, error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('voices').getPublicUrl(path)
  return { success: true, data: { url: publicUrl } }
}
