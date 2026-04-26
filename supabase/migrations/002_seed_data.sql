-- ============================================================
-- SEED DATA: Default Roles & Permissions
-- ============================================================

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES
  ('create_user',              'Can create new users'),
  ('manage_users',             'Can manage all users (edit/delete)'),
  ('manage_roles',             'Can create and assign roles and permissions'),
  ('generate_attendance_code', 'Can generate tap-in/tap-out attendance codes'),
  ('view_all_attendance',      'Can view attendance records of all users'),
  ('assign_task',              'Can assign tasks to other users'),
  ('view_all_tasks',           'Can view tasks assigned to any user'),
  ('view_all_todos',           'Can view todos of all users'),
  ('approve_leave',            'Can approve or reject leave requests'),
  ('send_announcement',        'Can create and send global announcements'),
  ('issue_warning',            'Can issue warnings to users'),
  ('manage_projects',          'Can create and manage projects'),
  ('view_reports',             'Can view system-wide reports')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Full access to all features and settings'),
  ('manager',     'Can manage users, tasks, attendance, and projects'),
  ('hr',          'Handles leave, warnings, and user management'),
  ('member',      'Standard team member with basic access')
ON CONFLICT (name) DO NOTHING;

-- Assign ALL permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.name IN (
    'generate_attendance_code',
    'view_all_attendance',
    'assign_task',
    'view_all_tasks',
    'view_all_todos',
    'approve_leave',
    'send_announcement',
    'manage_projects',
    'view_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign HR permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr'
  AND p.name IN (
    'create_user',
    'manage_users',
    'view_all_attendance',
    'approve_leave',
    'issue_warning',
    'view_reports'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Members get no special permissions (only access their own data via RLS)
