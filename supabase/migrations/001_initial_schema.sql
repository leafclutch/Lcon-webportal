-- ============================================================
-- LCON WEBPORTAL - Initial Database Schema
-- Dynamic RBAC + All Feature Tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLES & PERMISSIONS (Dynamic RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('tap_in', 'tap_out')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tap_in_time TIMESTAMPTZ,
  tap_out_time TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'half_day')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- TASKS & TODOS
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deadline TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGING
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  voice_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WARNINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- DAILY UPDATES & IDEAS
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date ON attendance_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user_id ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_updates_user_id ON daily_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_updates_created_at ON daily_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER attendance_logs_updated_at BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER daily_updates_updated_at BEFORE UPDATE ON daily_updates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- NEW USER HANDLER (auto-insert into public.users on signup)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM roles WHERE name = 'member' LIMIT 1;
  INSERT INTO public.users (id, name, email, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    default_role_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PERMISSION CHECK HELPER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.uid()
      AND p.name = permission_name
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- USERS: everyone can see profiles, only self or admins can update
CREATE POLICY "users_select_all" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_insert_self" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_self_or_manager" ON users FOR UPDATE
  USING (auth.uid() = id OR user_has_permission('manage_users'));

-- ROLES: readable by all authenticated, writable by role managers
CREATE POLICY "roles_select_all" ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_manage" ON roles FOR ALL USING (user_has_permission('manage_roles'));

-- PERMISSIONS: readable by all authenticated
CREATE POLICY "permissions_select_all" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "permissions_manage" ON permissions FOR ALL USING (user_has_permission('manage_roles'));

-- ROLE_PERMISSIONS: readable by all authenticated, writable by role managers
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_manage" ON role_permissions FOR ALL USING (user_has_permission('manage_roles'));

-- ATTENDANCE CODES: only authorized users can create
CREATE POLICY "attendance_codes_select" ON attendance_codes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_codes_insert" ON attendance_codes FOR INSERT
  WITH CHECK (user_has_permission('generate_attendance_code'));
CREATE POLICY "attendance_codes_update" ON attendance_codes FOR UPDATE
  USING (user_has_permission('generate_attendance_code'));

-- ATTENDANCE LOGS: users see own logs; authorized see all
CREATE POLICY "attendance_logs_select_own" ON attendance_logs FOR SELECT
  USING (user_id = auth.uid() OR user_has_permission('view_all_attendance'));
CREATE POLICY "attendance_logs_insert" ON attendance_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "attendance_logs_update" ON attendance_logs FOR UPDATE
  USING (user_id = auth.uid() OR user_has_permission('view_all_attendance'));

-- TASKS: assignee and assigner see tasks; assign_task permission required to insert
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid() OR user_has_permission('view_all_tasks'));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (user_has_permission('assign_task'));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid() OR user_has_permission('assign_task'));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (user_has_permission('assign_task'));

-- TODOS: users see own todos; authorized users see all
CREATE POLICY "todos_select" ON todos FOR SELECT
  USING (user_id = auth.uid() OR user_has_permission('view_all_todos'));
CREATE POLICY "todos_insert" ON todos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "todos_update" ON todos FOR UPDATE USING (user_id = auth.uid() OR user_has_permission('view_all_todos'));
CREATE POLICY "todos_delete" ON todos FOR DELETE USING (user_id = auth.uid() OR user_has_permission('view_all_todos'));

-- LEAVE REQUESTS: users see own; approvers see all
CREATE POLICY "leave_requests_select" ON leave_requests FOR SELECT
  USING (user_id = auth.uid() OR user_has_permission('approve_leave'));
CREATE POLICY "leave_requests_insert" ON leave_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave_requests_update" ON leave_requests FOR UPDATE
  USING (user_id = auth.uid() OR user_has_permission('approve_leave'));

-- MESSAGES: sender and receiver can see messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (receiver_id = auth.uid());

-- ANNOUNCEMENTS: all can read; only authorized can create/modify
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT
  WITH CHECK (user_has_permission('send_announcement'));
CREATE POLICY "announcements_update" ON announcements FOR UPDATE
  USING (user_has_permission('send_announcement'));
CREATE POLICY "announcements_delete" ON announcements FOR DELETE
  USING (user_has_permission('send_announcement'));

-- WARNINGS: users see own; authorized see all and create
CREATE POLICY "warnings_select" ON warnings FOR SELECT
  USING (user_id = auth.uid() OR user_has_permission('issue_warning'));
CREATE POLICY "warnings_insert" ON warnings FOR INSERT WITH CHECK (user_has_permission('issue_warning'));

-- PROJECTS: all can view; authorized can manage
CREATE POLICY "projects_select" ON projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (user_has_permission('manage_projects'));
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (user_has_permission('manage_projects'));
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (user_has_permission('manage_projects'));

-- PROJECT MEMBERS: all can view; project managers can manage
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "project_members_manage" ON project_members FOR ALL
  USING (user_has_permission('manage_projects'));

-- DAILY UPDATES: all authenticated can read/write own
CREATE POLICY "daily_updates_select" ON daily_updates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "daily_updates_insert" ON daily_updates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_updates_update" ON daily_updates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "daily_updates_delete" ON daily_updates FOR DELETE USING (user_id = auth.uid());

-- IDEAS: all authenticated can read/write own
CREATE POLICY "ideas_select" ON ideas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ideas_insert" ON ideas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ideas_update" ON ideas FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ideas_delete" ON ideas FOR DELETE USING (user_id = auth.uid());
