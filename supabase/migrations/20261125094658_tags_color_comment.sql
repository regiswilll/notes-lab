-- Point the tags.color column comment at the app's palette file.
--
-- Migration 20261125091038_tags_color.sql says the palette lives in
-- app/notes/tag-colors.ts. It is actually in lib/tag-colors.ts. That migration
-- has already run, so it is not edited; the correct path goes in the column
-- comment instead, which is what the live database shows.
--
-- The colour list itself is unchanged and must still match TAG_COLORS and
-- the check tags_color_check.

comment on column public.tags.color is
  'Display colour, one of: red, orange, yellow, green, teal, blue, purple, pink. The app''s palette is in lib/tag-colors.ts; keep the two in step.';
