-- ============================================================
-- Migration 006 — Messaging upgrade, remote attendance,
--                 task comments, new RBAC permissions
-- Run this in the Supabase SQL editor (Studio > SQL Editor)
-- ============================================================

-- ── 1. messages: add delivery/seen/edit/delete fields ─────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_seen      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_edited    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

-- ── 2. attendance_logs: add remote / onsite type field ────
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'onsite'
    CHECK (type IN ('onsite', 'remote'));

-- ── 3. task_comments table ────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON task_comments(task_id);

-- ── 4. New permissions ────────────────────────────────────
INSERT INTO permissions (name, description) VALUES
  ('manage_messages',      'Edit own messages')              ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name, description) VALUES
  ('delete_message',       'Delete any message')             ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name, description) VALUES
  ('use_remote_attendance','Clock in/out remotely without a code') ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name, description) VALUES
  ('comment_on_tasks',     'Add comments on tasks')          ON CONFLICT (name) DO NOTHING;
INSERT INTO permissions (name, description) VALUES
  ('view_notifications',   'View notifications')             ON CONFLICT (name) DO NOTHING;

-- ── 5. RLS policies ───────────────────────────────────────

-- task_comments: users can read comments on tasks they can see
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
CREATE POLICY "task_comments_select" ON task_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- own comment
      user_id = auth.uid()
      OR
      -- task assigned to or by current user
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
          AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
      )
      OR
      -- user has view_all_tasks permission
      (SELECT user_has_permission('view_all_tasks'))
    )
  );

DROP POLICY IF EXISTS "task_comments_insert" ON task_comments;
CREATE POLICY "task_comments_insert" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (SELECT user_has_permission('comment_on_tasks'))
  );

DROP POLICY IF EXISTS "task_comments_delete" ON task_comments;
CREATE POLICY "task_comments_delete" ON task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- messages: allow sender/receiver to update (for edit/delete/seen fields)
-- The existing RLS for messages typically allows read to sender+receiver.
-- We need to allow UPDATE for:
--   • sender: content, is_edited, deleted_at
--   • receiver: is_read, is_delivered, is_seen
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

-- ── 6. Grant comment_on_tasks to existing roles ───────────
-- Uncomment and adjust role names to match your setup.
-- Example: grant to all users who already have send_message:
/*
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions existing_p ON existing_p.id = rp.permission_id AND existing_p.name = 'send_message'
JOIN permissions p ON p.name = 'comment_on_tasks'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions x
  WHERE x.role_id = rp.role_id AND x.permission_id = p.id
);
*/

-- To grant use_remote_attendance to a specific role by name, run:
/*
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Employee'          -- change to your role name
  AND p.name = 'use_remote_attendance'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions x
    WHERE x.role_id = r.id AND x.permission_id = p.id
  );
*/
