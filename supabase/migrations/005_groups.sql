-- ============================================================
-- 005_groups.sql - Group Messaging
-- Adds: groups, group_members, group_messages, group_message_reads
-- Also expands attachments.entity_type to include 'group_message'
-- ============================================================

-- ── Expand attachments entity_type check ──────────────────────────────
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_entity_type_check
  CHECK (entity_type IN (
    'task','todo','message','announcement',
    'daily_update','idea','group_message'
  ));

-- ── Groups ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  description TEXT,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS groups_updated_at ON groups;
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── Group members ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  group_id  UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ── Group messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT,
  voice_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at DESC);

-- ── Read receipts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_message_reads (
  message_id UUID        NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_message_reads_message ON group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_user    ON group_message_reads(user_id);

-- ── Enable RLS ────────────────────────────────────────────────────────
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

-- ── Membership helper (SECURITY DEFINER breaks RLS recursion) ─────────
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- ── RLS Policies ──────────────────────────────────────────────────────

-- groups: visible to creator or members
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (created_by = auth.uid() OR is_group_member(id));

DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (created_by = auth.uid() AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "groups_update" ON groups;
CREATE POLICY "groups_update" ON groups FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "groups_delete" ON groups;
CREATE POLICY "groups_delete" ON groups FOR DELETE
  USING (created_by = auth.uid());

-- group_members: members can see all rows for their groups (uses SECURITY DEFINER fn)
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "group_members_insert" ON group_members;
CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_id AND g.created_by = auth.uid()
  ) OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_id AND g.created_by = auth.uid()
  ) OR user_id = auth.uid());

-- group_messages: members can read and send
DROP POLICY IF EXISTS "group_messages_select" ON group_messages;
CREATE POLICY "group_messages_select" ON group_messages FOR SELECT
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "group_messages_insert" ON group_messages;
CREATE POLICY "group_messages_insert" ON group_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_group_member(group_id));

-- group_message_reads: members can see all reads, users can insert own
DROP POLICY IF EXISTS "group_message_reads_select" ON group_message_reads;
CREATE POLICY "group_message_reads_select" ON group_message_reads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_messages gm WHERE gm.id = message_id AND is_group_member(gm.group_id)
  ));

DROP POLICY IF EXISTS "group_message_reads_insert" ON group_message_reads;
CREATE POLICY "group_message_reads_insert" ON group_message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── create_group permission ───────────────────────────────────────────
INSERT INTO permissions (name, description) VALUES
  ('create_group', 'Can create group chats')
ON CONFLICT (name) DO NOTHING;

-- Grant to super_admin, manager, hr (members can be added manually)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super_admin', 'manager', 'hr')
  AND p.name = 'create_group'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enable realtime (guarded so re-runs don't fail)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_message_reads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_message_reads;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
