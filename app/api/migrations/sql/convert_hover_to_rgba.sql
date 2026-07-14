-- Converts html_posts.hover from hex ('#RRGGBB') to rgba(r, g, b, 0.8) strings.
--
-- Safety: html_posts is the most critical table in the app, so this script
-- backs it up to html_posts_bak BEFORE touching the live table, and runs
-- inside a single transaction so a failure midway leaves html_posts
-- untouched.
--
-- Run with: psql -f convert_hover_to_rgba.sql <database>

BEGIN;

-- 1. Backup. Fails loudly (42P07) if html_posts_bak already exists, so a
--    previous backup is never silently clobbered.
CREATE TABLE html_posts_bak AS TABLE html_posts;

-- 2. varchar(7) only fits '#RRGGBB' — widen it to fit 'rgba(255,255,255,0.8)'.
ALTER TABLE html_posts ALTER COLUMN hover TYPE varchar(30);

-- 3. Hex -> rgba(r, g, b, 0.8), skipping anything not already in '#RRGGBB' form
--    (e.g. NULLs, or rows already converted on a re-run).
UPDATE html_posts
SET hover = 'rgba(' ||
  (('x' || substring(hover from 2 for 2))::bit(8)::int) || ',' ||
  (('x' || substring(hover from 4 for 2))::bit(8)::int) || ',' ||
  (('x' || substring(hover from 6 for 2))::bit(8)::int) || ',0.8)'
WHERE hover ~ '^#[0-9A-Fa-f]{6}$';

-- 4. Verification — check this in DBeaver's result grid before committing
SELECT hover, count(*) FROM html_posts GROUP BY hover ORDER BY hover;

COMMIT;
