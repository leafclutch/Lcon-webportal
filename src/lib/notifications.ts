import { createClient } from '@/lib/supabase/server'

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
    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: input.user_id,
      title: input.title,
      body: input.body ?? null,
      type: input.type,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
    })
  } catch {
    // Notifications are best-effort — never block main flow
  }
}

export async function createNotificationsForAllUsers(
  input: Omit<NotificationInput, 'user_id'>,
  excludeUserId?: string
): Promise<void> {
  try {
    const supabase = await createClient()
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
