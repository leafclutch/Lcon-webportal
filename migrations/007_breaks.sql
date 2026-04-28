-- ============================================================
-- Migration 007 — Attendance Breaks (Jibble-style)
-- Run in Supabase Studio > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_breaks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID        NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_breaks_user_id_idx  ON attendance_breaks(user_id);
CREATE INDEX IF NOT EXISTS attendance_breaks_log_id_idx   ON attendance_breaks(log_id);
CREATE INDEX IF NOT EXISTS attendance_breaks_end_time_idx ON attendance_breaks(end_time);

-- RLS
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;

-- Users can see their own breaks; admins with view_all_attendance can see all
DROP POLICY IF EXISTS "breaks_select" ON attendance_breaks;
CREATE POLICY "breaks_select" ON attendance_breaks
  FOR SELECT USING (
    auth.uid() = user_id
    OR (SELECT user_has_permission('view_all_attendance'))
  );

DROP POLICY IF EXISTS "breaks_insert" ON attendance_breaks;
CREATE POLICY "breaks_insert" ON attendance_breaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "breaks_update" ON attendance_breaks;
CREATE POLICY "breaks_update" ON attendance_breaks
  FOR UPDATE USING (auth.uid() = user_id);
