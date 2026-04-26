import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { TasksClient } from '@/components/tasks/tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const canAssign = user?.permissions.includes('assign_task') ?? false
  const viewAll = user?.permissions.includes('view_all_tasks') ?? false

  let taskQuery = supabase
    .from('tasks')
    .select('id, title, description, priority, status, deadline, assigned_by, assigned_to, created_at')
    .order('created_at', { ascending: false })

  if (!viewAll) {
    taskQuery = taskQuery.or(`assigned_to.eq.${user?.id},assigned_by.eq.${user?.id}`)
  }

  const [{ data: rawTasks }, { data: users }] = await Promise.all([
    taskQuery,
    supabase.from('users').select('id, name, avatar_url').order('name'),
  ])

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
  const tasks = (rawTasks ?? []).map(t => ({
    ...t,
    assigner: userMap[t.assigned_by] ?? { id: t.assigned_by, name: 'Unknown', avatar_url: null },
    assignee: userMap[t.assigned_to] ?? { id: t.assigned_to, name: 'Unknown', avatar_url: null },
  }))

  return (
    <DashboardShell title="Tasks">
      <TasksClient
        tasks={tasks}
        users={canAssign ? (users ?? []) : []}
        canAssign={canAssign}
        currentUserId={user?.id ?? ''}
      />
    </DashboardShell>
  )
}
