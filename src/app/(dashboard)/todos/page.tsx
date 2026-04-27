import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { TodosClient } from '@/components/tasks/todos-client'

export default async function TodosPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const viewAll = user?.permissions.includes('view_all_todos') ?? false

  let query = supabase
    .from('todos')
    .select('id, title, description, status, user_id, attachment_url, created_at')
    .order('created_at', { ascending: false })

  if (!viewAll) query = query.eq('user_id', user?.id ?? '')

  const { data: rawTodos } = await query

  const userIds = [...new Set((rawTodos ?? []).map(t => t.user_id))]
  const { data: todoUsers } = userIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', userIds)
    : { data: [] }
  const userMap = Object.fromEntries((todoUsers ?? []).map(u => [u.id, u]))

  const todos = (rawTodos ?? []).map(t => ({
    ...t,
    users: userMap[t.user_id] ?? null,
  }))

  return (
    <DashboardShell title="Todos">
      <TodosClient
        todos={todos}
        currentUserId={user?.id ?? ''}
        canViewAll={viewAll}
        canUpload={user?.permissions.includes('upload_attachments') ?? false}
      />
    </DashboardShell>
  )
}
