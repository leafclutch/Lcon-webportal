'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'

export async function updateLastActive(): Promise<void> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return

  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', user.id)
}
