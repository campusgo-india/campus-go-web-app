-- Terminology rename: course -> school, branch -> programme.
-- Run once, manually, against the live database, AFTER confirming with the
-- user. All statements are wrapped in a single transaction so a failure rolls
-- back cleanly with zero partial effect.
--
-- Safety notes:
--   * ALTER TABLE ... RENAME COLUMN / RENAME TO are catalog-only metadata
--     operations in Postgres — they do not rewrite the table or touch row
--     data, and are effectively instant regardless of table size.
--   * The one non-trivial step is users.assigned_branch (nullable single
--     text) -> users.assigned_programmes (text[], NOT NULL, default '{}').
--     That column is converted in place: NULL/'' becomes '{}', any other
--     value becomes a one-element array containing it, so no data is lost.
--   * Every step is guarded by an information_schema check, so this script
--     is safe to run more than once (e.g. re-run after an interruption) —
--     already-renamed columns/tables are silently skipped.

BEGIN;

-- ── college_courses -> college_schools ──────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'college_courses')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'college_schools') THEN
    ALTER TABLE college_courses RENAME TO college_schools;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'college_schools' AND column_name = 'branches'
  ) THEN
    ALTER TABLE college_schools RENAME COLUMN branches TO programmes;
  END IF;
END $$;

-- ── users.assigned_branch -> users.assigned_programmes ──────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_programmes text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'assigned_branch'
  ) THEN
    UPDATE users
      SET assigned_programmes = CASE
        WHEN assigned_branch IS NULL OR assigned_branch = '' THEN '{}'::text[]
        ELSE ARRAY[assigned_branch]
      END
      WHERE assigned_branch IS NOT NULL;
    ALTER TABLE users DROP COLUMN assigned_branch;
  END IF;
END $$;

-- ── alumni.course/branch -> alumni.school/programme ─────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni' AND column_name = 'course') THEN
    ALTER TABLE alumni RENAME COLUMN course TO school;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni' AND column_name = 'branch') THEN
    ALTER TABLE alumni RENAME COLUMN branch TO programme;
  END IF;
END $$;

-- ── students.course/branch -> students.school/programme ─────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'course') THEN
    ALTER TABLE students RENAME COLUMN course TO school;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'branch') THEN
    ALTER TABLE students RENAME COLUMN branch TO programme;
  END IF;
END $$;

-- ── jobs.eligible_courses/eligible_branches -> eligible_schools/programmes ─
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'eligible_courses'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN eligible_courses TO eligible_schools;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'eligible_branches'
  ) THEN
    ALTER TABLE jobs RENAME COLUMN eligible_branches TO eligible_programmes;
  END IF;
END $$;

COMMIT;

-- After this runs, `pnpm --filter @campusgo/database db:push` picks up the
-- purely-additive parts of the schema (Student.hasDisability/
-- disabilityDetails, Assessment/TrainingSession targeting columns,
-- TrainingBatch/TrainingBatchMember tables) — those are brand new
-- columns/tables, not renames, so `db push` handles them safely on its own.
