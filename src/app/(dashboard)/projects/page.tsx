import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { ProjectsClient } from '@/components/projects/projects-client'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const canManage = user?.permissions.includes('manage_projects') ?? false

  const [{ data: rawProjects }, { data: rawMembers }, { data: allUsers }] = await Promise.all([
    supabase.from('projects').select('id, name, description, status, created_by, created_at').order('created_at', { ascending: false }),
    supabase.from('project_members').select('project_id, user_id'),
    supabase.from('users').select('id, name, avatar_url').order('name'),
  ])

  const userMap = Object.fromEntries((allUsers ?? []).map(u => [u.id, u]))

  const projects = (rawProjects ?? []).map(p => ({
    ...p,
    creator: userMap[p.created_by] ?? { id: p.created_by, name: 'Unknown', avatar_url: null },
    project_members: (rawMembers ?? [])
      .filter(m => m.project_id === p.id)
      .map(m => ({
        user_id: m.user_id,
        users: userMap[m.user_id] ?? { id: m.user_id, name: 'Unknown', avatar_url: null },
      })),
  }))

  return (
    <DashboardShell title="Projects">
      <ProjectsClient projects={projects} allUsers={allUsers ?? []} canManage={canManage} currentUserId={user?.id ?? ''} />
    </DashboardShell>
  )
}
