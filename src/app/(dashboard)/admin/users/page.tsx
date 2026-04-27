import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { UsersClient } from '@/components/admin/users-client'

interface UserWithRole {
  id: string; name: string; email: string; avatar_url: string | null;
  created_at: string; is_approved: boolean; last_active_at: string | null;
  roles: { id: string; name: string } | null
}

export default async function AdminUsersPage() {
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_users')) redirect('/dashboard')

  const supabase = await createClient()

  const [{ data: rawUsers }, { data: roles }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at, role_id, is_approved, last_active_at')
      .order('created_at', { ascending: false }),
    supabase.from('roles').select('*').order('name'),
  ])

  const roleMap = Object.fromEntries((roles ?? []).map(r => [r.id, r]))
  const users: UserWithRole[] = (rawUsers ?? []).map(u => ({
    ...u,
    roles: u.role_id ? (roleMap[u.role_id] ?? null) : null,
  }))

  const canApprove = user.permissions.includes('approve_users')
  const canDelete = user.permissions.includes('delete_user')

  return (
    <DashboardShell title="User Management">
      <UsersClient
        users={users}
        roles={roles ?? []}
        canApprove={canApprove}
        canDelete={canDelete}
        currentUserId={user.id}
      />
    </DashboardShell>
  )
}
