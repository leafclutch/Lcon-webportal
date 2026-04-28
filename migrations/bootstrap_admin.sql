-- ================================================================
-- ADMIN BOOTSTRAP — Run once in Supabase Studio > SQL Editor
--
-- This script:
--   1. Syncs all known permissions into the permissions table
--   2. Creates a "Super Admin" role if it doesn't exist
--   3. Grants every permission to that role
--   4. Assigns that role to your account (matched by email)
--
-- Replace the email below with YOUR login email before running.
-- ================================================================

DO $$
DECLARE
  v_role_id   UUID;
  v_user_id   UUID;
  v_admin_email TEXT := 'admin@leafclutch.com.np'; -- ← YOUR EMAIL
BEGIN

  -- ── 1. Sync all permissions ──────────────────────────────────
  INSERT INTO permissions (name, description) VALUES
    ('create_user',               'Create new users'),
    ('manage_users',              'Manage users (view, edit, assign roles)'),
    ('manage_roles',              'Create, edit and delete roles and permissions'),
    ('generate_attendance_code',  'Generate attendance tap-in / tap-out codes'),
    ('view_all_attendance',       'View attendance records for all users'),
    ('assign_task',               'Assign tasks to team members'),
    ('view_all_tasks',            'View tasks assigned to any user'),
    ('view_all_todos',            'View todos belonging to any user'),
    ('approve_leave',             'Approve or reject leave requests'),
    ('send_announcement',         'Post company-wide announcements'),
    ('issue_warning',             'Issue warnings to team members'),
    ('manage_projects',           'Create and manage projects'),
    ('view_reports',              'Access reports and analytics'),
    ('delete_user',               'Permanently delete user accounts'),
    ('approve_users',             'Approve or reject pending user registrations'),
    ('upload_attachments',        'Upload files, images and voice notes'),
    ('send_message',              'Send direct messages'),
    ('view_activity_status',      'See online/offline status of users'),
    ('export_attendance',         'Export attendance data to CSV'),
    ('verify_attendance_external','External attendance verification'),
    ('view_daily_updates',        'View daily updates from all users'),
    ('issue_auto_warning',        'Automatically issue warnings for missed updates'),
    ('create_group',              'Create group chats'),
    ('manage_messages',           'Edit own messages'),
    ('delete_message',            'Delete any message'),
    ('use_remote_attendance',     'Clock in/out remotely without a code'),
    ('comment_on_tasks',          'Add comments on tasks'),
    ('view_notifications',        'View notifications')
  ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description;

  -- ── 2. Ensure "Super Admin" role exists ──────────────────────
  INSERT INTO roles (name, description)
  VALUES ('Super Admin', 'Full access to all features')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_role_id FROM roles WHERE name = 'Super Admin';

  -- ── 3. Grant every permission to Super Admin ─────────────────
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id
  FROM permissions p
  WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = v_role_id AND rp.permission_id = p.id
  );

  -- ── 4. Assign the role to your user account ──────────────────
  SELECT id INTO v_user_id FROM users WHERE email = v_admin_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in users table', v_admin_email;
  END IF;

  UPDATE users
  SET role_id = v_role_id, is_approved = TRUE
  WHERE id = v_user_id;

  RAISE NOTICE 'Done! Super Admin role assigned to %', v_admin_email;
END $$;
