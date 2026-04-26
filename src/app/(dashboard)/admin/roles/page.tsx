import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/permissions'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { RolesClient } from '@/components/admin/roles-client'

export default async function AdminRolesPage() {
  const user = await getCurrentUser()
  if (!user?.permissions.includes('manage_roles')) redirect('/dashboard')

  const supabase = await createClient()

  const [{ data: roles }, { data: permissions }, { data: rolePerms }] = await Promise.all([
    supabase.from('roles').select('*').order('name'),
    supabase.from('permissions').select('*').order('name'),
    supabase.from('role_permissions').select('*'),
  ])

  return (
    <DashboardShell title="Roles & Permissions">
      <RolesClient roles={roles ?? []} permissions={permissions ?? []} rolePermissions={rolePerms ?? []} />
    </DashboardShell>
  )
}
