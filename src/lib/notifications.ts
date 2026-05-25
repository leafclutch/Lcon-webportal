import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service role client — bypasses RLS, safe for server-only notification inserts
function getAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type NotificationType = 'message' | 'task' | 'warning' | 'leave' | 'announcement' | 'reminder' | 'system'

interface NotificationInput {
  user_id: string
  title: string
  body?: string
  type: NotificationType
  entity_type?: string
  entity_id?: string
}

export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const supabase = getAdminClient()
    const { error } = await supabase.from('notifications').insert({
      user_id: input.user_id,
      title: input.title,
      body: input.body ?? null,
      type: input.type,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
    })
    if (error) console.error('[createNotification]', error.message, input)
  } catch (e) {
    console.error('[createNotification] unexpected error', e)
  }
}

export async function createNotificationsForAllUsers(
  input: Omit<NotificationInput, 'user_id'>,
  excludeUserId?: string
): Promise<void> {
  try {
    const supabase = getAdminClient()
    let query = supabase.from('users').select('id').eq('is_approved', true)
    if (excludeUserId) query = query.neq('id', excludeUserId)

    const { data: users } = await query
    if (!users?.length) return

    await supabase.from('notifications').insert(
      users.map(u => ({
        user_id: u.id,
        title: input.title,
        body: input.body ?? null,
        type: input.type,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
      }))
    )
  } catch {
    // Best-effort
  }
}
