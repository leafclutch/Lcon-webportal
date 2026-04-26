export * from './database'

export type PermissionName =
  | 'create_user'
  | 'manage_users'
  | 'manage_roles'
  | 'generate_attendance_code'
  | 'view_all_attendance'
  | 'assign_task'
  | 'view_all_tasks'
  | 'view_all_todos'
  | 'approve_leave'
  | 'send_announcement'
  | 'issue_warning'
  | 'manage_projects'
  | 'view_reports'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: {
    id: string
    name: string
  } | null
  permissions: PermissionName[]
  avatar_url: string | null
}

export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: PermissionName
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
