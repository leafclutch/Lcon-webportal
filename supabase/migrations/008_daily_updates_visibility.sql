-- ============================================================
-- 008_daily_updates_visibility.sql
-- Restricts daily_updates SELECT to own rows unless the viewer
-- has the 'view_daily_updates' permission.
-- ============================================================

-- Tighten the SELECT policy: own rows always visible;
-- all rows visible only to users with view_daily_updates permission.
DROP POLICY IF EXISTS "daily_updates_select" ON daily_updates;

CREATE POLICY "daily_updates_select" ON daily_updates
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_has_permission('view_daily_updates')
  );

-- Ensure super_admin has the permission (it should via the ALL grant,
-- but make it explicit in case it was missed).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
  AND p.name = 'view_daily_updates'
ON CONFLICT (role_id, permission_id) DO NOTHING;
