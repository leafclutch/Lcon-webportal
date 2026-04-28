-- ============================================================
-- 004_upgrade.sql - LCON Platform Upgrade
-- Adds: approval system, notifications, attachments,
--       activity tracking, and 9 new permissions
-- ============================================================

-- ============================================================
-- USERS: approval + activity tracking columns
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_approved   BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Approve all existing users so current team isn't locked out
UPDATE users SET is_approved = true WHERE is_approved = false;

-- ============================================================
-- NEW PERMISSIONS
-- ============================================================

INSERT INTO permissions (name, description) VALUES
  ('delete_user',                'Can permanently delete user accounts'),
  ('approve_users',              'Can approve or reject new user registrations'),
  ('upload_attachments',         'Can upload file and voice attachments'),
  ('send_message',               'Can send direct messages to team members'),
  ('view_activity_status',       'Can view online/offline status of team members'),
  ('export_attendance',          'Can export attendance records as CSV'),
  ('verify_attendance_external', 'Can access the public attendance verification portal'),
  ('view_daily_updates',         'Can monitor daily updates and detect missing submissions'),
  ('issue_auto_warning',         'Can trigger automatic warnings for missed daily updates')
ON CONFLICT (name) DO NOTHING;

-- Grant ALL permissions (including new ones) to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant relevant new permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.name IN (
    'upload_attachments', 'send_message', 'view_activity_status',
    'export_attendance', 'view_daily_updates'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant relevant new permissions to hr
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr'
  AND p.name IN (
    'approve_users', 'delete_user', 'upload_attachments', 'send_message',
    'view_activity_status', 'export_attendance',
    'view_daily_updates', 'issue_auto_warning'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Members get basic upload + messaging access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'member'
  AND p.name IN ('upload_attachments', 'send_message')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT,
  type        TEXT        NOT NULL CHECK (type IN (
                            'message','task','warning','leave',
                            'announcement','reminder','system')),
  entity_type TEXT,
  entity_id   UUID,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert"      ON notifications;
DROP POLICY IF EXISTS "notifications_update_own"  ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own"  ON notifications;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- ATTACHMENTS TABLE (polymorphic)
-- ============================================================

CREATE TABLE IF NOT EXISTS attachments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT        NOT NULL CHECK (entity_type IN (
                            'task','todo','message','announcement',
                            'daily_update','idea')),
  entity_id   UUID        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('file','voice','link','image')),
  name        TEXT,
  url         TEXT        NOT NULL,
  size_bytes  INTEGER,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity      ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON attachments;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_delete" ON attachments;

CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND user_has_permission('upload_attachments')
  );
CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR user_has_permission('manage_users')
  );

-- ============================================================
-- UPDATE handle_new_user: new signups start as unapproved
-- Preserves 003 fixes: ON CONFLICT safeguard + SET search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'member' LIMIT 1;
  INSERT INTO public.users (id, name, email, role_id, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    default_role_id,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
