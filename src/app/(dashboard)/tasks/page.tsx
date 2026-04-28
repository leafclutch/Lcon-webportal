import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { TasksClient } from '@/components/tasks/tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const canAssign = user?.permissions.includes('assign_task') ?? false
  const viewAll = user?.permissions.includes('view_all_tasks') ?? false
  const canUpload = user?.permissions.includes('upload_attachments') ?? false
  const canComment = user?.permissions.includes('comment_on_tasks') ?? false

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

  const taskIds = (rawTasks ?? []).map(t => t.id)
  const { data: rawAttachments } = taskIds.length
    ? await supabase
        .from('attachments')
        .select('id, entity_id, type, name, url, mime_type, size_bytes')
        .eq('entity_type', 'task')
        .in('entity_id', taskIds)
    : { data: [] }

  type TaskAttachRow = { id: string; entity_id: string; type: string; name: string | null; url: string; mime_type: string | null; size_bytes: number | null }
  const attachmentsByTaskId: Record<string, TaskAttachRow[]> = {}
  for (const a of (rawAttachments ?? []) as TaskAttachRow[]) {
    if (!attachmentsByTaskId[a.entity_id]) attachmentsByTaskId[a.entity_id] = []
    attachmentsByTaskId[a.entity_id]!.push(a)
  }

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
  const tasks = (rawTasks ?? []).map(t => ({
    ...t,
    assigner: userMap[t.assigned_by] ?? { id: t.assigned_by, name: 'Unknown', avatar_url: null },
    assignee: userMap[t.assigned_to] ?? { id: t.assigned_to, name: 'Unknown', avatar_url: null },
    attachments: attachmentsByTaskId[t.id] ?? [],
  }))

  return (
    <DashboardShell title="Tasks">
      <TasksClient
        tasks={tasks}
        users={canAssign ? (users ?? []) : []}
        canAssign={canAssign}
        canUpload={canUpload}
        canComment={canComment}
        currentUserId={user?.id ?? ''}
        currentUserName={user?.name ?? ''}
        currentUserAvatar={user?.avatar_url ?? null}
      />
    </DashboardShell>
  )
}
