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
  // Added in upgrade 004
  | 'delete_user'
  | 'approve_users'
  | 'upload_attachments'
  | 'send_message'
  | 'view_activity_status'
  | 'export_attendance'
  | 'verify_attendance_external'
  | 'view_daily_updates'
  | 'issue_auto_warning'
  // Added in migration 005
  | 'create_group'
  // Added in migration 006
  | 'manage_messages'
  | 'delete_message'
  | 'use_remote_attendance'
  | 'comment_on_tasks'
  | 'view_notifications'

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
  is_approved: boolean
  last_active_at: string | null
}

export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: PermissionName
  always?: boolean
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
