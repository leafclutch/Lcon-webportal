'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import type { ActionResult } from '@/types'

export interface AttachmentRecord {
  entity_type: 'task' | 'todo' | 'message' | 'announcement' | 'daily_update' | 'idea'
  entity_id: string
  type: 'file' | 'voice' | 'link' | 'image'
  name: string
  url: string
  mime_type?: string
  size_bytes?: number
}

/** Upload a file to Supabase Storage and return its public URL + metadata. */
export async function uploadToStorage(
  formData: FormData
): Promise<ActionResult<{ url: string; name: string; mimeType: string; sizeBytes: number }>> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (!user.permissions.includes('upload_attachments')) {
    return { success: false, error: 'You do not have permission to upload attachments' }
  }

  const file = formData.get('file') as File
  if (!file || !file.size) return { success: false, error: 'No file provided' }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File exceeds 10 MB limit' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `uploads/${user.id}/${timestamp}_${safeName}`

  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { success: false, error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)

  return {
    success: true,
    data: {
      url: publicUrl,
      name: file.name,
      mimeType: file.type || `application/${ext}`,
      sizeBytes: file.size,
    },
  }
}

/** Save attachment records to the DB after the entity has been created. */
export async function saveAttachments(records: AttachmentRecord[]): Promise<ActionResult<void>> {
  if (!records.length) return { success: true, data: undefined }

  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('attachments').insert(
    records.map(r => ({
      uploaded_by: user.id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      type: r.type,
      name: r.name,
      url: r.url,
      mime_type: r.mime_type ?? null,
      size_bytes: r.size_bytes ?? null,
    }))
  )

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

/** Load attachments for a set of entity IDs. */
export async function getAttachments(
  entityType: AttachmentRecord['entity_type'],
  entityIds: string[]
) {
  if (!entityIds.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds)
    .order('created_at')
  return data ?? []
}
