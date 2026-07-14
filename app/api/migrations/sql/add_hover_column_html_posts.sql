-- Adds a `hover` color column to html_posts and backfills it with a random
-- color drawn from the 7-color basin palette.
--
-- Safety: html_posts is the most critical table in the app, so this script
-- backs it up to html_posts_bak BEFORE touching the live table, and runs
-- inside a single transaction so a failure midway leaves html_posts
-- untouched.
--
-- Run with: psql -f add_hover_column_html_posts.sql <database>
--
-- DRY RUN: ends with ROLLBACK instead of COMMIT, so nothing here persists —
-- backup, column, and data are all undone at the end. Run it, inspect the
-- verification SELECT output, and once you're happy change ROLLBACK back to
-- COMMIT on the last line to apply for real.

BEGIN;

-- 1. Backup. Fails loudly (42P07) if html_posts_bak already exists, so a
--    previous backup is never silently clobbered.
CREATE TABLE html_posts_bak AS TABLE html_posts;

-- 2. Schema change
ALTER TABLE html_posts ADD COLUMN hover varchar(7);

-- 3. Randomly assign one of the 7 palette colors to every row
UPDATE html_posts
SET hover = (ARRAY[
  '#E0299E', -- Magenta
  '#9B2FC9', -- Purple
  '#2A8C76', -- Teal
  '#3CA257', -- Green
  '#C3CC3D', -- Olive
  '#F0901F', -- Orange
  '#D8483B'  -- Red
])[floor(random() * 7 + 1)::int];

-- 4. Verification — check this in DBeaver's result grid before rolling back
SELECT hover, count(*) FROM html_posts GROUP BY hover ORDER BY hover;

ROLLBACK;
